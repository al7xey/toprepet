import type { Child, ID, Onboarding } from './types';
import { getDb, mutate } from './store';
import { fail, mustTutor } from './core';
import { requireRole, requireUser } from './auth';
import { uid } from '../lib/text';

export function saveOnboarding(changes: Partial<Onboarding>) {
  const me = requireRole('student');
  mutate(d => {
    const i = d.users.findIndex(u => u.id === me.id);
    const prev = d.users[i].onboarding ?? { step: 0, done: false, forWhom: 'self' };
    d.users[i] = { ...d.users[i], onboarding: { ...prev, ...changes } };
  });
}

export function addChild(name: string, age: string): Child {
  const me = requireRole('student');
  if (!name.trim()) fail('Укажите имя', 'validation');
  if (!age.trim()) fail('Укажите возраст или класс', 'validation');
  return mutate(d => {
    const i = d.users.findIndex(u => u.id === me.id);
    const child = { id: uid('ch'), name: name.trim(), age: age.trim() };
    d.users[i] = { ...d.users[i], children: [...d.users[i].children, child] };
    return child;
  });
}

export function updateChild(id: ID, name: string, age: string) {
  const me = requireRole('student');
  mutate(d => {
    const i = d.users.findIndex(u => u.id === me.id);
    d.users[i] = { ...d.users[i], children: d.users[i].children.map(c => (c.id === id ? { ...c, name: name.trim(), age: age.trim() } : c)) };
  });
}

export function removeChild(id: ID) {
  const me = requireRole('student');
  mutate(d => {
    const i = d.users.findIndex(u => u.id === me.id);
    d.users[i] = { ...d.users[i], children: d.users[i].children.filter(c => c.id !== id) };
  });
}

export function toggleFavorite(tutorId: ID, on?: boolean) {
  const me = requireUser();
  if (me.role !== 'student') fail('Избранное доступно ученикам');
  mustTutor(getDb(), tutorId);
  return mutate(d => {
    const i = d.users.findIndex(u => u.id === me.id);
    const has = d.users[i].favorites.includes(tutorId);
    const want = on ?? !has;
    d.users[i] = { ...d.users[i], favorites: want ? (has ? d.users[i].favorites : [...d.users[i].favorites, tutorId]) : d.users[i].favorites.filter(x => x !== tutorId) };
    return want;
  });
}

export function removeCard(cardId: ID) {
  const me = requireRole('student');
  mutate(d => {
    const i = d.users.findIndex(u => u.id === me.id);
    d.users[i] = { ...d.users[i], cards: d.users[i].cards.filter(c => c.id !== cardId) };
  });
}

export function markNoticesRead(ids?: ID[]) {
  const me = requireUser();
  mutate(d => {
    d.notices.forEach((n, i) => {
      if (n.userId === me.id && !n.read && (!ids || ids.includes(n.id))) d.notices[i] = { ...n, read: true };
    });
  });
}
