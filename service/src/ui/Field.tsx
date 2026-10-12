import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';

interface FieldShell {
  label: string;
  error?: string | null;
  hint?: ReactNode;
}

function describedBy(id: string, error?: string | null, hint?: ReactNode) {
  return [error ? `${id}-err` : '', hint ? `${id}-hint` : ''].filter(Boolean).join(' ') || undefined;
}

function Notes({ id, error, hint }: { id: string; error?: string | null; hint?: ReactNode }) {
  return (
    <>
      {error ? (
        <span className="err" id={`${id}-err`} role="alert">
          {error}
        </span>
      ) : null}
      {hint ? (
        <span className="hint" id={`${id}-hint`}>
          {hint}
        </span>
      ) : null}
    </>
  );
}

/** Labelled input with an error text and a hint, both tied to the input for screen readers. */
export function Field({ label, error, hint, className, ...input }: FieldShell & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className="fld">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className={`inp ${className ?? ''}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        {...input}
      />
      <Notes id={id} error={error} hint={hint} />
    </div>
  );
}

export function SelectField({ label, error, hint, children, ...select }: FieldShell & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <div className="fld">
      <label htmlFor={id}>{label}</label>
      <select id={id} className="inp" aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, error, hint)} {...select}>
        {children}
      </select>
      <Notes id={id} error={error} hint={hint} />
    </div>
  );
}
