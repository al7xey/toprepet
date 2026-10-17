import { useEffect, useRef, type ReactNode } from 'react';
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

/** Кнопка фильтров: значок с ползунками, под ним панель с группами. Точка на значке — фильтр включён. */
export function FilterMenu({ groups, intro, onIntro, onReset, active }: {
  groups: { label: string; allLabel: string; value: string | number | null; options: { value: string | number; label: string }[]; onChange: (v: string | number | null) => void }[];
  intro: { label: string; on: boolean };
  onIntro: () => void;
  onReset: () => void;
  active: boolean;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const outside = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) ref.current?.removeAttribute('open'); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') ref.current?.removeAttribute('open'); };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', esc); };
  }, []);
  return (
    <details className="trh-drop trh-filters" ref={ref}>
      <summary className="chipf ico" aria-label="Фильтры" title="Фильтры">
        <Icon name="filter" />{active && <span className="trh-filters-dot" aria-hidden="true" />}
      </summary>
      <div className="trh-drop-menu trh-filters-menu">
        {groups.map((g) => (
          <div className="trh-filters-group" key={g.label}>
            <b>{g.label}</b>
            <button type="button" className={g.value === null ? 'on' : undefined} onClick={() => g.onChange(null)}>{g.allLabel}{g.value === null && <Icon name="check" />}</button>
            {g.options.map((o) => (
              <button type="button" key={String(o.value)} className={o.value === g.value ? 'on' : undefined} aria-pressed={o.value === g.value} onClick={() => g.onChange(o.value)}>
                {o.label}{o.value === g.value && <Icon name="check" />}
              </button>
            ))}
          </div>
        ))}
        <div className="trh-filters-group">
          <button type="button" className={intro.on ? 'on' : undefined} aria-pressed={intro.on} onClick={onIntro}>{intro.label}{intro.on && <Icon name="check" />}</button>
        </div>
        {active && <button type="button" className="trh-filters-reset" onClick={onReset}>Сбросить</button>}
      </div>
    </details>
  );
}
