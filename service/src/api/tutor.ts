import { supabase } from './supabase';
import type { Duration } from '../lib/prices';
import { slugFromName, slugWithSuffix } from '../lib/slug';

export type TutorStatus = 'draft' | 'published' | 'hidden';
export type Goal = 'school' | 'homework' | 'oge' | 'ege' | 'speaking' | 'preschool';
/** What `tutor_missing()` reports before publication (Р2.1-публикация). */
export type Missing = 'photo' | 'name' | 'subject_price' | 'window';

export const MISSING_ORDER: Missing[] = ['photo', 'name', 'subject_price', 'window'];
export const MISSING_LABEL: Record<Missing, string> = {
  photo: 'Фото',
  name: 'Имя',
  subject_price: 'Предмет с\u00a0ценой',
  window: 'Свободное время в\u00a0расписании',
};

/* У1.3: the goals a student filters by. */
export const GOALS: { id: Goal; label: string }[] = [
  { id: 'school', label: 'Школьная программа' },
  { id: 'homework', label: 'Домашние задания' },
  { id: 'oge', label: 'ОГЭ' },
  { id: 'ege', label: 'ЕГЭ' },
  { id: 'speaking', label: 'Разговорный язык' },
  { id: 'preschool', label: 'Подготовка к школе' },
];

export interface Subject {
  id: number;
  slug: string;
  name: string;
}

export interface TutorSubject {
  subjectId: number;
  topics: string;
}

export interface Price {
  subjectId: number;
  durationMin: Duration;
  priceRub: number;
}

/** Everything the tutor edits on /tutor/profile/ (Р2.1). Name and zone live in `profiles`. */
export interface TutorDraft {
  name: string;
  tz: string;
  about: string;
  education: string;
  approach: string;
  experienceYears: number | null;
  goals: Goal[];
  subjects: TutorSubject[];
  prices: Price[];
}

export interface TutorProfile extends TutorDraft {
  slug: string | null;
  photoPath: string | null;
  status: TutorStatus;
}

const PHOTO_BUCKET = 'tutor-photos';
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

export function photoUrl(path: string | null) {
  return path ? supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl : null;
}

export async function listSubjects(): Promise<Subject[]> {
  const { data, error } = await supabase.from('subjects').select('id, slug, name').order('sort');
  if (error) throw error;
  return data as Subject[];
}

export async function getTutorProfile(id: string): Promise<TutorProfile> {
  const [tutor, profile, subjects, prices] = await Promise.all([
    supabase
      .from('tutors')
      .select('slug, photo_path, about, education, approach, experience_years, goals, status')
      .eq('user_id', id)
      .single(),
    supabase.from('profiles').select('name, tz').eq('id', id).single(),
    supabase.from('tutor_subjects').select('subject_id, topics').eq('tutor_id', id),
    supabase.from('prices').select('subject_id, duration_min, price_rub').eq('tutor_id', id),
  ]);
  for (const r of [tutor, profile, subjects, prices]) if (r.error) throw r.error;
  const t = tutor.data!;
  return {
    name: profile.data!.name,
    tz: profile.data!.tz,
    slug: t.slug,
    photoPath: t.photo_path,
    about: t.about,
    education: t.education,
    approach: t.approach,
    experienceYears: t.experience_years,
    goals: t.goals as Goal[],
    status: t.status as TutorStatus,
    subjects: (subjects.data ?? []).map(s => ({ subjectId: s.subject_id, topics: s.topics })),
    prices: (prices.data ?? []).map(p => ({ subjectId: p.subject_id, durationMin: p.duration_min as Duration, priceRub: p.price_rub })),
  };
}

/** Gives the profile a readable unique address once, from the name; a taken one gets a short suffix. */
async function ensureSlug(id: string, name: string) {
  const base = slugFromName(name);
  for (let attempt = 0; attempt < 6; attempt++) {
    const slug = attempt === 0 ? base : slugWithSuffix(base);
    const { error } = await supabase.from('tutors').update({ slug }).eq('user_id', id).is('slug', null);
    if (!error) return;
    if (error.code !== '23505') throw error;
  }
  throw new Error('slug_taken');
}

/** Saves the questionnaire: profile name and zone, tutor fields, subjects with topics, prices. */
export async function saveTutorProfile(id: string, draft: TutorDraft, saved: TutorProfile) {
  const prof = await supabase.from('profiles').update({ name: draft.name.trim(), tz: draft.tz }).eq('id', id);
  if (prof.error) throw prof.error;
  const tutor = await supabase
    .from('tutors')
    .update({
      about: draft.about.trim(),
      education: draft.education.trim(),
      approach: draft.approach.trim(),
      experience_years: draft.experienceYears,
      goals: draft.goals,
    })
    .eq('user_id', id);
  if (tutor.error) throw tutor.error;
  if (!saved.slug && draft.name.trim()) await ensureSlug(id, draft.name);

  const keep = draft.subjects.map(s => s.subjectId);
  if (draft.subjects.length) {
    const up = await supabase
      .from('tutor_subjects')
      .upsert(draft.subjects.map(s => ({ tutor_id: id, subject_id: s.subjectId, topics: s.topics.trim() })), { onConflict: 'tutor_id,subject_id' });
    if (up.error) throw up.error;
  }
  const gone = saved.subjects.map(s => s.subjectId).filter(s => !keep.includes(s));
  if (gone.length) {
    // prices of a removed subject go with it (foreign key on delete cascade)
    const del = await supabase.from('tutor_subjects').delete().eq('tutor_id', id).in('subject_id', gone);
    if (del.error) throw del.error;
  }

  const priceKey = (p: { subjectId: number; durationMin: number }) => `${p.subjectId}:${p.durationMin}`;
  const nextKeys = new Set(draft.prices.map(priceKey));
  for (const p of saved.prices) {
    if (nextKeys.has(priceKey(p)) || gone.includes(p.subjectId)) continue;
    const del = await supabase.from('prices').delete().eq('tutor_id', id).eq('subject_id', p.subjectId).eq('duration_min', p.durationMin);
    if (del.error) throw del.error;
  }
  if (draft.prices.length) {
    const up = await supabase.from('prices').upsert(
      draft.prices.map(p => ({ tutor_id: id, subject_id: p.subjectId, duration_min: p.durationMin, price_rub: p.priceRub })),
      { onConflict: 'tutor_id,subject_id,duration_min' },
    );
    if (up.error) throw up.error;
  }
}

export type PhotoResult = { ok: true; path: string } | { ok: false; error: string };

/** Р2.1: uploads a 4:5 photo into the tutor's own folder and stores its path at once. */
export async function uploadTutorPhoto(id: string, file: File, oldPath: string | null): Promise<PhotoResult> {
  if (!PHOTO_TYPES.includes(file.type)) return { ok: false, error: 'Подойдёт фото в формате JPEG, PNG или WebP.' };
  if (file.size > PHOTO_MAX_BYTES) return { ok: false, error: 'Фото больше 5 МБ. Уменьшите его и загрузите снова.' };
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${id}/${Date.now()}.${ext}`;
  const up = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) return { ok: false, error: 'Не получилось загрузить фото. Проверьте интернет и попробуйте ещё раз.' };
  const row = await supabase.from('tutors').update({ photo_path: path }).eq('user_id', id);
  if (row.error) return { ok: false, error: 'Не получилось сохранить фото. Попробуйте ещё раз.' };
  if (oldPath && oldPath !== path) void supabase.storage.from(PHOTO_BUCKET).remove([oldPath]);
  return { ok: true, path };
}

export async function getMissing(): Promise<Missing[]> {
  const { data, error } = await supabase.rpc('tutor_missing');
  if (error) throw error;
  return MISSING_ORDER.filter(m => ((data as string[] | null) ?? []).includes(m));
}

export type PublishResult = { ok: true } | { ok: false; reason: 'not_ready'; missing: Missing[] } | { ok: false; reason: 'hidden' | 'error' };

/** Р2.1-публикация: no moderation, the profile is public right after this call. */
export async function publishTutor(): Promise<PublishResult> {
  const { error } = await supabase.rpc('publish_tutor');
  if (!error) return { ok: true };
  if (error.message === 'not_ready') {
    const missing = (error.details ?? '').split(',').filter(Boolean) as Missing[];
    return { ok: false, reason: 'not_ready', missing: MISSING_ORDER.filter(m => missing.includes(m)) };
  }
  if (error.message === 'hidden_by_admin') return { ok: false, reason: 'hidden' };
  return { ok: false, reason: 'error' };
}

export async function unpublishTutor() {
  const { error } = await supabase.rpc('unpublish_tutor');
  if (error) throw error;
}

/** Whether students can book at least one lesson of the shortest offered length within the horizon. */
export async function hasFreeTime(id: string, durationMin: number) {
  const { data, error } = await supabase.rpc('free_slots', { p_tutor: id, p_duration: durationMin }).limit(1);
  if (error) throw error;
  return ((data as unknown[] | null) ?? []).length > 0;
}

export interface TutorSummary {
  status: TutorStatus;
  missing: Missing[];
  freeTime: boolean;
  horizonWeeks: number;
}

/** Р4.1-сводка: publication state and the «no free windows» warning. */
export async function getTutorSummary(id: string): Promise<TutorSummary> {
  const [tutor, prices, missing] = await Promise.all([
    supabase.from('tutors').select('status, horizon_weeks').eq('user_id', id).single(),
    supabase.from('prices').select('duration_min').eq('tutor_id', id),
    getMissing(),
  ]);
  if (tutor.error) throw tutor.error;
  if (prices.error) throw prices.error;
  const lengths = (prices.data ?? []).map(p => p.duration_min as number);
  const shortest = lengths.length ? Math.min(...lengths) : 45;
  return {
    status: tutor.data.status as TutorStatus,
    missing,
    freeTime: await hasFreeTime(id, shortest),
    horizonWeeks: tutor.data.horizon_weeks,
  };
}
