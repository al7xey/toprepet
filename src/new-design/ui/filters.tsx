import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { rub } from '../lib/format';
import { Icon } from './icon';

/** Выпадающее меню фильтра из белого стекла. */
export function Dropdown<T extends string | number>({ label, icon, value, options, onChange, allLabel, align, iconOnly }: { iconOnly?: boolean; label: string; icon?: string; value: T | null; options: { value: T; label: string }[]; onChange: (v: T | null) => void; allLabel?: string; align?: 'right' }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const outside = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) ref.current?.removeAttribute('open'); };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && ref.current?.open) {
        e.preventDefault();
        ref.current.removeAttribute('open');
        ref.current.querySelector('summary')?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', esc); };
  }, []);
  const pick = (v: T | null) => {
    onChange(v);
    ref.current?.removeAttribute('open');
    ref.current?.querySelector('summary')?.focus();
  };
  const current = options.find((o) => o.value === value);
  return (
    <details className="trh-drop" ref={ref}>
      <summary className={`chipf${value !== null && allLabel ? ' on' : ''}${iconOnly ? ' ico' : ''}`} aria-label={iconOnly && current ? `${label}: ${current.label}` : label} title={label}>
        {icon && <Icon name={icon} />}{iconOnly ? null : <>{current?.label ?? label}<Icon name="down" /></>}
      </summary>
      <div className={`trh-drop-menu surf-strong${align === 'right' ? ' right' : ''}`}>
        {allLabel && <button type="button" className={value === null ? 'on' : undefined} onClick={() => pick(null)}>{allLabel}</button>}
        {options.map((o) => (
          <button type="button" key={String(o.value)} className={o.value === value ? 'on' : undefined} aria-pressed={o.value === value} onClick={() => pick(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </details>
  );
}

export const Chip = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) => (
  <button type="button" className={`chipf${on ? ' on' : ''}`} aria-pressed={on} onClick={onClick}>{children}</button>
);

const PRICE_HI = 5000; // правая граница ползунка в фильтрах: «5 000 ₽ и дороже»
const PRICE_STEP = 100;

/** Цена «от и до»: два движка на одной шкале. Значение применяется, когда палец отпущен. */
export function PriceRange({ min, max, onChange, limit = PRICE_HI, label = 'Цена' }: { min: number; max: number; onChange: (min: number, max: number) => void; limit?: number; label?: string }) {
  const [lo, setLo] = useState(min);
  const [hi, setHi] = useState(max);
  const commit = () => onChange(lo, hi);
  return (
    <div className="trh-range">
      <div className="trh-range-vals"><span>от <b>{rub(lo)}</b></span><span>{hi >= limit ? <>больше <b>{rub(limit)}</b></> : <>до <b>{rub(hi)}</b></>}</span></div>
      <div className="trh-range-track" style={{ '--a': `${(lo / limit) * 100}%`, '--b': `${(hi / limit) * 100}%` } as CSSProperties}>
        <input type="range" aria-label={`${label} от`} min={0} max={limit} step={PRICE_STEP} value={lo} onChange={(e) => setLo(Math.min(Number(e.target.value), hi - PRICE_STEP))} onPointerUp={commit} onKeyUp={commit} onBlur={commit} />
        <input type="range" aria-label={`${label} до`} min={0} max={limit} step={PRICE_STEP} value={hi} onChange={(e) => setHi(Math.max(Number(e.target.value), lo + PRICE_STEP))} onPointerUp={commit} onKeyUp={commit} onBlur={commit} />
      </div>
    </div>
  );
}

/** Кнопка фильтров: значок с ползунками открывает страницу фильтров на весь экран. Точка на значке — фильтр включён. */
export function FilterMenu({ subject, price, bonus, onReset, active }: {
  subject: { value: string | null; options: string[]; onChange: (v: string | null) => void };
  price: { min: number; max: number; onChange: (min: number | null, max: number | null) => void };
  bonus: { label: string; on: boolean; onToggle: () => void };
  onReset: () => void;
  active: boolean;
}) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!open || !element) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflowBefore = document.documentElement.style.overflow;
    // Native modal semantics keep focus inside and make the page underneath inert.
    element.showModal();
    document.documentElement.style.overflow = 'hidden';
    return () => {
      element.close();
      document.documentElement.style.overflow = overflowBefore;
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);
  const page = open && (
    <dialog ref={dialog} className="trh-fpage" aria-modal="true" aria-label="Фильтры" onCancel={(event) => { event.preventDefault(); setOpen(false); }} onKeyDown={(event) => {
      if (event.key !== 'Tab') return;
      const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button,input,select,textarea,a[href],[tabindex]')]
        .filter((node) => node.tabIndex >= 0 && !node.matches(':disabled') && node.getClientRects().length > 0);
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}>
      <div className="trh-fpage-head">
        <h2>Фильтры</h2>
        <button type="button" className="trk-iconbtn trk-round" aria-label="Закрыть фильтры" onClick={() => setOpen(false)}><Icon name="x" /></button>
      </div>
      <div className="trh-fpage-body">
        <div className="trh-fpage-group">
          <b>Предмет</b>
          <div className="trh-fpage-opts">
            <button type="button" className={`opt${subject.value === null ? ' on' : ''}`} aria-pressed={subject.value === null} onClick={() => subject.onChange(null)}>Все предметы</button>
            {subject.options.map((o) => (
              <button type="button" key={o} className={`opt${o === subject.value ? ' on' : ''}`} aria-pressed={o === subject.value} onClick={() => subject.onChange(o)}>{o}</button>
            ))}
          </div>
        </div>
        <div className="trh-fpage-group">
          <b>Цена за урок</b>
          <PriceRange key={`${price.min}-${price.max}`} min={price.min} max={price.max} onChange={(lo, hi) => price.onChange(lo > 0 ? lo : null, hi < PRICE_HI ? hi : null)} />
        </div>
        <div className="trh-fpage-group">
          <b>Бонус</b>
          <div className="trh-fpage-opts">
            <button type="button" className={`opt${bonus.on ? ' on' : ''}`} aria-pressed={bonus.on} onClick={bonus.onToggle}>{bonus.label}</button>
          </div>
        </div>
      </div>
      {active && <div className="trh-fpage-foot">
        <button type="button" className="btn btn-line btn-lg" onClick={() => { onReset(); dialog.current?.querySelector<HTMLButtonElement>('.trh-fpage-head button')?.focus(); }}>Сбросить</button>
        <button type="button" className="btn btn-primary btn-lg" onClick={() => setOpen(false)}>Показать</button>
      </div>}
    </dialog>
  );
  return (
    <>
      <button type="button" className="chipf ico trh-filters" aria-label="Фильтры" title="Фильтры" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
        <Icon name="filter" />{active && <span className="trh-filters-dot" aria-hidden="true" />}
      </button>
      {page && createPortal(page, document.querySelector('.tr') ?? document.body)}
    </>
  );
}
