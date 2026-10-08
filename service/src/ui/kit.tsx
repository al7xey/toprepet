import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode, type InputHTMLAttributes, type TextareaHTMLAttributes, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from './icons';
import type { Tone } from '../api/types';
import { nb } from '../lib/text';
import { useMedia } from './hooks';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
export { cx };

/* ---------- buttons ---------- */
type Variant = 'primary' | 'glass' | 'tinted' | 'gray' | 'danger' | 'white' | 'on-color';
type Size = 'l' | 'm' | 's';

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  v?: Variant;
  size?: Size;
  block?: boolean;
  icon?: IconName;
  circle?: boolean;
  loading?: boolean;
  to?: string;
}

export function Btn({ v = 'gray', size = 'm', block, icon, circle, loading, to, className, children, type = 'button', disabled, ...rest }: BtnProps) {
  const cls = cx('btn', `btn--${v}`, size !== 'l' && `btn--${size}`, block && 'btn--block', circle && 'btn--circle', className);
  const inner = (
    <>
      {loading ? <span className="spinner" aria-hidden="true" style={v === 'primary' ? undefined : { borderColor: 'rgb(0 0 0 / 15%)', borderTopColor: 'var(--ink)' }} /> : icon && <Icon name={icon} />}
      {typeof children === 'string' ? nb(children) : children}
    </>
  );
  if (to && !disabled) return <Link className={cls} to={to} aria-label={rest['aria-label']}>{inner}</Link>;
  return <button type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>{inner}</button>;
}

export function IBtn({ icon, label, onClick, to, className, pressed, badge }: { icon: IconName; label: string; onClick?: () => void; to?: string; className?: string; pressed?: boolean; badge?: number }) {
  const inner = (
    <>
      <Icon name={icon} />
      {badge ? <span className="nv-badge ibtn-badge">{badge}</span> : null}
    </>
  );
  if (to) return <Link className={cx('ibtn', className)} to={to} aria-label={label}>{inner}</Link>;
  return <button type="button" className={cx('ibtn', className)} aria-label={label} aria-pressed={pressed} onClick={onClick}>{inner}</button>;
}

/* ---------- status capsule ---------- */
export type StTone = 'neutral' | 'action' | 'ok' | 'bad' | 'glass';
export function St({ tone = 'neutral', icon, children }: { tone?: StTone; icon?: IconName; children: ReactNode }) {
  return <span className={`st st--${tone}`}>{icon && <Icon name={icon} />}{typeof children === 'string' ? nb(children) : children}</span>;
}

/* ---------- alerts and notes ---------- */
export function Alert({ tone, icon = 'info', title, children, action, style }: { tone?: 'action' | 'ok' | 'bad'; icon?: IconName; title?: ReactNode; children?: ReactNode; action?: ReactNode; style?: CSSProperties }) {
  return (
    <div className={cx('alert', tone && `alert--${tone}`)} style={style} role={tone === 'bad' ? 'alert' : undefined}>
      <Icon name={icon} />
      <div>{title && <b>{typeof title === 'string' ? nb(title) : title}</b>}{typeof children === 'string' ? nb(children) : children}</div>
      {action}
    </div>
  );
}

export function Note({ tone, icon = 'info', children, className }: { tone?: 'action' | 'bad'; icon?: IconName; children: ReactNode; className?: string }) {
  return <div className={cx('note', tone && `note--${tone}`, className)}><Icon name={icon} /><span>{typeof children === 'string' ? nb(children) : children}</span></div>;
}

/* ---------- key/value ---------- */
export function Kv({ rows, className }: { rows: [ReactNode, ReactNode][]; className?: string }) {
  return (
    <dl className={cx('kv', className)}>
      {rows.map(([k, v], i) => (
        <div key={i}><dt>{k}</dt><dd>{typeof v === 'string' ? nb(v) : v}</dd></div>
      ))}
    </dl>
  );
}

/* ---------- empty state ---------- */
export function Empty({ icon = 'inbox', title, children, action, className, style }: { icon?: IconName; title: string; children?: ReactNode; action?: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={cx('empty', className)} style={style}>
      <Icon name={icon} />
      <h4>{title}</h4>
      {children && <p>{typeof children === 'string' ? nb(children) : children}</p>}
      {action}
    </div>
  );
}

/* ---------- form fields ---------- */
export function Field({ label, help, error, children, optional, className, htmlFor, style, counter }: { label?: ReactNode; help?: ReactNode; error?: string; children: ReactNode; optional?: string; className?: string; htmlFor?: string; style?: CSSProperties; counter?: string }) {
  return (
    <div className={cx('field', className)} style={style}>
      {label && <label htmlFor={htmlFor}>{label}{optional && <> <span className="opt">{optional}</span></>}</label>}
      {children}
      {error ? <span className="err" role="alert"><Icon name="warn" />{error}</span> : help ? <span className="help">{help}</span> : null}
      {counter && <span className="counter">{counter}</span>}
    </div>
  );
}

export function Input({ invalid, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={cx('input', className)} aria-invalid={invalid || undefined} {...rest} />;
}

export function Textarea({ invalid, className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea className={cx('input', className)} aria-invalid={invalid || undefined} {...rest} />;
}

export function PasswordInput({ invalid, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="input-wrap">
      <input className="input input--icon" type={show ? 'text' : 'password'} aria-invalid={invalid || undefined} {...rest} />
      <button className="input-btn" type="button" aria-label={show ? 'Скрыть пароль' : 'Показать пароль'} onClick={() => setShow(s => !s)}><Icon name={show ? 'eye-off' : 'eye'} /></button>
    </div>
  );
}

/* labelled text field with an id */
export function TextField({ label, value, onChange, error, help, type = 'text', placeholder, autoComplete, optional, inputMode, multiline, rows, maxLength, className, style, autoFocus, disabled }: {
  label: ReactNode; value: string; onChange: (v: string) => void; error?: string; help?: ReactNode; type?: string; placeholder?: string; autoComplete?: string; optional?: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode']; multiline?: boolean; rows?: number; maxLength?: number; className?: string; style?: CSSProperties; autoFocus?: boolean; disabled?: boolean;
}) {
  const id = useId();
  return (
    <Field label={label} help={help} error={error} optional={optional} htmlFor={id} className={className} style={style} counter={maxLength && multiline ? `${value.length} / ${maxLength}` : undefined}>
      {multiline
        ? <Textarea id={id} value={value} rows={rows ?? 4} maxLength={maxLength} placeholder={placeholder} invalid={!!error} onChange={e => onChange(e.target.value)} disabled={disabled} />
        : type === 'password'
          ? <PasswordInput id={id} value={value} placeholder={placeholder} autoComplete={autoComplete} invalid={!!error} onChange={e => onChange(e.target.value)} autoFocus={autoFocus} />
          : <Input id={id} type={type} value={value} placeholder={placeholder} autoComplete={autoComplete} inputMode={inputMode} invalid={!!error} maxLength={maxLength} onChange={e => onChange(e.target.value)} autoFocus={autoFocus} disabled={disabled} />}
    </Field>
  );
}

/* capsule radio / checkbox */
export function Option({ type = 'radio', name, checked, onChange, children, small, disabled }: { type?: 'radio' | 'checkbox'; name?: string; checked: boolean; onChange: () => void; children: ReactNode; small?: ReactNode; disabled?: boolean }) {
  return (
    <label className="option">
      <input type={type} name={name} checked={checked} onChange={onChange} disabled={disabled} />
      {type === 'radio' ? <span className="dot" aria-hidden="true" /> : <span className="box" aria-hidden="true"><Icon name="check" /></span>}
      {typeof children === 'string' ? nb(children) : children}
      {small && <> <small>{typeof small === 'string' ? nb(small) : small}</small></>}
    </label>
  );
}

export function Options<T extends string>({ legend, options, value, onChange, name, className, legendClass, small, error }: { legend?: ReactNode; options: readonly T[] | { value: T; label: string; small?: string }[]; value: T | ''; onChange: (v: T) => void; name?: string; className?: string; legendClass?: string; small?: (v: T) => ReactNode; error?: string }) {
  const id = useId();
  const list = (options as (T | { value: T; label: string; small?: string })[]).map(o => (typeof o === 'string' ? { value: o as T, label: o as string, small: undefined } : o));
  return (
    <fieldset className={cx('options', className)}>
      {legend && <legend className={legendClass}>{legend}</legend>}
      {list.map(o => (
        <Option key={o.value} name={name ?? id} checked={value === o.value} onChange={() => onChange(o.value)} small={o.small ?? small?.(o.value)}>{o.label}</Option>
      ))}
      {error && <span className="err" role="alert" style={{ flexBasis: '100%' }}><Icon name="warn" />{error}</span>}
    </fieldset>
  );
}

export function Checks<T extends string>({ legend, options, value, onChange, className, error }: { legend?: ReactNode; options: readonly T[] | { value: T; label: string }[]; value: T[]; onChange: (v: T[]) => void; className?: string; error?: string }) {
  const list = (options as (T | { value: T; label: string })[]).map(o => (typeof o === 'string' ? { value: o as T, label: o as string } : o));
  return (
    <fieldset className={cx('options', className)}>
      {legend && <legend>{legend}</legend>}
      {list.map(o => (
        <Option key={o.value} type="checkbox" checked={value.includes(o.value)} onChange={() => onChange(value.includes(o.value) ? value.filter(x => x !== o.value) : [...value, o.value])}>{o.label}</Option>
      ))}
      {error && <span className="err" role="alert" style={{ flexBasis: '100%' }}><Icon name="warn" />{error}</span>}
    </fieldset>
  );
}

/* chips */
export function Chip({ children, pressed, set, menu, onClick, icon, label, count, expanded }: { children?: ReactNode; pressed?: boolean; set?: boolean; menu?: boolean; onClick?: () => void; icon?: IconName; label?: string; count?: number; expanded?: boolean }) {
  return (
    <button type="button" className={cx('chip', set && 'is-set')} aria-pressed={pressed} aria-expanded={expanded} aria-label={label} onClick={onClick}>
      {icon && <Icon name={icon} />}
      {typeof children === 'string' ? nb(children) : children}
      {count ? <span className="n">{count}</span> : null}
      {menu && <Icon name="down" />}
    </button>
  );
}

/* segmented control */
export function Seg<T extends string | number>({ items, value, onChange, label, full, className }: { items: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label?: string; full?: boolean; className?: string }) {
  return (
    <div className={cx('seg', 'seg--plain', className)} role="tablist" aria-label={label} style={full ? { display: 'grid', width: '100%', gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` } : undefined}>
      {items.map(i => (
        <button key={String(i.value)} type="button" role="tab" aria-selected={i.value === value} onClick={() => onChange(i.value)}>{nb(i.label)}</button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <span className="switch">
      <input type="checkbox" checked={checked} aria-label={label} onChange={e => onChange(e.target.checked)} />
      <span />
    </span>
  );
}

/* stars */
export function Stars({ n, size }: { n: number; size?: number }) {
  return (
    <span className="stars" aria-label={`${n} из 5`} role="img">
      {[1, 2, 3, 4, 5].map(i => <Icon key={i} name="star" className={i > Math.round(n) ? 'off' : undefined} style={size ? { width: size, height: size } : undefined} />)}
    </span>
  );
}

export function RateInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="r9-rate" role="radiogroup" aria-label="Оценка">
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} type="button" role="radio" aria-checked={i === value} aria-label={`${i} из 5`} className={i <= value ? 'on' : undefined} onClick={() => onChange(i)}><Icon name="star" /></button>
      ))}
    </div>
  );
}

export function StepsBar({ n, of }: { n: number; of: number }) {
  return (
    <div className="steps-bar" style={{ '--n': of } as CSSProperties} aria-label={`Шаг ${n} из ${of}`} role="img">
      {Array.from({ length: of }, (_, i) => <i key={i} className={i < n ? 'on' : undefined} />)}
    </div>
  );
}

export interface TimelineItem {
  state: 'done' | 'cur' | 'todo';
  title: ReactNode;
  text?: ReactNode;
  icon?: IconName;
}
export function Timeline({ items, flat, label }: { items: TimelineItem[]; flat?: boolean; label?: string }) {
  return (
    <ol className="timeline" aria-label={label} style={flat ? { padding: 0, boxShadow: 'none', maxWidth: 'none', background: 'none' } : { maxWidth: 'none' }}>
      {items.map((it, i) => (
        <li key={i} className={it.state}>
          <i>{it.icon ? <Icon name={it.icon} /> : it.state === 'done' ? <Icon name="check" /> : it.state === 'cur' ? <Icon name="clock" /> : null}</i>
          <div><b>{typeof it.title === 'string' ? nb(it.title) : it.title}</b>{it.text && <span>{typeof it.text === 'string' ? nb(it.text) : it.text}</span>}</div>
        </li>
      ))}
    </ol>
  );
}

/* ---------- photos ---------- */
export function Ph({ tone, src, alt = '', className, style, children }: { tone: Tone; src?: string; alt?: string; className?: string; style?: CSSProperties; children?: ReactNode }) {
  return (
    <div className={cx('ph', `ph-${tone}`, className)} style={style}>
      {src ? <img className="ph-img" src={src} alt={alt} loading="lazy" decoding="async" /> : <svg className="ph-person" viewBox="0 0 200 220" aria-hidden="true"><use href="#i-person" /></svg>}
      {children}
    </div>
  );
}

export function Ava({ tone, src, size, className, alt = '' }: { tone: Tone; src?: string; size?: 'l' | 's'; className?: string; alt?: string }) {
  return (
    <div className={cx('ava', 'ph', `ph-${tone}`, size === 'l' && 'l', size === 's' && 'ava-s', className)}>
      {src ? <img className="ph-img" src={src} alt={alt} loading="lazy" decoding="async" /> : <svg className="ph-person" viewBox="0 0 200 220" aria-hidden="true" style={{ width: '86%' }}><use href="#i-person" /></svg>}
    </div>
  );
}

/* ---------- modal / sheet ---------- */
export function Sheet({ open, onClose, title, children, wide, labelledBy, className }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; wide?: boolean; labelledBy?: string; className?: string }) {
  const phone = useMedia('(max-width: 699px)');
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),textarea,select,[tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    window.setTimeout(() => {
      const target = ref.current?.querySelector<HTMLElement>('[data-autofocus], input:not([type=radio]):not([type=checkbox]), textarea') ?? ref.current;
      target?.focus();
    }, 30);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <>
      <div className="dim dim-fixed" onClick={onClose} />
      <div ref={ref} className={cx(phone ? 'sheet-abs sheet-fixed' : 'modal-abs modal-fixed', wide && 'modal-wide', className)} role="dialog" aria-modal="true" aria-labelledby={labelledBy ?? (title ? titleId : undefined)} tabIndex={-1}>
        {phone && <span className="grabber" aria-hidden="true" />}
        {title && (
          <div className="sheet-head">
            <h4 className="h2" id={titleId}>{title}</h4>
            <button className="close" type="button" aria-label="Закрыть" onClick={onClose}><Icon name="x" /></button>
          </div>
        )}
        {children}
      </div>
    </>,
    document.body,
  );
}

/* confirm dialog */
export function Confirm({ open, title, text, confirm, cancel = 'Отмена', danger, onConfirm, onClose, loading }: { open: boolean; title: string; text?: ReactNode; confirm: string; cancel?: string; danger?: boolean; onConfirm: () => void; onClose: () => void; loading?: boolean }) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {text && <p className="sub" style={{ marginTop: -4 }}>{typeof text === 'string' ? nb(text) : text}</p>}
      <div style={{ display: 'grid', gap: 8 }}>
        <Btn v={danger ? 'danger' : 'primary'} block onClick={onConfirm} loading={loading}>{confirm}</Btn>
        <Btn v="gray" block onClick={onClose}>{cancel}</Btn>
      </div>
    </Sheet>
  );
}

/* dropdown menu anchored to a chip */
export function Dropdown({ open, onClose, children, align = 'left', style }: { open: boolean; onClose: () => void; children: ReactNode; align?: 'left' | 'right'; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && !(e.target as HTMLElement).closest('[data-dd-anchor]')) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);
  if (!open) return null;
  return <div ref={ref} className="menu surface" role="menu" style={{ ...(align === 'right' ? { left: 'auto', right: 0 } : {}), ...style }}>{children}</div>;
}

export function MenuItem({ checked, onClick, children }: { checked?: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" role="menuitemcheckbox" aria-checked={!!checked} onClick={onClick}>{children}<Icon name="check" /></button>;
}

/* card wrapper */
export function Card({ children, className, style, tint, as: As = 'div', title, right }: { children?: ReactNode; className?: string; style?: CSSProperties; tint?: boolean; as?: 'div' | 'section' | 'article'; title?: ReactNode; right?: ReactNode }) {
  return (
    <As className={cx('card', tint && 'tint', className)} style={style}>
      {(title || right) && <div className="between">{title && <h3 className="h3">{title}</h3>}{right}</div>}
      {children}
    </As>
  );
}

export function Spinner() {
  return <span className="spinner spinner-dark" aria-label="Загрузка" role="status" />;
}

export function Money({ value, className, style }: { value: string; className?: string; style?: CSSProperties }) {
  return <b className={cx('money', className)} style={style}>{value}</b>;
}

export function Tz({ children }: { children: ReactNode }) {
  return <span className="tz"><Icon name="globe" />{typeof children === 'string' ? nb(children) : children}</span>;
}
