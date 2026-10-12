-- Catalog «от …»: the real 60-minute price when the tutor has one, otherwise the hourly rate rounded to 10 ₽.
create or replace function public.catalog(
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
      coalesce(
        min(pr.price_rub) filter (where pr.duration_min = 60 and (s.slug = p_subject or p_subject is null)),
        round(min(pr.price_rub * 60.0 / pr.duration_min) filter (where s.slug = p_subject or p_subject is null), -1)
      ) as from_price,
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
