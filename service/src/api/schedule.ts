import { supabase } from './supabase';
import { bookingRanges, diffWins, windowLocked, type Busy, type Win } from '../lib/schedule';

export type HorizonWeeks = 1 | 2 | 4;
export type LeadHours = 12 | 24;

export interface Schedule {
  windows: Win[];
  horizonWeeks: HorizonWeeks;
  minLeadHours: LeadHours;
  /** live future bookings on the tutor's week, in the tutor's zone */
  busy: Busy[];
}

/** Pending and confirmed bookings that have not ended yet; they lock their windows (Р3.1). */
async function liveBusy(id: string, tz: string): Promise<Busy[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('starts_at, ends_at, status')
    .eq('tutor_id', id)
    .in('status', ['pending', 'confirmed'])
    .gt('ends_at', new Date().toISOString());
  if (error) throw error;
  return (data ?? []).flatMap(b => bookingRanges(Date.parse(b.starts_at), Date.parse(b.ends_at), tz, b.status as Busy['status']));
}

export async function getSchedule(id: string, tz: string): Promise<Schedule> {
  const [windows, tutor, busy] = await Promise.all([
    supabase.from('weekly_windows').select('id, weekday, start_min, end_min').eq('tutor_id', id).order('weekday').order('start_min'),
    supabase.from('tutors').select('horizon_weeks, min_lead_hours').eq('user_id', id).single(),
    liveBusy(id, tz),
  ]);
  if (windows.error) throw windows.error;
  if (tutor.error) throw tutor.error;
  return {
    windows: (windows.data ?? []).map(w => ({ id: w.id, weekday: w.weekday, start: w.start_min, end: w.end_min })),
    horizonWeeks: tutor.data.horizon_weeks as HorizonWeeks,
    minLeadHours: tutor.data.min_lead_hours as LeadHours,
    busy,
  };
}

export type SaveScheduleResult = { ok: true } | { ok: false; reason: 'locked' | 'overlap' | 'error' };

/** Р3.1 + Р3.2: removes and adds windows, then stores the horizon and minimum lead time. */
export async function saveSchedule(
  id: string,
  tz: string,
  saved: Win[],
  next: Win[],
  settings: { horizonWeeks: HorizonWeeks; minLeadHours: LeadHours },
): Promise<SaveScheduleResult> {
  const { remove, add } = diffWins(saved, next);
  try {
    if (remove.length) {
      // checked again at save time: a booking may have arrived since the page was opened
      const busy = await liveBusy(id, tz);
      if (remove.some(w => windowLocked(w, busy))) return { ok: false, reason: 'locked' };
      const del = await supabase
        .from('weekly_windows')
        .delete()
        .eq('tutor_id', id)
        .in('id', remove.map(w => w.id).filter((x): x is number => x !== undefined));
      if (del.error) throw del.error;
    }
    if (add.length) {
      const ins = await supabase
        .from('weekly_windows')
        .insert(add.map(w => ({ tutor_id: id, weekday: w.weekday, start_min: w.start, end_min: w.end })));
      if (ins.error) return { ok: false, reason: ins.error.code === '23P01' ? 'overlap' : 'error' };
    }
    const upd = await supabase
      .from('tutors')
      .update({ horizon_weeks: settings.horizonWeeks, min_lead_hours: settings.minLeadHours })
      .eq('user_id', id);
    if (upd.error) throw upd.error;
    return { ok: true };
  } catch {
    return { ok: false, reason: 'error' };
  }
}
