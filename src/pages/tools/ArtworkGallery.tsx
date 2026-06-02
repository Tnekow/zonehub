import React from 'react';
import { useI18n } from '../../hooks/useI18n';
import useMeta from '../../hooks/useMeta';

const ArtworkGallery: React.FC = () => {
  const { t } = useI18n();

  useMeta({
    title: t('artworkShowcase:meta.galleryTitle'),
    description: t('artworkShowcase:meta.galleryDescription'),
  });

  return (
    <div className="min-h-screen bg-steam-background-color">
      <div className="bg-steam-card backdrop-blur-steam-card border-b border-white/10 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-steam-textPrimary mb-2">{t('artworkShowcase:gallery.title')}</h1>
          <p className="text-steam-textMuted">{t('artworkShowcase:gallery.subtitle')}</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-steam-card backdrop-blur-steam-card border border-white/10 rounded p-6">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-steam-textPrimary mb-4">
              {t('artworkShowcase:gallery.contentTitle')}
            </h2>
            <p className="text-steam-textMuted">{t('artworkShowcase:gallery.contentDesc')}</p>
            <p className="text-steam-textMuted text-sm mt-2">{t('artworkShowcase:gallery.underDevelopment')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArtworkGallery;
