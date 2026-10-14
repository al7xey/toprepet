import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './icon';
import { Button, type ButtonVariant } from './kit';

/**
 * Модальное окно: на компьютере по центру, на телефоне шторкой снизу. Закрывается по Esc и клику по фону,
 * фокус переносится внутрь и возвращается обратно.
 */
export function Modal({ open, onClose, title, children, footer, width = 520 }: { open: boolean; onClose: () => void; title: ReactNode; children?: ReactNode; footer?: ReactNode; width?: number }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.documentElement.style.overflow = 'hidden';
    box.current?.querySelector<HTMLElement>('input,textarea,select,button:not(.trk-modal-x)')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = '';
      previous?.focus?.();
    };
  }, [open, onClose]);
  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div className="tr trk-modal-root">
      <div className="trk-scrim" onClick={onClose} aria-hidden="true" />
      <div className="trk-modal glass-thick" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} ref={box} style={{ maxWidth: width }}>
        <div className="grab trk-grab" aria-hidden="true" />
        <div className="trk-modal-head">
          <h2 className="trk-cardtitle">{title}</h2>
          <button type="button" className="trk-iconbtn trk-modal-x" onClick={onClose} aria-label="Закрыть"><Icon name="x" /></button>
        </div>
        {children && <div className="trk-modal-body">{children}</div>}
        {footer && <div className="trk-modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/** Подтверждение необратимого действия. */
export function ConfirmDialog({ open, onClose, onConfirm, title, text, confirmLabel, variant = 'primary', pending }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; text?: ReactNode; confirmLabel: string; variant?: ButtonVariant; pending?: boolean }) {
  return (
    <Modal open={open} onClose={onClose} title={title} footer={<><Button variant="fill" onClick={onClose}>Не сейчас</Button><Button variant={variant} onClick={onConfirm} loading={pending}>{confirmLabel}</Button></>}>
      {text && <p className="cap">{text}</p>}
    </Modal>
  );
}

/* ---------- Уведомления-тосты ---------- */

type ToastTone = 'ok' | 'bad' | 'info';
interface ToastItem { id: number; text: string; tone: ToastTone }
const ToastContext = createContext<(text: string, tone?: ToastTone) => void>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const show = useCallback((text: string, tone: ToastTone = 'ok') => {
    const id = Date.now() + Math.random();
    setItems((list) => [...list.slice(-2), { id, text, tone }]);
    window.setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 4200);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="trk-toasts" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast glass trk-toast ${t.tone}`}>
            <Icon name={t.tone === 'bad' ? 'alert' : t.tone === 'info' ? 'info' : 'check'} />
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
