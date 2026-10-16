import { useId, useState, type CSSProperties, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import type { Query } from '../api/hooks';
import { initial } from '../lib/format';
import { rv } from '../reveal';
import { Icon } from './icon';

export { Icon };

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

/* ---------- Кнопки ---------- */

export type ButtonVariant = 'primary' | 'line' | 'warm' | 'fill' | 'soft' | 'ink' | 'danger';

export interface ButtonProps {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: 's' | 'md' | 'lg';
  block?: boolean;
  icon?: string;
  iconAfter?: string;
  /** Внутренняя ссылка. */
  to?: string;
  /** Внешняя ссылка, открывается в новой вкладке. */
  href?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
}

/** Единственная кнопка интерфейса: все действия и ссылки-кнопки собираются из неё. */
export function Button({ children, variant = 'primary', size = 'md', block, icon, iconAfter, to, href, onClick, type = 'button', disabled, loading, className, style, ...rest }: ButtonProps) {
  const cls = cx('btn', `btn-${variant}`, size === 'lg' && 'btn-lg', size === 's' && 'btn-s', block && 'btn-block', loading && 'trk-loading', className);
  const inner = (<>{icon && <Icon name={icon} />}{children}{iconAfter && <Icon name={iconAfter} />}</>);
  if (to && !disabled) return <Link className={cls} to={to} style={style} aria-label={rest['aria-label']}>{inner}</Link>;
  if (href && !disabled) return <a className={cls} href={href} target="_blank" rel="noreferrer" style={style} aria-label={rest['aria-label']}>{inner}</a>;
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled || loading} aria-busy={loading || undefined} style={style} aria-label={rest['aria-label']}>
      {inner}
    </button>
  );
}

/** Круглая кнопка со значком (уведомления, назад, закрыть). */
export function IconButton({ icon, label, to, onClick, glass, badge, className }: { icon: string; label: string; to?: string; onClick?: () => void; glass?: boolean; badge?: number | boolean; className?: string }) {
  const cls = cx('trk-iconbtn', glass && 'glass', className);
  const dot = badge ? <span className="trk-badge">{typeof badge === 'number' ? badge : ''}</span> : null;
  if (to) return <Link className={cls} to={to} aria-label={label}><Icon name={icon} />{dot}</Link>;
  return <button type="button" className={cls} onClick={onClick} aria-label={label}><Icon name={icon} />{dot}</button>;
}

/** Текстовая ссылка «назад». */
export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return <Link className="trk-back" to={to}><Icon name="back" />{children}</Link>;
}

/* ---------- Заголовки и секции ---------- */

/** Заголовок страницы: 40 px на компьютере, 30 px на телефоне. Одна h1 на странице. */
export function PageHeader({ title, lead, back, actions, center }: { title: ReactNode; lead?: ReactNode; back?: { to: string; label: string }; actions?: ReactNode; center?: boolean }) {
  return (
    <header className={cx('trk-pagehead', center && 'center')} {...rv('up')}>
      {back && <BackLink to={back.to}>{back.label}</BackLink>}
      <div className="trk-pagehead-row">
        <div className="trk-pagehead-text">
          <h1 className="trh-h1">{title}</h1>
          {lead && <p className="lead">{lead}</p>}
        </div>
        {actions && <div className="trk-pagehead-actions">{actions}</div>}
      </div>
    </header>
  );
}

/** Секция с заголовком второго уровня: 30 px на компьютере, 26 px на телефоне. */
export function Section({ title, action, lead, children, id, className }: { title?: ReactNode; action?: ReactNode; lead?: ReactNode; children?: ReactNode; id?: string; className?: string }) {
  const headingId = useId();
  return (
    <section className={cx('trh-sec', className)} id={id} aria-labelledby={title ? headingId : undefined}>
      {(title || action) && (
        <div className="sec-h" {...rv('up')}>
          {title && <h2 id={headingId} className="h2 trh-h2">{title}</h2>}
          {action}
        </div>
      )}
      {lead && <p className="cap" {...rv('up', 0.05)}>{lead}</p>}
      {children}
    </section>
  );
}

/** Заголовок карточки/блока внутри секции: 22 px. */
export const CardTitle = ({ children }: { children: ReactNode }) => <h3 className="trk-cardtitle">{children}</h3>;

/* ---------- Поверхности ---------- */

export function Card({ children, className, pad = 'md', as = 'div', reveal = true, style }: { children: ReactNode; className?: string; pad?: 'sm' | 'md' | 'lg'; as?: 'div' | 'section' | 'article' | 'aside'; reveal?: boolean; style?: CSSProperties }) {
  const Tag = as;
  return <Tag className={cx('card', 'trk-card', `pad-${pad}`, className)} {...(reveal ? rv('up', 0, style) : { style })}>{children}</Tag>;
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('panel', 'trh-panel', className)} {...rv('scale')}>{children}</div>;
}

/* ---------- Статусы и сообщения ---------- */

export type Tone = 'ok' | 'wait' | 'neutral' | 'bad' | 'info';

export function Status({ tone, icon, children }: { tone: Tone; icon?: string; children: ReactNode }) {
  return <span className={`st st-${tone}`}>{icon && <Icon name={icon} />}{children}</span>;
}

export function Note({ tone = 'info', icon, children, action }: { tone?: 'info' | 'ok' | 'bad' | 'plain'; icon?: string; children: ReactNode; action?: ReactNode }) {
  const ic = icon ?? (tone === 'ok' ? 'check' : tone === 'bad' ? 'alert' : 'info');
  return (
    <div className={cx('note', tone !== 'info' && tone, 'trk-note')} role={tone === 'bad' ? 'alert' : undefined}>
      <Icon name={ic} />
      <div className="trk-note-text">{children}</div>
      {action && <div className="trk-note-action">{action}</div>}
    </div>
  );
}

export function EmptyState({ icon = 'inbox', title, text, actions }: { icon?: string; title: string; text?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="empty trk-empty" {...rv('scale')}>
      <Icon name={icon} />
      <b>{title}</b>
      {text && <span>{text}</span>}
      {actions && <div className="trk-empty-actions">{actions}</div>}
    </div>
  );
}

export function ErrorState({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <div className="empty trk-empty" role="alert">
      <Icon name="alert" />
      <b>Что-то пошло не так</b>
      <span>{text}</span>
      {onRetry && <div className="trk-empty-actions"><Button variant="line" onClick={onRetry} icon="repeat">Повторить</Button></div>}
    </div>
  );
}

export function Skeleton({ height = 20, width, radius }: { height?: number; width?: number | string; radius?: number }) {
  return <span className="skel trk-skel" style={{ height, width, borderRadius: radius }} aria-hidden="true" />;
}

/** Список-заглушка на время загрузки. */
export function LoadingList({ rows = 3, height = 120 }: { rows?: number; height?: number }) {
  return <div className="trk-stack" aria-busy="true" aria-label="Загрузка">{Array.from({ length: rows }, (_, i) => <Skeleton key={i} height={height} radius={32} />)}</div>;
}

/** Показывает загрузку, ошибку или данные запроса. */
export function QueryView<T>({ query, children, loading, empty }: { query: Query<T>; children: (data: T) => ReactNode; loading?: ReactNode; empty?: (data: T) => ReactNode | null }) {
  if (query.error && query.data === undefined) return <ErrorState text={query.error} onRetry={query.reload} />;
  if (query.data === undefined) return <>{loading ?? <LoadingList />}</>;
  const emptyView = empty?.(query.data);
  if (emptyView) return <>{emptyView}</>;
  return <>{children(query.data)}</>;
}

/* ---------- Люди ---------- */

export function Avatar({ name, photo, size = 48 }: { name: string; photo?: string | null; size?: number }) {
  if (photo) return <img className="avatar" src={photo} alt="" width={size} height={size} style={{ width: size, height: size }} loading="lazy" />;
  return <span className="avatar trk-avatar-letter" style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }} aria-hidden="true">{initial(name)}</span>;
}

export function Person({ name, sub, photo, size = 48, right }: { name: string; sub?: ReactNode; photo?: string | null; size?: number; right?: ReactNode }) {
  return (
    <div className="person trk-person">
      <Avatar name={name} photo={photo} size={size} />
      <div className="trk-person-text"><b>{name}</b>{sub && <span>{sub}</span>}</div>
      {right && <div className="trk-person-right">{right}</div>}
    </div>
  );
}

/* ---------- Списки и данные ---------- */

/** Строки «название — значение». */
export function Rows({ rows, boxed }: { rows: [ReactNode, ReactNode][]; boxed?: boolean }) {
  return (
    <div className={cx('trk-rows', boxed && 'boxed')}>
      {rows.map(([k, v], i) => <div className="rowline" key={i}><span className="muted">{k}</span><b>{v}</b></div>)}
    </div>
  );
}

/** Плитки с цифрами (опыт, цена, уроки). */
export function Stats({ items }: { items: [ReactNode, ReactNode][] }) {
  return <div className="stats trk-stats">{items.map(([v, l], i) => <div key={i}><b>{v}</b><span>{l}</span></div>)}</div>;
}

export function Tags({ items }: { items: string[] }) {
  return <div className="trk-tags">{items.map((t) => <span key={t} className="tag">{t}</span>)}</div>;
}

export interface StepItem { title: ReactNode; text?: ReactNode; state?: 'done' | 'current' | 'todo' | 'bad' }

/**
 * Нумерованные шаги с линией (главная, «Для репетиторов», «Что будет дальше»).
 * size="s" — компактный вариант для карточек.
 */
export function Steps({ items, size = 'md' }: { items: StepItem[]; size?: 'md' | 's' }) {
  return (
    <ol className={cx('tl trh-steps', size === 's' && 's')} data-rv="seq">
      {items.map((item, index) => (
        <li key={index} className={item.state && item.state !== 'current' ? item.state : undefined} style={{ '--i': index } as CSSProperties}>
          <i>{item.state === 'done' ? <Icon name="check" style={{ width: 22, height: 22 }} /> : index + 1}</i>
          <div><h3>{item.title}</h3>{item.text && <p>{item.text}</p>}</div>
        </li>
      ))}
    </ol>
  );
}

export function Faq({ items }: { items: [string, ReactNode][] }) {
  return (
    <div className="faq">
      {items.map(([q, a], index) => (
        <details key={q} {...rv('up', index * 0.05)}><summary>{q}<Icon name="plus" /></summary><p>{a}</p></details>
      ))}
    </div>
  );
}

export function Ticks({ items }: { items: ReactNode[] }) {
  return <ul className="ticks">{items.map((t, i) => <li key={i}><Icon name="check" />{t}</li>)}</ul>;
}

/** Сегментный переключатель вкладок. */
export function Tabs<T extends string>({ items, value, onChange, wide }: { items: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void; wide?: boolean }) {
  return (
    <div className={cx('seg trk-tabs', wide && 'wide')} role="tablist">
      {items.map((item) => (
        <button key={item.value} type="button" role="tab" aria-selected={item.value === value} className={item.value === value ? 'on' : undefined} onClick={() => onChange(item.value)}>
          {item.label}{item.count ? <span className="cnt2">{item.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

/** Прогресс многошагового мастера. */
export function WizardProgress({ step, total, label }: { step: number; total: number; label?: string }) {
  return (
    <div className="trk-progress" aria-label={`Шаг ${step} из ${total}`}>
      <span className="mini">{label ?? `Шаг ${step} из ${total}`}</span>
      <div className="prog">{Array.from({ length: total }, (_, i) => <i key={i} className={i < step ? 'on' : undefined} />)}</div>
    </div>
  );
}

/* ---------- Формы ---------- */

interface FieldShell { label?: ReactNode; hint?: ReactNode; error?: string | null; right?: ReactNode; labelAction?: ReactNode }

function FieldWrap({ id, label, hint, error, labelAction, children }: FieldShell & { id: string; children: ReactNode }) {
  return (
    <div className={cx('field-row trk-field', error && 'has-error')}>
      {(label || labelAction) && <div className="trk-label-row">{label && <label className="label" htmlFor={id}>{label}</label>}{labelAction}</div>}
      {children}
      {error ? <span className="trk-error" id={`${id}-err`}>{error}</span> : hint ? <span className="muted sm" id={`${id}-hint`}>{hint}</span> : null}
    </div>
  );
}

export function TextField({ label, hint, error, right, labelAction, id, ...input }: FieldShell & InputHTMLAttributes<HTMLInputElement>) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldWrap id={fid} label={label} hint={hint} error={error} labelAction={labelAction}>
      <div className="field ink trk-input-box">
        <input id={fid} className="trk-input" aria-invalid={error ? true : undefined} aria-describedby={error ? `${fid}-err` : hint ? `${fid}-hint` : undefined} {...input} />
        {right}
      </div>
    </FieldWrap>
  );
}

export function PasswordField(props: FieldShell & InputHTMLAttributes<HTMLInputElement>) {
  const [shown, setShown] = useState(false);
  return (
    <TextField
      {...props}
      type={shown ? 'text' : 'password'}
      right={<button type="button" className="trk-eye" onClick={() => setShown((v) => !v)} aria-label={shown ? 'Скрыть пароль' : 'Показать пароль'}><Icon name="eye" /></button>}
    />
  );
}

export function TextArea({ label, hint, error, labelAction, id, ...area }: FieldShell & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldWrap id={fid} label={label} hint={hint} error={error} labelAction={labelAction}>
      <div className="field area ink trk-input-box"><textarea id={fid} className="trk-input" aria-invalid={error ? true : undefined} rows={4} {...area} /></div>
    </FieldWrap>
  );
}

export function SelectField({ label, hint, error, options, id, ...select }: FieldShell & SelectHTMLAttributes<HTMLSelectElement> & { options: (string | { value: string; label: string })[] }) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldWrap id={fid} label={label} hint={hint} error={error}>
      <div className="field ink trk-input-box trk-select">
        <select id={fid} className="trk-input" {...select}>
          {options.map((o) => (typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
        </select>
        <Icon name="down" />
      </div>
    </FieldWrap>
  );
}

export function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className={cx('chk trk-check', checked && 'on')}>
      <input type="checkbox" className="trk-sr" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <i aria-hidden="true">{checked && <Icon name="check" />}</i>
      <span>{children}</span>
    </label>
  );
}

export function Switch({ checked, onChange, title, text }: { checked: boolean; onChange: (v: boolean) => void; title: ReactNode; text?: ReactNode }) {
  return (
    <label className="trk-switch-row">
      <span className="trk-switch-text"><b>{title}</b>{text && <span className="muted sm">{text}</span>}</span>
      <input type="checkbox" role="switch" aria-checked={checked} className="trk-sr" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className={cx('switch', checked && 'on')} aria-hidden="true" />
    </label>
  );
}

/** Выбор вариантов пилюлями: один (radio) или несколько (multiple). */
type ChipOption<T extends string> = T | { value: T; label: string; hint?: string };
type OptionChipsProps<T extends string> = { options: ChipOption<T>[]; label?: ReactNode } & (
  | { multiple: true; value: T[]; onChange: (v: T[]) => void }
  | { multiple?: false; value: T | null; onChange: (v: T) => void }
);

export function OptionChips<T extends string>(props: OptionChipsProps<T>) {
  const { options, label } = props;
  const selected = (v: T) => (props.multiple ? props.value.includes(v) : props.value === v);
  const toggle = (v: T) => {
    if (!props.multiple) return props.onChange(v);
    props.onChange(props.value.includes(v) ? props.value.filter((x) => x !== v) : [...props.value, v]);
  };
  return (
    <fieldset className="field-row trk-fieldset">
      {label && <legend className="label">{label}</legend>}
      <div className="optrow">
        {options.map((o) => {
          const item = typeof o === 'string' ? { value: o, label: o } : o;
          return (
            <button key={item.value} type="button" className={cx('opt', props.multiple && 'ck', selected(item.value) && 'on')} aria-pressed={selected(item.value)} onClick={() => toggle(item.value)}>
              {item.label}{'hint' in item && item.hint ? <small>{item.hint}</small> : null}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export interface ChoiceOption<T extends string> { value: T; title: string; text?: ReactNode; icon?: string }

/** Крупные карточки выбора (роль, онбординг, причина). Выбранная — с оранжевой обводкой. */
export function ChoiceCards<T extends string>({ options, value, onChange, columns = 2, label }: { options: ChoiceOption<T>[]; value: T | null; onChange: (v: T) => void; columns?: 1 | 2 | 3; label?: string }) {
  const name = useId();
  return (
    <fieldset className={cx('trk-choices trk-fieldset', `c${columns}`)}>
      {label && <legend className="trk-sr">{label}</legend>}
      {options.map((o, index) => (
        <label key={o.value} className={cx('trk-choice', value === o.value && 'on')} {...rv('up', index * 0.06)}>
          <input type="radio" className="trk-sr" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
          {o.icon && <span className="ic-sq"><Icon name={o.icon} /></span>}
          <span className="trk-choice-text"><b>{o.title}</b>{o.text && <span>{o.text}</span>}</span>
          <span className="trk-choice-mark" aria-hidden="true" />
        </label>
      ))}
    </fieldset>
  );
}

/** Ошибка формы целиком (под кнопкой отправки). */
export const FormError = ({ error }: { error: string | null | undefined }) => (error ? <Note tone="bad">{error}</Note> : null);

/** Разделитель «или по почте». */
export const Divider = ({ children }: { children?: ReactNode }) => <div className="divider">{children}</div>;

/** Круглая стрелка «смотреть все» рядом с заголовком секции. */
export function ArrowLink({ to, label }: { to: string; label: string }) {
  return <Link className="arrow-btn" to={to} aria-label={label}><Icon name="arrow" /></Link>;
}
