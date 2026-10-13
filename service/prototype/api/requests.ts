import type { Db, ID, LessonRequest, RequestResponse, TutorProfile } from './types';
import { getDb, mutate } from './store';
import { chatEvent, fail, firstNameOf, mustTutor, notify, sendEmail, userById } from './core';
import { requireRole } from './auth';
import { isListed, priceFrom } from './tutors';
import { coversBucket, slotAvailable } from './schedule';
import { REQUEST_DAYS, REQUEST_RESPONSES, tokenTime as T } from './rules';
import { TIME_BUCKETS, shortSubject } from './catalog';
import { studentPrice, fmtMoney } from '../lib/money';
import { slugify, uid } from '../lib/text';
import { DAY, now } from '../lib/time';

export type RequestDraft = Omit<LessonRequest, 'id' | 'slug' | 'studentId' | 'status' | 'createdAt' | 'responseLimit' | 'title'> & { title?: string };

export function requestTitle(r: Pick<LessonRequest, 'subject' | 'goal' | 'forChild' | 'childAge' | 'direction'>) {
  const subj = r.subject.replace(/ язык$/, '');
  const goal = r.goal.trim();
  const short = goal.length <= 34 ? goal : '';
  if (/собесед/i.test(goal)) return `${subj} для собеседования`;
  if (/ЕГЭ/.test(goal) || r.direction === 'ОГЭ и ЕГЭ') return `${/ОГЭ/.test(goal) ? 'ОГЭ' : 'ЕГЭ'} по ${subj.toLowerCase()}${r.childAge ? `, ${r.childAge}` : ''}`;
  if (r.forChild && r.childAge) return `${subj}, ${r.childAge}`;
  return short && short.length > 3 ? `${subj}: ${short[0].toLowerCase()}${short.slice(1)}` : `${subj}, ${r.direction.toLowerCase()}`;
}

export function validateRequest(r: Partial<RequestDraft>, step: 1 | 2) {
  const e: Record<string, string> = {};
  if (step >= 1) {
    if (!r.direction) e.direction = 'Выберите, какая помощь нужна';
    if (!r.subject) e.subject = 'Выберите предмет';
    if (!r.level) e.level = 'Выберите уровень';
    if (!r.goal || r.goal.trim().length < 5) e.goal = 'Опишите цель хотя бы парой слов';
    if (r.forChild && !r.childAge?.trim()) e.childAge = 'Укажите класс или возраст';
  }
  if (step >= 2) {
    if (!r.format) e.format = 'Выберите формат';
    if (!r.times?.length) e.times = 'Отметьте хотя бы одно удобное время';
    if (!r.frequency) e.frequency = 'Выберите, как часто';
  }
  return e;
}

/* ---------- student ---------- */
export function publishRequest(draft: RequestDraft, editId?: ID): LessonRequest {
  const me = requireRole('student');
  const errors = validateRequest(draft, 2);
  if (Object.keys(errors).length) fail(Object.values(errors)[0], 'validation', errors);
  return mutate(d => {
    const at = now();
    const title = draft.title?.trim() || requestTitle(draft);
    if (editId) {
      const i = d.requests.findIndex(r => r.id === editId && r.studentId === me.id);
      if (i < 0) fail('Заявка не найдена');
      d.requests[i] = { ...d.requests[i], ...draft, title };
      return d.requests[i];
    }
    let slug = slugify(title) || 'zayavka';
    if (d.requests.some(r => r.slug === slug)) slug = `${slug}-${d.requests.length + 1}`;
    const req: LessonRequest = {
      ...draft,
      title,
      id: uid('rq'),
      slug,
      studentId: me.id,
      status: 'active',
      createdAt: at,
      publishedAt: at,
      expiresAt: at + REQUEST_DAYS * DAY,
      responseLimit: REQUEST_RESPONSES,
    };
    d.requests.push(req);
    // notify tutors whose profile matches
    for (const t of d.tutors) if (isListed(t) && matches(d, t, req)) {
      notify(d, t.userId, { icon: 'inbox', title: 'Новая подходящая заявка', text: `${title}${req.budget ? `, до ${fmtMoney(req.budget)}` : ''}`, to: `/tutor/requests/${req.id}`, tone: 'action' }, at);
    }
    return req;
  });
}

function patchRequest(id: ID, fn: (r: LessonRequest) => Partial<LessonRequest>) {
  const me = requireRole('student');
  return mutate(d => {
    const i = d.requests.findIndex(r => r.id === id);
    if (i < 0 || d.requests[i].studentId !== me.id) fail('Заявка не найдена');
    d.requests[i] = { ...d.requests[i], ...fn(d.requests[i]) };
    return d.requests[i];
  });
}

export const pauseRequest = (id: ID) => patchRequest(id, r => (r.status === 'active' ? { status: 'paused' } : fail('Заявка не активна')));
export const resumeRequest = (id: ID) => patchRequest(id, r => (r.status === 'paused' ? { status: 'active' } : fail('Заявка не на паузе')));
export const closeRequest = (id: ID) => patchRequest(id, () => ({ status: 'closed', closedAt: now(), closedReason: 'student' }));
export const extendRequest = (id: ID) => patchRequest(id, r => ({ status: r.status === 'expired' || r.status === 'active' ? 'active' : r.status, expiresAt: Math.max(now(), r.expiresAt ?? now()) + REQUEST_DAYS * DAY, expiryAsked: false }));
export const moreResponses = (id: ID) => patchRequest(id, r => ({ responseLimit: r.responseLimit + REQUEST_RESPONSES, status: r.status === 'hidden' ? 'active' : r.status }));

export function viewResponses(requestId: ID) {
  const me = requireRole('student');
  const d0 = getDb();
  if (!d0.responses.some(r => r.requestId === requestId && r.status === 'sent')) return;
  mutate(d => {
    d.responses.forEach((r, i) => {
      if (r.requestId === requestId && r.status === 'sent' && d.requests.find(q => q.id === requestId)?.studentId === me.id) d.responses[i] = { ...r, status: 'viewed' };
    });
  });
}

export function declineResponse(responseId: ID) {
  const me = requireRole('student');
  mutate(d => {
    const i = d.responses.findIndex(r => r.id === responseId);
    if (i < 0) fail('Отклик не найден');
    const req = d.requests.find(q => q.id === d.responses[i].requestId);
    if (!req || req.studentId !== me.id) return fail('Это не ваша заявка');
    d.responses[i] = { ...d.responses[i], status: 'declined' };
    notify(d, d.responses[i].tutorId, { icon: 'doc', title: 'Отклик отклонён', text: `По заявке «${req.title}». Спасибо — новые заявки уже ждут вас.`, to: '/tutor/responses' });
  });
}

/* ---------- tutor ---------- */
export function matches(d: Db, t: TutorProfile, r: LessonRequest) {
  if (!t.subjects.some(s => s.subject === r.subject)) return false;
  const price = t.prices.filter(p => p.subject === r.subject && p.minutes === 60).map(p => p.price)[0] ?? priceFrom(t);
  if (r.budget && price && studentPrice(price) > r.budget) return false;
  if (r.format === 'offline' && !t.formats.atHome && !t.formats.atStudent) return false;
  if (r.format === 'online' && !t.formats.online) return false;
  const buckets = TIME_BUCKETS.filter(b => r.times.includes(b.id));
  if (buckets.length && !buckets.some(b => coversBucket(t, b))) return false;
  void d;
  return true;
}

export const responseCount = (d: Db, requestId: ID) => d.responses.filter(r => r.requestId === requestId).length;

export function visibleToTutors(r: LessonRequest, at = now()) {
  return r.status === 'active' && (r.expiresAt ?? 0) > at;
}

export function respond(requestId: ID, message: string, price: number, slots: number[]): RequestResponse {
  const me = requireRole('tutor');
  const d0 = getDb();
  const req = d0.requests.find(r => r.id === requestId) ?? fail('Заявка не найдена');
  const t = mustTutor(d0, me.id);
  if (!t.published) fail('Опубликуйте анкету, чтобы откликаться на заявки');
  if (!visibleToTutors(req)) fail('Заявка уже не принимает отклики');
  if (d0.responses.some(r => r.requestId === requestId && r.tutorId === me.id)) fail('Вы уже откликнулись на эту заявку');
  if (responseCount(d0, requestId) >= req.responseLimit) fail('У заявки уже 10 откликов');
  if (message.trim().length < 20) fail('Напишите сообщение ученику: хотя бы пару предложений', 'validation');
  if (message.length > 1000) fail('Сообщение длиннее 1000 символов', 'validation');
  if (price < 300) fail('Укажите цену за 60 минут', 'validation');
  if (slots.length < 3 || slots.length > 5) fail('Предложите от 3 до 5 окон', 'validation');
  for (const s of slots) if (!slotAvailable(d0, t, s, { minutes: 60, ignoreHorizon: true })) fail('Одно из окон уже занято, выберите другое');
  return mutate(d => {
    const at = now();
    const resp: RequestResponse = { id: uid('rsp'), requestId, tutorId: me.id, message: message.trim(), price, slots: [...slots].sort((a, b) => a - b), createdAt: at, status: 'sent' };
    d.responses.push(resp);
    const count = d.responses.filter(r => r.requestId === requestId).length;
    if (count >= req.responseLimit) {
      const i = d.requests.findIndex(r => r.id === requestId);
      d.requests[i] = { ...d.requests[i], status: 'hidden' };
    }
    chatEvent(d, req.studentId, me.id, {
      icon: 'doc',
      text: `${firstNameOf(d, me.id)} откликнулся(ась) на заявку «${req.title}»`,
      action: { label: 'Открыть отклик', to: `/my/requests/${req.id}` },
      tutor: { text: `Ваш отклик на заявку «${req.title}»`, action: { label: 'Открыть отклик', to: '/tutor/responses' } },
    }, at);
    // the response text opens the conversation
    const chat = d.chats.find(c => c.kind === 'pair' && c.studentId === req.studentId && c.tutorId === me.id)!;
    d.messages.push({ id: uid('m'), chatId: chat.id, authorId: me.id, kind: 'text', text: resp.message, createdAt: at + 1 });
    notify(d, req.studentId, { icon: 'inbox', title: 'Новый отклик на заявку', text: `${t.name}, ${fmtMoney(studentPrice(price))} за 60 мин · ${count} из ${req.responseLimit}`, to: `/my/requests/${req.id}`, tone: 'action' }, at);
    sendEmail(d, req.studentId, {
      subject: `Новый отклик: ${t.name}`,
      title: `${t.name} откликнулся(ась) на заявку`,
      body: `«${req.title}». Цена для вас ${fmtMoney(studentPrice(price))} за 60 минут, предложено ${slots.length} окна. Записаться можно прямо из отклика.`,
      action: { label: 'Посмотреть отклик', to: `/my/requests/${req.id}` },
    }, at);
    return resp;
  });
}

export function tutorResponses(tutorId: ID) {
  return getDb().responses.filter(r => r.tutorId === tutorId).sort((a, b) => b.createdAt - a.createdAt);
}

export const fmtBudget = (b: number | null) => (b ? `до ${fmtMoney(b)}` : 'не важно');
export const fmtTimes = (times: LessonRequest['times']) => TIME_BUCKETS.filter(b => times.includes(b.id)).map(b => b.label.toLowerCase()).join(', ');
export const requestWho = (d: Db, r: LessonRequest) => (r.forChild ? `Для ребёнка${r.childAge ? `, ${r.childAge}` : ''}` : `${userById(d, r.studentId)?.name.split(' ')[0] ?? 'Ученик'}, взрослый`);
export const subjectLabel = (r: LessonRequest) => shortSubject(r.subject);
export { T };
