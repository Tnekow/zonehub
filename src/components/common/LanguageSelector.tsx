import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useI18n } from '../../hooks/useI18n';
import { track } from '../../lib/analytics';
import { switchPathToLocale, type AppLocale } from '../../lib/localePath';

const LANGUAGE_CHOSEN_KEY = 'steamzone_languageChosen';

const LanguageSelector: React.FC = () => {
  const { i18n, changeLanguage } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  
  const currentLang = i18n.language;

  useEffect(() => {
    if (localStorage.getItem(LANGUAGE_CHOSEN_KEY)) return;

    const userLanguage = navigator.language || navigator.languages?.[0] || 'en-US';
    const browserIsChinese = userLanguage.startsWith('zh');
    const browserIsJapanese = userLanguage.startsWith('ja');
    
    if (browserIsChinese && currentLang !== 'zh-CN') {
      handleLanguageChange('zh-CN');
    } else if (browserIsJapanese && currentLang !== 'ja-JP') {
      handleLanguageChange('ja-JP');
    } else if (!browserIsChinese && !browserIsJapanese && currentLang === 'zh-CN') {
      handleLanguageChange('en-US');
    }
  }, []);
  
  const handleLanguageChange = (newLang: AppLocale) => {
    const currentPath = location.pathname;
    const prevLang = i18n.language;

    changeLanguage(newLang);
    localStorage.setItem(LANGUAGE_CHOSEN_KEY, 'true');
    navigate(switchPathToLocale(currentPath, newLang));

    try {
      track('language_changed', { from: prevLang, to: newLang, path: currentPath });
    } catch (error) {
      void error;
    }
  };
  
  return (
    <div className="flex items-center bg-white/10 rounded-full p-0.5 backdrop-blur-sm border border-white/10">
      <button 
        onClick={() => handleLanguageChange('zh-CN')}
        className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-200 ${
          currentLang === 'zh-CN'
            ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30' 
            : 'text-gray-400 hover:text-gray-200'
        }`}
      >
        中
      </button>
      <button 
        onClick={() => handleLanguageChange('en-US')}
        className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-200 ${
          currentLang === 'en-US'
            ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30' 
            : 'text-gray-400 hover:text-gray-200'
        }`}
      >
        EN
      </button>
      <button 
        onClick={() => handleLanguageChange('ja-JP')}
        className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-200 ${
          currentLang === 'ja-JP'
            ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30' 
            : 'text-gray-400 hover:text-gray-200'
        }`}
      >
        JA
      </button>
    </div>
  );
};

export default LanguageSelector;
