import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import pages from '../shared/config/seo-pages.json';
import { articles, articlePath, categories, categoryPath, hasPublished } from '../blog/data';
import { teachers } from '../entities/teacher';

export function SeoMetadata() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    const path = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
    const teacher = teachers.find(item => path === `/teachers/${item.id}`);
    const article = articles.find(item => path === articlePath(item).replace(/\/$/, ''));
    const category = categories.find(item => path === categoryPath(item).replace(/\/$/, ''));
    const known = pages[path as keyof typeof pages];
    const page = known || (path === '/blog' ? { title: 'Блог TopRepet — статьи об учёбе', description: 'Статьи об учёбе, школьных предметах и подготовке к экзаменам от редакции TopRepet.' } : article ? { title: article.seo_title || `${article.title} — Блог TopRepet`, description: article.seo_description || article.excerpt } : category && hasPublished(category) ? { title: `${category.name} — Блог TopRepet`, description: category.description || `Статьи по теме «${category.name}» в блоге TopRepet.` } : undefined);
    const url = path === '/' ? 'https://toprepet.ru/' : `https://toprepet.ru${path}/`;
    const oldCanonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const changed = oldCanonical?.href !== url;
    const title = page?.title || (path.startsWith('/blog/admin') ? 'Админка блога — TopRepet' : 'Страница не найдена — TopRepet');
    document.title = title;
    const meta = (attribute: 'name' | 'property', key: string, value: string) => {
      let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
      if (!tag) { tag = document.createElement('meta'); tag.setAttribute(attribute, key); document.head.append(tag); }
      tag.content = value;
    };
    meta('name', 'description', page?.description || '');
    meta('name', 'robots', page ? 'index,follow,max-image-preview:large' : 'noindex,follow');
    for (const [key, value] of [['og:title', title], ['og:description', page?.description || ''], ['og:url', url], ['twitter:title', title], ['twitter:description', page?.description || '']]) meta(key.startsWith('og:') ? 'property' : 'name', key, value);
    if (page) {
      const canonical = oldCanonical || document.createElement('link');
      canonical.rel = 'canonical'; canonical.href = url;
      if (!oldCanonical) document.head.append(canonical);
    } else oldCanonical?.remove();
    const image = teacher ? new URL(teacher.photo, 'https://toprepet.ru').href : article?.cover_image_url || (path === '/for-repetitor' ? 'https://toprepet.ru/images/for-repetitor-hero.png?v=20260929d' : 'https://toprepet.ru/social-preview-20260925.jpg?v=20260929d');
    meta('property', 'og:type', article ? 'article' : 'website');
    const imageAlt = teacher ? `${teacher.name} — ${teacher.role}` : article?.cover_image_alt || article?.title || (path === '/for-repetitor' ? 'Преподаватели TopRepet' : 'TopRepet — сервис подбора репетиторов');
    meta('property', 'og:image:alt', imageAlt); meta('name', 'twitter:image:alt', imageAlt);
    meta('property', 'og:image', image); meta('name', 'twitter:image', image);
    if (teacher || article) document.head.querySelectorAll('meta[property="og:image:width"],meta[property="og:image:height"]').forEach(tag => tag.remove());
    else { meta('property','og:image:width',path === '/for-repetitor' ? '2172' : '2400'); meta('property','og:image:height',path === '/for-repetitor' ? '1629' : '1260'); }
    // Page-specific prerender data must not describe the previous SPA screen.
    if (changed) {
      document.head.querySelectorAll('script[data-prerender-schema],script[data-client-page-schema]').forEach(tag => tag.remove());
      if (page) {
        const schema = document.createElement('script'); schema.type = 'application/ld+json'; schema.dataset.clientPageSchema = '';
        const person = (item: (typeof teachers)[number]) => ({ '@type': 'Person', name: item.name, jobTitle: item.role, url: `https://toprepet.ru/teachers/${item.id}/`, image: new URL(item.photo, 'https://toprepet.ru').href });
        schema.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': teacher ? 'ProfilePage' : path === '/teachers' ? 'CollectionPage' : path === '/contact' ? 'ContactPage' : 'WebPage', '@id': `${url}#webpage`, url, name: title, description: page.description, inLanguage: 'ru-RU', isPartOf: { '@id': 'https://toprepet.ru/#website' }, ...(teacher ? { mainEntity: person(teacher) } : path === '/teachers' ? { mainEntity: { '@type': 'ItemList', itemListElement: teachers.map((item, index) => ({ '@type': 'ListItem', position: index + 1, item: person(item) })) } } : {}) });
        document.head.append(schema);
        if (path !== '/') {
          const trail = [{ name: 'Главная', item: 'https://toprepet.ru/' }];
          if (teacher) trail.push({ name: 'Преподаватели', item: 'https://toprepet.ru/teachers/' });
          else if (path.startsWith('/legal/')) trail.push({ name: 'Документы', item: 'https://toprepet.ru/legal/' });
          else if (article || category) trail.push({ name: 'Блог', item: 'https://toprepet.ru/blog/' });
          trail.push({ name: teacher?.name || article?.title || category?.name || title.replace(/(?: —| \|) TopRepet$/, ''), item: url });
          const breadcrumb = document.createElement('script'); breadcrumb.type = 'application/ld+json'; breadcrumb.dataset.clientPageSchema = '';
          breadcrumb.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: trail.map((item, index) => ({ '@type': 'ListItem', position: index + 1, ...item })) });
          document.head.append(breadcrumb);
        }
      }
    }
  }, [pathname]);
  return null;
}
