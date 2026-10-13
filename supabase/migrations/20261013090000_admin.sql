-- Iteration 5: admin area (А1, А2, А3) and the sign-in block for blocked accounts (section 6 of the spec).

-- ---------- А1: undo an action, also with a reason in the log ----------

alter table public.admin_log drop constraint admin_log_action_check;
alter table public.admin_log add constraint admin_log_action_check
  check (action in ('hide_tutor', 'unhide_tutor', 'block_user', 'unblock_user', 'resolve_problem'));

-- The profile goes back to the catalog when it still has everything publication needs, otherwise to a draft.
create function public.admin_unhide_tutor(p_tutor uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := me_active('admin');
begin
  if coalesce(trim(p_reason), '') = '' then perform fail('reason_required'); end if;
  update tutors set status = 'published', hidden_reason = null where user_id = p_tutor and status = 'hidden';
  if not found then perform fail('not_found'); end if;
  -- free slots (part of «what is missing») are counted only for a published profile, so the check comes after
  if cardinality(tutor_missing(p_tutor)) > 0 or (select published_at from tutors where user_id = p_tutor) is null then
    update tutors set status = 'draft' where user_id = p_tutor;
  end if;
  insert into admin_log (admin_id, action, target_id, reason) values (v_me, 'unhide_tutor', p_tutor::text, trim(p_reason));
end $$;

create function public.admin_unblock_user(p_user uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := me_active('admin');
begin
  if coalesce(trim(p_reason), '') = '' then perform fail('reason_required'); end if;
  update profiles set blocked_at = null, blocked_reason = null where id = p_user and blocked_at is not null;
  if not found then perform fail('not_found'); end if;
  insert into admin_log (admin_id, action, target_id, reason) values (v_me, 'unblock_user', p_user::text, trim(p_reason));
end $$;

-- ---------- А3: the comment to the decision goes into both letters (mockup adminDispute) ----------

create or replace function public.admin_resolve(p_problem bigint, p_resolution text, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := me_active('admin'); pr problems; b bookings; v_payload jsonb;
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
  v_payload := jsonb_build_object('resolution', p_resolution, 'comment', trim(p_reason));
  perform notify(b.student_id, b.id, 'problem_resolved', v_payload);
  perform notify(b.tutor_id, b.id, 'problem_resolved', v_payload);
end $$;

-- ---------- А2: registry of lessons with search ----------

-- p_q: a name or email of the student, the participant or the tutor, or a booking number («B-2048» or «2048»).
-- p_status: a booking status; 'confirmed' means upcoming or running, 'completed' also takes confirmed lessons that have ended
-- (the card says «Прошло» for both). p_from/p_to: the start falls inside. p_problem: only lessons with a problem.
create function public.admin_bookings(
  p_q text default null, p_status text default null, p_from timestamptz default null, p_to timestamptz default null,
  p_problem boolean default false, p_limit int default 50, p_offset int default 0
) returns table (
  id bigint, starts_at timestamptz, ends_at timestamptz, status public.booking_status, price_rub int,
  student_id uuid, student_name text, participant_name text, tutor_id uuid, tutor_name text,
  subject_name text, problem_status text, total bigint
)
language plpgsql stable security definer set search_path = public as $$
declare v_q text := nullif(trim(p_q), ''); v_num bigint; v_now timestamptz := app_now();
begin
  if not is_admin() then perform fail('wrong_role'); end if;
  if v_q ~* '^b?-?\s*\d+$' then v_num := regexp_replace(v_q, '\D', '', 'g')::bigint; end if;
  return query
    select b.id, b.starts_at, b.ends_at, b.status, b.price_rub,
           b.student_id, st.name, b.participant_name, b.tutor_id, tu.name,
           s.name, pr.status, count(*) over ()
    from bookings b
    join profiles st on st.id = b.student_id
    join profiles tu on tu.id = b.tutor_id
    join subjects s on s.id = b.subject_id
    left join problems pr on pr.booking_id = b.id
    where (v_q is null or b.id = v_num
           or st.name ilike '%' || v_q || '%' or st.email ilike '%' || v_q || '%'
           or tu.name ilike '%' || v_q || '%' or tu.email ilike '%' || v_q || '%'
           or coalesce(b.participant_name, '') ilike '%' || v_q || '%')
      and (p_status is null
           or (p_status = 'confirmed' and b.status = 'confirmed' and b.ends_at > v_now)
           or (p_status = 'completed' and (b.status = 'completed' or (b.status = 'confirmed' and b.ends_at <= v_now)))
           or (p_status not in ('confirmed', 'completed') and b.status::text = p_status))
      and (p_from is null or b.starts_at >= p_from)
      and (p_to is null or b.starts_at < p_to)
      and (not p_problem or pr.id is not null)
    order by b.starts_at desc, b.id desc
    limit least(greatest(p_limit, 1), 200) offset greatest(p_offset, 0);
end $$;

-- ---------- А1: users with their profile status and cancellations in 30 days ----------

create function public.admin_users(p_q text default null, p_role text default null, p_limit int default 50)
returns table (
  id uuid, name text, email text, role public.user_role, created_at timestamptz,
  blocked_at timestamptz, blocked_reason text, tutor_status public.tutor_status, hidden_reason text, slug text,
  cancels_30d bigint, total bigint
)
language plpgsql stable security definer set search_path = public as $$
declare v_q text := nullif(trim(p_q), '');
begin
  if not is_admin() then perform fail('wrong_role'); end if;
  return query
    select p.id, p.name, p.email, p.role, p.created_at, p.blocked_at, p.blocked_reason, t.status, t.hidden_reason, t.slug,
           (select count(*) from bookings b
            where b.status = 'cancelled' and b.created_at > app_now() - interval '30 days'
              and ((b.cancelled_by = 'student' and b.student_id = p.id) or (b.cancelled_by = 'tutor' and b.tutor_id = p.id))),
           count(*) over ()
    from profiles p
    left join tutors t on t.user_id = p.id
    where (v_q is null or p.name ilike '%' || v_q || '%' or p.email ilike '%' || v_q || '%')
      and (p_role is null or p.role::text = p_role)
    order by p.created_at desc, p.id
    limit least(greatest(p_limit, 1), 200);
end $$;

-- ---------- section 6: a blocked account cannot sign in ----------

-- Supabase Auth «Custom Access Token» hook: no token (sign-in or refresh) for a blocked profile.
-- Turned on in supabase/config.toml locally; on the cloud project in Authentication → Hooks.
create function public.custom_access_token_hook(event jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if exists (select 1 from profiles where id = (event ->> 'user_id')::uuid and blocked_at is not null) then
    return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'blocked'));
  end if;
  return jsonb_build_object('claims', event -> 'claims');
end $$;

-- ---------- grants ----------

revoke execute on function public.admin_unhide_tutor, public.admin_unblock_user, public.admin_bookings,
  public.admin_users, public.custom_access_token_hook from public, anon;
grant execute on function public.admin_unhide_tutor, public.admin_unblock_user, public.admin_bookings,
  public.admin_users to authenticated;
revoke execute on function public.custom_access_token_hook from authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant usage on schema public to supabase_auth_admin;
    grant execute on function public.custom_access_token_hook to supabase_auth_admin;
  end if;
end $$;
