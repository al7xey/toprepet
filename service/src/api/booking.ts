import { supabase } from './supabase';

export type BookingStatus = 'pending' | 'confirmed' | 'declined' | 'cancelled' | 'completed';

export interface Booking {
  id: number;
  tutorId: string;
  tutorName: string;
  tutorTz: string;
  tutorSlug: string | null;
  /** readable by the admin and while the tutor's profile is public */
  tutorEmail: string;
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
  cancelReason: string | null;
  lateCancel: boolean;
  meetingUrl: string | null;
  createdAt: number;
  studentId: string;
  studentName: string;
  /** the student's address; the tutor sees it in the booking card («Записала Ирина, irina@mail.ru») */
  studentEmail: string;
  studentTz: string;
  problem: Problem | null;
}

export type ProblemKind = 'no_show' | 'technical' | 'other';

export interface Problem {
  kind: ProblemKind;
  status: 'open' | 'resolved';
  resolution: 'happened' | 'not_happened' | null;
  createdAt: number;
  dueAt: number;
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
  'id, tutor_id, student_id, subject_id, duration_min, price_rub, starts_at, ends_at, for_other, participant_name, participant_age, status, confirm_deadline, decline_reason, cancelled_by, cancel_reason, late_cancel, meeting_url, created_at, subjects(name, slug), problems(kind, status, resolution, created_at, due_at)';

interface ProblemRow {
  kind: ProblemKind;
  status: Problem['status'];
  resolution: Problem['resolution'];
  created_at: string;
  due_at: string;
}

interface Row {
  id: number;
  tutor_id: string;
  student_id: string;
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
  cancel_reason: string | null;
  late_cancel: boolean;
  meeting_url: string | null;
  created_at: string;
  subjects: { name: string; slug: string } | null;
  /* one-to-one embed: PostgREST returns an object, older versions an array */
  problems: ProblemRow | ProblemRow[] | null;
}

interface Person {
  id: string;
  name: string;
  tz: string;
  email: string;
}

const toProblem = (p: Row['problems']): Problem | null => {
  const row = Array.isArray(p) ? p[0] : p;
  if (!row) return null;
  return { kind: row.kind, status: row.status, resolution: row.resolution, createdAt: Date.parse(row.created_at), dueAt: Date.parse(row.due_at) };
};

/** Names and zones of both sides come from their profiles (readable inside a shared booking); the tutor's address only while the profile is public. */
async function withPeople(rows: Row[]): Promise<Booking[]> {
  if (!rows.length) return [];
  const ids = [...new Set(rows.flatMap(r => [r.tutor_id, r.student_id]))];
  const tutorIds = [...new Set(rows.map(r => r.tutor_id))];
  const [profiles, tutors] = await Promise.all([
    supabase.from('profiles').select('id, name, tz, email').in('id', ids),
    supabase.from('tutors').select('user_id, slug').in('user_id', tutorIds),
  ]);
  if (profiles.error) throw profiles.error;
  if (tutors.error) throw tutors.error;
  const prof = new Map((profiles.data ?? []).map(p => [p.id as string, p as Person]));
  const slug = new Map((tutors.data ?? []).map(t => [t.user_id as string, t.slug as string | null]));
  return rows.map(r => ({
    id: r.id,
    tutorId: r.tutor_id,
    tutorName: prof.get(r.tutor_id)?.name ?? 'Репетитор',
    tutorTz: prof.get(r.tutor_id)?.tz ?? 'Europe/Moscow',
    tutorSlug: slug.get(r.tutor_id) ?? null,
    tutorEmail: prof.get(r.tutor_id)?.email ?? '',
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
    cancelReason: r.cancel_reason,
    lateCancel: r.late_cancel,
    meetingUrl: r.meeting_url,
    createdAt: Date.parse(r.created_at),
    studentId: r.student_id,
    studentName: prof.get(r.student_id)?.name ?? 'Ученик',
    studentEmail: prof.get(r.student_id)?.email ?? '',
    studentTz: prof.get(r.student_id)?.tz ?? 'Europe/Moscow',
    problem: toProblem(r.problems),
  }));
}

/** У4.3: the student's own bookings (RLS returns only theirs). */
export async function listMyBookings(studentId: string): Promise<Booking[]> {
  const { data, error } = await supabase.from('bookings').select(COLUMNS).eq('student_id', studentId).order('starts_at');
  if (error) throw error;
  return withPeople((data ?? []) as unknown as Row[]);
}

/** Р4.1, Р6.1: bookings to this tutor, all statuses. */
export async function listTutorBookings(tutorId: string): Promise<Booking[]> {
  const { data, error } = await supabase.from('bookings').select(COLUMNS).eq('tutor_id', tutorId).order('starts_at');
  if (error) throw error;
  return withPeople((data ?? []) as unknown as Row[]);
}

/** One booking of the viewer, as student or tutor; null when it does not exist or is someone else's. */
export async function getMyBooking(id: number): Promise<Booking | null> {
  if (!Number.isSafeInteger(id)) return null;
  const { data, error } = await supabase.from('bookings').select(COLUMNS).eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return (await withPeople([data as unknown as Row]))[0];
}

type Result<E extends string> = { ok: true } | { ok: false; reason: E | 'error' };

function failure<E extends string>(message: string, known: E[]): { ok: false; reason: E | 'error' } {
  return { ok: false, reason: known.find(k => k === message) ?? 'error' };
}

export type CancelResult = { ok: true; late: boolean } | { ok: false; reason: 'not_cancellable' | 'reason_required' | 'error' };

/** У4.3, У7.3 (student; late under 4 hours before a confirmed lesson) and Р6.2 (tutor, reason required). The slot is free again at once. */
export async function cancelBooking(id: number, reason?: string): Promise<CancelResult> {
  const { data, error } = await supabase.rpc('cancel_booking', { p_id: id, p_reason: reason?.trim() || null });
  if (!error) return { ok: true, late: data === true };
  return failure(error.message, ['not_cancellable', 'reason_required']);
}

/** Р4.1: the tutor confirms before the deadline. */
export async function confirmBooking(id: number): Promise<Result<'not_pending'>> {
  const { error } = await supabase.rpc('confirm_booking', { p_id: id });
  return error ? failure(error.message, ['not_pending']) : { ok: true };
}

/** Р4.1: declining needs a reason; the student gets it in a letter. */
export async function declineBooking(id: number, reason: string): Promise<Result<'not_pending' | 'reason_required'>> {
  const { error } = await supabase.rpc('decline_booking', { p_id: id, p_reason: reason.trim() });
  return error ? failure(error.message, ['not_pending', 'reason_required']) : { ok: true };
}

/** Р6.1: http or https only; the student gets a letter. */
export async function setMeetingUrl(id: number, url: string): Promise<Result<'bad_url' | 'not_confirmed'>> {
  const { error } = await supabase.rpc('set_meeting_url', { p_id: id, p_url: url.trim() });
  return error ? failure(error.message, ['bad_url', 'not_confirmed']) : { ok: true };
}

/** У7.4: «Всё прошло хорошо» closes a lesson that has ended. */
export async function markOk(id: number): Promise<Result<'not_finished'>> {
  const { error } = await supabase.rpc('mark_ok', { p_id: id });
  return error ? failure(error.message, ['not_finished']) : { ok: true };
}

/** У7.5: one problem per lesson, after its end. */
export async function reportProblem(id: number, kind: ProblemKind, text: string): Promise<Result<'not_finished' | 'already_reported'>> {
  const { error } = await supabase.rpc('report_problem', { p_id: id, p_kind: kind, p_text: text.trim() });
  return error ? failure(error.message, ['not_finished', 'already_reported']) : { ok: true };
}
