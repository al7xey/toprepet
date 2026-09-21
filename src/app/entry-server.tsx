import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { prerenderToNodeStream } from 'react-dom/static';

import { AppContent } from './app';

export async function render(url = '/') {
  const { prelude } = await prerenderToNodeStream(
    <React.StrictMode>
      <MemoryRouter initialEntries={[url]}>
        <AppContent />
      </MemoryRouter>
    </React.StrictMode>,
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
