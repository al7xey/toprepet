import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Sheet, SheetTrigger, SheetContent, SheetClose, SheetTitle } from '../../../components/ui/sheet';
import { Brand } from '../../shared/ui/brand';
import { TELEGRAM_URL } from '../../shared/config/site';
export function Header() {
  const [open, setOpen] = useState(false);
  const { pathname, hash } = useLocation();
  const navigation = () => [
    ['/lessons', 'Занятия'], ['/#price', 'Стоимость'],
    ['/#teachers', 'Преподаватели'], ['/#faq', 'Вопросы'],
  ].map(([to, label]) => (
    <Link key={to} to={to} className={pathname + hash === to ? 'active' : undefined}
      aria-current={pathname + hash === to ? 'location' : undefined}
      onClick={() => setOpen(false)}>{label}</Link>
  ));
  return (
    <header className="site-header">
      <div className="header container">
        <Brand />
        <nav className="header-nav" aria-label="Основная навигация">
          {navigation()}
        </nav>
        <div className="header-actions"><a
          className="button button-secondary header-contact"
          href={TELEGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Написать
        </a>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className="menu-toggle" aria-label="Открыть меню"><Menu size={23} /></SheetTrigger>
          <SheetContent className="mobile-menu" showCloseButton={false}>
            <div className="mobile-menu-heading">
              <SheetTitle>Меню</SheetTitle>
              <SheetClose className="menu-toggle" aria-label="Закрыть меню"><X size={23} /></SheetClose>
            </div>
            <nav aria-label="Мобильная навигация">{navigation()}</nav>
          </SheetContent>
        </Sheet></div>
      </div>
    </header>
  );
}
