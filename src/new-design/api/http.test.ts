import { expect, it } from 'vitest';
import { createHttpApi } from './http';

it('sends the booking retry key as a header, with a bounded request', async () => {
  let request: RequestInit | undefined;
  const api = createHttpApi('https://example.test', async (_url, init) => {
    request = init;
    return new Response('{}', { headers: { 'Content-Type': 'application/json' } });
  });
  await api.createBooking({ tutorId: 't', kind: 'regular', start: '2030-01-01T12:00:00Z', durationMin: 60, subject: 'English', idempotencyKey: 'stable-retry-key' });
  expect(new Headers(request?.headers).get('Idempotency-Key')).toBe('stable-retry-key');
  expect(JSON.parse(String(request?.body))).not.toHaveProperty('idempotencyKey');
  expect(request?.signal).toBeInstanceOf(AbortSignal);
});
