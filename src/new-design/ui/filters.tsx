import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './icon';

/** Выпадающее меню фильтра из белого стекла. */
export function Dropdown<T extends string | number>({ label, icon, value, options, onChange, allLabel, align, iconOnly }: { iconOnly?: boolean; label: string; icon?: string; value: T | null; options: { value: T; label: string }[]; onChange: (v: T | null) => void; allLabel?: string; align?: 'right' }) {
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
      <summary className={`chipf${value !== null && allLabel ? ' on' : ''}${iconOnly ? ' ico' : ''}`} aria-label={label} title={label}>
        {icon && <Icon name={icon} />}{iconOnly ? null : <>{current?.label ?? label}<Icon name="down" /></>}
      </summary>
      <div className={`trh-drop-menu surf-strong${align === 'right' ? ' right' : ''}`}>
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

export const Chip = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) => (
  <button type="button" className={`chipf${on ? ' on' : ''}`} aria-pressed={on} onClick={onClick}>{children}</button>
);

/** Кнопка фильтров: значок с ползунками открывает страницу фильтров на весь экран. Точка на значке — фильтр включён. */
export function FilterMenu({ groups, intro, onIntro, onReset, active }: {
  groups: { label: string; allLabel: string; value: string | number | null; options: { value: string | number; label: string }[]; onChange: (v: string | number | null) => void }[];
  intro: { label: string; on: boolean };
  onIntro: () => void;
  onReset: () => void;
  active: boolean;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', esc);
    document.documentElement.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', esc); document.documentElement.style.overflow = ''; };
  }, [open]);
  const page = open && (
    <dialog open className="trh-fpage" aria-modal="true" aria-label="Фильтры">
      <div className="trh-fpage-head">
        <h2>Фильтры</h2>
        <button type="button" className="trk-iconbtn" aria-label="Закрыть фильтры" onClick={() => setOpen(false)}><Icon name="x" /></button>
      </div>
      <div className="trh-fpage-body">
        {groups.map((g) => (
          <div className="trh-fpage-group" key={g.label}>
            <b>{g.label}</b>
            <div className="trh-fpage-opts">
              <button type="button" className={`opt${g.value === null ? ' on' : ''}`} aria-pressed={g.value === null} onClick={() => g.onChange(null)}>{g.allLabel}</button>
              {g.options.map((o) => (
                <button type="button" key={String(o.value)} className={`opt${o.value === g.value ? ' on' : ''}`} aria-pressed={o.value === g.value} onClick={() => g.onChange(o.value)}>{o.label}</button>
              ))}
            </div>
          </div>
        ))}
        <div className="trh-fpage-group">
          <div className="trh-fpage-opts">
            <button type="button" className={`opt${intro.on ? ' on' : ''}`} aria-pressed={intro.on} onClick={onIntro}>{intro.label}</button>
          </div>
        </div>
      </div>
      <div className="trh-fpage-foot">
        <button type="button" className="btn btn-line btn-lg" onClick={onReset} disabled={!active}>Сбросить</button>
        <button type="button" className="btn btn-primary btn-lg" onClick={() => setOpen(false)}>Показать</button>
      </div>
    </dialog>
  );
  return (
    <>
      <button type="button" className="chipf ico trh-filters" aria-label="Фильтры" title="Фильтры" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <Icon name="filter" />{active && <span className="trh-filters-dot" aria-hidden="true" />}
      </button>
      {page && createPortal(page, document.querySelector('.tr') ?? document.body)}
    </>
  );
}
