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

const titles = {
  '/': 'TopRepet — топ репеты под вашу цель',

  '/lessons':
    'Занятия с репетитором — TopRepet',

  '/contact':
    'Связаться с TopRepet',

  '/free-intro':
    'Бесплатное знакомство с репетитором — TopRepet',

  '/teacher/informatics':
    'Алексей — репетитор по информатике | TopRepet',

  '/teacher/english':
    'Анастасия — репетитор по английскому и истории | TopRepet',

  '/teacher/russian':
    'Артём — репетитор по русскому языку | TopRepet',

  '/teacher/chemistry-biology':
    'Александра — репетитор по химии и биологии | TopRepet',

  '/teacher/mathematics':
    'Ерлан — репетитор по математике | TopRepet',
};

const descriptions = {
  '/':
    'Подберём репетитора под вашу цель: школьные предметы, домашние задания, ОГЭ и ЕГЭ. Бесплатное знакомство — 20 минут.',

  '/lessons':
    'Выберите направление занятий в TopRepet: школьные предметы, домашние задания, подготовка к ОГЭ и ЕГЭ и начало учёбы.',

  '/contact':
    'Свяжитесь с менеджером TopRepet, чтобы выбрать занятие, преподавателя или согласовать время бесплатного знакомства.',

  '/free-intro':
    'Бесплатное знакомство с репетитором длится 20 минут. Обсудим цель, удобный график и составим план занятий.',

  '/teacher/informatics':
    'Алексей — репетитор TopRepet по информатике, школьной программе, ОГЭ и ЕГЭ.',

  '/teacher/english':
    'Анастасия — репетитор TopRepet по английскому языку, истории и школьным предметам.',

  '/teacher/russian':
    'Артём — репетитор TopRepet по русскому языку, школьной программе и подготовке к ОГЭ.',

  '/teacher/chemistry-biology':
    'Александра — репетитор TopRepet по химии и биологии для учеников 5–11 классов и подготовки к ОГЭ.',

  '/teacher/mathematics':
    'Ерлан — репетитор TopRepet по математике, школьной программе и подготовке к ОГЭ.',
};

function addPageMeta(html, route) {
  const title = titles[route];
  const description = descriptions[route];

  const canonical =
    route === '/'
      ? 'https://toprepet.ru/'
      : `https://toprepet.ru${route}/`;

  let result = html.replace(
    /<title>.*?<\/title>/s,
    `<title>${title}</title>`,
  );

  result = result.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${description}" />`,
  );

  result = result.replace(
    '</head>',
    `    <link rel="canonical" href="${canonical}" />\n  </head>`,
  );

  return result;
}

for (const route of routes) {
  const appHtml = await render(route);

  let finalHtml = template.replace(
    rootPlaceholder,
    `<div id="root">${appHtml}</div>`,
  );

  finalHtml = addPageMeta(
    finalHtml,
    route,
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
