import { SUPPORT_URL } from '../api/config';

/** Mockup `loadError`: takes only the content area, the menu stays. */
export function LoadError({ title = 'Не получилось загрузить страницу', onRetry }: { title?: string; onRetry?: () => void }) {
  return (
    <div className="stack l" style={{ paddingTop: 30 }} role="alert">
      <h1 className="h1">{title}</h1>
      <p className="sub">Проверьте интернет и&nbsp;обновите страницу. Если не&nbsp;поможет, напишите в&nbsp;поддержку.</p>
      <div className="row">
        <button type="button" className="btn" onClick={onRetry ?? (() => window.location.reload())}>
          Обновить
        </button>
        <a className="btn" href={SUPPORT_URL} target="_blank" rel="noreferrer">
          Написать в&nbsp;поддержку
        </a>
      </div>
    </div>
  );
}

export function Loading() {
  return (
    <output className="mut" style={{ paddingTop: 30 }}>
      Загружаем…
    </output>
  );
}
