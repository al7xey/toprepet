-- Р2.1-публикация, Р3.1, Р3.2, У2.1, У1.1, У1.3: publication checklist, free slots and catalog filters.
-- Clock: Monday 19.10.2026 09:00 Moscow. Tutor Anna lives in UTC+5 (Yekaterinburg).

select set_config('app.now', '2026-10-19 09:00+03', true);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@example.com', '{"name":"Анна Ковалёва","role":"tutor","tz":"Asia/Yekaterinburg"}'),
  ('00000000-0000-0000-0000-00000000000b', 'dima@example.com', '{"name":"Дмитрий","role":"tutor"}'),
  ('00000000-0000-0000-0000-00000000000c', 'olga@example.com', '{"name":"Ольга","role":"student"}');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

do $$
declare v text[];
begin
  v := tutor_missing();
  assert v = array['photo', 'subject_price', 'window'], 'missing list for an empty draft: ' || v::text;
  begin
    perform publish_tutor();
    assert false, 'publish must fail while not ready';
  exception when raise_exception then
    assert sqlerrm = 'not_ready', sqlerrm;
  end;

  update tutors set photo_path = 'teachers/anna.webp', slug = 'anna-kovaleva', experience_years = 6,
                    goals = array['ege', 'speaking'], min_lead_hours = 12, horizon_weeks = 2
  where user_id = auth.uid();
  insert into tutor_subjects (tutor_id, subject_id) select auth.uid(), id from subjects where slug = 'english';
  insert into prices (tutor_id, subject_id, duration_min, price_rub)
    select auth.uid(), id, 60, 2000 from subjects where slug = 'english'
    union all select auth.uid(), id, 90, 2800 from subjects where slug = 'english';
  -- Р3.1: windows in Anna's zone. Monday 18:00–21:00 Yekaterinburg = 16:00–19:00 Moscow
  insert into weekly_windows (tutor_id, weekday, start_min, end_min) values
    (auth.uid(), 1, 18 * 60, 21 * 60), (auth.uid(), 6, 10 * 60, 12 * 60);
  begin
    insert into weekly_windows (tutor_id, weekday, start_min, end_min) values (auth.uid(), 1, 20 * 60, 22 * 60);
    assert false, 'overlapping windows must fail';
  exception when exclusion_violation then null;
  end;
  begin
    insert into prices (tutor_id, subject_id, duration_min, price_rub) select auth.uid(), id, 45, 200 from subjects where slug = 'english';
    assert false, 'price below 300 must fail';
  exception when check_violation then null;
  end;

  assert cardinality(tutor_missing()) = 0, 'ready to publish';
  perform publish_tutor();
  assert (select status from tutors where user_id = auth.uid()) = 'published', 'published';
end $$;

-- as a guest: slots and catalog
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

do $$
declare
  anna uuid := '00000000-0000-0000-0000-00000000000a';
  first_slot timestamptz;
  n int;
begin
  -- У2.1: 60-minute slots on Monday 19.10: 18:00, 18:30 … 20:00 Yekaterinburg (min lead 12 h from 09:00 MSK = 21:00 MSK,
  -- Monday window ends 19:00 MSK, so Monday 19.10 has no slots; first slots are Saturday 24.10)
  select min(s) into first_slot from free_slots(anna, 60::smallint) s;
  assert first_slot = '2026-10-24 10:00+05', 'first slot is Saturday 10:00 Yekaterinburg, got ' || first_slot;
  select count(*) into n from free_slots(anna, 60::smallint) s where s < '2026-10-25 00:00+05';
  assert n = 3, 'Saturday 10:00–12:00 gives 3 starts for 60 min, got ' || n;
  select count(*) into n from free_slots(anna, 90::smallint) s where s < '2026-10-25 00:00+05';
  assert n = 2, '90 minutes gives 2 starts, got ' || n;
  -- Р3.2: horizon 2 weeks ends 02.11 09:00 MSK; Monday 26.10 and Saturday 31.10 are inside, Monday 02.11 evening is not
  assert not exists (select 1 from free_slots(anna, 60::smallint) s where s >= '2026-11-02 00:00+03'), 'horizon respected';
  assert exists (select 1 from free_slots(anna, 60::smallint) s where s = '2026-10-26 18:00+05'), 'next Monday evening is open';

  -- У1.1, У1.3: catalog
  assert (select count(*) from catalog()) = 1, 'only the published tutor with slots';
  assert (select price_from from catalog()) = 2000, 'price from is the 60-minute price when there is one';
  assert (select count(*) from catalog(p_subject => 'english')) = 1, 'subject filter';
  assert (select count(*) from catalog(p_subject => 'math')) = 0, 'other subject';
  assert (select price_from from catalog(p_subject => 'english')) = 2000, 'price for the subject';
  assert (select count(*) from catalog(p_goal => 'ege')) = 1, 'goal filter';
  assert (select count(*) from catalog(p_goal => 'oge')) = 0, 'goal filter negative';
  assert (select count(*) from catalog(p_max_price => 1500)) = 0, 'price filter';
  assert (select count(*) from catalog(p_min_exp => 5)) = 1, 'experience filter';
  assert (select count(*) from catalog(p_min_exp => 10)) = 0, 'experience filter negative';
  -- Saturday 10:00–12:00 Yekaterinburg is 08:00–10:00 Moscow (morning, weekend); Monday 16:00–19:00 Moscow (day/evening, weekday)
  assert (select count(*) from catalog(p_days => 'weekend', p_parts => array['morning'])) = 1, 'weekend morning in Moscow';
  assert (select count(*) from catalog(p_days => 'weekend', p_parts => array['evening'])) = 0, 'no weekend evening';
  assert (select count(*) from catalog(p_days => 'weekday', p_parts => array['evening'])) = 1, 'weekday evening in Moscow';
  assert (select count(*) from catalog(p_days => 'weekend', p_parts => array['day'], p_tz => 'Asia/Yekaterinburg')) = 0,
    'in Yekaterinburg the weekend window is morning, not day';
  assert (select count(*) from catalog(p_q => 'англ')) = 1, 'search by subject prefix';
  assert (select count(*) from catalog(p_q => 'Ковал')) = 1, 'search by name';
  assert (select count(*) from catalog(p_q => 'японский')) = 0, 'search miss';
  assert (select count(*) from tutors) = 1, 'guest sees only the published profile';
end $$;
