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
      <Link
        to="/#contact"
        className="footer-contact"
      >
        Связаться с менеджером
      </Link>
    </footer>
  );
}
