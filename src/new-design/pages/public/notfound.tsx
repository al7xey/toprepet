import type { ReactNode } from 'react';
import { PublicLayout } from '../../layout/layouts';
import { Button } from '../../ui';

export function NotFoundBody({ title = 'Страница не найдена', text = 'Возможно, ссылка устарела или страница переехала.', action }: { title?: string; text?: string; action?: ReactNode }) {
  return (
    <section className="trh-sec trh-notfound">
      <b className="trh-404" aria-hidden="true">404</b>
      <h1 className="trh-h1">{title}</h1>
      <p className="lead">{text}</p>
      <div className="trk-actions">{action ?? <><Button to="/" size="lg">На главную</Button><Button to="/teachers" variant="line" size="lg">Найти репетитора</Button></>}</div>
    </section>
  );
}

export default function NotFoundPage() {
  return <PublicLayout tight><NotFoundBody /></PublicLayout>;
}
