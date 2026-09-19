import { Link } from 'react-router-dom';
import { PRICE_LABEL } from '../../shared/config/site';
import { ArrowRight, Gift, Target, CalendarDays, ChartNoAxesColumnIncreasing } from 'lucide-react';

export function Hero() {
  return (
    <section className="hero container" aria-labelledby="hero-title">
      <div className="hero-copy">
        <h1 id="hero-title">
          Топ репет —
          <br />
          <span>топ результат</span>
        </h1>
        <ul className="hero-benefits">
          <li><Target aria-hidden="true" /><span>Индивидуальные занятия</span></li>
          <li><CalendarDays aria-hidden="true" /><span>Удобный график</span></li>
          <li><ChartNoAxesColumnIncreasing aria-hidden="true" /><span>Быстрый результат</span></li>
        </ul>
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
          Выбрать занятие <ArrowRight size={20} aria-hidden="true" />
        </Link>
        <Link className="button button-light hero-intro" to="/free-intro">
          <Gift size={24} aria-hidden="true" />
          <span>Бесплатное знакомство</span>
          <ArrowRight size={20} aria-hidden="true" />
        </Link>
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
