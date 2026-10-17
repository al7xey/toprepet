import { describe, expect, it } from 'vitest';
import { safeNext } from './safeNext';

describe('safeNext', () => {
  it('пропускает внутренние адреса с параметрами', () => {
    expect(safeNext('/book/english?kind=regular&start=2026-10-17T10%3A00%3A00.000Z', '/me/lessons')).toBe('/book/english?kind=regular&start=2026-10-17T10%3A00%3A00.000Z');
    expect(safeNext('/me/lessons', '/')).toBe('/me/lessons');
  });
  it('отбрасывает чужие и подозрительные адреса', () => {
    for (const bad of ['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', '', null, undefined]) {
      expect(safeNext(bad as string | null | undefined, '/me/lessons')).toBe('/me/lessons');
    }
  });
  it('не возвращает обратно на страницы входа', () => {
    expect(safeNext('/login?next=/x', '/me/lessons')).toBe('/me/lessons');
    expect(safeNext('/signup', '/me/lessons')).toBe('/me/lessons');
  });
});
