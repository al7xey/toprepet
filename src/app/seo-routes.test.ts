import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import privatePages from '../shared/config/private-seo-pages.json';

test('каждый маршрут авторизации и кабинетов имеет собственные метаданные', () => {
  const routes = ['auth', 'student', 'tutor', 'requests', 'tutorprofile', 'admin'].flatMap((file) => {
    const source = readFileSync(`src/new-design/routes/${file}.tsx`, 'utf8');
    return [...source.matchAll(/<Route path="([^"]+)"/g)].map((match) => match[1]);
  });
  for (const route of routes) expect(privatePages, route).toHaveProperty(route);
  expect(new Set(Object.values(privatePages)).size).toBe(Object.keys(privatePages).length);
});
