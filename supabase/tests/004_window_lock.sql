-- Р3.1: windows with a live booking are locked; Р2.1-публикация: «window» means a bookable start exists.
select set_config('app.now', '2026-10-19 09:00+03', true);
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000d1', 'lock-t@example.com', '{"name":"Анна","role":"tutor","tz":"Europe/Moscow"}'),
  ('00000000-0000-0000-0000-0000000000d2', 'lock-s@example.com', '{"name":"Ольга","role":"student"}');
update tutors set photo_path = 'a.webp', slug = 'lock-anna', status = 'published', published_at = '2026-10-01'
where user_id = '00000000-0000-0000-0000-0000000000d1';
insert into tutor_subjects (tutor_id, subject_id) select '00000000-0000-0000-0000-0000000000d1', id from subjects where slug = 'math';
insert into prices (tutor_id, subject_id, duration_min, price_rub)
  select '00000000-0000-0000-0000-0000000000d1', id, 60, 1500 from subjects where slug = 'math';
-- a 30-minute window cannot hold a 60-minute lesson
insert into weekly_windows (tutor_id, weekday, start_min, end_min) values ('00000000-0000-0000-0000-0000000000d1', 2, 600, 630);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
do $$ begin
  assert tutor_missing() = array['window'], 'too short window counts as missing: ' || tutor_missing()::text;
  update weekly_windows set end_min = 720 where tutor_id = auth.uid();
  assert cardinality(tutor_missing()) = 0, 'a 2-hour window is enough';
end $$;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}', true);
do $$ begin
  perform create_booking('00000000-0000-0000-0000-0000000000d1', (select id from subjects where slug = 'math'), 60::smallint, '2026-10-20 10:00+03');
end $$;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
do $$ begin
  begin
    delete from weekly_windows where tutor_id = auth.uid();
    assert false, 'booked window must not be deleted';
  exception when raise_exception then assert sqlerrm = 'window_booked', sqlerrm;
  end;
  insert into weekly_windows (tutor_id, weekday, start_min, end_min) values (auth.uid(), 3, 600, 720);
  delete from weekly_windows where tutor_id = auth.uid() and weekday = 3;
  assert not exists (select 1 from weekly_windows where weekday = 3), 'free window can be deleted';
end $$;
