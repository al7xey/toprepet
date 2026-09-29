import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetClose,
  SheetTitle,
} from '../../../components/ui/sheet';

import { Brand } from '../../shared/ui/brand';

export function Header() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(location.hash.slice(1))?.scrollIntoView();
    });
    return () => cancelAnimationFrame(frame);
  }, [location.pathname, location.hash]);

  const navigation = () => ([
    { to: '/lessons/', label: 'Найти репетитора' },
    { to: '/for-repetitor/', label: 'Для репетиторов' },
    { to: '/blog/', label: 'Блог' },
  ]).map(({ to, label }) => {
    return (
      <Link
        key={label}
        to={to}
        onClick={() => {
          setOpen(false);
        }}
      >
        {label}
      </Link>
    );
  });

  return (
    <header className="site-header">
      <div className="header container">
        <Brand />

        <nav className="header-nav" aria-label="Основная навигация">
          {navigation()}
        </nav>

        <div className="header-actions">
          <Link
            className="button button-secondary header-contact"
            to="/lessons/"
          >
            Записаться
          </Link>

          <Sheet
            open={open}
            onOpenChange={setOpen}
          >
            <SheetTrigger
              className="menu-toggle"
              aria-label="Открыть меню"
            >
              <Menu size={23} />
            </SheetTrigger>

            <SheetContent
              className="mobile-menu"
              showCloseButton={false}
            >
              <div className="mobile-menu-heading">
                <SheetTitle>
                  Меню
                </SheetTitle>

                <SheetClose
                  className="menu-toggle"
                  aria-label="Закрыть меню"
                >
                  <X size={23} />
                </SheetClose>
              </div>

              <nav aria-label="Мобильная навигация">
                {navigation()}
              </nav>
              <Link
                className="button button-secondary mobile-menu-cta"
                to="/lessons/"
                onClick={() => setOpen(false)}
              >
                Записаться
              </Link>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
