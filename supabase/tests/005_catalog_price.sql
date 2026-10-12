-- У1.1: «от …» in the catalog is the real 60-minute price, or the hourly rate rounded to 10 ₽ when there is none.

select set_config('app.now', '2026-10-19 09:00+03', true);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'p60@example.com', '{"name":"Пётр","role":"tutor"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'p90@example.com', '{"name":"Вера","role":"tutor"}');

set local role authenticated;

do $$
declare
  t record;
begin
  for t in select * from (values
    ('00000000-0000-0000-0000-0000000000a1'::uuid, 'petr', array[60, 90], array[2000, 2800]),
    ('00000000-0000-0000-0000-0000000000a2'::uuid, 'vera', array[90], array[2600])) v(id, slug, durs, rubs)
  loop
    perform set_config('request.jwt.claims', json_build_object('sub', t.id, 'role', 'authenticated')::text, true);
    update tutors set photo_path = 'teachers/' || t.slug || '.webp', slug = t.slug, experience_years = 3 where user_id = t.id;
    insert into tutor_subjects (tutor_id, subject_id) select t.id, id from subjects where slug = 'math';
    insert into prices (tutor_id, subject_id, duration_min, price_rub)
      select t.id, s.id, d, r from subjects s, unnest(t.durs, t.rubs) u(d, r) where s.slug = 'math';
    insert into weekly_windows (tutor_id, weekday, start_min, end_min) values (t.id, 2, 10 * 60, 14 * 60);
    perform publish_tutor();
  end loop;
end $$;

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

do $$
declare p60 int; p90 int;
begin
  select price_from into p60 from catalog(p_subject => 'math') where slug = 'petr';
  select price_from into p90 from catalog(p_subject => 'math') where slug = 'vera';
  assert p60 = 2000, 'with a 60-minute price: ' || coalesce(p60::text, 'null');
  assert p90 = 1730, 'only 90 minutes, 2600 ₽: ' || coalesce(p90::text, 'null');
end $$;
