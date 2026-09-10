import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { directions } from '../../entities/direction/model/directions';
import { PRICE_LABEL } from '../../shared/config/site';
import { ActionLink } from '../../shared/ui/action-link';
export default function DirectionPage() {
  const { id } = useParams();
  const direction = directions.find((item) => item.id === id);
  useEffect(() => {
    document.title = direction
      ? `${direction.label} — TopRepet`
      : 'Страница не найдена — TopRepet';
    return () => {
      document.title = 'TopRepet — разобраться проще вместе';
    };
  }, [direction]);
  if (!direction)
    return (
      <section className="container not-found">
        <span className="section-kicker">404 / ТАКОЙ СТРАНИЦЫ НЕТ</span>
        <h1>
          Вернёмся
          <br />к понятному.
        </h1>
        <Link to="/" className="button">
          На главную
        </Link>
      </section>
    );
  return (
    <section className="container detail-page">
      <Link className="button button-light detail-back" to="/#directions">
        Все направления
      </Link>
      <div className={`detail-panel ${direction.color}`}>
        <div className="detail-copy">
          <h1>{direction.label}</h1>
          <p>{direction.detail}</p>
          <ul>
            {direction.points.map((point) => (
              <li key={point}>
                <Check size={17} aria-hidden="true" />
                {point}
              </li>
            ))}
          </ul>
        </div>
        <aside className="detail-price">
          <strong>{PRICE_LABEL}</strong>
          <p>за 60 минут</p>
          <ActionLink topic={direction.label}>Написать в Telegram</ActionLink>
          <p className="detail-free">Первое короткое знакомство — бесплатно.</p>
          <span className="detail-fine">
            Преподавателя, формат и расписание уточним в переписке.
          </span>
        </aside>
      </div>
    </section>
  );
}
