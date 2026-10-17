import { describe } from 'vitest';
import { createHttpApi } from './http';
import { defineScenarios } from './scenarios';

/**
 * Те же сценарии, что у мока, но против настоящего сервера. Включается переменной CONTRACT_API_URL
 * (см. docs/backend.md: сервер запускается с CONTRACT_TESTS=1 на чистой базе с seed_demo).
 */
const base = process.env.CONTRACT_API_URL?.replace(/\/$/, '');
const ORIGIN = process.env.CONTRACT_ORIGIN ?? 'http://localhost:5173';

/** fetch с хранилищем cookie: Node не ведёт сессию сам, как браузер. */
function cookieFetch(): typeof fetch {
  const jar = new Map<string, string>();
  return async (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set('Origin', ORIGIN);
    if (jar.size) headers.set('Cookie', [...jar].map(([k, v]) => `${k}=${v}`).join('; '));
    const response = await fetch(input, { ...init, headers, redirect: 'manual' });
    for (const line of response.headers.getSetCookie()) {
      const [pair] = line.split(';');
      const index = pair.indexOf('=');
      const name = pair.slice(0, index).trim();
      const value = pair.slice(index + 1).trim();
      if (/max-age=0|expires=thu, 01 jan 1970/i.test(line) || value === '') jar.delete(name); else jar.set(name, value);
    }
    return response;
  };
}

describe.skipIf(!base)('сервер (CONTRACT_API_URL)', () => {
  defineScenarios('правила сервера совпадают с моком', () => {
    const http = cookieFetch();
    return {
      api: createHttpApi(base as string, http),
      verifyToken: async (email) => {
        const response = await http(`${base}/_test/email-token?email=${encodeURIComponent(email)}&kind=verify`);
        return ((await response.json()) as { token: string }).token;
      },
    };
  });
});
