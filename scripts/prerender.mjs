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

import { routes, titles, descriptions, canonicalForRoute } from './seo-routes.mjs';

const breadcrumbNames = {
  '/lessons':
    'Занятия',

  '/contact':
    'Контакты',

  '/free-intro':
    'Бесплатное знакомство',

  '/teacher/informatics':
    'Алексей',

  '/teacher/english':
    'Анастасия',

  '/teacher/russian':
    'Артём',

  '/teacher/chemistry-biology':
    'Александра',

  '/teacher/mathematics':
    'Ерлан',
};

const teacherSchemas = {
  '/teacher/informatics': {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Алексей',
    jobTitle: 'Репетитор по информатике',
    url: 'https://toprepet.ru/teacher/informatics/',
    image:
      'https://toprepet.ru/images/tutor-informatics.webp',
    worksFor: {
      '@type': 'Organization',
      name: 'TopRepet',
      url: 'https://toprepet.ru/',
    },
  },

  '/teacher/english': {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Анастасия',
    jobTitle:
      'Репетитор по английскому языку и истории',
    url: 'https://toprepet.ru/teacher/english/',
    image:
      'https://toprepet.ru/images/tutor-english.webp',
    worksFor: {
      '@type': 'Organization',
      name: 'TopRepet',
      url: 'https://toprepet.ru/',
    },
  },

  '/teacher/russian': {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Артём',
    jobTitle:
      'Репетитор по русскому языку',
    url: 'https://toprepet.ru/teacher/russian/',
    image:
      'https://toprepet.ru/images/tutor-artem.webp',
    worksFor: {
      '@type': 'Organization',
      name: 'TopRepet',
      url: 'https://toprepet.ru/',
    },
  },

  '/teacher/chemistry-biology': {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Александра',
    jobTitle:
      'Репетитор по химии и биологии',
    url:
      'https://toprepet.ru/teacher/chemistry-biology/',
    image:
      'https://toprepet.ru/images/tutor-alexandra-portrait-v2.webp',
    worksFor: {
      '@type': 'Organization',
      name: 'TopRepet',
      url: 'https://toprepet.ru/',
    },
  },

  '/teacher/mathematics': {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Ерлан',
    jobTitle:
      'Репетитор по математике',
    url:
      'https://toprepet.ru/teacher/mathematics/',
    image:
      'https://toprepet.ru/images/tutor-erlan.webp',
    worksFor: {
      '@type': 'Organization',
      name: 'TopRepet',
      url: 'https://toprepet.ru/',
    },
  },
};

function updateMetaContent(html, attribute, key, value) {
  const tag = new RegExp(
    `<meta\\s+${attribute}="${key}"\\s+content="[^"]*"\\s*\\/?>`,
    'i',
  );

  if (!tag.test(html)) {
    throw new Error(`Не найден метатег ${key}`);
  }

  return html.replace(
    tag,
    `<meta ${attribute}="${key}" content="${value}" />`,
  );
}

function addPageMeta(html, route) {
  const title = titles[route];
  const description = descriptions[route];
  const canonical = canonicalForRoute(route);

  let result = html.replace(
    /<title>.*?<\/title>/s,
    `<title>${title}</title>`,
  );

  result = result.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${description}" />`,
  );

  for (const [attribute, key, value] of [
    ['property', 'og:title', title],
    ['property', 'og:description', description],
    ['property', 'og:url', canonical],
    ['name', 'twitter:title', title],
    ['name', 'twitter:description', description],
  ]) {
    result = updateMetaContent(result, attribute, key, value);
  }

  result = result.replace(
    '</head>',
    `    <link rel="canonical" href="${canonical}" />\n  </head>`,
  );

  return result;
}

function addTeacherSchema(html, route) {
  const schema = teacherSchemas[route];

  if (!schema) {
    return html;
  }

  const jsonLd = JSON.stringify(
    schema,
    null,
    2,
  );

  return html.replace(
    '</head>',
    `    <script type="application/ld+json">\n${jsonLd}\n    </script>\n  </head>`,
  );
}

function addBreadcrumbSchema(html, route) {
  if (route === '/') {
    return html;
  }

  const pageName = breadcrumbNames[route];

  if (!pageName) {
    return html;
  }

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'TopRepet',
        item: 'https://toprepet.ru/',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: pageName,
        item: canonicalForRoute(route),
      },
    ],
  };

  const jsonLd = JSON.stringify(
    schema,
    null,
    2,
  );

  return html.replace(
    '</head>',
    `    <script type="application/ld+json">\n${jsonLd}\n    </script>\n  </head>`,
  );
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

  finalHtml = addTeacherSchema(
    finalHtml,
    route,
  );

  finalHtml = addBreadcrumbSchema(
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

console.log(
  'Все страницы TopRepet успешно пререндерены.',
);

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map(route => `  <url><loc>${canonicalForRoute(route)}</loc></url>`).join('\n')}\n</urlset>\n`;
await writeFile(resolve('dist/sitemap.xml'), sitemap, 'utf8');

const notFoundHtml = template
  .replace(rootPlaceholder, `<div id="root">${await render('/this-page-does-not-exist')}</div>`)
  .replace(/<title>.*?<\/title>/s, '<title>Страница не найдена — TopRepet</title>')
  .replace('</head>', '    <meta name="robots" content="noindex,follow" />\n  </head>');
await writeFile(resolve('dist/404.html'), notFoundHtml, 'utf8');
