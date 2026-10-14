import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import '@fontsource-variable/manrope';

import { AppContent } from './app';

import './styles.css';
import './refinements.css';
import './experience.css';
import './landing-update.css';
import './tutor-landing.css';
import './payment-trust.css';
import './footer.css';
import './cookies.css';
import '../pages/legal/payment-refund.css';
import '../pages/teachers/teachers-page.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Не найден элемент #root');
}

const app = (
  <React.StrictMode>
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  </React.StrictMode>
);

// Кабинеты и формы не пререндерятся: по прямой ссылке их отдаёт index.html главной, поэтому рисуем заново, без гидратации.
const prerendered = ['/', '/teachers', '/for-repetitor', '/lessons', '/contact', '/free-intro', '/legal', '/blog', '/direction'];
const path = window.location.pathname.replace(/\/+$/, '') || '/';
const clientOnly = !prerendered.some((p) => path === p || (p !== '/' && path.startsWith(`${p}/`)));
if (rootElement.hasChildNodes() && !clientOnly) {
  hydrateRoot(rootElement, app);
} else {
  rootElement.replaceChildren();
  createRoot(rootElement).render(app);
}
