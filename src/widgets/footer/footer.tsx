import { Link } from 'react-router-dom';
import { Brand } from '../../shared/ui/brand';

export function Footer() {
  return (
    <footer id="site-footer" className="footer container footer-compact">
      <div className="footer-brand">
        <Brand />
        <p>Сервис частных репетиторов</p>
        <p className="footer-copyright">© 2026 TopRepet</p>
      </div>
      <nav className="footer-navigation" aria-label="Ссылки в подвале">
        <Link className="footer-contact" to="/for-repetitor/">Для репетиторов</Link>
        <Link className="footer-contact" to="/contact/">Написать в поддержку</Link>
        <Link className="footer-contact" to="/blog/">Блог</Link>
        <Link className="footer-contact" to="/legal/payment-refund/">Оплата и возвраты</Link>
        <Link className="footer-contact" to="/legal/">Документы</Link>
      </nav>
    </footer>
  );
}
