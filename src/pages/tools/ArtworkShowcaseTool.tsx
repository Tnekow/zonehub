import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LocaleMdxContent } from '../../components/mdx/LocaleMdxContent';
import { loadBackgroundCutTutorial } from '../../content/loadMdxModule';
import type { BackgroundCutModule } from '../../content/types';
import { useI18n } from '../../hooks/useI18n';
import useMeta from '../../hooks/useMeta';
import {
  localeFromPathname,
  withLocalePath,
} from '../../lib/localePath';

type ToolOption = 'background-cut' | null;

const ArtworkShowcaseTool: React.FC = () => {
  const [selectedOption, setSelectedOption] = useState<ToolOption>(null);
  const [tutorialTitle, setTutorialTitle] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const locale = localeFromPathname(location.pathname);
  const inDesktopShell = location.pathname.startsWith('/desktop');
  const basePath = inDesktopShell ? '/desktop/artwork-showcase' : withLocalePath(location.pathname, '/artwork-showcase');

  useEffect(() => {
    if (selectedOption !== 'background-cut') return;
    loadBackgroundCutTutorial(locale).then((mod) => setTutorialTitle(mod.pageTitle));
  }, [selectedOption, locale]);

  useMeta({
    title: t('artworkShowcase:meta.toolsTitle'),
    description: t('artworkShowcase:meta.toolsDescription'),
  });

  return (
    <div className="min-h-screen bg-steam-background-color">
      <div className="max-w-4xl mx-auto px-6 py-16">
        {!selectedOption ? (
          <div className="bg-steam-card backdrop-blur-md border border-white/10 rounded p-6">
            <h2 className="text-xl font-semibold text-steam-textPrimary mb-6 text-center">
              {t('artworkShowcase:tools.chooseTool')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div
                className="bg-steam-item backdrop-blur-md border border-white/10 rounded p-6 cursor-pointer hover:border-steam-primary transition-colors"
                onClick={() => setSelectedOption('background-cut')}
              >
                <h1 className="text-2xl font-bold text-steam-textPrimary mb-4">
                  {t('artworkShowcase:tools.backgroundCutOnly')}
                </h1>
                <p className="text-steam-textMuted mb-4">{t('artworkShowcase:tools.backgroundCutDesc')}</p>
                <div className="text-steam-textSecondary text-sm">{t('artworkShowcase:tools.clickTutorial')}</div>
              </div>

              <div
                className="bg-steam-item backdrop-blur-md border border-white/10 rounded p-6 cursor-pointer hover:border-steam-primary transition-colors"
                onClick={() => navigate(`${basePath}/video-to-gif`)}
              >
                <h1 className="text-2xl font-bold text-steam-textPrimary mb-4">
                  {t('artworkShowcase:tools.videoToGif')}
                </h1>
                <p className="text-steam-textMuted mb-4">{t('artworkShowcase:tools.videoToGifDesc')}</p>
                <div className="text-steam-textSecondary text-sm">{t('artworkShowcase:tools.clickStart')}</div>
              </div>

              <div className="bg-steam-item backdrop-blur-md border border-white/10 rounded p-6 opacity-50">
                <h1 className="text-2xl font-bold text-steam-textMuted mb-4">{t('artworkShowcase:tools.moreTools')}</h1>
                <p className="text-steam-textMuted mb-4">{t('artworkShowcase:tools.underDev')}</p>
                <div className="text-steam-textMuted text-sm">{t('artworkShowcase:tools.stayTuned')}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-steam-card backdrop-blur-md border border-white/10 rounded p-6">
            <button
              type="button"
              onClick={() => setSelectedOption(null)}
              className="text-steam-textSecondary hover:text-steam-textPrimary mb-6 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              {t('artworkShowcase:tools.backToSelection')}
            </button>

            {selectedOption === 'background-cut' && (
              <div>
                <h1 className="text-2xl font-bold text-steam-textPrimary mb-6">{tutorialTitle}</h1>
                <LocaleMdxContent<BackgroundCutModule>
                  locale={locale}
                  load={loadBackgroundCutTutorial}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtworkShowcaseTool;
