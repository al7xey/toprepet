#!/usr/bin/env node
/* Р1.1, Р-8: moves the 10 tutors of the old site into the service and sends each an invitation to set a password.

   Usage:
     SUPABASE_URL=https://<project>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<service role key> \
     TUTOR_EMAILS=./tutor-emails.json SITE_URL=https://toprepet.ru node scripts/seed-tutors.mjs [options]

   TUTOR_EMAILS is a JSON file kept outside the repository: { "english": "anastasia@mail.ru", "history": "…", … }
   (keys are the ids in supabase/seed/tutors.json). Tutors without an address are skipped.

   Options:
     --dry-run         print what would be done, change nothing
     --only a,b        only these ids
     --resend          send the invitation again to tutors who have not set a password yet
     --no-invite       create accounts without sending letters (the tutor can use «Забыли пароль?» later)
     --slug-suffix s   add «-s» to every profile address (tests run next to the real data)

   Safe to run again: an existing account is found by its email; only empty profile fields are filled, so a tutor's own
   edits are never overwritten; subjects and the photo are added only when missing. Profiles stay drafts: the tutor sets
   prices and free time and publishes (spec, section 1: «все 10 текущих репетиторов опубликовали анкеты»). */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = name => args.includes(name);
const option = name => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const api = (process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const site = (process.env.SITE_URL ?? 'https://toprepet.ru').replace(/\/$/, '');
const emailsFile = process.env.TUTOR_EMAILS;
if (!api || !key || !emailsFile) {
  console.error('Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and TUTOR_EMAILS (a JSON file {"<id>": "<email>"}).');
  process.exit(2);
}

const dry = flag('--dry-run');
const resend = flag('--resend');
const invite = !flag('--no-invite');
const suffix = option('--slug-suffix');
const only = option('--only')?.split(',').map(s => s.trim()).filter(Boolean);

const { tutors } = JSON.parse(readFileSync(resolve(root, 'supabase/seed/tutors.json'), 'utf8'));
const emails = JSON.parse(readFileSync(resolve(process.cwd(), emailsFile), 'utf8'));

const headers = { apikey: key, authorization: `Bearer ${key}` };

async function call(method, path, body, extra = {}) {
  const res = await fetch(`${api}${path}`, {
    method,
    headers: { ...headers, ...(body !== undefined && !(body instanceof Uint8Array) ? { 'content-type': 'application/json' } : {}), ...extra },
    body: body === undefined ? undefined : body instanceof Uint8Array ? body : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  return data;
}

const rest = (method, path, body, extra) => call(method, `/rest/v1/${path}`, body, extra);

async function subjectIds() {
  const rows = await rest('GET', 'subjects?select=id,slug');
  return new Map(rows.map(r => [r.slug, r.id]));
}

/** The account by email: profile id, whether a password was ever used (last sign-in) or the invitation accepted. */
async function findAccount(email) {
  const rows = await rest('GET', `profiles?select=id,role&email=eq.${encodeURIComponent(email)}`);
  if (!rows.length) return null;
  const user = await call('GET', `/auth/v1/admin/users/${rows[0].id}`);
  return { id: rows[0].id, role: rows[0].role, active: Boolean(user.last_sign_in_at || user.email_confirmed_at) };
}

async function sendInvite(email, name) {
  const redirect = encodeURIComponent(`${site}/reset/new/`);
  return call('POST', `/auth/v1/invite?redirect_to=${redirect}`, { email, data: { name, role: 'tutor', tz: 'Europe/Moscow' } });
}

async function createSilently(email, name) {
  const password = Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString('base64url');
  return call('POST', '/auth/v1/admin/users', { email, password, email_confirm: true, user_metadata: { name, role: 'tutor', tz: 'Europe/Moscow' } });
}

async function fillProfile(id, t, subjects) {
  const [row] = await rest('GET', `tutors?select=slug,photo_path,about,education,approach,experience_years,goals&user_id=eq.${id}`);
  if (!row) throw new Error(`no tutor row for ${t.id}: the account is not a tutor`);
  const patch = {};
  const slug = suffix ? `${t.slug}-${suffix}` : t.slug;
  if (!row.slug) patch.slug = slug;
  for (const field of ['about', 'education', 'approach']) if (!row[field]?.trim()) patch[field] = t[field];
  if (row.experience_years === null) patch.experience_years = t.experience_years;
  if (!row.goals?.length) patch.goals = t.goals;
  const done = [];
  if (!row.photo_path) {
    const path = `${id}/site-${t.id}.webp`;
    const file = new Uint8Array(readFileSync(resolve(root, t.photo)));
    if (!dry) await call('POST', `/storage/v1/object/tutor-photos/${path}`, file, { 'content-type': 'image/webp', 'x-upsert': 'true' });
    patch.photo_path = path;
    done.push('фото');
  }
  if (Object.keys(patch).length && !dry) await rest('PATCH', `tutors?user_id=eq.${id}`, patch, { prefer: 'return=minimal' });
  done.push(...Object.keys(patch).filter(k => k !== 'photo_path'));
  const have = new Set((await rest('GET', `tutor_subjects?select=subject_id&tutor_id=eq.${id}`)).map(r => r.subject_id));
  const add = t.subjects.filter(s => !have.has(subjects.get(s.slug))).map(s => ({ tutor_id: id, subject_id: subjects.get(s.slug), topics: s.topics }));
  if (add.length && !dry) await rest('POST', 'tutor_subjects', add, { prefer: 'resolution=ignore-duplicates,return=minimal' });
  if (add.length) done.push(`предметы: ${add.length}`);
  return done;
}

const subjects = await subjectIds();
for (const t of tutors) for (const s of t.subjects) if (!subjects.has(s.slug)) throw new Error(`unknown subject ${s.slug} for ${t.id}`);

let failed = 0;
for (const t of tutors) {
  if (only && !only.includes(t.id)) continue;
  const email = emails[t.id]?.trim().toLowerCase();
  if (!email) {
    console.log(`skip ${t.id} (${t.name}): no email in TUTOR_EMAILS`);
    continue;
  }
  try {
    let account = await findAccount(email);
    const steps = [];
    if (!account) {
      if (dry) {
        console.log(`would create ${t.id} (${t.name}) <${email}>${invite ? ' and send an invitation' : ''}`);
        continue;
      }
      const user = invite ? await sendInvite(email, t.name) : await createSilently(email, t.name);
      account = { id: user.id, role: 'tutor', active: false };
      steps.push(invite ? 'аккаунт создан, приглашение отправлено' : 'аккаунт создан без письма');
    } else if (account.role !== 'tutor') {
      throw new Error(`${email} is already registered as ${account.role}`);
    } else if (resend && !account.active) {
      if (!dry) await sendInvite(email, t.name);
      steps.push('приглашение отправлено ещё раз');
    }
    steps.push(...(await fillProfile(account.id, t, subjects)));
    console.log(`${dry ? 'would update' : 'ok'} ${t.id} (${t.name}) <${email}>: ${steps.length ? steps.join(', ') : 'без изменений'}`);
  } catch (error) {
    failed++;
    console.error(`FAIL ${t.id}: ${error.message}`);
  }
}
process.exit(failed ? 1 : 0);
