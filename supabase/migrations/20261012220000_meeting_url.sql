-- Р6.1: a meeting link has no spaces anywhere (the old pattern let one through as the second host character).
create or replace function public.set_meeting_url(p_id bigint, p_url text) returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := me_active('tutor'); b bookings := booking_for_update(p_id);
begin
  if b.tutor_id <> v_me then perform fail('not_found'); end if;
  if p_url !~ '^https?://[^\s/$.?#][^\s]+$' then perform fail('bad_url'); end if;
  if b.status <> 'confirmed' or b.ends_at <= app_now() then perform fail('not_confirmed'); end if;
  update bookings set meeting_url = p_url where id = p_id;
  perform notify(b.student_id, p_id, 'link_added');
end $$;

