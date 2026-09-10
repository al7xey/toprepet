import { Link } from 'react-router-dom';
import { PRICE_LABEL } from '../../shared/config/site';
export function Hero() {
  return (
    <section className="hero container" aria-labelledby="hero-title">
      <div className="hero-copy">
        <h1 id="hero-title">
          Учиться
          <br />
          <span>с поддержкой.</span>
        </h1>
        <p className="hero-description">
          Репетитор для вашего ребёнка.
          <br />
          Школьные предметы, домашние задания и экзамены.
        </p>
        <div className="hero-price">
          <strong>{PRICE_LABEL}</strong>
          <span>за 60 минут</span>
        </div>
        <Link className="button button-primary" to="/lessons">
          Выбрать занятия
        </Link>
        <p className="hero-note">Первое короткое знакомство — бесплатно</p>
      </div>
      <div className="hero-photo">
        <img
          src="/images/learning.webp"
          alt="Иллюстрация индивидуального занятия: ребёнок пишет в тетради рядом с преподавателем"
          width="1000"
          height="1250"
          fetchPriority="high"
        />
      </div>
    </section>
  );
}
