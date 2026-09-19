import { Link } from 'react-router-dom';
import { PRICE_LABEL } from '../../shared/config/site';
import { ArrowRight, Gift } from 'lucide-react';

function BenefitIcon({ type }: { type: 'target' | 'calendar' | 'result' }) {
  return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
    {type === 'target' && <><circle cx="16" cy="16" r="10"/><circle cx="16" cy="16" r="5"/><path d="M16 6V3M26 16h3"/></>}
    {type === 'calendar' && <><rect x="5" y="7" width="22" height="20" rx="4"/><path d="M10 4v6M22 4v6M5 13h22M10 18h3M19 18h3M10 23h3M19 23h3"/></>}
    {type === 'result' && <><path d="M6 26V17M13 26V11M20 26V15M27 26V5"/><path d="m6 12 7-6 7 3 7-7"/></>}
  </svg>;
}

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
          <li><BenefitIcon type="target" /><span>Индивидуальные<br />занятия</span></li>
          <li><BenefitIcon type="calendar" /><span>Удобный<br />график</span></li>
          <li><BenefitIcon type="result" /><span>Быстрый<br />результат</span></li>
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
