import { supabase } from './supabase';
import type { Role } from './types';

export type AuthResult = { ok: true } | { ok: false; reason: 'invalid' | 'taken' | 'weak' | 'network' | 'unknown' };

function classify(error: { message?: string; code?: string; status?: number } | null): AuthResult {
  if (!error) return { ok: true };
  const code = error.code ?? '';
  const msg = (error.message ?? '').toLowerCase();
  if (code === 'user_already_exists' || code === 'email_exists' || msg.includes('already registered')) return { ok: false, reason: 'taken' };
  if (code === 'invalid_credentials' || msg.includes('invalid login')) return { ok: false, reason: 'invalid' };
  if (code === 'weak_password' || msg.includes('password should')) return { ok: false, reason: 'weak' };
  if (!error.status || msg.includes('fetch')) return { ok: false, reason: 'network' };
  return { ok: false, reason: 'unknown' };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  return classify(error);
}

export async function signUp(input: { name: string; email: string; password: string; role: Exclude<Role, 'admin'>; tz: string }): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: { data: { name: input.name.trim(), role: input.role, tz: input.tz } },
  });
  // With email confirmation on, Supabase hides duplicates behind a user without identities.
  if (!error && data.user && data.user.identities?.length === 0) return { ok: false, reason: 'taken' };
  return classify(error);
}

/** Always resolves the same way, so the page cannot reveal whether the address exists (У3.2). */
export async function requestPasswordReset(email: string) {
  await supabase.auth
    .resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset/new/` })
    .catch(() => undefined);
}

export async function setNewPassword(password: string): Promise<AuthResult> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error?.code === 'same_password') return { ok: true };
  return classify(error);
}

export async function signOut() {
  await supabase.auth.signOut();
}
