import { Link } from 'react-router-dom';
import { PRICE_LABEL } from '../../shared/config/site';
export function Hero() {
  return (
    <section className="hero container" aria-labelledby="hero-title">
      <div className="hero-copy">
        <h1 id="hero-title">
          Сложные темы —<br />
          <span>простым языком.</span>
        </h1>
        <p className="hero-description">
          Репетитор объяснит школьный предмет, поможет с домашними заданиями и
          подготовкой к экзаменам.
        </p>
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
          Короткое знакомство с преподавателем — бесплатно
        </p>
      </div>
      <div className="hero-photo">
        <img
          src="/images/learning-color.webp"
          alt="Объёмная иллюстрация раскрытой книги с яркими волнами страниц"
          width="1122"
          height="1402"
          fetchPriority="high"
        />
      </div>
    </section>
  );
}
