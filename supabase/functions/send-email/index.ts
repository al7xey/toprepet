// Sends letters queued in public.email_outbox (О2). Called by pg_cron every minute with the service role key.
// Secrets: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SITE_URL.
import { createClient } from 'npm:@supabase/supabase-js@2.117.0';
import nodemailer from 'npm:nodemailer@6.9.16';

const env = (key: string, fallback = '') => Deno.env.get(key) ?? fallback;
const site = env('SITE_URL', 'https://toprepet.ru').replace(/\/$/, '');
const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
const smtp = nodemailer.createTransport({
  host: env('SMTP_HOST'),
  port: Number(env('SMTP_PORT', '465')),
  secure: env('SMTP_PORT', '465') === '465',
  auth: { user: env('SMTP_USER'), pass: env('SMTP_PASS') },
});

interface Row { id: number; to_email: string; template: string; payload: Record<string, unknown> }
interface Booking {
  id: number; starts_at: string; participant_name: string | null; for_other: boolean;
  student: { name: string; tz: string; id: string }; tutor: { name: string; tz: string; id: string };
  subject: { name: string };
}

const first = (full: string) => full.trim().split(/\s+/)[0] ?? full;
const MALE_A = new Set(['Никита', 'Илья', 'Кузьма', 'Лука', 'Фома', 'Савва', 'Данила', 'Гаврила']);
const past = (name: string, masc: string, fem: string) => (/[ая]$/.test(name) && !MALE_A.has(name) ? fem : masc);
const instrumental = (name: string) =>
  /ия$/.test(name) ? name.replace(/ия$/, 'ией') : /[ая]$/.test(name) ? name.replace(/а$/, 'ой').replace(/я$/, 'ей')
  : /[ьй]$/.test(name) ? name.replace(/[ьй]$/, 'ем') : `${name}ом`;

function when(iso: string, tz: string, withTime = true) {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric', month: 'short', timeZone: tz })
    .formatToParts(d).filter(p => p.type !== 'literal' || p.value.trim()).map(p => p.value.replace('.', '')).join(' ');
  const time = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: tz }).format(d);
  const nice = day.replace(/^./, c => c.toUpperCase()).replace(/,/g, '');
  return withTime ? `${nice}, ${time}` : nice;
}

function letter(row: Row, b: Booking, recipientId: string) {
  const isTutor = recipientId === b.tutor.id;
  const tz = isTutor ? b.tutor.tz : b.student.tz;
  const tutor = first(b.tutor.name);
  const student = first(b.student.name);
  const who = b.for_other && b.participant_name ? b.participant_name : student;
  const at = when(b.starts_at, tz);
  const lesson = `${site}${isTutor ? '/tutor/lessons/' : '/cabinet/lessons/'}${b.id}`;
  const p = row.payload;
  const time = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: tz }).format(new Date(b.starts_at));
  switch (row.template) {
    case 'booking_created':
      return { subject: `Новая запись: ${who}, ${at}`, button: 'Ответить на запись', url: `${site}/tutor/bookings/${b.id}`,
        text: `${who} записывается на ${b.subject.name.toLowerCase()} в ${at}. Подтвердите или отклоните запись, иначе она отменится сама.` };
    case 'booking_confirmed':
      return { subject: `${tutor} ${past(tutor, 'подтвердил', 'подтвердила')} занятие в ${at}`, button: 'Открыть занятие', url: lesson,
        text: `Оплата репетитору напрямую после подтверждения. Ссылку на занятие ${tutor} пришлёт перед началом.` };
    case 'booking_declined':
      return { subject: `${tutor} не сможет провести занятие в ${when(b.starts_at, tz, false)}`, button: 'Выбрать другое время',
        url: `${site}/teachers/`, text: `Причина: ${String(p.reason ?? '')}` };
    case 'booking_autocancelled':
      return isTutor
        ? { subject: `Запись на ${when(b.starts_at, tz, false)} отменена: вы не ответили`, button: 'Открыть записи', url: `${site}/tutor/bookings/`,
            text: 'Запись отменилась автоматически, потому что срок ответа истёк.' }
        : { subject: `Запись на ${when(b.starts_at, tz, false)} отменена: ${tutor} не ${past(tutor, 'ответил', 'ответила')}`,
            button: 'Выбрать другое время', url: `${site}/teachers/`, text: 'Выберите другое время или другого репетитора.' };
    case 'booking_cancelled':
      return isTutor
        ? { subject: `${student} ${past(student, 'отменил', 'отменила')} занятие в ${when(b.starts_at, tz, false)}`, button: 'Открыть расписание',
            url: `${site}/tutor/lessons/`, text: p.late ? 'Отмена меньше чем за 4 часа: вы вправе считать занятие состоявшимся.' : 'Время снова свободно для записи.' }
        : { subject: `${tutor} ${past(tutor, 'отменил', 'отменила')} занятие в ${when(b.starts_at, tz, false)}`, button: 'Выбрать другое время',
            url: `${site}/teachers/`, text: p.reason ? `Причина: ${String(p.reason)}` : '' };
    case 'link_added':
      return { subject: `Ссылка на занятие в ${at}`, button: 'Подключиться', url: lesson, text: `${tutor} ${past(tutor, 'добавил', 'добавила')} ссылку на звонок.` };
    case 'link_missing':
      return { subject: `Добавьте ссылку на занятие в ${time}`, button: 'Добавить ссылку', url: lesson, text: 'До начала 15 минут, а ссылки на звонок пока нет.' };
    case 'reminder_24h':
      return { subject: `Завтра в ${time} занятие с ${instrumental(isTutor ? who : tutor)}`, button: 'Открыть занятие', url: lesson, text: at };
    case 'reminder_1h':
      return { subject: `Через час занятие с ${instrumental(isTutor ? who : tutor)}`, button: 'Открыть занятие', url: lesson, text: at };
    case 'problem_reported':
      return { subject: `Ученик сообщил о проблеме с занятием ${when(b.starts_at, tz, false)}`, button: 'Открыть занятие', url: lesson,
        text: 'Администратор разберёт обращение за 3 рабочих дня.' };
    case 'problem_resolved':
      return { subject: `Решение по занятию ${when(b.starts_at, tz, false)}`, button: 'Открыть занятие', url: lesson,
        text: p.resolution === 'happened' ? 'Занятие считается состоявшимся.' : 'Занятие считается несостоявшимся.' };
    default:
      return null;
  }
}

const html = (l: { subject: string; text: string; button: string; url: string }, to: string) => `<!doctype html><html lang="ru"><body style="margin:0;background:#fff7f1;font-family:Manrope,Arial,sans-serif;color:#202838">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
<p style="font-size:22px;font-weight:700;margin:0 0 24px">toprepet</p>
<div style="background:#fff;border:1px solid #f0e3dc;border-radius:24px;padding:24px">
<h1 style="font-size:22px;line-height:1.3;margin:0 0 12px;font-weight:650">${l.subject}</h1>
<p style="font-size:16px;line-height:1.6;margin:0 0 20px">${l.text}</p>
<a href="${l.url}" style="display:inline-block;background:#d9551d;color:#fff;text-decoration:none;font-weight:750;padding:14px 22px;border-radius:18px">${l.button}</a>
</div>
<p style="font-size:13px;color:#667085;margin:20px 0 0">Письмо отправлено на ${to}. Поддержка: Telegram @toprepet_manager</p>
</div></body></html>`;

Deno.serve(async req => {
  if (req.headers.get('authorization') !== `Bearer ${env('SUPABASE_SERVICE_ROLE_KEY')}`) return new Response('forbidden', { status: 403 });
  const { data: rows, error } = await db.from('email_outbox').select('id,to_email,template,payload').is('sent_at', null).is('error', null).order('id').limit(50);
  if (error) return new Response(error.message, { status: 500 });
  let sent = 0;
  for (const row of (rows ?? []) as Row[]) {
    const bookingId = Number(row.payload.booking_id);
    const { data: b } = await db.from('bookings')
      .select('id,starts_at,participant_name,for_other,student:profiles!bookings_student_id_fkey(id,name,tz),tutor:tutors!inner(profile:profiles!tutors_user_id_fkey(id,name,tz)),subject:subjects(name)')
      .eq('id', bookingId).single();
    const booking = b ? ({ ...b, tutor: (b as any).tutor.profile } as unknown as Booking) : null;
    const l = booking ? letter(row, booking, String(row.payload.user_id)) : null;
    if (!l) {
      await db.from('email_outbox').update({ error: 'unknown template or booking' }).eq('id', row.id);
      continue;
    }
    try {
      await smtp.sendMail({ from: env('SMTP_FROM', 'TopRepet <noreply@toprepet.ru>'), to: row.to_email, subject: l.subject, html: html(l, row.to_email), text: `${l.subject}\n\n${l.text}\n\n${l.button}: ${l.url}` });
      await db.from('email_outbox').update({ sent_at: new Date().toISOString() }).eq('id', row.id);
      sent++;
    } catch (e) {
      await db.from('email_outbox').update({ error: String(e).slice(0, 500) }).eq('id', row.id);
    }
  }
  return Response.json({ sent });
});
