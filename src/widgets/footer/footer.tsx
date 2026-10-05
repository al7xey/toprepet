import { ArrowUpRight } from 'lucide-react';
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
        <Link to="/for-repetitor/">Для репетиторов <ArrowUpRight aria-hidden="true" /></Link>
        <Link to="/contact/">Поддержка <ArrowUpRight aria-hidden="true" /></Link>
        <Link to="/blog/">Блог <ArrowUpRight aria-hidden="true" /></Link>
        <Link to="/legal/payment-refund/">Оплата и возвраты <ArrowUpRight aria-hidden="true" /></Link>
      </nav>
    </footer>
  );
}
