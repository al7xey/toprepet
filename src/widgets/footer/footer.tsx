import { Brand } from '../../shared/ui/brand';
import { Link, useLocation } from 'react-router-dom';
import { legalConfig, operatorIsConfigured } from '../../shared/config/legal';
export function Footer() {
  const { pathname } = useLocation();
  return (
    <footer className="footer container footer-legal-layout">
      <div>
        <Brand />
        <p>Сервис частных репетиторов</p>
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
      <div className="footer-documents"><h2>Документы</h2><nav aria-label="Юридические документы">
        <Link to="/legal/terms/">Пользовательское соглашение</Link>
        <Link to="/legal/privacy/">Политика конфиденциальности</Link>
        <Link to="/legal/personal-data-consent/">Согласие на обработку ПД</Link>
        <Link to="/legal/payment-refund/">Оплата и возвраты</Link>
        <Link to="/legal/requisites/">Реквизиты</Link>
        {pathname.replace(/\/$/, '') === '/for-repetitor' && <Link to="/legal/tutor-terms/">Условия для репетиторов</Link>}
        <Link to="/legal/">Все документы</Link>
        <Link to="/legal/cookies/">Настройки cookies</Link>
      </nav></div>
      <div className="footer-legal-bottom"><p>TopRepet — сервис частных репетиторов</p><p>© 2026 TopRepet</p>{operatorIsConfigured && <p>{legalConfig.operatorName}</p>}</div>
    </footer>
  );
}
