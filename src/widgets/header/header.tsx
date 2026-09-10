import { Link } from 'react-router-dom';
import { TELEGRAM_URL } from '../../shared/config/site';
export function Header() {
  return (
    <header className="header container">
      <Link className="brand" to="/" aria-label="TopRepet — главная">
        <span className="brand-mark" aria-hidden="true">
          t<span>•</span>
        </span>
        toprepet
      </Link>
      <nav className="desktop-nav" aria-label="Основная навигация">
        <Link to="/#directions">Направления</Link>
        <Link to="/#price">Стоимость</Link>
        <Link to="/#start">Как начать</Link>
      </nav>
      <a
        className="header-contact"
        href={TELEGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        Написать
      </a>
    </header>
  );
}
