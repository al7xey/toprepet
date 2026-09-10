import { ArrowDown, ArrowUpRight, Check, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PRICE_LABEL } from '../../shared/config/site';
import { ActionLink } from '../../shared/ui/action-link';
export function Hero() {
  return (
    <section className="hero container" aria-labelledby="hero-title">
      <div className="hero-copy">
        <div className="eyebrow">
          <span className="status-dot" />
          Частные репетиторы. Живое общение.
        </div>
        <h1 id="hero-title">
          Разобраться
          <br />
          проще <span>вместе.</span>
        </h1>
        <p className="hero-description">
          От первых букв до выпускных экзаменов.
          <br className="desktop-break" /> Поможем понять сложное — в вашем
          темпе.
        </p>
        <div className="hero-price">
          <strong>{PRICE_LABEL}</strong>
          <span>
            / 60 минут
            <br />
            <small>для всех направлений</small>
          </span>
        </div>
        <div className="hero-actions">
          <ActionLink>Давайте знакомиться</ActionLink>
          <Link className="text-link" to="/#directions">
            Выбрать направление
            <ArrowDown size={17} aria-hidden="true" />
          </Link>
        </div>
        <p className="hero-note">
          <Check size={15} aria-hidden="true" />
          Первое короткое знакомство — бесплатно
        </p>
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
        <div className="visual-top">
          <span>МАЛЕНЬКИЕ ШАГИ. БОЛЬШИЕ ОТКРЫТИЯ.</span>
          <ArrowUpRight size={22} aria-hidden="true" />
        </div>
        <div className="visual-caption">
          <span className="sparkle-box">
            <Sparkles size={21} aria-hidden="true" />
          </span>
          <div>
            <strong>
              От «не понимаю»
              <br />к «я разобрался».
            </strong>
            <span>Вместе с вашим репетитором.</span>
          </div>
        </div>
        <span className="visual-index">01 / НАЧИНАЕМ С ВАС</span>
      </div>
    </section>
  );
}
