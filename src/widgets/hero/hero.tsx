import { ArrowDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PRICE_LABEL } from '../../shared/config/site';
import { ActionLink } from '../../shared/ui/action-link';
export function Hero() {
  return (
    <section className="hero container" aria-labelledby="hero-title">
      <div className="hero-copy">
        <h1 id="hero-title">
          Разобраться
          <br />
          проще <span>вместе.</span>
        </h1>
        <p className="hero-description">
          Помощь с учёбой и подготовка к экзаменам.
        </p>
        <div className="hero-price">
          <strong>{PRICE_LABEL}</strong>
          <span>/ 60 минут</span>
        </div>
        <div className="hero-actions">
          <ActionLink>Давайте знакомиться</ActionLink>
          <Link className="text-link" to="/#directions">
            Выбрать направление
            <ArrowDown size={17} aria-hidden="true" />
          </Link>
        </div>
        <p className="hero-note">Первое короткое знакомство — бесплатно</p>
      </div>
      <div className="hero-visual">
        <img
          className="hero-art"
          src="/images/clarity.webp"
          alt=""
          width="1448"
          height="1086"
          fetchPriority="high"
        />
      </div>
    </section>
  );
}
