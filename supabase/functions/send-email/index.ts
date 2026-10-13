// Sends letters queued in public.email_outbox (О2). Called by pg_cron every minute with the service role key.
// Secrets: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SITE_URL.
// The letters themselves are in ./letters.ts; locally /dev/mail shows the same letters from the outbox.
import { createClient } from 'npm:@supabase/supabase-js@2.117.0';
import nodemailer from 'npm:nodemailer@6.9.16';
import { html, letter, LETTER_SELECT, plain, toLetterBooking, type OutboxRow } from './letters.ts';

const env = (key: string, fallback = '') => Deno.env.get(key) ?? fallback;
const site = env('SITE_URL', 'https://toprepet.ru').replace(/\/$/, '');
const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
const smtp = nodemailer.createTransport({
  host: env('SMTP_HOST'),
  port: Number(env('SMTP_PORT', '465')),
  secure: env('SMTP_PORT', '465') === '465',
  auth: { user: env('SMTP_USER'), pass: env('SMTP_PASS') },
});

Deno.serve(async req => {
  if (req.headers.get('authorization') !== `Bearer ${env('SUPABASE_SERVICE_ROLE_KEY')}`) return new Response('forbidden', { status: 403 });
  const { data: rows, error } = await db.from('email_outbox').select('id,to_email,template,payload').is('sent_at', null).is('error', null).order('id').limit(50);
  if (error) return new Response(error.message, { status: 500 });
  let sent = 0;
  for (const row of (rows ?? []) as OutboxRow[]) {
    const { data: b } = await db.from('bookings').select(LETTER_SELECT).eq('id', Number(row.payload.booking_id)).single();
    const l = b ? letter(row, toLetterBooking(b as Record<string, unknown>), site) : null;
    if (!l) {
      await db.from('email_outbox').update({ error: 'unknown template or booking' }).eq('id', row.id);
      continue;
    }
    try {
      await smtp.sendMail({ from: env('SMTP_FROM', 'TopRepet <noreply@toprepet.ru>'), to: row.to_email, subject: l.subject, html: html(l, row.to_email), text: plain(l) });
      await db.from('email_outbox').update({ sent_at: new Date().toISOString() }).eq('id', row.id);
      sent++;
    } catch (e) {
      await db.from('email_outbox').update({ error: String(e).slice(0, 500) }).eq('id', row.id);
    }
  }
  return Response.json({ sent });
});
