import { NavLink } from 'react-router-dom';
import { Brand } from '../../shared/ui/brand';
import { TELEGRAM_URL } from '../../shared/config/site';
export function Header() {
  return (
    <header className="header container">
      <Brand />
      <nav className="header-nav" aria-label="Основная навигация">
        <NavLink to="/lessons">Занятия</NavLink>
        <NavLink to="/#price">Стоимость</NavLink>
        <NavLink to="/#faq">Вопросы</NavLink>
      </nav>
      <a
        className="button button-secondary header-contact"
        href={TELEGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        Написать
      </a>
    </header>
  );
}
