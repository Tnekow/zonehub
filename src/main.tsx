import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import '@fontsource/zcool-kuaile'
import './index.css'
import App from './App.tsx'

const isFileProtocol = typeof window !== 'undefined' && window.location.protocol === 'file:';
const RouterComponent = isFileProtocol ? HashRouter : BrowserRouter;

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const details = {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
    };
    // Forward renderer crash clues to Electron main diagnostics via console-message bridge.
    console.error('[ZoneHub][RendererError]', JSON.stringify(details));
  });
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    console.error(
      '[ZoneHub][UnhandledRejection]',
      typeof reason === 'object' && reason !== null ? JSON.stringify(reason) : String(reason)
    );
  });
  console.info(`[ZoneHub][Boot] protocol=${window.location.protocol} pathname=${window.location.pathname}`);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterComponent>
    <App />
    </RouterComponent>
  </StrictMode>,
)
