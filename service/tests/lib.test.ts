import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dative, genitive, instrumental } from '../src/lib/names.ts';
import { PRICE_ERROR, parsePrice, parseYears } from '../src/lib/prices.ts';
import { slugFromName, slugWithSuffix } from '../src/lib/slug.ts';
import { bookingRanges, diffWins, fmtMin, fmtWin, toggleCell, windowError, windowLocked, type Win } from '../src/lib/schedule.ts';

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
