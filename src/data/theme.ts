// 从单一数据源读取主题配置
import themesConfig from '../config/themes.json';

// 渐变背景配置类型
export interface GradientConfig {
  type?: 'radial-gradient' | 'linear-gradient' | 'conic-gradient';
  colors: string[];
  // 可选参数：方向/形状/位置
  direction?: string; // 仅 linear 时使用，如 'to right' 或 '90deg'
  shape?: 'circle' | 'ellipse'; // 仅 radial 时使用
  position?: string; // radial/conic 可使用，如 'center' / '50% 50%'
  // 可选：背景附着方式，仅用于遮罩层按需实现“同一张遮罩”效果
  attachment?: 'fixed' | 'scroll' | 'local';
  // 新增：方向预设（用于屏蔽具体百分比/角度细节，由程序自动计算）
  directionPreset?: 'top-right-to-bottom-left' | 'top-to-bottom' | 'radial-equal-slices' | 'conic-equal-slices';
}

// 主题配置类型定义
export interface ThemeConfig {
  id: string;
  name: string;
  description: string;
  colors: {
    dark: string;
    darker: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    primary: string;
    secondary: string;
    border: string;
    headerBorder: string;
    gray: string;
    container: string;
    title: string | GradientConfig;
    card: string;
    cardFooter: string;
    progress: string;
    badge: string;
    online: string;
  };
  backgrounds: {
    card: string | GradientConfig;
    headerCard: string | GradientConfig;
    mainContainer: string | GradientConfig;
    overlay: string;
    container: string;
    item: string;
    itemIn: string;
    background: string;
    // 细粒度背景位（可选），用于独立控制特定组件的背景
    detail?: {
      sidebar?: string | GradientConfig;
      profileEditButton?: string | GradientConfig;
      // ProfileHeader 徽章容器的独立背景
      profileBadgeBox?: string | GradientConfig;
      item?: string | GradientConfig;
      itemIn?: string | GradientConfig;
    };
  };
  borders: {
    width: string;
    headerWidth: string;
    radius: string;
  };
  titleBorders?: {
    type: 'single-color' | 'glow';
    primaryColor: string;
    glowColor?: string;
    width: string;
    glowIntensity?: string;
  };
  effects: {
    cardBlur: boolean;
    headerCardBlur: boolean;
    containerBlur: boolean;
    mainContainerBlur: boolean;
    // 标题磨砂（可选），未配置时默认为不启用
    titleBlur?: boolean;
    // 侧边栏磨砂（可选），缺省时回退到 cardBlur
    sidebarBlur?: boolean;
  };
}

// 从单一数据源获取主题配置，使用类型断言处理JSON数据
export const themes: ThemeConfig[] = themesConfig.themes as ThemeConfig[];

// 主题预设列表 - 从单一数据源获取
export const themePresets: ThemeConfig[] = themes;

// 默认主题 - 从单一数据源获取
export const defaultTheme: ThemeConfig = themes.find(theme => theme.id === 'default') || themes[0];

// 帮助函数：根据颜色数量均匀分配百分比（当配置里没有显式百分比时使用）
function buildEvenStops(colors: string[]): string[] {
  const hasExplicitStops = colors.some(c => c.includes('%') || c.includes('deg'));
  if (hasExplicitStops) return colors;
  const n = colors.length;
  if (n <= 1) return colors;
  return colors.map((c, i) => `${c} ${Math.round((i * 100) / (n - 1))}%`);
}

// 将背景配置转换为 CSS 可用的字符串
function buildBackgroundValue(value: string | GradientConfig): string {
  if (typeof value === 'string') return value;

  // 优先处理方向预设（directionPreset）——用于简化配置不写百分比/角度
  if (value.directionPreset) {
    const preset = value.directionPreset;

    // 1) 与类型无关的“等分切割”预设：统一用圆锥渐变实现
    if (preset === 'radial-equal-slices' || preset === 'conic-equal-slices') {
      const position = value.position ?? '50% 50%';
      const n = Math.max(1, value.colors.length);
      const step = 360 / n;
      const segments = value.colors.map((c, i) => {
        const start = Math.round(i * step);
        const end = Math.round((i + 1) * step);
        return `${c} ${start}deg ${end}deg`;
      });
      return `conic-gradient(at ${position}, ${segments.join(', ')})`;
    }

    // 2) 线性方向预设：仅当未显式声明为 radial/conic 时才生效，避免与类型冲突
    if ((value.type === undefined || value.type === 'linear-gradient')) {
      const stops = buildEvenStops(value.colors);
      if (preset === 'top-right-to-bottom-left') {
        return `linear-gradient(to bottom-left, ${stops.join(', ')})`;
      }
      if (preset === 'top-to-bottom') {
        return `linear-gradient(to bottom, ${stops.join(', ')})`;
      }
    }
    // 若提供了与类型不兼容的线性预设，但类型已指定为 radial/conic，则忽略预设，继续按显式类型处理
  }

  // 显式类型处理
  if (value.type === 'radial-gradient') {
    const shape = value.shape ?? 'circle';
    const position = value.position ?? 'center';
    const stops = buildEvenStops(value.colors);
    return `radial-gradient(${shape} at ${position}, ${stops.join(', ')})`;
  }

  if (value.type === 'conic-gradient') {
    const position = value.position ?? '50% 50%';
    // 若未提供角度区间，按等分扇形处理
    const hasDegStops = value.colors.some(c => c.includes('deg'));
    if (hasDegStops) {
      return `conic-gradient(at ${position}, ${value.colors.join(', ')})`;
    }
    const n = Math.max(1, value.colors.length);
    const step = 360 / n;
    const segments = value.colors.map((c, i) => {
      const start = Math.round(i * step);
      const end = Math.round((i + 1) * step);
      return `${c} ${start}deg ${end}deg`;
    });
    return `conic-gradient(at ${position}, ${segments.join(', ')})`;
  }

  // 默认为线性渐变
  const direction = value.direction ?? 'to right';
  const stops = buildEvenStops(value.colors);
  return `linear-gradient(${direction}, ${stops.join(', ')})`;
}

// 应用主题到CSS变量
export function applyTheme(theme: ThemeConfig) {
  const root = document.documentElement;
  
  // 应用颜色变量
  Object.entries(theme.colors).forEach(([key, value]) => {
    if (key === 'title') {
      // 允许 title 支持渐变配置
      const computed = typeof value === 'string' ? value : buildBackgroundValue(value as GradientConfig);
      root.style.setProperty('--steam-title', computed);
    } else {
      root.style.setProperty(`--steam-${String(key)}`, String(value));
    }
  });
  
  // 应用背景变量
  Object.entries(theme.backgrounds).forEach(([key, value]) => {
    // 跳过 detail（细粒度配置在后续处理）
    if (key === 'detail') return;
    // 处理特殊的变量名映射
    const cssVarName = key === 'itemIn' ? 'itemIn' : key;
    const computed = buildBackgroundValue(value as string | GradientConfig);

    root.style.setProperty(`--steam-${cssVarName}`, computed);
  });

  // 细粒度 detail 覆盖与新增变量
  const detail = theme.backgrounds.detail;
  // sidebar 背景：优先使用 detail.sidebar，否则回退到 card
  const sidebarBackground = detail?.sidebar ?? theme.backgrounds.card;
  root.style.setProperty('--steam-sidebar', buildBackgroundValue(sidebarBackground as string | GradientConfig));
  // profileEditButton 背景：优先使用 detail.profileEditButton，否则回退到 colors.title
  const profileEditButtonBackground = detail?.profileEditButton ?? theme.colors.title;
  const computedProfileEditButton = typeof profileEditButtonBackground === 'string'
    ? (profileEditButtonBackground as string)
    : buildBackgroundValue(profileEditButtonBackground as GradientConfig);
  root.style.setProperty('--steam-profileEditButton', computedProfileEditButton);
  // ProfileHeader 徽章容器背景：优先使用 detail.profileBadgeBox，否则回退到 itemIn
  const profileBadgeBoxBackground = detail?.profileBadgeBox ?? theme.backgrounds.itemIn;
  root.style.setProperty('--steam-profileBadgeBox', buildBackgroundValue(profileBadgeBoxBackground as string | GradientConfig));
  // 允许对 item 与 itemIn 的细化覆盖（若提供则覆盖顶层变量）
  if (detail?.item) {
    root.style.setProperty('--steam-item', buildBackgroundValue(detail.item as string | GradientConfig));
  }
  if (detail?.itemIn) {
    root.style.setProperty('--steam-itemIn', buildBackgroundValue(detail.itemIn as string | GradientConfig));
  }
  
  // 应用边框变量
  Object.entries(theme.borders).forEach(([key, value]) => {
    const cssVarName = key === 'headerWidth' ? 'header-border-width' : key;
    root.style.setProperty(`--steam-${cssVarName}`, value);
  });

  if (theme.titleBorders) {
    root.style.setProperty('--steam-title-border-type', theme.titleBorders.type);
    root.style.setProperty('--steam-title-border-primary-color', theme.titleBorders.primaryColor);
    root.style.setProperty('--steam-title-border-width', theme.titleBorders.width);
    if (theme.titleBorders.type === 'glow') {
      root.style.setProperty('--steam-title-border-glow-color', theme.titleBorders.glowColor || 'transparent');
      root.style.setProperty('--steam-title-border-glow-intensity', theme.titleBorders.glowIntensity || '0px');
    } else {
      root.style.setProperty('--steam-title-border-glow-color', 'transparent');
      root.style.setProperty('--steam-title-border-glow-intensity', '0px');
    }
  } else {
    root.style.setProperty('--steam-title-border-type', 'single-color');
    root.style.setProperty('--steam-title-border-primary-color', 'transparent');
    root.style.setProperty('--steam-title-border-width', '0px');
    root.style.setProperty('--steam-title-border-glow-color', 'transparent');
    root.style.setProperty('--steam-title-border-glow-intensity', '0px');
  }

  // 应用效果变量
  if (theme.effects) {
    Object.entries(theme.effects).forEach(([key, value]) => {
      root.style.setProperty(`--steam-${key}`, value ? 'blur(12px)' : 'none');
    });

    // 侧边栏磨砂回退：未显式配置则使用 cardBlur
    const sidebarBlurEnabled = theme.effects.sidebarBlur !== undefined
      ? theme.effects.sidebarBlur
      : theme.effects.cardBlur;
    root.style.setProperty('--steam-sidebarBlur', sidebarBlurEnabled ? 'blur(12px)' : 'none');
  }
}

// 初始化默认主题
export function initializeDefaultTheme() {
  applyTheme(defaultTheme);
}

// 应用自定义CSS
export function applyCustomCSS(css: string) {
  let styleElement = document.getElementById('custom-theme-style');
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = 'custom-theme-style';
    document.head.appendChild(styleElement);
  }
  styleElement.textContent = css;
}