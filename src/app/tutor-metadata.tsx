import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { Tutor } from '../new-design/api/types';

/** API data is authoritative: newly published and removed profiles are not in the build snapshot. */
export function TutorMetadata({ tutor }: { tutor: Tutor | null }) {
  const { pathname } = useLocation();
  useEffect(() => {
    const url = `https://toprepet.ru${pathname.replace(/\/+$/, '')}/`;
    const title = tutor ? `${tutor.name} — ${tutor.headline || 'репетитор онлайн'} | TopRepet` : 'Анкета не найдена — TopRepet';
    const description = tutor ? `${tutor.name}: ${tutor.subjects.join(', ')}. ${tutor.intro}`.replace(/\s+/g, ' ').trim().slice(0, 200) : 'Анкета недоступна. Выберите другого преподавателя в каталоге TopRepet.';
    document.title = title;
    const meta = (key: string, content: string) => {
      const attribute = key.startsWith('og:') ? 'property' : 'name';
      let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
      if (!tag) { tag = document.createElement('meta'); tag.setAttribute(attribute, key); document.head.append(tag); }
      tag.content = content;
    };
    for (const [key, value] of [['description', description], ['robots', tutor ? 'index,follow,max-image-preview:large' : 'noindex,follow'], ['og:title', title], ['og:description', description], ['twitter:title', title], ['twitter:description', description], ['og:url', url], ['og:type', 'website']]) meta(key, value);
    document.head.querySelectorAll('script[data-prerender-schema],script[data-client-page-schema]').forEach((tag) => tag.remove());
    const old = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!tutor) { old?.remove(); return; }
    const canonical = old || document.createElement('link');
    canonical.rel = 'canonical'; canonical.href = url;
    if (!old) document.head.append(canonical);
    if (tutor.photo) {
      const image = new URL(tutor.photo, url).href;
      meta('og:image', image); meta('twitter:image', image);
      meta('og:image:alt', `Фото: ${tutor.name}`); meta('twitter:image:alt', `Фото: ${tutor.name}`);
      document.head.querySelectorAll('meta[property="og:image:width"],meta[property="og:image:height"]').forEach((tag) => tag.remove());
    }
    const schemas = [
      { '@context': 'https://schema.org', '@type': 'ProfilePage', '@id': `${url}#webpage`, url, name: title, description, inLanguage: 'ru-RU', isPartOf: { '@id': 'https://toprepet.ru/#website' }, mainEntity: { '@type': 'Person', name: tutor.name, jobTitle: tutor.headline, url, ...(tutor.photo ? { image: new URL(tutor.photo, url).href } : {}) } },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ name: 'Главная', item: 'https://toprepet.ru/' }, { name: 'Преподаватели', item: 'https://toprepet.ru/teachers/' }, { name: tutor.name, item: url }].map((item, index) => ({ '@type': 'ListItem', position: index + 1, ...item })) },
    ];
    for (const value of schemas) {
      const tag = document.createElement('script'); tag.type = 'application/ld+json'; tag.dataset.clientPageSchema = '';
      tag.textContent = JSON.stringify(value); document.head.append(tag);
    }
  }, [pathname, tutor]);
  return null;
}
