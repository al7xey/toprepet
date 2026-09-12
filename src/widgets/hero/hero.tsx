import { Link } from 'react-router-dom';
import { PRICE_LABEL } from '../../shared/config/site';
import { ArrowUp } from 'lucide-react';
export function Hero() {
  return (
    <section className="hero container" aria-labelledby="hero-title">
      <div className="hero-copy">
        <h1 id="hero-title">
          Занятия, которые
          <br />
          <span>подходят ребёнку.</span>
        </h1>
        <p className="hero-description">
          Предметы, домашние задания и экзамены — под задачу, график и темп
          вашего ребёнка.
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
          <ArrowUp aria-hidden="true" />
          <span><strong>20 минут знакомства — бесплатно</strong><br />Обсудим график и составим план</span>
        </p>
      </div>
    </section>
  );
}
