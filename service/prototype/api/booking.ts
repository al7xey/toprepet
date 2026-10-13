import type { Db, ID, Lesson, Participant, Payment, Series, Transfer, User } from './types';
import { getDb, mutate } from './store';
import { ApiError, chatEvent, displayName, fail, firstNameOf, lessonById, mustLesson, mustTutor, nextNumber, notify, sendEmail, tutorById, userById } from './core';
import { requireRole, requireUser } from './auth';
import { isListed } from './tutors';
import { fitsOpenHours, slotAvailable } from './schedule';
import { authorize, cardBrand, chargeSaved, PaymentDeclined, validateCard, type MethodInput } from './gateway';
import {
  ACTIVE, CONFIRM_HOURS, DISPUTE_ANSWER_HOURS, FREE_CANCEL_HOURS, PROMO_CODES, RESERVE_MIN, addBusinessDays, answerUntil, canCancelFree, confirmDeadline, noShowFrom, tokenTime as T,
} from './rules';
import { fmtMoney, studentPrice } from '../lib/money';
import { uid } from '../lib/text';
import { DAY, HOUR, MIN, fmtDayTime, now, zoned, zonedToUtc } from '../lib/time';

/* ---------- prices ---------- */
export interface Quote {
  tutorPrice: number;
  studentPrice: number;
  discount: number;
  total: number;
  promo?: string;
}

export function quote(tutorPrice: number, promo?: string, user?: User | null): Quote {
  const sp = studentPrice(tutorPrice);
  const code = promo?.trim().toLocaleUpperCase('ru-RU');
  let discount = 0;
  if (code) {
    if (!(code in PROMO_CODES)) fail('Такого промокода нет', 'promo');
    if (user?.promoUsed.includes(code)) fail('Этот промокод вы уже использовали', 'promo');
    discount = Math.min(PROMO_CODES[code], sp);
  }
  return { tutorPrice, studentPrice: sp, discount, total: sp - discount, promo: discount ? code : undefined };
}

export function tutorPriceFor(tutorId: ID, subject: string, minutes: number) {
  const t = mustTutor(getDb(), tutorId);
  const p = t.prices.find(x => x.subject === subject && x.minutes === minutes);
  return p?.price ?? fail('У репетитора нет цены для этого предмета и длительности');
}

/* ---------- payment helpers ---------- */
function resolveMethod(d: Db, me: User, m: MethodInput): { method: Payment['method']; save?: { last4: string; brand: ReturnType<typeof cardBrand> } } {
  if (m.kind === 'sbp') return { method: { kind: 'sbp' } };
  if (m.kind === 'saved') {
    const card = me.cards.find(c => c.id === m.cardId) ?? fail('Карта не найдена');
    return { method: { kind: 'card', last4: card.last4, brand: card.brand, cardId: card.id } };
  }
  const errors = validateCard(m.card);
  if (Object.keys(errors).length) fail(Object.values(errors)[0]!, 'card', errors);
  const digits = m.card.number.replace(/\D/g, '');
  const last4 = digits.slice(-4);
  const brand = cardBrand(digits);
  void d;
  return { method: { kind: 'card', last4, brand }, save: m.save ? { last4, brand } : undefined };
}

function addPayment(d: Db, studentId: ID, lessonId: ID, amount: number, method: Payment['method'], status: Payment['status'], at = now()): Payment {
  const p: Payment = {
    id: uid('p'),
    studentId,
    lessonId,
    amount,
    method,
    status,
    refunded: 0,
    events: [{ at, type: status === 'held' ? 'hold' : 'charge', amount }],
    createdAt: at,
  };
  d.payments.push(p);
  return p;
}

function paymentOp(d: Db, paymentId: ID | undefined, op: 'charge' | 'release' | 'refund', amount?: number, note?: string, at = now()) {
  if (!paymentId) return;
  const i = d.payments.findIndex(p => p.id === paymentId);
  if (i < 0) return;
  const p = d.payments[i];
  if (op === 'charge') d.payments[i] = { ...p, status: 'charged', events: [...p.events, { at, type: 'charge', amount: p.amount, note }] };
  if (op === 'release') d.payments[i] = { ...p, status: 'released', events: [...p.events, { at, type: 'release', amount: p.amount, note }] };
  if (op === 'refund') {
    const value = Math.min(amount ?? p.amount, p.amount - p.refunded);
    const refunded = p.refunded + value;
    d.payments[i] = { ...p, refunded, status: refunded >= p.amount ? 'refunded' : 'partial_refund', events: [...p.events, { at, type: 'refund', amount: value, note }] };
  }
}

function transferFor(d: Db, lessonId: ID) {
  return d.transfers.findIndex(t => t.lessonId === lessonId);
}

function setTransfer(d: Db, l: Lesson, changes: Partial<Transfer>) {
  const i = transferFor(d, l.id);
  if (i >= 0) d.transfers[i] = { ...d.transfers[i], ...changes };
  else if (changes.status && changes.status !== 'cancelled') {
    d.transfers.push({ id: uid('tr'), tutorId: l.tutorId, lessonId: l.id, amount: l.tutorPrice, status: 'waiting', dueAt: l.end + DAY, ...changes });
  }
}

function patchLesson(d: Db, id: ID, changes: Partial<Lesson>) {
  const i = d.lessons.findIndex(l => l.id === id);
  if (i < 0) fail('Урок не найден');
  d.lessons[i] = { ...d.lessons[i], ...changes };
  return d.lessons[i];
}

const lessonTitle = (l: Lesson) => (l.kind === 'intro' ? 'знакомство' : 'урок');

/* ---------- booking ---------- */
export interface BookInput {
  tutorId: ID;
  start: number;
  minutes: number;
  subject: string;
  kind: 'lesson' | 'intro';
  participant: Participant;
  comment?: string;
  method?: MethodInput;
  promo?: string;
  responseId?: ID;
}

export function participantFor(me: User, who: string | null | undefined): Participant {
  if (who && who !== 'self') {
    const c = me.children.find(x => x.id === who);
    if (c) return { kind: 'child', childId: c.id, name: c.name, age: c.age };
  }
  return { kind: 'self', name: me.name.split(' ')[0] };
}

export function myReservation(tutorId: ID, start: number) {
  const me = requireUser();
  return getDb().reservations.find(r => r.tutorId === tutorId && r.studentId === me.id && r.start === start && r.expiresAt > now());
}

export function bookLesson(input: BookInput): Lesson {
  const me = requireRole('student');
  const d0 = getDb();
  const tutor = mustTutor(d0, input.tutorId);
  if (!isListed(tutor) && !input.responseId) fail('Анкета репетитора сейчас скрыта, запись недоступна');
  if (me.blocked.includes(tutor.userId) || userById(d0, tutor.userId)?.blocked.includes(me.id)) fail('Запись недоступна: переписка заблокирована');

  const response = input.responseId ? d0.responses.find(r => r.id === input.responseId) : undefined;
  let tutorPrice = 0;
  if (input.kind === 'intro') {
    if (!tutor.intro.enabled) fail('Репетитор не проводит бесплатное знакомство');
    const had = d0.lessons.some(l => l.kind === 'intro' && l.studentId === me.id && l.tutorId === tutor.userId && ['pending', 'confirmed', 'completed', 'no_show', 'disputed'].includes(l.status));
    if (had) fail('Бесплатное знакомство с этим репетитором уже было. Запишитесь на урок.');
  } else if (response) {
    tutorPrice = Math.round((response.price * input.minutes) / 60);
  } else {
    tutorPrice = tutorPriceFor(tutor.userId, input.subject, input.minutes);
  }

  const minutes = input.kind === 'intro' ? tutor.intro.minutes : input.minutes;
  const fromResponse = response?.slots.includes(input.start);
  const ok = slotAvailable(d0, tutor, input.start, { minutes, forStudentId: me.id, ignoreHorizon: !!fromResponse, ignoreNotice: !!fromResponse && input.start > now() + 2 * HOUR });
  if (!ok) fail('Это время уже занято. Выберите другое окно.', 'slot');

  const q = input.kind === 'intro' ? { tutorPrice: 0, studentPrice: 0, discount: 0, total: 0, promo: undefined } : quote(tutorPrice, input.promo, me);

  let method: Payment['method'] | undefined;
  let save: { last4: string; brand: ReturnType<typeof cardBrand> } | undefined;
  if (q.total > 0) {
    if (!input.method) fail('Выберите способ оплаты', 'method');
    ({ method, save } = resolveMethod(d0, me, input.method!));
    try {
      if (method.kind === 'card') authorize(method.last4);
    } catch (e) {
      if (e instanceof PaymentDeclined) {
        const expiresAt = now() + RESERVE_MIN * MIN;
        mutate(d => {
          d.reservations = d.reservations.filter(r => !(r.studentId === me.id && r.tutorId === tutor.userId));
          d.reservations.push({ id: uid('rs'), tutorId: tutor.userId, studentId: me.id, start: input.start, minutes, expiresAt });
        });
        throw new ApiError(e.message, 'payment', { expiresAt });
      }
      throw e;
    }
  }

  return mutate(d => {
    const at = now();
    const lessonId = uid('l');
    let paymentId: ID | undefined;
    if (method && q.total > 0) paymentId = addPayment(d, me.id, lessonId, q.total, method, 'held', at).id;
    const lesson: Lesson = {
      id: lessonId,
      number: 1000 + nextNumber(d),
      kind: input.kind,
      studentId: me.id,
      tutorId: tutor.userId,
      participant: input.participant,
      subject: input.subject,
      minutes,
      start: input.start,
      end: input.start + minutes * MIN,
      status: 'pending',
      tutorPrice: q.tutorPrice,
      studentPrice: q.studentPrice,
      discount: q.discount,
      comment: input.comment?.trim() || undefined,
      createdAt: at,
      confirmDeadline: confirmDeadline(at, input.start),
      paymentId,
      requestId: response?.requestId,
      responseId: response?.id,
      reminders: {},
    };
    d.lessons.push(lesson);
    d.reservations = d.reservations.filter(r => !(r.studentId === me.id && r.tutorId === tutor.userId));

    const ui = d.users.findIndex(u => u.id === me.id);
    let meNext = d.users[ui];
    if (save && !meNext.cards.some(c => c.last4 === save!.last4)) meNext = { ...meNext, cards: [...meNext.cards, { id: uid('card'), last4: save.last4, brand: save.brand }] };
    if (q.promo) meNext = { ...meNext, promoUsed: [...meNext.promoUsed, q.promo] };
    d.users[ui] = meNext;

    const who = input.participant.kind === 'child' ? `${input.participant.name}${input.participant.age ? `, ${input.participant.age}` : ''}` : me.name.split(' ')[0];
    chatEvent(d, me.id, tutor.userId, {
      icon: 'cal',
      text: input.kind === 'intro' ? `Вы записались на знакомство ${T(input.start)}` : `Вы записались на ${T(input.start)}`,
      sub: input.kind === 'intro' ? 'Бесплатно, ждём подтверждения' : `${fmtMoney(q.total)} заморожены до подтверждения`,
      tutor: {
        text: `${who} ${input.kind === 'intro' ? 'хочет познакомиться' : 'записался(ась) на урок'} ${T(input.start)}`,
        sub: `Подтвердите до ${T(lesson.confirmDeadline)}`,
        action: { label: 'Ответить', to: `/tutor/lessons/${lessonId}`, tone: 'tinted' },
      },
    }, at);
    notify(d, tutor.userId, {
      icon: input.kind === 'intro' ? 'gift' : 'cal',
      title: input.kind === 'intro' ? `${who}: знакомство` : `${who}: новая запись`,
      text: input.kind === 'intro' ? `${minutes} мин, бесплатно. Ответьте до ${T(lesson.confirmDeadline)}.` : `Урок ${minutes} мин, вы получите ${fmtMoney(q.tutorPrice)}. Ответьте до ${T(lesson.confirmDeadline)}.`,
      to: `/tutor/lessons/${lessonId}`,
      tone: 'action',
    }, at);
    sendEmail(d, tutor.userId, {
      subject: `Новая запись: ${who}`,
      title: `${who} ${input.kind === 'intro' ? 'хочет познакомиться' : 'записался(ась) к вам'}`,
      body: `${fmtDayTime(input.start, tutor.tz)} по вашему времени, ${minutes} мин. Подтвердите в течение ${CONFIRM_HOURS} часов, иначе запись отменится сама.`,
      action: { label: 'Ответить на запись', to: `/tutor/lessons/${lessonId}` },
    }, at);

    if (response) closeRequestAfterBooking(d, response.requestId, tutor.userId, response.id, at);
    return lesson;
  });
}

function closeRequestAfterBooking(d: Db, requestId: ID, tutorId: ID, responseId: ID, at: number) {
  const ri = d.requests.findIndex(r => r.id === requestId);
  if (ri < 0) return;
  const req = d.requests[ri];
  d.requests[ri] = { ...req, status: 'closed', closedAt: at, closedReason: 'booked', bookedTutorId: tutorId };
  d.responses.forEach((r, i) => {
    if (r.requestId !== requestId) return;
    if (r.id === responseId) d.responses[i] = { ...r, status: 'booked' };
    else if (r.status !== 'declined') {
      d.responses[i] = { ...r, status: 'other' };
      notify(d, r.tutorId, {
        icon: 'doc',
        title: 'Ученик выбрал другого преподавателя',
        text: `По заявке «${req.title}». Спасибо за отклик — новые заявки уже ждут вас.`,
        to: '/tutor/requests',
      }, at);
    }
  });
  notify(d, req.studentId, { icon: 'check', title: 'Заявка закрыта', text: `«${req.title}»: вы записались, остальным откликнувшимся мы вежливо сообщили.`, to: '/my/requests', tone: 'ok' }, at);
}

/* ---------- tutor answers ---------- */
export function confirmLesson(lessonId: ID) {
  const me = requireRole('tutor');
  const l = mustLesson(getDb(), lessonId);
  if (l.tutorId !== me.id) fail('Это не ваш урок');
  if (l.seriesId && getDb().series.find(s => s.id === l.seriesId)?.status === 'pending') return confirmSeries(l.seriesId!);
  if (l.status !== 'pending') fail('Запись уже обработана');
  if (now() > l.confirmDeadline) fail('Срок подтверждения прошёл, запись отменилась');
  mutate(d => {
    const at = now();
    const next = patchLesson(d, l.id, { status: 'confirmed', confirmedAt: at });
    paymentOp(d, l.paymentId, 'charge', undefined, 'Репетитор подтвердил', at);
    if (l.tutorPrice > 0) setTransfer(d, next, { status: 'waiting', dueAt: l.end + DAY });
    const student = userById(d, l.studentId)!;
    chatEvent(d, l.studentId, l.tutorId, {
      icon: 'check',
      text: `${firstNameOf(d, l.tutorId)} подтвердил(а) ${lessonTitle(l)} ${T(l.start)}`,
      sub: l.paymentId ? `${fmtMoney(l.studentPrice - l.discount)} списаны` : undefined,
      action: { label: 'Открыть урок', to: `/my/lessons/${l.id}` },
      tutor: { text: `Вы подтвердили ${lessonTitle(l)} ${T(l.start)}`, sub: l.tutorPrice ? `Вы получите ${fmtMoney(l.tutorPrice)} после урока` : undefined, action: { label: 'Открыть урок', to: `/tutor/lessons/${l.id}` } },
    }, at);
    notify(d, l.studentId, {
      icon: 'check',
      title: `${firstNameOf(d, l.tutorId)} подтвердил(а) ${lessonTitle(l)}`,
      text: `${T(l.start)}.${l.paymentId ? ` Списали ${fmtMoney(l.studentPrice - l.discount)}.` : ''} Письмо отправили на ${student.email}.`,
      to: `/my/lessons/${l.id}`,
      tone: 'ok',
    }, at);
    sendEmail(d, l.studentId, {
      subject: `${displayName(d, l.tutorId)} подтвердил(а) ${lessonTitle(l)}`,
      title: `${lessonTitle(l)[0].toUpperCase() + lessonTitle(l).slice(1)} подтверждён`,
      body: `${fmtDayTime(l.start, student.tz)}, ${l.minutes} мин. Ссылку на звонок репетитор пришлёт перед началом.`,
      action: { label: 'Открыть урок', to: `/my/lessons/${l.id}` },
    }, at);
  });
}

export function declineLesson(lessonId: ID, reason: string, message: string, proposals: number[]) {
  const me = requireRole('tutor');
  const l = mustLesson(getDb(), lessonId);
  if (l.tutorId !== me.id) fail('Это не ваш урок');
  if (l.status !== 'pending') fail('Запись уже обработана');
  if (!reason) fail('Выберите причину');
  if (l.seriesId) return declineSeries(l.seriesId, message || reason);
  mutate(d => {
    const at = now();
    patchLesson(d, l.id, { status: 'declined', decline: { reason, message: message.trim(), proposals, at } });
    paymentOp(d, l.paymentId, 'release', undefined, 'Репетитор отклонил запись', at);
    chatEvent(d, l.studentId, l.tutorId, {
      icon: 'x',
      text: `${firstNameOf(d, l.tutorId)} не сможет ${T(l.start)}`,
      sub: proposals.length ? 'Предлагает другое время' : l.paymentId ? 'Заморозка снята' : undefined,
      action: { label: 'Посмотреть', to: `/my/lessons/${l.id}` },
      tutor: { text: `Вы отклонили запись на ${T(l.start)}`, sub: reason, action: null },
    }, at);
    notify(d, l.studentId, {
      icon: 'x',
      title: `${firstNameOf(d, l.tutorId)} не сможет в это время`,
      text: `${reason}.${l.paymentId ? ' Деньги не списаны, заморозка снята.' : ''}${proposals.length ? ' Есть встречное предложение.' : ''}`,
      to: `/my/lessons/${l.id}`,
      tone: 'bad',
    }, at);
    sendEmail(d, l.studentId, {
      subject: 'Запись отклонена',
      title: `${displayName(d, l.tutorId)} не сможет ${fmtDayTime(l.start, userById(d, l.studentId)!.tz)}`,
      body: `${message.trim() || reason}. ${proposals.length ? 'Репетитор предложил другое время — запишитесь в один клик.' : 'Выберите другое время или другого репетитора.'}`,
      action: { label: 'Выбрать время', to: `/my/lessons/${l.id}` },
    }, at);
  });
}

/* ---------- cancellations ---------- */
export function cancelByStudent(lessonId: ID, reason = '') {
  const me = requireRole('student');
  const l = mustLesson(getDb(), lessonId);
  if (l.studentId !== me.id) fail('Это не ваш урок');
  if (!ACTIVE.includes(l.status)) fail('Урок уже нельзя отменить');
  if (now() >= l.start) fail('Урок уже начался');
  mutate(d => cancelLessonInDraft(d, l, 'student', reason));
}

function cancelLessonInDraft(d: Db, l: Lesson, by: 'student' | 'tutor' | 'system', reason: string, at = now()) {
  const free = by !== 'student' || l.status === 'pending' || l.status === 'unpaid' || canCancelFree(l, at) || l.kind === 'intro';
  const charged = d.payments.find(p => p.id === l.paymentId)?.status === 'charged';
  patchLesson(d, l.id, { status: 'cancelled', cancel: { by, at, reason, refund: free } });
  if (l.paymentId) {
    if (!charged) paymentOp(d, l.paymentId, 'release', undefined, 'Запись отменена', at);
    else if (free) paymentOp(d, l.paymentId, 'refund', undefined, by === 'tutor' ? 'Урок отменил репетитор' : 'Отмена за 4 часа и раньше', at);
  }
  if (free) setTransfer(d, l, { status: 'cancelled' });
  else setTransfer(d, l, { status: 'waiting', dueAt: at, reason: 'Поздняя отмена учеником' });

  const studentName = l.participant.name;
  const tutorFirst = firstNameOf(d, l.tutorId);
  if (by === 'student') {
    chatEvent(d, l.studentId, l.tutorId, {
      icon: 'x',
      text: `Вы отменили ${lessonTitle(l)} ${T(l.start)}`,
      sub: l.paymentId ? (free ? 'Деньги вернутся на карту' : `${fmtMoney(l.studentPrice - l.discount)} получит ${tutorFirst}`) : undefined,
      tutor: { text: `${studentName} отменил(а) ${lessonTitle(l)} ${T(l.start)}`, sub: !free && l.tutorPrice ? `Отмена меньше чем за 4 часа: вы получите ${fmtMoney(l.tutorPrice)}` : reason || undefined, action: null },
    }, at);
    notify(d, l.tutorId, { icon: 'x', title: `${studentName} отменил(а) ${lessonTitle(l)}`, text: `${T(l.start)}.${!free && l.tutorPrice ? ` Отмена поздняя: ${fmtMoney(l.tutorPrice)} придут вам.` : ' Окно снова свободно.'}`, to: `/tutor/lessons/${l.id}` }, at);
  } else if (by === 'tutor') {
    chatEvent(d, l.studentId, l.tutorId, {
      icon: 'x',
      text: `${tutorFirst} отменил(а) ${lessonTitle(l)} ${T(l.start)}`,
      sub: l.paymentId ? 'Вернём деньги полностью' : undefined,
      action: { label: 'Выбрать другое время', to: `/teachers/${tutorById(d, l.tutorId)?.slug}/book` },
      tutor: { text: `Вы отменили ${lessonTitle(l)} ${T(l.start)}`, sub: reason, action: null },
    }, at);
    notify(d, l.studentId, { icon: 'x', title: `${tutorFirst} отменил(а) ${lessonTitle(l)}`, text: `${T(l.start)}. ${reason}. ${l.paymentId ? 'Вернём деньги полностью на карту, с которой платили.' : ''}`, to: `/my/lessons/${l.id}`, tone: 'bad' }, at);
    sendEmail(d, l.studentId, {
      subject: 'Урок отменён репетитором',
      title: `${displayName(d, l.tutorId)} отменил(а) ${lessonTitle(l)}`,
      body: `${fmtDayTime(l.start, userById(d, l.studentId)!.tz)}. Причина: ${reason}. ${l.paymentId ? 'Деньги вернутся полностью, обычно за 1–5 рабочих дней.' : ''}`,
      action: { label: 'Выбрать другое время', to: `/teachers/${tutorById(d, l.tutorId)?.slug}/book` },
    }, at);
  }
}

export function cancelByTutor(lessonId: ID, reason: string) {
  const me = requireRole('tutor');
  const l = mustLesson(getDb(), lessonId);
  if (l.tutorId !== me.id) fail('Это не ваш урок');
  if (!ACTIVE.includes(l.status)) fail('Урок уже нельзя отменить');
  if (now() >= l.start) fail('Урок уже начался');
  if (!reason) fail('Выберите причину');
  mutate(d => cancelLessonInDraft(d, l, 'tutor', reason));
}

/* ---------- reschedule ---------- */
export function requestReschedule(lessonId: ID, newStart: number) {
  const me = requireUser();
  const d0 = getDb();
  const l = mustLesson(d0, lessonId);
  const side = l.studentId === me.id ? 'student' : l.tutorId === me.id ? 'tutor' : fail('Это не ваш урок');
  if (l.status !== 'confirmed') fail('Перенести можно только подтверждённый урок');
  if (!canCancelFree(l)) fail(`Перенести можно не позже чем за ${FREE_CANCEL_HOURS} часа до начала`);
  if (l.reschedule?.status === 'pending') fail('Запрос на перенос уже отправлен');
  const tutor = mustTutor(d0, l.tutorId);
  if (!slotAvailable(d0, tutor, newStart, { minutes: l.minutes, excludeLessonId: l.id, ignoreHorizon: true })) fail('Это время уже занято');
  mutate(d => {
    const at = now();
    patchLesson(d, l.id, { reschedule: { by: side, newStart, at, status: 'pending' } });
    const other = side === 'student' ? l.tutorId : l.studentId;
    const who = side === 'student' ? l.participant.name : firstNameOf(d, l.tutorId);
    chatEvent(d, l.studentId, l.tutorId, {
      icon: 'repeat',
      text: side === 'student' ? `Вы предложили перенести урок на ${T(newStart)}` : `${who} предлагает перенести урок на ${T(newStart)}`,
      action: side === 'student' ? undefined : { label: 'Ответить', to: `/my/lessons/${l.id}` },
      tutor: side === 'student' ? { text: `${who} предлагает перенести урок на ${T(newStart)}`, action: { label: 'Ответить', to: `/tutor/lessons/${l.id}`, tone: 'tinted' } } : { text: `Вы предложили перенести урок на ${T(newStart)}`, action: null },
    }, at);
    notify(d, other, { icon: 'repeat', title: `${who} просит перенести урок`, text: `С ${T(l.start)} на ${T(newStart)}.`, to: side === 'student' ? `/tutor/lessons/${l.id}` : `/my/lessons/${l.id}`, tone: 'action' }, at);
  });
}

export function answerReschedule(lessonId: ID, accept: boolean) {
  const me = requireUser();
  const d0 = getDb();
  const l = mustLesson(d0, lessonId);
  const r = l.reschedule;
  if (!r || r.status !== 'pending') fail('Запроса на перенос нет');
  const answerer = r!.by === 'student' ? l.tutorId : l.studentId;
  if (answerer !== me.id) fail('Ответить может только вторая сторона');
  if (accept && !slotAvailable(d0, mustTutor(d0, l.tutorId), r!.newStart, { minutes: l.minutes, excludeLessonId: l.id, ignoreHorizon: true, ignoreNotice: true })) fail('Это время уже занято');
  mutate(d => {
    const at = now();
    if (accept) {
      const end = r!.newStart + l.minutes * MIN;
      const next = patchLesson(d, l.id, { start: r!.newStart, end, reschedule: { ...r!, status: 'accepted' }, reminders: {}, link: l.link });
      if (l.tutorPrice > 0) setTransfer(d, next, { dueAt: end + DAY });
    } else patchLesson(d, l.id, { reschedule: { ...r!, status: 'declined' } });
    const other = r!.by === 'student' ? l.studentId : l.tutorId;
    notify(d, other, accept
      ? { icon: 'check', title: 'Перенос принят', text: `Урок теперь ${T(r!.newStart)}. Оплата перешла на новое время.`, to: r!.by === 'student' ? `/my/lessons/${l.id}` : `/tutor/lessons/${l.id}`, tone: 'ok' }
      : { icon: 'x', title: 'Перенос отклонён', text: `Урок остаётся ${T(l.start)}.`, to: r!.by === 'student' ? `/my/lessons/${l.id}` : `/tutor/lessons/${l.id}` }, at);
    chatEvent(d, l.studentId, l.tutorId, { icon: accept ? 'check' : 'x', text: accept ? `Урок перенесён на ${T(r!.newStart)}` : `Перенос отклонён, урок остаётся ${T(l.start)}` }, at);
  });
}

/* ---------- during and after the lesson ---------- */
export function setLink(lessonId: ID, link: string) {
  const me = requireRole('tutor');
  const l = mustLesson(getDb(), lessonId);
  if (l.tutorId !== me.id) fail('Это не ваш урок');
  if (!['confirmed', 'unpaid', 'pending'].includes(l.status)) fail('Урок уже прошёл или отменён');
  let url: URL;
  try {
    url = new URL(link.trim());
  } catch {
    return fail('Вставьте ссылку целиком, например https://telemost.yandex.ru/j/…', 'validation');
  }
  if (!/^https?:$/.test(url.protocol)) fail('Ссылка должна начинаться с https://', 'validation');
  mutate(d => {
    const at = now();
    patchLesson(d, l.id, { link: url.toString(), linkAt: at });
    chatEvent(d, l.studentId, l.tutorId, {
      icon: 'video',
      text: `${firstNameOf(d, l.tutorId)} добавил(а) ссылку на урок`,
      action: { label: 'Подключиться', to: `/my/lessons/${l.id}`, tone: 'tinted' },
      tutor: { text: 'Вы добавили ссылку на урок', action: null },
    }, at);
    notify(d, l.studentId, { icon: 'video', title: 'Ссылка на урок готова', text: `${T(l.start)}: кнопка «Подключиться» в карточке урока.`, to: `/my/lessons/${l.id}`, tone: 'action' }, at);
    sendEmail(d, l.studentId, {
      subject: 'Ссылка на урок',
      title: `${displayName(d, l.tutorId)} добавил(а) ссылку на урок`,
      body: `${fmtDayTime(l.start, userById(d, l.studentId)!.tz)}. Подключиться можно из карточки урока.`,
      action: { label: 'Подключиться', to: `/my/lessons/${l.id}` },
    }, at);
  });
}

export function markNoShow(lessonId: ID) {
  const me = requireRole('tutor');
  const l = mustLesson(getDb(), lessonId);
  if (l.tutorId !== me.id) fail('Это не ваш урок');
  if (l.status !== 'confirmed') fail('Неявку можно отметить только в подтверждённом уроке');
  if (now() < noShowFrom(l)) fail('Кнопка появится через 15 минут после начала');
  if (now() > answerUntil(l)) fail('Прошло больше 24 часов после урока');
  mutate(d => {
    const at = now();
    patchLesson(d, l.id, { status: 'no_show', noShowAt: at });
    if (l.tutorPrice) setTransfer(d, l, { status: 'waiting', dueAt: at + DISPUTE_ANSWER_HOURS * HOUR, reason: 'Неявка ученика' });
    chatEvent(d, l.studentId, l.tutorId, {
      icon: 'warn',
      text: `${firstNameOf(d, l.tutorId)} отметил(а), что вы не пришли на урок ${T(l.start)}`,
      sub: 'Не согласны? Оспорьте в течение 24 часов',
      action: { label: 'Открыть урок', to: `/my/lessons/${l.id}` },
      tutor: { text: `Вы отметили неявку ${l.participant.name}`, sub: l.tutorPrice ? `${fmtMoney(l.tutorPrice)} придут, если ученик не оспорит за 24 часа` : undefined, action: null },
    }, at);
    notify(d, l.studentId, { icon: 'warn', title: 'Репетитор отметил неявку', text: `Урок ${T(l.start)}. Если вы были на уроке, оспорьте в течение 24 часов.`, to: `/my/lessons/${l.id}`, tone: 'bad' }, at);
  });
}

/* the student answers «Урок состоялся? Да» */
export function confirmHappened(lessonId: ID): { askReview: boolean } {
  const me = requireRole('student');
  const d0 = getDb();
  const l = mustLesson(d0, lessonId);
  if (l.studentId !== me.id) fail('Это не ваш урок');
  if (l.status !== 'confirmed' || now() < l.end) fail('Подтвердить можно после окончания урока');
  const paidBefore = d0.lessons.filter(x => x.studentId === me.id && x.tutorId === l.tutorId && x.kind === 'lesson' && x.status === 'completed' && x.tutorPrice > 0).length;
  const n = paidBefore + 1;
  const askReview = l.kind === 'lesson' && l.tutorPrice > 0 && (n === 1 || n % 5 === 0);
  mutate(d => {
    const at = now();
    patchLesson(d, l.id, { status: 'completed', completedAt: at, studentAnswer: { ok: true, at }, reviewAsked: askReview });
    if (l.tutorPrice) setTransfer(d, l, { status: 'waiting', dueAt: at });
    notify(d, l.tutorId, { icon: 'wallet', title: `${l.participant.name} подтвердил(а) урок`, text: l.tutorPrice ? `${fmtMoney(l.tutorPrice)} переводим вам.` : 'Знакомство засчитано.', to: '/tutor/finance', tone: 'ok' }, at);
  });
  return { askReview };
}

/* ---------- disputes ---------- */
export function reportProblem(lessonId: ID, reason: string, details: string, shots: { name: string; dataUrl?: string }[], source: 'problem' | 'tutor_absent' | 'no_show_contest' = 'problem') {
  const me = requireRole('student');
  const l = mustLesson(getDb(), lessonId);
  if (l.studentId !== me.id) fail('Это не ваш урок');
  if (l.kind === 'intro') fail('Знакомство бесплатное, спор по нему не открывается');
  if (l.disputeId) fail('Спор по этому уроку уже открыт');
  if (source === 'tutor_absent') {
    if (l.status !== 'confirmed' || now() < noShowFrom(l)) fail('Кнопка появится через 15 минут после начала');
  } else if (source === 'no_show_contest') {
    if (l.status !== 'no_show' || now() > (l.noShowAt ?? 0) + DISPUTE_ANSWER_HOURS * HOUR) fail('Оспорить неявку можно в течение 24 часов');
  } else {
    if (!['confirmed', 'completed'].includes(l.status) || now() < l.end) fail('Сообщить о проблеме можно после урока');
    if (now() > answerUntil(l)) fail('Прошло больше 24 часов после урока');
  }
  if (!reason) fail('Выберите, что случилось');
  return mutate(d => {
    const at = now();
    const id = uid('dp');
    d.disputes.push({
      id,
      number: l.number,
      lessonId: l.id,
      studentId: l.studentId,
      tutorId: l.tutorId,
      source,
      reason,
      details: details.trim(),
      shots,
      createdAt: at,
      tutorDeadline: at + DISPUTE_ANSWER_HOURS * HOUR,
      decideBy: addBusinessDays(at, 3),
      status: 'open',
    });
    patchLesson(d, l.id, { status: 'disputed', disputeId: id, studentAnswer: { ok: false, at } });
    if (l.tutorPrice) setTransfer(d, l, { status: 'disputed' });
    const ii = d.payments.findIndex(p => p.id === l.paymentId);
    if (ii >= 0) d.payments[ii] = { ...d.payments[ii], events: [...d.payments[ii].events, { at, type: 'freeze', amount: d.payments[ii].amount, note: 'Спор' }] };
    notify(d, l.tutorId, { icon: 'help', title: `${l.participant.name} сообщил(а) о проблеме`, text: `Урок ${T(l.start)}: «${reason}». Ответьте в течение 24 часов.`, to: `/tutor/disputes/${id}`, tone: 'action' }, at);
    sendEmail(d, l.tutorId, {
      subject: 'Спор по уроку',
      title: `${l.participant.name} сообщил(а) о проблеме`,
      body: `Урок ${fmtDayTime(l.start, mustTutor(d, l.tutorId).tz)}. Причина: ${reason}. Напишите объяснение в течение 24 часов — так поддержке будет проще разобраться.`,
      action: { label: 'Ответить', to: `/tutor/disputes/${id}` },
    }, at);
    return id;
  });
}

export function answerDispute(disputeId: ID, text: string, shots: { name: string; dataUrl?: string }[]) {
  const me = requireRole('tutor');
  const dp = getDb().disputes.find(x => x.id === disputeId) ?? fail('Спор не найден');
  if (dp.tutorId !== me.id) fail('Это не ваш спор');
  if (dp.status !== 'open') fail('Спор уже решён');
  if (!text.trim()) fail('Напишите объяснение');
  mutate(d => {
    const i = d.disputes.findIndex(x => x.id === disputeId);
    d.disputes[i] = { ...d.disputes[i], tutorAnswer: { text: text.trim(), at: now(), shots } };
    notify(d, dp.studentId, { icon: 'chat', title: 'Репетитор ответил по спору', text: 'Поддержка изучит обе позиции и примет решение.', to: `/disputes/${dp.id}` });
  });
}

export function resolveDispute(disputeId: ID, kind: 'refund_full' | 'refund_partial' | 'pay_tutor', refundAmount: number, comment: string) {
  requireRole('admin');
  const d0 = getDb();
  const dp = d0.disputes.find(x => x.id === disputeId) ?? fail('Спор не найден');
  if (dp.status !== 'open') fail('Спор уже решён');
  const l = mustLesson(d0, dp.lessonId);
  const paid = l.studentPrice - l.discount;
  const refund = kind === 'refund_full' ? paid : kind === 'pay_tutor' ? 0 : Math.round(refundAmount);
  if (kind === 'refund_partial' && (refund <= 0 || refund >= paid)) fail(`Частичный возврат — от 1 до ${paid - 1} ₽`);
  mutate(d => {
    const at = now();
    const i = d.disputes.findIndex(x => x.id === disputeId);
    d.disputes[i] = { ...dp, status: 'resolved', resolution: { kind, refund, comment: comment.trim(), at } };
    if (refund) paymentOp(d, l.paymentId, 'refund', refund, 'Решение по спору', at);
    const tutorShare = kind === 'refund_full' ? 0 : Math.round(l.tutorPrice * (1 - refund / paid));
    patchLesson(d, l.id, { status: 'completed', completedAt: at });
    setTransfer(d, l, tutorShare ? { status: 'waiting', dueAt: at, amount: tutorShare } : { status: 'cancelled' });
    const text = kind === 'refund_full' ? `Полный возврат ${fmtMoney(paid)}.` : kind === 'pay_tutor' ? 'Урок засчитан, оплата уходит репетитору.' : `Возврат ${fmtMoney(refund)}, остальное — репетитору.`;
    notify(d, dp.studentId, { icon: 'shield', title: 'Спор решён', text: `${text}${comment.trim() ? ` ${comment.trim()}` : ''}`, to: `/disputes/${dp.id}`, tone: 'ok' }, at);
    notify(d, dp.tutorId, { icon: 'shield', title: 'Спор решён', text: tutorShare ? `Вы получите ${fmtMoney(tutorShare)}. ${comment.trim()}` : `Оплата возвращена ученику. ${comment.trim()}`, to: `/tutor/disputes/${dp.id}` }, at);
    sendEmail(d, dp.studentId, { subject: 'Решение по спору', title: 'Поддержка приняла решение', body: `${text} ${comment.trim()}`, action: { label: 'Открыть спор', to: `/disputes/${dp.id}` } }, at);
  });
}

/* ---------- series ---------- */
export interface SeriesPattern {
  weekday: number; // 0 = Mon, in the student's zone
  hour: number;
  minute: number;
}

/* next starts for a weekly pattern in the student's zone; days the tutor cannot do are moved to the end */
export function planSeries(tutorId: ID, minutes: number, pattern: SeriesPattern[], count: number, studentTz: string, exceptLessonIds: ID[] = []) {
  const d = getDb();
  const tutor = mustTutor(d, tutorId);
  const at = now();
  const dates: number[] = [];
  const skipped: number[] = [];
  if (!pattern.length) return { dates, skipped };
  const sorted = [...pattern].sort((a, b) => a.weekday - b.weekday || a.hour - b.hour);
  const startDay = zoned(at, studentTz);
  for (let i = 0; i < 120 && dates.length < count; i++) {
    const day = new Date(Date.UTC(startDay.year, startDay.month - 1, startDay.day + i));
    const wd = (day.getUTCDay() + 6) % 7;
    for (const p of sorted) {
      if (p.weekday !== wd || dates.length >= count) continue;
      const ts = zonedToUtc(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate(), p.hour, p.minute, studentTz);
      if (ts < at + tutor.minNoticeHours * HOUR) continue;
      const free = fitsOpenHours(tutor, ts, minutes) && slotAvailable(d, tutor, ts, { minutes, ignoreHorizon: true, ignoreNotice: true, excludeLessonId: exceptLessonIds[0] });
      if (free) dates.push(ts);
      else if (dates.length) skipped.push(ts);
    }
  }
  return { dates, skipped };
}

export interface SeriesInput {
  tutorId: ID;
  subject: string;
  minutes: number;
  pattern: SeriesPattern[];
  count: number;
  participant: Participant;
  method: MethodInput;
  comment?: string;
}

export function createSeries(input: SeriesInput): Series {
  const me = requireRole('student');
  const d0 = getDb();
  const tutor = mustTutor(d0, input.tutorId);
  if (!isListed(tutor)) fail('Анкета репетитора сейчас скрыта');
  if (![4, 8, 12].includes(input.count)) fail('Выберите 4, 8 или 12 занятий');
  if (!input.pattern.length) fail('Выберите хотя бы один день');
  const tutorPrice = tutorPriceFor(tutor.userId, input.subject, input.minutes);
  const plan = planSeries(tutor.userId, input.minutes, input.pattern, input.count, me.tz);
  if (plan.dates.length < input.count) fail('Не нашлось столько свободных окон в это время. Выберите другие дни или меньше занятий.');
  const q = quote(tutorPrice, undefined, me);
  const resolved = resolveMethod(d0, me, input.method);
  const save = resolved.save;
  if (resolved.method.kind === 'sbp') fail('Для серии нужна карта: каждое занятие спишем с неё за 24 часа до начала');
  const method = resolved.method as Extract<Payment['method'], { kind: 'card' }>;
  try {
    authorize(method.last4);
  } catch (e) {
    if (e instanceof PaymentDeclined) throw new ApiError(e.message, 'payment');
    throw e;
  }
  return mutate(d => {
    const at = now();
    const seriesId = uid('s');
    let cardId = method.cardId;
    const ui = d.users.findIndex(u => u.id === me.id);
    if (save && !d.users[ui].cards.some(c => c.last4 === save.last4)) {
      cardId = uid('card');
      d.users[ui] = { ...d.users[ui], cards: [...d.users[ui].cards, { id: cardId, last4: save.last4, brand: save.brand }] };
    } else if (!cardId) cardId = d.users[ui].cards.find(c => c.last4 === method.last4)?.id;
    const deadline = confirmDeadline(at, plan.dates[0]);
    const lessonIds: ID[] = [];
    plan.dates.forEach((start, idx) => {
      const lessonId = uid('l');
      lessonIds.push(lessonId);
      const paymentId = idx === 0 ? addPayment(d, me.id, lessonId, q.total, method, 'held', at).id : undefined;
      d.lessons.push({
        id: lessonId,
        number: 1000 + nextNumber(d),
        kind: 'lesson',
        studentId: me.id,
        tutorId: tutor.userId,
        participant: input.participant,
        subject: input.subject,
        minutes: input.minutes,
        start,
        end: start + input.minutes * MIN,
        status: 'pending',
        tutorPrice: q.tutorPrice,
        studentPrice: q.studentPrice,
        discount: 0,
        comment: input.comment?.trim() || undefined,
        createdAt: at,
        confirmDeadline: deadline,
        seriesId,
        paymentId,
        reminders: {},
      });
    });
    const series: Series = {
      id: seriesId,
      studentId: me.id,
      tutorId: tutor.userId,
      participant: input.participant,
      subject: input.subject,
      minutes: input.minutes,
      pattern: input.pattern,
      count: input.count,
      lessonIds,
      skippedDates: plan.skipped,
      status: 'pending',
      tutorPrice: q.tutorPrice,
      studentPrice: q.studentPrice,
      createdAt: at,
      confirmDeadline: deadline,
      cardId,
    };
    d.series.push(series);
    chatEvent(d, me.id, tutor.userId, {
      icon: 'repeat',
      text: `Вы отправили серию: ${input.count} занятий с ${T(plan.dates[0])}`,
      sub: `Первое занятие: ${fmtMoney(q.total)} заморожены`,
      tutor: { text: `${input.participant.name} хочет заниматься регулярно: ${input.count} занятий`, sub: `Подтвердите до ${T(deadline)}`, action: { label: 'Ответить', to: `/tutor/series/${seriesId}`, tone: 'tinted' } },
    }, at);
    notify(d, tutor.userId, { icon: 'repeat', title: `${input.participant.name}: новая серия`, text: `${input.count} занятий по ${input.minutes} мин. Подтвердите одним нажатием до ${T(deadline)}.`, to: `/tutor/series/${seriesId}`, tone: 'action' }, at);
    sendEmail(d, tutor.userId, { subject: 'Новая серия занятий', title: `${input.participant.name} хочет заниматься регулярно`, body: `${input.count} занятий по ${input.minutes} мин. Подтвердите серию один раз — все занятия появятся в расписании.`, action: { label: 'Ответить', to: `/tutor/series/${seriesId}` } }, at);
    return series;
  });
}

export function confirmSeries(seriesId: ID) {
  const me = requireRole('tutor');
  const s = getDb().series.find(x => x.id === seriesId) ?? fail('Серия не найдена');
  if (s.tutorId !== me.id) fail('Это не ваша серия');
  if (s.status !== 'pending') fail('Серия уже обработана');
  mutate(d => {
    const at = now();
    const i = d.series.findIndex(x => x.id === seriesId);
    d.series[i] = { ...s, status: 'confirmed' };
    s.lessonIds.forEach((id, idx) => {
      const l = lessonById(d, id);
      if (!l || l.status !== 'pending') return;
      const next = patchLesson(d, id, { status: 'confirmed', confirmedAt: at });
      if (idx === 0) {
        paymentOp(d, l.paymentId, 'charge', undefined, 'Репетитор подтвердил серию', at);
        setTransfer(d, next, { status: 'waiting', dueAt: l.end + DAY });
      }
    });
    chatEvent(d, s.studentId, s.tutorId, {
      icon: 'check',
      text: `${firstNameOf(d, s.tutorId)} подтвердил(а) серию из ${s.count} занятий`,
      sub: 'Каждое занятие спишем за 24 часа до начала',
      action: { label: 'Открыть серию', to: `/my/series/${s.id}` },
      tutor: { text: `Вы подтвердили серию из ${s.count} занятий`, action: null },
    }, at);
    notify(d, s.studentId, { icon: 'check', title: 'Серия подтверждена', text: `${s.count} занятий в расписании. Каждое спишем с карты за 24 часа до начала.`, to: `/my/series/${s.id}`, tone: 'ok' }, at);
  });
}

export function declineSeries(seriesId: ID, message: string) {
  const me = requireRole('tutor');
  const s = getDb().series.find(x => x.id === seriesId) ?? fail('Серия не найдена');
  if (s.tutorId !== me.id) fail('Это не ваша серия');
  if (s.status !== 'pending') fail('Серия уже обработана');
  mutate(d => {
    const at = now();
    const i = d.series.findIndex(x => x.id === seriesId);
    d.series[i] = { ...s, status: 'declined' };
    s.lessonIds.forEach(id => {
      const l = lessonById(d, id);
      if (!l) return;
      patchLesson(d, id, { status: 'declined', decline: { reason: 'Серия отклонена', message, proposals: [], at } });
      paymentOp(d, l.paymentId, 'release', undefined, 'Серия отклонена', at);
    });
    notify(d, s.studentId, { icon: 'x', title: 'Серия отклонена', text: `${message || 'Репетитор не сможет в это время'}. Заморозка снята.`, to: `/my/series/${s.id}`, tone: 'bad' }, at);
    chatEvent(d, s.studentId, s.tutorId, { icon: 'x', text: `${firstNameOf(d, s.tutorId)} отклонил(а) серию`, sub: message || undefined, tutor: { text: 'Вы отклонили серию', action: null } }, at);
  });
}

export function cancelSeries(seriesId: ID) {
  const me = requireRole('student');
  const s = getDb().series.find(x => x.id === seriesId) ?? fail('Серия не найдена');
  if (s.studentId !== me.id) fail('Это не ваша серия');
  mutate(d => {
    const at = now();
    const i = d.series.findIndex(x => x.id === seriesId);
    d.series[i] = { ...d.series[i], status: 'cancelled' };
    for (const id of s.lessonIds) {
      const l = lessonById(d, id);
      if (l && ACTIVE.includes(l.status) && l.start > at) cancelLessonInDraft(d, l, 'student', 'Отмена серии', at);
    }
    notify(d, s.tutorId, { icon: 'x', title: `${s.participant.name} отменил(а) серию`, text: 'Будущие занятия серии отменены, окна снова свободны.', to: '/tutor/lessons' }, at);
  });
}

/* manual payment of a series lesson whose automatic charge failed */
export function payUnpaid(lessonId: ID, input: MethodInput) {
  const me = requireRole('student');
  const d0 = getDb();
  const l = mustLesson(d0, lessonId);
  if (l.studentId !== me.id) fail('Это не ваш урок');
  if (l.status !== 'unpaid') fail('Урок уже оплачен');
  const { method } = resolveMethod(d0, me, input);
  try {
    if (method.kind === 'card') chargeSaved(method.last4 === '0341' ? '0000' : method.last4);
  } catch (e) {
    if (e instanceof PaymentDeclined) fail(e.message, 'payment');
    throw e;
  }
  mutate(d => {
    const at = now();
    const p = addPayment(d, me.id, l.id, l.studentPrice, method, 'charged', at);
    const next = patchLesson(d, l.id, { status: 'confirmed', paymentId: p.id });
    setTransfer(d, next, { status: 'waiting', dueAt: l.end + DAY });
    notify(d, l.tutorId, { icon: 'check', title: 'Занятие серии оплачено', text: `${l.participant.name}, ${T(l.start)}.`, to: `/tutor/lessons/${l.id}` }, at);
  });
}

/* used by the scheduler */
export const internals = { paymentOp, setTransfer, patchLesson, addPayment, cancelLessonInDraft };

/* for screens: has the student already had an intro with this tutor? */
export function introUsed(d: Db, studentId: ID, tutorId: ID) {
  return d.lessons.some(l => l.kind === 'intro' && l.studentId === studentId && l.tutorId === tutorId && ['pending', 'confirmed', 'completed', 'no_show', 'disputed'].includes(l.status));
}

export { CONFIRM_HOURS };
