import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from '@/app/App';
import { env } from '@/lib/env';
import '@/styles/globals.css';

async function bootstrap() {
  if (env.MSW_ENABLED && import.meta.env.DEV) {
    const { worker } = await import('@/test/msw-browser');
    await worker.start({ onUnhandledRequest: 'bypass' });
  }

  const root = document.getElementById('root');
  if (!root) throw new Error('Missing #root element in index.html');

  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void bootstrap();
