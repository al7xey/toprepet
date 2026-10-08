import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { prerenderToNodeStream } from 'react-dom/static';
import { renderToString } from 'react-dom/server';

import { AppContent } from './app';
export { teachers } from '../entities/teacher';

async function renderPrelude(url: string) {
  const { prelude, postponed } = await prerenderToNodeStream(
    <React.StrictMode>
      <MemoryRouter initialEntries={[url]}>
        <AppContent />
      </MemoryRouter>
    </React.StrictMode>,
    {
      onError(error, errorInfo) {
        console.error('');
        console.error('=== PRERENDER ERROR ===');
        console.error(error);
        console.error(errorInfo.componentStack);
        console.error('=======================');
        console.error('');
      },
    },
  );

  console.log(
    `Prerender postponed: ${postponed === null ? 'NO' : 'YES'}`,
  );

  let html = '';

  for await (const chunk of prelude) {
    html +=
      typeof chunk === 'string'
        ? chunk
        : Buffer.from(chunk).toString('utf8');
  }

  return html;
}

export async function render(url = '/') {
  let html = await renderPrelude(url);
  // React can serialize a resolved lazy route as a hidden streaming boundary.
  // Render again after resolution so crawlers receive the actual page in main,
  // without requiring React's inline reveal script or a JavaScript execution.
  if (html.includes('<!--$?-->')) html = renderToString(
    <React.StrictMode><MemoryRouter initialEntries={[url]}><AppContent /></MemoryRouter></React.StrictMode>,
  );
  if (html.includes('<!--$?-->') || html.includes('<!--$!-->')) throw new Error(`Unresolved prerender: ${url}`);
  return html;
}
