import { Link } from 'react-router-dom';
import { PRICE_LABEL } from '../../shared/config/site';
import { ArrowUpLeft } from 'lucide-react';
export function Hero() {
  return (
    <section className="hero container" aria-labelledby="hero-title">
      <div className="hero-copy">
        <h1 id="hero-title">
          Репетитор для
          <br />
          <span>вашего ребёнка.</span>
        </h1>
        <p className="hero-description">
          Школьные предметы, домашние задания и экзамены. Индивидуально, в
          удобном темпе.
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
          Выбрать занятия
        </Link>
        <p className="hero-note">
          <ArrowUpLeft aria-hidden="true" />
          <span>Первое занятие <strong>бесплатно</strong></span>
        </p>
      </div>
    </section>
  );
}
