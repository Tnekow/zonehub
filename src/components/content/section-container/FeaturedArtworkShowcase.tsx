import React from 'react';
import { useI18n } from '../../../hooks/useI18n';
import { useTitleBorder } from '../../../hooks/useTitleBorder';
import type { BackgroundConfig } from '../../../data/background';
import { resolveRemoteAssetUrl } from '../../../lib/remoteAssetUrl';
import useLocalStorage from '../../../hooks/useLocalStorage';
import SafeImage from '../../common/SafeImage';
import { fileToPersistentDataUrl } from '../../../lib/persistentImageDataUrl';

interface FeaturedArtworkShowcaseProps {
  className?: string;
  /** 组件唯一标识（用于 localStorage 存储） */
  componentId?: string;
  /** 初始图片 URL（可选） */
  initialImageUrl?: string;
  /** 上传完成回调（返回 object URL） */
  onImageChange?: (imageUrl: string | null, file?: File) => void;
  /** 编辑模式：为 true 时显示标题栏 */
  isEditMode?: boolean;
  /** 编辑模式下删除组件的回调 */
  onDelete?: () => void;
  /** 当前背景配置（用于模拟底层显示） */
  background?: BackgroundConfig;
  /**
   * 背景在页面中的"起始 top 偏移"（px）
   * 用于在默认切片生成时对齐 App 中背景从主体内容区开始的显示策略
   */
  backgroundTopOffsetPx?: number;
  /** 拖拽重排/落位后用于强制刷新背景切片 */
  refreshKey?: number;
}

interface FeaturedArtworkData {
  leftUrl: string | null;
  rightUrl: string | null;
  panoramaMode: boolean;
}

const LEFT_WIDTH = 506;
const HEIGHT = 824;
const RIGHT_WIDTH = 100;

const DEFAULT_FEATURED_ARTWORK_DATA: FeaturedArtworkData = {
  leftUrl: null,
  rightUrl: null,
  panoramaMode: true,
};

const FeaturedArtworkShowcase: React.FC<FeaturedArtworkShowcaseProps> = ({
  className = '',
  componentId,
  initialImageUrl,
  onImageChange,
  isEditMode = false,
  onDelete,
  background,
  backgroundTopOffsetPx = 0,
  refreshKey = 0,
}) => {
  const { t, i18n } = useI18n();
  const titleBorderStyle = useTitleBorder();

  // 使用 localStorage 持久化图片 URL 和设置（每个组件实例独立存储）
  const storageKey = componentId ? `steamzone_featuredArtwork_${componentId}` : 'steamzone_featuredArtwork_default';
  const [storedData, setStoredData] = useLocalStorage<FeaturedArtworkData>(
    storageKey,
    DEFAULT_FEATURED_ARTWORK_DATA,
  );

  // 上传过程中的临时预览（blob URL），持久化完成后清空
  const [previewLeftUrl, setPreviewLeftUrl] = React.useState<string | null>(null);
  const [previewRightUrl, setPreviewRightUrl] = React.useState<string | null>(null);

  const leftUrl = previewLeftUrl ?? storedData.leftUrl ?? initialImageUrl ?? null;
  const rightUrl = previewRightUrl ?? storedData.rightUrl ?? null;
  const panoramaMode = storedData.panoramaMode ?? true;

  const leftObjectUrlRef = React.useRef<string | null>(null);
  const rightObjectUrlRef = React.useRef<string | null>(null);

  // 默认背景切片缓存（位图）
  const [leftSliceUrl, setLeftSliceUrl] = React.useState<string | null>(null);
  const [rightSliceUrl, setRightSliceUrl] = React.useState<string | null>(null);
  const leftSliceObjectUrlRef = React.useRef<string | null>(null);
  const rightSliceObjectUrlRef = React.useRef<string | null>(null);

  // 控制是否在滚动时跟随背景实时重算切片（默认不跟随，避免滚动时位图“移动”）
  const sliceFollowScroll = false;

  const leftInputRef = React.useRef<HTMLInputElement | null>(null);
  const rightInputRef = React.useRef<HTMLInputElement | null>(null);

  const revokeObjectUrl = React.useCallback((ref: React.MutableRefObject<string | null>) => {
    if (ref.current && ref.current.startsWith('blob:')) {
      try { URL.revokeObjectURL(ref.current); } catch (error) { void error; }
      ref.current = null;
    }
  }, []);

  React.useEffect(() => {
    return () => {
      revokeObjectUrl(leftObjectUrlRef);
      revokeObjectUrl(rightObjectUrlRef);
    };
  }, [revokeObjectUrl]);

  const handleFileChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, side: 'left' | 'right') => {
      const file = e.target.files && e.target.files[0];
      if (!file) {
        if (side === 'left') {
          revokeObjectUrl(leftObjectUrlRef);
          setPreviewLeftUrl(null);
          // 恢复默认切片，清理旧缓存
          revokeObjectUrl(leftSliceObjectUrlRef);
          setLeftSliceUrl(null);
          // 更新存储：移除左侧图片
          setStoredData((prev) => ({ ...prev, leftUrl: null }));
        } else {
          revokeObjectUrl(rightObjectUrlRef);
          setPreviewRightUrl(null);
          revokeObjectUrl(rightSliceObjectUrlRef);
          setRightSliceUrl(null);
          // 更新存储：移除右侧图片
          setStoredData((prev) => ({ ...prev, rightUrl: null }));
        }
        if (onImageChange) onImageChange(null);
        return;
      }
      if (!file.type.startsWith('image/')) {
        alert('Only image files are allowed.');
        return;
      }
      if (side === 'left') {
        revokeObjectUrl(leftObjectUrlRef);
        const objectUrl = URL.createObjectURL(file);
        leftObjectUrlRef.current = objectUrl;
        setPreviewLeftUrl(objectUrl);
        revokeObjectUrl(leftSliceObjectUrlRef);
        setLeftSliceUrl(null);
        if (onImageChange) onImageChange(objectUrl, file);
        fileToPersistentDataUrl(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.78 })
          .then((dataUrl) => {
            setStoredData((prev) => ({ ...prev, leftUrl: dataUrl }));
            setPreviewLeftUrl(null);
            revokeObjectUrl(leftObjectUrlRef);
          })
          .catch((error) => {
            console.error(error);
            setPreviewLeftUrl(null);
            alert('Image processing failed.');
          });
      } else {
        revokeObjectUrl(rightObjectUrlRef);
        const objectUrl = URL.createObjectURL(file);
        rightObjectUrlRef.current = objectUrl;
        setPreviewRightUrl(objectUrl);
        revokeObjectUrl(rightSliceObjectUrlRef);
        setRightSliceUrl(null);
        if (onImageChange) onImageChange(objectUrl, file);
        fileToPersistentDataUrl(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.78 })
          .then((dataUrl) => {
            setStoredData((prev) => ({ ...prev, rightUrl: dataUrl }));
            setPreviewRightUrl(null);
            revokeObjectUrl(rightObjectUrlRef);
          })
          .catch((error) => {
            console.error(error);
            setPreviewRightUrl(null);
            alert('Image processing failed.');
          });
      }
    },
    [onImageChange, revokeObjectUrl, setStoredData]
  );

  const handleTriggerUpload = React.useCallback((side: 'left' | 'right') => {
    if (side === 'left') leftInputRef.current?.click();
    else rightInputRef.current?.click();
  }, []);

  const overlayLabel = i18n.language?.startsWith('zh')
    ? (t('navigation:editMode.upload') || '上传')
    : (t('navigation:editMode.upload') || 'Upload');

  const titleLabel = i18n.language?.startsWith('zh')
    ? (t('navigation:editMode.featuredArtworkShowcase') || '艺术展柜')
    : (t('navigation:editMode.featuredArtworkShowcase') || 'Artworkshowcase');

  // 图片展示策略：图片显示高度固定为824px，与Steam保持一致
  const IMAGE_DISPLAY_HEIGHT = 824;
  const imgStyleLeft: React.CSSProperties = { width: '100%', height: `${IMAGE_DISPLAY_HEIGHT}px`, objectFit: 'cover', objectPosition: 'center center' };
  const imgStyleRight: React.CSSProperties = { width: '100%', height: `${IMAGE_DISPLAY_HEIGHT}px`, objectFit: 'cover', objectPosition: 'center center' };

  // 透视策略：不设置任何背景，保持完全透明，让下方最底层元素直透显示
  const transparentStyle: React.CSSProperties = { background: 'transparent' };

  // ===== 模拟底层显示：固定+裁剪方案（不打洞） =====
  // 计算槽位在视口中的位置，用 clip-path 裁剪一个固定定位的媒体层
  const leftSlotRef = React.useRef<HTMLDivElement | null>(null);
  const rightSlotRef = React.useRef<HTMLDivElement | null>(null);

  const resolveBackgroundSrc = React.useCallback((bg?: BackgroundConfig): string | undefined => {
    if (!bg) return undefined;
    return resolveRemoteAssetUrl(bg.image);
  }, []);

  // 解析默认静态切片源（视频→推断 webp，否则用背景图）
  const resolveDefaultSliceSrc = React.useCallback((bg?: BackgroundConfig): string | undefined => {
    if (!bg) return undefined;
    try {
      const u = new URL(bg.image, window.location.origin);
      const pathname = u.pathname;
      if (bg.isVideo) {
        if (pathname.endsWith('.mp4') || pathname.endsWith('.webm')) {
          return pathname.replace(/\.(mp4|webm)$/i, '.webp');
        }
        return '/background/default.webp';
      }
    } catch (error) {
      void error;
    }
    return resolveBackgroundSrc(bg);
  }, [resolveBackgroundSrc]);

  // 将视口 cover 布局映射到槽位，裁剪位图并生成 blob URL
  const computeSlotSliceUrl = React.useCallback(async (
    img: HTMLImageElement,
    rect: DOMRect,
    vw: number,
    vh: number,
    brightness?: number,
    fitMode?: 'original' | 'cover',
  ): Promise<string | null> => {
    const bw = img.naturalWidth || 1;
    const bh = img.naturalHeight || 1;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = true;
    // @ts-expect-error imageSmoothingQuality is supported in modern browsers
    ctx.imageSmoothingQuality = 'high';
    if (brightness) {
      ctx.filter = `brightness(${brightness}%)`;
    }

    // 默认填充：使用当前主题 backgrounds.background；回退到 container/item，再回退到深色
    {
      const rootStyles = getComputedStyle(document.documentElement);
      const themeBackground = (rootStyles.getPropertyValue('--steam-background') || '').trim();
      const themeContainer = (rootStyles.getPropertyValue('--steam-container') || '').trim();
      const themeItem = (rootStyles.getPropertyValue('--steam-item') || '').trim();
      const fillColor = themeBackground || themeContainer || themeItem || 'rgba(8, 18, 34, 0.6)';
      ctx.save();
      ctx.filter = 'none';
      ctx.fillStyle = fillColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    if (fitMode === 'original') {
      // 原尺寸：不缩放背景，水平居中、垂直顶对齐
      const scale = 1;
      const offsetX = (vw - bw) / 2;
      const offsetY = 0;
      const srcX = (rect.left - offsetX) / scale;
      const srcY = (rect.top - offsetY) / scale;
      const srcW = rect.width / scale;
      const srcH = rect.height / scale;
      // 边界裁剪（保持 1:1，不把可见部分拉伸到整块）
      const clippedX = Math.max(0, Math.min(srcX, bw));
      const clippedY = Math.max(0, Math.min(srcY, bh));
      const clippedW = Math.max(0, Math.min(srcW, bw - clippedX));
      const clippedH = Math.max(0, Math.min(srcH, bh - clippedY));
      // 计算在槽位中的像素位置（当槽位越界到图片外时，使用偏移把图像放到正确位置）
      const xInside = rect.left - offsetX; // 相对于槽位左上角
      const yInside = rect.top - offsetY;
      const destX = xInside < 0 ? Math.round(-xInside * dpr) : 0;
      const destY = yInside < 0 ? Math.round(-yInside * dpr) : 0;
      const destW = Math.round(clippedW * dpr);
      const destH = Math.round(clippedH * dpr);
      if (clippedW > 0 && clippedH > 0) {
        ctx.drawImage(img, clippedX, clippedY, clippedW, clippedH, destX, destY, destW, destH);
      }
    } else {
      // cover：按视口等比放大到覆盖视口，居中后映射槽位
      const scale = Math.max(vw / bw, vh / bh);
      const scaledW = bw * scale;
      const scaledH = bh * scale;
      const offsetX = (vw - scaledW) / 2;
      const offsetY = (vh - scaledH) / 2;
      let srcX = (rect.left - offsetX) / scale;
      let srcY = (rect.top - offsetY) / scale;
      let srcW = rect.width / scale;
      let srcH = rect.height / scale;
      srcX = Math.max(0, Math.min(srcX, bw));
      srcY = Math.max(0, Math.min(srcY, bh));
      srcW = Math.max(1, Math.min(srcW, bw - srcX));
      srcH = Math.max(1, Math.min(srcH, bh - srcY));
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height);
    }

    const blob: Blob | null = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/webp', 0.95);
    });
    if (!blob) return null;
    return URL.createObjectURL(blob);
  }, []);

  // 计算并设置左右默认切片位图
  React.useEffect(() => {
    let disposed = false;
    const src = resolveDefaultSliceSrc(background);
    if (!src) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    const computeAll = async () => {
      try { await img.decode(); } catch (error) { void error; }
      const vw = window.innerWidth;
      const vh = Math.max(1, window.innerHeight - Math.max(0, backgroundTopOffsetPx));
      // 左侧：仅在未上传时生成
      if (!leftUrl && leftSlotRef.current) {
        const r = leftSlotRef.current.getBoundingClientRect();
        const rect = new DOMRect(r.x, r.y - Math.max(0, backgroundTopOffsetPx), r.width, r.height);
        const url = await computeSlotSliceUrl(img, rect, vw, vh, background?.brightness, background?.fitMode);
        if (!disposed && url) {
          revokeObjectUrl(leftSliceObjectUrlRef);
          leftSliceObjectUrlRef.current = url;
          setLeftSliceUrl(url);
        }
      } else {
        revokeObjectUrl(leftSliceObjectUrlRef);
        setLeftSliceUrl(null);
      }
      // 右侧：仅在未上传时生成
      if (!rightUrl && rightSlotRef.current) {
        const r = rightSlotRef.current.getBoundingClientRect();
        const rect = new DOMRect(r.x, r.y - Math.max(0, backgroundTopOffsetPx), r.width, r.height);
        const url = await computeSlotSliceUrl(img, rect, vw, vh, background?.brightness, background?.fitMode);
        if (!disposed && url) {
          revokeObjectUrl(rightSliceObjectUrlRef);
          rightSliceObjectUrlRef.current = url;
          setRightSliceUrl(url);
        }
      } else {
        revokeObjectUrl(rightSliceObjectUrlRef);
        setRightSliceUrl(null);
      }
    };
    // 监听滚动/缩放/位置变化，节流到 rAF
    let scheduled = false;
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(async () => {
        scheduled = false;
        await computeAll();
      });
    };
    const roLeft = new ResizeObserver(schedule);
    const roRight = new ResizeObserver(schedule);
    if (leftSlotRef.current) roLeft.observe(leftSlotRef.current);
    if (rightSlotRef.current) roRight.observe(rightSlotRef.current);
    if (sliceFollowScroll) {
      window.addEventListener('scroll', schedule, { passive: true });
    }
    window.addEventListener('resize', schedule);
    // 初次计算
    computeAll();
    return () => {
      disposed = true;
      roLeft.disconnect();
      roRight.disconnect();
      if (sliceFollowScroll) {
        window.removeEventListener('scroll', schedule);
      }
      window.removeEventListener('resize', schedule);
    };
  }, [background, leftUrl, rightUrl, computeSlotSliceUrl, resolveDefaultSliceSrc, sliceFollowScroll, backgroundTopOffsetPx, refreshKey]);

  return (
    <div className={`w-full flex flex-col ${className}`}>
      <div 
        className="bg-steam-title px-4 py-2 cursor-move"
        style={{
          ...titleBorderStyle,
          // 非编辑模式不占位，避免额外顶部空隙
          display: isEditMode ? 'block' : 'none'
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-steam-textPrimary text-base font-semibold">{titleLabel}</h2>
          <div className="flex items-center gap-3 text-steam-textPrimary text-xs">
            <label className="inline-flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={panoramaMode}
                onChange={(e) => {
                  const newValue = e.target.checked;
                  setStoredData((prev) => ({ ...prev, panoramaMode: newValue }));
                }}
              />
              <span>{i18n.language?.startsWith('zh') ? '全景模式' : 'Panorama'}</span>
            </label>
            {isEditMode && onDelete && (
              <button
                onClick={onDelete}
                className="w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold transition-colors shrink-0"
                title={i18n.language?.startsWith('zh') ? '删除组件' : 'Delete component'}
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-steam-container p-3 border border-steam-border mt-0">
        <div className="flex" style={{ height: HEIGHT, gap: 5 }}>
          {/* 左侧槽位：506 x 824 */}
          <div ref={leftSlotRef} className="relative group" style={{ width: LEFT_WIDTH, height: HEIGHT, overflow: 'hidden', boxShadow: 'inset 0 0 0 1px var(--steam-item)', isolation: 'isolate' }}>
            {/* 默认内容：未上传时显示缓存位图；未就绪时回退到 FixedSlice */}
            {!leftUrl && leftSliceUrl && (
              <SafeImage
                src={leftSliceUrl}
                alt="Left default slice"
                className="block"
                style={imgStyleLeft}
                draggable={false}
              />
            )}
            {!leftUrl && !leftSliceUrl && (
              <div className="absolute inset-0" style={{ backgroundColor: 'var(--steam-background, #1b2838)' }} />
            )}
            {/* 注意：不在模拟层叠加 overlay，避免主题色覆盖真实背景 */}
            <div className="w-full h-full flex items-center justify-center" style={transparentStyle}>
              {leftUrl && (
                <SafeImage
                  src={leftUrl}
                  alt="Left artwork"
                  className="block"
                  style={imgStyleLeft}
                  draggable={false}
                />
              )}
            </div>
            <button
              type="button"
              onClick={() => handleTriggerUpload('left')}
              className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              title={overlayLabel}
              aria-label={overlayLabel}
              style={{ zIndex: 50 }}
            >
              <span className="px-4 py-2 bg-black/60 rounded text-sm">{overlayLabel}</span>
            </button>
            <input
              ref={leftInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'left')}
              className="hidden"
            />
          </div>

          {/* 右侧槽位：100 x 824 */}
          <div ref={rightSlotRef} className="relative group" style={{ width: RIGHT_WIDTH, height: HEIGHT, overflow: 'hidden', boxShadow: 'inset 0 0 0 1px var(--steam-item)', isolation: 'isolate' }}>
            {/* 默认内容：未上传时显示缓存位图；未就绪时回退到 FixedSlice */}
            {!rightUrl && rightSliceUrl && (
              <SafeImage
                src={rightSliceUrl}
                alt="Right default slice"
                className="block"
                style={imgStyleRight}
                draggable={false}
              />
            )}
            {!rightUrl && !rightSliceUrl && (
              <div className="absolute inset-0" style={{ backgroundColor: 'var(--steam-background, #1b2838)' }} />
            )}
            {/* 注意：不在模拟层叠加 overlay，避免主题色覆盖真实背景 */}
            <div className="w-full h-full flex items-center justify-center" style={transparentStyle}>
              {rightUrl && (
                <SafeImage
                  src={rightUrl}
                  alt="Right artwork"
                  className="block"
                  style={imgStyleRight}
                  draggable={false}
                />
              )}
            </div>
            <button
              type="button"
              onClick={() => handleTriggerUpload('right')}
              className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              title={overlayLabel}
              aria-label={overlayLabel}
              style={{ zIndex: 50 }}
            >
              <span className="px-4 py-2 bg-black/60 rounded text-sm">{overlayLabel}</span>
            </button>
            <input
              ref={rightInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'right')}
              className="hidden"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeaturedArtworkShowcase;