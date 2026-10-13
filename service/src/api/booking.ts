import { supabase } from './supabase';

export type BookingStatus = 'pending' | 'confirmed' | 'declined' | 'cancelled' | 'completed';

export interface Booking {
  id: number;
  tutorId: string;
  tutorName: string;
  tutorTz: string;
  tutorSlug: string | null;
  subjectId: number;
  subjectName: string;
  subjectSlug: string;
  durationMin: number;
  priceRub: number;
  startsAt: number;
  endsAt: number;
  forOther: boolean;
  participantName: string | null;
  participantAge: number | null;
  status: BookingStatus;
  confirmDeadline: number;
  declineReason: string | null;
  cancelledBy: 'student' | 'tutor' | 'system' | null;
}

export type BookingError =
  | 'participant_required'
  | 'slot_taken'
  | 'slot_unavailable'
  | 'not_available'
  | 'blocked'
  | 'wrong_role'
  | 'not_signed_in'
  | 'network';

export type CreateResult = { ok: true; id: number } | { ok: false; reason: BookingError };

const KNOWN: BookingError[] = ['participant_required', 'slot_taken', 'slot_unavailable', 'not_available', 'blocked', 'wrong_role', 'not_signed_in'];

/** У3.3 + У4.1: a pending booking; the database refuses an overlapping one with `slot_taken` (У4.1-занят). */
export async function createBooking(input: {
  tutorId: string;
  subjectId: number;
  durationMin: number;
  startsAt: number;
  forOther: boolean;
  name: string;
  age: number | null;
}): Promise<CreateResult> {
  const { data, error } = await supabase.rpc('create_booking', {
    p_tutor: input.tutorId,
    p_subject: input.subjectId,
    p_duration: input.durationMin,
    p_starts_at: new Date(input.startsAt).toISOString(),
    p_for_other: input.forOther,
    p_name: input.forOther ? input.name.trim() : null,
    p_age: input.forOther ? input.age : null,
  });
  if (!error) return { ok: true, id: Number(data) };
  const code = KNOWN.find(k => k === error.message);
  return { ok: false, reason: code ?? 'network' };
}

const COLUMNS =
  'id, tutor_id, subject_id, duration_min, price_rub, starts_at, ends_at, for_other, participant_name, participant_age, status, confirm_deadline, decline_reason, cancelled_by, subjects(name, slug)';

interface Row {
  id: number;
  tutor_id: string;
  subject_id: number;
  duration_min: number;
  price_rub: number;
  starts_at: string;
  ends_at: string;
  for_other: boolean;
  participant_name: string | null;
  participant_age: number | null;
  status: BookingStatus;
  confirm_deadline: string;
  decline_reason: string | null;
  cancelled_by: Booking['cancelledBy'];
  subjects: { name: string; slug: string } | null;
}

/** Tutor names and zones come from their profiles (readable inside a shared booking); the address only while the profile is public. */
async function withTutors(rows: Row[]): Promise<Booking[]> {
  const ids = [...new Set(rows.map(r => r.tutor_id))];
  if (!ids.length) return [];
  const [profiles, tutors] = await Promise.all([
    supabase.from('profiles').select('id, name, tz').in('id', ids),
    supabase.from('tutors').select('user_id, slug').in('user_id', ids),
  ]);
  if (profiles.error) throw profiles.error;
  if (tutors.error) throw tutors.error;
  const prof = new Map((profiles.data ?? []).map(p => [p.id as string, p as { name: string; tz: string }]));
  const slug = new Map((tutors.data ?? []).map(t => [t.user_id as string, t.slug as string | null]));
  return rows.map(r => ({
    id: r.id,
    tutorId: r.tutor_id,
    tutorName: prof.get(r.tutor_id)?.name ?? 'Репетитор',
    tutorTz: prof.get(r.tutor_id)?.tz ?? 'Europe/Moscow',
    tutorSlug: slug.get(r.tutor_id) ?? null,
    subjectId: r.subject_id,
    subjectName: r.subjects?.name ?? '',
    subjectSlug: r.subjects?.slug ?? '',
    durationMin: r.duration_min,
    priceRub: r.price_rub,
    startsAt: Date.parse(r.starts_at),
    endsAt: Date.parse(r.ends_at),
    forOther: r.for_other,
    participantName: r.participant_name,
    participantAge: r.participant_age,
    status: r.status,
    confirmDeadline: Date.parse(r.confirm_deadline),
    declineReason: r.decline_reason,
    cancelledBy: r.cancelled_by,
  }));
}

/** У4.3: the student's own bookings (RLS returns only theirs). */
export async function listMyBookings(studentId: string): Promise<Booking[]> {
  const { data, error } = await supabase.from('bookings').select(COLUMNS).eq('student_id', studentId).order('starts_at');
  if (error) throw error;
  return withTutors((data ?? []) as unknown as Row[]);
}

/** null when the booking does not exist or is not the viewer's. */
export async function getMyBooking(id: number): Promise<Booking | null> {
  if (!Number.isSafeInteger(id)) return null;
  const { data, error } = await supabase.from('bookings').select(COLUMNS).eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return (await withTutors([data as unknown as Row]))[0];
}

export type CancelResult = { ok: true } | { ok: false; reason: 'not_cancellable' | 'error' };

/** У4.3: the student withdraws a booking; the slot is free again at once. */
export async function cancelBooking(id: number): Promise<CancelResult> {
  const { error } = await supabase.rpc('cancel_booking', { p_id: id });
  if (!error) return { ok: true };
  return { ok: false, reason: error.message === 'not_cancellable' ? 'not_cancellable' : 'error' };
}
