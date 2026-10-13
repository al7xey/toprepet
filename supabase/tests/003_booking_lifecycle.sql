-- У3.3+У4.1, У4.1-занят, У4.2, Р4.1, У5.2, У7.3, Р6.1, Р6.2, У7.4, У7.5, А3, А1, О2.
-- Clock starts Monday 19.10.2026 09:00 Moscow.

select set_config('app.now', '2026-10-19 09:00+03', true);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'anna@example.com', '{"name":"Анна","role":"tutor","tz":"Europe/Moscow"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'olga@example.com', '{"name":"Ольга","role":"student"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'igor@example.com', '{"name":"Игорь","role":"student"}'),
  ('00000000-0000-0000-0000-0000000000c1', 'admin@example.com', '{"name":"Админ","role":"student"}');
update profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000c1';

-- Anna: English 60 min 2 000 ₽, every day 10:00–22:00 Moscow, min lead 12 h
update tutors set photo_path = 'a.webp', slug = 'anna', status = 'published', published_at = '2026-10-01'
where user_id = '00000000-0000-0000-0000-0000000000a1';
insert into tutor_subjects (tutor_id, subject_id) select '00000000-0000-0000-0000-0000000000a1', id from subjects where slug = 'english';
insert into prices (tutor_id, subject_id, duration_min, price_rub)
  select '00000000-0000-0000-0000-0000000000a1', id, 60, 2000 from subjects where slug = 'english';
insert into weekly_windows (tutor_id, weekday, start_min, end_min)
  select '00000000-0000-0000-0000-0000000000a1', d, 600, 1320 from generate_series(1, 7) d;

create temp table ctx (k text primary key, v bigint);
grant all on ctx to authenticated;

-- Olga books Tuesday 20.10 18:00 for her son
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);

do $$
declare id1 bigint; eng smallint := (select id from subjects where slug = 'english'); b bookings;
begin
  begin
    perform create_booking('00000000-0000-0000-0000-0000000000a1', eng, 60::smallint, '2026-10-20 18:00+03', true, '', null);
    assert false, 'participant name and age are required';
  exception when raise_exception then assert sqlerrm = 'participant_required', sqlerrm;
  end;
  begin
    perform create_booking('00000000-0000-0000-0000-0000000000a1', eng, 60::smallint, '2026-10-19 12:00+03');
    assert false, 'slot inside min lead must fail';
  exception when raise_exception then assert sqlerrm = 'slot_unavailable', sqlerrm;
  end;
  id1 := create_booking('00000000-0000-0000-0000-0000000000a1', eng, 60::smallint, '2026-10-20 18:00+03', true, 'Миша', 12::smallint);
  insert into ctx values ('b1', id1);
  select * into b from bookings where id = id1;
  assert b.status = 'pending' and b.price_rub = 2000, 'pending with the tutor price (У4.2, no markup)';
  -- created 19.10 09:00 → deadline min(20.10 09:00, 20.10 16:00) = 20.10 09:00
  assert b.confirm_deadline = '2026-10-20 09:00+03', 'deadline 24 h: ' || b.confirm_deadline;
  assert b.participant_name = 'Миша' and b.participant_age = 12, 'participant saved';
  assert not exists (select 1 from free_slots('00000000-0000-0000-0000-0000000000a1', 60::smallint) s
                     where s = '2026-10-20 18:00+03'), 'slot hidden for others';
  assert not exists (select 1 from free_slots('00000000-0000-0000-0000-0000000000a1', 60::smallint) s
                     where s = '2026-10-20 17:30+03'), 'overlapping half-hour start hidden too';
  assert (select count(*) from notifications) = 0, 'student sees only own notifications';
end $$;

-- Igor tries the same slot (У4.1-занят) and books a late one: Monday 19.10 21:00 (deadline 2 h before start)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
do $$
declare eng smallint := (select id from subjects where slug = 'english'); id2 bigint; nxt timestamptz[];
begin
  begin
    perform create_booking('00000000-0000-0000-0000-0000000000a1', eng, 60::smallint, '2026-10-20 18:00+03');
    assert false, 'taken slot must fail';
  exception when raise_exception then assert sqlerrm = 'slot_taken', sqlerrm;
  end;
  select array_agg(s) into nxt from next_slots('00000000-0000-0000-0000-0000000000a1', 60::smallint, '2026-10-20 18:00+03') s;
  assert nxt = array['2026-10-20 19:00+03', '2026-10-20 19:30+03', '2026-10-20 20:00+03']::timestamptz[], '3 nearest: ' || nxt::text;
  id2 := create_booking('00000000-0000-0000-0000-0000000000a1', eng, 60::smallint, '2026-10-19 21:00+03');
  insert into ctx values ('b2', id2);
  assert (select count(*) from bookings) = 1, 'Igor sees only his booking';
end $$;

-- the deadline for a booking 12.5 h ahead is start − 2 h
reset role;
do $$ begin
  assert (select confirm_deadline from bookings where id = (select v from ctx where k = 'b2')) = '2026-10-19 19:00+03', 'deadline 2 h before start';
  assert (select count(*) from email_outbox where template = 'booking_created' and to_email = 'anna@example.com') = 2, 'tutor got 2 letters';
end $$;

-- Anna declines without reason (fails), then confirms Olga's booking
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
do $$
declare id1 bigint := (select v from ctx where k = 'b1');
begin
  begin perform decline_booking(id1, ' '); assert false, 'reason required';
  exception when raise_exception then assert sqlerrm = 'reason_required', sqlerrm; end;
  perform confirm_booking(id1);
  assert (select status from bookings where id = id1) = 'confirmed', 'confirmed';
  begin perform set_meeting_url(id1, 'zoom meeting'); assert false, 'bad url';
  exception when raise_exception then assert sqlerrm = 'bad_url', sqlerrm; end;
  perform set_meeting_url(id1, 'https://telemost.yandex.ru/j/123');
  assert (select participant_name from bookings where id = id1) = 'Миша', 'tutor sees the participant';
  assert exists (select 1 from profiles where email = 'olga@example.com'), 'tutor sees the student name in a shared booking';
end $$;

-- У5.2: Igor's booking is not answered; at 19:00 the job cancels it
reset role;
select set_config('app.now', '2026-10-19 19:31+03', true);
do $$
declare res jsonb := run_jobs(); id2 bigint := (select v from ctx where k = 'b2');
begin
  assert (res ->> 'cancelled')::int = 1, 'one autocancel: ' || res::text;
  assert (select status from bookings where id = id2) = 'cancelled' and (select cancelled_by from bookings where id = id2) = 'system', 'system cancel';
  assert (select count(*) from email_outbox where template = 'booking_autocancelled') = 2, 'letters to both';
  assert exists (select 1 from free_slots('00000000-0000-0000-0000-0000000000a1', 60::smallint, '2026-10-20 07:00+03') s
                 where s = '2026-10-20 10:00+03'), 'slots are free again';
end $$;

-- У7.2: reminders. 24 h before (20.10 18:00 − 24 h = 19.10 18:00 already passed at 19:31) → 24 h reminder now
do $$
begin
  -- the run above already sent it, because 19.10 18:00 had passed
  assert (select count(*) from email_outbox where template = 'reminder_24h') = 2, '24 h reminder to both sides';
  assert (run_jobs() ->> 'reminders')::int = 0, 'not sent twice';
end $$;
select set_config('app.now', '2026-10-20 17:05+03', true);
do $$ begin
  assert (run_jobs() ->> 'reminders')::int = 1, '1 h reminder';
  assert (select count(*) from email_outbox where template = 'reminder_1h') = 2, 'to both sides';
end $$;

-- У7.3-поздно: Olga cancels 55 minutes before → late cancel flag
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
do $$
declare id1 bigint := (select v from ctx where k = 'b1');
begin
  assert cancel_booking(id1) = true, 'late cancel returns true';
  assert (select late_cancel from bookings where id = id1), 'late flag stored';
end $$;

-- a new booking, confirmed, passes; Olga reports a problem; admin resolves (У7.4, У7.5, А3)
select set_config('app.now', '2026-10-20 09:00+03', true);
do $$
declare eng smallint := (select id from subjects where slug = 'english'); id3 bigint;
begin
  id3 := create_booking('00000000-0000-0000-0000-0000000000a1', eng, 60::smallint, '2026-10-21 12:00+03');
  insert into ctx values ('b3', id3);
  -- early cancel by student while pending is free of the late flag
  assert cancel_booking(id3) = false, 'early cancel';
  id3 := create_booking('00000000-0000-0000-0000-0000000000a1', eng, 60::smallint, '2026-10-21 12:00+03');
  update ctx set v = id3 where k = 'b3';
end $$;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
do $$ begin perform confirm_booking((select v from ctx where k = 'b3')); end $$;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select set_config('app.now', '2026-10-21 12:30+03', true);
do $$
declare id3 bigint := (select v from ctx where k = 'b3');
begin
  begin perform mark_ok(id3); assert false, 'cannot close before the end';
  exception when raise_exception then assert sqlerrm = 'not_finished', sqlerrm; end;
end $$;
select set_config('app.now', '2026-10-23 13:30+03', true);  -- Friday
do $$
declare id3 bigint := (select v from ctx where k = 'b3'); pid bigint;
begin
  pid := report_problem(id3, 'no_show', 'Репетитор не подключился');
  insert into ctx values ('p', pid);
  -- 3 business days from Friday = Wednesday
  assert (select due_at from problems where id = pid) = '2026-10-28 13:30+03', 'due in 3 business days';
  begin perform report_problem(id3, 'other'); assert false, 'one problem per booking';
  exception when raise_exception then assert sqlerrm = 'already_reported', sqlerrm; end;
end $$;
reset role;
do $$ begin
  assert (run_jobs() ->> 'completed')::int = 0, 'a booking with a problem is not auto-completed';
end $$;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
do $$
declare pid bigint := (select v from ctx where k = 'p');
begin
  begin perform admin_resolve(pid, 'not_happened', ''); assert false, 'reason required';
  exception when raise_exception then assert sqlerrm = 'reason_required', sqlerrm; end;
  perform admin_resolve(pid, 'not_happened', 'Репетитор подтвердил, что не смог подключиться');
  assert (select status from problems where id = pid) = 'resolved', 'resolved';
  assert (select count(*) from admin_log) = 1, 'logged';
  perform admin_hide_tutor('00000000-0000-0000-0000-0000000000a1', 'Жалобы учеников');
  perform admin_block_user('00000000-0000-0000-0000-0000000000b2', 'Спам');
  assert (select count(*) from admin_log) = 3, 'all admin actions logged';
end $$;

-- after hiding, the catalog is empty and Igor (blocked) cannot book
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
do $$ begin
  assert (select count(*) from catalog()) = 0, 'hidden tutor left the catalog';
  begin
    perform create_booking('00000000-0000-0000-0000-0000000000a1', 1::smallint, 60::smallint, '2026-10-26 12:00+03');
    assert false, 'blocked user cannot book';
  exception when raise_exception then assert sqlerrm = 'blocked', sqlerrm; end;
  -- clients cannot write bookings directly
  begin
    update bookings set status = 'confirmed';
    assert false, 'direct update must fail';
  exception when insufficient_privilege then null; end;
end $$;
