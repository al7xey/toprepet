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

  '/for-repetitor':
    'Работа репетитором',

  '/teachers':
    'Преподаватели',

  '/teachers/informatics':
    'Алексей',

  '/teachers/english':
    'Анастасия',

  '/teachers/russian':
    'Артём',

  '/teachers/chemistry-biology':
    'Александра',

  '/teachers/mathematics':
    'Ерлан',

  '/teachers/russian-literature':
    'Анна',
};

const teacherSchemas = {
  '/teachers/informatics': {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Алексей',
    jobTitle: 'Репетитор по информатике',
    url: 'https://toprepet.ru/teachers/informatics/',
    image:
      'https://toprepet.ru/images/tutor-informatics.png?v=20260929f',
    worksFor: {
      '@type': 'Organization',
      name: 'TopRepet',
      url: 'https://toprepet.ru/',
    },
  },

  '/teachers/english': {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Анастасия',
    jobTitle:
      'Репетитор по английскому языку и истории',
    url: 'https://toprepet.ru/teachers/english/',
    image:
      'https://toprepet.ru/images/tutor-english.webp?v=20260929e',
    worksFor: {
      '@type': 'Organization',
      name: 'TopRepet',
      url: 'https://toprepet.ru/',
    },
  },

  '/teachers/russian': {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Артём',
    jobTitle:
      'Репетитор по русскому языку',
    url: 'https://toprepet.ru/teachers/russian/',
    image:
      'https://toprepet.ru/images/tutor-artem.webp?v=20260929f',
    worksFor: {
      '@type': 'Organization',
      name: 'TopRepet',
      url: 'https://toprepet.ru/',
    },
  },

  '/teachers/chemistry-biology': {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Александра',
    jobTitle:
      'Репетитор по химии и биологии',
    url:
      'https://toprepet.ru/teachers/chemistry-biology/',
    image:
      'https://toprepet.ru/images/tutor-alexandra-portrait-v2.jpg?v=20260929f',
    worksFor: {
      '@type': 'Organization',
      name: 'TopRepet',
      url: 'https://toprepet.ru/',
    },
  },

  '/teachers/mathematics': {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Ерлан',
    jobTitle:
      'Репетитор по математике',
    url:
      'https://toprepet.ru/teachers/mathematics/',
    image:
      'https://toprepet.ru/images/tutor-erlan.webp?v=20260929f',
    worksFor: {
      '@type': 'Organization',
      name: 'TopRepet',
      url: 'https://toprepet.ru/',
    },
  },
  '/teachers/russian-literature': {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Анна',
    jobTitle: 'Репетитор по русскому языку и литературе',
    url: 'https://toprepet.ru/teachers/russian-literature/',
    image: 'https://toprepet.ru/images/tutor-anna.webp?v=20260929f',
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

  if (route === '/for-repetitor') {
    const image = 'https://toprepet.ru/images/for-repetitor-hero.png?v=20260929d';
    result = updateMetaContent(result, 'property', 'og:image', image);
    result = updateMetaContent(result, 'name', 'twitter:image', image);
    result = updateMetaContent(result, 'property', 'og:image:alt', 'Преподаватели TopRepet');
    result = updateMetaContent(result, 'name', 'twitter:image:alt', 'Преподаватели TopRepet');
    result = updateMetaContent(result, 'property', 'og:image:width', '2172');
    result = updateMetaContent(result, 'property', 'og:image:height', '1629');
  }

  result = result.replace(
    '</head>',
    `    <link rel="canonical" href="${canonical}" />\n  </head>`,
  );

  return result;
}

function addPageSchema(html, route) {
  const schema = route === '/teachers' ? {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: titles[route],
    url: canonicalForRoute(route),
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: routes.filter(path => teacherSchemas[path]).map((path, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Person',
          name: teacherSchemas[path].name,
          jobTitle: teacherSchemas[path].jobTitle,
          url: teacherSchemas[path].url,
          image: teacherSchemas[path].image,
        },
      })),
    },
  } : teacherSchemas[route];

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
      ...(route.startsWith('/teachers/') ? [{
        '@type': 'ListItem',
        position: 2,
        name: 'Преподаватели',
        item: canonicalForRoute('/teachers'),
      }] : []),
      {
        '@type': 'ListItem',
        position: route.startsWith('/teachers/') ? 3 : 2,
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

  finalHtml = addPageSchema(
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

const blog = JSON.parse(await readFile('src/blog/snapshot.json', 'utf8'));
const escapeMeta = value => String(value || '').replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
const blogCategoryPath = category => {
  const parts = [category.slug];
  let parent = blog.categories.find(item => item.id === category.parent_id);
  while (parent && parts.length < 8) { parts.unshift(parent.slug); parent = blog.categories.find(item => item.id === parent.parent_id); }
  return `/blog/rubrics/${parts.join('/')}`;
};
const blogPages = [
  { route: '/blog', title: 'Блог TopRepet — статьи об учёбе', description: 'Статьи об учёбе, школьных предметах и подготовке к экзаменам от редакции TopRepet.' },
  ...blog.categories.filter(category => blog.articles.some(article => {
    let current = blog.categories.find(item => item.id === article.category_id);
    while (current) { if (current.id === category.id) return true; current = blog.categories.find(item => item.id === current.parent_id); }
    return false;
  })).map(category => ({ route: blogCategoryPath(category), title: `${category.name} — Блог TopRepet`, description: category.description || `Статьи по теме «${category.name}» в блоге TopRepet.` })),
  ...blog.articles.map(article => ({ route: `/blog/articles/${article.slug}`, title: article.seo_title || `${article.title} — Блог TopRepet`, description: article.seo_description || article.excerpt, article })),
];
const adminRoutes = ['/blog/admin', '/blog/admin/login', '/blog/admin/articles', '/blog/admin/articles/new', '/blog/admin/articles/edit', '/blog/admin/categories'];
for (const page of [...blogPages, ...adminRoutes.map(route => ({ route, title: 'Админка блога — TopRepet', description: '', admin: true }))]) {
  const url = `https://toprepet.ru${page.route}/`;
  let html = template.replace(rootPlaceholder, `<div id="root">${await render(page.route)}</div>`);
  html = html.replace(/<title>.*?<\/title>/s, `<title>${escapeMeta(page.title)}</title>`)
    .replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i, `<meta name="description" content="${escapeMeta(page.description)}" />`);
  for (const [key, value] of [['og:title', page.title], ['og:description', page.description], ['og:url', url], ['twitter:title', page.title], ['twitter:description', page.description]]) {
    html = updateMetaContent(html, key.startsWith('og:') ? 'property' : 'name', key, escapeMeta(value));
  }
  html = html.replace('</head>', page.admin ? '<meta name="robots" content="noindex,follow" /></head>' : `<link rel="canonical" href="${url}" /></head>`);
  const path = resolve('dist', page.route.slice(1), 'index.html');
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, html, 'utf8');
}
const blogSitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${blogPages.map(page => `  <url><loc>https://toprepet.ru${page.route}/</loc></url>`).join('\n')}\n</urlset>\n`;
await writeFile(resolve('dist/blog/sitemap.xml'), blogSitemap, 'utf8');
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...routes.map(canonicalForRoute), ...blogPages.map(page => `https://toprepet.ru${page.route}/`)].map(url => `  <url><loc>${url}</loc></url>`).join('\n')}\n</urlset>\n`;
await writeFile(resolve('dist/sitemap.xml'), sitemap, 'utf8');

// GitHub Pages cannot issue a server-side 301 for an old static path.
// Keep the legacy URL out of the sitemap and redirect it immediately.
const legacyTutorPath = resolve('dist/for-tutors/index.html');
await mkdir(dirname(legacyTutorPath), { recursive: true });
await writeFile(legacyTutorPath, `<!doctype html><html lang="ru"><head><meta charset="UTF-8"><meta name="robots" content="noindex,follow"><meta http-equiv="refresh" content="0;url=https://toprepet.ru/for-repetitor/"><link rel="canonical" href="https://toprepet.ru/for-repetitor/"><title>Переход на страницу для репетиторов</title></head><body><p>Страница переехала: <a href="https://toprepet.ru/for-repetitor/">работа репетитором с TopRepet</a>.</p></body></html>`, 'utf8');

for (const route of routes.filter(path => path.startsWith('/teachers/'))) {
  const oldRoute = route.replace('/teachers/', '/teacher/');
  const destination = canonicalForRoute(route);
  const oldPath = resolve('dist', oldRoute.slice(1), 'index.html');
  await mkdir(dirname(oldPath), { recursive: true });
  await writeFile(oldPath, `<!doctype html><html lang="ru"><head><meta charset="UTF-8"><meta name="robots" content="noindex,follow"><meta http-equiv="refresh" content="0;url=${destination}"><link rel="canonical" href="${destination}"><title>Анкета преподавателя переехала — TopRepet</title></head><body><p>Анкета переехала: <a href="${destination}">открыть новый адрес</a>.</p></body></html>`, 'utf8');
}

const notFoundHtml = template
  .replace(rootPlaceholder, `<div id="root">${await render('/this-page-does-not-exist')}</div>`)
  .replace(/<title>.*?<\/title>/s, '<title>Страница не найдена — TopRepet</title>')
  .replace('</head>', '    <meta name="robots" content="noindex,follow" />\n  </head>');
await writeFile(resolve('dist/404.html'), notFoundHtml, 'utf8');
