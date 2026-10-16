import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from './icon';

/** Выпадающее меню фильтра из белого стекла. */
export function Dropdown<T extends string | number>({ label, icon, value, options, onChange, allLabel, align }: { label: string; icon?: string; value: T | null; options: { value: T; label: string }[]; onChange: (v: T | null) => void; allLabel?: string; align?: 'right' }) {
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

export const Chip = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) => (
  <button type="button" className={`chipf${on ? ' on' : ''}`} aria-pressed={on} onClick={onClick}>{children}</button>
);
