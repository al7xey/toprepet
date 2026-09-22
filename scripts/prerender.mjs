import {
  readFile,
  writeFile,
  mkdir,
} from 'node:fs/promises';

import {
  dirname,
  resolve,
} from 'node:path';

import { pathToFileURL } from 'node:url';

const distIndexPath = resolve('dist/index.html');
const serverEntryPath = resolve('dist-server/entry-server.js');

const template = await readFile(distIndexPath, 'utf8');

const { render } = await import(
  pathToFileURL(serverEntryPath).href
);

const rootPlaceholder = '<div id="root"></div>';

if (!template.includes(rootPlaceholder)) {
  throw new Error(
    'Не найден <div id="root"></div> в dist/index.html',
  );
}

const routes = [
  '/',
  '/lessons',
  '/contact',
  '/free-intro',

  '/teacher/informatics',
  '/teacher/english',
  '/teacher/russian',
  '/teacher/chemistry-biology',
  '/teacher/mathematics',
];

for (const route of routes) {
  const appHtml = await render(route);

  const finalHtml = template.replace(
    rootPlaceholder,
    `<div id="root">${appHtml}</div>`,
  );

  const outputPath =
    route === '/'
      ? distIndexPath
      : resolve(
          'dist',
          route.replace(/^\//, ''),
          'index.html',
        );

  await mkdir(
    dirname(outputPath),
    {
      recursive: true,
    },
  );

  await writeFile(
    outputPath,
    finalHtml,
    'utf8',
  );

  console.log(`Пререндер создан: ${route}`);
}

console.log('Все страницы TopRepet успешно пререндерены.');
