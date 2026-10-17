import { useEffect, useReducer, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { subjects } from '../../../entities/lesson';
import { api, staticTutors, type Tutor, type TutorFilter } from '../../api';
import { safeChoice, trackGoal } from '../../../shared/lib/analytics';
import { PublicLayout } from '../../layout/layouts';
import { count } from '../../lib/format';
import { rv } from '../../reveal';
import { Button, Chip, Dropdown, EmptyState, ErrorState, Icon, PageHeader, Skeleton, TutorGrid } from '../../ui';

const SUBJECTS = subjects.filter((s) => s !== 'Другой предмет');
const PRICES = [{ value: 1500, label: 'до 1 500 ₽' }, { value: 2000, label: 'до 2 000 ₽' }, { value: 2500, label: 'до 2 500 ₽' }];
const SORTS = [{ value: 'recommended', label: 'Рекомендуемые' }, { value: 'price_asc', label: 'Сначала дешевле' }, { value: 'price_desc', label: 'Сначала дороже' }] as const;
const PAGE = 8;

interface ListState { key: string; items: Tutor[]; total: number | null; cursor: string | null; more: boolean; error: string | null }
type ListAction =
  | { type: 'first'; key: string; items: Tutor[]; total: number; cursor: string | null }
  | { type: 'fail'; key: string; message: string }
  | { type: 'more-start' }
  | { type: 'more'; items: Tutor[]; cursor: string | null }
  | { type: 'more-fail'; message: string };

function listReducer(state: ListState, action: ListAction): ListState {
  switch (action.type) {
    case 'first': return { key: action.key, items: action.items, total: action.total, cursor: action.cursor, more: false, error: null };
    case 'fail': return { ...state, key: action.key, more: false, error: action.message };
    case 'more-start': return { ...state, more: true, error: null };
    case 'more': return { ...state, items: [...state.items, ...action.items], cursor: action.cursor, more: false };
    case 'more-fail': return { ...state, more: false, error: action.message };
  }
}

export default function CatalogPage() {
  const [input, setInput] = useState('');
  const [params] = useSearchParams();
  const [filter, setFilter] = useState<TutorFilter>(() => ({ sort: 'recommended', subject: SUBJECTS.find((s) => s === params.get('subject')) }));
  const [list, dispatch] = useReducer(listReducer, undefined, (): ListState => ({ key: '', items: staticTutors().slice(0, PAGE), total: null, cursor: null, more: false, error: null }));
  const sentinel = useRef<HTMLDivElement>(null);
  const key = JSON.stringify(filter);
  const fresh = list.key === key;
  const { items, total, cursor } = list;
  const loading = !fresh || list.more;
  const error = fresh || list.more === false ? list.error : null;

  // первая страница при смене фильтров
  useEffect(() => {
    let alive = true;
    const k = JSON.stringify(filter);
    api.listTutors({ ...filter, limit: PAGE }).then(
      (page) => { if (alive) dispatch({ type: 'first', key: k, items: page.items, total: page.total, cursor: page.nextCursor }); },
      (e: Error) => { if (alive) dispatch({ type: 'fail', key: k, message: e.message }); },
    );
    return () => { alive = false; };
  }, [filter]);

  // следующие страницы — автоматически при прокрутке
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !cursor || !fresh || list.more) return;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      dispatch({ type: 'more-start' });
      api.listTutors({ ...filter, limit: PAGE, cursor }).then(
        (page) => dispatch({ type: 'more', items: page.items, cursor: page.nextCursor }),
        (e: Error) => dispatch({ type: 'more-fail', message: e.message }),
      );
    }, { rootMargin: '600px 0px' });
    io.observe(node);
    return () => io.disconnect();
  }, [cursor, fresh, list.more, filter]);

  const set = (patch: Partial<TutorFilter>) => setFilter((f) => ({ ...f, ...patch, cursor: null }));
  const active = Boolean(filter.query || filter.subject || filter.priceMax || filter.hasIntro);
  const reset = () => { setInput(''); setFilter({ sort: filter.sort }); };

  return (
    <PublicLayout tight>
      <PageHeader title="Топ репеты" lead="Найдите преподавателя, с которым будет комфортно учиться и двигаться к цели." />

      <search className="trh-sec trh-tools" {...rv('up', 0.05)}>
        <form className="search" onSubmit={(e) => { e.preventDefault(); set({ query: input.trim() || undefined }); trackGoal('teacher_search', { has_query: Boolean(input.trim()) }); }}>
          <Icon name="search" />
          <input className="ym-disable-keys trh-search-input" type="search" aria-label="Поиск по предмету, теме или имени преподавателя" placeholder="Предмет, тема или репет" value={input} onChange={(e) => setInput(e.target.value)} />
          <Button type="submit" size="s">Найти</Button>
        </form>
        <div className="trh-chips">
          <Dropdown label="Предмет" icon="book" value={filter.subject ?? null} allLabel="Все предметы" options={SUBJECTS.map((s) => ({ value: s, label: s }))} onChange={(v) => { set({ subject: v }); trackGoal('teacher_filter', { subject: v ? safeChoice(v) : 'all' }); }} />
          <Dropdown label="Цена" value={filter.priceMax ?? null} allLabel="Любая цена" options={PRICES} onChange={(v) => set({ priceMax: v })} />
          <Chip on={Boolean(filter.hasIntro)} onClick={() => set({ hasIntro: !filter.hasIntro || undefined })}><Icon name="gift" />Есть знакомство</Chip>
          {active && <button type="button" className="chipf gray" onClick={reset}>Сбросить</button>}
        </div>
      </search>

      <section className="trh-sec" aria-label="Преподаватели">
        <div className="fr fb" {...rv('up', 0.1)}>
          <p className="muted" aria-live="polite">{total === null ? ' ' : <>Найдено: <b className="u-ink">{count(total, 'преподаватель', 'преподавателя', 'преподавателей')}</b></>}</p>
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
