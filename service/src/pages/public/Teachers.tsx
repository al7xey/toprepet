import { useId, useMemo, useState, type KeyboardEvent, type SubmitEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchCatalog, type CatalogItem } from '../../api/catalog';
import { SUPPORT_URL } from '../../api/config';
import { useViewerZone } from '../../api/session';
import { listSubjects, type Subject } from '../../api/tutor';
import { useAsync } from '../../api/useAsync';
import {
  activeCount,
  activeFilters,
  DAYS_OPTIONS,
  EMPTY,
  EXP_OPTIONS,
  expLabel,
  filtersToParams,
  GOAL_OPTIONS,
  goalLabel,
  hasNarrowing,
  nearbySubjects,
  parseFilters,
  PART_OPTIONS,
  PRICE_OPTIONS,
  priceLabel,
  suggest,
  timeLabel,
  without,
  type DropKey,
  type Filters,
} from '../../lib/catalog';
import { countLabel } from '../../lib/time';
import { LoadError, Loading } from '../../ui/LoadError';
import { usePageMeta } from '../../ui/meta';
import { Overlay } from '../../ui/Overlay';
import { TeacherCard } from '../../ui/TeacherCard';

const PAGE = 12;
const tutorsLabel = (n: number) => countLabel(n, 'преподаватель', 'преподавателя', 'преподавателей');

/** /teachers/ (mockups catalog, catalogSuggest, catalogEn, catalogFilters, catalogFiltered, catalogFilterEmpty, catalogEmpty).
    Filters live in the address, so a result can be shared and the back button works. Guests are never asked to log in here. */
export function Teachers() {
  usePageMeta('Найти репетитора онлайн: цены и свободное время | TopRepet', {
    description: 'Каталог репетиторов TopRepet: школьные предметы, ОГЭ, ЕГЭ и языки. В анкете цена за 60 и 90 минут и свободные окна для записи.',
  });
  const tz = useViewerZone();
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(params), [params]);
  const key = filtersToParams(filters).toString();
  const subjects = useAsync(listSubjects, 'subjects');
  const list = subjects.data ?? [];
  const subjectName = (slug: string) => list.find(s => s.slug === slug)?.name ?? slug;

  const result = useAsync(() => fetchCatalog(filters, tz), `${key}|${tz}`);
  const [shown, setShown] = useState({ key: '', n: PAGE });
  const limit = shown.key === key ? shown.n : PAGE;
  const [sheet, setSheet] = useState(false);

  const apply = (f: Filters) => setParams(filtersToParams(f));
  const active = activeFilters(filters, subjectName);
  const items = result.data ?? [];

  return (
    <>
      <div className="stack s">
        <h1 className="h1">Топ репеты</h1>
        <p className="sub">Найдите преподавателя, с&nbsp;которым будет комфортно учиться и&nbsp;двигаться к&nbsp;цели.</p>
      </div>
      <Search key={key} filters={filters} subjects={list} subjectName={subjectName} onApply={apply} />
      <FilterBar filters={filters} subjectName={subjectName} onOpen={() => setSheet(true)} onDrop={k => apply(without(filters, k))} />

      {result.loading ? (
        <Loading />
      ) : result.error ? (
        <LoadError title="Не получилось загрузить каталог" onRetry={result.reload} />
      ) : items.length === 0 ? (
        hasNarrowing(filters) ? (
          <FilterEmpty filters={filters} tz={tz} subjectName={subjectName} onApply={apply} />
        ) : (
          <QueryEmpty filters={filters} tz={tz} subjects={list} onApply={apply} />
        )
      ) : (
        <>
          <div className="row sb">
            <output className="mut" aria-live="polite">
              Найдено: <b style={{ color: 'var(--ink)' }}>{tutorsLabel(items.length)}</b>
            </output>
            {active.length ? (
              <button type="button" className="lnk tap" onClick={() => apply(EMPTY)}>
                Сбросить
              </button>
            ) : (
              <span className="mut sm only-d">Цены указаны за&nbsp;60 минут</span>
            )}
          </div>
          <Grid items={items.slice(0, limit)} search={filters.subject ? `?subject=${filters.subject}` : ''} />
          {items.length > limit ? (
            <div className="row" style={{ justifyContent: 'center' }}>
              <button type="button" className="btn" onClick={() => setShown({ key, n: limit + PAGE })}>
                Показать ещё
              </button>
            </div>
          ) : null}
        </>
      )}

      <FilterSheet
        open={sheet}
        filters={filters}
        subjects={list}
        tz={tz}
        onClose={() => setSheet(false)}
        onApply={f => {
          setSheet(false);
          apply(f);
        }}
      />
    </>
  );
}

export function Grid({ items, search = '' }: { items: CatalogItem[]; search?: string }) {
  return (
    <ul className="tgrid" aria-label="Преподаватели">
      {items.map(t => (
        <li key={t.id}>
          <TeacherCard t={t} search={search} />
        </li>
      ))}
    </ul>
  );
}

/* ---------- search with subject suggestions (У1.1, catalogSuggest) ---------- */
function Search({
  filters,
  subjects,
  subjectName,
  onApply,
}: {
  filters: Filters;
  subjects: Subject[];
  subjectName: (slug: string) => string;
  onApply: (f: Filters) => void;
}) {
  const id = useId();
  // null until the visitor types: until then the field shows the search or the chosen subject (its name may load later)
  const [typed, setTyped] = useState<string | null>(null);
  const text = typed ?? (filters.q || (filters.subject ? subjectName(filters.subject) : ''));
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const hints = open ? suggest(subjects, text).filter(s => s.name.toLowerCase() !== text.trim().toLowerCase()) : [];

  const pickSubject = (s: Subject) => {
    setTyped(s.name);
    setOpen(false);
    onApply({ ...filters, subject: s.slug, q: '' });
  };

  function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const t = text.trim();
    if (open && hints[cursor]) return pickSubject(hints[cursor]);
    setOpen(false);
    const exact = subjects.find(s => s.name.toLowerCase() === t.toLowerCase());
    onApply({ ...filters, subject: exact ? exact.slug : null, q: exact ? '' : t });
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (!hints.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor(c => (c + 1) % hints.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor(c => (c - 1 + hints.length) % hints.length);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <form className="search" onSubmit={submit}>
      <label className="sr-only" htmlFor={`${id}-q`}>
        Чему хотите научиться?
      </label>
      <input
        id={`${id}-q`}
        className="q"
        type="search"
        placeholder="Чему хотите научиться?"
        autoComplete="off"
        aria-controls={hints.length ? `${id}-list` : undefined}
        value={text}
        onChange={e => {
          setTyped(e.target.value);
          setOpen(true);
          setCursor(0);
        }}
        onKeyDown={onKey}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      <button type="submit" className="btn p">
        Найти
      </button>
      {hints.length ? (
        <ul className="drop" id={`${id}-list`} aria-label="Подсказки">
          {hints.map((s, i) => (
            <li key={s.id}>
              <button type="button" className={i === cursor ? 'on' : undefined} onMouseDown={e => e.preventDefault()} onClick={() => pickSubject(s)}>
                {s.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}

/* ---------- filter buttons above the grid (catalogFiltered) ---------- */
function FilterBar({
  filters,
  subjectName,
  onOpen,
  onDrop,
}: {
  filters: Filters;
  subjectName: (slug: string) => string;
  onOpen: () => void;
  onDrop: (key: DropKey) => void;
}) {
  const n = activeCount(filters);
  const groups: { key: DropKey; title: string; value: string }[] = [
    { key: 'subject', title: 'Предмет', value: filters.subject ? subjectName(filters.subject) : '' },
    { key: 'goal', title: 'Цель', value: filters.goal ? goalLabel(filters.goal) : '' },
    { key: 'price', title: 'Цена', value: filters.price ? priceLabel(filters.price) : '' },
    { key: 'time', title: 'Когда удобно', value: timeLabel(filters) },
    { key: 'exp', title: 'Опыт', value: filters.exp ? expLabel(filters.exp) : '' },
  ];
  return (
    <div className="fbar">
      <button type="button" className={`fbtn all${n ? ' on' : ''}`} onClick={onOpen} aria-haspopup="dialog">
        {n ? (
          <>
            Фильтры <em className="pill act cntp">{n}</em>
          </>
        ) : (
          'Все фильтры'
        )}
      </button>
      {groups.map(g =>
        g.value ? (
          <span key={g.key} className="fbtn on">
            <button type="button" className="fb-l" onClick={onOpen} aria-haspopup="dialog">
              {g.value}
            </button>
            <button type="button" className="chip-x" aria-label={`Снять фильтр «${g.value}»`} onClick={() => onDrop(g.key)} />
          </span>
        ) : (
          <button key={g.key} type="button" className="fbtn" onClick={onOpen} aria-haspopup="dialog">
            {g.title}
          </button>
        ),
      )}
    </div>
  );
}

/* ---------- all filters: bottom sheet on a phone, dialog on a desktop (catalogFilters) ---------- */
function Opt({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button type="button" className={`opt${on ? ' on' : ''}`} aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  );
}

function FilterSheet({
  open,
  filters,
  subjects,
  tz,
  onClose,
  onApply,
}: {
  open: boolean;
  filters: Filters;
  subjects: Subject[];
  tz: string;
  onClose: () => void;
  onApply: (f: Filters) => void;
}) {
  return (
    <Overlay open={open} onClose={onClose} className="dlg wide fsheet" label="Фильтры">
      <SheetBody filters={filters} subjects={subjects} tz={tz} onClose={onClose} onApply={onApply} />
    </Overlay>
  );
}

function SheetBody({
  filters,
  subjects,
  tz,
  onClose,
  onApply,
}: {
  filters: Filters;
  subjects: Subject[];
  tz: string;
  onClose: () => void;
  onApply: (f: Filters) => void;
}) {
  const [d, setD] = useState<Filters>(filters);
  const set = (patch: Partial<Filters>) => setD(prev => ({ ...prev, ...patch }));
  const count = useAsync(() => fetchCatalog(d, tz), `${filtersToParams(d).toString()}|${tz}`);
  const n = count.data?.length;
  // subjects somebody teaches right now; the full reference list until that is known
  const all = useAsync(() => fetchCatalog(EMPTY, tz), `all|${tz}`);
  const taught = new Set((all.data ?? []).flatMap(t => t.subjects));
  const shownSubjects = all.data ? subjects.filter(s => taught.has(s.name) || s.slug === d.subject) : subjects;
  return (
    <>
      <div className="row sb nw">
        <b className="h2">Фильтры</b>
        <button type="button" className="x" aria-label="Закрыть" onClick={onClose} />
      </div>
      <div>
        <fieldset className="fgrp">
          <legend className="h3">Предмет</legend>
          <div className="opts">
            {shownSubjects.map(s => (
              <Opt key={s.id} on={d.subject === s.slug} onClick={() => set({ subject: d.subject === s.slug ? null : s.slug })}>
                {s.name}
              </Opt>
            ))}
            <Opt on={!d.subject} onClick={() => set({ subject: null })}>
              Все предметы
            </Opt>
          </div>
        </fieldset>
        <fieldset className="fgrp">
          <legend className="h3">Цель</legend>
          <div className="opts">
            {GOAL_OPTIONS.map(g => (
              <Opt key={g.id} on={d.goal === g.id} onClick={() => set({ goal: d.goal === g.id ? null : g.id })}>
                {g.label}
              </Opt>
            ))}
          </div>
        </fieldset>
        <fieldset className="fgrp">
          <legend className="h3">Цена за&nbsp;60 минут</legend>
          <div className="opts">
            <Opt on={!d.price} onClick={() => set({ price: null })}>
              Любая
            </Opt>
            {PRICE_OPTIONS.map(p => (
              <Opt key={p} on={d.price === p} onClick={() => set({ price: p })}>
                {priceLabel(p)}
              </Opt>
            ))}
          </div>
        </fieldset>
        <fieldset className="fgrp">
          <legend className="h3">Когда удобно</legend>
          <span className="hint">По свободным окнам репетитора на&nbsp;ближайшие 2&nbsp;недели, в&nbsp;вашем поясе</span>
          <div className="opts">
            {DAYS_OPTIONS.map(o => (
              <Opt key={o.id} on={d.days === o.id} onClick={() => set({ days: d.days === o.id ? null : o.id })}>
                {o.label}
              </Opt>
            ))}
          </div>
          <div className="opts">
            {PART_OPTIONS.map(o => (
              <Opt
                key={o.id}
                on={d.parts.includes(o.id)}
                onClick={() => set({ parts: d.parts.includes(o.id) ? d.parts.filter(p => p !== o.id) : PART_OPTIONS.map(x => x.id).filter(x => x === o.id || d.parts.includes(x)) })}
              >
                {o.label}
              </Opt>
            ))}
          </div>
        </fieldset>
        <fieldset className="fgrp">
          <legend className="h3">Опыт преподавания</legend>
          <div className="opts">
            <Opt on={!d.exp} onClick={() => set({ exp: null })}>
              Любой
            </Opt>
            {EXP_OPTIONS.map(x => (
              <Opt key={x} on={d.exp === x} onClick={() => set({ exp: x })}>
                {expLabel(x)}
              </Opt>
            ))}
          </div>
        </fieldset>
      </div>
      <div className="row nw fact">
        <button type="button" className="btn" onClick={() => setD({ ...EMPTY, q: d.q })}>
          Сбросить
        </button>
        <button type="button" className="btn p w" onClick={() => onApply(d)} aria-live="polite">
          {n === undefined ? 'Показать' : `Показать ${n}`}
        </button>
      </div>
    </>
  );
}

/* ---------- nobody by filters: which one to drop and how many that gives (У1.3, catalogFilterEmpty) ---------- */
function FilterEmpty({
  filters,
  tz,
  subjectName,
  onApply,
}: {
  filters: Filters;
  tz: string;
  subjectName: (slug: string) => string;
  onApply: (f: Filters) => void;
}) {
  const active = activeFilters(filters, subjectName);
  const counts = useAsync(
    () => Promise.all(active.map(a => fetchCatalog(without(filters, a.key), tz).then(r => r.length))),
    `${filtersToParams(filters).toString()}|${tz}|drop`,
  );
  return (
    <div className="card f">
      <b className="h3">С&nbsp;такими фильтрами преподавателей нет</b>
      <p className="mut">{counts.data?.every(c => c === 0) ? 'Снятие одного фильтра не\u00a0поможет. Сбросьте все и\u00a0начните заново.' : 'Снимите один из\u00a0фильтров:'}</p>
      {counts.data ? (
        <div className="chips">
          {active.map((a, i) =>
            counts.data![i] > 0 ? (
              <button key={a.key} type="button" className="chip" onClick={() => onApply(without(filters, a.key))}>
                Без «{a.label}»: {counts.data![i]}
              </button>
            ) : null,
          )}
        </div>
      ) : (
        <Loading />
      )}
      <button type="button" className="btn s" style={{ justifySelf: 'start' }} onClick={() => onApply(EMPTY)}>
        Сбросить все
      </button>
    </div>
  );
}

/* ---------- nobody for a search: nearby directions that do have tutors and a way to ask us (У1.2, catalogEmpty) ---------- */
function QueryEmpty({ filters, tz, subjects, onApply }: { filters: Filters; tz: string; subjects: Subject[]; onApply: (f: Filters) => void }) {
  const all = useAsync(() => fetchCatalog(EMPTY, tz), `all|${tz}`);
  const query = filters.q || subjects.find(s => s.slug === filters.subject)?.name || '';
  const near = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of all.data ?? []) for (const s of t.subjects) counts.set(s, (counts.get(s) ?? 0) + 1);
    const withTutors = [...counts].map(([name, count]) => ({ name, count })).filter(s => subjects.some(x => x.name === s.name));
    return nearbySubjects(withTutors, query);
  }, [all.data, subjects, query]);
  return (
    <div className="card f">
      <b className="h3">По вашему запросу преподавателей не&nbsp;нашлось</b>
      {near.length ? (
        <>
          <p className="mut">Попробуйте другое имя, предмет или тему. Похожие направления:</p>
          <div className="chips">
            {near.map(s => (
              <button
                key={s.name}
                type="button"
                className="chip"
                onClick={() => onApply({ ...EMPTY, subject: subjects.find(x => x.name === s.name)!.slug })}
              >
                {s.name}
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="mut">Попробуйте другое имя, предмет или тему.</p>
      )}
      <p className="mut">
        Не&nbsp;нашли нужное? Напишите нам, и&nbsp;мы подберём репетитора.
      </p>
      <div className="row">
        <button type="button" className="btn s" onClick={() => onApply(EMPTY)}>
          Показать всех
        </button>
        <a className="btn s" href={SUPPORT_URL} target="_blank" rel="noreferrer">
          Написать нам
        </a>
      </div>
    </div>
  );
}
