import { useState } from 'react';
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
  const { pathname } = useLocation();

  const navigation = () => [
    {
      to: '/lessons/',
      label: 'Занятия',
      pagePath: '/lessons',
    },
    {
      to: '/price/',
      label: 'Стоимость',
    },
    {
      to: '/teachers/',
      label: 'Преподаватели',
    },
    {
      to: '/faq/',
      label: 'Вопросы',
    },
    {
      to: '/#contact',
      label: 'Контакты',
    },
  ].map(({ to, label, pagePath }) => {
    const isActive =
      pagePath !== undefined &&
      pathname === pagePath;

    return (
      <Link
        key={label}
        to={to}
        className={isActive ? 'active' : undefined}
        aria-current={isActive ? 'page' : undefined}
        onClick={() => setOpen(false)}
      >
        {label}
      </Link>
    );
  });

  return (
    <header className="site-header">
      <div className="header container">
        <Brand />

        <nav
          className="header-nav"
          aria-label="Основная навигация"
        >
          {navigation()}
        </nav>

        <div className="header-actions">
          <Link
            className="button button-secondary header-contact"
            to="/#contact"
          >
            Написать
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
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
