import type { Db, Lesson } from './types';
import { getDb, mutate } from './store';
import { chatEvent, displayName, firstNameOf, notify, sendEmail, tutorById, userById } from './core';
import { internals } from './booking';
import { chargeSaved, PaymentDeclined, payoutTo } from './gateway';
import { SERIES_CHARGE_HOURS, UNREAD_EMAIL_MIN, ANSWER_HOURS, FREE_CANCEL_HOURS, tokenTime as T } from './rules';
import { SUPPORT_ID } from './chat';
import { fmtMoney } from '../lib/money';
import { HOUR, MIN, fmtDayTime, fmtTime, now, onClockChange } from '../lib/time';
import { uid } from '../lib/text';

/* Background jobs of the marketplace: in production they run as cron on the server.
   Every job is idempotent and only changes data whose time has come. */

const needsWork = (d: Db, at: number) =>
  d.lessons.some(l =>
    (l.status === 'pending' && at > l.confirmDeadline) ||
    (l.status === 'confirmed' && l.seriesId && !l.paymentId && at >= l.start - SERIES_CHARGE_HOURS * HOUR) ||
    (l.status === 'unpaid' && at >= l.start - FREE_CANCEL_HOURS * HOUR) ||
    (l.status === 'confirmed' && ((!l.reminders.h24 && at >= l.start - 24 * HOUR && at < l.start) || (!l.reminders.h1 && at >= l.start - HOUR && at < l.start) || (!l.link && !l.reminders.link15 && at >= l.start - 15 * MIN && at < l.start))) ||
    (l.status === 'confirmed' && l.kind === 'intro' && at >= l.end) ||
    (l.status === 'confirmed' && at >= l.end + ANSWER_HOURS * HOUR),
  ) ||
  d.series.some(s => s.status === 'pending' && at > s.confirmDeadline) ||
  d.reservations.some(r => r.expiresAt <= at) ||
  d.transfers.some(t => t.status === 'waiting' && t.dueAt <= at && transferReady(d, t.lessonId, at) && !!tutorById(d, t.tutorId)?.payout) ||
  d.requests.some(r => r.status === 'active' && (r.expiresAt ?? Infinity) <= at) ||
  d.messages.some(m => unreadEmailDue(d, m, at));

function transferReady(d: Db, lessonId: string, at: number) {
  const l = d.lessons.find(x => x.id === lessonId);
  if (!l) return false;
  if (l.status === 'completed' || l.status === 'cancelled') return true;
  if (l.status === 'no_show') return !l.disputeId && at >= (l.noShowAt ?? 0) + 24 * HOUR;
  return false;
}

function unreadEmailDue(_d: Db, m: Db['messages'][number], at: number) {
  if (m.readAt || m.emailed || m.authorId === 'system' || m.kind === 'event') return false;
  if (at - m.createdAt < UNREAD_EMAIL_MIN * MIN) return false;
  return at - m.createdAt < 3 * 24 * HOUR; // do not email ancient seed messages
}

function recipientOf(d: Db, m: Db['messages'][number]) {
  const c = d.chats.find(x => x.id === m.chatId);
  if (!c) return undefined;
  if (c.kind === 'support') return m.authorId === SUPPORT_ID ? c.userId : undefined;
  return m.authorId === c.studentId ? c.tutorId : c.studentId;
}

export function tick(at = now()) {
  const d0 = getDb();
  if (!needsWork(d0, at)) return;
  mutate(d => {
    const { paymentOp, setTransfer, patchLesson, addPayment, cancelLessonInDraft } = internals;
    d.reservations = d.reservations.filter(r => r.expiresAt > at);

    for (const s of d.series) {
      if (s.status === 'pending' && at > s.confirmDeadline) {
        d.series[d.series.findIndex(x => x.id === s.id)] = { ...s, status: 'expired' };
        notify(d, s.studentId, { icon: 'clock', title: 'Серия не подтверждена', text: `${firstNameOf(d, s.tutorId)} не ответил(а) вовремя. Заморозка снята.`, to: `/my/series/${s.id}`, tone: 'bad' }, at);
      }
    }

    for (const l0 of d.lessons) {
      let l: Lesson = l0;
      const student = userById(d, l.studentId);
      const tutor = tutorById(d, l.tutorId);
      if (!student || !tutor) continue;

      // 1. no answer from the tutor → automatic cancellation
      if (l.status === 'pending' && at > l.confirmDeadline) {
        l = patchLesson(d, l.id, { status: 'expired' });
        paymentOp(d, l.paymentId, 'release', undefined, 'Репетитор не подтвердил вовремя', at);
        notify(d, l.studentId, { icon: 'clock', title: `${firstNameOf(d, l.tutorId)} не подтвердил(а) запись`, text: `${T(l.start)}. Запись отменилась сама${l.paymentId ? ', заморозка снята' : ''}. Выберите другое время или репетитора.`, to: `/my/lessons/${l.id}`, tone: 'bad' }, at);
        notify(d, l.tutorId, { icon: 'clock', title: 'Запись отменилась', text: `${l.participant.name}, ${T(l.start)}: вы не ответили за 24 часа.`, to: `/tutor/lessons/${l.id}` }, at);
        continue;
      }

      // 2. series: charge 24 h before the lesson
      if (l.status === 'confirmed' && l.seriesId && !l.paymentId && at >= l.start - SERIES_CHARGE_HOURS * HOUR) {
        const s = d.series.find(x => x.id === l.seriesId);
        const card = student.cards.find(c => c.id === s?.cardId) ?? student.cards[0];
        try {
          if (!card) throw new PaymentDeclined('Нет сохранённой карты');
          chargeSaved(card.last4);
          const p = addPayment(d, l.studentId, l.id, l.studentPrice, { kind: 'card', last4: card.last4, brand: card.brand, cardId: card.id }, 'charged', at);
          l = patchLesson(d, l.id, { paymentId: p.id, reminders: { ...l.reminders, charge: true } });
          setTransfer(d, l, { status: 'waiting', dueAt: l.end + 24 * HOUR });
          notify(d, l.studentId, { icon: 'card', title: `Списали ${fmtMoney(l.studentPrice)}`, text: `За занятие серии ${T(l.start)} с картой •• ${card.last4}.`, to: `/my/series/${l.seriesId}` }, at);
        } catch (e) {
          l = patchLesson(d, l.id, { status: 'unpaid', reminders: { ...l.reminders, charge: true } });
          const until = l.start - FREE_CANCEL_HOURS * HOUR;
          notify(d, l.studentId, { icon: 'warn', title: `Не получилось списать ${fmtMoney(l.studentPrice)}`, text: `За ${T(l.start)}. Оплатите до ${T(until)}, иначе занятие отменится.`, to: `/my/series/${l.seriesId}`, tone: 'bad' }, at);
          sendEmail(d, l.studentId, { subject: 'Не прошло списание за занятие', title: `Оплатите занятие до ${fmtDayTime(until, student.tz)}`, body: `${e instanceof Error ? e.message : 'Банк отклонил списание'}. Занятие ${fmtDayTime(l.start, student.tz)} с ${tutor.name} отменится, если не оплатить вовремя.`, action: { label: 'Оплатить', to: `/my/series/${l.seriesId}` } }, at);
        }
        continue;
      }

      // 3. unpaid series lesson → cancelled 4 h before
      if (l.status === 'unpaid' && at >= l.start - FREE_CANCEL_HOURS * HOUR) {
        cancelLessonInDraft(d, l, 'system', 'Не оплачено вовремя', at);
        notify(d, l.studentId, { icon: 'x', title: 'Занятие отменено', text: `${T(l.start)}: оплата не прошла вовремя.`, to: `/my/series/${l.seriesId}`, tone: 'bad' }, at);
        notify(d, l.tutorId, { icon: 'x', title: 'Занятие серии отменено', text: `${l.participant.name}, ${T(l.start)}: ученик не оплатил.`, to: '/tutor/lessons' }, at);
        continue;
      }

      if (l.status === 'confirmed' && at < l.start) {
        const rem = { ...l.reminders };
        let changed = false;
        if (!rem.h24 && at >= l.start - 24 * HOUR) {
          rem.h24 = true;
          changed = true;
          if (at < l.start - HOUR) {
            notify(d, l.studentId, { icon: 'clock', title: `Завтра ${l.kind === 'intro' ? 'знакомство' : 'урок'} с ${firstNameOf(d, l.tutorId)}`, text: `${T(l.start)}. Ссылку репетитор пришлёт перед началом.`, to: `/my/lessons/${l.id}` }, at);
            notify(d, l.tutorId, { icon: 'clock', title: `Завтра урок: ${l.participant.name}`, text: `${T(l.start)}. Не забудьте добавить ссылку на звонок.`, to: `/tutor/lessons/${l.id}` }, at);
            if (student.settings.lessonReminders) sendEmail(d, l.studentId, { subject: 'Напоминание об уроке', title: `Урок с ${tutor.name} через 24 часа`, body: `${fmtDayTime(l.start, student.tz)}, ${l.minutes} мин.`, action: { label: 'Открыть урок', to: `/my/lessons/${l.id}` }, reason: 'Напоминания об уроках можно отключить в настройках.' }, at);
          }
        }
        if (!rem.h1 && at >= l.start - HOUR) {
          rem.h1 = true;
          changed = true;
          notify(d, l.studentId, { icon: 'clock', title: `Через 1 час урок с ${firstNameOf(d, l.tutorId)}`, text: l.link ? 'Ссылка уже в карточке урока.' : 'Ссылка появится перед началом, пришлём её на сайт и почту.', to: `/my/lessons/${l.id}`, tone: 'action' }, at);
          if (student.settings.lessonReminders) sendEmail(d, l.studentId, { subject: 'Урок через час', title: `Через 1 час урок с ${tutor.name}`, body: `Начало в ${fmtTime(l.start, student.tz)}.`, action: { label: 'Открыть урок', to: `/my/lessons/${l.id}` }, reason: 'Напоминания об уроках можно отключить в настройках.' }, at);
        }
        if (!l.link && !rem.link15 && at >= l.start - 15 * MIN) {
          rem.link15 = true;
          changed = true;
          notify(d, l.tutorId, { icon: 'video', title: `Урок с ${l.participant.name} через 15 минут`, text: 'А ссылки ещё нет. Вставьте её в карточку урока, ученик получит уведомление.', to: `/tutor/lessons/${l.id}`, tone: 'action' }, at);
          sendEmail(d, l.tutorId, { subject: 'Нет ссылки на урок', title: `Урок через 15 минут, а ссылки нет`, body: `${l.participant.name}, ${fmtTime(l.start, tutor.tz)} по вашему времени.`, action: { label: 'Добавить ссылку', to: `/tutor/lessons/${l.id}` } }, at);
        }
        if (changed) l = patchLesson(d, l.id, { reminders: rem });
      }

      // 4. free intro is done right after its end
      if (l.status === 'confirmed' && l.kind === 'intro' && at >= l.end) {
        l = patchLesson(d, l.id, { status: 'completed', completedAt: l.end });
        continue;
      }

      // 5. no answer to «Урок состоялся?» within 24 h → counted automatically
      if (l.status === 'confirmed' && at >= l.end + ANSWER_HOURS * HOUR) {
        l = patchLesson(d, l.id, { status: 'completed', completedAt: at });
        if (l.tutorPrice) setTransfer(d, l, { status: 'waiting', dueAt: at });
      }
    }

    // 6. transfers to tutors, one per lesson
    d.transfers.forEach((t, i) => {
      if (t.status !== 'waiting' || t.dueAt > at || !transferReady(d, t.lessonId, at)) return;
      const tutor = tutorById(d, t.tutorId);
      if (!tutor?.payout) return;
      try {
        payoutTo(tutor.payout.card);
        d.transfers[i] = { ...t, status: 'sent', sentAt: at, failReason: undefined };
        const l = d.lessons.find(x => x.id === t.lessonId);
        notify(d, t.tutorId, { icon: 'wallet', title: `Перевели ${fmtMoney(t.amount)}`, text: `За урок${l ? ` ${T(l.start)} (${l.participant.name})` : ''} на карту ${tutor.payout.card.slice(-7)}. Чек в «Моём налоге» сформирован.`, to: '/tutor/finance', tone: 'ok' }, at);
      } catch (e) {
        d.transfers[i] = { ...t, status: 'failed', failReason: e instanceof Error ? e.message : 'Перевод не прошёл' };
        notify(d, t.tutorId, { icon: 'warn', title: `Перевод ${fmtMoney(t.amount)} не прошёл`, text: `${e instanceof Error ? e.message : ''}. Укажите другую карту, и мы переведём снова.`, to: '/tutor/payouts/setup', tone: 'bad' }, at);
      }
    });

    // 7. requests: 14 days are over
    d.requests.forEach((r, i) => {
      if (r.status !== 'active' || (r.expiresAt ?? Infinity) > at) return;
      d.requests[i] = { ...r, status: 'expired', expiryAsked: true };
      const count = d.responses.filter(x => x.requestId === r.id).length;
      notify(d, r.studentId, { icon: 'clock', title: `Заявка «${r.title}» закончилась`, text: `За 14 дней пришло откликов: ${count}. Продлить ещё на 14 дней?`, to: `/my/requests?expired=${r.id}`, tone: 'action' }, at);
      sendEmail(d, r.studentId, { subject: 'Заявка закончилась', title: `Заявка «${r.title}» закончилась`, body: `За 14 дней пришло откликов: ${count}. Продлите заявку ещё на 14 дней или закройте её. Отклики останутся в чатах в любом случае.`, action: { label: 'Продлить или закрыть', to: `/my/requests?expired=${r.id}` } }, at);
    });

    // 8. unread messages → e-mail after 15 minutes
    d.messages.forEach((m, i) => {
      if (!unreadEmailDue(d, m, at)) return;
      d.messages[i] = { ...m, emailed: true };
      const to = recipientOf(d, m);
      const u = userById(d, to);
      if (!u || !u.settings.emailUnread) return;
      const authorName = m.authorId === SUPPORT_ID ? 'Поддержка TopRepet' : displayName(d, m.authorId);
      const c = d.chats.find(x => x.id === m.chatId)!;
      sendEmail(d, u.id, {
        subject: `Новое сообщение от ${authorName}`,
        title: `${authorName} написал(а) вам`,
        body: '',
        quote: { author: authorName, text: m.kind === 'file' ? `Файл: ${m.file?.name}` : m.kind === 'proposal' ? 'Предлагает время для урока' : (m.text ?? ''), time: fmtTime(m.createdAt, u.tz) },
        action: { label: 'Ответить в TopRepet', to: c.kind === 'support' ? '/support' : `/messages/${c.id}` },
        reason: 'Письмо пришло, потому что сообщение не прочитано 15 минут. Не хотите такие письма — отключите их в настройках.',
      }, at);
    });
  });
}

/* note in the chat when an automatic action happened; exported for the seed */
export function systemNote(d: Db, studentId: string, tutorId: string, text: string, at = now()) {
  chatEvent(d, studentId, tutorId, { icon: 'info', text }, at);
  return uid('n');
}

let started = false;
export function startScheduler() {
  if (started) return;
  started = true;
  const run = () => {
    try {
      tick();
    } catch (e) {
      console.error('scheduler', e);
    }
  };
  run();
  window.setInterval(run, 15_000);
  onClockChange(run);
}
