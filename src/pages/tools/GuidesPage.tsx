import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { StarRating } from '../../components/common/StarRating';
import SectionContainer from '../../components/common/SectionContainer';
import {
  guides,
  getCategories,
  getCategoryName,
  getGuideAuthor,
  getGuideDescription,
  getGuideTitle,
} from '../../data/guides';
import { useI18n } from '../../hooks/useI18n';
import useMeta from '../../hooks/useMeta';
import { formatCompactNumber } from '../../lib/formatters';
import { localeFromPathname } from '../../lib/localePath';

const GuidesPage: React.FC = () => {
  const location = useLocation();
  const { t } = useI18n();
  const locale = localeFromPathname(location.pathname);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useMeta({
    title: `${t('guides:title')} | SteamZone`,
    description: t('guides:description'),
  });

  const categories = getCategories(t);

  const filteredGuides = useMemo(() => {
    return guides.filter((guide) => {
      return selectedCategory === 'all' || guide.categoryKey === selectedCategory;
    });
  }, [selectedCategory]);

  return (
    <div className="min-h-screen bg-steam-background-color">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="bg-steam-card backdrop-blur-md border border-white/10 rounded p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-steam-textPrimary mb-2">{t('guides:title')}</h1>
            <p className="text-steam-textMuted">{t('guides:subtitle')}</p>
          </div>

          <SectionContainer title={t('guides:filters.title')} className="mb-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-48">
                <label className="block text-steam-textMuted text-sm mb-2">{t('guides:filters.category')}</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-steam-item border border-steam-border rounded px-3 py-2 text-steam-textPrimary focus:outline-none focus:ring-2 focus:ring-steam-primary"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name} ({category.count})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </SectionContainer>

          <SectionContainer title={`${t('guides:stats.recentGuides')} (${filteredGuides.length})`}>
            {filteredGuides.length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="w-16 h-16 mx-auto text-steam-textMuted mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33"
                  />
                </svg>
                <p className="text-steam-textMuted text-lg">{t('guides:search.noResults')}</p>
                <p className="text-steam-textMuted text-sm mt-2">{t('guides:search.tryDifferentKeywords')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredGuides.map((guide) => (
                  <div
                    key={guide.id}
                    className="bg-steam-item border border-steam-border rounded-lg p-4 hover:border-steam-primary transition-all duration-200"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-steam-textPrimary hover:text-steam-textSecondary transition-colors mb-1">
                          <a
                            href={guide.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {getGuideTitle(guide.titleKey, t)}
                          </a>
                        </h3>
                        <p className="text-steam-textMuted text-sm mb-2 line-clamp-2">
                          {getGuideDescription(guide.descriptionKey, t)}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-steam-textMuted">
                          <span>
                            {t('guides:guide.author')}: {getGuideAuthor(guide.authorKey, t)}
                          </span>
                          <span>
                            {t('guides:guide.date')}: {guide.date}
                          </span>
                          {guide.downloads && (
                            <span>
                              {t('guides:guide.downloads')}: {formatCompactNumber(guide.downloads, locale)}
                            </span>
                          )}
                          <span>
                            {t('guides:guide.category')}: {getCategoryName(guide.categoryKey, t)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2 ml-4">
                        {guide.rating && (
                          <div className="flex items-center space-x-1">
                            <StarRating rating={guide.rating} idSuffix={guide.id} />
                            <span className="text-xs text-steam-textMuted ml-1">{guide.rating.toFixed(1)}</span>
                          </div>
                        )}
                        <a
                          href={guide.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-steam-primary text-steam-dark px-3 py-1 rounded hover:bg-steam-secondary transition-colors text-xs font-medium"
                        >
                          {t('guides:guide.readMore')}
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionContainer>
        </div>
      </div>
    </div>
  );
};

export default GuidesPage;
