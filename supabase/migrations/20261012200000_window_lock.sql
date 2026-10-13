-- Р3.1: a weekly window that covers a live future booking cannot be changed or deleted, even through REST.
create function public.protect_booked_window() returns trigger
language plpgsql security definer set search_path = public as $$
declare tz text := (select p.tz from profiles p where p.id = old.tutor_id);
begin
  if exists (
    select 1 from bookings b
    where b.tutor_id = old.tutor_id and b.status in ('pending', 'confirmed') and b.ends_at > app_now()
      and extract(isodow from b.starts_at at time zone tz) = old.weekday
      and int4range(old.start_min, old.end_min) && int4range(
        (extract(hour from b.starts_at at time zone tz) * 60 + extract(minute from b.starts_at at time zone tz))::int,
        (extract(hour from b.starts_at at time zone tz) * 60 + extract(minute from b.starts_at at time zone tz))::int + b.duration_min)
  ) then
    raise exception using message = 'window_booked', errcode = 'P0001';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

create trigger protect_booked_window before update or delete on public.weekly_windows
  for each row execute function public.protect_booked_window();

-- Р2.1-публикация: «window» is missing until the schedule gives at least one bookable start
create or replace function public.tutor_missing(p_tutor uuid default auth.uid()) returns text[]
language sql stable security definer set search_path = public as $$
  select array_remove(array[
    case when coalesce(t.photo_path, '') = '' then 'photo' end,
    case when coalesce(trim(p.name), '') = '' then 'name' end,
    case when not exists (select 1 from prices pr where pr.tutor_id = t.user_id) then 'subject_price' end,
    case when not exists (
      select 1 from free_slots(t.user_id, coalesce((select min(duration_min) from prices where tutor_id = t.user_id), 45)::smallint)
    ) then 'window' end
  ], null)
  from tutors t join profiles p on p.id = t.user_id
  where t.user_id = p_tutor and (p_tutor = auth.uid() or public.is_admin())
$$;
