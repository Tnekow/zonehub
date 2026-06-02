// src/data/guides.ts

export interface Guide {
  id: string;
  titleKey: string; // 改为使用翻译键
  descriptionKey: string; // 改为使用翻译键
  categoryKey: string; // 改为使用翻译键
  url: string;
  authorKey: string; // 改为使用翻译键
  date: string;
  steamId?: string; // Steam创意工坊ID
  imageUrl?: string; // 预览图片URL
  rating?: number; // 评分
  downloads?: number; // 下载次数
}

// 创建获取本地化分类名称的函数
// i18n安全获取：缺失翻译时回退到原始值，避免显示 sampleGuides.xxx 前缀
const translateOrFallback = (key: string, fallback: string, t: (key: string) => string): string => {
  const translated = t(key);
  // t 会在缺失时返回 key 本身，这里统一回退到原始值
  if (!translated || translated === key || translated.includes('sampleGuides.')) {
    return fallback;
  }
  return translated;
};

export const getCategoryName = (categoryKey: string, t: (key: string) => string): string => {
  return translateOrFallback(`guides:categories.${categoryKey}`, categoryKey, t);
};

// 创建获取本地化指南标题的函数
export const getGuideTitle = (titleKey: string, t: (key: string) => string): string => {
  return translateOrFallback(`guides:sampleGuides.${titleKey}.title`, titleKey, t);
};

// 创建获取本地化指南描述的函数
export const getGuideDescription = (descriptionKey: string, t: (key: string) => string): string => {
  return translateOrFallback(`guides:sampleGuides.${descriptionKey}.description`, descriptionKey, t);
};

// 创建获取本地化作者名称的函数
export const getGuideAuthor = (authorKey: string, t: (key: string) => string): string => {
  return translateOrFallback(`guides:sampleGuides.${authorKey}.author`, authorKey, t);
};

export const guides: Guide[] = [
  {
    id: '1',
    titleKey: 'moePointArt',
    descriptionKey: 'moePointArt',
    categoryKey: 'messageBoard',
    url: 'https://steamcommunity.com/sharedfiles/filedetails/?id=2212674192',
    authorKey: 'moePointArt',
    date: '2024-03-27',
    steamId: '2212674192',
    rating: 4.6,
    downloads: 15000
  },
  {
    id: '2',
    titleKey: 'steamBadges',
    descriptionKey: 'steamBadges',
    categoryKey: 'badges',
    url: 'https://steamcommunity.com/sharedfiles/filedetails/?id=1158154188',
    authorKey: 'steamBadges',
    date: '2024-01-08',
    steamId: '1158154188',
    rating: 4.6,
    downloads: 25000
  },
  {
    id: '3',
    titleKey: 'allColorsSteamThemes',
    descriptionKey: 'allColorsSteamThemes',
    categoryKey: 'profile',
    url: 'https://steamcommunity.com/sharedfiles/filedetails/?id=2993362577',
    authorKey: 'allColorsSteamThemes',
    date: '2025-02-19',
    steamId: '2993362577',
    rating: 4.6,
    downloads: 37074
  },
  {
    id: '4',
    titleKey: 'naviSteamCheckLog',
    descriptionKey: 'naviSteamCheckLog',
    categoryKey: 'profile',
    url: 'https://steamcommunity.com/sharedfiles/filedetails/?id=3401912088',
    authorKey: 'naviSteamCheckLog',
    date: '2025-09-20',
    rating: 4.6,
    steamId: '3401912088',
    downloads: 22000
  },
  {
    id: '5',
    titleKey: 'devaGuides',
    descriptionKey: 'devaGuides',
    categoryKey: 'profile',
    url: 'https://steamcommunity.com/sharedfiles/filedetails/?id=3714411712',
    authorKey: 'devaGuides',
    date: '2025-09-21',
    steamId: '3564439756',
    rating: 4.6,
    downloads: 18000
  },
  {
    id: '6',
    titleKey: 'profileBeautifyTips',
    descriptionKey: 'profileBeautifyTips',
    categoryKey: 'profile',
    url: 'https://steamcommunity.com/sharedfiles/filedetails/?id=3595138726',
    authorKey: 'call',
    date: '2025-10-29',
    steamId: '3595138726',
    rating: 4.6,
    downloads: 12000
  },
  {
    id: '7',
    titleKey: 'nasgeWysiwygGuide',
    descriptionKey: 'nasgeWysiwygGuide',
    categoryKey: 'profile',
    url: 'https://steamcommunity.com/sharedfiles/filedetails/?id=3635919673',
    authorKey: 'nasgeWysiwygGuide',
    date: '2025-12-31',
    rating: 4.6,
    steamId: '3635919673'
  }
];

// 分类数据 - 使用翻译键
export const categoryKeys = [
  'all',
  'messageBoard',
  'badges',
  'profile',
  'artwork',
  'inventory',
  'social',
  'workshop',
  'market',
  'screenshots',
  'security'
];

// 创建获取分类数据的函数
export const getCategories = (t: (key: string) => string) => {
  return categoryKeys.map(key => ({
    id: key,
    name: getCategoryName(key, t),
    count: key === 'all' ? guides.length : guides.filter(g => g.categoryKey === key).length
  }));
};