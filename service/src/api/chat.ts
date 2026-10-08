import type { Chat, Db, ID, Message, User } from './types';
import { getDb, mutate } from './store';
import { ensurePairChat, fail, firstNameOf, mustTutor, notify, touchChat, tutorById, userById } from './core';
import { requireRole, requireUser } from './auth';
import { slotAvailable } from './schedule';
import { FILE_LIMIT, tokenTime as T } from './rules';
import { findContacts, maskContacts, uid } from '../lib/text';
import { now } from '../lib/time';

export const SUPPORT_ID = 'support';

export function chatPartnerId(c: Chat, meId: ID): ID {
  if (c.kind === 'support') return meId === c.userId ? SUPPORT_ID : c.userId!;
  return c.studentId === meId ? c.tutorId! : c.studentId!;
}

export function myChats(d: Db, me: User) {
  if (me.role === 'admin') return d.chats.filter(c => c.kind === 'support').sort((a, b) => b.lastAt - a.lastAt);
  return d.chats
    .filter(c => (c.kind === 'pair' && (c.studentId === me.id || c.tutorId === me.id)) || (c.kind === 'support' && c.userId === me.id))
    .filter(c => c.kind === 'support' || d.messages.some(m => m.chatId === c.id))
    .sort((a, b) => b.lastAt - a.lastAt);
}

const isMine = (m: Message, meId: ID, admin: boolean) => (admin ? m.authorId === SUPPORT_ID : m.authorId === meId);

export function unreadIn(d: Db, chatId: ID, me: User) {
  const admin = me.role === 'admin';
  return d.messages.filter(m => m.chatId === chatId && m.kind !== 'event' && !m.readAt && !isMine(m, me.id, admin) && m.authorId !== 'system').length;
}

export function unreadTotal(d: Db, me: User | null) {
  if (!me) return 0;
  return myChats(d, me).reduce((sum, c) => sum + unreadIn(d, c.id, me), 0);
}

/* Can this person write in the pair chat? Tutors never write first outside a response or a booking. */
export function canWrite(d: Db, me: User, c: Chat): { ok: boolean; reason?: string } {
  if (c.kind === 'support') return { ok: true };
  const other = chatPartnerId(c, me.id);
  if (me.blocked.includes(other)) return { ok: false, reason: 'Вы заблокировали собеседника. Разблокируйте, чтобы написать.' };
  if (userById(d, other)?.blocked.includes(me.id)) return { ok: false, reason: 'Собеседник ограничил переписку с вами.' };
  if (me.role === 'tutor') {
    const opened = d.messages.some(m => m.chatId === c.id && (m.authorId === c.studentId || m.kind === 'event'));
    if (!opened) return { ok: false, reason: 'Написать ученику можно только через отклик на заявку или после записи.' };
  }
  return { ok: true };
}

/* Student starts or opens a chat from a profile. */
export function openChatWithTutor(tutorId: ID): ID {
  const me = requireRole('student');
  mustTutor(getDb(), tutorId);
  const existing = getDb().chats.find(c => c.kind === 'pair' && c.studentId === me.id && c.tutorId === tutorId);
  if (existing) return existing.id;
  return mutate(d => ensurePairChat(d, me.id, tutorId).id);
}

export function openSupport(lessonId?: ID): ID {
  const me = requireUser();
  const existing = getDb().chats.find(c => c.kind === 'support' && c.userId === me.id);
  if (existing) {
    if (lessonId && existing.lessonId !== lessonId)
      mutate(d => {
        const i = d.chats.findIndex(c => c.id === existing.id);
        d.chats[i] = { ...d.chats[i], lessonId };
        d.messages.push({ id: uid('m'), chatId: existing.id, authorId: 'system', kind: 'event', event: { icon: 'cal', text: `Обращение по уроку ${T(d.lessons.find(l => l.id === lessonId)?.start ?? now())}` }, createdAt: now() });
      });
    return existing.id;
  }
  return mutate(d => {
    const at = now();
    const chat: Chat = { id: uid('c'), kind: 'support', userId: me.id, lessonId, createdAt: at, lastAt: at };
    d.chats.push(chat);
    d.messages.push({ id: uid('m'), chatId: chat.id, authorId: SUPPORT_ID, kind: 'text', text: 'Здравствуйте! Это поддержка TopRepet. Опишите вопрос, отвечаем обычно за 10 минут.', createdAt: at });
    return chat.id;
  });
}

export interface SendInput {
  text?: string;
  file?: { name: string; size: number; type: string; dataUrl?: string };
}

export function sendMessage(chatId: ID, input: SendInput) {
  const me = requireUser();
  const d0 = getDb();
  const c = d0.chats.find(x => x.id === chatId) ?? fail('Чат не найден');
  const admin = me.role === 'admin';
  if (!admin && c.kind === 'pair' && c.studentId !== me.id && c.tutorId !== me.id) fail('Это не ваш чат');
  if (!admin && c.kind === 'support' && c.userId !== me.id) fail('Это не ваш чат');
  const allowed = admin ? { ok: true } : canWrite(d0, me, c);
  if (!allowed.ok) fail(allowed.reason!);
  const text = input.text?.trim() ?? '';
  if (!text && !input.file) fail('Пустое сообщение');
  if (input.file && input.file.size > FILE_LIMIT) fail('Файл больше 20 МБ');
  if (text.length > 4000) fail('Сообщение слишком длинное');
  return mutate(d => {
    const at = now();
    const masked = c.kind === 'pair' && findContacts(text);
    const msg: Message = {
      id: uid('m'),
      chatId,
      authorId: admin ? SUPPORT_ID : me.id,
      kind: input.file ? 'file' : 'text',
      text: masked ? maskContacts(text) : text || undefined,
      file: input.file,
      createdAt: at,
      masked: masked || undefined,
    };
    d.messages.push(msg);
    touchChat(d, chatId, at);
    if (admin && c.userId) notify(d, c.userId, { icon: 'help', title: 'Ответ поддержки', text: text.slice(0, 120), to: '/support' }, at);
    return msg;
  });
}

export function markRead(chatId: ID) {
  const me = requireUser();
  const d0 = getDb();
  const admin = me.role === 'admin';
  const unread = d0.messages.some(m => m.chatId === chatId && !m.readAt && m.authorId !== 'system' && !isMine(m, me.id, admin));
  if (!unread) return;
  mutate(d => {
    const at = now();
    d.messages.forEach((m, i) => {
      if (m.chatId === chatId && !m.readAt && m.authorId !== 'system' && !isMine(m, me.id, admin)) d.messages[i] = { ...m, readAt: at };
    });
  });
}

/* Tutor proposes 1–4 windows from the schedule; the student books one in a click. */
export function proposeTime(chatId: ID, slots: number[], subject: string, minutes: number) {
  const me = requireRole('tutor');
  const d0 = getDb();
  const c = d0.chats.find(x => x.id === chatId) ?? fail('Чат не найден');
  if (c.tutorId !== me.id) fail('Это не ваш чат');
  const ok = canWrite(d0, me, c);
  if (!ok.ok) fail(ok.reason!);
  if (!slots.length || slots.length > 4) fail('Выберите от 1 до 4 окон');
  const t = mustTutor(d0, me.id);
  const price = t.prices.find(p => p.subject === subject && p.minutes === minutes)?.price ?? fail('Нет цены для этого предмета и длительности');
  for (const s of slots) if (!slotAvailable(d0, t, s, { minutes, ignoreHorizon: true })) fail('Одно из окон уже занято');
  return mutate(d => {
    const at = now();
    d.messages.push({ id: uid('m'), chatId, authorId: me.id, kind: 'proposal', proposal: { slots: [...slots].sort((a, b) => a - b), subject, minutes, tutorPrice: price }, createdAt: at });
    touchChat(d, chatId, at);
    notify(d, c.studentId!, { icon: 'cal', title: `${firstNameOf(d, me.id)} предлагает время`, text: 'Выберите окно в чате — запишетесь в один клик.', to: `/messages/${chatId}`, tone: 'action' }, at);
  });
}

export function reportUser(chatId: ID, messageId: ID | undefined, reason: string, block: boolean) {
  const me = requireUser();
  const c = getDb().chats.find(x => x.id === chatId) ?? fail('Чат не найден');
  if (!reason) fail('Выберите причину');
  const other = chatPartnerId(c, me.id);
  mutate(d => {
    d.complaints.push({ id: uid('cp'), byId: me.id, againstId: other, chatId, messageId, reason, createdAt: now(), status: 'open', blocked: block });
    if (block) {
      const i = d.users.findIndex(u => u.id === me.id);
      if (!d.users[i].blocked.includes(other)) d.users[i] = { ...d.users[i], blocked: [...d.users[i].blocked, other] };
    }
  });
}

export function setBlocked(otherId: ID, blocked: boolean) {
  const me = requireUser();
  mutate(d => {
    const i = d.users.findIndex(u => u.id === me.id);
    const list = d.users[i].blocked.filter(x => x !== otherId);
    d.users[i] = { ...d.users[i], blocked: blocked ? [...list, otherId] : list };
  });
}

export function resolveComplaint(id: ID) {
  requireRole('admin');
  mutate(d => {
    const i = d.complaints.findIndex(c => c.id === id);
    if (i >= 0) d.complaints[i] = { ...d.complaints[i], status: 'resolved' };
  });
}

export function partnerName(d: Db, c: Chat, meId: ID) {
  if (c.kind === 'support') return meId === c.userId ? 'Поддержка TopRepet' : userById(d, c.userId)?.name ?? 'Пользователь';
  const id = chatPartnerId(c, meId);
  return tutorById(d, id)?.name ?? userById(d, id)?.name ?? 'Пользователь';
}
