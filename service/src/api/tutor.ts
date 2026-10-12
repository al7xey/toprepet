import { supabase } from './supabase';

export interface PublishCheck {
  status: 'draft' | 'published' | 'hidden';
  photo: boolean;
  name: boolean;
  subjectWithPrice: boolean;
  freeTime: boolean;
}

/** What the tutor's own profile still lacks for publication (Р1.1, Р2.1-публикация). Reads under RLS. */
export async function getPublishCheck(tutorId: string): Promise<PublishCheck> {
  const [tutor, profile, prices, windows] = await Promise.all([
    supabase.from('tutors').select('status, photo_path').eq('user_id', tutorId).maybeSingle(),
    supabase.from('profiles').select('name').eq('id', tutorId).maybeSingle(),
    supabase.from('prices').select('id', { count: 'exact', head: true }).eq('tutor_id', tutorId),
    supabase.from('weekly_windows').select('id', { count: 'exact', head: true }).eq('tutor_id', tutorId),
  ]);
  for (const r of [tutor, profile, prices, windows]) if (r.error) throw r.error;
  return {
    status: (tutor.data?.status as PublishCheck['status']) ?? 'draft',
    photo: Boolean(tutor.data?.photo_path),
    name: Boolean(profile.data?.name?.trim()),
    subjectWithPrice: (prices.count ?? 0) > 0,
    freeTime: (windows.count ?? 0) > 0,
  };
}
