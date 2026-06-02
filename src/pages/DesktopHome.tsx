import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { DesktopCanvasMode, DesktopOutletContext } from '../types/desktopOutletContext';
import { backgroundPresets, type BackgroundConfig } from '../data/background';
import { themePresets, type ThemeConfig } from '../data/theme';
import { useI18n } from '../hooks/useI18n';
import { resolveRemoteAssetUrl } from '../lib/remoteAssetUrl';
import { clearSteamThemeData } from '../hooks/useLocalStorage';
import {
  loadTutorialOnboardingState,
  markStepCompleted,
  saveTutorialOnboardingState,
  type TutorialOnboardingState,
} from '../lib/tutorialOnboarding';
import { trackMilestoneByEvent } from '../lib/localMilestones';
import { toPublicAssetUrl } from '../lib/publicAsset';

/** 桌面壳内仅切换语言，不改变路径（保持 /desktop/*） */
function DesktopLanguageButtons() {
  const { i18n, changeLanguage } = useI18n();
  const currentLang = i18n.language;
  const setLang = (lang: string) => {
    changeLanguage(lang);
  };
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => setLang('zh-CN')}
        className={`rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
          currentLang === 'zh-CN'
            ? 'border-emerald-500/40 bg-emerald-500/12 text-emerald-200'
            : 'border-slate-700 bg-slate-900/70 text-slate-300 hover:bg-slate-800/90'
        }`}
      >
        中
      </button>
      <button
        type="button"
        onClick={() => setLang('en-US')}
        className={`rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
          currentLang === 'en-US'
            ? 'border-emerald-500/40 bg-emerald-500/12 text-emerald-200'
            : 'border-slate-700 bg-slate-900/70 text-slate-300 hover:bg-slate-800/90'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang('ja-JP')}
        className={`rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
          currentLang === 'ja-JP'
            ? 'border-emerald-500/40 bg-emerald-500/12 text-emerald-200'
            : 'border-slate-700 bg-slate-900/70 text-slate-300 hover:bg-slate-800/90'
        }`}
      >
        JA
      </button>
    </div>
  );
}

interface DesktopHomeProps {
  currentBackground: BackgroundConfig;
  onBackgroundChange: (bg: BackgroundConfig) => void;
  currentTheme: ThemeConfig;
  onThemeChange: (theme: ThemeConfig) => void;
  isEditMode?: boolean;
  onToggleEditMode?: () => void;
}

const TUTORIAL_MODE_STORAGE_KEY = 'steamzone_tutorial_mode';
const DESKTOP_CANVAS_MODE_KEY = 'steamzone_desktopCanvasMode';

function readDesktopCanvasModeFromStorage(): DesktopCanvasMode {
  if (typeof window === 'undefined') return 'preview';
  try {
    const v = window.localStorage.getItem(DESKTOP_CANVAS_MODE_KEY);
    if (v === 'preview' || v === 'edit') return v;
    if (v === 'blueprint') return 'preview';
  } catch {
    // ignore
  }
  return 'preview';
}
const TUTORIAL_STEPS = [
  { id: 'step-1', route: '/desktop', titleKey: 'desktop:tutorial.steps.step1' },
  { id: 'step-2', route: '/desktop', titleKey: 'desktop:tutorial.steps.step2' },
  { id: 'step-3', route: '/desktop', titleKey: 'desktop:tutorial.steps.step3' },
  { id: 'step-4', route: '/desktop/artwork-showcase', titleKey: 'desktop:tutorial.steps.step4' },
] as const;

export const TUTORIAL_SHOWCASE_ADDED_EVENT = 'zonehub:tutorial-showcase-added';

const DesktopHome: React.FC<DesktopHomeProps> = ({
  currentBackground,
  onBackgroundChange,
  currentTheme,
  onThemeChange,
  isEditMode = false,
  onToggleEditMode,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(true);
  const collapseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activePicker, setActivePicker] = useState<'background' | 'theme' | null>(null);
  const [customBgUrl, setCustomBgUrl] = useState('');
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const [showNewProjectConfirm, setShowNewProjectConfirm] = useState(false);
  const [tutorialMode, setTutorialMode] = useState(false);
  const [tutorialStepId, setTutorialStepId] = useState<string>('step-1');
  const [tutorialFeedback, setTutorialFeedback] = useState<string | null>(null);

  useEffect(() => {
    // Electron 桌面版不展示网站首页提示横幅
    try {
      localStorage.setItem('steamzone_showHeroBanner', JSON.stringify(false));
    } catch {
      // ignore
    }
  }, []);

  const [tutorialCompleted, setTutorialCompleted] = useState<string[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [desktopCanvasMode, setDesktopCanvasModeState] = useState<DesktopCanvasMode>(
    readDesktopCanvasModeFromStorage,
  );
  const setDesktopCanvasMode = useCallback((mode: DesktopCanvasMode) => {
    setDesktopCanvasModeState(mode);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(DESKTOP_CANVAS_MODE_KEY, desktopCanvasMode);
    } catch {
      // ignore quota / private mode
    }
  }, [desktopCanvasMode]);

  const desktopOutletContext = useMemo<DesktopOutletContext>(
    () => ({
      desktopCanvasMode,
      setDesktopCanvasMode,
    }),
    [desktopCanvasMode, setDesktopCanvasMode],
  );

  const resolveBgSrc = (image: string) => resolveRemoteAssetUrl(image);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tutorialQuery = params.get('tutorial') === '1';
    const stepQuery = params.get('step');
    const persistedMode = typeof window !== 'undefined' && localStorage.getItem(TUTORIAL_MODE_STORAGE_KEY) === '1';
    const loaded = loadTutorialOnboardingState(TUTORIAL_STEPS.map((step) => step.id));
    const fallbackStep = loaded?.activeStepId ?? TUTORIAL_STEPS[0].id;
    const nextStep =
      stepQuery && TUTORIAL_STEPS.some((step) => step.id === stepQuery) ? stepQuery : fallbackStep;

    const enabled = tutorialQuery || persistedMode;
    setTutorialMode(enabled);
    setTutorialStepId(nextStep);
    setTutorialCompleted(loaded?.completedStepIds ?? (enabled ? [] : []));
  }, [location.search]);


  useEffect(() => {
    return () => {
      if (collapseTimeoutRef.current) clearTimeout(collapseTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!activePicker) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!pickerRef.current) return;
      if (!pickerRef.current.contains(event.target as Node)) {
        setActivePicker(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [activePicker]);

  const handlePanelMouseEnter = useCallback(() => {
    if (collapseTimeoutRef.current) {
      clearTimeout(collapseTimeoutRef.current);
      collapseTimeoutRef.current = null;
    }
    setIsPanelCollapsed(false);
  }, []);
  const handlePanelMouseLeave = useCallback(() => {
    collapseTimeoutRef.current = setTimeout(() => setIsPanelCollapsed(true), 400);
  }, []);

  const desktopNavItems = [
    { labelKey: 'desktop:nav.home', path: '/desktop' },
    { labelKey: 'desktop:nav.artwork', path: '/desktop/artwork-showcase' },
    { labelKey: 'desktop:nav.guides', path: '/desktop/steam-guides' },
    { labelKey: 'desktop:nav.tutorial', path: '/desktop/how-to' },
  ];

  const handleBackgroundSelect = (background: BackgroundConfig) => {
    onBackgroundChange(background);
    setActivePicker(null);
    if (tutorialMode && tutorialStepId === 'step-3') {
      completeTutorialStepWithFeedback('step-3');
    }
  };

  const handleThemeSelect = (theme: ThemeConfig) => {
    onThemeChange(theme);
    setActivePicker(null);
    if (tutorialMode && tutorialStepId === 'step-3') {
      completeTutorialStepWithFeedback('step-3');
    }
  };

  const applyCustomBackground = () => {
    const raw = customBgUrl.trim();
    if (!raw) return;
    const lower = raw.toLowerCase();
    const allowed =
      lower.startsWith('https://') || lower.startsWith('blob:') || lower.startsWith('data:');
    if (!allowed) {
      window.alert('Only https, blob, and data URLs are allowed in offline mode.');
      return;
    }
    const isVideo = /\.(mp4|webm|ogg)(\?.*)?$/i.test(raw) || /^data:video\//i.test(raw);
    const next: BackgroundConfig = {
      image: resolveBgSrc(raw),
      alt: 'Custom Background',
      blur: currentBackground.blur ?? true,
      brightness: currentBackground.brightness ?? 100,
      overlay: currentBackground.overlay ?? true,
      isVideo,
      videoLoop: true,
      videoMuted: true,
      videoAutoplay: true,
      fitMode: currentBackground.fitMode ?? 'original',
    };
    onBackgroundChange(next);
    setActivePicker(null);
    if (tutorialMode && tutorialStepId === 'step-3') {
      completeTutorialStepWithFeedback('step-3');
    }
  };

  const executeNewDesktopProject = () => {
    trackMilestoneByEvent('desktop.new_canvas.clicked_first_time');
    // Electron 桌面壳下：确认后清空配置并重载，同时关闭首页首屏横幅
    // （避免重载后再次看到「开始体验」遮挡）。
    try {
      clearSteamThemeData();
      localStorage.setItem('steamzone_showHeroBanner', JSON.stringify(false));
    } catch {
      // ignore
    }
    window.location.reload();
  };

  const handleNewDesktopProject = () => {
    setShowNewProjectConfirm(true);
  };

  useEffect(() => {
    if (!showNewProjectConfirm) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowNewProjectConfirm(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showNewProjectConfirm]);

  const persistTutorialState = useCallback(
    (stepId: string, complete = false) => {
      const loaded = loadTutorialOnboardingState(TUTORIAL_STEPS.map((step) => step.id));
      const base: TutorialOnboardingState =
        loaded ?? {
          activeStepId: TUTORIAL_STEPS[0].id,
          completedStepIds: [],
          unlockedAchievementIds: [],
          updatedAt: Date.now(),
        };
      const next = complete
        ? markStepCompleted({ ...base, activeStepId: stepId }, stepId, TUTORIAL_STEPS.length)
        : { ...base, activeStepId: stepId, updatedAt: Date.now() };
      saveTutorialOnboardingState(next);
      setTutorialStepId(stepId);
      setTutorialCompleted(next.completedStepIds);
      const newlyCompleted = complete && !base.completedStepIds.includes(stepId);
      return { next, newlyCompleted };
    },
    []
  );

  const navigateWithTutorial = useCallback((route: string, stepId: string) => {
    try {
      localStorage.setItem(TUTORIAL_MODE_STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    setTutorialMode(true);
    navigate(`${route}?tutorial=1&step=${stepId}`);
  }, [navigate]);

  const completeTutorialStepWithFeedback = useCallback(
    (stepId: string) => {
      const { newlyCompleted } = persistTutorialState(stepId, true);
      if (!newlyCompleted) return;
      const step = TUTORIAL_STEPS.find((item) => item.id === stepId);
      if (!step) return;
      setTutorialFeedback(t('desktop:tutorial.feedback.completed', { step: t(step.titleKey) }));
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 900);
    },
    [persistTutorialState, t]
  );

  const handleNextTutorialStep = useCallback(() => {
    const currentIndex = TUTORIAL_STEPS.findIndex((step) => step.id === tutorialStepId);
    const nextIndex =
      currentIndex >= 0 && currentIndex < TUTORIAL_STEPS.length - 1 ? currentIndex + 1 : currentIndex;
    const nextStep = TUTORIAL_STEPS[Math.max(nextIndex, 0)];
    persistTutorialState(nextStep.id, false);
    navigateWithTutorial(nextStep.route, nextStep.id);
  }, [tutorialStepId, persistTutorialState, navigateWithTutorial]);

  useEffect(() => {
    if (!onToggleEditMode) return;
    const shouldEdit = desktopCanvasMode === 'edit';
    if (shouldEdit !== isEditMode) onToggleEditMode();
  }, [desktopCanvasMode, isEditMode, onToggleEditMode]);

  const handleCanvasModeChange = useCallback(
    (mode: DesktopCanvasMode) => {
      setDesktopCanvasMode(mode);
      if (mode === 'edit') {
        trackMilestoneByEvent('desktop.edit_mode_entered_first_time');
      }
      if (tutorialMode && tutorialStepId === 'step-1' && mode === 'edit') {
        completeTutorialStepWithFeedback('step-1');
      }
    },
    [setDesktopCanvasMode, tutorialMode, tutorialStepId, completeTutorialStepWithFeedback],
  );

  const handleExitTutorialMode = useCallback(() => {
    try {
      localStorage.removeItem(TUTORIAL_MODE_STORAGE_KEY);
    } catch {
      // ignore
    }
    setTutorialMode(false);
    navigate(location.pathname, { replace: true });
  }, [navigate, location.pathname]);

  const currentTutorialStep =
    TUTORIAL_STEPS.find((step) => step.id === tutorialStepId) ?? TUTORIAL_STEPS[0];
  const tutorialHintKey =
    tutorialStepId === 'step-1'
      ? 'desktop:tutorial.hints.step1'
      : tutorialStepId === 'step-2'
        ? 'desktop:tutorial.hints.step2'
        : tutorialStepId === 'step-3'
          ? 'desktop:tutorial.hints.step3'
          : tutorialStepId === 'step-4'
            ? 'desktop:tutorial.hints.step4'
            : null;
  const tutorialAutoDescriptionKey = `desktop:tutorial.autoDescriptions.${tutorialStepId.replace('-', '')}`;

  const tutorialProgressRatio = tutorialCompleted.length / TUTORIAL_STEPS.length;
  const tutorialProgressPercent = Math.min(100, Math.max(0, Math.round(tutorialProgressRatio * 100)));

  useEffect(() => {
    if (!tutorialMode) return;
    if (tutorialStepId === 'step-4' && location.pathname.startsWith('/desktop/artwork-showcase')) {
      completeTutorialStepWithFeedback('step-4');
    }
  }, [tutorialMode, tutorialStepId, location.pathname, completeTutorialStepWithFeedback]);

  useEffect(() => {
    if (!tutorialMode || tutorialStepId !== 'step-2') return;
    const onShowcaseAdded = () => completeTutorialStepWithFeedback('step-2');
    window.addEventListener(TUTORIAL_SHOWCASE_ADDED_EVENT, onShowcaseAdded);
    return () => window.removeEventListener(TUTORIAL_SHOWCASE_ADDED_EVENT, onShowcaseAdded);
  }, [tutorialMode, tutorialStepId, completeTutorialStepWithFeedback]);

  useEffect(() => {
    if (!tutorialFeedback) return;
    const timer = setTimeout(() => setTutorialFeedback(null), 2600);
    return () => clearTimeout(timer);
  }, [tutorialFeedback]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.18),_transparent_24%),linear-gradient(180deg,_#0a1018_0%,_#070b12_100%)] text-slate-50">
      <div className="flex min-h-0 flex-1 w-full">
        <aside
          className={`relative flex min-h-0 shrink-0 flex-col border-r border-slate-800/80 bg-slate-950/90 backdrop-blur-xl transition-all duration-300 ${
            isPanelCollapsed ? 'w-[92px]' : 'w-[340px]'
          }`}
          onMouseEnter={handlePanelMouseEnter}
          onMouseLeave={handlePanelMouseLeave}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-slate-800/80 px-4 py-4">
            {isPanelCollapsed ? (
              <div className="flex-1" />
            ) : (
              <button
                type="button"
                onClick={() => navigate('/desktop')}
                className="group flex items-center gap-3 rounded-lg px-1 py-0.5 text-left transition-colors hover:bg-slate-900/60"
              >
                <img src={toPublicAssetUrl('/images/logo.gif')} alt="ZoneHub" className="h-9 w-9 shrink-0 object-contain" />
                <div>
                  <div className="text-sm font-semibold tracking-wide text-slate-100 group-hover:text-emerald-200">
                    ZoneHub
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    {t('desktop:panel.desktopPanel')}
                  </div>
                </div>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsPanelCollapsed((prev) => !prev)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-300 transition-colors hover:border-emerald-400 hover:text-emerald-300"
            >
              {isPanelCollapsed ? '»' : '«'}
            </button>
          </div>

          <div
            className={`scrollbar-hide min-h-0 flex-1 ${
              isPanelCollapsed ? 'relative overflow-hidden' : 'overflow-y-auto px-3 py-4'
            }`}
          >
            {isPanelCollapsed ? (
              <div>
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `url('${toPublicAssetUrl('/images/electron/left-menu-background-dark.png')}')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                  }}
                >
                  <div className="absolute inset-0 bg-slate-950/35" />
                  <div className="relative z-10 flex h-full flex-col items-center justify-center px-2">
                    <span className="rounded-md border border-slate-400/35 bg-slate-950/45 px-2 py-1 text-[11px] tracking-[0.2em] text-slate-200">
                      {t('desktop:panel.moveToExpand')}
                    </span>
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center px-2">
                    <img
                      src={toPublicAssetUrl('/images/electron/Workshop_header.png')}
                      alt="Workshop"
                      className="h-auto w-full max-w-[56px] object-contain opacity-95"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-4">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {t('desktop:panel.language')}
                  </div>
                  <DesktopLanguageButtons />
                </section>

                <section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-4">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {t('desktop:panel.desktopNav')}
                  </div>
                  <div className="space-y-2">
                    {desktopNavItems.map((item) => {
                      const isActive =
                        item.path === '/desktop'
                          ? location.pathname === '/desktop'
                          : location.pathname.startsWith(item.path);

                      return (
                        <button
                          key={item.path}
                          type="button"
                          onClick={() => navigate(item.path)}
                          className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                            isActive
                              ? 'border-emerald-500/40 bg-emerald-500/12 text-emerald-200'
                              : 'border-slate-800 bg-slate-900/70 text-slate-300 hover:bg-slate-800/90'
                          }`}
                        >
                          {t(item.labelKey)}
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}
          </div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="shrink-0 border-b border-slate-800/80 bg-slate-950/35 px-6 py-4 backdrop-blur-xl">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <button
                  type="button"
                  onClick={() => navigate('/desktop')}
                  className="text-left text-2xl font-semibold tracking-tight text-slate-100 transition-colors hover:text-emerald-200"
                >
                  {t('desktop:header.title')}
                </button>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  {t('desktop:header.subtitle')}
                </p>
                {/* 整块（按钮 + 下拉）包在 ref 内，避免点击面板/Apply 时被当成“点击外部”收起 */}
                <div className="mt-4" ref={pickerRef}>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setActivePicker((prev) => (prev === 'background' ? null : 'background'))
                      }
                      className={`rounded-xl border px-4 py-2 text-sm transition-colors ${
                        activePicker === 'background'
                          ? 'border-emerald-500/40 bg-emerald-500/12 text-emerald-200'
                          : 'border-slate-700 bg-slate-900/60 text-slate-200 hover:border-slate-500'
                      } ${
                        tutorialMode && tutorialStepId === 'step-3'
                          ? 'ring-1 ring-violet-300/60 border-violet-300/70'
                          : ''
                      }`}
                    >
                      {t('desktop:actions.backgroundSettings')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePicker((prev) => (prev === 'theme' ? null : 'theme'))}
                      className={`rounded-xl border px-4 py-2 text-sm transition-colors ${
                        activePicker === 'theme'
                          ? 'border-emerald-500/40 bg-emerald-500/12 text-emerald-200'
                          : 'border-slate-700 bg-slate-900/60 text-slate-200 hover:border-slate-500'
                      }`}
                    >
                      {t('desktop:actions.profileTheme')}
                    </button>
                    <div className="inline-flex rounded-xl border border-slate-700 bg-slate-900/60 p-1">
                      {([
                        { id: 'preview', label: 'Preview' },
                        { id: 'edit', label: 'Edit' },
                      ] as const).map((mode) => (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => handleCanvasModeChange(mode.id)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                            desktopCanvasMode === mode.id
                              ? 'bg-emerald-500/25 text-emerald-100'
                              : 'text-slate-300 hover:bg-slate-800/90'
                          } ${
                            tutorialMode && tutorialStepId === 'step-1' && mode.id === 'edit'
                              ? 'ring-1 ring-violet-300/60'
                              : ''
                          }`}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {tutorialMode && tutorialHintKey && (
                    <div className="mt-2 inline-flex items-center rounded-lg border border-violet-400/40 bg-violet-500/20 px-3 py-1.5 text-xs text-violet-100">
                      {t(tutorialHintKey)}
                    </div>
                  )}
                {activePicker === 'background' && (
                  <div className="mt-4 max-w-4xl rounded-2xl border border-slate-800 bg-slate-950/95 p-4 shadow-2xl">
                    <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {t('desktop:actions.chooseBackground')}
                    </div>
                    <p className="mb-3 w-full min-w-0 text-[10px] leading-relaxed text-slate-500">
                      {t('theme:legalDisclaimer')}
                    </p>
                    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                      {backgroundPresets.map((bg) => {
                        const isActive = currentBackground.image === bg.image;
                        const previewSrc = resolveRemoteAssetUrl(bg.image);
                        return (
                          <button
                            key={bg.image}
                            type="button"
                            onClick={() => handleBackgroundSelect(bg)}
                            className={`overflow-hidden rounded-xl border text-left transition-colors ${
                              isActive
                                ? 'border-emerald-500/60 bg-emerald-500/8'
                                : 'border-slate-800 bg-slate-900/70 hover:border-slate-600'
                            }`}
                          >
                            <div className="h-24 w-full bg-slate-900">
                              {bg.isVideo ? (
                                <video
                                  src={previewSrc}
                                  className="h-full w-full object-cover"
                                  muted
                                  loop
                                  playsInline
                                />
                              ) : (
                                <img
                                  src={previewSrc}
                                  alt={bg.alt}
                                  className="h-full w-full object-cover"
                                />
                              )}
                            </div>
                            <div className="px-3 py-2">
                              <div className="truncate text-sm text-slate-100">{bg.alt}</div>
                              <div className="mt-1 text-[11px] text-slate-500">
                                {bg.isVideo ? 'Video background' : 'Image background'}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-4 border-t border-slate-800 pt-4">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {t('desktop:actions.customBackgroundUrl')}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          placeholder="https://… or data:…"
                          value={customBgUrl}
                          onChange={(e) => setCustomBgUrl(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && applyCustomBackground()}
                          className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={applyCustomBackground}
                          className="shrink-0 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-200 transition-colors hover:bg-emerald-500/25"
                        >
                          {t('desktop:actions.applyButton')}
                        </button>
                      </div>
                      <p className="mt-1.5 text-[11px] text-slate-500">
                        {t('desktop:actions.imageOrVideoUrl')}
                      </p>
                    </div>
                  </div>
                )}
                {activePicker === 'theme' && (
                  <div className="mt-4 max-w-4xl rounded-2xl border border-slate-800 bg-slate-950/95 p-4 shadow-2xl">
                    <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {t('desktop:actions.chooseProfileTheme')}
                    </div>
                    <p className="mb-3 w-full min-w-0 text-[10px] leading-relaxed text-slate-500">
                      {t('theme:legalDisclaimer')}
                    </p>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {themePresets.map((theme) => {
                        const isActive = currentTheme.id === theme.id;
                        return (
                          <button
                            key={theme.id}
                            type="button"
                            onClick={() => handleThemeSelect(theme)}
                            className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                              isActive
                                ? 'border-emerald-500/60 bg-emerald-500/8'
                                : 'border-slate-800 bg-slate-900/70 hover:border-slate-600'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-medium text-slate-100">{theme.name}</div>
                              {isActive && <div className="h-2 w-2 rounded-full bg-emerald-400" />}
                            </div>
                            <div className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-500">
                              {theme.description}
                            </div>
                            <div className="mt-3 flex gap-2">
                              <span
                                className="h-4 w-4 rounded border border-white/10"
                                style={{ backgroundColor: theme.colors.primary }}
                              />
                              <span
                                className="h-4 w-4 rounded border border-white/10"
                                style={{ backgroundColor: theme.colors.secondary }}
                              />
                              <span
                                className="h-4 w-4 rounded border border-white/10"
                                style={{ backgroundColor: theme.colors.dark }}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                </div>

              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleNewDesktopProject}
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400"
                >
                  {t('desktop:actions.newDesktopProject')}
                </button>
              </div>
            </div>
          </header>

          {tutorialMode && (
            <div className="shrink-0 border-b border-violet-500/30 bg-violet-500/15 px-6 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.18em] text-violet-200/95">{t('desktop:tutorial.mode')}</div>
                <div className="truncate text-sm text-violet-50">
                  {t('desktop:tutorial.currentStep')}：{t(currentTutorialStep.titleKey)}
                </div>
                <div className="mt-1 text-[11px] text-violet-200/90">
                  {t(tutorialAutoDescriptionKey)}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleNextTutorialStep}
                  className="rounded-lg border border-violet-300/50 bg-violet-500/20 px-3 py-1.5 text-xs font-medium text-violet-100 hover:bg-violet-500/30"
                >
                  {t('desktop:tutorial.nextStep')}
                </button>
                <button
                  type="button"
                  onClick={handleExitTutorialMode}
                  className="rounded-lg border border-slate-600 bg-slate-900/40 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-900/60"
                >
                  {t('desktop:tutorial.exitMode')}
                </button>
              </div>
              </div>
              <div className="mt-3 flex justify-center">
                <div className="w-full max-w-4xl">
                  <div className="flex items-center justify-between text-[11px] text-violet-200/90">
                    <span>{t('desktop:tutorial.progressLabel')}</span>
                    <span>
                      {tutorialCompleted.length}/{TUTORIAL_STEPS.length}
                    </span>
                  </div>
                  <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-violet-900/60">
                    <div
                      className="h-full bg-violet-300 transition-all duration-300"
                      style={{ width: `${tutorialProgressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          {tutorialMode && tutorialFeedback && (
            <div className="flex shrink-0 items-center border-b border-violet-400/30 bg-violet-500/20 px-6 py-2 text-xs text-violet-50">
              {tutorialFeedback}
            </div>
          )}
      {tutorialMode && showConfetti && (
        <div className="pointer-events-none fixed inset-0 z-[9999] flex items-start justify-center">
          <div className="mt-24 flex gap-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-3 w-3 rounded-full bg-violet-300 animate-bounce"
                style={{ animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>
        </div>
      )}

          <div className="min-h-0 flex-1 overflow-auto px-6 py-4 md:px-10">
            <div className="min-h-full w-full rounded-xl shadow-xl ring-1 ring-slate-800/60 transition-[box-shadow] duration-300">
              {/* 右侧网页区域改为原生响应式布局，不再整体 scale */}
              <div className="relative min-h-[720px] w-full bg-steam-background-color">
                <div className="absolute inset-0 overflow-hidden">
                  {currentBackground.isVideo ? (
                    <video
                      key={currentBackground.image}
                      src={resolveBgSrc(currentBackground.image)}
                      className={`block h-full w-full object-cover ${
                        currentBackground.blur ? 'blur-sm' : ''
                      }`}
                      style={{
                        filter: currentBackground.brightness
                          ? `brightness(${currentBackground.brightness}%)`
                          : undefined,
                        objectFit: (currentBackground.fitMode ?? 'original') === 'cover' ? 'cover' : 'none',
                        objectPosition: 'center top',
                      }}
                      loop
                      muted
                      autoPlay
                      playsInline
                    />
                  ) : (
                    <img
                      key={currentBackground.image}
                      src={resolveBgSrc(currentBackground.image)}
                      alt={currentBackground.alt}
                      className={`block h-full w-full object-cover ${
                        currentBackground.blur ? 'blur-sm' : ''
                      }`}
                      style={{
                        filter: currentBackground.brightness
                          ? `brightness(${currentBackground.brightness}%)`
                          : undefined,
                        objectFit: (currentBackground.fitMode ?? 'original') === 'cover' ? 'cover' : 'none',
                        objectPosition: 'center top',
                      }}
                    />
                  )}
                  {currentBackground.overlay && (
                    <div className="absolute inset-0 bg-steam-overlay" />
                  )}
                </div>
                <div className="relative z-10 min-h-full">
                  <Outlet context={desktopOutletContext} />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
      {showNewProjectConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setShowNewProjectConfirm(false)}
            aria-hidden="true"
          />
          <div className="relative mx-4 w-full max-w-md rounded-2xl border border-white/12 bg-slate-950/95 shadow-2xl">
            <div className="border-b border-white/10 px-5 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
                {t('desktop:newProjectConfirm.label')}
              </div>
              <h2 className="mt-1 text-base font-semibold text-white">
                {t('desktop:newProjectConfirm.title')}
              </h2>
            </div>
            <div className="space-y-4 px-5 py-4">
              <p className="text-sm leading-6 text-slate-300">
                {t('desktop:newProjectConfirm.description')}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewProjectConfirm(false)}
                  className="flex-1 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10"
                >
                  {t('desktop:newProjectConfirm.cancel')}
                </button>
                <button
                  type="button"
                  onClick={executeNewDesktopProject}
                  className="flex-1 rounded-lg border border-amber-500/50 bg-amber-500/15 px-4 py-2 text-sm font-semibold text-amber-100 transition-colors hover:bg-amber-500/25"
                >
                  {t('desktop:newProjectConfirm.confirm')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DesktopHome;

