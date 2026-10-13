-- TopRepet MVP schema: users, tutor profiles, prices, weekly windows, bookings and their history.
-- Spec: docs/requirements.md, section 5. Statuses change only through functions (later migrations),
-- so RLS gives clients read access and narrow write access to their own drafts.

create extension if not exists btree_gist with schema extensions;

-- ---------- users ----------

create type public.user_role as enum ('student', 'tutor', 'admin');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  name text not null check (length(trim(name)) between 1 and 80),
  email text not null,
  tz text not null default 'Europe/Moscow',
  blocked_at timestamptz,
  blocked_reason text,
  created_at timestamptz not null default now()
);

-- A new auth user gets a profile from the sign-up metadata: { name, role, tz }.
-- Admin is never self-assigned: anything but 'tutor' becomes 'student'.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, name, email, tz)
  values (
    new.id,
    case when new.raw_user_meta_data ->> 'role' = 'tutor' then 'tutor'::user_role else 'student'::user_role end,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)),
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'tz', ''), 'Europe/Moscow')
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role, email and block fields are not editable by the user (У3.1: role is chosen once).
create function public.protect_profile() returns trigger
language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.role is distinct from old.role then raise exception 'role_is_permanent'; end if;
    if new.email is distinct from old.email or new.blocked_at is distinct from old.blocked_at
       or new.blocked_reason is distinct from old.blocked_reason then
      raise exception 'not_allowed';
    end if;
  end if;
  return new;
end $$;

create trigger protect_profile before update on public.profiles
  for each row execute function public.protect_profile();

create function public.my_role() returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ---------- catalog ----------

create table public.subjects (
  id smallint generated always as identity primary key,
  slug text not null unique,
  name text not null unique,
  sort smallint not null default 100
);

create type public.tutor_status as enum ('draft', 'published', 'hidden');

create table public.tutors (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  slug text unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  photo_path text,
  about text not null default '',
  education text not null default '',
  approach text not null default '',
  experience_years smallint check (experience_years between 0 and 70),
  goals text[] not null default '{}'
    check (goals <@ array['school', 'homework', 'oge', 'ege', 'speaking', 'preschool']),
  status public.tutor_status not null default 'draft',
  hidden_reason text,
  horizon_weeks smallint not null default 2 check (horizon_weeks in (1, 2, 4)),
  min_lead_hours smallint not null default 12 check (min_lead_hours in (12, 24)),
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create function public.protect_tutor() returns trigger
language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.status is distinct from old.status or new.hidden_reason is distinct from old.hidden_reason
       or new.published_at is distinct from old.published_at then
      raise exception 'use_publish_function';
    end if;
  end if;
  return new;
end $$;

create trigger protect_tutor before update on public.tutors
  for each row execute function public.protect_tutor();

-- Every tutor account gets an empty draft profile.
create function public.handle_new_tutor() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role = 'tutor' then insert into public.tutors (user_id) values (new.id) on conflict do nothing; end if;
  return new;
end $$;

create trigger on_profile_created after insert on public.profiles
  for each row execute function public.handle_new_tutor();

create table public.tutor_subjects (
  tutor_id uuid references public.tutors (user_id) on delete cascade,
  subject_id smallint references public.subjects (id),
  topics text not null default '',
  primary key (tutor_id, subject_id)
);

create table public.prices (
  id bigint generated always as identity primary key,
  tutor_id uuid not null references public.tutors (user_id) on delete cascade,
  subject_id smallint not null references public.subjects (id),
  duration_min smallint not null check (duration_min in (45, 60, 90, 120)),
  price_rub integer not null check (price_rub between 300 and 20000),
  unique (tutor_id, subject_id, duration_min),
  foreign key (tutor_id, subject_id) references public.tutor_subjects (tutor_id, subject_id) on delete cascade
);

-- Weekly windows in the tutor's own time zone: minutes from local midnight, 30-minute grid.
create table public.weekly_windows (
  id bigint generated always as identity primary key,
  tutor_id uuid not null references public.tutors (user_id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  start_min smallint not null check (start_min between 0 and 1410 and start_min % 30 = 0),
  end_min smallint not null check (end_min between 30 and 1440 and end_min % 30 = 0),
  check (end_min > start_min),
  exclude using gist (tutor_id with =, weekday with =, int4range(start_min, end_min) with &&)
);

-- ---------- bookings ----------

create type public.booking_status as enum ('pending', 'confirmed', 'declined', 'cancelled', 'completed');

create table public.bookings (
  id bigint generated always as identity (start with 2001) primary key,
  student_id uuid not null references public.profiles (id),
  tutor_id uuid not null references public.tutors (user_id),
  subject_id smallint not null references public.subjects (id),
  duration_min smallint not null,
  price_rub integer not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  for_other boolean not null default false,
  participant_name text,
  participant_age smallint check (participant_age between 1 and 120),
  status public.booking_status not null default 'pending',
  confirm_deadline timestamptz not null,
  decline_reason text,
  cancelled_by text check (cancelled_by in ('student', 'tutor', 'system')),
  cancel_reason text,
  late_cancel boolean not null default false,
  meeting_url text check (meeting_url ~ '^https?://'),
  student_ok_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (not for_other or (participant_name is not null and participant_age is not null)),
  -- У4.1-занят: two live bookings can never overlap for one tutor
  constraint bookings_no_overlap exclude using gist (
    tutor_id with =, tstzrange(starts_at, ends_at) with &&
  ) where (status in ('pending', 'confirmed'))
);

create index bookings_student on public.bookings (student_id, starts_at);
create index bookings_tutor on public.bookings (tutor_id, starts_at);
create index bookings_pending_deadline on public.bookings (confirm_deadline) where status = 'pending';

create table public.booking_events (
  id bigint generated always as identity primary key,
  booking_id bigint not null references public.bookings (id) on delete cascade,
  at timestamptz not null default now(),
  actor_id uuid references public.profiles (id),
  from_status public.booking_status,
  to_status public.booking_status not null,
  note text
);

create type public.problem_kind as enum ('no_show', 'technical', 'other');

create table public.problems (
  id bigint generated always as identity primary key,
  booking_id bigint not null unique references public.bookings (id) on delete cascade,
  author_id uuid not null references public.profiles (id),
  kind public.problem_kind not null,
  description text not null default '',
  status text not null default 'open' check (status in ('open', 'resolved')),
  due_at timestamptz not null,
  resolution text check (resolution in ('happened', 'not_happened')),
  resolved_by uuid references public.profiles (id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  booking_id bigint references public.bookings (id) on delete cascade,
  kind text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index notifications_unread on public.notifications (user_id) where read_at is null;

create table public.email_outbox (
  id bigint generated always as identity primary key,
  to_email text not null,
  template text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  error text
);

create table public.admin_log (
  id bigint generated always as identity primary key,
  admin_id uuid not null references public.profiles (id),
  action text not null check (action in ('hide_tutor', 'block_user', 'resolve_problem')),
  target_id text not null,
  reason text not null check (length(trim(reason)) > 0),
  at timestamptz not null default now()
);

-- ---------- row level security ----------

alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.tutors enable row level security;
alter table public.tutor_subjects enable row level security;
alter table public.prices enable row level security;
alter table public.weekly_windows enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_events enable row level security;
alter table public.problems enable row level security;
alter table public.notifications enable row level security;
alter table public.email_outbox enable row level security;
alter table public.admin_log enable row level security;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

create function public.is_public_tutor(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.tutors tu join public.profiles p on p.id = tu.user_id
    where tu.user_id = t and tu.status = 'published' and p.blocked_at is null
  )
$$;

-- profiles: own row; public tutors' names; counterpart names inside shared bookings; admins see all
create policy profiles_read on public.profiles for select using (
  id = auth.uid() or public.is_admin() or public.is_public_tutor(id)
  or exists (select 1 from public.bookings b where (b.student_id = auth.uid() and b.tutor_id = profiles.id)
                                              or (b.tutor_id = auth.uid() and b.student_id = profiles.id))
);
create policy profiles_update_own on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy subjects_read on public.subjects for select using (true);

create policy tutors_read on public.tutors for select using (
  public.is_public_tutor(user_id) or user_id = auth.uid() or public.is_admin()
);
create policy tutors_update_own on public.tutors for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy tutor_subjects_read on public.tutor_subjects for select using (
  public.is_public_tutor(tutor_id) or tutor_id = auth.uid() or public.is_admin()
);
create policy tutor_subjects_write on public.tutor_subjects for all using (tutor_id = auth.uid()) with check (tutor_id = auth.uid());

create policy prices_read on public.prices for select using (
  public.is_public_tutor(tutor_id) or tutor_id = auth.uid() or public.is_admin()
);
create policy prices_write on public.prices for all using (tutor_id = auth.uid()) with check (tutor_id = auth.uid());

create policy windows_read on public.weekly_windows for select using (
  public.is_public_tutor(tutor_id) or tutor_id = auth.uid() or public.is_admin()
);
create policy windows_write on public.weekly_windows for all using (tutor_id = auth.uid()) with check (tutor_id = auth.uid());

-- bookings: participants and admins read; all writes go through security definer functions
create policy bookings_read on public.bookings for select using (
  student_id = auth.uid() or tutor_id = auth.uid() or public.is_admin()
);
create policy booking_events_read on public.booking_events for select using (
  public.is_admin() or exists (select 1 from public.bookings b where b.id = booking_id
                                 and (b.student_id = auth.uid() or b.tutor_id = auth.uid()))
);
create policy problems_read on public.problems for select using (
  author_id = auth.uid() or public.is_admin()
  or exists (select 1 from public.bookings b where b.id = booking_id and b.tutor_id = auth.uid())
);
create policy notifications_read on public.notifications for select using (user_id = auth.uid());
create policy notifications_mark_read on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy admin_log_read on public.admin_log for select using (public.is_admin());
-- email_outbox: no policies, only service role and security definer functions

-- Column-level guard: clients may only flip read_at on notifications
revoke update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;
revoke insert, update, delete on public.bookings, public.booking_events, public.problems, public.admin_log, public.email_outbox from anon, authenticated;
revoke insert, delete on public.profiles, public.tutors from anon, authenticated;
revoke all on public.email_outbox from anon, authenticated;

-- ---------- subjects ----------

insert into public.subjects (slug, name, sort) values
  ('english', 'Английский язык', 10), ('math', 'Математика', 20), ('russian', 'Русский язык', 30),
  ('physics', 'Физика', 40), ('chemistry', 'Химия', 50), ('informatics', 'Информатика', 60),
  ('history', 'История', 70), ('social', 'Обществознание', 80), ('biology', 'Биология', 90),
  ('literature', 'Литература', 100), ('german', 'Немецкий язык', 110), ('french', 'Французский язык', 120),
  ('spanish', 'Испанский язык', 130), ('chinese', 'Китайский язык', 140), ('geography', 'География', 150),
  ('primary', 'Начальная школа', 160), ('preschool', 'Подготовка к школе', 170);
