import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { noteText } from '../lib/notifications';
import { supabase } from './supabase';
import { useSession } from './session';
import type { Profile } from './types';

/* У4.3 + У7.2: in-app notifications (written by notify() in the database together with a letter) and the unread counters. */

export interface Note {
  id: number;
  bookingId: number | null;
  kind: string;
  createdAt: number;
  unread: boolean;
  text: string;
  href: string;
}

interface NoteRow {
  id: number;
  booking_id: number | null;
  kind: string;
  created_at: string;
  read_at: string | null;
  bookings: {
    id: number;
    starts_at: string;
    tutor_id: string;
    student_id: string;
    participant_name: string | null;
    for_other: boolean;
    cancelled_by: 'student' | 'tutor' | 'system' | null;
  } | null;
}

/** Newest first; texts in the viewer's zone. */
export async function listNotifications(viewer: Profile, tz: string): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, booking_id, kind, created_at, read_at, bookings(id, starts_at, tutor_id, student_id, participant_name, for_other, cancelled_by)')
    .eq('user_id', viewer.id)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(100);
  if (error) throw error;
  const rows = (data ?? []) as unknown as NoteRow[];
  const ids = [...new Set(rows.flatMap(r => (r.bookings ? [r.bookings.tutor_id, r.bookings.student_id] : [])))];
  const names = new Map<string, string>();
  if (ids.length) {
    const people = await supabase.from('profiles').select('id, name').in('id', ids);
    if (people.error) throw people.error;
    for (const p of people.data ?? []) names.set(p.id as string, p.name as string);
  }
  const role = viewer.role === 'tutor' ? 'tutor' : 'student';
  return rows.map(r => {
    const b = r.bookings;
    const shown = b
      ? noteText({
          kind: r.kind,
          role,
          tz,
          bookingId: b.id,
          startsAt: Date.parse(b.starts_at),
          tutorName: names.get(b.tutor_id) ?? 'Репетитор',
          studentName: names.get(b.student_id) ?? 'Ученик',
          participantName: b.for_other ? b.participant_name : null,
          cancelledBy: b.cancelled_by,
        })
      : { text: 'Уведомление', href: '' };
    return { id: r.id, bookingId: r.booking_id, kind: r.kind, createdAt: Date.parse(r.created_at), unread: !r.read_at, ...shown };
  });
}

/** «после открытия раздела счётчик обнуляется» (У4.3 + У7.2). */
export async function markAllRead() {
  const { error } = await supabase.rpc('mark_notifications_read');
  if (error) throw error;
  countersChanged();
}

/** Opening a lesson card reads its notifications: the «Новое» pill and the counter go out. */
export async function markBookingRead(userId: string, bookingId: number) {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('booking_id', bookingId)
    .is('read_at', null);
  if (error) throw error;
  countersChanged();
}

/* ---------- counters in the header and the cabinet menu ---------- */

export interface Counters {
  /** unread notifications */
  unread: number;
  /** bookings with unread notifications: «Новое» on the card, the number at «Мои занятия» */
  fresh: number[];
  /** tutor: bookings waiting for an answer (the number at «Записи») */
  waiting: number;
  /** admin: open problems (the number at «Проблемы») */
  problems: number;
}

async function loadCounters(profile: Profile): Promise<Counters> {
  if (profile.role === 'admin') {
    const open = await supabase.from('problems').select('id', { count: 'exact', head: true }).eq('status', 'open');
    if (open.error) throw open.error;
    return { unread: 0, fresh: [], waiting: 0, problems: open.count ?? 0 };
  }
  const [notes, waiting] = await Promise.all([
    supabase.from('notifications').select('booking_id').eq('user_id', profile.id).is('read_at', null),
    profile.role === 'tutor'
      ? supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('tutor_id', profile.id)
          .eq('status', 'pending')
          .gt('confirm_deadline', new Date().toISOString())
      : Promise.resolve({ count: 0, error: null }),
  ]);
  if (notes.error) throw notes.error;
  if (waiting.error) throw waiting.error;
  const rows = (notes.data ?? []) as { booking_id: number | null }[];
  return {
    unread: rows.length,
    fresh: [...new Set(rows.flatMap(r => (r.booking_id ? [r.booking_id] : [])))],
    waiting: waiting.count ?? 0,
    problems: 0,
  };
}

const EVENT = 'toprepet:counters';
/** Ask every mounted counter to load again (after an action changed what is unread or waiting). */
export function countersChanged() {
  window.dispatchEvent(new Event(EVENT));
}

/* One request serves every component that shows a counter at the same moment. */
let inFlight: { key: string; promise: Promise<Counters> } | null = null;
function shared(profile: Profile, key: string) {
  if (inFlight?.key !== key) {
    const promise = loadCounters(profile);
    inFlight = { key, promise };
    void promise.catch(() => null).finally(() => {
      if (inFlight?.promise === promise) inFlight = null;
    });
  }
  return inFlight.promise;
}

/** Counters of the signed-in user; reloaded on every page change and after actions. null for guests. */
export function useCounters(): Counters | null {
  const { profile } = useSession();
  const { pathname } = useLocation();
  const [tick, setTick] = useState(0);
  const [state, setState] = useState<{ for: string; value: Counters } | null>(null);
  const active = profile;

  useEffect(() => {
    const bump = () => setTick(t => t + 1);
    window.addEventListener(EVENT, bump);
    return () => window.removeEventListener(EVENT, bump);
  }, []);

  useEffect(() => {
    if (!active) return;
    let alive = true;
    shared(active, `${active.id}#${pathname}#${tick}`).then(
      value => alive && setState({ for: active.id, value }),
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, [active, pathname, tick]);

  return active && state?.for === active.id ? state.value : null;
}

/** Opening a lesson or booking card reads its notifications: «Новое» and the counters go out. */
export function useReadOnOpen(bookingId: number) {
  const { profile } = useSession();
  const unread = Boolean(useCounters()?.fresh.includes(bookingId));
  useEffect(() => {
    if (unread && profile) void markBookingRead(profile.id, bookingId).catch(() => undefined);
  }, [unread, profile, bookingId]);
}
