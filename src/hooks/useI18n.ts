import { useTranslation } from 'react-i18next';

/**
 * 自定义i18n Hook，提供便捷的翻译功能
 */
export const useI18n = () => {
  const { t, i18n } = useTranslation();
  
  /**
   * 格式化时间
   */
  const formatTime = (timeString: string): string => {
    const date = new Date(timeString);
    const lang = i18n.language;
    const locale = lang === 'zh-CN' ? 'zh-CN' : lang === 'ja-JP' ? 'ja-JP' : 'en-US';
    
    if (locale === 'ja-JP') {
      return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: false,
      });
    }
    if (locale === 'zh-CN') {
      const period = date.getHours() < 12 ? t('common:time.am') : t('common:time.pm');
      const displayHours = date.getHours() < 12 ? date.getHours() : date.getHours() - 12;
      const displayMinutes = date.getMinutes().toString().padStart(2, '0');
      
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${period} ${displayHours}:${displayMinutes}`;
    } else {
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
  };
  
  /**
   * 切换语言
   */
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('preferredLanguage', lng);
  };
  
  /**
   * 获取当前语言
   */
  const getCurrentLanguage = (): string => {
    return i18n.language;
  };
  
  return {
    t,
    i18n,
    formatTime,
    changeLanguage,
    getCurrentLanguage
  };
}; 