import { beforeAll, describe, expect, it } from 'vitest';
import { ApiError, type Api } from './contract';
import { studentPriceOf } from './mock';
import type { Slot, Tutor } from './types';

const HOUR = 3_600_000;

export interface ScenarioContext {
  api: Api;
  /** Токен из письма с подтверждением почты: мок отдаёт любой, настоящий сервер — выданный в письме. */
  verifyToken: (email: string) => Promise<string>;
  /** Токен из письма со сбросом пароля (мок отдаёт любой). */
  resetToken: (email: string) => Promise<string>;
}

/**
 * Общие сценарии правил продукта. Их проходят обе реализации API: мок (`mock.test.ts`) и настоящий сервер (`http.contract.test.ts`),
 * так что поведение бэкенда не расходится с тем, на чём построен фронтенд.
 */
export function defineScenarios(title: string, make: () => ScenarioContext) {
  /** Первое свободное время не раньше чем через 6 часов (чтобы отмена была бесплатной). */
  const freeSlotOf = (api: Api) => async (tutor: Tutor, skip = 0): Promise<Slot> => {
    const slots = await api.getTutorSlots(tutor.id, new Date(Date.now() + 6 * HOUR).toISOString(), 14);
    const found = slots.filter((s) => s.available && new Date(s.start).getTime() > Date.now() + 6 * HOUR)[skip];
    if (!found) throw new Error('нет свободных слотов для теста');
    return found;
  };

  describe(title, () => {
    const { api, verifyToken, resetToken } = make();
    const freeSlot = freeSlotOf(api);
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
      expect(lesson.tutorPrice).toBe(lesson.price); // ученик не видит цену репетитора (сервисный сбор скрыт)
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

    it('новый ученик: регистрация, подтверждение почты, онбординг, запись на знакомство и отмена', async () => {
      const created = await api.signup({ role: 'student', name: 'Мария', email: 'maria.test@mail.ru', password: 'password1' });
      expect(created.emailVerified).toBe(false);
      expect(created.onboarded).toBe(false);
      expect((await api.verifyEmail(await verifyToken('maria.test@mail.ru'))).emailVerified).toBe(true);
      expect((await api.completeOnboarding({ forWhom: 'Для себя', subjects: ['Математика'], goal: 'Экзамен' })).onboarded).toBe(true);
      await expect(api.signup({ role: 'student', name: 'Мария', email: 'MARIA.test@mail.ru', password: 'password1' })).rejects.toThrow(/уже есть/);
      const candidates = (await api.listTutors({ limit: 20 })).items.filter((t) => t.introMinutes > 0);
      const t = candidates[0];
      const slot = await freeSlot(t, 9);
      const intro = await api.createBooking({ tutorId: t.id, kind: 'intro', subject: t.subjects[0], start: slot.start, durationMin: 20 });
      expect(intro.status).toBe('pending');
      expect((await api.cancelLesson(intro.id, 'Изменились планы')).status).toBe('cancelled');
      await expect(api.verifyEmail('  ')).rejects.toBeInstanceOf(ApiError);
    });

    it('новый репетитор: черновик, расписание, публикация и запись к нему', async () => {
      const created = await api.signup({ role: 'tutor', name: 'Ирина', email: 'irina.test@mail.ru', password: 'password1' });
      expect(created.tutorId).toBeTruthy();
      const draft = await api.getMyProfile();
      expect(draft.status).toBe('draft');
      expect((await api.listTutors({ limit: 50 })).items.some((t) => t.id === created.tutorId)).toBe(false);
      await expect(api.submitMyProfile()).rejects.toThrow(/Заполните/);
      await api.saveMyProfile({ headline: 'Репетитор по математике', about: 'Преподаю математику десять лет', subjects: ['Математика'], price: 1500, introMinutes: 15 });
      await expect(api.submitMyProfile()).rejects.toThrow(/расписании/);
      await api.saveWeek({ days: [{ weekday: 1, intervals: [{ from: '10:00', to: '14:00' }] }, ...[2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, intervals: [] }))] });
      expect((await api.submitMyProfile()).status).toBe('review');
      expect((await api.listTutors({ limit: 50 })).items.some((t) => t.id === created.tutorId)).toBe(false);
      await api.login('admin@toprepet.ru', 'demo');
      expect((await api.adminProfileQueue()).some((q) => q.tutorId === created.tutorId)).toBe(true);
      await expect(api.adminModerateProfile(created.tutorId as string, false)).rejects.toThrow(/исправить/);
      expect((await api.adminModerateProfile(created.tutorId as string, true)).status).toBe('published');
      const listed = (await api.listTutors({ limit: 50 })).items.find((t) => t.id === created.tutorId);
      expect(listed?.studentPrice).toBe(studentPriceOf(1500));
      expect(listed?.introMinutes).toBe(15);
    });

    it('исключения расписания закрывают и открывают слоты', async () => {
      await api.login('anastasia@toprepet.ru', 'demo');
      const tutorId = (await api.me())?.tutorId as string;
      const from = new Date(Date.now() + 2 * 24 * HOUR);
      const slots = await api.getTutorSlots(tutorId, from.toISOString(), 1);
      const day = slots.length ? slots[0].start : null;
      if (!day) return; // воскресенье без окон
      const key = `${new Date(day).getFullYear()}-${String(new Date(day).getMonth() + 1).padStart(2, '0')}-${String(new Date(day).getDate()).padStart(2, '0')}`;
      await api.saveException({ date: key, kind: 'off', intervals: [] });
      expect(await api.getTutorSlots(tutorId, from.toISOString(), 1)).toHaveLength(0);
      await api.deleteException(key);
      expect((await api.getTutorSlots(tutorId, from.toISOString(), 1)).length).toBe(slots.length);
    });

    it('заявка: описание обязательно, отклик репетитора, запись из отклика закрывает заявку', async () => {
      await api.login('olga@mail.ru', 'demo');
      await expect(api.createRequest({ subject: 'Математика', goal: 'ОГЭ', level: '9 класс', budgetMax: null, schedule: ['Будни вечером'], description: 'коротко' })).rejects.toThrow(/подробнее/);
      const request = await api.createRequest({ subject: 'Математика', goal: 'ОГЭ', level: '9 класс', budgetMax: 2000, schedule: ['Будни вечером'], description: 'Нужно подтянуть геометрию и вторую часть ОГЭ.' });
      expect(request.status).toBe('open');
      await api.login('anastasia@toprepet.ru', 'demo');
      expect((await api.listOpenRequests()).some((r) => r.id === request.id)).toBe(true);
      await expect(api.respondToRequest(request.id, { price: 1500, message: 'Позвоните мне +7 912 345 67 89, всё обсудим', slots: [] })).rejects.toThrow(/запрещены/);
      const slotTime = (await api.getTutorSlots((await api.me())?.tutorId as string, new Date().toISOString(), 14)).find((x) => x.available)?.start as string;
      const response = await api.respondToRequest(request.id, { price: 1500, message: 'Здравствуйте! Начнём с диагностики и составим план занятий.', slots: [slotTime] });
      expect(response.price).toBe(studentPriceOf(1500));
      await expect(api.respondToRequest(request.id, { price: 1500, message: 'Здравствуйте! Ещё один отклик от меня на заявку.', slots: [] })).rejects.toThrow(/уже откликнулись/);
      await api.login('olga@mail.ru', 'demo');
      expect(await api.listResponses(request.id)).toHaveLength(1);
      const tutorId = response.tutorId;
      const t = await api.getTutor(tutorId);
      await api.createBooking({ tutorId, kind: 'regular', subject: t.subjects[0], start: slotTime, durationMin: 60, requestId: request.id });
      expect((await api.getRequest(request.id)).status).toBe('booked');
      expect((await api.listResponses(request.id))[0].status).toBe('accepted');
    });

    it('чужую заявку и чужой диалог открыть нельзя; контакты в чате запрещены; блок закрывает диалог', async () => {
      await api.login('olga@mail.ru', 'demo');
      const chat = await api.openConversation('english');
      await expect(api.sendMessage(chat.id, 'Мой телефон 8 (912) 345-67-89')).rejects.toThrow(/запрещены/);
      await expect(api.sendMessage(chat.id, 'Пишите в t.me/someone')).rejects.toThrow(/запрещены/);
      const sent = await api.sendMessage(chat.id, 'Здравствуйте! Есть время в среду?');
      expect(sent.kind).toBe('text');
      await api.signup({ role: 'student', name: 'Пётр', email: 'petr.test@mail.ru', password: 'password1' });
      await expect(api.getConversation(chat.id)).rejects.toThrow(/не найден/);
      await expect(api.getRequest('r-1')).rejects.toThrow(/не найдена/);
      await api.login('olga@mail.ru', 'demo');
      await api.reportConversation(chat.id, 'Спам', true);
      await expect(api.sendMessage(chat.id, 'Ещё одно сообщение')).rejects.toThrow(/заблокирован/);
    });

    it('отзыв: одна оценка на урок, публикация после проверки, рейтинг пересчитывается', async () => {
      await api.login('olga@mail.ru', 'demo');
      const review = await api.createReview('l-4', 5, 'Очень понятно объясняет, после урока всё стало ясно.');
      expect(review.status).toBe('pending');
      await expect(api.createReview('l-4', 4, 'Ещё один отзыв на тот же урок')).rejects.toThrow(/уже/);
      await expect(api.createReview('l-1', 4, 'Урок ещё не прошёл')).rejects.toThrow(/после/);
      expect((await api.getTutorReviews(review.tutorId)).some((r) => r.id === review.id)).toBe(false);
      await api.login('admin@toprepet.ru', 'demo');
      expect((await api.adminReviewQueue()).some((r) => r.id === review.id)).toBe(true);
      await api.adminModerateReview(review.id, true);
      expect((await api.getTutorReviews(review.tutorId)).some((r) => r.id === review.id)).toBe(true);
      expect((await api.getTutor(review.tutorId)).rating).toBe(5);
      await api.login('anastasia@toprepet.ru', 'demo');
      expect((await api.replyReview(review.id, 'Спасибо!')).reply).toBe('Спасибо!');
    });

    it('проблема с уроком: спор, ответ репетитора, возврат денег решением поддержки', async () => {
      await api.login('olga@mail.ru', 'demo');
      await expect(api.reportProblem({ lessonId: 'l-5', reason: 'Не было связи', text: 'Давно было' })).rejects.toThrow(/24 часов/);
      const dispute = await api.reportProblem({ lessonId: 'l-7', reason: 'Не пришёл репетитор', text: 'Ждали 20 минут, никто не вышел на связь.' });
      expect((await api.getLesson('l-7')).status).toBe('disputed');
      await api.login('anastasia@toprepet.ru', 'demo');
      expect((await api.listNotifications()).some((n) => n.link === `/tutor/disputes/${dispute.id}`)).toBe(true);
      expect((await api.replyDispute(dispute.id, 'Была на связи, ученик не подключился.')).status).toBe('tutor_replied');
      await api.login('admin@toprepet.ru', 'demo');
      expect((await api.adminDisputes()).some((d) => d.id === dispute.id)).toBe(true);
      expect((await api.adminResolveDispute(dispute.id, 'refund')).status).toBe('resolved_refund');
      await api.login('olga@mail.ru', 'demo');
      expect((await api.getLesson('l-7')).payment).toBe('refunded');
      expect((await api.listNotifications()).some((n) => n.title === 'Спор решён')).toBe(true);
    });

    it('сброс пароля: письмо, новый пароль, вход только с новым', async () => {
      await api.signup({ role: 'student', name: 'Дарья', email: 'reset.test@mail.ru', password: 'password1' });
      await api.logout();
      await api.requestPasswordReset('reset.test@mail.ru');
      const token = await resetToken('reset.test@mail.ru');
      await expect(api.confirmPasswordReset(token, 'short')).rejects.toBeInstanceOf(ApiError);
      await api.confirmPasswordReset(token, 'newpassword1');
      await expect(api.login('reset.test@mail.ru', 'password1')).rejects.toThrow(/Неверная/);
      expect((await api.login('reset.test@mail.ru', 'newpassword1')).email).toBe('reset.test@mail.ru');
      await api.logout();
      await expect(api.confirmPasswordReset(token, 'another12345')).rejects.toThrow(/устарела/);
    });
  });
}
