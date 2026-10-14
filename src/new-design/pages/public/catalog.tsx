import { useEffect, useRef, useState, type ReactNode } from 'react';
import { subjects } from '../../../entities/lesson';
import { api, staticTutors, type Tutor, type TutorFilter } from '../../api';
import { safeChoice, trackGoal } from '../../../shared/lib/analytics';
import { PublicLayout } from '../../layout/layouts';
import { count } from '../../lib/format';
import { rv } from '../../reveal';
import { Button, EmptyState, ErrorState, Icon, PageHeader, Skeleton, TutorGrid } from '../../ui';

const SUBJECTS = subjects.filter((s) => s !== 'Другой предмет');
const PRICES = [{ value: 1500, label: 'до 1 500 ₽' }, { value: 2000, label: 'до 2 000 ₽' }, { value: 2500, label: 'до 2 500 ₽' }];
const SORTS = [{ value: 'recommended', label: 'Рекомендуемые' }, { value: 'price_asc', label: 'Сначала дешевле' }, { value: 'price_desc', label: 'Сначала дороже' }] as const;
const PAGE = 8;

/** Выпадающее меню фильтра из белого стекла. */
function Dropdown<T extends string | number>({ label, icon, value, options, onChange, allLabel, align }: { label: string; icon?: string; value: T | null; options: { value: T; label: string }[]; onChange: (v: T | null) => void; allLabel?: string; align?: 'right' }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const outside = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) ref.current?.removeAttribute('open'); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') ref.current?.removeAttribute('open'); };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', esc); };
  }, []);
  const pick = (v: T | null) => { onChange(v); ref.current?.removeAttribute('open'); };
  const current = options.find((o) => o.value === value);
  return (
    <details className="trh-drop" ref={ref}>
      <summary className={`chipf${value !== null && allLabel ? ' on' : ''}`} aria-label={label}>
        {icon && <Icon name={icon} />}{current?.label ?? label}<Icon name="down" />
      </summary>
      <div className={`trh-drop-menu glass-thick${align === 'right' ? ' right' : ''}`}>
        {allLabel && <button type="button" className={value === null ? 'on' : undefined} onClick={() => pick(null)}>{allLabel}{value === null && <Icon name="check" />}</button>}
        {options.map((o) => (
          <button type="button" key={String(o.value)} className={o.value === value ? 'on' : undefined} aria-pressed={o.value === value} onClick={() => pick(o.value)}>
            {o.label}{o.value === value && <Icon name="check" />}
          </button>
        ))}
      </div>
    </details>
  );
}

const Chip = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) => (
  <button type="button" className={`chipf${on ? ' on' : ''}`} aria-pressed={on} onClick={onClick}>{children}</button>
);

export default function CatalogPage() {
  const [input, setInput] = useState('');
  const [filter, setFilter] = useState<TutorFilter>({ sort: 'recommended' });
  const [items, setItems] = useState<Tutor[]>(() => staticTutors().slice(0, PAGE));
  const [total, setTotal] = useState<number | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const key = JSON.stringify(filter);

  // первая страница при смене фильтров
  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    api.listTutors({ ...filter, limit: PAGE }).then((page) => {
      if (!alive) return;
      setItems(page.items); setTotal(page.total); setCursor(page.nextCursor);
    }).catch((e) => alive && setError(e.message)).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [key]);

  // следующие страницы — автоматически при прокрутке
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !cursor || loading) return;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      setLoading(true);
      api.listTutors({ ...filter, limit: PAGE, cursor }).then((page) => {
        setItems((list) => [...list, ...page.items]); setCursor(page.nextCursor);
      }).catch((e) => setError(e.message)).finally(() => setLoading(false));
    }, { rootMargin: '600px 0px' });
    io.observe(node);
    return () => io.disconnect();
  }, [cursor, loading, key]);

  const set = (patch: Partial<TutorFilter>) => setFilter((f) => ({ ...f, ...patch, cursor: null }));
  const active = Boolean(filter.query || filter.subject || filter.priceMax || filter.hasIntro);
  const reset = () => { setInput(''); setFilter({ sort: filter.sort }); };

  return (
    <PublicLayout tight>
      <PageHeader title="Топ репеты" lead="Найдите преподавателя, с которым будет комфортно учиться и двигаться к цели." />

      <div className="trh-sec trh-tools" {...rv('up', 0.05)}>
        <form className="search" role="search" onSubmit={(e) => { e.preventDefault(); set({ query: input.trim() || undefined }); trackGoal('teacher_search', { has_query: Boolean(input.trim()) }); }}>
          <Icon name="search" style={{ color: 'var(--muted)' }} />
          <input className="ym-disable-keys trh-search-input" type="search" aria-label="Поиск по предмету, теме или имени преподавателя" placeholder="Предмет, тема или репет" value={input} onChange={(e) => setInput(e.target.value)} />
          <Button type="submit" size="s">Найти</Button>
        </form>
        <div className="trh-chips">
          <Dropdown label="Предмет" icon="book" value={filter.subject ?? null} allLabel="Все предметы" options={SUBJECTS.map((s) => ({ value: s, label: s }))} onChange={(v) => { set({ subject: v }); trackGoal('teacher_filter', { subject: v ? safeChoice(v) : 'all' }); }} />
          <Dropdown label="Цена" value={filter.priceMax ?? null} allLabel="Любая цена" options={PRICES} onChange={(v) => set({ priceMax: v })} />
          <Chip on={Boolean(filter.hasIntro)} onClick={() => set({ hasIntro: !filter.hasIntro || undefined })}><Icon name="gift" />Есть знакомство</Chip>
          {active && <button type="button" className="chipf gray" onClick={reset}>Сбросить</button>}
        </div>
      </div>

      <section className="trh-sec" aria-label="Преподаватели">
        <div className="fr fb" {...rv('up', 0.1)}>
          <p className="muted" aria-live="polite">{total === null ? ' ' : <>Найдено: <b style={{ color: 'var(--ink)' }}>{count(total, 'преподаватель', 'преподавателя', 'преподавателей')}</b></>}</p>
          <Dropdown label="Сортировка" icon="sort" value={filter.sort ?? 'recommended'} options={SORTS.map((s) => ({ ...s }))} onChange={(v) => set({ sort: (v ?? 'recommended') as TutorFilter['sort'] })} align="right" />
        </div>
        {error && !items.length ? <ErrorState text={error} onRetry={() => setFilter((f) => ({ ...f }))} /> : null}
        {!loading && total === 0 ? (
          <EmptyState icon="search" title="По вашему запросу преподавателей не нашлось" text="Попробуйте другое имя, предмет или тему. Или опишите задачу в заявке: подходящие репетиторы откликнутся сами."
            actions={<><Button onClick={reset}>Показать всех</Button><Button to="/me/requests/new" variant="line">Создать заявку</Button></>} />
        ) : (
          <TutorGrid tutors={items}>
            {loading && cursor && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} height={360} radius={36} />)}
          </TutorGrid>
        )}
        {cursor && <div ref={sentinel} className="trh-sentinel" aria-hidden="true" />}
      </section>
    </PublicLayout>
  );
}
