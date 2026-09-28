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
        <Link to="/for-repetitor/" className="footer-contact">Для репетиторов</Link>
        <Link
          to="/contact/"
          className="footer-contact"
        >
          Написать в поддержку
        </Link>
        <a className="footer-contact" href="/blog">Блог</a>
      </nav>
    </footer>
  );
}
