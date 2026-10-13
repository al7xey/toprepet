import type { Db, ID, Review } from './types';
import { getDb, mutate } from './store';
import { fail, mustLesson, notify, firstNameOf } from './core';
import { requireRole } from './auth';
import { findContacts, uid } from '../lib/text';
import { now } from '../lib/time';

export function leaveReview(lessonId: ID, rating: number, text: string) {
  const me = requireRole('student');
  const d0 = getDb();
  const l = mustLesson(d0, lessonId);
  if (l.studentId !== me.id) fail('Это не ваш урок');
  if (l.kind !== 'lesson' || l.tutorPrice <= 0) fail('Отзыв можно оставить только после оплаченного урока');
  if (!['completed'].includes(l.status)) fail('Отзыв можно оставить после урока');
  if (rating < 1 || rating > 5) fail('Поставьте оценку от 1 до 5', 'validation');
  if (text.trim().length < 10) fail('Напишите пару слов о уроке', 'validation');
  const existing = d0.reviews.find(r => r.lessonId === lessonId);
  if (existing && existing.status !== 'rejected') fail('Отзыв по этому уроку уже есть');
  return mutate(d => {
    const at = now();
    const review: Review = { id: existing?.id ?? uid('rv'), lessonId, studentId: me.id, tutorId: l.tutorId, rating, text: text.trim(), status: 'review', createdAt: at };
    if (existing) d.reviews[d.reviews.findIndex(r => r.id === existing.id)] = review;
    else d.reviews.push(review);
    const li = d.lessons.findIndex(x => x.id === lessonId);
    d.lessons[li] = { ...d.lessons[li], reviewId: review.id };
    return review;
  });
}

export function moderateReview(reviewId: ID, publish: boolean, reason = '') {
  requireRole('admin');
  if (!publish && !reason) fail('Выберите причину отказа');
  mutate(d => {
    const i = d.reviews.findIndex(r => r.id === reviewId);
    if (i < 0) fail('Отзыв не найден');
    const r = d.reviews[i];
    d.reviews[i] = { ...r, status: publish ? 'published' : 'rejected', reason: publish ? undefined : reason, publishedAt: publish ? now() : undefined };
    notify(d, r.studentId, publish
      ? { icon: 'check', title: 'Отзыв опубликован', text: `Отзыв о ${firstNameOf(d, r.tutorId)} уже в анкете. Спасибо!`, to: '/account/reviews', tone: 'ok' }
      : { icon: 'warn', title: 'Отзыв не прошёл проверку', text: `Причина: ${reason}. Исправьте и отправьте снова.`, to: '/account/reviews', tone: 'bad' });
    if (publish) notify(d, r.tutorId, { icon: 'star', title: `Новый отзыв на ${r.rating} ${r.rating === 1 ? 'звезду' : r.rating < 5 ? 'звезды' : 'звёзд'}`, text: 'Прошёл проверку, уже в анкете. Можно ответить публично.', to: '/tutor/reviews', tone: 'action' });
  });
}

export function replyToReview(reviewId: ID, text: string) {
  const me = requireRole('tutor');
  if (text.trim().length < 3) fail('Напишите ответ', 'validation');
  if (findContacts(text)) fail('В ответе не должно быть контактов', 'validation');
  mutate(d => {
    const i = d.reviews.findIndex(r => r.id === reviewId);
    if (i < 0 || d.reviews[i].tutorId !== me.id) fail('Отзыв не найден');
    d.reviews[i] = { ...d.reviews[i], reply: { text: text.trim(), at: now() } };
    notify(d, d.reviews[i].studentId, { icon: 'chat', title: `${firstNameOf(d, me.id)} ответил(а) на ваш отзыв`, text: text.trim().slice(0, 120), to: `/teachers/${d.tutors.find(t => t.userId === me.id)?.slug}/reviews` });
  });
}

export function complainReview(reviewId: ID, reason: string, text: string) {
  const me = requireRole('tutor');
  if (!reason) fail('Выберите причину');
  mutate(d => {
    const i = d.reviews.findIndex(r => r.id === reviewId);
    if (i < 0 || d.reviews[i].tutorId !== me.id) fail('Отзыв не найден');
    d.reviews[i] = { ...d.reviews[i], complaint: { reason, text: text.trim(), at: now(), status: 'open' } };
  });
}

export function resolveReviewComplaint(reviewId: ID, remove: boolean) {
  requireRole('admin');
  mutate(d => {
    const i = d.reviews.findIndex(r => r.id === reviewId);
    if (i < 0) fail('Отзыв не найден');
    const r = d.reviews[i];
    d.reviews[i] = { ...r, status: remove ? 'rejected' : r.status, reason: remove ? r.complaint?.reason : r.reason, complaint: r.complaint ? { ...r.complaint, status: remove ? 'removed' : 'kept' } : undefined };
    notify(d, r.tutorId, { icon: 'shield', title: 'Жалоба на отзыв рассмотрена', text: remove ? 'Отзыв снят с публикации.' : 'Нарушений не нашли, отзыв остаётся.', to: '/tutor/reviews' });
    if (remove) notify(d, r.studentId, { icon: 'warn', title: 'Отзыв снят с публикации', text: `Причина: ${r.complaint?.reason}. Можно исправить и отправить снова.`, to: '/account/reviews', tone: 'bad' });
  });
}

/* ---------- aggregates ---------- */
export function tutorRating(d: Db, tutorId: ID) {
  const list = d.reviews.filter(r => r.tutorId === tutorId && r.status === 'published');
  const count = list.length;
  const avg = count ? list.reduce((s, r) => s + r.rating, 0) / count : 0;
  const dist = [5, 4, 3, 2, 1].map(star => ({ star, count: list.filter(r => r.rating === star).length }));
  return { count, avg, dist, list: list.sort((a, b) => (b.publishedAt ?? b.createdAt) - (a.publishedAt ?? a.createdAt)) };
}

export const fmtRating = (avg: number) => avg.toFixed(1).replace('.', ',');
