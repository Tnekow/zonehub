import { HomePage } from './lazyPages';
import { routeSuspense } from './routeSuspense';
import type { AppRouteContext } from './types';

export function createHomeRouteElement(ctx: AppRouteContext) {
  return routeSuspense(
    <div data-homepage-root>
      <HomePage
        background={ctx.background}
        backgroundTopOffsetPx={ctx.backgroundTopOffsetPx}
        isEditMode={ctx.isEditMode}
        setIsEditMode={ctx.setIsEditMode}
      />
    </div>,
  );
}
