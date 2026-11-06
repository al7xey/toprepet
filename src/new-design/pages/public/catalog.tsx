import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { subjects } from '../../../entities/lesson';
import { api, staticTutors, type Tutor, type TutorFilter } from '../../api';
import { safeChoice, trackGoal } from '../../../shared/lib/analytics';
import { PublicLayout } from '../../layout/layouts';
import { readCatalogFilter, writeCatalogFilter } from '../../lib/catalog-filter';
import { useSession } from '../../api/session';
import { rv } from '../../reveal';
import { Button, Dropdown, EmptyState, ErrorState, FilterMenu, Icon, PageHeader, Skeleton, TutorGrid } from '../../ui';

const SUBJECTS = subjects.filter((s) => s !== 'Другой предмет');
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
  const { user } = useSession();
  const [params, setParams] = useSearchParams();
  const filter = useMemo(() => readCatalogFilter(params, SUBJECTS), [params]);
  const setFilter = (next: TutorFilter) => setParams(writeCatalogFilter(params, next));
  const [attempt, setAttempt] = useState(0);
  const [searchReset, setSearchReset] = useState(0);
  const [list, dispatch] = useReducer(listReducer, undefined, (): ListState => ({ key: '', items: staticTutors().slice(0, PAGE), total: null, cursor: null, more: false, error: null }));
  const sentinel = useRef<HTMLDivElement>(null);
  const key = JSON.stringify(filter) + attempt;
  const fresh = list.key === key;
  const { items, total, cursor } = list;
  const loading = !fresh || list.more;
  const error = fresh ? list.error : null;
  // The build snapshot is valid only for the unfiltered catalogue. Never let a
  // quick click on stale results open an unrelated tutor while filters load.
  const initialUnfiltered = list.key === '' && !filter.query && !filter.subject && filter.priceMin == null && filter.priceMax == null && !filter.hasIntro && filter.sort === 'recommended';
  const visibleItems = fresh || initialUnfiltered ? items : [];

  // первая страница при смене фильтров
  useEffect(() => {
    let alive = true;
    const k = key;
    api.listTutors({ ...filter, limit: PAGE }).then(
      (page) => { if (alive) dispatch({ type: 'first', key: k, items: page.items, total: page.total, cursor: page.nextCursor }); },
      (e: Error) => { if (alive) dispatch({ type: 'fail', key: k, message: e.message }); },
    );
    return () => { alive = false; };
  }, [filter, key]);

  // следующие страницы — автоматически при прокрутке
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !cursor || !fresh) return;
    let alive = true;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      dispatch({ type: 'more-start' });
      api.listTutors({ ...filter, limit: PAGE, cursor }).then(
        (page) => { if (alive) dispatch({ type: 'more', items: page.items, cursor: page.nextCursor }); },
        (e: Error) => { if (alive) dispatch({ type: 'more-fail', message: e.message }); },
      );
    }, { rootMargin: '1600px 0px' });
    io.observe(node);
    return () => { alive = false; io.disconnect(); };
  }, [cursor, fresh, filter]);

  const set = (patch: Partial<TutorFilter>) => setFilter({ ...filter, ...patch, cursor: null });
  const reset = () => { setSearchReset((value) => value + 1); setFilter({ sort: filter.sort }); };

  return (
    <PublicLayout tight>
      <PageHeader title="Топ репеты" />

      <search className="trh-sec trh-tools" {...rv('up', 0.05)}>
        <CatalogSearch key={JSON.stringify([filter.query ?? '', searchReset])} query={filter.query ?? ''} onSearch={(query) => { set({ query: query || undefined }); trackGoal('teacher_search', { has_query: Boolean(query) }); }} />
        <div className="trh-chips">
          <FilterMenu
            active={Boolean(filter.subject || filter.priceMin || filter.priceMax || filter.hasIntro)}
            subject={{ value: filter.subject ?? null, options: SUBJECTS, onChange: (v) => { set({ subject: v }); trackGoal('teacher_filter', { subject: v ? safeChoice(v) : 'all' }); } }}
            price={{ min: filter.priceMin ?? 0, max: filter.priceMax ?? 5000, onChange: (min, max) => set({ priceMin: min, priceMax: max }) }}
            bonus={{ label: 'Бесплатное знакомство', on: Boolean(filter.hasIntro), onToggle: () => set({ hasIntro: !filter.hasIntro || undefined }) }}
            onReset={() => setFilter({ sort: filter.sort, query: filter.query })}
          />
          <Dropdown label="Сортировка" icon="sort" value={filter.sort ?? 'recommended'} options={SORTS.map((s) => ({ ...s }))} onChange={(v) => set({ sort: (v ?? 'recommended') as TutorFilter['sort'] })} align="right" iconOnly />
        </div>
      </search>

      <section className="trh-sec" aria-label="Преподаватели" aria-busy={loading}>
        {error ? <ErrorState text={error} onRetry={() => setAttempt((value) => value + 1)} /> : null}
        {!loading && total === 0 ? (
          <EmptyState icon="search" title="По вашему запросу преподавателей не нашлось" text="Попробуйте другое имя, предмет или тему. Или опишите задачу в заявке: подходящие репетиторы откликнутся сами."
            actions={<><Button onClick={reset}>Показать всех</Button>{user && <Button to="/me/requests/new" variant="line">Создать заявку</Button>}</>} />
        ) : (
          <TutorGrid tutors={visibleItems}>
            {((!fresh && !initialUnfiltered) || (loading && cursor)) && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} height={360} radius={36} />)}
          </TutorGrid>
        )}
        {cursor && <div ref={sentinel} className="trh-sentinel" aria-hidden="true" />}
      </section>
    </PublicLayout>
  );
}


function CatalogSearch({ query, onSearch }: { query: string; onSearch: (query: string) => void }) {
  const [input, setInput] = useState(query);
  return <form className="search" onSubmit={(e) => { e.preventDefault(); onSearch(input.trim()); }}>
    <Icon name="search" />
    <input className="ym-disable-keys trh-search-input" type="search" autoComplete="off" name="query" aria-label="Поиск по предмету, теме или имени преподавателя" placeholder="Предмет или имя" maxLength={200} value={input} onChange={(e) => setInput(e.target.value)} />
    <Button type="submit" size="s">Найти</Button>
  </form>;
}
