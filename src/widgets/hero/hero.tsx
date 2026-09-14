import { Link } from 'react-router-dom';
import { PRICE_LABEL } from '../../shared/config/site';
import { ArrowUp } from 'lucide-react';

export function Hero() {
  return (
    <section className="hero container" aria-labelledby="hero-title">
      <div className="hero-copy">
        <h1 id="hero-title">
          Топ репет —
          <br />
          <span>топ результат</span>
        </h1>
        <p className="hero-description">
          Индивидуальные занятия с учётом цели, темпа и учебных задач ребёнка.
        </p>
      </div>
      <div className="hero-offer">
        <div className="hero-price">
          <span className="hero-price-label">Любое занятие</span>
          <div>
            <strong>{PRICE_LABEL}</strong>
            <span>/ 60 минут</span>
          </div>
        </div>
        <Link className="button button-primary" to="/lessons">
          Выбрать занятие
        </Link>
        <p className="hero-note">
          <ArrowUp aria-hidden="true" />
          <span><strong>Бесплатное знакомство — 20 минут</strong><br />Уточним цель, согласуем график и составим план</span>
        </p>
      </div>
      <div className="hero-art" aria-label="Индивидуальное занятие с репетитором">
        <picture>
          <source media="(max-width: 680px)" srcSet="/images/tutor-session-small.webp" />
          <img
            src="/images/tutor-session.webp"
            width="1200"
            height="800"
            alt="Репетитор занимается с учеником за столом"
            loading="eager"
            decoding="async"
          />
        </picture>
      </div>
    </section>
  );
}
