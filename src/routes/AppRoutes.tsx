import { Routes } from 'react-router-dom';
import { createDesktopRoute } from './desktopRoutes';
import type { AppRouteContext } from './types';

interface AppRoutesProps {
  ctx: AppRouteContext;
}

export function AppRoutes({ ctx }: AppRoutesProps) {
  return (
    <Routes>
      {createDesktopRoute(ctx)}
    </Routes>
  );
}
