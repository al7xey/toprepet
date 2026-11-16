import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import '@fontsource-variable/manrope';

import { AppContent } from './app';

import './base.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Не найден элемент #root');
}

const app = (
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppContent />
    </BrowserRouter>
  </React.StrictMode>
);

// Гидрация только если разметка пришла из пререндера именно для этого адреса (атрибут data-prerendered).
// Кабинеты, формы и неизвестные адреса получают index.html или 404.html: их рисуем заново, без гидрации.
const normalize = (value: string) => value.replace(/\/+$/, '') || '/';
const prerendered = rootElement.dataset.prerendered;
const basePath = import.meta.env.BASE_URL.replace(/\/+$/, '');
const appPath = basePath && window.location.pathname.startsWith(`${basePath}/`)
  ? window.location.pathname.slice(basePath.length) || '/'
  : window.location.pathname;
if (rootElement.hasChildNodes() && prerendered !== undefined && normalize(prerendered) === normalize(appPath)) {
  hydrateRoot(rootElement, app);
} else {
  rootElement.replaceChildren();
  createRoot(rootElement).render(app);
}
