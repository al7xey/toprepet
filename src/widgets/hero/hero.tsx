import { Link } from 'react-router-dom';
import { ArrowRight, Gift, UserRound, CalendarDays, ChartNoAxesColumnIncreasing } from 'lucide-react';
import { HeroCarousel } from './hero-carousel';

export function Hero() {
  return (
    <section className="hero container" aria-labelledby="hero-title">
      <div className="hero-copy">
        <h1 id="hero-title">
          Топ репет —
          <br />
          <span>топ результат</span>
        </h1>
      </div>
      <div className="hero-offer">
        <ul className="hero-benefits">
          <li><UserRound aria-hidden="true" /><span>Индивидуальные<br />занятия</span></li>
          <li><CalendarDays aria-hidden="true" /><span>Удобный<br />график</span></li>
          <li><ChartNoAxesColumnIncreasing aria-hidden="true" /><span>Быстрый<br />результат</span></li>
        </ul>
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
        <HeroCarousel />
      </div>
    </section>
  );
}
