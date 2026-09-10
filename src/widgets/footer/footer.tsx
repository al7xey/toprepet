import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { ActionLink } from '../../shared/ui/action-link';
import { PRICE_LABEL, TELEGRAM_URL } from '../../shared/config/site';
export function Footer() {
  const { pathname } = useLocation();
  const [heroGone, setHeroGone] = useState(false);
  const showDock = pathname !== '/' || heroGone;
  useEffect(() => {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHeroGone(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, [pathname]);
  return (
    <>
      <section className="closing container">
        <span className="section-kicker">ВСЁ НАЧИНАЕТСЯ С «ПРИВЕТ»</span>
        <h2>
          Одно сообщение.
          <br />
          Первый шаг к пониманию.
        </h2>
        <div className="closing-bottom">
          <p>
            Расскажите, с чем нужна помощь.
            <br />
            Остальное обсудим вместе.
          </p>
          <ActionLink className="button-white">Написать в Telegram</ActionLink>
        </div>
      </section>
      <footer className="footer container">
        <div>
          <Link to="/" className="brand">
            toprepet<span className="brand-dot">✳</span>
          </Link>
          <p>Сервис частных репетиторов</p>
        </div>
        <div className="footer-links">
          <Link to="/#directions">Направления</Link>
          <Link to="/#price">Стоимость</Link>
          <Link to="/#faq">Вопросы</Link>
        </div>
        <span className="copyright">© {new Date().getFullYear()} TopRepet</span>
      </footer>
      <div
        className={`mobile-dock ${showDock ? 'is-visible' : ''}`}
        inert={!showDock}
        aria-hidden={!showDock}
      >
        <div>
          <strong>{PRICE_LABEL}</strong>
          <span>60 минут · любое направление</span>
        </div>
        <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
          Написать
          <ArrowUpRight size={17} aria-hidden="true" />
        </a>
      </div>
    </>
  );
}
