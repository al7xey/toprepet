import { useEffect, useRef, type ReactNode } from 'react';

/* Native modal <dialog>: focus stays inside, Esc closes, focus returns to the opener. */
export function Overlay({
  open,
  onClose,
  className,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  className: string;
  label: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  // clicks on the backdrop land on the <dialog> itself, outside its box (Esc is handled by onCancel)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onClick = (e: MouseEvent) => {
      if (e.target !== el) return;
      const r = el.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close.current();
    };
    el.addEventListener('click', onClick);
    return () => el.removeEventListener('click', onClick);
  }, []);

  return (
    <dialog
      ref={ref}
      className={`ov ${className}`}
      aria-label={label}
      onCancel={e => {
        e.preventDefault();
        onClose();
      }}
    >
      {open ? children : null}
    </dialog>
  );
}
