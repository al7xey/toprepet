import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { prerenderToNodeStream } from 'react-dom/static';

import { AppContent } from './app';

export async function render(url = '/') {
  const { prelude, postponed } = await prerenderToNodeStream(
    <React.StrictMode>
      <MemoryRouter initialEntries={[url]}>
        <AppContent />
      </MemoryRouter>
    </React.StrictMode>,
    {
      onBrowserBailout(error, errorInfo) {
        console.error('');
        console.error('=== BROWSER BAILOUT ===');
        console.error(error.message);
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
