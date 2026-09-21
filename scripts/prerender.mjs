import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const distIndexPath = resolve('dist/index.html');
const serverEntryPath = resolve('dist-server/entry-server.js');

const template = await readFile(distIndexPath, 'utf8');

const { render } = await import(
  pathToFileURL(serverEntryPath).href
);

const appHtml = await render('/');

const rootPlaceholder = '<div id="root"></div>';

if (!template.includes(rootPlaceholder)) {
  throw new Error(
    'Не найден <div id="root"></div> в dist/index.html',
  );
}

const finalHtml = template.replace(
  rootPlaceholder,
  `<div id="root">${appHtml}</div>`,
);

await writeFile(
  distIndexPath,
  finalHtml,
  'utf8',
);

console.log('Главная страница TopRepet успешно пререндерена.');
