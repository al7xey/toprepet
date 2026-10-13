-- У3.1, Р1.1: profile from sign-up metadata, permanent role, no self-made admins, drafts hidden from guests.
-- Run by scripts/db-test.mjs inside a transaction that is rolled back.

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000001', 'olga@example.com', '{"name":"Ольга","role":"student","tz":"Asia/Yekaterinburg"}'),
  ('00000000-0000-0000-0000-000000000002', 'anna@example.com', '{"name":"Анна","role":"tutor"}'),
  ('00000000-0000-0000-0000-000000000003', 'hacker@example.com', '{"name":"Хакер","role":"admin"}');

do $$
begin
  assert (select role from profiles where email = 'olga@example.com') = 'student', 'student role from metadata';
  assert (select tz from profiles where email = 'olga@example.com') = 'Asia/Yekaterinburg', 'tz from metadata';
  assert (select role from profiles where email = 'anna@example.com') = 'tutor', 'tutor role from metadata';
  assert (select role from profiles where email = 'hacker@example.com') = 'student', 'admin is never self-assigned';
  assert exists (select 1 from tutors where user_id = '00000000-0000-0000-0000-000000000002' and status = 'draft'),
    'tutor gets a draft profile';
  assert not exists (select 1 from tutors where user_id = '00000000-0000-0000-0000-000000000001'), 'student has no tutor profile';
end $$;

-- as the student
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

do $$
begin
  update profiles set name = 'Ольга П.' where id = auth.uid();
  assert (select name from profiles where id = auth.uid()) = 'Ольга П.', 'user can rename themselves';
  begin
    update profiles set role = 'tutor' where id = auth.uid();
    assert false, 'role change must fail';
  exception when raise_exception then
    assert sqlerrm = 'role_is_permanent', sqlerrm;
  end;
  assert (select count(*) from profiles) = 1, 'student sees only their own profile';
  assert (select count(*) from tutors) = 0, 'draft tutor profiles are hidden';
end $$;

-- as the tutor: can edit own draft, cannot publish by update
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

do $$
begin
  update tutors set about = 'Готовлю к ЕГЭ' where user_id = auth.uid();
  assert (select about from tutors where user_id = auth.uid()) = 'Готовлю к ЕГЭ', 'tutor edits own draft';
  begin
    update tutors set status = 'published' where user_id = auth.uid();
    assert false, 'direct publish must fail';
  exception when raise_exception then
    assert sqlerrm = 'use_publish_function', sqlerrm;
  end;
end $$;

-- as a guest
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

do $$
begin
  assert (select count(*) from profiles) = 0, 'guest sees no profiles of draft tutors or students';
  assert (select count(*) from subjects) >= 17, 'guest sees all subjects';
  begin
    perform 1 from email_outbox;
    assert false, 'guest must not read email_outbox';
  exception when insufficient_privilege then null;
  end;
end $$;
