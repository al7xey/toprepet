import { useEffect } from 'react';

/** Sets the tab title and, for cabinets and auth pages, `<meta name="robots" content="noindex">`. */
export function usePageMeta(title: string, { noindex = false }: { noindex?: boolean } = {}) {
  useEffect(() => {
    document.title = title === 'TopRepet' ? title : `${title} — TopRepet`;
    let meta = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (noindex) {
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'robots';
        document.head.append(meta);
      }
      meta.content = 'noindex';
    } else {
      meta?.remove();
    }
  }, [title, noindex]);
}
