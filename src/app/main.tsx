import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import '@fontsource-variable/manrope';

import { AppContent } from './app';

import './styles.css';
import './refinements.css';
import './experience.css';
import './landing-update.css';

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

if (rootElement.hasChildNodes()) {
  hydrateRoot(rootElement, app);
} else {
  createRoot(rootElement).render(app);
}
