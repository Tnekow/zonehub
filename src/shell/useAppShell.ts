import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { defaultBackground, type BackgroundConfig } from '../data/background';
import { defaultTheme, type ThemeConfig, applyTheme } from '../data/theme';
import useLocalStorage from '../hooks/useLocalStorage';
import { useI18n } from '../hooks/useI18n';
import { track } from '../lib/analytics';
import { isDesktopRoute as isDesktopShellRoute } from '../lib/desktopRouting';
import { getLocalePrefix, isEditorHomeRoute } from '../lib/localePath';
import type { AppRouteContext } from '../routes/types';

const PROFILE_BACKGROUND_OFFSET_TWEAK = 0;

export function useAppShell() {
  const { i18n: i18nInstance } = useI18n();
  const appRootRef = useRef<HTMLDivElement | null>(null);

  const [background, setBackground] = useLocalStorage<BackgroundConfig>(
    'steamzone_background',
    defaultBackground,
  );
  const [theme, setTheme] = useLocalStorage<ThemeConfig>('steamzone_theme', defaultTheme);
  const [isEditMode, setIsEditMode] = useLocalStorage<boolean>('steamzone_editMode', false);

  const location = useLocation();

  useEffect(() => {
    if (getLocalePrefix(location.pathname) === '/ja' && i18nInstance.language !== 'ja-JP') {
      i18nInstance.changeLanguage('ja-JP');
    }
  }, [location.pathname, i18nInstance]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const handleBackgroundChange = (newBackground: BackgroundConfig) => {
    setBackground((prev) => ({
      ...newBackground,
      fitMode: newBackground.fitMode ?? prev.fitMode ?? 'original',
    }));
    try {
      track('background_selected', {
        fitMode: newBackground.fitMode ?? 'original',
        isVideo: Boolean(newBackground.isVideo),
        blur: Boolean(newBackground.blur),
        brightness: Number(newBackground.brightness ?? 100),
        overlay: Boolean(newBackground.overlay),
        srcType:
          typeof newBackground.image === 'string' && newBackground.image.startsWith('http')
            ? 'url'
            : 'local',
      });
    } catch (error) {
      void error;
    }
  };

  const handleThemeChange = (newTheme: ThemeConfig) => {
    setTheme(newTheme);
  };

  const handleToggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };

  const [backgroundTopOffsetPx, setBackgroundTopOffsetPx] = useState<number>(0);
  useEffect(() => {
    const isHomePath = isEditorHomeRoute(location.pathname);
    if (!isHomePath) {
      setBackgroundTopOffsetPx(0);
      return;
    }
    const compute = () => {
      const rootEl = appRootRef.current;
      if (!rootEl) return;

      const rootRect = rootEl.getBoundingClientRect();
      const navEl = document.querySelector('[data-top-nav-root]') as HTMLElement | null;
      const contentEl = document.querySelector('[data-profile-root]') as HTMLElement | null;

      let rawOffset: number | null = null;

      if (navEl) {
        const navRect = navEl.getBoundingClientRect();
        rawOffset = navRect.bottom - rootRect.top;
      } else if (contentEl) {
        const contentRect = contentEl.getBoundingClientRect();
        rawOffset = contentRect.top - rootRect.top;
      }

      if (rawOffset == null) return;
      const offset = Math.max(0, Math.round(rawOffset + PROFILE_BACKGROUND_OFFSET_TWEAK));
      setBackgroundTopOffsetPx(offset);
    };
    compute();
    requestAnimationFrame(compute);
    window.addEventListener('resize', compute);
    return () => {
      window.removeEventListener('resize', compute);
    };
  }, [location.pathname]);

  const isDesktopRoute = isDesktopShellRoute(location.pathname);

  const routeContext: AppRouteContext = {
    background,
    theme,
    backgroundTopOffsetPx,
    isEditMode,
    setIsEditMode,
    onBackgroundChange: handleBackgroundChange,
    onThemeChange: handleThemeChange,
    onToggleEditMode: handleToggleEditMode,
  };

  return {
    appRootRef,
    isDesktopRoute,
    routeContext,
  };
}
