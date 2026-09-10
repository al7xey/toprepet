import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
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
          <ArrowLeft size={18} />
        </Link>
      </section>
    );
  return (
    <section className="container detail-page">
      <Link className="text-link" to="/#directions">
        <ArrowLeft size={18} aria-hidden="true" />
        Все направления
      </Link>
      <div className={`detail-panel ${direction.color}`}>
        <div className="detail-copy">
          <span className="section-kicker">{direction.label}</span>
          <h1>{direction.title}</h1>
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
          <span className="section-kicker">ИНДИВИДУАЛЬНОЕ ЗАНЯТИЕ</span>
          <strong>{PRICE_LABEL}</strong>
          <p>за 60 минут</p>
          <ActionLink topic={direction.label}>Обсудить занятия</ActionLink>
          <p className="detail-free">Первое короткое знакомство — бесплатно.</p>
          <span className="detail-fine">
            Преподавателя, формат и расписание уточним в переписке.
          </span>
        </aside>
      </div>
      <div className="detail-next">
        <h2>Можно начать без готового плана.</h2>
        <p>
          Напишите класс, предмет и что сейчас вызывает вопросы. Этого
          достаточно для первого разговора.
        </p>
        <Link className="text-link" to="/#start">
          Как всё устроено
          <ArrowLeft className="flip-icon" size={18} />
        </Link>
      </div>
    </section>
  );
}
