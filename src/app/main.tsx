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

// Гидрация только если разметка пришла из пререндера именно для этого адреса (атрибут data-prerendered).
// Кабинеты, формы и неизвестные адреса получают index.html или 404.html: их рисуем заново, без гидрации.
const normalize = (value: string) => value.replace(/\/+$/, '') || '/';
const prerendered = rootElement.dataset.prerendered;
if (rootElement.hasChildNodes() && prerendered !== undefined && normalize(prerendered) === normalize(window.location.pathname)) {
  hydrateRoot(rootElement, app);
} else {
  rootElement.replaceChildren();
  createRoot(rootElement).render(app);
}
