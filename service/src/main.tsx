import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/manrope';

import './styles/kit.css';
import './styles/blocks.css';
import './styles/route-1.css';
import './styles/route-2.css';
import './styles/route-3.css';
import './styles/route-4.css';
import './styles/route-5.css';
import './styles/route-6.css';
import './styles/route-7.css';
import './styles/route-8.css';
import './styles/route-9.css';
import './styles/app.css';
import './styles/pages.css';
import './styles/main-look.css';

import { App } from './app/App';

const root = document.getElementById('root');
if (!root) throw new Error('Не найден элемент #root');

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
