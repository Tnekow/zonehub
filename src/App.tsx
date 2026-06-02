// src/App.tsx

import { I18nextProvider } from 'react-i18next';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import i18n from './locales';
import { AppRoutes } from './routes';
import { useAppShell } from './shell/useAppShell';

function App() {
  const { appRootRef, routeContext } = useAppShell();

  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <div className="relative w-full" ref={appRootRef}>
          <AppRoutes ctx={routeContext} />
        </div>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

export default App;
