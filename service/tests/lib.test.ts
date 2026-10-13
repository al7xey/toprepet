import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dative, genitive, instrumental } from '../src/lib/names.ts';
import { PRICE_ERROR, parsePrice, parseYears } from '../src/lib/prices.ts';
import { slugFromName, slugWithSuffix } from '../src/lib/slug.ts';
import { bookingRanges, diffWins, fmtMin, fmtWin, toggleCell, windowError, windowLocked, type Win } from '../src/lib/schedule.ts';
import { activeCount, activeFilters, EMPTY, filtersToParams, parseFilters, suggest, timeLabel, without } from '../src/lib/catalog.ts';
import { parseSelection, selectionQuery } from '../src/lib/selection.ts';

test('names: cases used in interface phrases', () => {
  assert.equal(genitive('Анна'), 'Анны');
  assert.equal(dative('Анна'), 'Анне');
  assert.equal(instrumental('Анна'), 'Анной');
  assert.equal(genitive('Дмитрий'), 'Дмитрия');
  assert.equal(instrumental('Игорь'), 'Игорем');
});

test('Р2.1 price: whole rubles from 300 to 20 000', () => {
  assert.deepEqual(parsePrice(''), { value: null, error: null });
  assert.equal(parsePrice('2 000 ₽').value, 2000);
  assert.equal(parsePrice('300').value, 300);
  assert.equal(parsePrice('20000').value, 20000);
  assert.equal(parsePrice('299').error, PRICE_ERROR);
  assert.equal(parsePrice('20001').error, PRICE_ERROR);
  assert.equal(parsePrice('1500,50').error, PRICE_ERROR);
  assert.equal(parseYears('8').value, 8);
  assert.ok(parseYears('71').error);
});

test('Р2.1 slug from a Russian name, suffix when taken', () => {
  assert.equal(slugFromName('Анна Ковалёва'), 'anna-kovaleva');
  assert.equal(slugFromName('  Щукин   Юрий '), 'shchukin-yuriy');
  assert.equal(slugFromName('Ли'), 'tutor-li');
  assert.equal(slugFromName('***'), 'tutor');
  assert.match(slugWithSuffix('anna-kovaleva', () => 0.5), /^anna-kovaleva-[a-z0-9]{4}$/);
});

test('Р3.1 windows: overlap error, 30-minute grid, cell toggling', () => {
  const list: Win[] = [{ id: 1, weekday: 1, start: 720, end: 900 }];
  assert.match(windowError(list, { weekday: 1, start: 840, end: 960 }) ?? '', /пересекается с 12:00–15:00/);
  assert.equal(windowError(list, { weekday: 1, start: 900, end: 960 }), null);
  assert.equal(windowError(list, { weekday: 2, start: 720, end: 900 }), null);
  assert.ok(windowError(list, { weekday: 1, start: 600, end: 600 }));
  assert.ok(windowError(list, { weekday: 1, start: 615, end: 660 }));
  // removing a middle cell splits the window, adding it back restores one window
  const split = toggleCell(list, 1, 780);
  assert.deepEqual(split.map(fmtWin), ['12:00–13:00', '13:30–15:00']);
  const joined = toggleCell(split, 1, 780);
  assert.deepEqual(joined.map(fmtWin), ['12:00–15:00']);
  assert.deepEqual(diffWins(list, joined), { remove: [], add: [] });
  assert.equal(diffWins(list, split).remove.length, 1);
  assert.equal(fmtMin(1440), '24:00');
});

test('Р3.1 bookings lock windows in the tutor zone', () => {
  // Wed 21 Oct 2026 15:00 UTC = 20:00 in Yekaterinburg (UTC+5)
  const start = Date.UTC(2026, 9, 21, 15, 0);
  const busy = bookingRanges(start, start + 60 * 60_000, 'Asia/Yekaterinburg', 'confirmed');
  assert.deepEqual(busy, [{ weekday: 3, start: 1200, end: 1260, status: 'confirmed' }]);
  assert.equal(windowLocked({ weekday: 3, start: 1140, end: 1320 }, busy), true);
  assert.equal(windowLocked({ weekday: 3, start: 600, end: 1200 }, busy), false);
  assert.equal(windowLocked({ weekday: 4, start: 1140, end: 1320 }, busy), false);
  // 23:30–00:30 crosses midnight
  const late = Date.UTC(2026, 9, 21, 18, 30);
  assert.deepEqual(
    bookingRanges(late, late + 60 * 60_000, 'Asia/Yekaterinburg', 'pending').map(b => [b.weekday, b.start, b.end]),
    [
      [3, 1410, 1440],
      [4, 0, 30],
    ],
  );
});

test('catalog: filters survive the address and unknown values are dropped', () => {
  const f = parseFilters(new URLSearchParams('subject=math&goal=ege&price=2000&days=weekday&parts=evening,morning,xx&exp=5&q=%20алгебра%20'));
  assert.deepEqual(f, { subject: 'math', goal: 'ege', price: 2000, days: 'weekday', parts: ['morning', 'evening'], exp: 5, q: 'алгебра' });
  assert.deepEqual(parseFilters(filtersToParams(f)), f);
  assert.deepEqual(parseFilters(new URLSearchParams('price=1234&exp=2&goal=zzz&days=all&subject=<x>')), EMPTY);
  assert.equal(filtersToParams(EMPTY).toString(), '');
});

test('catalog: count, labels and removing one filter', () => {
  const f = parseFilters(new URLSearchParams('subject=math&price=1500&days=weekend&parts=day&q=егэ'));
  assert.equal(activeCount(f), 3);
  assert.equal(timeLabel(f), 'Выходные, день');
  assert.deepEqual(
    activeFilters(f, () => 'Математика').map(a => a.label),
    ['егэ', 'Математика', 'до\u00a01\u00a0500\u00a0₽', 'Выходные, день'],
  );
  const noTime = without(f, 'time');
  assert.equal(noTime.days, null);
  assert.deepEqual(noTime.parts, []);
  assert.equal(without(f, 'q').q, '');
});

test('catalog: suggestions from 2 letters, prefix matches first', () => {
  const list = [{ name: 'Английский язык' }, { name: 'Математика' }, { name: 'Немецкий язык' }];
  assert.deepEqual(suggest(list, 'я'), []);
  assert.deepEqual(suggest(list, 'яз').map(s => s.name), ['Английский язык', 'Немецкий язык']);
  assert.deepEqual(suggest(list, 'не').map(s => s.name), ['Немецкий язык']);
});

test('selection: subject, duration and slot round-trip through the query', () => {
  const ts = Date.UTC(2026, 9, 14, 9, 0);
  const q = selectionQuery({ subject: 'math', dur: 90, slot: ts });
  assert.deepEqual(parseSelection(new URLSearchParams(q.slice(1))), { subject: 'math', dur: 90, slot: ts });
});


test('У7.3 late cancel: only a confirmed lesson, less than 4 hours before the start', async () => {
  const { isLateCancel, freeCancelUntil, awaitsReview, autoCompleteAt, timeLeft, meetingUrlError, shortUrl, reminderTimes } = await import('../src/lib/lessons.ts');
  const H = 3_600_000;
  const start = Date.UTC(2026, 9, 16, 16);
  const lesson = { status: 'confirmed' as const, startsAt: start, endsAt: start + H };
  assert.equal(isLateCancel(lesson, start - 5 * H), false);
  assert.equal(isLateCancel(lesson, start - 4 * H), false);
  assert.equal(isLateCancel(lesson, start - 4 * H + 1), true);
  assert.equal(isLateCancel({ ...lesson, status: 'pending' }, start - H), false);
  assert.equal(freeCancelUntil(start), start - 4 * H);
  // У7.4: «Как прошло?» from the end until 24 hours later
  assert.equal(awaitsReview(lesson, start + H - 1), false);
  assert.equal(awaitsReview(lesson, start + H), true);
  assert.equal(awaitsReview(lesson, autoCompleteAt(lesson.endsAt) - 1), true);
  assert.equal(awaitsReview(lesson, autoCompleteAt(lesson.endsAt)), false);
  assert.deepEqual(reminderTimes(start), [start - 24 * H, start - H]);
  // Р4.1 timer, rounded down
  assert.equal(timeLeft(start, start - 23.9 * H), '23 ч');
  assert.equal(timeLeft(start, start - 40 * 60_000), '40 мин');
  assert.equal(timeLeft(start, start - 1000), '1 мин');
  assert.equal(timeLeft(start, start), null);
  // Р6.1 link: http or https only
  assert.equal(meetingUrlError('https://telemost.yandex.ru/j/4471'), null);
  assert.equal(meetingUrlError('http://zoom.us/j/1'), null);
  assert.ok(meetingUrlError(''));
  assert.ok(meetingUrlError('telemost.yandex.ru/j/4471'));
  assert.ok(meetingUrlError('ftp://x.ru/a'));
  assert.ok(meetingUrlError('https://'));
  assert.ok(meetingUrlError('https://a b.ru'));
  assert.equal(shortUrl('https://telemost.yandex.ru/j/4471'), 'telemost.yandex.ru/j/4471');
  assert.equal(shortUrl('https://example.com/' + 'x'.repeat(50)).length, 34);
});

test('У4.3 + У7.2 notification texts for each side', async () => {
  const { noteText } = await import('../src/lib/notifications.ts');
  const base = {
    tz: 'Europe/Moscow',
    bookingId: 7,
    startsAt: Date.UTC(2026, 9, 16, 16),
    tutorName: 'Анна Ковалёва',
    studentName: 'Ирина Петрова',
    participantName: 'Миша',
    cancelledBy: null,
  };
  const s = (kind: string) => noteText({ ...base, kind, role: 'student' });
  const t = (kind: string) => noteText({ ...base, kind, role: 'tutor' });
  assert.deepEqual(s('booking_confirmed'), { text: 'Анна подтвердила занятие Пт 16 окт, 19:00', href: '/cabinet/lessons/7' });
  assert.equal(s('booking_declined').text, 'Анна отклонила запись на Пт 16 окт');
  assert.equal(s('booking_autocancelled').text, 'Запись на Пт 16 окт отменена: Анна не ответила');
  assert.equal(s('reminder_1h').text, 'Через час занятие с Анной');
  assert.equal(t('reminder_1h').text, 'Через час занятие с Мишей');
  assert.deepEqual(t('booking_created'), { text: 'Новая запись: Миша, Пт 16 окт, 19:00', href: '/tutor/bookings/7' });
  assert.equal(t('booking_cancelled').text, 'Ирина отменила занятие Пт 16 окт, 19:00');
  assert.equal(t('link_missing').href, '/tutor/lessons/7');
  assert.equal(noteText({ ...base, tutorName: 'Дмитрий Орлов', kind: 'booking_declined', role: 'student' }).text, 'Дмитрий отклонил запись на Пт 16 окт');
});

/* ---------- iteration 5 ---------- */

test('Метрика: no counter id or an opt-out means no script and no calls; with an id goals reach ym()', async () => {
  const { counterId, createMetrika, CONSENT_KEY } = await import('../src/lib/metrika.ts');
  assert.equal(counterId(undefined), null);
  assert.equal(counterId(''), null);
  assert.equal(counterId('abc'), null);
  assert.equal(counterId(' 112922088 '), 112922088);

  const fakeHost = (stored: string | null = null) => {
    const appended: { src?: string }[] = [];
    const host = {
      ym: undefined as undefined | ((...a: unknown[]) => void),
      document: { head: { append: (el: unknown) => void appended.push(el as { src?: string }) }, createElement: () => ({}) as { src?: string } },
      localStorage: { getItem: (k: string) => (k === CONSENT_KEY ? stored : null) },
      location: { origin: 'https://toprepet.ru', pathname: '/teachers/' },
    };
    return { host, appended };
  };

  const off = fakeHost();
  const none = createMetrika(null, () => off.host);
  none.goal('booking_created');
  none.hit('Каталог');
  assert.equal(none.enabled(), false);
  assert.equal(off.appended.length, 0);
  assert.equal(off.host.ym, undefined);

  const optedOut = fakeHost(JSON.stringify({ version: 1, choice: 'necessary', at: 1 }));
  const quiet = createMetrika(112922088, () => optedOut.host);
  quiet.goal('signup', { role: 'student' });
  assert.equal(optedOut.appended.length, 0);

  const on = fakeHost();
  const calls: unknown[][] = [];
  on.host.ym = (...a: unknown[]) => void calls.push(a);
  const m = createMetrika(112922088, () => on.host);
  m.goal('booking_confirmed');
  m.goal('signup', { role: 'tutor' });
  m.hit('Каталог');
  m.hit('Каталог');
  assert.deepEqual(calls[0].slice(0, 2), [112922088, 'init']);
  assert.deepEqual(calls[1], [112922088, 'reachGoal', 'booking_confirmed', undefined]);
  assert.deepEqual(calls[2], [112922088, 'reachGoal', 'signup', { role: 'tutor' }]);
  assert.deepEqual(calls[3].slice(0, 3), [112922088, 'hit', 'https://toprepet.ru/teachers/']);
  assert.equal(calls.length, 4, 'the same page is counted once');

  // without a preloaded ym the tag is added once, calls wait in its queue
  const fresh = fakeHost();
  const q = createMetrika(5, () => fresh.host);
  q.goal('lesson_ok');
  q.goal('problem_reported');
  assert.equal(fresh.appended.length, 1);
  assert.equal(fresh.appended[0].src, 'https://mc.yandex.ru/metrika/tag.js?id=5');
  assert.equal((fresh.host.ym as unknown as { a: unknown[][] }).a.length, 3);
});

test('А1, А2, А3: history and journal texts, day range by Moscow, overdue problems', async () => {
  const { eventText, journalText, dayRange, isOverdue, lessonNo } = await import('../src/lib/admin.ts');
  const who = { studentId: 's', studentName: 'Ирина Петрова', tutorName: 'Анна Ковалёва' };
  const e = (to: 'pending' | 'confirmed' | 'declined' | 'cancelled' | 'completed', actorId: string | null, note: string | null = null) => ({ at: 0, actorId, from: null, to, note });
  assert.equal(eventText(e('pending', 's'), who), 'запись создана, ждёт подтверждения');
  assert.equal(eventText(e('confirmed', 't'), who), 'Анна подтвердила');
  assert.equal(eventText(e('declined', 't', 'Это время уже занято'), who), 'Анна отклонила: «Это время уже занято»');
  assert.equal(eventText(e('cancelled', 's'), who), 'ученик отменил');
  assert.equal(eventText(e('cancelled', null, 'автоотмена'), who), 'отменена автоматически: репетитор не ответил вовремя');
  assert.equal(eventText(e('completed', null, 'решение по проблеме'), who), 'закрыто решением по проблеме');
  assert.equal(eventText(e('completed', 's'), who), 'ученик подтвердил, что всё прошло хорошо');
  assert.equal(eventText(e('confirmed', 't'), { ...who, tutorName: 'Дмитрий' }), 'Дмитрий подтвердил');
  assert.equal(journalText('hide_tutor', 'Светлана', 'Павел Ким', 'Фото не по правилам'), 'Светлана скрыла анкету: Павел Ким: «Фото не по правилам»');
  assert.equal(journalText('resolve_problem', 'Олег', 'B-2040', 'Ок'), 'Олег решил проблему по занятию B-2040: «Ок»');
  assert.equal(lessonNo(2048), 'B-2048');
  const [from, to] = dayRange('2026-10-16', 'Europe/Moscow')!;
  assert.equal(new Date(from).toISOString(), '2026-10-15T21:00:00.000Z');
  assert.equal(to - from, 24 * 3_600_000);
  assert.equal(dayRange('', 'Europe/Moscow'), null);
  assert.equal(dayRange('16.10.2026', 'Europe/Moscow'), null);
  assert.equal(isOverdue(1000, 999), false);
  assert.equal(isOverdue(1000, 1000), true);
});
