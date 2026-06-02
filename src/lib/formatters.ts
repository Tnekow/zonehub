import type { AppLocale } from './localePath';

/** 紧凑数字格式：中文/日文用「万」，英文用 K */
export function formatCompactNumber(num: number, locale: AppLocale): string {
  if (locale === 'en-US') {
    if (num >= 10000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString('en-US');
  }
  if (num >= 10000) return `${(num / 10000).toFixed(1)}万`;
  return num.toLocaleString(locale === 'ja-JP' ? 'ja-JP' : 'zh-CN');
}
