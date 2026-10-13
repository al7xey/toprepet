-- А1, А2, А3: undo of hide and block with a reason, the lesson registry search, users with cancellations,
-- the decision comment in both letters, and no token for a blocked account.

select set_config('app.now', '2026-10-19 09:00+03', true);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000006a1', 'adm-tutor@example.com', '{"name":"Вера Админтест","role":"tutor"}'),
  ('00000000-0000-0000-0000-0000000006b1', 'adm-student@example.com', '{"name":"Ольга Админтест","role":"student"}'),
  ('00000000-0000-0000-0000-0000000006c1', 'adm-admin@example.com', '{"name":"Светлана","role":"student"}');
update profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000006c1';

update tutors set photo_path = 'v.webp', slug = 'vera-admintest', status = 'published', published_at = '2026-10-01'
where user_id = '00000000-0000-0000-0000-0000000006a1';
insert into tutor_subjects (tutor_id, subject_id) select '00000000-0000-0000-0000-0000000006a1', id from subjects where slug = 'math';
insert into prices (tutor_id, subject_id, duration_min, price_rub)
  select '00000000-0000-0000-0000-0000000006a1', id, 60, 1800 from subjects where slug = 'math';
insert into weekly_windows (tutor_id, weekday, start_min, end_min)
  select '00000000-0000-0000-0000-0000000006a1', d, 600, 1320 from generate_series(1, 7) d;

-- two bookings: one cancelled by the student, one that has ended with a problem
insert into bookings (id, student_id, tutor_id, subject_id, duration_min, price_rub, starts_at, ends_at, status, confirm_deadline,
                      cancelled_by, created_at)
overriding system value
select v.id, '00000000-0000-0000-0000-0000000006b1', '00000000-0000-0000-0000-0000000006a1', s.id, 60, 1800,
       v.st, v.st + interval '1 hour', v.status::booking_status, v.st - interval '2 hours', v.by, '2026-10-15 10:00+03'
from subjects s, (values (906001, '2026-10-16 18:00+03'::timestamptz, 'confirmed', null),
                         (906002, '2026-10-21 18:00+03'::timestamptz, 'cancelled', 'student')) v(id, st, status, by)
where s.slug = 'math';
insert into problems (booking_id, author_id, kind, description, due_at)
values (906001, '00000000-0000-0000-0000-0000000006b1', 'no_show', 'Не пришла', '2026-10-21 18:00+03');

set local role authenticated;

-- not an admin: the registry and the users are closed
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000006b1","role":"authenticated"}', true);
do $$
begin
  begin perform * from admin_bookings(); assert false, 'student cannot read the registry';
  exception when raise_exception then assert sqlerrm = 'wrong_role', sqlerrm; end;
  begin perform * from admin_users(); assert false, 'student cannot list users';
  exception when raise_exception then assert sqlerrm = 'wrong_role', sqlerrm; end;
  begin perform admin_unblock_user('00000000-0000-0000-0000-0000000006b1', 'сам'); assert false, 'student cannot unblock';
  exception when raise_exception then assert sqlerrm = 'wrong_role', sqlerrm; end;
end $$;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000006c1","role":"authenticated"}', true);
do $$
declare n int; r record; pid bigint := (select id from problems where booking_id = 906001);
begin
  -- А2: search by name, email, number, status, date and «есть проблема»
  select count(*) into n from admin_bookings('Админтест');
  assert n = 2, 'both lessons by a name: ' || n;
  select count(*) into n from admin_bookings('adm-tutor@');
  assert n = 2, 'by the tutor email: ' || n;
  select * into r from admin_bookings('B-906002');
  assert r.id = 906002 and r.total = 1 and r.student_name = 'Ольга Админтест' and r.tutor_name = 'Вера Админтест', 'by number';
  select count(*) into n from admin_bookings('Админтест', 'completed');
  assert n = 1, 'a confirmed lesson that has ended counts as «Прошло»: ' || n;
  select count(*) into n from admin_bookings('Админтест', 'confirmed');
  assert n = 0, 'nothing upcoming confirmed: ' || n;
  select count(*) into n from admin_bookings('Админтест', null, '2026-10-21 00:00+03', '2026-10-22 00:00+03');
  assert n = 1, 'by the start day: ' || n;
  select * into r from admin_bookings('Админтест', null, null, null, true);
  assert r.id = 906001 and r.problem_status = 'open' and r.total = 1, 'only lessons with a problem';

  -- А1: users with cancellations in 30 days
  select * into r from admin_users('adm-student');
  assert r.role = 'student' and r.cancels_30d = 1, 'student cancelled once: ' || r.cancels_30d;
  select * into r from admin_users('Вера Админтест', 'tutor');
  assert r.tutor_status = 'published' and r.cancels_30d = 0, 'tutor row with its profile status';

  -- А1: hide and back, block and back; each needs a reason and is logged
  perform admin_hide_tutor('00000000-0000-0000-0000-0000000006a1', 'Фото не по правилам');
  begin perform admin_unhide_tutor('00000000-0000-0000-0000-0000000006a1', ' '); assert false, 'reason required';
  exception when raise_exception then assert sqlerrm = 'reason_required', sqlerrm; end;
  perform admin_unhide_tutor('00000000-0000-0000-0000-0000000006a1', 'Фото заменено');
  assert (select status from tutors where user_id = '00000000-0000-0000-0000-0000000006a1') = 'published', 'back in the catalog';
  assert (select hidden_reason from tutors where user_id = '00000000-0000-0000-0000-0000000006a1') is null, 'reason cleared';
  begin perform admin_unhide_tutor('00000000-0000-0000-0000-0000000006a1', 'ещё раз'); assert false, 'not hidden';
  exception when raise_exception then assert sqlerrm = 'not_found', sqlerrm; end;

  perform admin_block_user('00000000-0000-0000-0000-0000000006b1', 'Спам');
  perform admin_unblock_user('00000000-0000-0000-0000-0000000006b1', 'Ошибка');
  assert (select blocked_at from profiles where id = '00000000-0000-0000-0000-0000000006b1') is null, 'unblocked';
  assert (select array_agg(action order by id) from admin_log where admin_id = '00000000-0000-0000-0000-0000000006c1')
    = array['hide_tutor', 'unhide_tutor', 'block_user', 'unblock_user'], 'all four in the log';

  -- А3: the comment travels with the decision to both sides
  perform admin_resolve(pid, 'happened', 'Репетитор прислал запись звонка');
  assert (select count(*) from notifications where booking_id = 906001 and kind = 'problem_resolved') = 0,
    'admin does not see notifications of others';
end $$;

reset role;
do $$
begin
  assert (select count(*) from email_outbox where template = 'problem_resolved'
          and payload ->> 'booking_id' = '906001' and payload ->> 'comment' = 'Репетитор прислал запись звонка'
          and payload ->> 'resolution' = 'happened') = 2, 'both letters carry the comment';
  assert (select status from bookings where id = 906001) = 'completed', 'the lesson is closed';
end $$;

-- section 6: the Auth hook refuses a token to a blocked account and passes the claims through otherwise
do $$
declare res jsonb;
begin
  res := custom_access_token_hook('{"user_id":"00000000-0000-0000-0000-0000000006b1","claims":{"sub":"x","role":"authenticated"}}');
  assert res -> 'claims' ->> 'role' = 'authenticated' and res -> 'error' is null, 'active account gets its claims';
  update profiles set blocked_at = app_now(), blocked_reason = 'Спам' where id = '00000000-0000-0000-0000-0000000006b1';
  res := custom_access_token_hook('{"user_id":"00000000-0000-0000-0000-0000000006b1","claims":{"sub":"x"}}');
  assert res -> 'error' ->> 'message' = 'blocked' and (res -> 'error' ->> 'http_code')::int = 403, 'blocked account gets an error';
end $$;
