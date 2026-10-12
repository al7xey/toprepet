import { supabase } from './supabase';
import type { Filters } from '../lib/catalog';
import type { Duration } from '../lib/prices';

/** One card of the catalog (У1.1): published, with a free slot within the horizon; price «от» for 60 minutes. */
export interface CatalogItem {
  id: string;
  slug: string | null;
  name: string;
  photoPath: string | null;
  subjects: string[];
  priceFrom: number | null;
  experienceYears: number | null;
  goals: string[];
}

interface CatalogRow {
  user_id: string;
  slug: string | null;
  name: string;
  photo_path: string | null;
  subjects: string[] | null;
  price_from: number | null;
  experience_years: number | null;
  goals: string[] | null;
}

/** У1.1, У1.3: «Когда удобно» is counted in the viewer's zone. */
export async function fetchCatalog(f: Filters, tz: string): Promise<CatalogItem[]> {
  const { data, error } = await supabase.rpc('catalog', {
    p_subject: f.subject,
    p_goal: f.goal,
    p_max_price: f.price,
    p_days: f.days,
    p_parts: f.parts.length ? f.parts : null,
    p_min_exp: f.exp,
    p_q: f.q || null,
    p_tz: tz,
  });
  if (error) throw error;
  return ((data as CatalogRow[] | null) ?? []).map(r => ({
    id: r.user_id,
    slug: r.slug,
    name: r.name,
    photoPath: r.photo_path,
    subjects: r.subjects ?? [],
    priceFrom: r.price_from,
    experienceYears: r.experience_years,
    goals: r.goals ?? [],
  }));
}

/** Address of a public profile; a profile without a readable address yet is reached by its id. */
export const tutorPath = (t: { slug: string | null; id: string }) => `/teachers/${t.slug ?? t.id}/`;

export interface PublicSubject {
  id: number;
  slug: string;
  name: string;
  topics: string;
}

export interface PublicPrice {
  subjectId: number;
  durationMin: Duration;
  priceRub: number;
}

/** The public profile with what the booking block needs (У2.1). */
export interface PublicTutor {
  id: string;
  slug: string | null;
  name: string;
  tz: string;
  photoPath: string | null;
  about: string;
  education: string;
  approach: string;
  experienceYears: number | null;
  goals: string[];
  horizonWeeks: number;
  minLeadHours: number;
  published: boolean;
  subjects: PublicSubject[];
  prices: PublicPrice[];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** null when there is no such published profile (RLS hides drafts from everyone but their owner). */
export async function getPublicTutor(key: string): Promise<PublicTutor | null> {
  const tutorQuery = supabase
    .from('tutors')
    .select('user_id, slug, photo_path, about, education, approach, experience_years, goals, horizon_weeks, min_lead_hours, status');
  const { data: t, error } = await (UUID.test(key) ? tutorQuery.eq('user_id', key) : tutorQuery.eq('slug', key)).maybeSingle();
  if (error) throw error;
  if (!t) return null;
  const [profile, subjects, prices] = await Promise.all([
    supabase.from('profiles').select('name, tz').eq('id', t.user_id).single(),
    supabase.from('tutor_subjects').select('subject_id, topics, subjects(slug, name, sort)').eq('tutor_id', t.user_id),
    supabase.from('prices').select('subject_id, duration_min, price_rub').eq('tutor_id', t.user_id).order('duration_min'),
  ]);
  for (const r of [profile, subjects, prices]) if (r.error) throw r.error;
  type SubjectRow = { subject_id: number; topics: string; subjects: { slug: string; name: string; sort: number } | null };
  const subjectRows = ((subjects.data ?? []) as unknown as SubjectRow[])
    .filter(s => s.subjects)
    .sort((a, b) => a.subjects!.sort - b.subjects!.sort);
  return {
    id: t.user_id,
    slug: t.slug,
    name: profile.data!.name,
    tz: profile.data!.tz,
    photoPath: t.photo_path,
    about: t.about,
    education: t.education,
    approach: t.approach,
    experienceYears: t.experience_years,
    goals: t.goals ?? [],
    horizonWeeks: t.horizon_weeks,
    minLeadHours: t.min_lead_hours,
    published: t.status === 'published',
    subjects: subjectRows.map(s => ({ id: s.subject_id, slug: s.subjects!.slug, name: s.subjects!.name, topics: s.topics })),
    prices: (prices.data ?? []).map(p => ({ subjectId: p.subject_id, durationMin: p.duration_min as Duration, priceRub: p.price_rub })),
  };
}

/** Free starts (UTC ms) for a lesson of this length within the tutor's horizon and minimum lead time (У2.1). */
export async function freeSlots(tutorId: string, durationMin: number, from?: number, to?: number): Promise<number[]> {
  const { data, error } = await supabase.rpc('free_slots', {
    p_tutor: tutorId,
    p_duration: durationMin,
    p_from: from ? new Date(from).toISOString() : null,
    p_to: to ? new Date(to).toISOString() : null,
  });
  if (error) throw error;
  return ((data as string[] | null) ?? []).map(s => Date.parse(s));
}

/** У4.1-занят: the next free starts after a moment. */
export async function nextSlots(tutorId: string, durationMin: number, after: number, limit = 3): Promise<number[]> {
  const { data, error } = await supabase.rpc('next_slots', {
    p_tutor: tutorId,
    p_duration: durationMin,
    p_after: new Date(after).toISOString(),
    p_limit: limit,
  });
  if (error) throw error;
  return ((data as string[] | null) ?? []).map(s => Date.parse(s));
}
