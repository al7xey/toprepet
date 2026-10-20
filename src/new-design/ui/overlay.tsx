import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './icon';
import { Button, type ButtonVariant } from './kit';

/**
 * Модальное окно: на компьютере по центру, на телефоне шторкой снизу. Закрывается по Esc и клику по фону,
 * фокус переносится внутрь и возвращается обратно.
 */
export function Modal({ open, onClose, title, children, footer, width = 520 }: { open: boolean; onClose: () => void; title: ReactNode; children?: ReactNode; footer?: ReactNode; width?: number }) {
  const box = useRef<HTMLDialogElement>(null);
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
  // на телефоне окно-шторку можно смахнуть вниз: жест начинается, только когда содержимое прокручено до верха
  useEffect(() => {
    const el = box.current;
    if (!open || !el || !window.matchMedia('(max-width: 760px)').matches) return undefined;
    let startY = 0;
    let startAt = 0;
    let delta = 0;
    let dragging = false;
    const scrim = el.parentElement?.querySelector<HTMLElement>('.trk-scrim');
    const onStart = (e: TouchEvent) => { startY = e.touches[0].clientY; startAt = Date.now(); delta = 0; dragging = false; };
    const onMove = (e: TouchEvent) => {
      const dy = e.touches[0].clientY - startY;
      if (!dragging) { if (dy > 8 && el.scrollTop <= 0) dragging = true; else return; }
      delta = Math.max(0, dy);
      e.preventDefault();
      el.style.transition = 'none';
      el.style.transform = `translateY(${delta}px)`;
      if (scrim) scrim.style.opacity = String(Math.max(0, 1 - delta / 500));
    };
    const onEnd = () => {
      if (!dragging) return;
      dragging = false;
      const speed = delta / Math.max(Date.now() - startAt, 1);
      if (delta > 110 || speed > 0.6) {
        el.style.transition = 'transform .22s ease-in';
        el.style.transform = 'translateY(105%)';
        if (scrim) { scrim.style.transition = 'opacity .22s'; scrim.style.opacity = '0'; }
        window.setTimeout(onClose, 200);
      } else {
        el.style.transition = 'transform .3s cubic-bezier(.32,.72,0,1)';
        el.style.transform = '';
        if (scrim) scrim.style.opacity = '';
      }
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [open, onClose]);
  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div className="tr trk-modal-root">
      <div className="trk-scrim" onClick={onClose} aria-hidden="true" />
      <dialog open className="trk-modal surf-strong" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} ref={box} style={{ maxWidth: width }}>
        <div className="grab trk-grab" aria-hidden="true" />
        <div className="trk-modal-head">
          <h2 className="trk-cardtitle">{title}</h2>
          <button type="button" className="trk-iconbtn trk-modal-x trk-round" onClick={onClose} aria-label="Закрыть"><Icon name="x" /></button>
        </div>
        {children && <div className="trk-modal-body">{children}</div>}
        {footer && <div className="trk-modal-foot">{footer}</div>}
      </dialog>
    </div>,
    document.body,
  );
}

/** Подтверждение необратимого действия. */
export function ConfirmDialog({ open, onClose, onConfirm, title, text, confirmLabel, variant = 'primary', pending }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; text?: ReactNode; confirmLabel: string; variant?: ButtonVariant; pending?: boolean }) {
  return (
    <Modal open={open} onClose={onClose} title={title} footer={<><Button variant="line" onClick={onClose}>Не сейчас</Button><Button variant={variant} onClick={onConfirm} loading={pending}>{confirmLabel}</Button></>}>
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
          <div key={t.id} className={`toast surf trk-toast ${t.tone}`}>
            <Icon name={t.tone === 'bad' ? 'alert' : t.tone === 'info' ? 'info' : 'check'} />
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
