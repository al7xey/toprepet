import type { Chat, ChatEvent, Db, Email, ID, Lesson, Notice, TutorProfile, User } from './types';
import { getDb } from './store';
import { uid } from '../lib/text';
import { fmtDayTime, fmtTime, now } from '../lib/time';

export class ApiError extends Error {
  code?: string;
  data?: unknown;
  constructor(message: string, code?: string, data?: unknown) {
    super(message);
    this.code = code;
    this.data = data;
  }
}

export const fail = (message: string, code?: string, data?: unknown): never => {
  throw new ApiError(message, code, data);
};

/* ---------- lookups ---------- */
export const userById = (d: Db, id: ID | undefined) => d.users.find(u => u.id === id);
export const tutorById = (d: Db, id: ID | undefined) => d.tutors.find(t => t.userId === id);
export const tutorBySlug = (d: Db, slug: string | undefined) => d.tutors.find(t => t.slug === slug);
export const lessonById = (d: Db, id: ID | undefined) => d.lessons.find(l => l.id === id);

export function mustUser(d: Db, id: ID | undefined): User {
  return userById(d, id) ?? fail('Пользователь не найден');
}
export function mustTutor(d: Db, id: ID | undefined): TutorProfile {
  return tutorById(d, id) ?? fail('Анкета не найдена');
}
export function mustLesson(d: Db, id: ID | undefined): Lesson {
  return lessonById(d, id) ?? fail('Урок не найден');
}

export function nextNumber(d: Db) {
  d.seq += 1;
  return d.seq;
}

/* ---------- notifications ---------- */
export function notify(d: Db, userId: ID, n: Omit<Notice, 'id' | 'userId' | 'at' | 'read'>, at = now()) {
  d.notices.push({ id: uid('n'), userId, at, read: false, ...n });
}

export function sendEmail(d: Db, userId: ID, e: Omit<Email, 'id' | 'to' | 'email' | 'at'>, at = now()) {
  const u = userById(d, userId);
  if (!u) return;
  d.emails.push({ id: uid('e'), to: userId, email: u.email, at, ...e });
}

/* ---------- chats ---------- */
export function findPairChat(d: Db, studentId: ID, tutorId: ID) {
  return d.chats.find(c => c.kind === 'pair' && c.studentId === studentId && c.tutorId === tutorId);
}

export function ensurePairChat(d: Db, studentId: ID, tutorId: ID, at = now()): Chat {
  let chat = findPairChat(d, studentId, tutorId);
  if (!chat) {
    chat = { id: uid('c'), kind: 'pair', studentId, tutorId, createdAt: at, lastAt: at };
    d.chats.push(chat);
  }
  return chat;
}

export function touchChat(d: Db, chatId: ID, at = now()) {
  const i = d.chats.findIndex(c => c.id === chatId);
  if (i >= 0) d.chats[i] = { ...d.chats[i], lastAt: at };
}

/* System event in the pair chat, as seen by both sides. */
export function chatEvent(d: Db, studentId: ID, tutorId: ID, event: ChatEvent, at = now()) {
  const chat = ensurePairChat(d, studentId, tutorId, at);
  d.messages.push({ id: uid('m'), chatId: chat.id, authorId: 'system', kind: 'event', event, createdAt: at });
  touchChat(d, chat.id, at);
  return chat;
}

/* ---------- names ---------- */
export function displayName(d: Db, id: ID | undefined) {
  const t = tutorById(d, id);
  if (t) return t.name;
  return userById(d, id)?.name ?? 'Пользователь';
}

export function firstNameOf(d: Db, id: ID | undefined) {
  return displayName(d, id).split(/\s+/)[0];
}

/* lesson time phrase for each side */
export const whenFor = (d: Db, l: Lesson, viewerId: ID) => fmtDayTime(l.start, userById(d, viewerId)?.tz ?? 'Europe/Moscow');
export const timeFor = (d: Db, ts: number, viewerId: ID) => fmtTime(ts, userById(d, viewerId)?.tz ?? 'Europe/Moscow');

export function current() {
  return getDb();
}
