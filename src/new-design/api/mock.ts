import { teachers } from '../../entities/teacher';
import { PRICE } from '../../shared/config/site';
import teacherPhotos from '../../shared/config/teacher-photos.json';
import { optimizeImage } from '../lib/images';
import { ApiError, type Api } from './contract';
import type {
  AdminProfile, Card, Conversation, Dispute, Id, Lesson, Message, Notification, PaymentRecord, PayoutSettings, Review,
  ScheduleException, StudyRequest, RequestResponse, Tutor, TutorDocument, TutorProfileDraft, User, WeekSchedule,
} from './types';
import { LESSON_MINUTES } from './types';

/**
 * Моковый бэкенд в браузере. Повторяет правила продукта, чтобы экраны вели себя как с настоящим сервером:
 * заморозка денег при записи, подтверждение репетитором, бесплатная отмена за 4 часа, одно знакомство на пару.
 * Состояние хранится в localStorage, сбросить: localStorage.removeItem('toprepet-mock').
 */

const KEY = 'toprepet-mock-v3';
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const FEE = 0.1;

/** Недельное расписание по умолчанию: будни вечером и суббота днём. Другие репетиторы в демо работают по нему же. */
const DEFAULT_WEEK: WeekSchedule = { days: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, intervals: weekday <= 5 ? [{ from: '17:00', to: '21:00' }] : weekday === 6 ? [{ from: '10:00', to: '14:00' }] : [] })) };
const EMPTY_WEEK: WeekSchedule = { days: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, intervals: [] })) };
const NO_PAYOUT: PayoutSettings = { inn: '', cardLast4: null, selfEmployedConfirmed: false };

function profileOf(t: Tutor): TutorProfileDraft {
  return {
    name: t.name, headline: t.headline, about: t.intro, approach: t.approach, subjects: t.subjects, levels: [], experience: t.experience, education: t.achievements,
    price: t.price, introMinutes: t.introMinutes, durations: [LESSON_MINUTES], photo: t.photo || null, status: t.status, slug: t.id,
  };
}

export const studentPriceOf = (price: number) => Math.round(price * (1 + FEE));

type Photos = Record<string, { src: string; srcSet: string }>;
const photos = teacherPhotos as Photos;

function seedTutors(): Tutor[] {
  return teachers.map((t, index) => ({
    id: t.id,
    name: t.name,
    photo: t.photo,
    photoSrcSet: photos[t.id]?.srcSet,
    headline: t.role,
    subjects: t.cardSubjects.split(' / '),
    cardSubjects: t.cardSubjects,
    helpTopics: [...t.helpTopics],
    experience: t.experience,
    intro: t.intro,
    approach: t.approach,
    achievements: t.achievements.map((a) => ({ ...a })),
    price: PRICE,
    studentPrice: studentPriceOf(PRICE),
    introMinutes: [20, 30, 15][index % 3],
    rating: null,
    reviewsCount: 0,
    status: 'published',
    timezone: 'Europe/Moscow',
    documentsVerified: true,
  }));
}

interface State {
  sessionUserId: Id | null;
  users: (User & { password: string })[];
  tutors: Tutor[];
  lessons: Lesson[];
  requests: StudyRequest[];
  responses: RequestResponse[];
  conversations: Conversation[];
  messages: Message[];
  cards: (Card & { userId: Id })[];
  payments: (PaymentRecord & { userId: Id })[];
  notifications: (Notification & { userId: Id })[];
  reviews: Review[];
  disputes: Dispute[];
  /** Данные кабинета репетитора хранятся по id анкеты. */
  weeks: Record<Id, WeekSchedule>;
  exceptions: Record<Id, ScheduleException[]>;
  documents: Record<Id, TutorDocument[]>;
  profiles: Record<Id, TutorProfileDraft>;
  payouts: Record<Id, PayoutSettings>;
  seq: number;
  /** Для какой почты запрошено письмо со сбросом пароля (в моке письма нет). */
  resetFor?: string | null;
}

const iso = (ms: number) => new Date(ms).toISOString();
/** Ровный час через n дней в hh:00 по локальному времени. */
const at = (days: number, hour: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
};

function seed(): State {
  const now = Date.now();
  const tutors = seedTutors();
  const anastasia = tutors[0];
  const student: User & { password: string } = { id: 'u-student', role: 'student', name: 'Ольга', email: 'olga@mail.ru', emailVerified: true, timezone: 'Europe/Moscow', onboarded: true, password: 'demo' };
  const tutor: User & { password: string } = { id: 'u-tutor', role: 'tutor', name: anastasia.name, email: 'anastasia@toprepet.ru', emailVerified: true, timezone: 'Europe/Moscow', tutorId: anastasia.id, onboarded: true, password: 'demo' };
  const admin: User & { password: string } = { id: 'u-admin', role: 'admin', name: 'Поддержка', email: 'admin@toprepet.ru', emailVerified: true, timezone: 'Europe/Moscow', onboarded: true, password: 'demo' };
  const lesson = (id: string, t: Tutor, start: number, status: Lesson['status'], extra: Partial<Lesson> = {}): Lesson => ({
    id, kind: 'regular', tutorId: t.id, tutorName: t.name, tutorPhoto: t.photo, studentId: student.id, studentName: student.name,
    subject: t.subjects[0], start: iso(start), durationMin: 60, status, price: t.studentPrice, tutorPrice: t.price,
    payment: status === 'pending' ? 'hold' : status === 'confirmed' ? 'captured' : status === 'completed' ? 'paid_out' : 'refunded',
    confirmBy: status === 'pending' ? iso(Math.min(start - 2 * HOUR, now + DAY)) : undefined,
    meetingUrl: null, moveProposal: null, reviewId: null, disputeId: null, seriesId: null, ...extra,
  });
  const lessons: Lesson[] = [
    lesson('l-1', anastasia, at(1, 19), 'confirmed', { meetingUrl: 'https://telemost.yandex.ru/' }),
    lesson('l-2', anastasia, at(3, 19), 'pending'),
    lesson('l-3', tutors[1], at(5, 17), 'confirmed', { kind: 'intro', price: 0, tutorPrice: 0, payment: 'none', durationMin: tutors[1].introMinutes, subject: tutors[1].subjects[0] }),
    lesson('l-4', anastasia, at(-2, 19), 'completed'),
    lesson('l-5', anastasia, at(-9, 19), 'completed', { reviewId: null }),
    lesson('l-7', anastasia, now - 3 * HOUR, 'completed', { payment: 'captured' }),
    lesson('l-6', tutors[5], at(-5, 16), 'cancelled', { cancelledBy: 'student', cancelReason: 'Заболел ребёнок', payment: 'refunded' }),
  ];
  const conv = (id: string, t: Tutor, last: string, unread: number, ago: number): Conversation => ({
    id, peerName: t.name, peerPhoto: t.photo, peerRole: 'tutor', lastMessage: last, updatedAt: iso(now - ago), unread, tutorId: t.id, studentId: student.id,
  });
  const conversations = [conv('c-1', anastasia, 'Отлично, тогда до четверга!', 1, 2 * HOUR), conv('c-2', tutors[1], 'Здравствуйте! Знакомство подтвердила.', 0, DAY)];
  const msg = (id: string, c: string, author: Id | null, text: string, ago: number, kind: Message['kind'] = 'text'): Message => ({ id, conversationId: c, authorId: author, kind, text, at: iso(now - ago) });
  const messages: Message[] = [
    msg('m-1', 'c-1', null, 'Ольга записалась на урок английского', 26 * HOUR, 'event'),
    msg('m-2', 'c-1', student.id, 'Здравствуйте! Хотим подтянуть грамматику перед контрольной.', 25 * HOUR),
    msg('m-3', 'c-1', tutor.id, 'Здравствуйте! Хорошо, начнём с повторения времён. Пришлите, пожалуйста, тему контрольной.', 24 * HOUR),
    msg('m-4', 'c-1', null, 'Анастасия подтвердила урок', 23 * HOUR, 'event'),
    msg('m-5', 'c-1', tutor.id, 'Отлично, тогда до четверга!', 2 * HOUR),
    msg('m-6', 'c-2', null, 'Ольга записалась на бесплатное знакомство', 30 * HOUR, 'event'),
    msg('m-7', 'c-2', tutors[1].id, 'Здравствуйте! Знакомство подтвердила.', DAY),
  ];
  const request: StudyRequest = {
    id: 'r-1', studentId: student.id, studentName: student.name, subject: 'Математика', goal: 'Подготовка к ОГЭ', level: '9 класс', budgetMax: 1800,
    schedule: ['Будни вечером'], description: 'Нужно подтянуть геометрию и вторую часть ОГЭ. Удобно 2 раза в неделю.', status: 'open',
    createdAt: iso(now - 2 * DAY), expiresAt: iso(now + 12 * DAY), responsesCount: 2,
  };
  const openRequests: StudyRequest[] = [
    request,
    { ...request, id: 'r-2', studentId: 'u-other', studentName: 'Ирина', subject: 'Английский язык', goal: 'Разговорный английский', level: 'Взрослый, A2', budgetMax: 2000, schedule: ['Выходные'], description: 'Хочу свободнее говорить на работе, нужна разговорная практика.', responsesCount: 1, createdAt: iso(now - DAY) },
    { ...request, id: 'r-3', studentId: 'u-other2', studentName: 'Сергей', subject: 'Английский язык', goal: 'Домашние задания', level: '6 класс', budgetMax: null, schedule: ['Будни днём'], description: 'Помогите сыну с домашними заданиями по английскому.', responsesCount: 0, createdAt: iso(now - 5 * HOUR) },
  ];
  const resp = (id: string, t: Tutor, message: string, ago: number): RequestResponse => ({
    id, requestId: 'r-1', tutorId: t.id, tutorName: t.name, tutorPhoto: t.photo, tutorRating: t.rating, price: t.studentPrice, message,
    slots: [iso(at(2, 18)), iso(at(4, 18))], status: 'sent', createdAt: iso(now - ago),
  });
  const ervan = tutors.find((t) => t.subjects.includes('Математика')) ?? tutors[0];
  const daria = tutors.find((t) => t.id.startsWith('physics')) ?? tutors[1];
  const responses = [
    resp('rr-1', ervan, 'Готовлю к ОГЭ третий год. Начнём с диагностики и составим план по геометрии.', 20 * HOUR),
    resp('rr-2', daria, 'Могу два раза в неделю вечером. Разберём вторую часть на примерах прошлых лет.', 6 * HOUR),
  ];
  const note = (id: string, userId: Id, kind: Notification['kind'], title: string, text: string, ago: number, link: string | null, read = false): Notification & { userId: Id } =>
    ({ id, userId, kind, title, text, at: iso(now - ago), read, link });
  return {
    sessionUserId: null,
    users: [student, tutor, admin],
    tutors,
    lessons,
    requests: openRequests,
    responses,
    conversations,
    messages,
    cards: [{ id: 'card-1', userId: student.id, brand: 'МИР', last4: '4417', primary: true }],
    payments: [
      { id: 'p-1', userId: student.id, lessonId: 'l-2', title: `Урок с ${anastasia.name}`, amount: anastasia.studentPrice, kind: 'hold', at: iso(now - 3 * HOUR), cardLast4: '4417' },
      { id: 'p-2', userId: student.id, lessonId: 'l-1', title: `Урок с ${anastasia.name}`, amount: anastasia.studentPrice, kind: 'charge', at: iso(now - DAY), cardLast4: '4417' },
      { id: 'p-3', userId: student.id, lessonId: 'l-6', title: `Урок с ${tutors[5].name}`, amount: tutors[5].studentPrice, kind: 'refund', at: iso(now - 5 * DAY), cardLast4: '4417' },
    ],
    notifications: [
      note('n-1', student.id, 'lesson', 'Урок подтверждён', `${anastasia.name} подтвердила урок`, 23 * HOUR, '/me/lessons/l-1'),
      note('n-2', student.id, 'request', 'Новый отклик на заявку', 'По заявке «Математика» откликнулись 2 репетитора', 6 * HOUR, '/me/requests/r-1'),
      note('n-3', student.id, 'message', 'Новое сообщение', `${anastasia.name}: Отлично, тогда до четверга!`, 2 * HOUR, '/me/chats/c-1'),
      note('n-4', tutor.id, 'lesson', 'Новая запись', 'Ольга записалась на урок. Подтвердите до срока.', 3 * HOUR, '/tutor/lessons/l-2'),
      note('n-5', tutor.id, 'request', 'Новая заявка по вашему предмету', 'Английский язык, разговорная практика', DAY, '/tutor/requests/r-2', true),
    ],
    reviews: [],
    disputes: [],
    weeks: { [anastasia.id]: structuredClone(DEFAULT_WEEK) },
    exceptions: {},
    documents: { [anastasia.id]: [{ id: 'd-1', title: 'Диплом бакалавра', status: 'approved' }, { id: 'd-2', title: 'Сертификат Cambridge FCE', status: 'checking' }] },
    profiles: { [anastasia.id]: profileOf(anastasia) },
    payouts: {},
    seq: 100,
  };
}

let state: State | null = null;
const hasStorage = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

function load(): State {
  if (state) return state;
  if (hasStorage()) {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        state = JSON.parse(raw) as State;
        // состояние из старых версий: у анкет нет отметки о проверке документов
        state.tutors = state.tutors.map((t) => ({ ...t, documentsVerified: t.documentsVerified ?? true }));
        return state;
      }
    } catch { /* повреждённые данные: начинаем заново */ }
  }
  state = seed();
  return state;
}
function save() {
  if (!hasStorage() || !state) return;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* приватный режим */ }
}

const delay = <T>(value: T, ms = 220): Promise<T> => new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), ms));
const nextId = (prefix: string) => { const s = load(); s.seq += 1; return `${prefix}-${s.seq}`; };
const fail = (message: string, status = 400): never => { throw new ApiError(message, status); };
const adminUserId = () => load().users.find((u) => u.role === 'admin')?.id;

function me(): User & { password: string } {
  const s = load();
  const user = s.users.find((u) => u.id === s.sessionUserId);
  if (!user) fail('Войдите, чтобы продолжить', 401);
  return user as User & { password: string };
}
const publicUser = (u: User & { password?: string }): User => { const { password: _p, ...rest } = u; return rest; };
const myTutor = () => { const u = me(); const t = load().tutors.find((x) => x.id === u.tutorId); if (!t) fail('Анкета не найдена', 404); return t as Tutor; };
const findLesson = (id: Id) => { const l = load().lessons.find((x) => x.id === id); if (!l) fail('Урок не найден', 404); return l as Lesson; };
/** Урок глазами текущего пользователя: ученик не видит цену репетитора, репетитор — цену ученика (как у сервера). */
const viewOf = (l: Lesson): Lesson => {
  const s = load(); const u = s.users.find((x) => x.id === s.sessionUserId);
  if (u?.role === 'student') return { ...l, tutorPrice: l.price };
  if (u?.role === 'tutor') return { ...l, price: l.tutorPrice };
  return l;
};
const canSee = (l: Lesson) => { const u = me(); if (u.role === 'admin') return; if (l.studentId !== u.id && l.tutorId !== u.tutorId) fail('Нет доступа', 403); };
const notify = (userId: Id, n: Omit<Notification, 'id' | 'at' | 'read'>) => { load().notifications.unshift({ ...n, id: nextId('n'), at: iso(Date.now()), read: false, userId }); };
/** Короткая запись уведомления; пустой адресат (репетитора нет в демо) пропускаем. */
const note = (userId: Id | undefined, kind: Notification['kind'], title: string, text: string, link: string | null) => { if (userId) notify(userId, { kind, title, text, link }); };
const tutorUserId = (tutorId: Id) => load().users.find((u) => u.tutorId === tutorId)?.id;
const systemMessage = (tutorId: Id, studentId: Id, text: string) => {
  const s = load();
  const c = s.conversations.find((x) => x.tutorId === tutorId && x.studentId === studentId);
  if (!c) return;
  s.messages.push({ id: nextId('m'), conversationId: c.id, authorId: null, kind: 'event', text, at: iso(Date.now()) });
  c.lastMessage = text; c.updatedAt = iso(Date.now());
};
/** Обычное сообщение от имени участника диалога (отклик на заявку, запись по отклику). Диалог создаётся, если его ещё нет. */
const directMessage = (tutorId: Id, studentId: Id, authorId: Id | undefined, text: string, card?: Message['card']) => {
  const s = load();
  let c = s.conversations.find((x) => x.tutorId === tutorId && x.studentId === studentId);
  if (!c) {
    const t = s.tutors.find((x) => x.id === tutorId); if (!t) return;
    c = { id: nextId('c'), peerName: (t as Tutor).name, peerPhoto: (t as Tutor).photo, peerRole: 'tutor', lastMessage: '', updatedAt: iso(Date.now()), unread: 0, tutorId, studentId };
    s.conversations.unshift(c);
  }
  s.messages.push({ id: nextId('m'), conversationId: c.id, authorId: authorId ?? null, kind: 'text', text, at: iso(Date.now()), read: false, ...(card ? { card } : {}) });
  c.lastMessage = text; c.updatedAt = iso(Date.now());
  if (authorId && authorId !== studentId) c.unread += 1;
};
const CONTACTS_MESSAGE = 'Телефоны, ссылки и мессенджеры в сообщениях запрещены: общайтесь и платите внутри TopRepet, так мы сможем помочь, если что-то пойдёт не так.';
/** Мягкая проверка на обмен контактами. Жёсткую проверку делает сервер. */
const hasContacts = (text: string) => /(?:\+?\d[\s().-]*){10,}/.test(text) || /https?:\/\/|\bt\.me\/|\bwa\.me\/|(?:^|\s)@[a-z0-9_]{3,}|\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/i.test(text);
const withExpiry = (r: StudyRequest): StudyRequest => (r.status === 'open' && new Date(r.expiresAt).getTime() < Date.now() ? { ...r, status: 'expired' } : r);
/** Диалог глазами текущего пользователя: репетитор видит имя ученика, ученик — репетитора. */
const peerView = (c: Conversation): Conversation => {
  const u = me();
  return u.role === 'tutor' ? { ...c, peerName: load().users.find((x) => x.id === c.studentId)?.name ?? 'Ученик', peerPhoto: null, peerRole: 'student' } : c;
};
const myConversation = (id: Id): Conversation => {
  const u = me(); const c = load().conversations.find((x) => x.id === id);
  const mine = c && (u.role === 'student' ? c.studentId === u.id : u.role === 'tutor' ? c.tutorId === u.tutorId : true);
  if (!c || !mine) fail('Диалог не найден', 404);
  return c as Conversation;
};
const norm = (v: string) => v.trim().toLocaleLowerCase('ru').replaceAll('ё', 'е');

function slotsFor(tutor: Tutor, fromMs: number, days: number) {
  const s = load();
  const busy = new Set(s.lessons.filter((l) => l.tutorId === tutor.id && ['pending', 'confirmed'].includes(l.status)).map((l) => new Date(l.start).getTime()));
  const out: { start: string; available: boolean }[] = [];
  const base = new Date(fromMs); base.setHours(0, 0, 0, 0);
  for (let d = 0; d < days; d += 1) {
    const day = new Date(base.getTime() + d * DAY);
    const weekday = ((day.getDay() + 6) % 7) + 1;
    const rule = (s.weeks[tutor.id] ?? DEFAULT_WEEK).days.find((x) => x.weekday === weekday);
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    const exception = (s.exceptions[tutor.id] ?? []).find((x) => x.date === key);
    if (exception?.kind === 'off') continue;
    const intervals = [...(rule?.intervals ?? []), ...(exception?.kind === 'extra' ? exception.intervals : [])];
    for (const interval of intervals) {
      const [fh] = interval.from.split(':').map(Number);
      const [th] = interval.to.split(':').map(Number);
      for (let h = fh; h < th; h += 1) {
        const t = new Date(day); t.setHours(h, 0, 0, 0);
        const ms = t.getTime();
        // у каждого репетитора своя «занятость», чтобы расписания отличались
        const taken = (t.getDate() * 7 + h + tutor.id.length) % 5 === 0;
        out.push({ start: iso(ms), available: ms > Date.now() + 2 * HOUR && !busy.has(ms) && !taken });
      }
    }
  }
  // интервалы могут пересекаться (обычное время и «другое время» в один день): один час показываем один раз
  const unique = new Map<string, { start: string; available: boolean }>();
  for (const slot of out.sort((a, b) => a.start.localeCompare(b.start))) if (!unique.has(slot.start)) unique.set(slot.start, slot);
  return [...unique.values()];
}

function chargeOrRefund(l: Lesson, kind: PaymentRecord['kind']) {
  if (l.price === 0) return;
  const s = load();
  const card = s.cards.find((c) => c.userId === l.studentId && c.primary);
  s.payments.unshift({ id: nextId('p'), userId: l.studentId, lessonId: l.id, title: `${l.kind === 'intro' ? 'Знакомство' : 'Урок'} с ${l.tutorName}`, amount: l.price, kind, at: iso(Date.now()), cardLast4: card?.last4 ?? '••••' });
}

export function createMockApi(): Api {
  return {
    mode: 'mock',
    async me() { const s = load(); const u = s.users.find((x) => x.id === s.sessionUserId); return delay(u ? publicUser(u) : null, 60); },
    async login(email, password) {
      const s = load();
      const u = s.users.find((x) => x.email === email.trim().toLowerCase());
      if (!u || (u.password !== password && password !== 'demo')) fail('Неверная почта или пароль');
      s.sessionUserId = (u as User).id; save();
      return delay(publicUser(u as User));
    },
    async loginWithYandex() { const s = load(); s.sessionUserId = 'u-student'; save(); return delay(publicUser(me())); },
    async signup({ role, name, email, password }) {
      const s = load();
      if (s.users.some((u) => u.email === email.trim().toLowerCase())) fail('Аккаунт с этой почтой уже есть. Войдите или восстановите пароль.');
      const user = { id: nextId('u'), role, name: name.trim(), email: email.trim().toLowerCase(), emailVerified: false, timezone: 'Europe/Moscow', onboarded: false, password } as User & { password: string };
      if (role === 'tutor') {
        const tutorId = nextId('t');
        user.tutorId = tutorId;
        const draft: Tutor = { id: tutorId, name: user.name, photo: '', headline: '', subjects: [], cardSubjects: '', helpTopics: [], experience: '', intro: '', approach: '', achievements: [], price: 0, studentPrice: 0, introMinutes: 0, rating: null, reviewsCount: 0, status: 'draft', timezone: 'Europe/Moscow' };
        s.tutors.push(draft); s.weeks[tutorId] = structuredClone(EMPTY_WEEK); s.profiles[tutorId] = profileOf(draft);
      }
      s.users.push(user); s.sessionUserId = user.id; save();
      return delay(publicUser(user));
    },
    async logout() { load().sessionUserId = null; save(); return delay(undefined); },
    async requestPasswordReset(email) {
      if (!email.includes('@')) fail('Проверьте адрес почты');
      const s = load(); const known = s.users.some((u) => u.email === email.trim().toLowerCase());
      s.resetFor = known ? email.trim().toLowerCase() : null; save(); // как у сервера: ответ одинаковый, есть ли такая почта или нет
      return delay(undefined, 400);
    },
    async confirmPasswordReset(token, password) {
      // в моке подходит любой непустой токен после запроса письма; на сервере токен одноразовый, живёт два часа
      const s = load(); const user = s.users.find((u) => u.email === s.resetFor);
      if (!token.trim() || !user) fail('Ссылка устарела. Запросите письмо ещё раз.');
      if (password.length < 8) fail('Пароль должен быть не короче 8 символов');
      (user as User & { password: string }).password = password; s.resetFor = null; save(); return delay(undefined, 300);
    },
    async resendVerification() { me(); return delay(undefined); },
    async verifyEmail(token) {
      // в моке подходит любой непустой токен; на сервере токен одноразовый и привязан к пользователю
      if (!token.trim()) fail('Ссылка устарела. Запросите письмо ещё раз.');
      const u = me(); u.emailVerified = true; save(); return delay(publicUser(u));
    },
    async completeOnboarding() { const u = me(); u.onboarded = true; save(); return delay(publicUser(u)); },
    async updateMe(input) { const u = me(); Object.assign(u, input); save(); return delay(publicUser(u)); },
    async uploadMyPhoto(file) {
      const u = me();
      if (!file.type.startsWith('image/')) fail('Нужна картинка: JPG, PNG или WebP.');
      file = await optimizeImage(file);
      u.photo = await new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(typeof r.result === 'string' ? r.result : ''); r.onerror = () => reject(new ApiError('Не удалось прочитать файл')); r.readAsDataURL(file); });
      save();
      return delay(publicUser(u), 300);
    },
    async changePassword(input) {
      const u = me();
      if (u.password !== input.current) fail('Текущий пароль указан неверно');
      if (input.password.length < 8) fail('Пароль должен быть не короче 8 символов');
      u.password = input.password; save();
      return delay(undefined);
    },

    async listTutors(filter) {
      const s = load();
      const query = filter.query ? norm(filter.query) : '';
      let items = s.tutors.filter((t) => t.status === 'published')
        .filter((t) => !filter.subject || t.helpTopics.includes(filter.subject) || t.subjects.some((x) => filter.subject?.startsWith(x)))
        .filter((t) => !filter.priceMax || t.studentPrice <= filter.priceMax)
        .filter((t) => !filter.priceMin || t.studentPrice >= filter.priceMin)
        .filter((t) => !filter.hasIntro || t.introMinutes > 0)
        .filter((t) => !query || norm([t.name, t.headline, t.cardSubjects, ...t.helpTopics, t.intro].join(' ')).includes(query));
      if (filter.sort === 'price_asc') items = [...items].sort((a, b) => a.studentPrice - b.studentPrice);
      if (filter.sort === 'price_desc') items = [...items].sort((a, b) => b.studentPrice - a.studentPrice);
      const total = items.length;
      const start = filter.cursor ? Number(filter.cursor) : 0;
      const limit = filter.limit ?? 8;
      items = items.slice(start, start + limit);
      return delay({ items, total, nextCursor: start + limit < total ? String(start + limit) : null });
    },
    async getTutor(id) { const t = load().tutors.find((x) => x.id === id); if (!t) fail('Анкета не найдена', 404); return delay(t as Tutor); },
    async getTutorSlots(id, from, days) { const t = load().tutors.find((x) => x.id === id); if (!t) fail('Анкета не найдена', 404); return delay(slotsFor(t as Tutor, new Date(from).getTime(), days)); },
    async getTutorReviews(id) { return delay(load().reviews.filter((r) => r.tutorId === id && r.status === 'published')); },

    async createBooking(input) {
      const s = load(); const u = me();
      if (u.role !== 'student') fail('Записываться могут только ученики');
      const t = s.tutors.find((x) => x.id === input.tutorId); if (!t) fail('Анкета не найдена', 404);
      const tutor = t as Tutor;
      const slot = slotsFor(tutor, new Date(input.start).getTime(), 1).find((x) => x.start === input.start);
      if (!slot?.available) fail('Это время уже занято. Выберите другое.');
      if (input.kind === 'intro') {
        if (!tutor.introMinutes) fail('У этого репетитора нет бесплатного знакомства');
        if (s.lessons.some((l) => l.kind === 'intro' && l.tutorId === tutor.id && l.studentId === u.id && !['declined', 'expired', 'cancelled'].includes(l.status)))
          fail('Бесплатное знакомство с этим репетитором уже было');
      } else if (!s.cards.some((c) => c.userId === u.id)) fail('Добавьте карту, чтобы записаться', 402);
      const startMs = new Date(input.start).getTime();
      const price = input.kind === 'intro' ? 0 : Math.round(tutor.studentPrice * input.durationMin / 60);
      const lesson: Lesson = {
        id: nextId('l'), kind: input.kind, tutorId: tutor.id, tutorName: tutor.name, tutorPhoto: tutor.photo, studentId: u.id, studentName: u.name, studentPhoto: u.photo ?? null,
        subject: input.subject, start: input.start, durationMin: input.kind === 'intro' ? tutor.introMinutes : input.durationMin, status: 'pending',
        price, tutorPrice: input.kind === 'intro' ? 0 : Math.round(tutor.price * input.durationMin / 60), payment: price ? 'hold' : 'none',
        confirmBy: iso(Math.min(startMs - 2 * HOUR, Date.now() + DAY)), meetingUrl: null, moveProposal: null, reviewId: null, disputeId: null, seriesId: null,
      };
      s.lessons.push(lesson);
      chargeOrRefund(lesson, 'hold');
      if (input.requestId) {
        const request = s.requests.find((x) => x.id === input.requestId && x.studentId === u.id);
        if (request && request.status === 'open') {
          request.status = 'booked';
          s.responses.filter((x) => x.requestId === request.id).forEach((x) => { x.status = x.tutorId === tutor.id ? 'accepted' : 'closed'; });
          directMessage(tutor.id, u.id, u.id, `Выбрала ваш отклик на заявку «${request.subject}» и записалась на урок.`);
        }
      }
      let c = s.conversations.find((x) => x.tutorId === tutor.id && x.studentId === u.id);
      if (!c) { c = { id: nextId('c'), peerName: tutor.name, peerPhoto: tutor.photo, peerRole: 'tutor', lastMessage: '', updatedAt: iso(Date.now()), unread: 0, tutorId: tutor.id, studentId: u.id }; s.conversations.unshift(c); }
      systemMessage(tutor.id, u.id, `${u.name} записалась на ${lesson.kind === 'intro' ? 'бесплатное знакомство' : 'урок'}`);
      const tuid = tutorUserId(tutor.id);
      if (tuid) notify(tuid, { kind: 'lesson', title: 'Новая запись', text: `${u.name} записалась. Подтвердите запись.`, link: `/tutor/lessons/${lesson.id}` });
      save();
      return delay(viewOf(lesson), 500);
    },
    async listLessons(scope) {
      const u = me(); const now = Date.now();
      const mine = load().lessons.filter((l) => (u.role === 'student' ? l.studentId === u.id : l.tutorId === u.tutorId));
      const active = (l: Lesson) => ['pending', 'confirmed'].includes(l.status) && new Date(l.start).getTime() + l.durationMin * 60_000 > now;
      const list = mine.filter((l) => (scope === 'upcoming' ? active(l) : !active(l)));
      list.sort((a, b) => (scope === 'upcoming' ? 1 : -1) * (new Date(a.start).getTime() - new Date(b.start).getTime()));
      return delay(list.map(viewOf));
    },
    async getLesson(id) { const l = findLesson(id); canSee(l); return delay(viewOf(l)); },
    async cancelLesson(id, reason) {
      const l = findLesson(id); canSee(l); const u = me();
      if (!['pending', 'confirmed'].includes(l.status)) fail('Этот урок уже нельзя отменить');
      const late = new Date(l.start).getTime() - Date.now() < 4 * HOUR;
      l.status = 'cancelled'; l.cancelReason = reason; l.cancelledBy = u.role;
      const refund = u.role === 'tutor' || !late || l.payment === 'hold';
      l.payment = l.price === 0 ? 'none' : refund ? 'refunded' : 'captured';
      if (refund) chargeOrRefund(l, 'refund');
      systemMessage(l.tutorId, l.studentId, `${u.name} отменил${u.role === 'student' ? 'а' : 'а'} урок`);
      const other = u.role === 'student' ? tutorUserId(l.tutorId) : l.studentId;
      if (other) notify(other, { kind: 'lesson', title: 'Урок отменён', text: reason, link: u.role === 'student' ? `/tutor/lessons/${l.id}` : `/me/lessons/${l.id}` });
      save(); return delay(viewOf(l));
    },
    async proposeMove(id, start) {
      const l = findLesson(id); canSee(l); const u = me();
      if (l.status !== 'confirmed' && l.status !== 'pending') fail('Перенести можно только предстоящий урок');
      l.moveProposal = { start, by: u.role }; save(); return delay(viewOf(l));
    },
    async answerMove(id, accept) {
      const l = findLesson(id); canSee(l);
      if (!l.moveProposal) fail('Нет предложения о переносе');
      if (accept) l.start = (l.moveProposal as { start: string }).start;
      l.moveProposal = null; save(); return delay(viewOf(l));
    },
    async confirmLesson(id) {
      const l = findLesson(id); canSee(l); const u = me();
      if (u.role !== 'tutor') fail('Подтверждает запись репетитор');
      if (l.status !== 'pending') fail('Запись уже обработана');
      l.status = 'confirmed'; if (l.price) { l.payment = 'captured'; chargeOrRefund(l, 'charge'); }
      l.meetingUrl = 'https://telemost.yandex.ru/';
      systemMessage(l.tutorId, l.studentId, `${l.tutorName} подтвердила ${l.kind === 'intro' ? 'знакомство' : 'урок'}`);
      notify(l.studentId, { kind: 'lesson', title: 'Запись подтверждена', text: `${l.tutorName} подтвердила запись`, link: `/me/lessons/${l.id}` });
      save(); return delay(viewOf(l));
    },
    async declineLesson(id, reason) {
      const l = findLesson(id); canSee(l);
      if (l.status !== 'pending') fail('Запись уже обработана');
      l.status = 'declined'; l.declineReason = reason; if (l.price) { l.payment = 'refunded'; chargeOrRefund(l, 'release'); }
      notify(l.studentId, { kind: 'lesson', title: 'Запись отклонена', text: reason, link: `/me/lessons/${l.id}` });
      save(); return delay(viewOf(l));
    },
    async markLessonResult(id, result) {
      const l = findLesson(id); canSee(l);
      l.status = result === 'happened' ? 'completed' : result;
      if (result === 'no_show_tutor' && l.price) { l.payment = 'refunded'; chargeOrRefund(l, 'refund'); }
      save(); return delay(viewOf(l));
    },
    async reportProblem({ lessonId, reason, text }) {
      const l = findLesson(lessonId); canSee(l);
      if (Date.now() - new Date(l.start).getTime() > DAY + l.durationMin * 60_000) fail('Сообщить о проблеме можно в течение 24 часов после начала урока');
      const d: Dispute = { id: nextId('dp'), lessonId, reason, text, status: 'open', createdAt: iso(Date.now()), tutorReply: null, resolution: null };
      load().disputes.push(d); l.status = 'disputed'; l.disputeId = d.id;
      note(tutorUserId(l.tutorId), 'lesson', 'Ученик сообщил о проблеме', `Урок ${l.subject}: ${reason}. Ответьте, чтобы поддержка разобралась.`, `/tutor/disputes/${d.id}`);
      note(adminUserId(), 'lesson', 'Новый спор', `${l.studentName} и ${l.tutorName}: ${reason}`, `/admin/disputes`);
      save(); return delay(d);
    },
    async getDispute(id) { const d = load().disputes.find((x) => x.id === id); if (!d) fail('Спор не найден', 404); return delay(d as Dispute); },
    async replyDispute(id, text) { const d = load().disputes.find((x) => x.id === id); if (!d) fail('Спор не найден', 404); (d as Dispute).tutorReply = text; (d as Dispute).status = 'tutor_replied';
      const l = load().lessons.find((x) => x.id === (d as Dispute).lessonId);
      note(l?.studentId, 'lesson', 'Репетитор ответил по спору', 'Поддержка рассмотрит ответ и сообщит решение.', `/me/disputes/${id}`);
      note(adminUserId(), 'lesson', 'Репетитор ответил по спору', l ? `${l.studentName} и ${l.tutorName}` : '', `/admin/disputes`);
      save(); return delay(d as Dispute); },

    async createReview(lessonId, rating, text) {
      const l = findLesson(lessonId); const u = me();
      if (l.studentId !== u.id) fail('Отзыв оставляет ученик');
      if (l.status !== 'completed' || l.kind !== 'regular') fail('Отзыв можно оставить после оплаченного урока');
      if (l.reviewId) fail('Отзыв уже оставлен');
      const r: Review = { id: nextId('rv'), lessonId, tutorId: l.tutorId, authorName: u.name, authorNote: l.subject, rating, text, status: 'pending', createdAt: iso(Date.now()), reply: null };
      load().reviews.push(r); l.reviewId = r.id;
      note(adminUserId(), 'review', 'Отзыв ждёт проверки', `${u.name} о ${l.tutorName}, оценка ${rating}`, '/admin/reviews');
      save(); return delay(r);
    },
    async getReview(id) { const r = load().reviews.find((x) => x.id === id); if (!r) fail('Отзыв не найден', 404); return delay(r as Review); },
    async listMyReviews() { const u = me(); return delay(load().reviews.filter((r) => r.tutorId === u.tutorId)); },
    async replyReview(id, text) { const r = load().reviews.find((x) => x.id === id); if (!r) fail('Отзыв не найден', 404); (r as Review).reply = text;
      const l = load().lessons.find((x) => x.id === (r as Review).lessonId);
      note(l?.studentId, 'review', 'Репетитор ответил на отзыв', `${l?.tutorName ?? 'Репетитор'} ответил на ваш отзыв.`, `/teachers/${(r as Review).tutorId}`);
      save(); return delay(r as Review); },

    async listMyRequests() { const u = me(); return delay(load().requests.filter((r) => r.studentId === u.id).map(withExpiry)); },
    async createRequest(input) {
      const u = me();
      const custom = input.customSubject.trim();
      if (!input.subjects.length && !custom) fail('Выберите предмет или напишите свой');
      if (!input.description.trim()) fail('Опишите задачу');
      const { subjects, customSubject: _c, ...rest } = input;
      const r: StudyRequest = { ...rest, subject: [...subjects, ...(custom ? [custom] : [])].join(', '), subjects, customSubject: custom, id: nextId('r'), studentId: u.id, studentName: u.name, studentPhoto: u.photo ?? null, status: 'open', createdAt: iso(Date.now()), expiresAt: iso(Date.now() + 14 * DAY), responsesCount: 0 };
      load().requests.unshift(r); save(); return delay(r, 400);
    },
    async getRequest(id) {
      const u = me(); const r = load().requests.find((x) => x.id === id);
      if (!r || (u.role === 'student' && r.studentId !== u.id)) fail('Заявка не найдена', 404);
      return delay(withExpiry(r as StudyRequest));
    },
    async closeRequest(id) {
      const u = me(); const r = load().requests.find((x) => x.id === id);
      if (!r || r.studentId !== u.id) fail('Заявка не найдена', 404);
      if ((r as StudyRequest).status !== 'open') fail('Заявка уже закрыта');
      (r as StudyRequest).status = 'closed'; save(); return delay(r as StudyRequest);
    },
    async listResponses(requestId) {
      const u = me(); const r = load().requests.find((x) => x.id === requestId);
      if (!r || r.studentId !== u.id) fail('Заявка не найдена', 404);
      return delay(load().responses.filter((x) => x.requestId === requestId));
    },
    async listOpenRequests(subject) {
      // лента только для вошедших; репетитор видит заявки по предметам своей анкеты; имя ученика сокращено
      const s = load(); const u = s.users.find((x) => x.id === s.sessionUserId);
      if (!u) throw new ApiError('Войдите, чтобы продолжить', 401);
      const mine = u.role === 'tutor' ? myTutor().subjects : null;
      const listOf = (r: StudyRequest) => (r.subjects?.length ? r.subjects : [r.subject]);
      // заявку со своим предметом видят все репетиторы, остальные — по предметам анкеты
      const fits = (r: StudyRequest) => !mine || Boolean(r.customSubject) || listOf(r).some((name) => mine.some((x) => name.startsWith(x)));
      return delay(s.requests.map(withExpiry).filter((r) => r.status === 'open' && fits(r) && (!subject || listOf(r).includes(subject))).map((r) => ({ ...r, studentName: r.studentName.split(' ')[0] })));
    },
    async respondToRequest(requestId, input) {
      const t = myTutor(); const s = load();
      const r = s.requests.find((x) => x.id === requestId); if (!r) fail('Заявка не найдена', 404);
      if (t.status !== 'published') fail('Опубликуйте анкету, чтобы откликаться на заявки');
      if (withExpiry(r as StudyRequest).status !== 'open') fail('Заявка уже закрыта');
      if (!input.message.trim()) fail('Напишите ученику сообщение');
      if (hasContacts(input.message)) fail(CONTACTS_MESSAGE);
      if (!Number.isInteger(input.price) || input.price < 300) fail('Укажите цену от 300 ₽');
      if (s.responses.some((x) => x.requestId === requestId && x.tutorId === t.id)) fail('Вы уже откликнулись на эту заявку');
      const resp: RequestResponse = { id: nextId('rr'), requestId, tutorId: t.id, tutorName: t.name, tutorPhoto: t.photo, tutorRating: t.rating, price: studentPriceOf(input.price), message: input.message, slots: input.slots, status: 'sent', createdAt: iso(Date.now()) };
      s.responses.push(resp); (r as StudyRequest).responsesCount += 1;
      const when = (v: string) => new Date(v).toLocaleString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
      directMessage(t.id, (r as StudyRequest).studentId, tutorUserId(t.id), `Отклик на заявку «${(r as StudyRequest).subject}»`, {
        title: 'Отклик на заявку',
        rows: [['Заявка', (r as StudyRequest).subject], ['Цена за урок', `${resp.price} ₽`], ...(input.slots.length ? [['Удобное время', input.slots.map(when).join('\n')] as [string, string]] : []), ['Сообщение', input.message.trim()]],
      });
      notify((r as StudyRequest).studentId, { kind: 'request', title: 'Новый отклик на заявку', text: `${t.name} откликнулась на заявку`, link: `/me/requests/${requestId}` });
      save(); return delay(resp);
    },
    async listMyResponses() {
      const t = myTutor(); const s = load();
      return delay(s.responses.filter((x) => x.tutorId === t.id).map((x) => ({ ...x, request: s.requests.find((r) => r.id === x.requestId) as StudyRequest })));
    },

    async listConversations() { const u = me(); return delay(load().conversations.filter((c) => (u.role === 'student' ? c.studentId === u.id : c.tutorId === u.tutorId)).sort((x, y) => y.updatedAt.localeCompare(x.updatedAt)).map(peerView)); },
    async openConversation(tutorId) {
      const u = me(); const s = load();
      let c = s.conversations.find((x) => x.tutorId === tutorId && x.studentId === u.id);
      if (!c) { const t = s.tutors.find((x) => x.id === tutorId); if (!t) fail('Анкета не найдена', 404); c = { id: nextId('c'), peerName: (t as Tutor).name, peerPhoto: (t as Tutor).photo, peerRole: 'tutor', lastMessage: '', updatedAt: iso(Date.now()), unread: 0, tutorId, studentId: u.id }; s.conversations.unshift(c); save(); }
      return delay(c);
    },
    async getConversation(id) { return delay(peerView(myConversation(id))); },
    async listMessages(id) {
      const s = load(); const c = myConversation(id); const uid = me().id; c.unread = 0;
      const list = s.messages.filter((m) => m.conversationId === id);
      for (const m of list) if (m.authorId !== uid) m.read = true; // собеседник прочитал бы мои сообщения так же
      save();
      return delay(list.map((m) => ({ ...m, read: m.authorId === uid ? Boolean(m.read) : true })));
    },
    async sendMessage(id, text) {
      const u = me(); const s = load();
      const c = myConversation(id);
      if (c.blocked) fail('Диалог заблокирован: писать в него нельзя');
      if (!text.trim()) fail('Напишите сообщение');
      if (hasContacts(text)) fail(CONTACTS_MESSAGE);
      const m: Message = { id: nextId('m'), conversationId: id, authorId: u.id, kind: 'text', text: text.trim(), at: iso(Date.now()), read: false };
      s.messages.push(m); (c as Conversation).lastMessage = m.text; (c as Conversation).updatedAt = m.at; save();
      return delay(m, 150);
    },
    async sendPhoto(id, file, caption) {
      const u = me(); const s = load();
      const c = myConversation(id);
      if (c.blocked) fail('Диалог заблокирован: писать в него нельзя');
      if (!file.type.startsWith('image/')) fail('Нужна картинка: JPG, PNG или WebP.');
      const text = (caption ?? '').trim();
      if (text && hasContacts(text)) fail(CONTACTS_MESSAGE);
      file = await optimizeImage(file);
      const imageUrl = await new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(typeof r.result === 'string' ? r.result : ''); r.onerror = () => reject(new ApiError('Не удалось прочитать файл')); r.readAsDataURL(file); });
      const m: Message = { id: nextId('m'), conversationId: id, authorId: u.id, kind: 'photo', text, at: iso(Date.now()), read: false, imageUrl };
      s.messages.push(m); (c as Conversation).lastMessage = text || 'Фото'; (c as Conversation).updatedAt = m.at; save();
      return delay(m, 200);
    },
    async deleteMessage(id, messageId) {
      const s = load(); const c = myConversation(id); const uid = me().id;
      const m = s.messages.find((x) => x.id === messageId && x.conversationId === id);
      if (!m || m.authorId !== uid || m.kind === 'event') fail('Можно удалить только своё сообщение');
      s.messages = s.messages.filter((x) => x.id !== messageId);
      const last = s.messages.filter((x) => x.conversationId === id && x.kind !== 'event').at(-1);
      (c as Conversation).lastMessage = last ? (last.text || 'Фото') : '';
      save(); return delay(undefined);
    },
    async reportConversation(id, reason, block) {
      const c = myConversation(id); if (!reason.trim()) fail('Выберите причину жалобы');
      if (block) c.blocked = true;
      save(); return delay(undefined);
    },

    async listPayments() { const u = me(); return delay(load().payments.filter((p) => p.userId === u.id)); },
    async listCards() { const u = me(); return delay(load().cards.filter((c) => c.userId === u.id)); },
    async addCard({ number }) {
      const u = me(); const digits = number.replace(/\D/g, '');
      if (digits.length < 16) fail('Проверьте номер карты');
      const s = load(); const card = { id: nextId('card'), userId: u.id, brand: digits.startsWith('2') ? 'МИР' : digits.startsWith('4') ? 'Visa' : 'Карта', last4: digits.slice(-4), primary: !s.cards.some((c) => c.userId === u.id) };
      s.cards.push(card); save(); return delay(card, 500);
    },
    async removeCard(id) { const s = load(); s.cards = s.cards.filter((c) => c.id !== id); save(); return delay(undefined); },
    async getFinance() {
      const t = myTutor(); const ls = load().lessons.filter((l) => l.tutorId === t.id && l.tutorPrice > 0);
      const entries = ls.map((l) => ({ id: l.id, title: `${l.studentName}, ${l.subject}`, amount: l.tutorPrice, status: (l.payment === 'paid_out' ? 'paid' : l.payment === 'hold' ? 'held' : 'pending') as 'paid' | 'held' | 'pending', at: l.start }));
      return delay({ available: entries.filter((e) => e.status === 'pending' && ['completed'].includes(ls.find((l) => l.id === e.id)?.status ?? '')).reduce((a, e) => a + e.amount, 0), pending: entries.filter((e) => e.status !== 'paid').reduce((a, e) => a + e.amount, 0), paidThisMonth: entries.filter((e) => e.status === 'paid').reduce((a, e) => a + e.amount, 0), entries });
    },
    async getPayoutSettings() { const t = myTutor(); return delay(load().payouts[t.id] ?? NO_PAYOUT); },
    async savePayoutSettings({ inn, cardNumber }) {
      const t = myTutor(); if (!/^\d{12}$/.test(inn)) fail('ИНН самозанятого — 12 цифр');
      const digits = cardNumber.replace(/\D/g, ''); if (digits.length < 16) fail('Проверьте номер карты');
      const s = load(); s.payouts[t.id] = { inn, cardLast4: digits.slice(-4), selfEmployedConfirmed: true }; save(); return delay(s.payouts[t.id]);
    },

    async listNotifications() { const u = me(); return delay(load().notifications.filter((n) => n.userId === u.id)); },
    async markNotificationsRead() { const u = me(); load().notifications.forEach((n) => { if (n.userId === u.id) n.read = true; }); save(); return delay(undefined); },

    async getMyProfile() { const t = myTutor(); return delay(load().profiles[t.id] ?? profileOf(t)); },
    async saveMyProfile(patch) {
      const t = myTutor(); const s = load();
      const p = { ...(s.profiles[t.id] ?? profileOf(t)), ...patch, status: (s.profiles[t.id] ?? profileOf(t)).status, slug: t.id };
      s.profiles[t.id] = p;
      Object.assign(t, { name: p.name, headline: p.headline, intro: p.about, approach: p.approach, price: p.price, studentPrice: studentPriceOf(p.price), introMinutes: p.introMinutes, achievements: p.education, experience: p.experience, subjects: p.subjects, cardSubjects: p.subjects.join(' / '), helpTopics: p.subjects, photo: p.photo ?? '', photoSrcSet: undefined });
      save(); return delay(p);
    },
    async submitMyProfile() {
      const t = myTutor(); const s = load(); const p = s.profiles[t.id] ?? profileOf(t);
      if (!p.name.trim() || !p.about.trim() || !p.subjects.length || !p.price) fail('Заполните имя, описание, предметы и цену');
      if (!(s.weeks[t.id] ?? DEFAULT_WEEK).days.some((d) => d.intervals.length)) fail('Откройте хотя бы одно время для записи в расписании');
      // уже опубликованная анкета правится без повторной проверки (на сервере решает поддержка); новая уходит на модерацию
      const next = t.status === 'published' ? 'published' : 'review';
      p.status = next; t.status = next; p.moderationNote = null; s.profiles[t.id] = p;
      if (next === 'review') note(adminUserId(), 'system', 'Анкета ждёт проверки', `${p.name || 'Репетитор'} отправил анкету`, '/admin/profiles');
      const u = me(); u.onboarded = true;
      save(); return delay(p, 500);
    },
    async uploadPhoto(file) {
      myTutor();
      if (!file.type.startsWith('image/')) fail('Нужна картинка: JPG, PNG или WebP.');
      file = await optimizeImage(file);
      const url = await new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(typeof r.result === 'string' ? r.result : ''); r.onerror = () => reject(new ApiError('Не удалось прочитать файл')); r.readAsDataURL(file); });
      return delay({ url }, 400);
    },
    async getWeek() { const t = myTutor(); return delay(load().weeks[t.id] ?? EMPTY_WEEK); },
    async saveWeek(week) { const t = myTutor(); const s = load(); s.weeks[t.id] = week; save(); return delay(week); },
    async listExceptions() { const t = myTutor(); return delay(load().exceptions[t.id] ?? []); },
    async saveException(item) { const t = myTutor(); const s = load(); s.exceptions[t.id] = [...(s.exceptions[t.id] ?? []).filter((x) => x.date !== item.date), item].sort((a, b) => a.date.localeCompare(b.date)); save(); return delay(s.exceptions[t.id]); },
    async deleteException(date) { const t = myTutor(); const s = load(); s.exceptions[t.id] = (s.exceptions[t.id] ?? []).filter((x) => x.date !== date); save(); return delay(s.exceptions[t.id]); },
    async listDocuments() { const t = myTutor(); return delay(load().documents[t.id] ?? []); },
    async uploadDocument(title) { const t = myTutor(); const s = load(); const d: TutorDocument = { id: nextId('d'), title, status: 'checking' }; s.documents[t.id] = [...(s.documents[t.id] ?? []), d]; save(); return delay(d, 600); },
    async listMyStudents() {
      const t = myTutor(); const byStudent = new Map<string, Lesson[]>();
      load().lessons.filter((l) => l.tutorId === t.id).forEach((l) => byStudent.set(l.studentId, [...(byStudent.get(l.studentId) ?? []), l]));
      return delay([...byStudent.entries()].map(([id, ls]) => ({ id, name: ls[0].studentName, note: ls[0].subject, lessonsCount: ls.filter((l) => l.status === 'completed').length, nextLesson: ls.filter((l) => new Date(l.start).getTime() > Date.now() && ['pending', 'confirmed'].includes(l.status)).map((l) => l.start).sort()[0] ?? null })));
    },
    async listMyTutors() {
      const u = me(); const byTutor = new Map<string, Lesson[]>();
      load().lessons.filter((l) => l.studentId === u.id).forEach((l) => byTutor.set(l.tutorId, [...(byTutor.get(l.tutorId) ?? []), l]));
      return delay([...byTutor.entries()].map(([tutorId, ls]) => ({ tutorId, name: ls[0].tutorName, photo: ls[0].tutorPhoto, subject: ls[0].subject, lessonsCount: ls.filter((l) => l.status === 'completed').length, lastLesson: ls.filter((l) => l.status === 'completed').map((l) => l.start).sort().at(-1) ?? null })));
    },

    async adminCancellations() {
      return delay(load().lessons.filter((l) => l.status === 'cancelled').map((l) => ({ lessonId: l.id, tutorName: l.tutorName, studentName: l.studentName, by: l.cancelledBy ?? 'student', reason: l.cancelReason ?? '', at: l.start, late: l.payment === 'captured' })));
    },
    async adminDisputes() { const s = load(); return delay(s.disputes.map((d) => ({ ...d, lesson: s.lessons.find((l) => l.id === d.lessonId) as Lesson }))); },
    async adminResolveDispute(id, outcome) {
      const s = load(); const d = s.disputes.find((x) => x.id === id); if (!d) fail('Спор не найден', 404);
      const dispute = d as Dispute; dispute.status = outcome === 'refund' ? 'resolved_refund' : 'resolved_paid';
      dispute.resolution = outcome === 'refund' ? 'Деньги вернули ученику' : 'Оплата ушла репетитору';
      const l = s.lessons.find((x) => x.id === dispute.lessonId); if (l) { l.payment = outcome === 'refund' ? 'refunded' : 'paid_out'; if (outcome === 'refund') chargeOrRefund(l, 'refund'); }
      if (l) { note(l.studentId, 'payment', 'Спор решён', dispute.resolution, `/me/disputes/${id}`); note(tutorUserId(l.tutorId), 'payment', 'Спор решён', dispute.resolution, `/tutor/disputes/${id}`); }
      save(); return delay(dispute);
    },
    async adminReviewQueue() { return delay(load().reviews.filter((r) => r.status === 'pending')); },
    async adminModerateReview(id, approve) {
      const s = load(); const r = s.reviews.find((x) => x.id === id); if (!r) fail('Отзыв не найден', 404);
      const review = r as Review; review.status = approve ? 'published' : 'rejected';
      if (approve) { const t = s.tutors.find((x) => x.id === review.tutorId); if (t) { const all = s.reviews.filter((x) => x.tutorId === t.id && x.status === 'published'); t.reviewsCount = all.length; t.rating = Math.round((all.reduce((a, x) => a + x.rating, 0) / all.length) * 10) / 10; } }
      const lesson = s.lessons.find((x) => x.id === review.lessonId);
      note(lesson?.studentId, 'review', approve ? 'Отзыв опубликован' : 'Отзыв не прошёл проверку', approve ? `Спасибо! Ваш отзыв о ${review.tutorId ? lesson?.tutorName : ''} виден в анкете.` : 'Он нарушает правила публикации.', approve ? `/teachers/${review.tutorId}` : null);
      if (approve) note(tutorUserId(review.tutorId), 'review', 'Новый отзыв', `${review.authorName}: оценка ${review.rating}`, '/tutor/reviews');
      save(); return delay(review);
    },
    async adminProfileQueue() {
      const s = load();
      return delay(s.tutors.filter((t) => t.status === 'review').map((t): AdminProfile => ({ tutorId: t.id, email: s.users.find((u) => u.tutorId === t.id)?.email ?? '', submittedAt: iso(Date.now()), profile: s.profiles[t.id] ?? profileOf(t) })));
    },
    async adminModerateProfile(tutorId, approve, comment) {
      const s = load(); const t = s.tutors.find((x) => x.id === tutorId); if (!t) fail('Анкета не найдена', 404);
      const tutor = t as Tutor; const p = s.profiles[tutor.id] ?? profileOf(tutor);
      if (tutor.status !== 'review') fail('Анкета не на проверке');
      if (!approve && !comment?.trim()) fail('Напишите, что нужно исправить');
      tutor.status = approve ? 'published' : 'draft'; p.status = tutor.status; p.moderationNote = approve ? null : comment?.trim(); s.profiles[tutor.id] = p;
      note(tutorUserId(tutor.id), 'system', approve ? 'Анкета опубликована' : 'Анкету нужно доработать', approve ? 'Теперь ученики видят вас в каталоге.' : (comment ?? ''), '/tutor/profile');
      save(); return delay(p);
    },
  };
}

/** Данные для пререндера каталога и анкет: синхронно, без ожидания. */
export const staticTutors = (): Tutor[] => seedTutors();
