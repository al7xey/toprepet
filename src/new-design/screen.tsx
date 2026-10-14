import { useEffect, useLayoutEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './tr.css';
import './home.css';
import titles from './screens/index.json';

const loaders = import.meta.glob('./screens/*.html', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>;

/** Телефон или компьютер: на сервере и при первом показе компьютерная версия, затем по ширине окна. */
function useVariant(): 'd' | 'm' {
  const [variant, setVariant] = useState<'d' | 'm'>('d');
  useLayoutEffect(() => {
    const query = window.matchMedia('(max-width: 760px)');
    const update = () => setVariant(query.matches ? 'm' : 'd');
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return variant;
}

/**
 * Экран из макета «как есть» (болванка): разметка выгружена из макетов, ссылки ведут на другие экраны.
 * Данных и действий нет: там, где нужен бэкенд, остаётся статичная картинка экрана.
 */
export function ScreenView({ d, m, title }: { d: string; m: string; title?: string }) {
  const variant = useVariant();
  const navigate = useNavigate();
  useEffect(() => {
    if (title) document.title = `${title} — TopRepet`;
  }, [title]);
  return (
    <div
      className="tr trh-mock"
      onClick={(event) => {
        const link = (event.target as HTMLElement).closest('a');
        if (!link) return;
        const href = link.getAttribute('href') ?? '';
        if (href === '#' || href === '') { event.preventDefault(); return; }
        if (href.startsWith('/') && !event.metaKey && !event.ctrlKey) {
          event.preventDefault();
          navigate(href);
          window.scrollTo(0, 0);
        }
      }}
    >
      <main id="main" tabIndex={-1} className="trh-mock-main" data-v={variant} dangerouslySetInnerHTML={{ __html: variant === 'm' ? m : d }} />
    </div>
  );
}

/** Маршрут /screens/:id. */
export function ScreenRoute() {
  const { id = '' } = useParams();
  const [markup, setMarkup] = useState<{ id: string; d: string; m: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const d = loaders[`./screens/${id}.d.html`];
    const m = loaders[`./screens/${id}.m.html`];
    if (!d || !m) { setMarkup(null); return; }
    Promise.all([d(), m()]).then(([dv, mv]) => { if (!cancelled) setMarkup({ id, d: dv, m: mv }); });
    return () => { cancelled = true; };
  }, [id]);
  const title = (titles as Record<string, string>)[id];
  if (!title) {
    return (
      <div className="tr trh-mock"><main id="main" className="trh-mock-main" style={{ padding: 48 }}>
        <h1 className="trh-h1">Экран не найден</h1>
        <p className="lead"><a href="/" style={{ color: 'var(--accent)' }}>На главную</a></p>
      </main></div>
    );
  }
  if (!markup || markup.id !== id) return <div className="tr trh-mock"><main id="main" className="trh-mock-main" /></div>;
  return <ScreenView d={markup.d} m={markup.m} title={title} />;
}
