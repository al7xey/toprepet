// Letters of О2: subject, text, one button and the lesson card (04-dizayn/teksty.md, section 8).
// Pure module without Deno or Node APIs: the Edge Function sends these letters, /dev/mail shows the same ones locally.

export interface OutboxRow {
  id: number;
  to_email: string;
  template: string;
  payload: Record<string, unknown>;
}

export interface LetterPerson {
  id: string;
  name: string;
  tz: string;
}

export interface LetterBooking {
  id: number;
  starts_at: string;
  duration_min: number;
  price_rub: number;
  participant_name: string | null;
  for_other: boolean;
  student: LetterPerson;
  tutor: LetterPerson;
  subject: { name: string };
}

/** Columns the letters need, as a PostgREST select of bookings. */
export const LETTER_SELECT =
  'id,starts_at,duration_min,price_rub,participant_name,for_other,student:profiles!bookings_student_id_fkey(id,name,tz),tutor:tutors!inner(profile:profiles!tutors_user_id_fkey(id,name,tz)),subject:subjects(name)';

/** The row PostgREST returns for LETTER_SELECT, flattened. */
export function toLetterBooking(row: Record<string, unknown>): LetterBooking {
  const tutor = (row.tutor as { profile: LetterPerson }).profile;
  return { ...(row as unknown as LetterBooking), tutor };
}

export interface Letter {
  subject: string;
  text: string;
  button: string;
  url: string;
  /** the lesson card: [term, value] */
  facts: [string, string][];
}

const first = (full: string) => full.trim().split(/\s+/)[0] ?? full;
const MALE_A = new Set(['Никита', 'Илья', 'Кузьма', 'Лука', 'Фома', 'Савва', 'Данила', 'Гаврила', 'Миша', 'Дима', 'Петя', 'Ваня', 'Паша', 'Лёша', 'Коля', 'Витя', 'Вова', 'Слава']);
const past = (name: string, masc: string, fem: string) => (/[ая]$/.test(name) && !MALE_A.has(name) ? fem : masc);
const instrumental = (name: string) =>
  /ия$/.test(name)
    ? name.replace(/ия$/, 'ией')
    : /[жшчщц]а$/.test(name)
      ? name.replace(/а$/, 'ей')
      : /[ая]$/.test(name)
        ? name.replace(/а$/, 'ой').replace(/я$/, 'ей')
        : /[ьй]$/.test(name)
          ? name.replace(/[ьй]$/, 'ем')
          : `${name}ом`;

const dative = (name: string) =>
  /ия$/.test(name) ? name.replace(/ия$/, 'ии') : /[ая]$/.test(name) ? name.replace(/[ая]$/, 'е') : /[ьй]$/.test(name) ? name.replace(/[ьй]$/, 'ю') : `${name}у`;

const ZONE_BY: Record<string, string> = {
  'Europe/Kaliningrad': 'по Калининграду',
  'Europe/Moscow': 'по Москве',
  'Europe/Samara': 'по Самаре',
  'Asia/Yekaterinburg': 'по Екатеринбургу',
  'Asia/Omsk': 'по Омску',
  'Asia/Novosibirsk': 'по Новосибирску',
  'Asia/Krasnoyarsk': 'по Красноярску',
  'Asia/Irkutsk': 'по Иркутску',
  'Asia/Yakutsk': 'по Якутску',
  'Asia/Vladivostok': 'по Владивостоку',
  'Asia/Magadan': 'по Магадану',
  'Asia/Kamchatka': 'по Петропавловску-Камчатскому',
};

const money = (n: number) => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₽`;

/** «Пт 10 окт, 19:00» (or «Пт 10 окт» without the time) in a zone. */
export function when(iso: string, tz: string, withTime = true) {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric', month: 'short', timeZone: tz }).formatToParts(d);
  const part = (type: string) => (parts.find(p => p.type === type)?.value ?? '').replace('.', '');
  const wd = part('weekday');
  const day = `${wd.charAt(0).toUpperCase()}${wd.slice(1)} ${part('day')} ${part('month')}`;
  const time = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: tz }).format(d);
  return withTime ? `${day}, ${time}` : day;
}

export function letter(row: OutboxRow, b: LetterBooking, site: string): Letter | null {
  const isTutor = String(row.payload.user_id) === b.tutor.id;
  const tz = isTutor ? b.tutor.tz : b.student.tz;
  const tutor = first(b.tutor.name);
  const student = first(b.student.name);
  const who = b.for_other && b.participant_name ? first(b.participant_name) : student;
  const at = when(b.starts_at, tz);
  const day = when(b.starts_at, tz, false);
  const lesson = `${site}${isTutor ? '/tutor/lessons/' : '/cabinet/lessons/'}${b.id}`;
  const p = row.payload;
  const time = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: tz }).format(new Date(b.starts_at));
  const facts: [string, string][] = [
    ['Когда', `${at} ${ZONE_BY[tz] ?? `(${tz})`}`],
    [isTutor ? 'Ученик' : 'Репетитор', isTutor ? (b.for_other && b.participant_name ? b.participant_name : b.student.name) : b.tutor.name],
    ['Предмет', `${b.subject.name}, ${b.duration_min} мин`],
    ['Стоимость', money(b.price_rub)],
  ];
  const base = { facts };
  switch (row.template) {
    case 'booking_created':
      return { ...base, subject: `Новая запись: ${who}, ${at}`, button: 'Ответить на запись', url: `${site}/tutor/bookings/${b.id}`,
        text: `${who} записывается на ${b.subject.name.toLowerCase()} в ${at}. Подтвердите или отклоните запись, иначе она отменится сама.` };
    case 'booking_confirmed':
      return { ...base, subject: `${tutor} ${past(tutor, 'подтвердил', 'подтвердила')} занятие в ${at}`, button: 'Открыть занятие', url: lesson,
        text: `Оплата ${dative(tutor)} напрямую: ${past(tutor, 'он', 'она')} напишет, как удобно. Ссылку на звонок ${tutor} пришлёт перед началом, мы сразу перешлём её.` };
    case 'booking_declined':
      return { ...base, subject: `${tutor} не сможет провести занятие в ${day}`, button: 'Выбрать другое время',
        url: `${site}/teachers/`, text: `Причина: «${String(p.reason ?? '')}». Выберите другое время или другого репетитора.` };
    case 'booking_autocancelled':
      return isTutor
        ? { ...base, subject: `Запись на ${day} отменена: вы не ответили`, button: 'Открыть записи', url: `${site}/tutor/bookings/`,
            text: 'Запись отменилась автоматически, потому что срок ответа истёк. Время снова свободно для записи.' }
        : { ...base, subject: `Запись на ${day} отменена: ${tutor} не ${past(tutor, 'ответил', 'ответила')}`,
            button: 'Выбрать другое время', url: `${site}/teachers/`, text: `${tutor} не ${past(tutor, 'ответил', 'ответила')} вовремя. Выберите другое время или другого репетитора.` };
    case 'booking_cancelled':
      return isTutor
        ? { ...base, subject: `${student} ${past(student, 'отменил', 'отменила')} занятие в ${day}`, button: 'Открыть расписание',
            url: `${site}/tutor/lessons/`, text: p.late ? 'Отмена меньше чем за 4 часа: вы вправе считать занятие состоявшимся.' : 'Время снова свободно для записи.' }
        : { ...base, subject: `${tutor} ${past(tutor, 'отменил', 'отменила')} занятие в ${day}`, button: 'Выбрать другое время',
            url: `${site}/teachers/`, text: `${p.reason ? `Причина: «${String(p.reason)}». ` : ''}Выберите другое время или другого репетитора.` };
    case 'link_added':
      return { ...base, subject: `Ссылка на занятие в ${at}`, button: 'Подключиться', url: lesson, text: `${tutor} ${past(tutor, 'добавил', 'добавила')} ссылку на звонок. Кнопка «Подключиться» есть и в карточке занятия.` };
    case 'link_missing':
      return { ...base, subject: `Добавьте ссылку на занятие в ${time}`, button: 'Добавить ссылку', url: lesson, text: 'До начала 15 минут, а ссылки на звонок пока нет.' };
    case 'reminder_24h':
      return { ...base, subject: `Завтра в ${time} занятие с ${instrumental(isTutor ? who : tutor)}`, button: 'Открыть занятие', url: lesson, text: `Занятие ${at}.` };
    case 'reminder_1h':
      return { ...base, subject: `Через час занятие с ${instrumental(isTutor ? who : tutor)}`, button: 'Открыть занятие', url: lesson, text: `Занятие ${at}.` };
    case 'problem_reported':
      return { ...base, subject: `Ученик сообщил о проблеме с занятием ${day}`, button: 'Открыть занятие', url: lesson,
        text: 'Администратор разберёт обращение за 3 рабочих дня и напишет вам и ученику.' };
    case 'problem_resolved':
      return { ...base, subject: `Решение по занятию ${day}`, button: 'Открыть занятие', url: lesson,
        text: p.resolution === 'happened' ? 'Занятие считается состоявшимся.' : 'Занятие считается несостоявшимся.' };
    default:
      return null;
  }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The letter in the site's style: brand, card with the heading, the lesson facts, the text and one button. */
export const html = (l: Letter, to: string) => `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${esc(l.subject)}</title></head><body style="margin:0;background:#fff7f1;font-family:Manrope,Arial,sans-serif;color:#202838">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
<p style="font-size:22px;font-weight:700;margin:0 0 24px">toprepet</p>
<div style="background:#fff;border:1px solid #f0e3dc;border-radius:24px;padding:24px">
<h1 style="font-size:22px;line-height:1.3;margin:0 0 16px;font-weight:650">${esc(l.subject)}</h1>
<table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 16px;font-size:15px">${l.facts
  .map(([k, v]) => `<tr><td style="padding:6px 0;color:#667085;border-bottom:1px solid #f0e3dc">${esc(k)}</td><td style="padding:6px 0;text-align:right;font-weight:600;border-bottom:1px solid #f0e3dc">${esc(v)}</td></tr>`)
  .join('')}</table>
<p style="font-size:16px;line-height:1.6;margin:0 0 20px">${esc(l.text)}</p>
<a href="${esc(l.url)}" style="display:inline-block;background:#d9551d;color:#fff;text-decoration:none;font-weight:750;padding:14px 22px;border-radius:18px">${esc(l.button)}</a>
</div>
<p style="font-size:13px;color:#667085;margin:20px 0 0">Письмо отправлено на ${esc(to)}. Поддержка: Telegram @toprepet_manager</p>
</div></body></html>`;

export const plain = (l: Letter) => `${l.subject}\n\n${l.facts.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${l.text}\n\n${l.button}: ${l.url}`;
