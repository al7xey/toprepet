import { beforeAll, describe, expect, it } from 'vitest';
import { ApiError } from './contract';
import { createMockApi, studentPriceOf } from './mock';
import type { Slot, Tutor } from './types';

const api = createMockApi();
const HOUR = 3_600_000;

/** Первое свободное время не раньше чем через 6 часов (чтобы отмена была бесплатной). */
async function freeSlot(tutor: Tutor, skip = 0): Promise<Slot> {
  const slots = await api.getTutorSlots(tutor.id, new Date(Date.now() + 6 * HOUR).toISOString(), 14);
  const found = slots.filter((s) => s.available && new Date(s.start).getTime() > Date.now() + 6 * HOUR)[skip];
  if (!found) throw new Error('нет свободных слотов для теста');
  return found;
}

describe('правила мока (их же обязан повторить сервер)', () => {
  let tutor: Tutor;
  beforeAll(async () => {
    tutor = (await api.listTutors({ limit: 20 })).items[0];
  });

  it('цена для ученика = цена репетитора + 10 %', () => {
    expect(studentPriceOf(2000)).toBe(2200);
    expect(studentPriceOf(1600)).toBe(1760);
    expect(studentPriceOf(1333)).toBe(Math.round(1333 * 1.1));
  });

  it('запись: удержание суммы, статус «ждёт подтверждения»', async () => {
    await api.login('olga@mail.ru', 'demo');
    const slot = await freeSlot(tutor);
    const lesson = await api.createBooking({ tutorId: tutor.id, kind: 'regular', subject: tutor.subjects[0], start: slot.start, durationMin: 60 });
    expect(lesson.status).toBe('pending');
    expect(lesson.payment).toBe('hold');
    expect(lesson.price).toBe(tutor.studentPrice);
    expect(lesson.tutorPrice).toBe(tutor.price);
  });

  it('занятое время второй раз записать нельзя', async () => {
    const slot = await freeSlot(tutor);
    await api.createBooking({ tutorId: tutor.id, kind: 'regular', subject: tutor.subjects[0], start: slot.start, durationMin: 60 });
    await expect(api.createBooking({ tutorId: tutor.id, kind: 'regular', subject: tutor.subjects[0], start: slot.start, durationMin: 60 })).rejects.toBeInstanceOf(ApiError);
  });

  it('бесплатное знакомство: одно на пару, длительность задаёт репетитор', async () => {
    const candidates = (await api.listTutors({ limit: 20 })).items.filter((t) => t.introMinutes > 0);
    let booked: { tutor: Tutor; minutes: number; price: number } | null = null;
    for (const t of candidates) {
      const slot = await freeSlot(t, 0);
      try {
        const intro = await api.createBooking({ tutorId: t.id, kind: 'intro', subject: t.subjects[0], start: slot.start, durationMin: 20 });
        expect(intro.payment).toBe('none');
        booked = { tutor: t, minutes: intro.durationMin, price: intro.price };
        break;
      } catch (e) {
        // с этим репетитором знакомство у ученицы уже есть в тестовых данных — правило сработало
        if (!(e instanceof ApiError) || !/уже было/.test(e.message)) throw e;
      }
    }
    expect(booked).not.toBeNull();
    expect(booked?.price).toBe(0);
    expect(booked?.minutes).toBe(booked?.tutor.introMinutes);
    const again = await freeSlot(booked!.tutor, 3);
    await expect(api.createBooking({ tutorId: booked!.tutor.id, kind: 'intro', subject: booked!.tutor.subjects[0], start: again.start, durationMin: 20 })).rejects.toThrow(/уже было/);
  });

  it('отмена раньше чем за 4 часа до начала возвращает деньги', async () => {
    const slot = await freeSlot(tutor, 5);
    const lesson = await api.createBooking({ tutorId: tutor.id, kind: 'regular', subject: tutor.subjects[0], start: slot.start, durationMin: 60 });
    const cancelled = await api.cancelLesson(lesson.id, 'Не получается');
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.payment).toBe('refunded');
  });

  it('подтверждение репетитором списывает удержанную сумму', async () => {
    const slot = await freeSlot(tutor, 7);
    const lesson = await api.createBooking({ tutorId: tutor.id, kind: 'regular', subject: tutor.subjects[0], start: slot.start, durationMin: 60 });
    await api.login('anastasia@toprepet.ru', 'demo');
    const confirmed = await api.confirmLesson(lesson.id);
    expect(confirmed.status).toBe('confirmed');
    expect(confirmed.payment).toBe('captured');
  });
});
