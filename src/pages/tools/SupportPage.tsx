import React from 'react';
import SponsorWall from '../../components/support/SponsorWall';
import useMeta from '../../hooks/useMeta';
import { AFDIAN_SUPPORT_URL, DISCORD_COMMUNITY_URL } from '../../lib/supportLinks';
import { useTranslation } from 'react-i18next';

const SupportPage: React.FC = () => {
  const { t } = useTranslation('support');

  useMeta({
    title: t('meta.title'),
    description: t('meta.description'),
  });

  return (
    <div className="min-h-screen bg-steam-background-color">
      <div className="max-w-3xl mx-auto px-6 py-12 md:py-16">
        <div className="bg-steam-card backdrop-blur-md border border-white/10 rounded-xl p-6 md:p-10">
          <header className="text-center mb-10">
            <h1 className="text-3xl font-bold text-steam-textPrimary">{t('pageTitle')}</h1>
            <p className="mt-4 text-steam-textSecondary leading-relaxed">{t('freeNote')}</p>
          </header>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-steam-textPrimary text-center mb-2">
              {t('sponsorWallTitle')}
            </h2>
            <p className="text-steam-textMuted text-xs text-center mb-6">{t('thanksNote')}</p>
            <SponsorWall size="lg" emptyMessage={t('sponsorEmpty')} />
          </section>

          <section className="text-center border-t border-white/10 pt-10">
            <a
              href={AFDIAN_SUPPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-steam-primary px-8 py-3 text-base font-semibold text-white hover:bg-steam-secondary transition-colors shadow-lg"
            >
              <span>💝</span>
              <span>{t('afdianCta')}</span>
            </a>
            <p className="mt-3 text-steam-textMuted text-xs">{t('afdianHint')}</p>
          </section>

          <section className="mt-10 rounded-lg border border-steam-border bg-steam-item p-6 text-center">
            <h2 className="text-xl font-semibold text-steam-textPrimary mb-3">{t('helpTitle')}</h2>
            <p className="text-steam-textSecondary text-sm mb-4">{t('helpBody')}</p>
            <a
              href={DISCORD_COMMUNITY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-steam-primary hover:text-steam-secondary transition-colors text-sm"
            >
              {t('discord')}
            </a>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SupportPage;
