import { Brand } from '../../shared/ui/brand';
import { TELEGRAM_URL } from '../../shared/config/site';
export function Footer() {
  return (
    <footer className="footer container">
      <div>
        <Brand />
        <p>© {new Date().getFullYear()} TopRepet</p>
      </div>
      <a
        href={TELEGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="footer-contact"
      >
        Написать в Telegram
      </a>
    </footer>
  );
}
