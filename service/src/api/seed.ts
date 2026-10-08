import type { Chat, Db, Dispute, Lesson, LessonRequest, Message, Payment, PriceItem, StudentCategory, Transfer, TutorProfile, User } from './types';
import { DB_VERSION } from './store';
import { emptyWeek } from './schedule';
import { confirmDeadline } from './rules';
import { teachers as legacyTeachers } from '../../../src/entities/teacher/model/catalog';
import { hashPassword } from '../lib/sha256';
import { studentPrice } from '../lib/money';
import { DAY, HOUR, MIN, MSK, now, startOfDay } from '../lib/time';

/* Demo accounts (password for all: demo12345). Real tutors come from the landing site's catalog;
   they get schedules and prices but no invented reviews or verified badges. */
export const DEMO_PASSWORD = 'demo12345';
export const DEMO_ACCOUNTS = [
  { email: 'olga@demo.toprepet.ru', label: 'Ольга, ученица' },
  { email: 'anna@demo.toprepet.ru', label: 'Анна Ковалёва, репетитор' },
  { email: 'igor@demo.toprepet.ru', label: 'Игорь Павлов, репетитор' },
  { email: 'admin@demo.toprepet.ru', label: 'Команда TopRepet, админка' },
];

const SUBJECT_OF: Record<string, string> = {
  'Английский язык': 'Английский язык',
  История: 'История',
  'Русский язык': 'Русский язык',
  Литература: 'Литература',
  Химия: 'Химия',
  Биология: 'Биология',
  Информатика: 'Информатика',
  Математика: 'Математика',
  Физика: 'Физика',
};
const GOAL_OF: Record<string, string> = {
  'Школьная программа': 'Школьная программа',
  'Домашние задания': 'Домашние задания',
  'Подготовка к ОГЭ': 'ОГЭ',
  'Подготовка к ЕГЭ': 'ЕГЭ',
  'Подготовка к ВПР': 'ВПР',
  'Разговорный английский': 'Разговорный',
  'Английский для путешествий': 'Для путешествий',
  'Вступительные испытания': 'Олимпиады',
};
const EXP_YEARS: Record<string, number> = { 'Менее 1 года': 0, '1–3 года': 1, '3–5 лет': 3, '5–10 лет': 5, 'Более 10 лет': 10 };
const GENDER: Record<string, 'f' | 'm'> = {
  english: 'f', 'russian-literature': 'f', 'chemistry-biology': 'f', informatics: 'm', russian: 'm', mathematics: 'm', 'physics-mathematics': 'f', 'english-elizaveta': 'f', history: 'f', chemistry: 'm',
};
const TONES = ['orange', 'indigo', 'green', 'plum', 'sand', 'teal'] as const;

function week(spec: Partial<Record<number, [number, number][]>>) {
  const w = emptyWeek();
  for (const [day, ranges] of Object.entries(spec)) for (const [a, b] of ranges ?? []) for (let h = a; h < b; h++) w[+day][h] = true;
  return w;
}

function user(o: Partial<User> & Pick<User, 'id' | 'role' | 'name' | 'email'>): User {
  return {
    tz: MSK,
    tone: 'teal',
    createdAt: now() - 60 * DAY,
    children: [],
    favorites: [],
    cards: [],
    settings: { emailUnread: true, lessonReminders: true },
    blocked: [],
    promoUsed: [],
    passwordHash: o.email.endsWith('@demo.toprepet.ru') ? hashPassword(o.email, DEMO_PASSWORD) : undefined,
    demo: true,
    ...o,
  };
}

function tutor(o: Partial<TutorProfile> & Pick<TutorProfile, 'userId' | 'slug' | 'name'>): TutorProfile {
  return {
    tone: 'orange',
    about: '',
    education: '',
    experienceText: '',
    experienceYears: 1,
    achievements: [],
    approach: '',
    helpTopics: [],
    gender: '',
    city: '',
    tz: MSK,
    subjects: [],
    formats: { online: true, atHome: false, atStudent: false, district: '' },
    services: ['Телемост', 'Zoom'],
    intro: { enabled: true, minutes: 20 },
    prices: [],
    weekly: emptyWeek(),
    closed: [],
    extra: [],
    horizonWeeks: 2,
    minNoticeHours: 12,
    docs: [],
    published: true,
    visible: true,
    publishedAt: now() - 40 * DAY,
    createdAt: now() - 45 * DAY,
    templates: [],
    ...o,
  };
}

let priceSeq = 0;
const price = (subject: string, minutes: number, value: number): PriceItem => ({ id: `pr${++priceSeq}`, subject, minutes, price: value });

export function seed(): Db {
  priceSeq = 0;
  const t0 = now();
  const base = startOfDay(t0, MSK); // today 00:00 Moscow
  const at = (day: number, hour: number, minute = 0) => base + day * DAY + hour * HOUR + minute * MIN;
  const ago = (ms: number) => t0 - ms;

  const db: Db = {
    version: DB_VERSION,
    seq: 40,
    users: [],
    tutors: [],
    lessons: [],
    series: [],
    payments: [],
    transfers: [],
    requests: [],
    responses: [],
    chats: [],
    messages: [],
    reviews: [],
    disputes: [],
    complaints: [],
    notices: [],
    emails: [],
    resets: [],
    reservations: [],
  };

  /* ---------- people ---------- */
  const olga = user({ id: 'u-olga', role: 'student', name: 'Ольга', email: 'olga@demo.toprepet.ru', tone: 'teal', cards: [{ id: 'card-olga', last4: '4417', brand: 'Мир' }], children: [{ id: 'ch-misha', name: 'Миша', age: '14 лет, 8 класс' }], onboarding: { step: 3, done: true, forWhom: 'self', goal: 'Работа и карьера', subject: 'Английский язык' } });
  const admin = user({ id: 'u-admin', role: 'admin', name: 'Команда TopRepet', email: 'admin@demo.toprepet.ru', tone: 'green' });
  const students = [
    user({ id: 'u-kate', role: 'student', name: 'Екатерина', email: 'kate@demo.toprepet.ru', tone: 'plum' }),
    user({ id: 'u-mikhail', role: 'student', name: 'Михаил', email: 'mikhail@demo.toprepet.ru', tone: 'indigo' }),
    user({ id: 'u-dmitry', role: 'student', name: 'Дмитрий', email: 'dmitry@demo.toprepet.ru', tone: 'green' }),
    user({ id: 'u-ksenia', role: 'student', name: 'Ксения', email: 'ksenia@demo.toprepet.ru', tone: 'sand' }),
    user({ id: 'u-sergey', role: 'student', name: 'Сергей', email: 'sergey@demo.toprepet.ru', tone: 'indigo' }),
    user({ id: 'u-petr', role: 'student', name: 'Пётр', email: 'petr@demo.toprepet.ru', tone: 'sand' }),
    user({ id: 'u-darya', role: 'student', name: 'Дарья', email: 'darya@demo.toprepet.ru', tone: 'orange' }),
  ];
  const annaU = user({ id: 'u-anna', role: 'tutor', name: 'Анна Ковалёва', email: 'anna@demo.toprepet.ru', tone: 'orange', tz: 'Asia/Yekaterinburg' });
  const igorU = user({ id: 'u-igor', role: 'tutor', name: 'Игорь Павлов', email: 'igor@demo.toprepet.ru', tone: 'indigo' });
  const mariaU = user({ id: 'u-maria', role: 'tutor', name: 'Мария Белова', email: 'maria@demo.toprepet.ru', tone: 'teal' });
  db.users.push(olga, admin, ...students, annaU, igorU, mariaU);

  const anna = tutor({
    userId: annaU.id,
    slug: 'anna-kovaleva',
    name: 'Анна Ковалёва',
    tone: 'orange',
    tz: 'Asia/Yekaterinburg',
    city: 'Екатеринбург',
    gender: 'f',
    about: '8 лет готовлю к собеседованиям на английском в IT и консалтинге. Помогаю перестать бояться говорить: разбираем ваши реальные вопросы, тренируем рассказ о себе и small talk.',
    education: 'МГЛУ, переводческий факультет, 2014',
    experienceText: 'Корпоративные группы в IT-компаниях, с 2019 года частные ученики: 140 человек прошли собеседования на английском.',
    experienceYears: 8,
    achievements: [
      { title: 'МГЛУ', text: 'Переводческий факультет, 2014', verified: true },
      { title: 'IELTS 8.5', text: 'Academic, 2023' },
    ],
    approach: 'Разговорная практика по вашим реальным задачам, домашка в чате, план на месяц. Первые 20 минут бесплатно: обсудим цель и уровень.',
    helpTopics: ['Собеседование на английском', 'Деловой английский', 'Разговорный', 'IELTS', 'Презентации и созвоны'],
    subjects: [{ subject: 'Английский язык', goals: ['Собеседование', 'Разговорный', 'Деловой', 'IELTS'], students: ['Студенты', 'Взрослые'] }],
    prices: [price('Английский язык', 60, 2000), price('Английский язык', 90, 2800)],
    weekly: week({ 0: [[18, 22]], 1: [[18, 22]], 2: [[18, 22]], 3: [[18, 22]], 4: [[18, 22]], 5: [[10, 14]] }),
    closed: [{ id: 'cl-anna', from: dayKeyIn(at(14, 12), 'Asia/Yekaterinburg'), to: dayKeyIn(at(18, 12), 'Asia/Yekaterinburg'), note: 'Отпуск' }],
    docs: [
      { id: 'doc-a1', name: 'Диплом МГЛУ.pdf', size: 1_240_000, uploadedAt: ago(30 * DAY), status: 'ok', title: 'МГЛУ, переводческий факультет' },
      { id: 'doc-a2', name: 'IELTS.jpg', size: 840_000, uploadedAt: ago(4 * DAY), status: 'rejected', reason: 'Не видно имени и даты. Загрузите фото сертификата целиком.', title: 'IELTS 8.5' },
      { id: 'doc-a3', name: 'CELTA.pdf', size: 560_000, uploadedAt: ago(1 * DAY), status: 'review', title: 'CELTA' },
    ],
    payout: { status: 'self', inn: '771234567890', card: '2202 •••• 8812', partner: true },
    templates: [{ id: 'tpl-a1', title: 'Собеседования', text: 'Здравствуйте! Готовлю к собеседованиям в IT 8 лет. За месяц успеем отработать самопрезентацию, типовые вопросы и small talk.' }],
    services: ['Телемост', 'Zoom'],
    demo: true,
  });
  const igor = tutor({
    userId: igorU.id,
    slug: 'igor-pavlov',
    name: 'Игорь Павлов',
    tone: 'indigo',
    city: 'Москва',
    gender: 'm',
    about: 'Разговорный английский для работы и переезда. Начинаем с пробного разговора, чтобы понять уровень, дальше — план на 8 занятий.',
    education: 'НИУ ВШЭ, лингвистика, 2017',
    experienceText: '6 лет преподаю взрослым, 2 года жил и работал в Лондоне.',
    experienceYears: 6,
    helpTopics: ['Разговорный английский', 'Английский для переезда', 'Грамматика без зубрёжки'],
    subjects: [{ subject: 'Английский язык', goals: ['Разговорный', 'Деловой', 'Для путешествий'], students: ['Взрослые', 'Студенты'] }],
    prices: [price('Английский язык', 60, 1500), price('Английский язык', 45, 1200)],
    weekly: week({ 0: [[9, 13], [19, 22]], 2: [[9, 13], [19, 22]], 4: [[9, 13], [19, 22]], 5: [[11, 15]] }),
    minNoticeHours: 2,
    payout: { status: 'ip', inn: '7712345678', card: '4276 •••• 3301', partner: false },
    demo: true,
  });
  const maria = tutor({
    userId: mariaU.id,
    slug: 'maria-belova',
    name: 'Мария Белова',
    tone: 'teal',
    city: 'Санкт-Петербург',
    gender: 'f',
    about: 'Работала рекрутером в международной компании — покажу, что на самом деле спрашивают на интервью. Готовлю к IELTS и собеседованиям.',
    education: 'СПбГУ, филологический факультет, 2016',
    experienceText: '7 лет, из них 3 года — подготовка к IELTS.',
    experienceYears: 7,
    helpTopics: ['IELTS', 'Собеседование на английском', 'Академическое письмо'],
    subjects: [{ subject: 'Английский язык', goals: ['IELTS', 'Собеседование', 'Деловой'], students: ['Взрослые', 'Студенты', 'Школьники'] }],
    prices: [price('Английский язык', 60, 2200), price('Английский язык', 90, 3100)],
    weekly: week({ 5: [[10, 15]], 6: [[10, 15]], 0: [[19, 22]], 3: [[19, 22]] }),
    intro: { enabled: true, minutes: 30 },
    docs: [{ id: 'doc-m1', name: 'Диплом СПбГУ.pdf', size: 900_000, uploadedAt: ago(40 * DAY), status: 'ok', title: 'СПбГУ, филология' }],
    payout: { status: 'self', inn: '780212345678', card: '2200 •••• 4410', partner: true },
    demo: true,
  });
  db.tutors.push(anna, igor, maria);

  /* real tutors from the landing site */
  legacyTeachers.forEach((t, i) => {
    const uid = `u-legacy-${t.id}`;
    const subjects = t.helpTopics.map(h => SUBJECT_OF[h]).filter(Boolean);
    const goals = t.helpTopics.map(h => GOAL_OF[h]).filter(Boolean);
    const cats: StudentCategory[] = t.id === 'english' ? ['Дошкольники', 'Школьники'] : ['Школьники'];
    const tone = TONES[i % TONES.length];
    db.users.push(user({ id: uid, role: 'tutor', name: t.name, email: `${t.id}@tutors.toprepet.ru`, tone, photo: t.photo, demo: false }));
    db.tutors.push(tutor({
      userId: uid,
      slug: t.id,
      legacyId: t.id,
      name: t.name,
      photo: t.photo,
      tone,
      gender: GENDER[t.id] ?? '',
      about: t.intro,
      education: t.achievements.slice(0, 2).map(a => a.title).join('; '),
      experienceText: `Опыт преподавания: ${t.experience.toLowerCase()}.`,
      experienceYears: EXP_YEARS[t.experience] ?? 1,
      achievements: t.achievements.map(a => ({ title: a.title, text: a.text })),
      approach: t.approach,
      helpTopics: [...t.helpTopics],
      subjects: subjects.map(s => ({ subject: s, goals: goals.length ? goals : ['Школьная программа'], students: cats })),
      prices: subjects.flatMap(s => [price(s, 60, 1100), price(s, 90, 1600)]),
      weekly: i % 2 ? week({ 0: [[15, 20]], 1: [[15, 20]], 2: [[15, 20]], 3: [[15, 20]], 4: [[15, 20]], 5: [[10, 14]] }) : week({ 0: [[16, 21]], 2: [[16, 21]], 4: [[16, 21]], 5: [[11, 16]], 6: [[11, 16]] }),
      services: ['Телемост', 'Zoom'],
      intro: { enabled: true, minutes: 20 },
      payout: undefined,
      demo: false,
    }));
  });

  /* ---------- lessons, payments, transfers ---------- */
  let num = 1000;
  const addLesson = (o: Partial<Lesson> & Pick<Lesson, 'id' | 'studentId' | 'tutorId' | 'start' | 'status'>, pay?: Partial<Payment> | false, transfer?: Partial<Transfer>) => {
    const t = db.tutors.find(x => x.userId === o.tutorId)!;
    const minutes = o.minutes ?? (o.kind === 'intro' ? t.intro.minutes : 60);
    const tp = o.kind === 'intro' ? 0 : (o.tutorPrice ?? t.prices.find(p => p.minutes === minutes)?.price ?? t.prices[0].price);
    const stu = db.users.find(u => u.id === o.studentId)!;
    const createdAt = o.createdAt ?? o.start - 3 * DAY;
    const l: Lesson = {
      number: ++num,
      kind: 'lesson',
      participant: { kind: 'self', name: stu.name.split(' ')[0] },
      subject: t.subjects[0].subject,
      minutes,
      end: o.start + minutes * MIN,
      tutorPrice: tp,
      studentPrice: studentPrice(tp),
      discount: 0,
      createdAt,
      confirmDeadline: confirmDeadline(createdAt, o.start),
      reminders: { h24: o.start < t0, h1: o.start < t0, link15: o.start < t0, charge: true },
      ...o,
    };
    if (pay !== false && tp > 0) {
      const p: Payment = {
        id: `p-${l.id}`,
        studentId: l.studentId,
        lessonId: l.id,
        amount: l.studentPrice,
        method: { kind: 'card', last4: '4417', brand: 'Мир', cardId: 'card-olga' },
        status: 'charged',
        refunded: 0,
        events: [{ at: createdAt, type: 'hold', amount: l.studentPrice }, { at: createdAt + 40 * MIN, type: 'charge', amount: l.studentPrice }],
        createdAt,
        ...pay,
      };
      if (p.status === 'held') p.events = [p.events[0]];
      db.payments.push(p);
      l.paymentId = p.id;
    }
    if (transfer && tp > 0) db.transfers.push({ id: `tr-${l.id}`, tutorId: l.tutorId, lessonId: l.id, amount: tp, status: 'waiting', dueAt: l.end + DAY, ...transfer });
    db.lessons.push(l);
    return l;
  };

  // Olga ↔ Anna
  addLesson({ id: 'l-intro', kind: 'intro', studentId: olga.id, tutorId: anna.userId, start: at(-13, 19), status: 'completed', confirmedAt: at(-14, 10), completedAt: at(-13, 19, 20), reviewAsked: false });
  const firstPaid = addLesson({ id: 'l-first', studentId: olga.id, tutorId: anna.userId, start: at(-10, 19), status: 'completed', confirmedAt: at(-11, 18), completedAt: at(-10, 20, 30), studentAnswer: { ok: true, at: at(-10, 20, 30) }, reviewAsked: true, link: 'https://telemost.yandex.ru/j/41862' }, {}, { status: 'sent', sentAt: at(-10, 20, 31) });
  const disputed = addLesson({ id: 'l-dispute', studentId: olga.id, tutorId: anna.userId, start: at(-1, 19), status: 'disputed', confirmedAt: at(-3, 12), link: 'https://telemost.yandex.ru/j/51230' }, {}, { status: 'disputed' });
  const awaiting = addLesson({ id: 'l-await', studentId: olga.id, tutorId: anna.userId, start: at(0, 9), minutes: 60, status: 'confirmed', confirmedAt: at(-2, 12), link: 'https://telemost.yandex.ru/j/58831' }, {}, {});
  if (awaiting.end > t0) {
    // keep the «Урок состоялся?» demo valid whenever the seed is created: move it to the past
    awaiting.start = t0 - 3 * HOUR;
    awaiting.end = awaiting.start + 60 * MIN;
    const tr = db.transfers.find(x => x.lessonId === awaiting.id)!;
    tr.dueAt = awaiting.end + DAY;
  }
  const upcoming = addLesson({ id: 'l-next', studentId: olga.id, tutorId: anna.userId, start: at(2, 19), status: 'confirmed', confirmedAt: ago(20 * HOUR), comment: 'Собеседование через 3 недели, уровень B1' }, {}, {});
  void upcoming;
  // Olga ↔ Igor
  addLesson({ id: 'l-igor-pending', studentId: olga.id, tutorId: igor.userId, start: at(3, 9), status: 'pending', createdAt: ago(2 * HOUR), minutes: 45, tutorPrice: 1200 }, { status: 'held' });
  addLesson({ id: 'l-igor-cancel', studentId: olga.id, tutorId: igor.userId, start: at(-5, 11), status: 'cancelled', confirmedAt: at(-7, 12), cancel: { by: 'tutor', at: at(-6, 10), reason: 'Форс-мажор', refund: true } }, { status: 'refunded', refunded: 1650, events: [{ at: at(-7, 10), type: 'hold', amount: 1650 }, { at: at(-7, 12), type: 'charge', amount: 1650 }, { at: at(-6, 10), type: 'refund', amount: 1650, note: 'Урок отменил репетитор' }] }, { status: 'cancelled' });
  addLesson({ id: 'l-igor-expired', studentId: olga.id, tutorId: igor.userId, start: at(-2, 19), status: 'expired', createdAt: at(-4, 9) }, { status: 'released', events: [{ at: at(-4, 9), type: 'hold', amount: 1650 }, { at: at(-3, 9), type: 'release', amount: 1650, note: 'Репетитор не подтвердил вовремя' }] });
  // Olga ↔ Maria: free intro
  addLesson({ id: 'l-maria-intro', kind: 'intro', studentId: olga.id, tutorId: maria.userId, start: nextWeekday(base, 5, 11), status: 'confirmed', confirmedAt: ago(5 * HOUR) });

  // Anna's other students: past lessons with reviews, incoming requests
  const reviewLessons: [string, number, number, string, string?][] = [
    ['u-kate', -24, 5, 'Прошла собеседование в Яндекс с первого раза. Анна помогла собрать рассказ о себе и убрать страх перед small talk.', 'Екатерина, поздравляю! Было приятно готовиться вместе.'],
    ['u-mikhail', -30, 5, 'За 2 месяца поднял speaking с 6.0 до 7.5. Чёткий план и честная обратная связь.'],
    ['u-dmitry', -35, 4, 'Хорошо, но хотелось больше разговорной практики.', 'Дмитрий, спасибо! Добавила в план разговорный клуб по пятницам.'],
    ['u-ksenia', -50, 5, 'Занимаемся полгода, уровень вырос с B1 до B2. Удобно, что домашка приходит в чат.'],
  ];
  reviewLessons.forEach(([sid, day, rating, text, reply], i) => {
    const l = addLesson({ id: `l-rv-a${i}`, studentId: sid, tutorId: anna.userId, start: at(day, 18), status: 'completed', confirmedAt: at(day - 1, 12), completedAt: at(day, 20) }, { method: { kind: 'card', last4: '1881', brand: 'Visa' } }, { status: 'sent', sentAt: at(day, 20) });
    db.reviews.push({ id: `rv-a${i}`, lessonId: l.id, studentId: sid, tutorId: anna.userId, rating, text, status: 'published', createdAt: at(day, 21), publishedAt: at(day + 1, 10), reply: reply ? { text: reply, at: at(day + 1, 12) } : undefined });
  });
  db.reviews.push({ id: 'rv-olga', lessonId: firstPaid.id, studentId: olga.id, tutorId: anna.userId, rating: 4, text: 'Отработали самопрезентацию, стало гораздо спокойнее.', status: 'review', createdAt: at(-10, 21) });
  db.lessons[db.lessons.findIndex(l => l.id === firstPaid.id)].reviewId = 'rv-olga';
  addLesson({ id: 'l-dmitry-pending', studentId: 'u-dmitry', tutorId: anna.userId, start: at(6, 19), status: 'pending', createdAt: ago(1 * HOUR) }, { status: 'held', method: { kind: 'card', last4: '1881', brand: 'Visa' } });
  addLesson({ id: 'l-petr-intro', kind: 'intro', studentId: 'u-petr', tutorId: anna.userId, start: at(4, 18), status: 'pending', createdAt: ago(3 * HOUR) });
  addLesson({ id: 'l-anna-done-week', studentId: 'u-sergey', tutorId: anna.userId, start: at(-3, 18), status: 'completed', confirmedAt: at(-5, 12), completedAt: at(-3, 19, 30) }, { method: { kind: 'card', last4: '5100', brand: 'Mastercard' } }, { status: 'sent', sentAt: at(-3, 19, 31) });

  // Igor and Maria reviews
  ([['u-sergey', -20, 5, 'Отличная разговорная практика, Игорь сразу подобрал темы под мою работу.', igor.userId], ['u-darya', -15, 4, 'Понятно объясняет грамматику, иногда не хватает домашних заданий.', igor.userId], ['u-ksenia', -18, 5, 'Мария помогла получить 7.5 по IELTS, особенно сильно продвинулись в письме.', maria.userId]] as const).forEach(([sid, day, rating, text, tid], i) => {
    const l = addLesson({ id: `l-rv-o${i}`, studentId: sid, tutorId: tid, start: at(day, 12), status: 'completed', confirmedAt: at(day - 1, 12), completedAt: at(day, 14) }, { method: { kind: 'card', last4: '1881', brand: 'Visa' } }, { status: 'sent', sentAt: at(day, 14) });
    db.reviews.push({ id: `rv-o${i}`, lessonId: l.id, studentId: sid, tutorId: tid, rating, text, status: 'published', createdAt: at(day, 15), publishedAt: at(day + 1, 10) });
  });
  const sergeyIgor = addLesson({ id: 'l-rv-mod', studentId: 'u-petr', tutorId: igor.userId, start: at(-4, 12), status: 'completed', confirmedAt: at(-5, 12), completedAt: at(-4, 14) }, { method: { kind: 'card', last4: '1881', brand: 'Visa' } }, { status: 'sent', sentAt: at(-4, 14) });
  db.reviews.push({ id: 'rv-mod', lessonId: sergeyIgor.id, studentId: 'u-petr', tutorId: igor.userId, rating: 1, text: 'Пишите мне в телеграм @petr_eng, тут дороже.', status: 'review', createdAt: at(-4, 15) });

  /* ---------- dispute ---------- */
  const dispute: Dispute = {
    id: 'dp-1',
    number: disputed.number,
    lessonId: disputed.id,
    studentId: olga.id,
    tutorId: anna.userId,
    source: 'problem',
    reason: 'Урок сократили',
    details: 'Урок закончился через 25 минут, хотя оплачен час.',
    shots: [{ name: 'Скриншот звонка.png' }],
    createdAt: at(-1, 20, 40) > t0 ? t0 - 30 * MIN : at(-1, 20, 40),
    tutorDeadline: (at(-1, 20, 40) > t0 ? t0 - 30 * MIN : at(-1, 20, 40)) + 24 * HOUR,
    decideBy: base + 4 * DAY + 18 * HOUR,
    status: 'open',
  };
  db.disputes.push(dispute);
  db.lessons[db.lessons.findIndex(l => l.id === disputed.id)] = { ...disputed, disputeId: dispute.id, studentAnswer: { ok: false, at: dispute.createdAt } };

  /* ---------- requests and responses ---------- */
  const req = (o: Partial<LessonRequest> & Pick<LessonRequest, 'id' | 'slug' | 'studentId' | 'title' | 'subject'>): LessonRequest => ({
    direction: 'Работа и карьера',
    level: 'B1',
    goal: '',
    forChild: false,
    format: 'online',
    budget: 2500,
    times: ['weekday-evening', 'weekend'],
    frequency: '2 раза в неделю',
    status: 'active',
    createdAt: ago(2 * DAY),
    publishedAt: ago(2 * DAY),
    expiresAt: ago(2 * DAY) + 14 * DAY,
    responseLimit: 10,
    ...o,
  });
  db.requests.push(
    req({ id: 'rq-olga', slug: 'anglijskij-sobesedovanie', studentId: olga.id, title: 'Английский для собеседования', subject: 'Английский язык', goal: 'Через месяц собеседование на английском в IT-компанию', createdAt: ago(2 * DAY), publishedAt: ago(2 * DAY), expiresAt: ago(2 * DAY) + 14 * DAY }),
    req({ id: 'rq-guitar', slug: 'gitara-dlya-nachinayuschih', studentId: olga.id, title: 'Гитара для начинающих', subject: 'Гитара', direction: 'Хобби и творчество', level: 'Начинаю с нуля', goal: 'Играть песни у костра', status: 'closed', closedAt: ago(7 * DAY), closedReason: 'student', createdAt: ago(20 * DAY), expiresAt: ago(6 * DAY) }),
    req({ id: 'rq-sergey', slug: 'razgovornyj-pereezd', studentId: 'u-sergey', title: 'Разговорный английский для переезда', subject: 'Английский язык', level: 'A2', goal: 'Уверенно говорить через полгода', budget: 1800, times: ['weekday-day'], createdAt: ago(5 * HOUR), publishedAt: ago(5 * HOUR), expiresAt: ago(5 * HOUR) + 14 * DAY }),
    req({ id: 'rq-7class', slug: 'anglijskij-7-klass', studentId: 'u-darya', title: 'Английский, 7 класс', subject: 'Английский язык', direction: 'По предметам', level: 'Базовый', goal: 'Подтянуть грамматику и оценки', forChild: true, childAge: '13 лет', budget: 1500, times: ['weekday-evening'], frequency: '1 раз в неделю', createdAt: ago(DAY), publishedAt: ago(DAY), expiresAt: ago(DAY) + 14 * DAY }),
    req({ id: 'rq-ege-math', slug: 'ege-matematika-11', studentId: 'u-petr', title: 'ЕГЭ по математике, 11 класс', subject: 'Математика', direction: 'ОГЭ и ЕГЭ', level: 'Средний', goal: 'Профиль, сейчас около 60 баллов', forChild: true, childAge: '17 лет', budget: 1800, times: ['weekday-evening'], createdAt: ago(3 * HOUR), publishedAt: ago(3 * HOUR), expiresAt: ago(3 * HOUR) + 14 * DAY }),
    req({ id: 'rq-python', slug: 'python-s-nulya', studentId: 'u-kate', title: 'Python с нуля для аналитики', subject: 'Python', level: 'Начинаю с нуля', goal: 'Pandas и SQL за 3 месяца', budget: 2000, times: ['weekend'], createdAt: ago(DAY + 3 * HOUR), publishedAt: ago(DAY + 3 * HOUR), expiresAt: ago(DAY) + 13 * DAY }),
  );
  const slotsAt = (list: [number, number][]) => list.map(([day, hour]) => at(day, hour));
  db.responses.push(
    { id: 'rsp-anna', requestId: 'rq-olga', tutorId: anna.userId, message: 'Готовлю к собеседованиям в IT 8 лет. За месяц успеем отработать самопрезентацию и типовые вопросы.', price: 2000, slots: slotsAt([[3, 19], [5, 19], [7, 18]]), createdAt: ago(2 * DAY - 3 * HOUR), status: 'viewed' },
    { id: 'rsp-igor', requestId: 'rq-olga', tutorId: igor.userId, message: 'Предлагаю начать с пробного разговора, чтобы понять уровень, а дальше — план на 8 занятий.', price: 1500, slots: slotsAt([[4, 19], [5, 20], [7, 12]]), createdAt: ago(2 * DAY - 5 * HOUR), status: 'viewed' },
    { id: 'rsp-maria', requestId: 'rq-olga', tutorId: maria.userId, message: 'Работала рекрутером в международной компании — покажу, что на самом деле спрашивают на интервью.', price: 2200, slots: slotsAt([[nextDayOffset(base, 5), 10], [nextDayOffset(base, 6), 12], [nextDayOffset(base, 0), 20]]), createdAt: ago(DAY), status: 'sent' },
  );

  /* ---------- chats ---------- */
  const chat = (id: string, studentId: string, tutorId: string, createdAt: number): Chat => ({ id, kind: 'pair', studentId, tutorId, createdAt, lastAt: createdAt });
  const msgs: Message[] = [];
  let mi = 0;
  const m = (chatId: string, authorId: string, createdAt: number, text: string, read = true): Message => ({ id: `m-${++mi}`, chatId, authorId, kind: 'text', text, createdAt, readAt: read ? createdAt + 5 * MIN : undefined });
  const ev = (chatId: string, createdAt: number, event: Message['event']): Message => ({ id: `m-${++mi}`, chatId, authorId: 'system', kind: 'event', event, createdAt });

  const cAnna = chat('c-anna', olga.id, anna.userId, at(-15, 14));
  msgs.push(
    m(cAnna.id, olga.id, at(-15, 14), 'Здравствуйте! Можно сначала познакомиться? Собеседование через месяц.'),
    m(cAnna.id, anna.userId, at(-15, 14, 30), 'Здравствуйте, Ольга! Конечно, выбирайте время знакомства в анкете.'),
    ev(cAnna.id, at(-14, 9), { icon: 'cal', text: `Вы записались на знакомство {t:${at(-13, 19)}}`, sub: 'Бесплатно, ждём подтверждения', tutor: { text: `Ольга хочет познакомиться {t:${at(-13, 19)}}`, action: null } }),
    ev(cAnna.id, at(-14, 10), { icon: 'check', text: `Анна подтвердила знакомство {t:${at(-13, 19)}}`, tutor: { text: 'Вы подтвердили знакомство', action: null } }),
    ev(cAnna.id, at(-11, 18), { icon: 'check', text: `Анна подтвердила урок {t:${at(-10, 19)}}`, sub: '2 200 ₽ списаны', tutor: { text: `Вы подтвердили урок {t:${at(-10, 19)}}`, action: null } }),
    m(cAnna.id, anna.userId, ago(26 * HOUR), 'Добавила ссылку на урок, жду вас вовремя.'),
    ev(cAnna.id, ago(20 * HOUR), { icon: 'check', text: `Анна подтвердила урок {t:${at(2, 19)}}`, sub: '2 200 ₽ списаны', action: { label: 'Открыть урок', to: '/my/lessons/l-next' }, tutor: { text: `Вы подтвердили урок {t:${at(2, 19)}}`, action: { label: 'Открыть урок', to: '/tutor/lessons/l-next' } } }),
    m(cAnna.id, olga.id, ago(3 * HOUR), 'Анна, пришлю резюме — посмотрите заранее?'),
    { id: `m-${++mi}`, chatId: cAnna.id, authorId: olga.id, kind: 'file', file: { name: 'Резюме_Ольга.pdf', size: 240_000, type: 'application/pdf' }, createdAt: ago(3 * HOUR - 2 * MIN), readAt: ago(2 * HOUR) },
    m(cAnna.id, anna.userId, ago(2 * HOUR), 'Да, посмотрю до урока.', false),
  );
  cAnna.lastAt = ago(2 * HOUR);
  const cIgor = chat('c-igor', olga.id, igor.userId, ago(2 * DAY));
  msgs.push(
    ev(cIgor.id, ago(2 * DAY - 5 * HOUR), { icon: 'doc', text: 'Игорь откликнулся на заявку «Английский для собеседования»', action: { label: 'Открыть отклик', to: '/my/requests/rq-olga' }, tutor: { text: 'Ваш отклик на заявку «Английский для собеседования»', action: null } }),
    m(cIgor.id, igor.userId, ago(2 * DAY - 5 * HOUR + MIN), 'Добрый вечер! Начнём с пробного разговора, чтобы понять уровень.'),
    m(cIgor.id, olga.id, ago(2 * DAY - 4 * HOUR), 'Здравствуйте! А когда у вас есть время?'),
    m(cIgor.id, igor.userId, ago(2 * DAY - 3 * HOUR), 'Давайте без сайта — переведите мне на карту, так выйдет дешевле.', true),
    m(cIgor.id, igor.userId, ago(2 * HOUR), 'Могу в пятницу в 19:30', false),
  );
  cIgor.lastAt = ago(2 * HOUR);
  const cMaria = chat('c-maria', olga.id, maria.userId, ago(DAY));
  msgs.push(
    ev(cMaria.id, ago(DAY), { icon: 'doc', text: 'Мария откликнулась на заявку «Английский для собеседования»', action: { label: 'Открыть отклик', to: '/my/requests/rq-olga' }, tutor: { text: 'Ваш отклик на заявку «Английский для собеседования»', action: null } }),
    m(cMaria.id, maria.userId, ago(DAY - MIN), 'Работала рекрутером в международной компании — покажу, что на самом деле спрашивают на интервью.'),
    m(cMaria.id, olga.id, ago(20 * HOUR), 'Записалась на знакомство, до встречи!'),
    m(cMaria.id, maria.userId, ago(19 * HOUR), 'Хорошо, если что — пишите.'),
  );
  cMaria.lastAt = ago(19 * HOUR);
  const cDmitry = chat('c-dmitry', 'u-dmitry', anna.userId, ago(HOUR));
  msgs.push(ev(cDmitry.id, ago(HOUR), { icon: 'cal', text: `Вы записались на {t:${at(6, 19)}}`, tutor: { text: `Дмитрий записался на урок {t:${at(6, 19)}}`, sub: 'Подтвердите в течение 24 часов', action: { label: 'Ответить', to: '/tutor/lessons/l-dmitry-pending', tone: 'tinted' } } }));
  const cSupport: Chat = { id: 'c-support-olga', kind: 'support', userId: olga.id, lessonId: disputed.id, createdAt: ago(5 * HOUR), lastAt: ago(4 * HOUR) };
  msgs.push(
    { id: `m-${++mi}`, chatId: cSupport.id, authorId: 'system', kind: 'event', event: { icon: 'cal', text: `Обращение по уроку {t:${disputed.start}}` }, createdAt: ago(5 * HOUR) },
    m(cSupport.id, olga.id, ago(5 * HOUR), 'Здравствуйте, урок сократили, хочу понять, что с деньгами'),
    m(cSupport.id, 'support', ago(4 * HOUR - 50 * MIN), 'Здравствуйте, Ольга! Спор уже у нас. 2 200 ₽ заморожены, решим в течение 3 рабочих дней и напишем вам здесь.'),
  );
  cSupport.lastAt = ago(4 * HOUR - 50 * MIN);
  db.chats.push(cAnna, cIgor, cMaria, cDmitry, cSupport);
  db.messages.push(...msgs.map(x => ({ ...x, emailed: true })));

  db.complaints.push({ id: 'cp-1', byId: 'u-darya', againstId: igor.userId, chatId: 'c-igor', reason: 'Просит оплату вне TopRepet', createdAt: ago(DAY), status: 'open', blocked: false });

  /* ---------- notices ---------- */
  db.notices.push(
    { id: 'n-1', userId: olga.id, at: ago(20 * HOUR), icon: 'check', title: 'Анна подтвердила урок', text: `{t:${at(2, 19)}}. Списали 2 200 ₽ с карты •• 4417.`, to: '/my/lessons/l-next', read: false, tone: 'ok' },
    { id: 'n-2', userId: olga.id, at: ago(DAY), icon: 'inbox', title: 'Новый отклик на заявку', text: 'Мария Белова, 2 420 ₽ за 60 мин · 3 из 10', to: '/my/requests/rq-olga', read: false, tone: 'action' },
    { id: 'n-3', userId: anna.userId, at: ago(HOUR), icon: 'cal', title: 'Дмитрий: новая запись', text: 'Урок 60 мин, вы получите 2 000 ₽. Ответьте в течение 24 часов.', to: '/tutor/lessons/l-dmitry-pending', read: false, tone: 'action' },
    { id: 'n-4', userId: anna.userId, at: dispute.createdAt, icon: 'help', title: 'Ольга сообщила о проблеме', text: 'Урок сократили. Ответьте в течение 24 часов.', to: '/tutor/disputes/dp-1', read: false, tone: 'action' },
    { id: 'n-5', userId: anna.userId, at: ago(4 * DAY), icon: 'warn', title: 'Документ отклонён', text: 'IELTS.jpg: не видно имени и даты.', to: '/tutor/profile/documents', read: true, tone: 'bad' },
  );
  return db;
}

/* helpers that need the tutor's zone without importing the whole time module surface */
function dayKeyIn(ts: number, tz: string) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ts));
  return p;
}

/* the next given weekday (0 = Mon) at an hour in Moscow, at least a day ahead */
function nextWeekday(base: number, weekday: number, hour: number) {
  return base + nextDayOffset(base, weekday) * DAY + hour * HOUR;
}

function nextDayOffset(base: number, weekday: number) {
  const todayWd = (new Date(base + 3 * HOUR).getUTCDay() + 6) % 7;
  let diff = (weekday - todayWd + 7) % 7;
  if (diff < 2) diff += 7;
  return diff;
}
