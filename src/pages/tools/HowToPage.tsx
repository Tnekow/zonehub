import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useMeta from '../../hooks/useMeta';
import {
  withLocalePrefix,
} from '../../lib/localePath';
import { resolveSupportPath } from '../../lib/supportPaths';

const CHAPTER_IDS = [
  'chapter-1',
  'chapter-2',
  'chapter-3',
  'chapter-4',
  'chapter-5',
  'chapter-6',
  'chapter-7',
] as const;

type RichTextTag = { code: string; label: string };

function ChapterHeading({ num, title }: { num: number; title: string }) {
  return (
    <h2 className="text-3xl font-bold text-steam-textPrimary mb-6 flex items-center">
      <span className="bg-steam-primary text-steam-dark w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold mr-4">
        {num}
      </span>
      {title}
    </h2>
  );
}

function FigureImage({ src, alt, caption }: { src: string; alt: string; caption: string }) {
  return (
    <div className="text-center">
      <img src={src} alt={alt} className="rounded-lg shadow-lg mx-auto" />
      <p className="text-steam-textSecondary text-sm mt-2">{caption}</p>
    </div>
  );
}

const HowToPage: React.FC = () => {
  const location = useLocation();
  const { t } = useTranslation('howTo');
  const isDesktop = location.pathname.startsWith('/desktop');

  const [activeChapter, setActiveChapter] = useState<string>(CHAPTER_IDS[0]);
  const [tocOpen, setTocOpen] = useState(false);

  const pathVideoToGif = isDesktop
    ? '/desktop/artwork-showcase/video-to-gif'
    : withLocalePrefix(localePrefix, '/artwork-showcase/video-to-gif');
  const pathArtworkShowcase = isDesktop
    ? '/desktop/artwork-showcase'
    : withLocalePrefix(localePrefix, '/artwork-showcase');
  const pathSupport = resolveSupportPath(location.pathname);

  const chapterLabels = useMemo(
    () => t('toc.chapterLabels', { returnObjects: true }) as string[],
    [t],
  );

  const quickStartSteps = useMemo(
    () => t('quickStart.steps', { returnObjects: true }) as string[],
    [t],
  );

  const showcaseItems = useMemo(
    () => t('chapters.ch1.showcaseItems', { returnObjects: true }) as string[],
    [t],
  );

  const personalizationItems = useMemo(
    () => t('chapters.ch2.personalizationItems', { returnObjects: true }) as string[],
    [t],
  );

  const builtinBgs = useMemo(
    () => t('chapters.ch4.builtinBgs', { returnObjects: true }) as string[],
    [t],
  );

  const videoBgs = useMemo(
    () => t('chapters.ch4.videoBgs', { returnObjects: true }) as string[],
    [t],
  );

  const gifFeatures = useMemo(
    () => t('chapters.ch5.features', { returnObjects: true }) as string[],
    [t],
  );

  const richTextTags = useMemo(
    () => t('chapters.ch6.tags', { returnObjects: true }) as RichTextTag[],
    [t],
  );

  useEffect(() => {
    const onScroll = () => {
      const threshold = 120;
      for (let i = CHAPTER_IDS.length - 1; i >= 0; i--) {
        const el = document.getElementById(CHAPTER_IDS[i]);
        if (el) {
          const top = el.getBoundingClientRect().top;
          if (top <= threshold) {
            setActiveChapter(CHAPTER_IDS[i]);
            return;
          }
        }
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useMeta({
    title: t('meta.title'),
    description: t('meta.description'),
  });

  const scrollToChapter = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const tocItems = CHAPTER_IDS.map((id, index) => ({
    id,
    label: chapterLabels[index] ?? id,
  }));

  return (
    <div className="min-h-screen bg-steam-background-color">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex gap-8">
          <div className="flex-1 bg-steam-card backdrop-blur-md border border-white/10 rounded p-6">
            <section className="mb-12">
              <div className="bg-steam-item rounded-lg p-6 border border-steam-border">
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-steam-textPrimary mb-6">{t('intro.title')}</h2>
                  <p className="text-steam-textSecondary leading-relaxed text-lg mb-6">{t('intro.welcome')}</p>
                  <div className="bg-steam-card rounded-lg p-4 border border-steam-primary/30 text-left">
                    <h3 className="text-lg font-semibold text-steam-textPrimary mb-3">{t('quickStart.title')}</h3>
                    <ol className="list-decimal list-inside space-y-2 text-steam-textSecondary">
                      {quickStartSteps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                    <p className="text-steam-textMuted text-sm mt-3">{t('quickStart.footnote')}</p>
                  </div>
                  <div className="mt-4 bg-steam-card rounded-lg p-4 border border-steam-border text-left">
                    <h3 className="text-lg font-semibold text-steam-textPrimary mb-2">{t('links.title')}</h3>
                    <ul className="flex flex-wrap gap-3 text-sm">
                      <li>
                        <Link
                          to={pathVideoToGif}
                          className="text-steam-primary hover:text-steam-secondary transition-colors underline"
                        >
                          {t('links.videoToGif')}
                        </Link>
                      </li>
                      <li>
                        <Link
                          to={pathArtworkShowcase}
                          className="text-steam-primary hover:text-steam-secondary transition-colors underline"
                        >
                          {t('links.artworkTools')}
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            <section id="chapter-1" className="mb-12">
              <div className="bg-steam-item rounded-lg p-6 border border-steam-border">
                <ChapterHeading num={1} title={t('chapters.ch1.title')} />
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-steam-textPrimary mb-3">
                      {t('chapters.ch1.editButtonTitle')}
                    </h3>
                    <p className="text-steam-textSecondary leading-relaxed mb-4">
                      {t('chapters.ch1.editButtonBody')}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-steam-textPrimary mb-3">
                      {t('chapters.ch1.editModeTitle')}
                    </h3>
                    <p className="text-steam-textSecondary leading-relaxed mb-4">
                      {t('chapters.ch1.editModeBody')}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-steam-textPrimary mb-3">
                      {t('chapters.ch1.showcaseTypesTitle')}
                    </h3>
                    <p className="text-steam-textSecondary leading-relaxed mb-4">
                      {t('chapters.ch1.showcaseTypesIntro')}
                    </p>
                    <div className="bg-steam-card rounded-lg p-4 border border-steam-border">
                      <h4 className="font-semibold text-steam-textPrimary mb-2">
                        {t('chapters.ch1.showcaseTypesHeading')}
                      </h4>
                      <ul className="list-disc list-inside space-y-2 text-steam-textSecondary">
                        {showcaseItems.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <FigureImage
                    src="/images/how-to/basicsetup.png"
                    alt={t('chapters.ch1.imgEditButtonAlt')}
                    caption={t('chapters.ch1.imgEditButtonCaption')}
                  />
                  <FigureImage
                    src="/images/how-to/basicsetup-02.webp"
                    alt={t('chapters.ch1.imgEditModeAlt')}
                    caption={t('chapters.ch1.imgEditModeCaption')}
                  />
                </div>
              </div>
            </section>

            <section id="chapter-2" className="mb-12">
              <div className="bg-steam-item rounded-lg p-6 border border-steam-border">
                <ChapterHeading num={2} title={t('chapters.ch2.title')} />
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-steam-textPrimary mb-3">
                      {t('chapters.ch2.personalizationTitle')}
                    </h3>
                    <p className="text-steam-textSecondary leading-relaxed mb-4">
                      {t('chapters.ch2.personalizationIntro')}
                    </p>
                    <div className="bg-steam-card rounded-lg p-4 border border-steam-border">
                      <h4 className="font-semibold text-steam-textPrimary mb-2">
                        {t('chapters.ch2.personalizationHeading')}
                      </h4>
                      <ol className="list-decimal list-inside space-y-2 text-steam-textSecondary">
                        {personalizationItems.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ol>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-steam-textPrimary mb-3">
                      {t('chapters.ch2.previewTitle')}
                    </h3>
                    <p className="text-steam-textSecondary leading-relaxed mb-4">{t('chapters.ch2.previewBody')}</p>
                  </div>
                  <FigureImage
                    src="/images/how-to/avatar&nickname.webp"
                    alt={t('chapters.ch2.imgAlt')}
                    caption={t('chapters.ch2.imgCaption')}
                  />
                </div>
              </div>
            </section>

            <section id="chapter-3" className="mb-12">
              <div className="bg-steam-item rounded-lg p-6 border border-steam-border">
                <ChapterHeading num={3} title={t('chapters.ch3.title')} />
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-steam-textPrimary mb-3">
                      {t('chapters.ch3.headerTitle')}
                    </h3>
                    <p className="text-steam-textSecondary leading-relaxed mb-3">{t('chapters.ch3.headerBody')}</p>
                    <div className="bg-steam-item-in border border-dashed border-steam-border rounded p-4 text-center">
                      <img
                        src="/images/how-to/profile-badge.webp"
                        alt={t('chapters.ch3.imgProfileBadgeAlt')}
                        className="rounded-lg shadow-lg mx-auto"
                      />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-steam-textPrimary mb-3">
                      {t('chapters.ch3.pickerTitle')}
                    </h3>
                    <p className="text-steam-textSecondary leading-relaxed mb-3">{t('chapters.ch3.pickerBody')}</p>
                    <div className="bg-steam-item-in border border-dashed border-steam-border rounded p-4 text-center">
                      <img
                        src="/images/how-to/badgecollector-badge.webp"
                        alt={t('chapters.ch3.imgCollectorBadgeAlt')}
                        className="rounded-lg shadow-lg mx-auto"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section id="chapter-4" className="mb-12">
              <div className="bg-steam-item rounded-lg p-6 border border-steam-border">
                <ChapterHeading num={4} title={t('chapters.ch4.title')} />
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-steam-textPrimary mb-3">
                      {t('chapters.ch4.builtinTitle')}
                    </h3>
                    <p className="text-steam-textSecondary leading-relaxed mb-4">{t('chapters.ch4.builtinIntro')}</p>
                    <div className="bg-steam-card rounded-lg p-4 border border-steam-border">
                      <h4 className="font-semibold text-steam-textPrimary mb-2">{t('chapters.ch4.builtinBgHeading')}</h4>
                      <ul className="list-disc list-inside space-y-2 text-steam-textSecondary">
                        {builtinBgs.map((bg) => (
                          <li key={bg}>{bg}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-steam-card rounded-lg p-4 border border-steam-border mt-4">
                      <h4 className="font-semibold text-steam-textPrimary mb-2">{t('chapters.ch4.videoBgHeading')}</h4>
                      <ul className="list-disc list-inside space-y-2 text-steam-textSecondary">
                        {videoBgs.map((bg) => (
                          <li key={bg}>{bg}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-steam-card rounded-lg p-4 border border-steam-border mt-4">
                      <h4 className="font-semibold text-steam-textPrimary mb-2">{t('chapters.ch4.customUrlHeading')}</h4>
                    </div>
                  </div>
                  <FigureImage
                    src="/images/how-to/Background&Themes.webp"
                    alt={t('chapters.ch4.imgAlt')}
                    caption={t('chapters.ch4.imgCaption')}
                  />
                </div>
              </div>
            </section>

            <section id="chapter-5" className="mb-12">
              <div className="bg-steam-item rounded-lg p-6 border border-steam-border">
                <ChapterHeading num={5} title={t('chapters.ch5.title')} />
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-steam-textPrimary mb-3">
                      {t('chapters.ch5.videoGifTitle')}
                    </h3>
                    <p className="text-steam-textSecondary leading-relaxed mb-4">{t('chapters.ch5.videoGifIntro')}</p>
                    <div className="bg-steam-card rounded-lg p-4 border border-steam-border">
                      <h4 className="font-semibold text-steam-textPrimary mb-2">{t('chapters.ch5.featuresHeading')}</h4>
                      <ul className="list-disc list-inside space-y-2 text-steam-textSecondary">
                        {gifFeatures.map((feature) => (
                          <li key={feature}>{feature}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-steam-textPrimary mb-3">{t('chapters.ch5.urlTitle')}</h3>
                    <p className="text-steam-textSecondary leading-relaxed mb-4">
                      {t('chapters.ch5.urlBody')}{' '}
                      <Link
                        to={pathVideoToGif}
                        className="text-steam-primary hover:text-steam-secondary transition-colors underline"
                      >
                        {pathVideoToGif}
                      </Link>
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-steam-textPrimary mb-3">
                      {t('chapters.ch5.previewTitle')}
                    </h3>
                    <p className="text-steam-textSecondary leading-relaxed mb-4">{t('chapters.ch5.previewBody')}</p>
                  </div>
                  <FigureImage
                    src="/images/how-to/ArtworkShowcase01.webp"
                    alt={t('chapters.ch5.imgAlt')}
                    caption={t('chapters.ch5.imgCaption')}
                  />
                </div>
              </div>
            </section>

            <section id="chapter-6" className="mb-12">
              <div className="bg-steam-item rounded-lg p-6 border border-steam-border">
                <ChapterHeading num={6} title={t('chapters.ch6.title')} />
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-steam-textPrimary mb-3">{t('chapters.ch6.tagsTitle')}</h3>
                    <p className="text-steam-textSecondary leading-relaxed mb-4">{t('chapters.ch6.tagsIntro')}</p>
                    <div className="bg-steam-card rounded-lg p-4 border border-steam-border">
                      <ul className="list-disc list-inside space-y-2 text-steam-textSecondary">
                        {richTextTags.map((tag) => (
                          <li key={tag.code}>
                            <code className="bg-steam-item-in px-2 py-1 rounded text-sm">{tag.code}</code>
                            {tag.code === '[hr][/hr]' ? (
                              <>
                                {' '}
                                {t('chapters.ch6.hrOr')}{' '}
                                <code className="bg-steam-item-in px-2 py-1 rounded text-sm">[hr]</code>
                              </>
                            ) : null}{' '}
                            - {tag.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section id="chapter-7" className="mb-12">
              <div className="bg-steam-item rounded-lg p-6 border border-steam-border">
                <ChapterHeading num={7} title={t('chapters.ch7.title')} />
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="bg-gradient-to-r from-steam-primary/20 to-steam-secondary/20 rounded-lg p-8 border border-steam-primary/30">
                      <h3 className="text-2xl font-bold text-steam-textPrimary mb-4">{t('chapters.ch7.wipTitle')}</h3>
                      <p className="text-lg text-steam-textSecondary leading-relaxed">{t('chapters.ch7.wipBody')}</p>
                    </div>
                  </div>
                  <div className="mt-6 text-center">
                    <p className="text-steam-textSecondary text-sm mb-4">{t('support.freeNote')}</p>
                    <Link
                      to={pathSupport}
                      className="inline-flex flex-col items-center gap-1 rounded-lg bg-steam-primary px-6 py-3 text-sm font-semibold text-white hover:bg-steam-secondary transition-colors"
                    >
                      <span className="inline-flex items-center gap-2">
                        <span>💝</span>
                        <span>{t('support.viewSupportCta')}</span>
                      </span>
                      <span className="text-xs font-normal text-white/80">{t('support.viewSupportHint')}</span>
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="hidden lg:block w-80 flex-shrink-0">
            <div className="sticky top-20 h-[calc(100vh-5rem)] flex flex-col">
              <div className="bg-steam-card backdrop-blur-md border border-white/10 rounded p-6">
                <h2 className="text-2xl font-bold text-steam-textPrimary mb-4">{t('toc.title')}</h2>
                <div className="space-y-3">
                  {tocItems.map(({ id, label }, index) => (
                    <div
                      key={id}
                      role="button"
                      tabIndex={0}
                      className={`flex items-center space-x-2 cursor-pointer transition-colors ${
                        activeChapter === id
                          ? 'text-steam-primary font-semibold'
                          : 'text-steam-textSecondary hover:text-steam-primary'
                      }`}
                      onClick={() => scrollToChapter(id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') scrollToChapter(id);
                      }}
                    >
                      <span className="font-bold">{index + 1}.</span>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="mt-auto self-start w-10 h-10 flex items-center justify-center rounded-lg bg-steam-card backdrop-blur-sm border border-white/10 text-steam-textMuted hover:text-steam-primary hover:bg-white/10 transition-all duration-200 shadow-lg"
                aria-label={t('toc.backToTop')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setTocOpen(true)}
          className="lg:hidden fixed bottom-6 right-6 z-40 w-12 h-12 flex items-center justify-center rounded-full bg-steam-card border border-white/20 text-steam-textPrimary shadow-lg hover:bg-white/10 transition-colors"
          aria-label={t('toc.open')}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {tocOpen && (
          <>
            <div
              className="lg:hidden fixed inset-0 z-50 bg-black/50"
              aria-hidden
              onClick={() => setTocOpen(false)}
            />
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 max-h-[70vh] overflow-auto rounded-t-2xl bg-steam-card border border-white/10 border-b-0 shadow-2xl">
              <div className="sticky top-0 flex items-center justify-between p-4 border-b border-white/10 bg-steam-card">
                <h2 className="text-xl font-bold text-steam-textPrimary">{t('toc.title')}</h2>
                <button
                  type="button"
                  onClick={() => setTocOpen(false)}
                  className="p-2 text-steam-textMuted hover:text-steam-textPrimary"
                  aria-label={t('toc.close')}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-4 space-y-2 pb-8">
                {tocItems.map(({ id, label }, index) => (
                  <button
                    key={id}
                    type="button"
                    className={`w-full text-left flex items-center space-x-2 py-2 px-3 rounded-lg transition-colors ${
                      activeChapter === id
                        ? 'bg-steam-primary/20 text-steam-primary font-semibold'
                        : 'text-steam-textSecondary hover:bg-white/5'
                    }`}
                    onClick={() => {
                      scrollToChapter(id);
                      setTocOpen(false);
                    }}
                  >
                    <span className="font-bold">{index + 1}.</span>
                    <span>{label}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    setTocOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 mt-2 rounded-lg border border-white/10 text-steam-textMuted hover:text-steam-primary hover:bg-white/5"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                  </svg>
                  {t('toc.backToTop')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default HowToPage;
