import { getMyBooking, type Booking, type BookingStatus } from './booking';
import { supabase } from './supabase';
import type { Role } from './types';
import type { AdminAction, EventStatus, HistoryEvent } from '../lib/admin';

/* Admin area (А1, А2, А3). Reading goes through RLS (admins read everything) and the admin_* functions;
   every action is an admin_* function that writes the journal. */

type Result<E extends string> = { ok: true } | { ok: false; reason: E | 'error' };
const failure = <E extends string>(message: string, known: E[]): { ok: false; reason: E | 'error' } => ({
  ok: false,
  reason: known.find(k => k === message) ?? 'error',
});

/* ---------- А2: registry ---------- */

export interface LessonFilters {
  q: string;
  status: string;
  /** start of the day in ms and the start of the next one */
  day: [number, number] | null;
  problem: boolean;
}

export interface LessonRow {
  id: number;
  startsAt: number;
  endsAt: number;
  status: BookingStatus;
  priceRub: number;
  studentName: string;
  participantName: string | null;
  tutorName: string;
  subjectName: string;
  problem: 'open' | 'resolved' | null;
}

export const PAGE = 50;

export async function listLessons(f: LessonFilters, offset = 0): Promise<{ rows: LessonRow[]; total: number }> {
  const { data, error } = await supabase.rpc('admin_bookings', {
    p_q: f.q.trim() || null,
    p_status: f.status || null,
    p_from: f.day ? new Date(f.day[0]).toISOString() : null,
    p_to: f.day ? new Date(f.day[1]).toISOString() : null,
    p_problem: f.problem,
    p_limit: PAGE,
    p_offset: offset,
  });
  if (error) throw error;
  const rows = (data ?? []) as {
    id: number;
    starts_at: string;
    ends_at: string;
    status: BookingStatus;
    price_rub: number;
    student_name: string;
    participant_name: string | null;
    tutor_name: string;
    subject_name: string;
    problem_status: 'open' | 'resolved' | null;
    total: number;
  }[];
  return {
    total: rows.length ? Number(rows[0].total) : 0,
    rows: rows.map(r => ({
      id: r.id,
      startsAt: Date.parse(r.starts_at),
      endsAt: Date.parse(r.ends_at),
      status: r.status,
      priceRub: r.price_rub,
      studentName: r.student_name,
      participantName: r.participant_name,
      tutorName: r.tutor_name,
      subjectName: r.subject_name,
      problem: r.problem_status,
    })),
  };
}

/* ---------- А2, А3: one lesson with its history and problem ---------- */

export interface ProblemCase {
  id: number;
  bookingId: number;
  kind: string;
  description: string;
  status: 'open' | 'resolved';
  createdAt: number;
  dueAt: number;
  resolution: 'happened' | 'not_happened' | null;
  resolvedAt: number | null;
  resolvedBy: string | null;
  /** the admin's comment from the journal */
  comment: string | null;
}

export interface LessonCase {
  booking: Booking;
  history: HistoryEvent[];
  problem: ProblemCase | null;
}

interface ProblemRow {
  id: number;
  booking_id: number;
  kind: string;
  description: string;
  status: 'open' | 'resolved';
  created_at: string;
  due_at: string;
  resolution: 'happened' | 'not_happened' | null;
  resolved_at: string | null;
  resolved_by: string | null;
}

const PROBLEM_COLUMNS = 'id, booking_id, kind, description, status, created_at, due_at, resolution, resolved_at, resolved_by';

const toProblem = (r: ProblemRow, comment: string | null, resolvedBy: string | null): ProblemCase => ({
  id: r.id,
  bookingId: r.booking_id,
  kind: r.kind,
  description: r.description,
  status: r.status,
  createdAt: Date.parse(r.created_at),
  dueAt: Date.parse(r.due_at),
  resolution: r.resolution,
  resolvedAt: r.resolved_at ? Date.parse(r.resolved_at) : null,
  resolvedBy,
  comment,
});

export async function getLessonCase(id: number): Promise<LessonCase | null> {
  const booking = await getMyBooking(id);
  if (!booking) return null;
  const [events, problems] = await Promise.all([
    supabase.from('booking_events').select('at, actor_id, from_status, to_status, note').eq('booking_id', id).order('at').order('id'),
    supabase.from('problems').select(PROBLEM_COLUMNS).eq('booking_id', id).maybeSingle(),
  ]);
  if (events.error) throw events.error;
  if (problems.error) throw problems.error;
  const history = ((events.data ?? []) as { at: string; actor_id: string | null; from_status: EventStatus | null; to_status: EventStatus; note: string | null }[]).map(
    e => ({ at: Date.parse(e.at), actorId: e.actor_id, from: e.from_status, to: e.to_status, note: e.note }),
  );
  let problem: ProblemCase | null = null;
  const p = problems.data as ProblemRow | null;
  if (p) {
    let comment: string | null = null;
    let by: string | null = null;
    if (p.status === 'resolved') {
      const [log, admin] = await Promise.all([
        supabase.from('admin_log').select('reason').eq('action', 'resolve_problem').eq('target_id', String(p.id)).order('at', { ascending: false }).limit(1),
        p.resolved_by ? supabase.from('profiles').select('name').eq('id', p.resolved_by).maybeSingle() : Promise.resolve({ data: null, error: null }),
      ]);
      comment = (log.data?.[0] as { reason: string } | undefined)?.reason ?? null;
      by = (admin.data as { name: string } | null)?.name ?? null;
    }
    problem = toProblem(p, comment, by);
  }
  return { booking, history, problem };
}

/* ---------- А3: queue ---------- */

export interface QueueRow {
  problemId: number;
  bookingId: number;
  kind: string;
  dueAt: number;
  createdAt: number;
  studentName: string;
  participantName: string | null;
  tutorName: string;
  priceRub: number;
}

/** Open problems, nearest deadline first (mockup adminDisputes). */
export async function listOpenProblems(): Promise<QueueRow[]> {
  const { data, error } = await supabase
    .from('problems')
    .select('id, booking_id, kind, due_at, created_at, bookings(student_id, tutor_id, participant_name, for_other, price_rub)')
    .eq('status', 'open')
    .order('due_at')
    .order('id')
    .limit(200);
  if (error) throw error;
  type Row = {
    id: number;
    booking_id: number;
    kind: string;
    due_at: string;
    created_at: string;
    bookings: { student_id: string; tutor_id: string; participant_name: string | null; for_other: boolean; price_rub: number } | null;
  };
  const rows = (data ?? []) as unknown as Row[];
  const names = await namesOf(rows.flatMap(r => (r.bookings ? [r.bookings.student_id, r.bookings.tutor_id] : [])));
  return rows.map(r => ({
    problemId: r.id,
    bookingId: r.booking_id,
    kind: r.kind,
    dueAt: Date.parse(r.due_at),
    createdAt: Date.parse(r.created_at),
    studentName: names.get(r.bookings?.student_id ?? '') ?? 'Ученик',
    participantName: r.bookings?.for_other ? r.bookings.participant_name : null,
    tutorName: names.get(r.bookings?.tutor_id ?? '') ?? 'Репетитор',
    priceRub: r.bookings?.price_rub ?? 0,
  }));
}

/** А3: «Занятие состоялось» or «Занятие не состоялось»; the comment goes to both sides in the letter. */
export async function resolveProblem(problemId: number, resolution: 'happened' | 'not_happened', comment: string): Promise<Result<'reason_required' | 'not_found'>> {
  const { error } = await supabase.rpc('admin_resolve', { p_problem: problemId, p_resolution: resolution, p_reason: comment.trim() });
  return error ? failure(error.message, ['reason_required', 'not_found']) : { ok: true };
}

/* ---------- А1: users and actions ---------- */

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  blockedAt: number | null;
  blockedReason: string | null;
  tutorStatus: 'draft' | 'published' | 'hidden' | null;
  hiddenReason: string | null;
  slug: string | null;
  cancels30d: number;
}

export async function listUsers(q: string, role: string): Promise<{ rows: UserRow[]; total: number }> {
  const { data, error } = await supabase.rpc('admin_users', { p_q: q.trim() || null, p_role: role || null, p_limit: PAGE });
  if (error) throw error;
  const rows = (data ?? []) as {
    id: string;
    name: string;
    email: string;
    role: Role;
    blocked_at: string | null;
    blocked_reason: string | null;
    tutor_status: UserRow['tutorStatus'];
    hidden_reason: string | null;
    slug: string | null;
    cancels_30d: number;
    total: number;
  }[];
  return {
    total: rows.length ? Number(rows[0].total) : 0,
    rows: rows.map(r => ({
      id: r.id,
      name: r.name,
      email: r.email,
      role: r.role,
      blockedAt: r.blocked_at ? Date.parse(r.blocked_at) : null,
      blockedReason: r.blocked_reason,
      tutorStatus: r.tutor_status,
      hiddenReason: r.hidden_reason,
      slug: r.slug,
      cancels30d: Number(r.cancels_30d),
    })),
  };
}

export type UserAction = 'hide_tutor' | 'unhide_tutor' | 'block_user' | 'unblock_user';

const ACTION_RPC: Record<UserAction, [string, string]> = {
  hide_tutor: ['admin_hide_tutor', 'p_tutor'],
  unhide_tutor: ['admin_unhide_tutor', 'p_tutor'],
  block_user: ['admin_block_user', 'p_user'],
  unblock_user: ['admin_unblock_user', 'p_user'],
};

/** А1: every action needs a reason and lands in the journal with its author and time. */
export async function applyUserAction(action: UserAction, userId: string, reason: string): Promise<Result<'reason_required' | 'not_found' | 'not_allowed'>> {
  const [fn, arg] = ACTION_RPC[action];
  const { error } = await supabase.rpc(fn, { [arg]: userId, p_reason: reason.trim() });
  return error ? failure(error.message, ['reason_required', 'not_found', 'not_allowed']) : { ok: true };
}

export interface JournalRow {
  id: number;
  at: number;
  action: AdminAction;
  adminName: string;
  /** a person's name, or the lesson number for a problem decision */
  target: string;
  reason: string;
}

/** The newest journal entries with names of the admin and the person (or the lesson of a problem). */
export async function listJournal(limit = 20): Promise<JournalRow[]> {
  const { data, error } = await supabase.from('admin_log').select('id, at, action, admin_id, target_id, reason').order('at', { ascending: false }).order('id', { ascending: false }).limit(limit);
  if (error) throw error;
  const rows = (data ?? []) as { id: number; at: string; action: AdminAction; admin_id: string; target_id: string; reason: string }[];
  const problemIds = rows.filter(r => r.action === 'resolve_problem').map(r => Number(r.target_id));
  const people = rows.flatMap(r => (r.action === 'resolve_problem' ? [r.admin_id] : [r.admin_id, r.target_id]));
  const [names, problems] = await Promise.all([
    namesOf(people),
    problemIds.length ? supabase.from('problems').select('id, booking_id').in('id', problemIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (problems.error) throw problems.error;
  const lessonOf = new Map(((problems.data ?? []) as { id: number; booking_id: number }[]).map(p => [p.id, p.booking_id]));
  return rows.map(r => ({
    id: r.id,
    at: Date.parse(r.at),
    action: r.action,
    adminName: names.get(r.admin_id) ?? 'Администратор',
    target: r.action === 'resolve_problem' ? `B-${lessonOf.get(Number(r.target_id)) ?? r.target_id}` : (names.get(r.target_id) ?? 'пользователь'),
    reason: r.reason,
  }));
}

async function namesOf(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, string>();
  if (!unique.length) return map;
  const { data, error } = await supabase.from('profiles').select('id, name').in('id', unique);
  if (error) throw error;
  for (const p of data ?? []) map.set(p.id as string, p.name as string);
  return map;
}
