import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../../ui/icons';
import { catalog, sel } from '../../api';
import { cx } from '../../ui/kit';

/* «Предмет, тема или репет» with suggestions: subject + goal first, then subjects. */
export function SearchBar({ initial = '', btn = 'primary', base, onSubmit, autoFocus }: { initial?: string; btn?: 'primary' | 'tinted'; base?: Partial<sel.CatalogFilters>; onSubmit?: (f: Partial<sel.CatalogFilters>) => void; autoFocus?: boolean }) {
  const [q, setQ] = useState(initial);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setQ(initial);
  }, [initial]);
  useEffect(() => {
    const onDown = (e: MouseEvent) => wrap.current && !wrap.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);
  const sug = catalog.suggestions(q);
  const items: { label: React.ReactNode; f: Partial<sel.CatalogFilters>; icon: 'search' | 'doc' }[] = [
    ...sug.pairs.map(p => ({ label: <><b>{p.subject.replace(/ язык$/, '')}</b> · {p.goal.toLowerCase()}</>, f: { subject: p.subject, goal: p.goal, q: '' }, icon: 'search' as const })),
    ...sug.subjects.map(s => ({ label: s, f: { subject: s, q: '' }, icon: 'doc' as const })),
  ];
  const go = (f: Partial<sel.CatalogFilters>) => {
    setOpen(false);
    const filters = { ...sel.EMPTY_FILTERS, ...base, ...f };
    if (onSubmit) onSubmit(f);
    else navigate(`/teachers${sel.filtersToSearch(filters)}`);
  };
  const submit = () => (open && items[active] ? go(items[active].f) : go({ q: q.trim() }));
  return (
    <div ref={wrap} style={{ position: 'relative', zIndex: 5, width: '100%' }}>
      <div className={cx('search surface r3-search', open && items.length > 0 && 'is-focus')} role="search">
        <Icon name="search" />
        <input
          aria-label="Поиск"
          placeholder="Предмет, тема или репет"
          value={q}
          autoFocus={autoFocus}
          role="combobox"
          aria-expanded={open && items.length > 0}
          aria-controls="search-sug"
          onChange={e => { setQ(e.target.value); setOpen(true); setActive(0); }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, items.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
            if (e.key === 'Enter') { e.preventDefault(); submit(); }
            if (e.key === 'Escape') setOpen(false);
          }}
        />
        <button className={`btn btn--${btn} btn--s`} type="button" onClick={submit}>Найти</button>
      </div>
      {open && items.length > 0 && (
        <div className="r3-sug" id="search-sug" role="listbox" aria-label="Подсказки" style={{ position: 'absolute', left: 0, right: 0, top: 'calc(100% + 8px)' }}>
          {sug.pairs.length > 0 && <small>ПРЕДМЕТ И ЦЕЛЬ</small>}
          {items.map((it, i) => (
            <div key={i}>
              {i === sug.pairs.length && sug.subjects.length > 0 && <small>ПРЕДМЕТЫ</small>}
              <a href="#" role="option" aria-selected={i === active} className={i === active ? 'on' : undefined} onMouseEnter={() => setActive(i)} onClick={e => { e.preventDefault(); go(it.f); }}>
                <Icon name={it.icon} /><span>{it.label}</span>
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
