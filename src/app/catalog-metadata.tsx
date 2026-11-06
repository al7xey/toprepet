import { useEffect } from 'react';
import type { Tutor } from '../new-design/api/types';

/** Describe the actual cards, including filters, pagination, empty states and API failures. */
export function CatalogMetadata({ tutors }: { tutors: Tutor[] }) {
  useEffect(() => {
    document.head.querySelectorAll('script[data-prerender-schema],script[data-client-page-schema]').forEach((tag) => {
      if (JSON.parse(tag.textContent || '{}')['@type'] === 'CollectionPage') tag.remove();
    });
    const url = 'https://toprepet.ru/teachers/';
    const schema = {
      '@context': 'https://schema.org', '@type': 'CollectionPage', '@id': `${url}#webpage`, url,
      name: document.title, description: document.head.querySelector<HTMLMetaElement>('meta[name="description"]')?.content,
      inLanguage: 'ru-RU', isPartOf: { '@id': 'https://toprepet.ru/#website' },
      ...(tutors.length ? { mainEntity: { '@type': 'ItemList', numberOfItems: tutors.length, itemListElement: tutors.map((tutor, index) => ({
        '@type': 'ListItem', position: index + 1, item: { '@type': 'Person', name: tutor.name, jobTitle: tutor.headline,
          url: `${url}${encodeURIComponent(tutor.id)}/`, ...(tutor.photo ? { image: new URL(tutor.photo, url).href } : {}) },
      })) } } : {}),
    };
    const tag = document.createElement('script'); tag.type = 'application/ld+json'; tag.dataset.clientPageSchema = '';
    tag.textContent = JSON.stringify(schema); document.head.append(tag);
    return () => tag.remove();
  }, [tutors]);
  return null;
}
