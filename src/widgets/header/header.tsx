import { useState } from 'react';
import { Link } from 'react-router-dom';
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
  const navigation = (mobile = false) => (mobile ? [
    {
      to: '/#directions',
      label: 'Занятия',
    },
    {
      to: '/#how',
      label: 'Как всё устроено',
    },
    {
      to: '/#teachers',
      label: 'Топ репеты',
    },
    {
      to: '/#free-intro',
      label: 'Знакомство',
    },
    {
      to: '/#price',
      label: 'Стоимость',
    },
    {
      to: '/#contact',
      label: 'Контакты',
    },
    {
      to: '/#faq',
      label: 'Вопросы и ответы',
    },
  ] : [
    { to: '/lessons/', label: 'Занятия' },
    { to: '/#teachers', label: 'Преподаватели' },
    { to: '/#price', label: 'Стоимость' },
    { to: '/#contact', label: 'Контакты' },
    { to: '/#faq', label: 'Вопросы' },
  ]).map(({ to, label }) => {
    return (
      <Link
        key={label}
        to={to}
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
                {navigation(true)}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
