import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 导入翻译文件
import zhCNCommon from './zh-CN/common.json';
import zhCNProfile from './zh-CN/profile.json';
import zhCNNavigation from './zh-CN/navigation.json';
import zhCNGuides from './zh-CN/guides.json';
import zhCNComments from './zh-CN/comments.json';
import zhCNErrors from './zh-CN/errors.json';
import zhCNTheme from './zh-CN/theme.json';
import zhCNHero from './zh-CN/hero.json';
import zhCNBadgePicker from './zh-CN/badgePicker.json';
import zhCNBadgeCollector from './zh-CN/badgeCollector.json';
import zhCNLanding from './zh-CN/landing.json';
import zhCNDesktop from './zh-CN/desktop.json';
import zhCNHowTo from './zh-CN/howTo.json';
import zhCNSupport from './zh-CN/support.json';

import enUSCommon from './en-US/common.json';
import enUSProfile from './en-US/profile.json';
import enUSNavigation from './en-US/navigation.json';
import enUSGuides from './en-US/guides.json';
import enUSComments from './en-US/comments.json';
import enUSErrors from './en-US/errors.json';
import enUSTheme from './en-US/theme.json';
import enUSHero from './en-US/hero.json';
import enUSBadgePicker from './en-US/badgePicker.json';
import enUSBadgeCollector from './en-US/badgeCollector.json';
import enUSLanding from './en-US/landing.json';
import enUSDesktop from './en-US/desktop.json';
import enUSHowTo from './en-US/howTo.json';
import enUSSupport from './en-US/support.json';

import jaJPHero from './ja-JP/hero.json';
import jaJPCommon from './ja-JP/common.json';
import jaJPNavigation from './ja-JP/navigation.json';
import jaJPProfile from './ja-JP/profile.json';
import jaJPGuides from './ja-JP/guides.json';
import jaJPComments from './ja-JP/comments.json';
import jaJPErrors from './ja-JP/errors.json';
import jaJPTheme from './ja-JP/theme.json';
import jaJPBadgePicker from './ja-JP/badgePicker.json';
import jaJPBadgeCollector from './ja-JP/badgeCollector.json';
import jaJPLanding from './ja-JP/landing.json';
import jaJPArtworkShowcase from './ja-JP/artworkShowcase.json';
import zhCNArtworkShowcase from './zh-CN/artworkShowcase.json';
import enUSArtworkShowcase from './en-US/artworkShowcase.json';
import jaJPDesktop from './ja-JP/desktop.json';
import jaJPHowTo from './ja-JP/howTo.json';
import jaJPSupport from './ja-JP/support.json';

// 资源文件
const resources = {
  'zh-CN': {
    common: zhCNCommon,
    profile: zhCNProfile,
    navigation: zhCNNavigation,
    guides: zhCNGuides,
    comments: zhCNComments,
    errors: zhCNErrors,
    theme: zhCNTheme,
    hero: zhCNHero,
    badgePicker: zhCNBadgePicker,
    badgeCollector: zhCNBadgeCollector,
    landing: zhCNLanding,
    desktop: zhCNDesktop,
    artworkShowcase: zhCNArtworkShowcase,
    howTo: zhCNHowTo,
    support: zhCNSupport,
  },
  'en-US': {
    common: enUSCommon,
    profile: enUSProfile,
    navigation: enUSNavigation,
    guides: enUSGuides,
    comments: enUSComments,
    errors: enUSErrors,
    theme: enUSTheme,
    hero: enUSHero,
    badgePicker: enUSBadgePicker,
    badgeCollector: enUSBadgeCollector,
    landing: enUSLanding,
    desktop: enUSDesktop,
    artworkShowcase: enUSArtworkShowcase,
    howTo: enUSHowTo,
    support: enUSSupport,
  },
  'ja-JP': {
    common: jaJPCommon,
    profile: jaJPProfile,
    navigation: jaJPNavigation,
    guides: jaJPGuides,
    comments: jaJPComments,
    errors: jaJPErrors,
    theme: jaJPTheme,
    hero: jaJPHero,
    badgePicker: jaJPBadgePicker,
    badgeCollector: jaJPBadgeCollector,
    landing: jaJPLanding,
    artworkShowcase: jaJPArtworkShowcase,
    desktop: jaJPDesktop,
    howTo: jaJPHowTo,
    support: jaJPSupport,
  },
};

// i18n配置
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: { 'ja-JP': ['en-US', 'zh-CN'], default: ['zh-CN'] },
    debug: import.meta.env.DEV,
    
    // 检测配置
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'preferredLanguage',
    },
    
    // 插值配置
    interpolation: {
      escapeValue: false, // React已经安全地转义了
    },
    
    // 命名空间配置
    defaultNS: 'common',
    ns: ['common', 'profile', 'navigation', 'guides', 'comments', 'errors', 'theme', 'hero', 'badgePicker', 'badgeCollector', 'landing', 'artworkShowcase', 'desktop', 'howTo', 'support'],
    
    // 复数规则
    pluralSeparator: '_',
    contextSeparator: '_',
  });

export default i18n;
