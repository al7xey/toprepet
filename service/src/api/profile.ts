import { supabase } from './supabase';

export async function updateProfile(id: string, patch: { name: string; tz: string }) {
  const { error } = await supabase.from('profiles').update({ name: patch.name.trim(), tz: patch.tz }).eq('id', id);
  if (error) throw error;
}
