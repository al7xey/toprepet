import { Brand } from '../../shared/ui/brand';
import { Link } from 'react-router-dom';
export function Footer() {
  return (
    <footer className="footer container">
      <div>
        <Brand />
        <p>Сервис частных репетиторов</p>
        <p>© {new Date().getFullYear()} TopRepet</p>
      </div>
      <nav className="footer-links" aria-label="Ссылки в подвале">
        <Link to="/teachers/">Репетиторы</Link>
        <Link to="/directions/">Направления</Link>
        <Link to="/how-it-works/">Как это работает</Link>
        <Link to="/price/">Стоимость</Link>
        <Link to="/faq/">Вопросы</Link>
        <a className="footer-contact" href="https://blog.toprepet.ru">Блог</a>
        <Link
          to="/contact/"
          className="footer-contact"
        >
          Написать в поддержку
        </Link>
      </nav>
    </footer>
  );
}
