-- TopRepet MVP rules: catalog, slots, booking lifecycle, notifications and background jobs.
-- Spec: docs/requirements.md, sections 5 and 7. Every status change goes through a function here.

-- ---------- clock and helpers ----------

-- Tests pin the clock with: select set_config('app.now', '2026-10-19 09:00+03', true);
create function public.app_now() returns timestamptz
language sql stable as $$
  select coalesce(nullif(current_setting('app.now', true), '')::timestamptz, now())
$$;

alter table public.bookings
  add column reminded_24h_at timestamptz,
  add column reminded_1h_at timestamptz,
  add column link_reminded_at timestamptz;

create function public.fail(code text) returns void
language plpgsql as $$ begin raise exception using message = code, errcode = 'P0001'; end $$;

create function public.add_business_days(t timestamptz, n int) returns timestamptz
language plpgsql immutable as $$
declare d timestamptz := t; left_ int := n;
begin
  while left_ > 0 loop
    d := d + interval '1 day';
    if extract(isodow from d at time zone 'Europe/Moscow') < 6 then left_ := left_ - 1; end if;
  end loop;
  return d;
end $$;

-- In-app notification plus a letter in the outbox (О2). Payload carries what the template needs.
create function public.notify(p_user uuid, p_booking bigint, p_kind text, p_payload jsonb default '{}')
returns void language plpgsql security definer set search_path = public as $$
declare v_email text;
begin
  insert into notifications (user_id, booking_id, kind) values (p_user, p_booking, p_kind);
  select email into v_email from profiles where id = p_user;
  insert into email_outbox (to_email, template, payload)
  values (v_email, p_kind, p_payload || jsonb_build_object('booking_id', p_booking, 'user_id', p_user));
end $$;

create function public.log_status(p_booking bigint, p_from booking_status, p_to booking_status, p_note text default null)
returns void language sql security definer set search_path = public as $$
  insert into booking_events (booking_id, actor_id, from_status, to_status, note)
  values (p_booking, auth.uid(), p_from, p_to, p_note)
$$;

create function public.me_active(p_role user_role) returns uuid
language plpgsql stable security definer set search_path = public as $$
declare v profiles;
begin
  select * into v from profiles where id = auth.uid();
  if v.id is null then perform fail('not_signed_in'); end if;
  if v.blocked_at is not null then perform fail('blocked'); end if;
  if p_role is not null and v.role <> p_role then perform fail('wrong_role'); end if;
  return v.id;
end $$;

-- ---------- tutor profile ----------

-- Р2.1-публикация: what is missing before the profile can be published
create function public.tutor_missing(p_tutor uuid default auth.uid()) returns text[]
language sql stable security definer set search_path = public as $$
  select array_remove(array[
    case when coalesce(t.photo_path, '') = '' then 'photo' end,
    case when coalesce(trim(p.name), '') = '' then 'name' end,
    case when not exists (select 1 from prices pr where pr.tutor_id = t.user_id) then 'subject_price' end,
    case when not exists (select 1 from weekly_windows w where w.tutor_id = t.user_id) then 'window' end
  ], null)
  from tutors t join profiles p on p.id = t.user_id
  where t.user_id = p_tutor and (p_tutor = auth.uid() or public.is_admin())
$$;

create function public.publish_tutor() returns void
language plpgsql security definer set search_path = public as $$
declare v_id uuid := me_active('tutor'); v_missing text[]; v_status tutor_status;
begin
  select status into v_status from tutors where user_id = v_id;
  if v_status = 'hidden' then perform fail('hidden_by_admin'); end if;
  v_missing := tutor_missing(v_id);
  if cardinality(v_missing) > 0 then
    raise exception using message = 'not_ready', errcode = 'P0001', detail = array_to_string(v_missing, ',');
  end if;
  update tutors set status = 'published', published_at = coalesce(published_at, app_now()) where user_id = v_id;
end $$;

create function public.unpublish_tutor() returns void
language plpgsql security definer set search_path = public as $$
begin
  update tutors set status = 'draft' where user_id = me_active('tutor') and status = 'published';
end $$;

-- ---------- slots ----------

-- Free start times for a tutor, subject and duration (У2.1): weekly windows in the tutor's zone,
-- 30-minute grid, minus live bookings, within [now + min lead, now + horizon].
create function public.free_slots(
  p_tutor uuid, p_duration smallint, p_from timestamptz default null, p_to timestamptz default null
) returns setof timestamptz
language plpgsql stable security definer set search_path = public as $$
declare
  t tutors; tz text; v_now timestamptz := app_now();
  v_from timestamptz; v_to timestamptz;
begin
  select * into t from tutors where user_id = p_tutor;
  if t.user_id is null or not (is_public_tutor(p_tutor) or p_tutor = auth.uid()) then return; end if;
  select profiles.tz into tz from profiles where id = p_tutor;
  v_from := greatest(coalesce(p_from, v_now), v_now + make_interval(hours => t.min_lead_hours));
  v_to := least(coalesce(p_to, 'infinity'), v_now + make_interval(days => 7 * t.horizon_weeks));
  return query
    with days as (
      select d::date as day
      from generate_series((v_from at time zone tz)::date, (v_to at time zone tz)::date, interval '1 day') d
    ), starts as (
      select ((days.day + make_interval(mins => m)) at time zone tz) as s
      from days
      join weekly_windows w on w.tutor_id = p_tutor and w.weekday = extract(isodow from days.day)
      cross join lateral generate_series(w.start_min, w.end_min - p_duration, 30) m
    )
    select s from starts
    where s >= v_from and s < v_to
      and not exists (
        select 1 from bookings b
        where b.tutor_id = p_tutor and b.status in ('pending', 'confirmed')
          and tstzrange(b.starts_at, b.ends_at) && tstzrange(s, s + make_interval(mins => p_duration))
      )
    order by s;
end $$;

-- ---------- catalog (У1.1, У1.3) ----------

create function public.catalog(
  p_subject text default null, p_goal text default null, p_max_price int default null,
  p_days text default null, p_parts text[] default null, p_min_exp int default null,
  p_q text default null, p_tz text default 'Europe/Moscow'
) returns table (
  user_id uuid, slug text, name text, photo_path text, subjects text[], price_from int,
  experience_years smallint, goals text[]
)
language sql stable security definer set search_path = public as $$
  with base as (
    select t.*, p.name as tutor_name
    from tutors t join profiles p on p.id = t.user_id
    where t.status = 'published' and p.blocked_at is null
  ), priced as (
    select b.user_id,
      min(pr.price_rub * 60 / pr.duration_min) filter (where s.slug = p_subject or p_subject is null) as from_price,
      array_agg(distinct s.name) as subj_names,
      bool_or(s.slug = p_subject) as has_subject
    from base b join prices pr on pr.tutor_id = b.user_id join subjects s on s.id = pr.subject_id
    group by b.user_id
  )
  select b.user_id, b.slug, b.tutor_name, b.photo_path, pc.subj_names, pc.from_price::int,
         b.experience_years, b.goals
  from base b join priced pc on pc.user_id = b.user_id
  where (p_subject is null or pc.has_subject)
    and (p_goal is null or p_goal = any (b.goals))
    and (p_max_price is null or pc.from_price <= p_max_price)
    and (p_min_exp is null or b.experience_years >= p_min_exp)
    and (p_q is null or b.tutor_name ilike '%' || p_q || '%'
         or exists (select 1 from unnest(pc.subj_names) n where n ilike '%' || p_q || '%'))
    and exists (
      select 1 from free_slots(b.user_id, 60::smallint) s
      where (p_days is null
             or (p_days = 'weekday' and extract(isodow from s at time zone p_tz) < 6)
             or (p_days = 'weekend' and extract(isodow from s at time zone p_tz) >= 6))
        and (p_parts is null
             or ('morning' = any (p_parts) and extract(hour from s at time zone p_tz) < 12)
             or ('day' = any (p_parts) and extract(hour from s at time zone p_tz) between 12 and 16)
             or ('evening' = any (p_parts) and extract(hour from s at time zone p_tz) >= 17))
    )
  order by b.published_at, b.user_id
$$;

-- ---------- booking lifecycle ----------

create function public.create_booking(
  p_tutor uuid, p_subject smallint, p_duration smallint, p_starts_at timestamptz,
  p_for_other boolean default false, p_name text default null, p_age smallint default null
) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_student uuid := me_active('student'); v_price int; v_id bigint; v_now timestamptz := app_now();
begin
  if p_for_other and (coalesce(trim(p_name), '') = '' or p_age is null) then perform fail('participant_required'); end if;
  select price_rub into v_price from prices where tutor_id = p_tutor and subject_id = p_subject and duration_min = p_duration;
  if v_price is null or not is_public_tutor(p_tutor) then perform fail('not_available'); end if;
  if not exists (select 1 from free_slots(p_tutor, p_duration, p_starts_at, p_starts_at + interval '1 minute') s
                 where s = p_starts_at) then
    if exists (select 1 from bookings b where b.tutor_id = p_tutor and b.status in ('pending', 'confirmed')
               and tstzrange(b.starts_at, b.ends_at) && tstzrange(p_starts_at, p_starts_at + make_interval(mins => p_duration))) then
      perform fail('slot_taken');
    end if;
    perform fail('slot_unavailable');
  end if;
  begin
    insert into bookings (student_id, tutor_id, subject_id, duration_min, price_rub, starts_at, ends_at,
                          for_other, participant_name, participant_age, confirm_deadline)
    values (v_student, p_tutor, p_subject, p_duration, v_price, p_starts_at, p_starts_at + make_interval(mins => p_duration),
            p_for_other, case when p_for_other then trim(p_name) end, case when p_for_other then p_age end,
            least(v_now + interval '24 hours', p_starts_at - interval '2 hours'))
    returning id into v_id;
  exception when exclusion_violation then
    perform fail('slot_taken');
  end;
  perform log_status(v_id, null, 'pending');
  perform notify(p_tutor, v_id, 'booking_created');
  return v_id;
end $$;

-- У4.1-занят: the next free starts after a given time
create function public.next_slots(p_tutor uuid, p_duration smallint, p_after timestamptz, p_limit int default 3)
returns setof timestamptz language sql stable security definer set search_path = public as $$
  select s from free_slots(p_tutor, p_duration, p_after) s limit p_limit
$$;

create function public.booking_for_update(p_id bigint) returns bookings
language plpgsql security definer set search_path = public as $$
declare b bookings;
begin
  select * into b from bookings where id = p_id for update;
  if b.id is null then perform fail('not_found'); end if;
  return b;
end $$;

create function public.confirm_booking(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := me_active('tutor'); b bookings := booking_for_update(p_id);
begin
  if b.tutor_id <> v_me then perform fail('not_found'); end if;
  if b.status <> 'pending' or b.confirm_deadline <= app_now() then perform fail('not_pending'); end if;
  update bookings set status = 'confirmed' where id = p_id;
  perform log_status(p_id, 'pending', 'confirmed');
  perform notify(b.student_id, p_id, 'booking_confirmed');
end $$;

create function public.decline_booking(p_id bigint, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := me_active('tutor'); b bookings := booking_for_update(p_id);
begin
  if b.tutor_id <> v_me then perform fail('not_found'); end if;
  if coalesce(trim(p_reason), '') = '' then perform fail('reason_required'); end if;
  if b.status <> 'pending' then perform fail('not_pending'); end if;
  update bookings set status = 'declined', decline_reason = trim(p_reason) where id = p_id;
  perform log_status(p_id, 'pending', 'declined', trim(p_reason));
  perform notify(b.student_id, p_id, 'booking_declined', jsonb_build_object('reason', trim(p_reason)));
end $$;

-- У7.3 (student, warning under 4 hours), Р6.2 (tutor, reason required, any time)
create function public.cancel_booking(p_id bigint, p_reason text default null) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_me uuid := me_active(null); b bookings := booking_for_update(p_id); v_late boolean := false; v_by text;
begin
  if v_me = b.student_id then v_by := 'student';
  elsif v_me = b.tutor_id then v_by := 'tutor';
  else perform fail('not_found'); end if;
  if b.status not in ('pending', 'confirmed') or b.starts_at <= app_now() then perform fail('not_cancellable'); end if;
  if v_by = 'tutor' and coalesce(trim(p_reason), '') = '' then perform fail('reason_required'); end if;
  if v_by = 'student' and b.status = 'confirmed' and b.starts_at - app_now() < interval '4 hours' then v_late := true; end if;
  update bookings set status = 'cancelled', cancelled_by = v_by, cancel_reason = nullif(trim(p_reason), ''), late_cancel = v_late
  where id = p_id;
  perform log_status(p_id, b.status, 'cancelled', nullif(trim(p_reason), ''));
  perform notify(case when v_by = 'student' then b.tutor_id else b.student_id end, p_id, 'booking_cancelled',
                 jsonb_build_object('by', v_by, 'late', v_late, 'reason', nullif(trim(p_reason), '')));
  return v_late;
end $$;

create function public.set_meeting_url(p_id bigint, p_url text) returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := me_active('tutor'); b bookings := booking_for_update(p_id);
begin
  if b.tutor_id <> v_me then perform fail('not_found'); end if;
  if p_url !~ '^https?://[^\s/$.?#].[^\s]*$' then perform fail('bad_url'); end if;
  if b.status <> 'confirmed' or b.ends_at <= app_now() then perform fail('not_confirmed'); end if;
  update bookings set meeting_url = p_url where id = p_id;
  perform notify(b.student_id, p_id, 'link_added');
end $$;

create function public.mark_ok(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := me_active('student'); b bookings := booking_for_update(p_id);
begin
  if b.student_id <> v_me then perform fail('not_found'); end if;
  if b.status <> 'confirmed' or b.ends_at > app_now() then perform fail('not_finished'); end if;
  update bookings set status = 'completed', student_ok_at = app_now() where id = p_id;
  perform log_status(p_id, 'confirmed', 'completed');
end $$;

create function public.report_problem(p_id bigint, p_kind problem_kind, p_text text default '') returns bigint
language plpgsql security definer set search_path = public as $$
declare v_me uuid := me_active('student'); b bookings := booking_for_update(p_id); v_pid bigint;
begin
  if b.student_id <> v_me then perform fail('not_found'); end if;
  if b.status not in ('confirmed', 'completed') or b.ends_at > app_now() then perform fail('not_finished'); end if;
  if exists (select 1 from problems where booking_id = p_id) then perform fail('already_reported'); end if;
  insert into problems (booking_id, author_id, kind, description, due_at)
  values (p_id, v_me, p_kind, coalesce(p_text, ''), add_business_days(app_now(), 3))
  returning id into v_pid;
  perform notify(b.tutor_id, p_id, 'problem_reported');
  return v_pid;
end $$;

create function public.mark_notifications_read() returns void
language sql security definer set search_path = public as $$
  update notifications set read_at = app_now() where user_id = auth.uid() and read_at is null
$$;

-- ---------- admin (А1, А3) ----------

create function public.admin_resolve(p_problem bigint, p_resolution text, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := me_active('admin'); pr problems; b bookings;
begin
  if p_resolution not in ('happened', 'not_happened') then perform fail('bad_resolution'); end if;
  if coalesce(trim(p_reason), '') = '' then perform fail('reason_required'); end if;
  select * into pr from problems where id = p_problem for update;
  if pr.id is null or pr.status <> 'open' then perform fail('not_found'); end if;
  update problems set status = 'resolved', resolution = p_resolution, resolved_by = v_me, resolved_at = app_now()
  where id = p_problem;
  b := booking_for_update(pr.booking_id);
  if b.status = 'confirmed' then
    update bookings set status = 'completed' where id = b.id;
    perform log_status(b.id, 'confirmed', 'completed', 'решение по проблеме');
  end if;
  insert into admin_log (admin_id, action, target_id, reason) values (v_me, 'resolve_problem', p_problem::text, trim(p_reason));
  perform notify(b.student_id, b.id, 'problem_resolved', jsonb_build_object('resolution', p_resolution));
  perform notify(b.tutor_id, b.id, 'problem_resolved', jsonb_build_object('resolution', p_resolution));
end $$;

create function public.admin_hide_tutor(p_tutor uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := me_active('admin');
begin
  if coalesce(trim(p_reason), '') = '' then perform fail('reason_required'); end if;
  update tutors set status = 'hidden', hidden_reason = trim(p_reason) where user_id = p_tutor;
  if not found then perform fail('not_found'); end if;
  insert into admin_log (admin_id, action, target_id, reason) values (v_me, 'hide_tutor', p_tutor::text, trim(p_reason));
end $$;

create function public.admin_block_user(p_user uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := me_active('admin');
begin
  if coalesce(trim(p_reason), '') = '' then perform fail('reason_required'); end if;
  if p_user = v_me then perform fail('not_allowed'); end if;
  update profiles set blocked_at = app_now(), blocked_reason = trim(p_reason) where id = p_user;
  if not found then perform fail('not_found'); end if;
  insert into admin_log (admin_id, action, target_id, reason) values (v_me, 'block_user', p_user::text, trim(p_reason));
end $$;

-- ---------- background jobs (pg_cron every 5 minutes) ----------

create function public.run_jobs() returns jsonb
language plpgsql security definer set search_path = public as $$
declare r bookings; v_now timestamptz := app_now(); n_cancel int := 0; n_done int := 0; n_rem int := 0;
begin
  -- У5.2: no answer before the deadline
  for r in select * from bookings where status = 'pending' and confirm_deadline <= v_now for update skip locked loop
    update bookings set status = 'cancelled', cancelled_by = 'system', cancel_reason = 'no_answer' where id = r.id;
    insert into booking_events (booking_id, from_status, to_status, note) values (r.id, 'pending', 'cancelled', 'автоотмена');
    perform notify(r.student_id, r.id, 'booking_autocancelled');
    perform notify(r.tutor_id, r.id, 'booking_autocancelled');
    n_cancel := n_cancel + 1;
  end loop;
  -- У7.4: passed 24 hours after the end without a problem report
  for r in select b.* from bookings b where b.status = 'confirmed' and b.ends_at + interval '24 hours' <= v_now
             and not exists (select 1 from problems p where p.booking_id = b.id) for update skip locked loop
    update bookings set status = 'completed' where id = r.id;
    insert into booking_events (booking_id, from_status, to_status, note) values (r.id, 'confirmed', 'completed', 'автоматически');
    n_done := n_done + 1;
  end loop;
  -- У7.2: reminders 24 h and 1 h before the start
  for r in select * from bookings where status = 'confirmed' and reminded_24h_at is null
             and starts_at - interval '24 hours' <= v_now and starts_at - interval '1 hour' > v_now for update skip locked loop
    update bookings set reminded_24h_at = v_now where id = r.id;
    perform notify(r.student_id, r.id, 'reminder_24h');
    perform notify(r.tutor_id, r.id, 'reminder_24h');
    n_rem := n_rem + 1;
  end loop;
  for r in select * from bookings where status = 'confirmed' and reminded_1h_at is null
             and starts_at - interval '1 hour' <= v_now and starts_at > v_now for update skip locked loop
    update bookings set reminded_1h_at = v_now, reminded_24h_at = coalesce(reminded_24h_at, v_now) where id = r.id;
    perform notify(r.student_id, r.id, 'reminder_1h');
    perform notify(r.tutor_id, r.id, 'reminder_1h');
    n_rem := n_rem + 1;
  end loop;
  -- Р6.1: no meeting link 15 minutes before the start
  for r in select * from bookings where status = 'confirmed' and meeting_url is null and link_reminded_at is null
             and starts_at - interval '15 minutes' <= v_now and starts_at > v_now for update skip locked loop
    update bookings set link_reminded_at = v_now where id = r.id;
    perform notify(r.tutor_id, r.id, 'link_missing');
  end loop;
  return jsonb_build_object('cancelled', n_cancel, 'completed', n_done, 'reminders', n_rem);
end $$;

-- Schedule on Supabase (pg_cron exists there); skipped where the extension is unavailable.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('toprepet-jobs', '*/5 * * * *', 'select public.run_jobs()');
  end if;
end $$;

-- ---------- grants ----------

revoke execute on all functions in schema public from public, anon;
grant execute on function public.catalog, public.free_slots, public.next_slots, public.app_now,
  public.is_public_tutor, public.is_admin, public.my_role to anon, authenticated;
grant execute on function public.tutor_missing, public.publish_tutor, public.unpublish_tutor,
  public.create_booking, public.confirm_booking, public.decline_booking, public.cancel_booking,
  public.set_meeting_url, public.mark_ok, public.report_problem, public.mark_notifications_read,
  public.admin_resolve, public.admin_hide_tutor, public.admin_block_user to authenticated;
-- internal helpers stay callable only from inside security definer functions
revoke execute on function public.notify, public.log_status, public.booking_for_update, public.run_jobs,
  public.me_active, public.fail from authenticated;
grant execute on function public.run_jobs to service_role;
