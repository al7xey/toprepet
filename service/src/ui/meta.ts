import { useEffect } from 'react';

const DEFAULT_DESCRIPTION =
  'Найдите репетитора онлайн по математике, русскому, английскому и другим предметам и запишитесь в свободное время прямо из анкеты, без переписки.';

function setMeta(name: string, content: string | null) {
  let meta = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (content === null) {
    meta?.remove();
    return;
  }
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = name;
    document.head.append(meta);
  }
  meta.content = content;
}

/** Sets the tab title, the description of public pages (teksty.md, section 1) and, for cabinets, booking and auth pages,
    `<meta name="robots" content="noindex">`. A title that already names the site («… | TopRepet») is used as is. */
export function usePageMeta(title: string, { noindex = false, description }: { noindex?: boolean; description?: string } = {}) {
  useEffect(() => {
    document.title = title === 'TopRepet' || title.endsWith('| TopRepet') ? title : `${title} — TopRepet`;
    setMeta('robots', noindex ? 'noindex' : null);
    setMeta('description', description ?? DEFAULT_DESCRIPTION);
  }, [title, noindex, description]);
}
