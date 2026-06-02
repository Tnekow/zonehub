import type { Dispatch, SetStateAction } from 'react';
import type { BackgroundConfig } from '../data/background';
import type { ThemeConfig } from '../data/theme';

export interface AppRouteContext {
  background: BackgroundConfig;
  theme: ThemeConfig;
  backgroundTopOffsetPx: number;
  isEditMode: boolean;
  setIsEditMode: Dispatch<SetStateAction<boolean>>;
  onBackgroundChange: (background: BackgroundConfig) => void;
  onThemeChange: (theme: ThemeConfig) => void;
  onToggleEditMode: () => void;
}
