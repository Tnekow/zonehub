import { Navigate, Route } from 'react-router-dom';
import {
  DesktopArtworkGallery,
  DesktopArtworkShowcase,
  DesktopHowToPage,
  DesktopSupportPage,
  DesktopSteamGuides,
  DesktopVideoToGifTool,
} from './desktopLocalePages';
import { createHomeRouteElement } from './homeRouteElement';
import { DesktopHome } from './lazyPages';
import { routeSuspense } from './routeSuspense';
import type { AppRouteContext } from './types';

/** 返回桌面壳 <Route> 树（须作为 <Routes> 子节点直接插入，不可包一层组件） */
export function createDesktopRoute(ctx: AppRouteContext) {
  return (
    <Route
      path="/desktop"
      element={routeSuspense(
        <DesktopHome
          currentBackground={ctx.background}
          onBackgroundChange={ctx.onBackgroundChange}
          currentTheme={ctx.theme}
          onThemeChange={ctx.onThemeChange}
          isEditMode={ctx.isEditMode}
          onToggleEditMode={ctx.onToggleEditMode}
        />,
      )}
    >
      <Route index element={createHomeRouteElement(ctx)} />
      <Route path="home" element={<Navigate to="/desktop" replace />} />
      <Route path="artwork-showcase" element={routeSuspense(<DesktopArtworkShowcase />)} />
      <Route path="artwork-showcase/video-to-gif" element={routeSuspense(<DesktopVideoToGifTool />)} />
      <Route path="artwork-showcase/gallery" element={routeSuspense(<DesktopArtworkGallery />)} />
      <Route path="steam-guides" element={routeSuspense(<DesktopSteamGuides />)} />
      <Route path="how-to" element={routeSuspense(<DesktopHowToPage />)} />
      <Route path="support" element={routeSuspense(<DesktopSupportPage />)} />
      <Route path="workshop" element={<Navigate to="/desktop" replace />} />
    </Route>
  );
}
