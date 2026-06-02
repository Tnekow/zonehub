import { useState, useRef, useEffect } from 'react';
import type { BackgroundConfig } from '../../data/background';
import { backgroundPresets } from '../../data/background';
import type { ThemeConfig } from '../../data/theme';
import { themePresets, applyCustomCSS } from '../../data/theme';
import { Cog6ToothIcon, SwatchIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { useI18n } from '../../hooks/useI18n';
import useLocalStorage from '../../hooks/useLocalStorage';
import { track } from '../../lib/analytics';
import { resolveRemoteAssetUrl } from '../../lib/remoteAssetUrl';

interface ThemeSelectorProps {
  currentBackground: BackgroundConfig;
  onBackgroundChange: (background: BackgroundConfig) => void;
  currentTheme: ThemeConfig;
  onThemeChange: (theme: ThemeConfig) => void;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  currentBackground,
  onBackgroundChange,
  currentTheme,
  onThemeChange,
}) => {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'background' | 'theme'>('background');
  const [customCSS, setCustomCSS] = useState('');
  const [customBackground, setCustomBackground] = useLocalStorage<BackgroundConfig>('steamzone_customBackground', {
    image: '',
    alt: 'Custom Background',
    blur: true,
    brightness: 100,
    overlay: true,
    isVideo: false,
    videoLoop: true,
    videoMuted: true,
    videoAutoplay: true,
    fitMode: 'original',
  });
  const [customUrl, setCustomUrl] = useState(() => customBackground.image || '');
  const urlInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isAllowedCustomBackgroundUrl = (raw: string) => {
    const lower = raw.toLowerCase();
    return lower.startsWith('https://') || lower.startsWith('blob:') || lower.startsWith('data:');
  };

  // 点击面板外部自动收回
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // 允许桌面壳通过自定义事件直接打开指定标签页，避免重复造一套设置 UI。
  useEffect(() => {
    const handleOpenRequest = (event: Event) => {
      const customEvent = event as CustomEvent<{ tab?: 'background' | 'theme' }>;
      const nextTab = customEvent.detail?.tab;
      if (nextTab === 'background' || nextTab === 'theme') {
        setActiveTab(nextTab);
      }
      setIsOpen(true);
    };

    window.addEventListener('steamzone:openThemeSettings', handleOpenRequest as EventListener);
    return () => {
      window.removeEventListener('steamzone:openThemeSettings', handleOpenRequest as EventListener);
    };
  }, []);

  const handleBackgroundSelect = (background: BackgroundConfig) => {
    onBackgroundChange(background);
  };

  const handleThemeSelect = (theme: ThemeConfig) => {
    onThemeChange(theme);
  };

  const handleCustomCSSChange = (css: string) => {
    setCustomCSS(css);
    applyCustomCSS(css);
  };

  // 如果当前背景是自定义且尚未写入缓存，则将其写入缓存并填充输入预览
  useEffect(() => {
    const presetImages = new Set(backgroundPresets.map(b => b.image));
    const isCustomSelected = !presetImages.has(currentBackground.image);
    if (isCustomSelected && !customBackground.image) {
      setCustomBackground({ ...currentBackground });
      setCustomUrl(currentBackground.image);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBackground.image]);

  return (
    <div className="fixed top-24 right-4 z-50 md:top-20" ref={containerRef}>
      {/* 主题设置按钮 + tooltip */}
      <div className="relative group/tip">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-steam-card backdrop-blur-steam-card border border-white/10 rounded-lg p-3 hover:bg-steam-secondary-border transition-colors"
          aria-label={t('theme:themeSettings')}
        >
          <Cog6ToothIcon className="w-6 h-6 text-white" />
        </button>
        {!isOpen && (
          <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-black/90 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1.5 rounded-md whitespace-nowrap opacity-0 scale-95 group-hover/tip:opacity-100 group-hover/tip:scale-100 transition-all duration-200 pointer-events-none shadow-lg border border-white/10">
            {t('theme:themeSettings')}
          </span>
        )}
      </div>

      {/* 主题选择面板 — right-16 避免与右侧按钮列重叠 */}
      {isOpen && (
        <div className="absolute top-0 right-16 bg-steam-card backdrop-blur-steam-card border border-white/10 rounded-lg p-4 min-w-80 max-w-96 shadow-xl max-h-[80vh] overflow-y-auto">
          {/* 标签页切换 */}
          <div className="flex mb-4 border-b border-white/10">
            <button
              onClick={() => setActiveTab('background')}
              className={`flex items-center px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === 'background'
                  ? 'text-steam-primary border-b-2 border-steam-primary'
                  : 'text-steam-textMuted hover:text-steam-textPrimary'
              }`}
            >
              <PhotoIcon className="w-4 h-4 mr-2" />
              {t('theme:backgroundTab')}
            </button>
            <button
              onClick={() => setActiveTab('theme')}
              className={`flex items-center px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === 'theme'
                  ? 'text-steam-primary border-b-2 border-steam-primary'
                  : 'text-steam-textMuted hover:text-steam-textPrimary'
              }`}
            >
              <SwatchIcon className="w-4 h-4 mr-2" />
              {t('theme:themeTab')}
            </button>
          </div>

          {/* 背景设置标签 */}
          {activeTab === 'background' && (
            <div>
              <h3 className="text-white font-semibold mb-1.5">{t('theme:selectBackground')}</h3>
              <p className="mb-3 w-full min-w-0 text-[10px] leading-relaxed text-steam-textMuted/80">
                {t('theme:legalDisclaimer')}
              </p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {backgroundPresets.map((bg, index) => (
                  <button
                    key={index}
                    onClick={() => handleBackgroundSelect(bg)}
                    className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                      currentBackground.image === bg.image
                        ? 'border-steam-primary'
                        : 'border-transparent hover:border-white/20'
                    }`}
                  >
                    {bg.isVideo ? (
                      <video
                        src={bg.image}
                        className="w-full h-20 object-cover"
                        muted
                        loop
                        playsInline
                      />
                    ) : (
                      <img
                        src={bg.image}
                        alt={bg.alt}
                        className="w-full h-20 object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                      <span className="text-white text-xs font-medium px-2 py-1 bg-black bg-opacity-50 rounded">
                        {bg.alt}
                        {bg.isVideo && (
                          <span className="ml-1 text-blue-300">{t('theme:videoIndicator')}</span>
                        )}
                      </span>
                    </div>
                  </button>
                ))}

                {/* 自定义背景卡片 */}
                {(() => {
                  const presetImages = new Set(backgroundPresets.map(b => b.image));
                  const isCustomSelected = !presetImages.has(currentBackground.image);
                  const customPreviewRaw = customUrl || customBackground.image || (isCustomSelected ? currentBackground.image : '');
                  const customPreviewUrl = resolveRemoteAssetUrl(customPreviewRaw);
                  const isVideoPreview = (() => {
                    if (!customPreviewUrl) return false;
                    try {
                      const path = new URL(customPreviewUrl).pathname.toLowerCase();
                      return /(\.mp4|\.webm|\.ogg)$/.test(path);
                    } catch {
                      const lower = customPreviewUrl.toLowerCase();
                      return /(\.mp4|\.webm|\.ogg)(\?.*)?$/.test(lower) || lower.startsWith('blob:') || /^data:video\//.test(lower);
                    }
                  })();

                  return (
                    <button
                      onClick={() => {
                        const raw = customUrl.trim();
                        if (!raw) {
                          // 若无输入但已有缓存的自定义背景，则直接应用缓存
                          if (customBackground.image) {
                            const next = {
                              ...customBackground,
                              fitMode: currentBackground.fitMode ?? customBackground.fitMode ?? 'original',
                            };
                            handleBackgroundSelect(next);
                            setCustomUrl(customBackground.image);
                            try {
                              track('custom_bg_applied', {
                                source: 'card_click',
                                isVideo: Boolean(next.isVideo),
                                fitMode: next.fitMode ?? 'original',
                                blur: Boolean(next.blur),
                                brightness: Number(next.brightness ?? 100),
                              });
                            } catch (error) {
                              void error;
                            }
                          } else {
                            urlInputRef.current?.focus();
                          }
                          return;
                        }
                        if (!isAllowedCustomBackgroundUrl(raw)) {
                          window.alert('Only https, blob, and data URLs are allowed in offline mode.');
                          return;
                        }
                        let isVideo = false;
                        try {
                          const path = new URL(raw).pathname.toLowerCase();
                          isVideo = /(\.mp4|\.webm|\.ogg)$/.test(path);
                        } catch {
                          const lower = raw.toLowerCase();
                          isVideo = /(\.mp4|\.webm|\.ogg)(\?.*)?$/.test(lower) || lower.startsWith('blob:') || /^data:video\//.test(lower);
                        }
                        const next = {
                          image: resolveRemoteAssetUrl(raw),
                          alt: 'Custom Background',
                          blur: (currentBackground.blur ?? customBackground.blur) ?? true,
                          brightness: (currentBackground.brightness ?? customBackground.brightness) ?? 50,
                          overlay: (currentBackground.overlay ?? customBackground.overlay) ?? true,
                          isVideo,
                          videoLoop: true,
                          videoMuted: true,
                          videoAutoplay: true,
                          fitMode: currentBackground.fitMode ?? customBackground.fitMode ?? 'original',
                        } as BackgroundConfig;
                        handleBackgroundSelect(next);
                        setCustomBackground(next);
                        try {
                          track('custom_bg_applied', {
                            source: 'card_click_with_input',
                            isVideo: Boolean(next.isVideo),
                            fitMode: next.fitMode ?? 'original',
                            blur: Boolean(next.blur),
                            brightness: Number(next.brightness ?? 100),
                          });
                        } catch (error) {
                          void error;
                        }
                      }}
                      className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                        isCustomSelected ? 'border-steam-primary' : 'border-transparent hover:border-white/20'
                      }`}
                    >
                      {customPreviewUrl ? (
                        isVideoPreview ? (
                          <video src={customPreviewUrl} className="w-full h-20 object-cover" muted loop playsInline />
                        ) : (
                          <img src={customPreviewUrl} alt="Custom Background" className="w-full h-20 object-cover" />
                        )
                      ) : (
                        <div className="w-full h-20 flex items-center justify-center bg-steam-border">
                          <PhotoIcon className="w-6 h-6 text-steam-textMuted" />
                        </div>
                      )}
                      {isCustomSelected && (
                        <div className="absolute top-1 right-1 w-2 h-2 bg-steam-primary rounded-full"></div>
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                        <span className="text-white text-xs font-medium px-2 py-1 bg-black bg-opacity-50 rounded">
                          {t('theme:customBackground')}
                          {customPreviewUrl && isVideoPreview && (
                            <span className="ml-1 text-blue-300">{t('theme:videoIndicator')}</span>
                          )}
                        </span>
                      </div>
                    </button>
                  );
                })()}
              </div>
              
              {/* 自定义背景输入 */}
              <div className="pt-4 border-t border-white/10">
                <h4 className="text-white text-sm font-medium mb-2">{t('theme:customBackground')}</h4>
                <input
                  type="url"
                  placeholder={t('theme:customBackgroundPlaceholder')}
                  className="w-full bg-steam-border text-steam-textPrimary border border-steam-secondary-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-steam-primary"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  ref={urlInputRef}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const raw = e.currentTarget.value.trim();
                      if (raw) {
                        if (!isAllowedCustomBackgroundUrl(raw)) {
                          window.alert('Only https, blob, and data URLs are allowed in offline mode.');
                          return;
                        }
                        let isVideo = false;
                        try {
                          const path = new URL(raw).pathname.toLowerCase();
                          isVideo = /(\.mp4|\.webm|\.ogg)$/.test(path);
                        } catch {
                          const lower = raw.toLowerCase();
                          // 兼容带查询参数的链接、blob/data URL
                          isVideo = /(\.mp4|\.webm|\.ogg)(\?.*)?$/.test(lower) || lower.startsWith('blob:') || /^data:video\//.test(lower);
                        }
                        const next = {
                          image: resolveRemoteAssetUrl(raw),
                          alt: 'Custom Background',
                          blur: (currentBackground.blur ?? customBackground.blur) ?? true,
                          brightness: (currentBackground.brightness ?? customBackground.brightness) ?? 50,
                          overlay: (currentBackground.overlay ?? customBackground.overlay) ?? true,
                          isVideo,
                          videoLoop: true,
                          videoMuted: true,
                          videoAutoplay: true,
                          fitMode: currentBackground.fitMode ?? customBackground.fitMode ?? 'original',
                        } as BackgroundConfig;
                        handleBackgroundSelect(next);
                        setCustomBackground(next);
                        // 保留输入值以便修改预览
                        setCustomUrl(raw);
                        try {
                          track('custom_bg_applied', {
                            source: 'url_enter',
                            isVideo: Boolean(next.isVideo),
                            fitMode: next.fitMode ?? 'original',
                            blur: Boolean(next.blur),
                            brightness: Number(next.brightness ?? 100),
                          });
                        } catch (error) {
                          void error;
                        }
                      }
                    }
                  }}
                />
                <p className="text-steam-textMuted text-xs mt-1">
                  {t('theme:supportedFormats')}
                </p>

                {/* 自适应全屏开关 */}
                <div className="mt-3 flex items-center justify-between">
                  <label className="text-white text-sm" htmlFor="fitModeSwitch">
                    {t('theme:fitToScreen')}
                  </label>
                  <input
                    id="fitModeSwitch"
                    type="checkbox"
                    checked={(currentBackground.fitMode ?? 'original') === 'cover'}
                    onChange={(e) => {
                      const nextMode: BackgroundConfig['fitMode'] = e.target.checked ? 'cover' : 'original';
                      onBackgroundChange({ ...currentBackground, fitMode: nextMode });
                      try {
                        track('fitmode_changed', { mode: nextMode });
                      } catch (error) {
                        void error;
                      }
                    }}
                    className="w-5 h-5 accent-steam-primary cursor-pointer"
                  />
                </div>

                {/* 自定义背景选项分区标题与提示，仅在自定义选中时显示 */}
                {(() => {
                  const presetImages = new Set(backgroundPresets.map(b => b.image));
                  const isCustomSelected = !presetImages.has(currentBackground.image);
                  if (!isCustomSelected) return null;
                  return (
                    <div className="mt-4">
                      <h4 className="text-white text-sm font-medium mb-1">{t('theme:customBackgroundOptions')}</h4>
                      <p className="text-steam-textMuted text-xs mb-2">{t('theme:customOnlyHint')}</p>
                    </div>
                  );
                })()}

                {/* 亮度调节，仅对自定义背景生效 */}
                {(() => {
                  const presetImages = new Set(backgroundPresets.map(b => b.image));
                  const isCustomSelected = !presetImages.has(currentBackground.image);
                  if (!isCustomSelected) return null;
                  return (
                    <div className="mt-3">
                      <label className="text-white text-sm mb-1 block" htmlFor="brightnessRange">
                        {t('theme:brightness')} ({currentBackground.brightness ?? 100}%)
                      </label>
                      <input
                        id="brightnessRange"
                        type="range"
                        min={10}
                        max={200}
                        step={5}
                        value={currentBackground.brightness ?? 100}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const next = { ...currentBackground, brightness: val } as BackgroundConfig;
                          onBackgroundChange(next);
                          setCustomBackground(next);
                        }}
                        className="w-full"
                      />
                    </div>
                  );
                })()}

                {/* 模糊开关，仅对自定义背景生效 */}
                {(() => {
                  const presetImages = new Set(backgroundPresets.map(b => b.image));
                  const isCustomSelected = !presetImages.has(currentBackground.image);
                  if (!isCustomSelected) return null;
                  return (
                    <div className="mt-3 flex items-center justify-between">
                      <label className="text-white text-sm" htmlFor="blurSwitch">
                        {t('theme:blur')}
                      </label>
                      <input
                        id="blurSwitch"
                        type="checkbox"
                        checked={Boolean(currentBackground.blur)}
                        onChange={(e) => {
                          const next = { ...currentBackground, blur: e.target.checked } as BackgroundConfig;
                          onBackgroundChange(next);
                          setCustomBackground(next);
                        }}
                        className="w-5 h-5 accent-steam-primary cursor-pointer"
                      />
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Steam主题标签 */}
          {activeTab === 'theme' && (
            <div>
              <h3 className="text-white font-semibold mb-1.5">{t('theme:selectCSSTheme')}</h3>
              <p className="mb-3 w-full min-w-0 text-[10px] leading-relaxed text-steam-textMuted/80">
                {t('theme:legalDisclaimer')}
              </p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {themePresets.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => handleThemeSelect(theme)}
                    className={`relative rounded-lg overflow-hidden border-2 transition-all p-3 text-left ${
                      currentTheme.id === theme.id
                        ? 'border-steam-primary'
                        : 'border-transparent hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white text-sm font-medium">{theme.name}</span>
                      {currentTheme.id === theme.id && (
                        <div className="w-2 h-2 bg-steam-primary rounded-full"></div>
                      )}
                    </div>
                    <p className="text-steam-textMuted text-xs">{theme.description}</p>
                    {/* 主题预览色块 */}
                    <div className="flex mt-2 space-x-1">
                      <div 
                        className="w-4 h-4 rounded border border-white/20"
                        style={{ backgroundColor: theme.colors.primary }}
                      ></div>
                      <div 
                        className="w-4 h-4 rounded border border-white/20"
                        style={{ backgroundColor: theme.colors.secondary }}
                      ></div>
                      <div 
                        className="w-4 h-4 rounded border border-white/20"
                        style={{ backgroundColor: theme.colors.dark }}
                      ></div>
                    </div>
                  </button>
                ))}
              </div>
              
              {/* 自定义CSS输入 */}
              <div className="pt-4 border-t border-white/10">
                <h4 className="text-white text-sm font-medium mb-2">{t('theme:customCSS')}</h4>
                <textarea
                  placeholder={t('theme:customCSSPlaceholder')}
                  value={customCSS}
                  onChange={(e) => handleCustomCSSChange(e.target.value)}
                  className="w-full bg-steam-border text-steam-light border border-steam-secondary-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-steam-primary resize-none"
                  rows={4}
                />
                <p className="text-steam-textMuted text-xs mt-1">
                  {t('theme:customCSSDescription')}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ThemeSelector;
