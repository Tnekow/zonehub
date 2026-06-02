import React, { useEffect, useMemo, useRef, useState } from 'react'
import { saveAs } from 'file-saver'
import { createPortal } from 'react-dom'
import { GIFEncoder, quantize, applyPalette } from 'gifenc'
import SectionContainer from '../../common/SectionContainer'
import useLocalStorage from '../../../hooks/useLocalStorage'
import { useI18n } from '../../../hooks/useI18n'
import { fixGifEndingByteBytes } from '../../../lib/videoToGif/gifHexFixer'
import { loadFFmpeg } from '../../../lib/videoToGif/videoToGifFfmpeg'
import { decodeGifSourceToFrames } from '../../../lib/videoToGif/gifFrameDecoder'

type RecordStyle = 'vinyl' | 'vinyl2' | 'vinyl3' | 'vinyl4' | 'vinyl5' | 'record3' | 'tape1'
type StyleLibraryCategory = 'record' | 'tape'

interface CollectedGuideShowcaseProps {
  /** Component instance id (used for persistence) */
  componentId: string
  className?: string
  // 拖拽相关props
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDragEnter?: (e: React.DragEvent) => void
  onDragLeave?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  // 编辑模式相关props
  isEditMode?: boolean
  onDelete?: () => void
  isDragging?: boolean
  isDragOver?: boolean
}

type CollectedGuideData = {
  title: string
  creatorName: string
  /** @deprecated legacy persisted field; migrated to creatorName */
  creator?: string
  content: string
  coverUrl: string | null
  coverMediaType?: 'static' | 'gif'
  coverMimeType?: string
  coverFileSize?: number
  coverGifMeta?: {
    frameCount: number
    durationMs: number
    width: number
    height: number
  }
  style: RecordStyle
  gifFps: number
  rotationSeconds: number
}

type RawGifProgress = {
  percentage: number
  message: string
}

type RawGifOptions = {
  width: number
  height: number
  frameRate: number
  frameCount: number
  maxColors?: number
  alphaThreshold?: number
  ditherMode?: string
  statsMode?: string
}

type RawGifResult = {
  success: boolean
  gifBlob?: Blob
  error?: string
}

/**
 * 本地 fallback 编码器：用于当前页面缺失 FFmpeg raw-frame 导出函数时，
 * 仍然支持收藏指南唱片 GIF 导出，避免模块加载失败导致组件不可用。
 */
const convertRawRgbaFramesToGifWithFFmpeg = async (
  getFrameRgba: (frameIndex: number) => Promise<Uint8Array>,
  options: RawGifOptions,
  onProgress?: (progress: RawGifProgress) => void
): Promise<RawGifResult> => {
  try {
    const gif = GIFEncoder({ auto: false })
    gif.writeHeader()

    const frameDelay = Math.max(10, Math.round(1000 / Math.max(1, options.frameRate)))
    let palette: number[][] | null = null
    let transparentIndex = -1

    for (let i = 0; i < options.frameCount; i += 1) {
      const rgba = await getFrameRgba(i)
      if (!palette) {
        palette = quantize(rgba, options.maxColors ?? 128, {
          format: 'rgba4444',
          oneBitAlpha: true,
          clearAlpha: true,
          clearAlphaThreshold: 128,
          clearAlphaColor: 0,
        })
        transparentIndex = palette.findIndex((p) => p.length >= 4 && p[3] === 0)
      }

      const index = applyPalette(rgba, palette, 'rgba4444')
      gif.writeFrame(index, options.width, options.height, {
        palette,
        first: i === 0,
        delay: frameDelay,
        dispose: 2,
        repeat: 0,
        transparent: transparentIndex >= 0,
        transparentIndex: transparentIndex >= 0 ? transparentIndex : 0,
      })

      if (onProgress) {
        onProgress({
          percentage: Math.round(((i + 1) / options.frameCount) * 100),
          message: `Encoding GIF... ${i + 1}/${options.frameCount}`,
        })
      }
    }

    gif.finish()
    const bytes = gif.bytes()
    return {
      success: true,
      gifBlob: new Blob([bytes], { type: 'image/gif' }),
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'GIF encoding failed.',
    }
  }
}

const DEFAULT_DATA: CollectedGuideData = {
  title: 'Blue.',
  creatorName: 'SteamZone',
  content: '「SteamZone // 像隔着一片海，此时的晚风是否也吹向了你？」',
  coverUrl: null,
  coverMediaType: 'static',
  style: 'vinyl',
  gifFps: 8,
  rotationSeconds: 8,
}

// 预览的 CSS 动画 `.record-spin` 默认 8s/圈（见 src/index.css），导出 GIF 必须与之完全一致
const RECORD_DEFAULT_ROTATION_SECONDS = 8
const RECORD_ROTATION_SECONDS_OPTIONS = [4, 6, 8, 10, 12, 16] as const

const getRotationSpeedLabel = (seconds: number, isZh: boolean) => {
  switch (seconds) {
    case 4:
      return isZh ? '很快' : 'Very Fast'
    case 6:
      return isZh ? '较快' : 'Fast'
    case 8:
      return isZh ? '标准' : 'Normal'
    case 10:
      return isZh ? '较慢' : 'Slow'
    case 12:
      return isZh ? '很慢' : 'Very Slow'
    case 16:
      return isZh ? '极慢' : 'Ultra Slow'
    default:
      return isZh ? '标准' : 'Normal'
  }
}
// 导出基准边长（正方形）；唱片 6 使用略大尺寸以匹配预览体量
const RECORD_SIZE = 195
const RECORD3_EXPORT_SIZE = 220
const TAPE_EXPORT_WIDTH = 256
const TAPE_EXPORT_HEIGHT = 160
const RECORD_TEXTURE_SRC = '/images/record.png'
const RECORD2_FRAME_SRC = '/images/record_2.gif'
const RECORD3_FRAME_SRC = '/images/record3.png'
const TAPE_FRAME_SRC = '/images/tape1.png'
const RECORD_GIF_MAX_BYTES = 2 * 1024 * 1024
const GIF_UPLOAD_MAX_BYTES = Math.round(2.5 * 1024 * 1024)
const RECORD_DEFAULT_FPS = 8
const RECORD_FPS_OPTIONS = [8, 10, 12, 15, 20, 24] as const
const RECORD_STYLE_OPTIONS: RecordStyle[] = ['vinyl', 'vinyl2', 'vinyl3', 'vinyl4', 'vinyl5', 'record3']
const TAPE_STYLE_OPTIONS: RecordStyle[] = ['tape1']
// record3 模板透明连通域分析（796×706）：
// - 外部透明背景（触边）
// - 中间透明圆孔 bbox=(170,125)-(625,580)，中心=(397.5,352.5)，直径约 456px
// - scripts/analyze-record3-gif.mjs：与透明相邻的近白不透明像素约 1k+（素材边缘抗锯齿/浅色晕边）
const RECORD3_HOLE_WIDTH_RATIO = 456 / 796
const RECORD3_HOLE_HEIGHT_RATIO = 456 / 706
const RECORD3_HOLE_CENTER_X_RATIO = 397.5 / 796
/** Canvas 在 fitted frame 高度上归一化孔心 y；方形容器 CSS 的 top% 须用 RECORD3_HOLE_CENTER_SQUARE_RATIO */
const RECORD3_HOLE_CENTER_Y_RATIO = 352.5 / 706
/** 方形容器 + object-contain（宽贴齐）时，孔心在容器内的 left/top 比例相同，均为 397.5/796 */
const RECORD3_HOLE_CENTER_SQUARE_RATIO = 397.5 / 796
// 轻微放大封面区域，覆盖透明孔边缘的抗锯齿像素，避免出现“孔边没盖满”的视觉缝隙
const RECORD3_COVER_SCALE = 1.06
/** 孔直径占方形容器边长的比例（宽/高 CSS 百分比相同，与 Canvas 的 min(宽比,高比)×scale 一致） */
const RECORD3_HOLE_DIAMETER_SQUARE_RATIO = RECORD3_HOLE_WIDTH_RATIO * RECORD3_COVER_SCALE
// tape1 复测参数（800x500 源图）：左(232,226) 右(573,226) 半径45
const TAPE_LEFT_REEL_X_RATIO = 232 / 800
const TAPE_RIGHT_REEL_X_RATIO = 573 / 800
const TAPE_REEL_Y_RATIO = 226 / 500
const TAPE_REEL_DIAMETER_RATIO = 90 / 800
// 中间透明区（主连通域）复测 bbox: x=38..757, y=32..367
const TAPE_LABEL_X_RATIO = 38 / 800
const TAPE_LABEL_Y_RATIO = 32 / 500
const TAPE_LABEL_WIDTH_RATIO = 720 / 800
const TAPE_LABEL_HEIGHT_RATIO = 336 / 500

const PREVIEW_TAPE_W = 160
const PREVIEW_TAPE_H = 100
const PREVIEW_TAPE_LABEL_X = 7.6
const PREVIEW_TAPE_LABEL_Y = 6.4
const PREVIEW_TAPE_LABEL_W = 144
const PREVIEW_TAPE_LABEL_H = 67.2
const PREVIEW_TAPE_LABEL_RADIUS = 4
const PREVIEW_TAPE_LEFT_HOLE_X = 46.4
const PREVIEW_TAPE_RIGHT_HOLE_X = 114.6
const PREVIEW_TAPE_HOLE_Y = 45.2
const PREVIEW_TAPE_HOLE_R = 9

const MODAL_TAPE_W = 256
const MODAL_TAPE_H = 160
const MODAL_TAPE_LABEL_X = 12.16
const MODAL_TAPE_LABEL_Y = 10.24
const MODAL_TAPE_LABEL_W = 230.4
const MODAL_TAPE_LABEL_H = 107.52
const MODAL_TAPE_LABEL_RADIUS = 6
const MODAL_TAPE_LEFT_HOLE_X = 74.24
const MODAL_TAPE_RIGHT_HOLE_X = 183.36
const MODAL_TAPE_HOLE_Y = 72.32
const MODAL_TAPE_HOLE_R = 14.4

const resolveRecordLabel = (style: RecordStyle, isZh: boolean) => {
  switch (style) {
    case 'vinyl':
      return isZh ? '唱片' : 'Record'
    case 'vinyl2':
      return isZh ? '唱片2' : 'Record 2'
    case 'vinyl3':
      return isZh ? '唱片3' : 'Record 3'
    case 'vinyl4':
      return isZh ? '唱片4' : 'Record 4'
    case 'vinyl5':
      return isZh ? '唱片5' : 'Record 5'
    case 'record3':
      return isZh ? '唱片6' : 'Record 6'
    case 'tape1':
      return isZh ? '磁带1' : 'Tape 1'
    default:
      return isZh ? '唱片' : 'Record'
  }
}

const resolveRecordColors = (style: RecordStyle) => {
  if (style === 'vinyl') {
    return {
      base: '#0f0f0f',
      ring: '#1f1f1f',
      highlight: 'rgba(255,255,255,0.12)',
      label: '#1b3b52',
    }
  }
  if (style === 'vinyl2') {
    return {
      base: '#0e0e0e',
      ring: 'rgba(0,0,0,0.25)',
      highlight: 'rgba(255,255,255,0.14)',
      label: '#000000',
    }
  }
  if (style === 'vinyl3') {
    return {
      base: '#1a1a1a',
      ring: '#2b2b2b',
      highlight: 'rgba(255,255,255,0.12)',
      label: '#000000',
    }
  }
  if (style === 'vinyl4') {
    // 更偏真实黑胶的质感（用于唱片从封套露出的一小部分）
    return {
      base: '#121212',
      ring: 'rgba(255,255,255,0.06)',
      highlight: 'rgba(255,255,255,0.10)',
      label: '#0b0b0b',
    }
  }
  if (style === 'vinyl5') {
    // 唱片5：record_2.gif 透明框 + 底层用户图片，仅用于占位
    return {
      base: '#1a1a1a',
      ring: '#2b2b2b',
      highlight: 'rgba(255,255,255,0.12)',
      label: '#000000',
    }
  }
  if (style === 'record3') {
    return {
      base: '#151515',
      ring: '#2b2b2b',
      highlight: 'rgba(255,255,255,0.12)',
      label: '#000000',
    }
  }
  if (style === 'tape1') {
    return {
      base: '#121212',
      ring: '#2b2b2b',
      highlight: 'rgba(255,255,255,0.12)',
      label: '#000000',
    }
  }
  return {
    base: '#0f0f0f',
    ring: '#1f1f1f',
    highlight: 'rgba(255,255,255,0.12)',
    label: '#1b3b52',
  }
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Image load failed.'))
    img.src = src
  })

type CoverImageSource = HTMLImageElement | HTMLCanvasElement

type CoverRenderAdapter = {
  getFrameAtTime: (timeMs: number) => CoverImageSource | null
}

const getCoverImageSize = (image: CoverImageSource) => {
  if (image instanceof HTMLImageElement) {
    return {
      width: image.naturalWidth || image.width || 1,
      height: image.naturalHeight || image.height || 1,
    }
  }
  return {
    width: image.width || 1,
    height: image.height || 1,
  }
}

export default function CollectedGuideShowcase(props: CollectedGuideShowcaseProps) {
  const { t, i18n } = useI18n()
  const {
    componentId,
    className,
    draggable,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDragEnter,
    onDragLeave,
    onDrop,
    isEditMode = false,
    onDelete,
    isDragging,
    isDragOver,
  } = props

  const storageKey = `steamzone_collectedGuide_${componentId}`
  const [data, setData] = useLocalStorage<CollectedGuideData>(storageKey, DEFAULT_DATA)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isFfmpegLoading, setIsFfmpegLoading] = useState(false)
  const [isFfmpegReady, setIsFfmpegReady] = useState(false)
  const [generateStatusText, setGenerateStatusText] = useState('')
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [styleLibraryCategory, setStyleLibraryCategory] = useState<StyleLibraryCategory>('record')
  const uploadRef = useRef<HTMLInputElement | null>(null)
  const creatorName = data.creatorName ?? 'SteamZone'
  const selectedRotationSeconds = Number(data.rotationSeconds)
  const rotationSeconds =
    Number.isFinite(selectedRotationSeconds) &&
    RECORD_ROTATION_SECONDS_OPTIONS.includes(selectedRotationSeconds as (typeof RECORD_ROTATION_SECONDS_OPTIONS)[number])
      ? selectedRotationSeconds
      : RECORD_DEFAULT_ROTATION_SECONDS
  const recordSpinStyle = useMemo<React.CSSProperties>(
    () => ({ animationDuration: `${rotationSeconds}s` }),
    [rotationSeconds]
  )
  const mergeRecordSpinStyle = (style?: React.CSSProperties): React.CSSProperties => ({
    ...(style ?? {}),
    ...recordSpinStyle,
  })

  // Steam 指南编辑器会折叠普通空格，导致“播放器文本”对齐/换行异常；
  // 使用全角空格（U+3000）与 Braille blank（U+2800）做占位，可显著提升对齐稳定性。
  const STEAM_IDEO_SPACE = '\u3000'
  const STEAM_BRAILLE_BLANK = '\u2800'
  const STEAM_PLAYER_PROGRESS_LINE = '─────────────────⚪️─────────────────────────────'
  const STEAM_PLAYER_CONTROL_LINE =
    `I◄◄  ▐▐  ►►I    ───○     ${STEAM_IDEO_SPACE}${STEAM_IDEO_SPACE}00:01 / 02:35 ${STEAM_IDEO_SPACE}${STEAM_IDEO_SPACE}     ⚙️ ❐ ⥂${STEAM_BRAILLE_BLANK}${STEAM_IDEO_SPACE}${STEAM_IDEO_SPACE}ᴴᴰ ⚙️ ❐⊏⊐`

  const titleLabel = useMemo(() => {
    if (i18n.language?.startsWith('zh')) return '收藏的指南'
    return t('navigation:editMode.collectedGuideShowcase') || 'Collected Guides'
  }, [i18n.language, t])
  const isZh = Boolean(i18n.language?.startsWith('zh'))
  const uiText = useMemo(() => ({
    currentTemplatePreview: isZh ? '当前模板预览' : 'CURRENT TEMPLATE PREVIEW',
    recordLibrary: isZh ? '唱片样式库' : 'Record Library',
    totalStyles: isZh ? `共 ${RECORD_STYLE_OPTIONS.length} 款` : `${RECORD_STYLE_OPTIONS.length} styles`,
    tapeLibrary: isZh ? '磁带样式库' : 'Tape Library',
    tapeTotalStyles: isZh ? `共 ${TAPE_STYLE_OPTIONS.length} 款` : `${TAPE_STYLE_OPTIONS.length} style`,
    tapeTemplateDesc: isZh ? '双转轮反向旋转，支持上传封面贴纸。' : 'Dual reels rotate in opposite directions with custom cover sticker.',
    trackTitle: isZh ? '标题' : 'TRACK TITLE',
    artist: isZh ? '创建者' : 'ARTIST',
    lyrics: isZh ? '歌词' : 'LYRICS',
    advancedExport: isZh ? '高级导出' : 'Advanced Export',
    gifFps: isZh ? '导出帧率' : 'GIF FPS',
    gifFpsDefault: isZh ? `默认帧率：${RECORD_DEFAULT_FPS}` : `Default FPS: ${RECORD_DEFAULT_FPS}`,
    gifFpsUsingDefault: isZh ? `使用默认帧率（${RECORD_DEFAULT_FPS}）` : `Using default FPS (${RECORD_DEFAULT_FPS}).`,
    gifFpsCurrent: (fps: number) => isZh ? `当前帧率：${fps}` : `Current FPS: ${fps}.`,
    gifFpsHint: isZh ? '更高的 FPS 会让动画更流畅，但文件也会更大。' : 'Higher FPS gives smoother motion but larger file size.',
    rotationSpeed: isZh ? '转速' : 'ROTATION SPEED',
    rotationDefault: isZh ? `使用默认转速：${getRotationSpeedLabel(RECORD_DEFAULT_ROTATION_SECONDS, true)}` : `Using default rotation speed: ${getRotationSpeedLabel(RECORD_DEFAULT_ROTATION_SECONDS, false)}.`,
    rotationCurrent: (seconds: number) => isZh ? `当前转速：${getRotationSpeedLabel(seconds, true)}` : `Current rotation speed: ${getRotationSpeedLabel(seconds, false)}.`,
    rotationHint: isZh ? '越靠前转得越快，越靠后转得越慢。' : 'Earlier options spin faster, later options spin slower.',
    uploadCover: isZh ? '上传封面' : 'Upload Cover',
    generating: isZh ? '生成中...' : 'Generating...',
    preloadingCore: isZh ? '正在预加载核心...' : 'Preloading core...',
    downloadRecord: isZh ? '下载专属唱片' : 'Download Record',
    copied: isZh ? '已复制' : 'Copied',
    copyLyrics: isZh ? '一键复制歌词（指南内容）' : 'Copy Lyrics (Guide Content)',
  }), [isZh])

  const editTitleLabel = useMemo(() => {
    if (i18n.language?.startsWith('zh')) return '收藏的指南-唱片'
    return `${titleLabel} - Record`
  }, [i18n.language, titleLabel])

  const overlayLabel = useMemo(() => {
    if (i18n.language?.startsWith('zh')) return '可编辑'
    return 'Editable'
  }, [i18n.language])

  useEffect(() => {
    if (
      data.creatorName === undefined ||
      data.gifFps === undefined ||
      data.rotationSeconds === undefined ||
      data.coverMediaType === undefined
    ) {
      const fallbackName = typeof data.creator === 'string'
        ? data.creator.replace(/^(创建者|Creator)\s*-\s*/, '')
        : 'SteamZone'
      const fallbackFps = Number(data.gifFps)
      const fallbackRotationSeconds = Number(data.rotationSeconds)
      const inferredMimeType =
        typeof data.coverMimeType === 'string' && data.coverMimeType
          ? data.coverMimeType
          : typeof data.coverUrl === 'string' && data.coverUrl.startsWith('data:image/gif')
            ? 'image/gif'
            : ''
      const inferredMediaType: 'static' | 'gif' =
        data.coverMediaType === 'gif' || inferredMimeType === 'image/gif'
          ? 'gif'
          : 'static'
      const legacyGifMeta = data.coverGifMeta
      setData({
        title: data.title,
        creatorName: fallbackName || 'SteamZone',
        content: data.content,
        coverUrl: data.coverUrl,
        coverMediaType: inferredMediaType,
        coverMimeType: inferredMimeType,
        coverFileSize: Number.isFinite(Number(data.coverFileSize))
          ? Number(data.coverFileSize)
          : undefined,
        coverGifMeta:
          inferredMediaType === 'gif' &&
          legacyGifMeta &&
          Number.isFinite(Number(legacyGifMeta.frameCount)) &&
          Number.isFinite(Number(legacyGifMeta.durationMs)) &&
          Number.isFinite(Number(legacyGifMeta.width)) &&
          Number.isFinite(Number(legacyGifMeta.height))
            ? {
              frameCount: Number(legacyGifMeta.frameCount),
              durationMs: Number(legacyGifMeta.durationMs),
              width: Number(legacyGifMeta.width),
              height: Number(legacyGifMeta.height),
            }
            : undefined,
        style: data.style,
        gifFps:
          Number.isFinite(fallbackFps) && RECORD_FPS_OPTIONS.includes(fallbackFps as (typeof RECORD_FPS_OPTIONS)[number])
            ? fallbackFps
            : RECORD_DEFAULT_FPS,
        rotationSeconds:
          Number.isFinite(fallbackRotationSeconds) &&
          RECORD_ROTATION_SECONDS_OPTIONS.includes(fallbackRotationSeconds as (typeof RECORD_ROTATION_SECONDS_OPTIONS)[number])
            ? fallbackRotationSeconds
            : RECORD_DEFAULT_ROTATION_SECONDS,
      })
    }
  }, [data, setData])

  useEffect(() => {
    if (!isModalOpen || isFfmpegReady || isFfmpegLoading) return

    let cancelled = false
    setIsFfmpegLoading(true)
    setGenerateStatusText('Loading FFmpeg core...')

    loadFFmpeg((message) => {
      if (!cancelled) {
        setGenerateStatusText(message)
      }
    })
      .then(() => {
        if (!cancelled) {
          setIsFfmpegReady(true)
          setGenerateStatusText('FFmpeg is ready.')
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error(error)
          setGenerateStatusText('FFmpeg preload failed. GIF export will retry on demand.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsFfmpegLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [isModalOpen, isFfmpegReady])

  const handlePickFile = () => uploadRef.current?.click()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Only image files are allowed.')
      return
    }
    const isGif = file.type === 'image/gif'
    if (isGif && file.size > GIF_UPLOAD_MAX_BYTES) {
      alert('GIF file size must be 2.5 MB or less.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null
      setData((prev) => ({
        ...prev,
        coverUrl: result,
        coverMediaType: isGif ? 'gif' : 'static',
        coverMimeType: file.type,
        coverFileSize: file.size,
        coverGifMeta: undefined,
      }))
    }
    reader.readAsDataURL(file)
  }

  const buildPlayerCopyText = () => {
    return [
      data.content,
      STEAM_PLAYER_PROGRESS_LINE,
      STEAM_PLAYER_CONTROL_LINE,
    ].join('\n')
  }

  const handleCopyPlayerText = async () => {
    const text = buildPlayerCopyText()
    const showCopied = () => {
      setCopyFeedback(true)
      const t = setTimeout(() => setCopyFeedback(false), 1800)
      return () => clearTimeout(t)
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        showCopied()
        return
      }
    } catch {
      // Clipboard API unavailable; fall back to execCommand below.
    }
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    try {
      document.execCommand('copy')
      showCopied()
    } catch {
      // execCommand copy failed; user can copy manually.
    }
    document.body.removeChild(textarea)
  }

  const renderTapeCoverMask = (
    width: number,
    height: number,
    coverUrl: string | null,
    labelX: number,
    labelY: number,
    labelW: number,
    labelH: number,
    labelRadius: number,
    leftHoleX: number,
    rightHoleX: number,
    holeY: number,
    holeR: number,
    maskId: string
  ) => {
    if (!coverUrl) return null
    return (
      <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse">
            <rect x="0" y="0" width={width} height={height} fill="black" />
            <rect x={labelX} y={labelY} width={labelW} height={labelH} rx={labelRadius} ry={labelRadius} fill="white" />
            <circle cx={leftHoleX} cy={holeY} r={holeR} fill="black" />
            <circle cx={rightHoleX} cy={holeY} r={holeR} fill="black" />
          </mask>
        </defs>
        <image
          href={coverUrl}
          x={labelX}
          y={labelY}
          width={labelW}
          height={labelH}
          preserveAspectRatio="xMidYMid slice"
          mask={`url(#${maskId})`}
        />
      </svg>
    )
  }

  const renderTapeFrameMask = (
    width: number,
    height: number,
    leftHoleX: number,
    rightHoleX: number,
    holeY: number,
    holeR: number,
    maskId: string
  ) => {
    return (
      <svg className="absolute inset-0 h-full w-full pointer-events-none" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse">
            <rect x="0" y="0" width={width} height={height} fill="white" />
            <circle cx={leftHoleX} cy={holeY} r={holeR} fill="black" />
            <circle cx={rightHoleX} cy={holeY} r={holeR} fill="black" />
          </mask>
        </defs>
        <image
          href={TAPE_FRAME_SRC}
          x="0"
          y="0"
          width={width}
          height={height}
          preserveAspectRatio="xMidYMid meet"
          mask={`url(#${maskId})`}
        />
      </svg>
    )
  }

  const renderTapeReelOverlay = (
    width: number,
    height: number,
    leftHoleX: number,
    rightHoleX: number,
    holeY: number,
    holeR: number,
    rotationDurationSeconds: number,
    overlayKey: string
  ) => {
    const tickCount = 12
    const ringRadius = holeR * 1.12
    const ringStroke = Math.max(1, holeR * 0.18)
    const tickInner = holeR * 1.04
    const tickOuter = holeR * 1.32
    const tickStroke = Math.max(0.8, holeR * 0.08)

    const renderTicks = (cx: number, cy: number) =>
      Array.from({ length: tickCount }).map((_, index) => {
        const angle = (index / tickCount) * Math.PI * 2
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        return (
          <line
            key={`${overlayKey}-${cx}-${index}`}
            x1={cx + cos * tickInner}
            y1={cy + sin * tickInner}
            x2={cx + cos * tickOuter}
            y2={cy + sin * tickOuter}
            stroke="rgba(230,236,244,0.85)"
            strokeWidth={tickStroke}
            strokeLinecap="round"
          />
        )
      })

    return (
      <svg className="absolute inset-0 h-full w-full pointer-events-none" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        <g
          className="record-spin motion-reduce:animate-none"
          style={{ transformOrigin: `${leftHoleX}px ${holeY}px`, animationDuration: `${rotationDurationSeconds}s` }}
        >
          <circle cx={leftHoleX} cy={holeY} r={ringRadius} fill="none" stroke="rgba(230,236,244,0.7)" strokeWidth={ringStroke} />
          {renderTicks(leftHoleX, holeY)}
        </g>
        <g
          className="record-spin motion-reduce:animate-none"
          style={{
            transformOrigin: `${rightHoleX}px ${holeY}px`,
            animationDuration: `${rotationDurationSeconds}s`,
            animationDirection: 'reverse',
          }}
        >
          <circle cx={rightHoleX} cy={holeY} r={ringRadius} fill="none" stroke="rgba(230,236,244,0.7)" strokeWidth={ringStroke} />
          {renderTicks(rightHoleX, holeY)}
        </g>
      </svg>
    )
  }

  const drawRecordFrame = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    angle: number,
    style: RecordStyle,
    image?: CoverImageSource | null,
    recordTexture?: HTMLImageElement | null,
    record2Frame?: HTMLImageElement | null,
    tapeFrame?: HTMLImageElement | null
  ) => {
    const size = Math.min(width, height)
    const { base, ring, highlight, label } = resolveRecordColors(style)
    const center = size / 2
    const outerRadius = size * 0.48
    const imageRadius = size * 0.42
    const labelRadius = size * 0.16
    const holeRadius = size * 0.03

    // 透明背景：不填充底色，让未绘制区域保持 alpha=0
    ctx.clearRect(0, 0, width, height)

    if (style === 'tape1') {
      const frame = tapeFrame
      const frameRatio = 800 / 500
      let frameW = width
      let frameH = height
      if (width / height > frameRatio) {
        frameW = height * frameRatio
      } else {
        frameH = width / frameRatio
      }
      const frameX = (width - frameW) / 2
      const frameY = (height - frameH) / 2

      const labelX = frameX + frameW * TAPE_LABEL_X_RATIO
      const labelY = frameY + frameH * TAPE_LABEL_Y_RATIO
      const labelW = frameW * TAPE_LABEL_WIDTH_RATIO
      const labelH = frameH * TAPE_LABEL_HEIGHT_RATIO
      const labelRadius = Math.max(2, frameH * 0.03)

      const reelRadius = (frameW * TAPE_REEL_DIAMETER_RATIO) / 2
      const leftCx = frameX + frameW * TAPE_LEFT_REEL_X_RATIO
      const rightCx = frameX + frameW * TAPE_RIGHT_REEL_X_RATIO
      const reelCy = frameY + frameH * TAPE_REEL_Y_RATIO

      if (image) {
        ctx.save()
        ctx.beginPath()
        ctx.moveTo(labelX + labelRadius, labelY)
        ctx.lineTo(labelX + labelW - labelRadius, labelY)
        ctx.quadraticCurveTo(labelX + labelW, labelY, labelX + labelW, labelY + labelRadius)
        ctx.lineTo(labelX + labelW, labelY + labelH - labelRadius)
        ctx.quadraticCurveTo(labelX + labelW, labelY + labelH, labelX + labelW - labelRadius, labelY + labelH)
        ctx.lineTo(labelX + labelRadius, labelY + labelH)
        ctx.quadraticCurveTo(labelX, labelY + labelH, labelX, labelY + labelH - labelRadius)
        ctx.lineTo(labelX, labelY + labelRadius)
        ctx.quadraticCurveTo(labelX, labelY, labelX + labelRadius, labelY)
        ctx.closePath()
        ctx.arc(leftCx, reelCy, reelRadius, 0, Math.PI * 2, true)
        ctx.arc(rightCx, reelCy, reelRadius, 0, Math.PI * 2, true)
        ctx.clip('evenodd')

        const { width: iw, height: ih } = getCoverImageSize(image)
        const imgRatio = iw / ih
        const boxRatio = labelW / labelH
        let drawW = labelW
        let drawH = labelH
        if (imgRatio > boxRatio) {
          drawH = labelH
          drawW = drawH * imgRatio
        } else {
          drawW = labelW
          drawH = drawW / imgRatio
        }
        const dx = labelX - (drawW - labelW) / 2
        const dy = labelY - (drawH - labelH) / 2
        ctx.drawImage(image, dx, dy, drawW, drawH)
        ctx.restore()
      }

      if (frame) {
        ctx.drawImage(frame, frameX, frameY, frameW, frameH)
      }
      const drawTapeReelOverlay = (cx: number, cy: number, reelAngle: number) => {
        const tickCount = 12
        const ringRadius = reelRadius * 1.12
        const ringStroke = Math.max(1, reelRadius * 0.18)
        const tickInner = reelRadius * 1.04
        const tickOuter = reelRadius * 1.32
        const tickStroke = Math.max(0.8, reelRadius * 0.08)

        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(reelAngle)
        ctx.strokeStyle = 'rgba(230,236,244,0.75)'
        ctx.lineWidth = ringStroke
        ctx.beginPath()
        ctx.arc(0, 0, ringRadius, 0, Math.PI * 2)
        ctx.stroke()

        ctx.strokeStyle = 'rgba(230,236,244,0.85)'
        ctx.lineWidth = tickStroke
        for (let i = 0; i < tickCount; i += 1) {
          const a = (i / tickCount) * Math.PI * 2
          const cos = Math.cos(a)
          const sin = Math.sin(a)
          ctx.beginPath()
          ctx.moveTo(cos * tickInner, sin * tickInner)
          ctx.lineTo(cos * tickOuter, sin * tickOuter)
          ctx.stroke()
        }
        ctx.restore()
      }
      drawTapeReelOverlay(leftCx, reelCy, angle)
      drawTapeReelOverlay(rightCx, reelCy, -angle)
      // 两个孔洞保持透明，且不被用户上传图片覆盖
      ctx.save()
      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath()
      ctx.arc(leftCx, reelCy, reelRadius, 0, Math.PI * 2)
      ctx.arc(rightCx, reelCy, reelRadius, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      return
    }

    if (style === 'vinyl3') {
      /**
       * 目标：让导出 GIF 与前端预览完全一致。
       * 前端预览结构（160×160 容器）：
       * - 底层：160×160 圆形唱片，整体旋转 8s 一圈
       * - 唱片纹理：inset 0 0 0 5px rgba(255,255,255,0.05)
       * - 高光：radial-gradient(circle at 35% 30%, rgba(255,255,255,0.18), transparent 55%)
       * - 细环：inset 12% / 24% / 36% 的 1px 白色边框（alpha 0.05）
       * - 上层：左侧 80×160 封面（1px 边框，img object-fit: cover）
       */
      const radius = size * 0.5
      const scaleFromPreview = size / 160 // 预览基准为 160
      const fineBorderPx = 1 * scaleFromPreview // 预览 1px

      // 绘制整张黑胶唱片（旋转）
      ctx.save()
      ctx.translate(center, center)
      ctx.rotate(angle)

      // 只显示贴图（不叠加任何高光/细环/内阴影）
      if (recordTexture) {
        ctx.save()
        ctx.beginPath()
        ctx.arc(0, 0, radius, 0, Math.PI * 2)
        ctx.closePath()
        ctx.clip()
        ctx.drawImage(recordTexture, -radius, -radius, radius * 2, radius * 2)
        ctx.restore()
      } else {
        // 兜底：无贴图时仍画一个基础底色
        ctx.beginPath()
        ctx.arc(0, 0, radius, 0, Math.PI * 2)
        ctx.closePath()
        ctx.fillStyle = base
        ctx.fill()
      }

      ctx.restore()

      // 左侧封面矩形，完全遮住圆的左半（与 80×160 预览结构对应）
      const coverWidth = size * 0.5
      const coverHeight = size
      const coverX = 0
      const coverY = 0
      const coverBorderPx = fineBorderPx // 预览为 1px 边框

      // 阴影（轻量模拟 tailwind 的 shadow），避免过重
      ctx.save()
      ctx.shadowColor = 'rgba(0,0,0,0.25)'
      ctx.shadowBlur = 6 * scaleFromPreview
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 2 * scaleFromPreview

      // 背景（bg-white/90）
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.fillRect(coverX, coverY, coverWidth, coverHeight)
      ctx.restore()

      // 图片（在边框内区域做 object-fit: cover）
      if (image) {
        const innerX = coverX + coverBorderPx
        const innerY = coverY + coverBorderPx
        const innerW = coverWidth - coverBorderPx * 2
        const innerH = coverHeight - coverBorderPx * 2

        // 模拟 object-fit: cover，保证图片不被拉伸
        const { width: iw, height: ih } = getCoverImageSize(image)
        const imgRatio = iw / ih
        const boxRatio = innerW / innerH

        let drawW: number
        let drawH: number
        if (imgRatio > boxRatio) {
          // 图片更宽：以高度为基准，左右裁剪
          drawH = innerH
          drawW = drawH * imgRatio
        } else {
          // 图片更高：以宽度为基准，上下裁剪
          drawW = innerW
          drawH = drawW / imgRatio
        }

        const dx = innerX - (drawW - innerW) / 2
        const dy = innerY - (drawH - innerH) / 2

        // 只绘制到 inner 区域（避免盖到边框）
        ctx.save()
        ctx.beginPath()
        ctx.rect(innerX, innerY, innerW, innerH)
        ctx.clip()
        ctx.drawImage(image, dx, dy, drawW, drawH)
        ctx.restore()
      }

      // 边框（border-white/40）
      ctx.save()
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'
      ctx.lineWidth = coverBorderPx
      // stroke 会在路径两侧各占一半，所以要做半像素偏移以尽量贴近视觉
      ctx.strokeRect(
        coverX + coverBorderPx / 2,
        coverY + coverBorderPx / 2,
        coverWidth - coverBorderPx,
        coverHeight - coverBorderPx
      )
      ctx.restore()
      return
    }

    if (style === 'vinyl4') {
      /**
       * 唱片4：封面完整显示，唱片从右侧露出一点（封面图默认显示在矩形上）。
       * 预览实现与导出保持一致：封面为正方形，唱片在底层并略向右偏移。
       */
      // 以预览容器 160×160 为基准换算：封面略小、唱片直径略小于封面高度，且整体严格不越界
      const coverSize = size * (134 / 160) // 预览封面约 138px
      const coverX = 0
      const coverY = (size - coverSize) / 2

      const discSize = size * (130 / 160) // 预览唱片直径约 130px（小于封面高度）
      const discRadius = discSize / 2
      const discLeft = size - discSize // 贴右边，保证不越界
      const discCenterX = discLeft + discRadius
      const discCenterY = center

      // 唱片阴影（只用于唱片4）
      ctx.save()
      ctx.translate(discCenterX, discCenterY)
      ctx.shadowColor = 'rgba(0,0,0,0.55)'
      ctx.shadowBlur = size * 0.03
      ctx.shadowOffsetX = size * 0.006
      ctx.shadowOffsetY = size * 0.012
      ctx.beginPath()
      ctx.arc(0, 0, discRadius, 0, Math.PI * 2)
      ctx.closePath()
      // 填充极淡颜色以产生阴影
      ctx.fillStyle = 'rgba(0,0,0,0.01)'
      ctx.fill()
      ctx.restore()

      // 底层唱片（旋转）
      ctx.save()
      ctx.translate(discCenterX, discCenterY)
      ctx.rotate(angle)

      // 只显示贴图（不叠加任何高光/细环/标签/孔洞）
      if (recordTexture) {
        ctx.save()
        ctx.beginPath()
        ctx.arc(0, 0, discRadius, 0, Math.PI * 2)
        ctx.closePath()
        ctx.clip()
        ctx.drawImage(recordTexture, -discRadius, -discRadius, discRadius * 2, discRadius * 2)
        ctx.restore()
      } else {
        ctx.beginPath()
        ctx.arc(0, 0, discRadius, 0, Math.PI * 2)
        ctx.closePath()
        ctx.fillStyle = base
        ctx.fill()
      }

      ctx.restore()

      // 上层封面（完整显示）
      const borderRadius = size * 0.015
      ctx.save()
      ctx.shadowColor = 'rgba(0,0,0,0.35)'
      ctx.shadowBlur = size * 0.02
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = size * 0.01

      // 画圆角矩形路径
      ctx.beginPath()
      ctx.moveTo(coverX + borderRadius, coverY)
      ctx.lineTo(coverX + coverSize - borderRadius, coverY)
      ctx.quadraticCurveTo(coverX + coverSize, coverY, coverX + coverSize, coverY + borderRadius)
      ctx.lineTo(coverX + coverSize, coverY + coverSize - borderRadius)
      ctx.quadraticCurveTo(
        coverX + coverSize,
        coverY + coverSize,
        coverX + coverSize - borderRadius,
        coverY + coverSize
      )
      ctx.lineTo(coverX + borderRadius, coverY + coverSize)
      ctx.quadraticCurveTo(coverX, coverY + coverSize, coverX, coverY + coverSize - borderRadius)
      ctx.lineTo(coverX, coverY + borderRadius)
      ctx.quadraticCurveTo(coverX, coverY, coverX + borderRadius, coverY)
      ctx.closePath()

      // 背景
      ctx.fillStyle = 'rgba(255,255,255,0.06)'
      ctx.fill()

      // 图片：默认在矩形封面上（object-fit: cover）
      if (image) {
        ctx.save()
        ctx.clip()

        const { width: iw, height: ih } = getCoverImageSize(image)
        const imgRatio = iw / ih
        const boxRatio = coverSize / coverSize

        let drawW: number
        let drawH: number
        if (imgRatio > boxRatio) {
          drawH = coverSize
          drawW = drawH * imgRatio
        } else {
          drawW = coverSize
          drawH = drawW / imgRatio
        }
        const dx = coverX - (drawW - coverSize) / 2
        const dy = coverY - (drawH - coverSize) / 2
        ctx.drawImage(image, dx, dy, drawW, drawH)
        ctx.restore()
      }

      // 边框
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'
      ctx.lineWidth = Math.max(1, size * 0.003)
      ctx.stroke()

      ctx.restore()
      return
    }

    if (style === 'vinyl5' || style === 'record3') {
      /**
       * 唱片5/record3：用户图片旋转（底层），静态遮罩（上层）。
       * 用户图片通过遮罩的透明区域显示。
       */

      if (style === 'record3') {
        const frame = recordTexture
        let frameX = 0
        let frameY = 0
        let frameW = size
        let frameH = size

        // 预览使用 object-contain，这里也保持等比铺放，避免拉伸导致孔位偏移
        if (frame) {
          const fw = frame.naturalWidth || frame.width || 1
          const fh = frame.naturalHeight || frame.height || 1
          const fitScale = Math.min(size / fw, size / fh)
          frameW = fw * fitScale
          frameH = fh * fitScale
          frameX = (size - frameW) / 2
          frameY = (size - frameH) / 2
        }

        const holeCenterX = frameX + frameW * RECORD3_HOLE_CENTER_X_RATIO
        const holeCenterY = frameY + frameH * RECORD3_HOLE_CENTER_Y_RATIO
        const holeDiameter =
          Math.min(frameW * RECORD3_HOLE_WIDTH_RATIO, frameH * RECORD3_HOLE_HEIGHT_RATIO) *
          RECORD3_COVER_SCALE
        const discRadius = holeDiameter / 2
        const frameCenterX = frameX + frameW / 2
        const frameCenterY = frameY + frameH / 2
        const localHoleCenterX = holeCenterX - frameCenterX
        const localHoleCenterY = holeCenterY - frameCenterY

        // 唱片6：整张唱片（外环 + 中心封面）作为一个整体旋转
        ctx.save()
        ctx.translate(frameCenterX, frameCenterY)
        ctx.rotate(angle)

        if (image) {
          ctx.save()
          ctx.beginPath()
          ctx.arc(localHoleCenterX, localHoleCenterY, discRadius, 0, Math.PI * 2)
          ctx.closePath()
          ctx.clip()
          const drawSize = discRadius * 2
          ctx.drawImage(
            image,
            localHoleCenterX - drawSize / 2,
            localHoleCenterY - drawSize / 2,
            drawSize,
            drawSize
          )
          ctx.restore()
        } else {
          ctx.beginPath()
          ctx.arc(localHoleCenterX, localHoleCenterY, discRadius, 0, Math.PI * 2)
          ctx.closePath()
          ctx.fillStyle = base
          ctx.fill()
        }

        if (frame) {
          ctx.drawImage(frame, -frameW / 2, -frameH / 2, frameW, frameH)
        }
        ctx.restore()
        return
      }

      const discRadius = size * 0.38
      if (image) {
        ctx.save()
        ctx.translate(center, center)
        ctx.beginPath()
        ctx.arc(0, 0, discRadius, 0, Math.PI * 2)
        ctx.closePath()
        ctx.clip()
        ctx.rotate(angle)
        const drawSize = discRadius * 2
        ctx.drawImage(image, -drawSize / 2, -drawSize / 2, drawSize, drawSize)
        ctx.restore()
      } else {
        ctx.beginPath()
        ctx.arc(center, center, discRadius, 0, Math.PI * 2)
        ctx.closePath()
        ctx.fillStyle = base
        ctx.fill()
      }

      // vinyl5：上层静态遮罩（不旋转），透明区域露出底层旋转图片
      if (record2Frame) {
        ctx.drawImage(record2Frame, 0, 0, size, size)
      }

      return
    }

    ctx.save()
    ctx.translate(center, center)
    ctx.rotate(angle)

    // 主唱片底色
    ctx.beginPath()
    ctx.arc(0, 0, outerRadius, 0, Math.PI * 2)
    ctx.closePath()
    ctx.fillStyle = base
    ctx.fill()

    if (style === 'vinyl2') {
      if (image) {
        ctx.save()
        ctx.beginPath()
        ctx.arc(0, 0, outerRadius, 0, Math.PI * 2)
        ctx.closePath()
        ctx.clip()
        const drawSize = outerRadius * 2
        ctx.drawImage(image, -drawSize / 2, -drawSize / 2, drawSize, drawSize)
        ctx.restore()
      }
      ctx.strokeStyle = ring
      ctx.lineWidth = size * 0.01
      for (let i = 0; i < 6; i += 1) {
        ctx.beginPath()
        ctx.arc(0, 0, outerRadius * (0.35 + i * 0.09), 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.beginPath()
      ctx.arc(0, 0, outerRadius * 0.9, -Math.PI * 0.14, Math.PI * 0.14)
      ctx.strokeStyle = highlight
      ctx.lineWidth = size * 0.018
      ctx.stroke()
      ctx.restore()
      return
    }

    // 唱片纹理环
    ctx.strokeStyle = ring
    ctx.lineWidth = size * 0.015
    ctx.beginPath()
    ctx.arc(0, 0, outerRadius * 0.72, 0, Math.PI * 2)
    ctx.stroke()

    // 图片纹理
    if (image) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(0, 0, imageRadius, 0, Math.PI * 2)
      ctx.closePath()
      ctx.clip()
      const drawSize = imageRadius * 2
      ctx.drawImage(image, -drawSize / 2, -drawSize / 2, drawSize, drawSize)
      ctx.restore()
    }

    // 中央标签
    ctx.beginPath()
    ctx.arc(0, 0, labelRadius, 0, Math.PI * 2)
    ctx.closePath()
    ctx.fillStyle = label
    ctx.fill()

    // 中央小孔
    ctx.beginPath()
    ctx.arc(0, 0, holeRadius, 0, Math.PI * 2)
    ctx.closePath()
    ctx.fillStyle = '#0a0a0a'
    ctx.fill()

    // 高光
    ctx.beginPath()
    ctx.arc(0, 0, outerRadius * 0.9, -Math.PI * 0.15, Math.PI * 0.15)
    ctx.strokeStyle = highlight
    ctx.lineWidth = size * 0.02
    ctx.stroke()

    ctx.restore()
  }

  type RecordGifConfig = {
    width: number
    height: number
    frameCount: number
    frameRate: number
  }

  type RecordGifEncodeConfig = {
    width: number
    height: number
    frameRate: number
    maxColors: number
  }

  const createRecordFrameRgbaRenderer = (
    cfg: RecordGifConfig,
    style: RecordStyle,
    coverAdapter: CoverRenderAdapter,
    recordTexture: HTMLImageElement | null,
    record2Frame: HTMLImageElement | null,
    tapeFrame: HTMLImageElement | null
  ) => {
    const canvas = document.createElement('canvas')
    canvas.width = cfg.width
    canvas.height = cfg.height
    // 我们会频繁读取像素来构造 raw RGBA 流，显式开启 willReadFrequently 让浏览器走更合适的后端路径
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('Canvas is not supported.')
    // FFmpeg 负责统一调色板时，平滑采样通常比硬边像素跳动更稳定
    ctx.imageSmoothingEnabled = true

    return async (frameIndex: number) => {
      const angle = (frameIndex / cfg.frameCount) * Math.PI * 2
      const frameTimeMs = (frameIndex / Math.max(1, cfg.frameRate)) * 1000
      const coverFrame = coverAdapter.getFrameAtTime(frameTimeMs)
      drawRecordFrame(ctx, cfg.width, cfg.height, angle, style, coverFrame, recordTexture, record2Frame, tapeFrame)
      return new Uint8Array(ctx.getImageData(0, 0, cfg.width, cfg.height).data)
    }
  }

  const handleDownloadGif = async () => {
    if (isGenerating) return
    setIsGenerating(true)
    setGenerateStatusText('Preparing frames...')
    try {
      const isGifCover =
        Boolean(data.coverUrl) &&
        (data.coverMediaType === 'gif' ||
          data.coverMimeType === 'image/gif' ||
          (typeof data.coverUrl === 'string' && data.coverUrl.startsWith('data:image/gif')))
      let coverAdapter: CoverRenderAdapter = { getFrameAtTime: () => null }

      if (data.coverUrl) {
        if (isGifCover) {
          setGenerateStatusText('Decoding GIF cover...')
          const decoded = await decodeGifSourceToFrames(data.coverUrl)
          if (!decoded.frames.length) {
            throw new Error('GIF has no decodable frames.')
          }
          coverAdapter = {
            getFrameAtTime: (timeMs: number) => decoded.getFrameAtTime(timeMs),
          }
          setData((prev) => ({
            ...prev,
            coverMediaType: 'gif',
            coverMimeType: prev.coverMimeType || 'image/gif',
            coverGifMeta: {
              frameCount: decoded.frames.length,
              durationMs: decoded.durationMs,
              width: decoded.width,
              height: decoded.height,
            },
          }))
        } else {
          const image = await loadImage(data.coverUrl)
          coverAdapter = {
            getFrameAtTime: () => image,
          }
        }
      }

      const recordTexture =
        data.style === 'vinyl3' || data.style === 'vinyl4'
          ? await loadImage(RECORD_TEXTURE_SRC)
          : data.style === 'record3'
            ? await loadImage(RECORD3_FRAME_SRC)
            : null
      const record2Frame = data.style === 'vinyl5' ? await loadImage(RECORD2_FRAME_SRC) : null
      const tapeFrame = data.style === 'tape1' ? await loadImage(TAPE_FRAME_SRC) : null

      const selectedFps = Number(data.gifFps)
      const exportFps =
        Number.isFinite(selectedFps) && RECORD_FPS_OPTIONS.includes(selectedFps as (typeof RECORD_FPS_OPTIONS)[number])
          ? selectedFps
          : RECORD_DEFAULT_FPS
      const currentRotationMs = rotationSeconds * 1000
      const frameCount = Math.max(1, Math.round((currentRotationMs / 1000) * exportFps))
      const isTapeStyle = data.style === 'tape1'
      const cfg: RecordGifConfig = {
        width: isTapeStyle
          ? TAPE_EXPORT_WIDTH
          : data.style === 'record3'
            ? RECORD3_EXPORT_SIZE
            : RECORD_SIZE,
        height: isTapeStyle
          ? TAPE_EXPORT_HEIGHT
          : data.style === 'record3'
            ? RECORD3_EXPORT_SIZE
            : RECORD_SIZE,
        frameCount,
        frameRate: exportFps,
      }
      const encodeConfigs: RecordGifEncodeConfig[] = [
        { width: cfg.width, height: cfg.height, frameRate: exportFps, maxColors: 128 },
        {
          width: Math.max(isTapeStyle ? 220 : 160, Math.round(cfg.width * 0.92)),
          height: Math.max(isTapeStyle ? 138 : 150, Math.round(cfg.height * 0.92)),
          frameRate: Math.max(6, exportFps - 2),
          maxColors: 96,
        },
        {
          width: Math.max(isTapeStyle ? 192 : 150, Math.round(cfg.width * 0.84)),
          height: Math.max(isTapeStyle ? 120 : 150, Math.round(cfg.height * 0.84)),
          frameRate: Math.max(6, exportFps - 4),
          maxColors: 80,
        },
      ]

      let blob: Blob | null = null
      let lastError: string | null = null

      for (const encodeCfg of encodeConfigs) {
        const scaledFrameCount = Math.max(1, Math.round((currentRotationMs / 1000) * encodeCfg.frameRate))
        const scaledRecordCfg: RecordGifConfig = {
          width: encodeCfg.width,
          height: encodeCfg.height,
          frameCount: scaledFrameCount,
          frameRate: encodeCfg.frameRate,
        }
        const getFrameRgba = createRecordFrameRgbaRenderer(
          scaledRecordCfg,
          data.style,
          coverAdapter,
          recordTexture,
          record2Frame,
          tapeFrame
        )
        const ffmpegResult = await convertRawRgbaFramesToGifWithFFmpeg(
          getFrameRgba,
          {
            width: scaledRecordCfg.width,
            height: scaledRecordCfg.height,
            frameRate: encodeCfg.frameRate,
            frameCount: scaledRecordCfg.frameCount,
            alphaThreshold: 20,
            maxColors: encodeCfg.maxColors,
            ditherMode: 'none',
            statsMode: 'full',
          },
          (progress) => setGenerateStatusText(progress.message)
        )

        if (!ffmpegResult.success || !ffmpegResult.gifBlob) {
          lastError = ffmpegResult.error || 'FFmpeg GIF conversion failed.'
          continue
        }

        if (ffmpegResult.gifBlob.size <= RECORD_GIF_MAX_BYTES) {
          blob = ffmpegResult.gifBlob
          break
        }

        blob = ffmpegResult.gifBlob
      }

      if (!blob) {
        throw new Error(lastError || 'FFmpeg GIF conversion failed.')
      }
      setGenerateStatusText('Applying Steam compatibility fix...')

      // Steam 展柜兼容处理（按你的要求）：
      // - 将末尾字节从 0x3B 改为 0x21（同时兼容 0x2B -> 0x21）
      const bytes = new Uint8Array(await blob.arrayBuffer())
      let fixed = fixGifEndingByteBytes(bytes, {
        fromByte: 0x3B,
        toByte: 0x21,
        keepIfStandardTrailer: false,
      })
      fixed = fixGifEndingByteBytes(fixed, {
        fromByte: 0x2B,
        toByte: 0x21,
        keepIfStandardTrailer: false,
      })
      const fixedBlob = new Blob([new Uint8Array(fixed)], { type: 'image/gif' })
      saveAs(fixedBlob, 'record.gif')
      setGenerateStatusText('GIF export complete.')
      if (fixedBlob.size > RECORD_GIF_MAX_BYTES) {
        // 理论上很少发生，但仍给出提示（错误提示用英文）
        alert('GIF is larger than 2 MB.')
      }
    } catch (error) {
      console.error(error)
      setGenerateStatusText('GIF generation failed.')
      alert('GIF generation failed.')
    } finally {
      setIsGenerating(false)
    }
  }

  const recordColors = resolveRecordColors(data.style)

  return (
    <div className="relative w-full max-w-full overflow-hidden">
      <SectionContainer
        title={isEditMode ? editTitleLabel : titleLabel}
        contentClassName="py-3 px-0 border-l-0 border-r-0"
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        isEditMode={isEditMode}
        onDelete={onDelete}
        isDragging={isDragging}
        isDragOver={isDragOver}
        className={className}
      >
        <div className="relative group">
          <div className="bg-steam-item border border-steam-border p-2">
            <div className="border border-steam-border bg-black/40">
              <div
                className={`flex gap-2 px-2 py-2 items-center ${data.style === 'record3' ? 'min-h-[196px]' : 'min-h-[176px]'}`}
              >
                <div
                  className={`flex items-center justify-center shrink-0 ${data.style === 'record3' ? 'w-[184px] h-[184px]' : 'w-[160px] h-[160px]'}`}
                >
                  {data.style === 'tape1' ? (
                    <div className="relative h-[160px] w-[160px] flex items-center justify-center overflow-hidden">
                      <div className="relative h-[100px] w-[160px]">
                        {renderTapeCoverMask(
                          PREVIEW_TAPE_W,
                          PREVIEW_TAPE_H,
                          data.coverUrl,
                          PREVIEW_TAPE_LABEL_X,
                          PREVIEW_TAPE_LABEL_Y,
                          PREVIEW_TAPE_LABEL_W,
                          PREVIEW_TAPE_LABEL_H,
                          PREVIEW_TAPE_LABEL_RADIUS,
                          PREVIEW_TAPE_LEFT_HOLE_X,
                          PREVIEW_TAPE_RIGHT_HOLE_X,
                          PREVIEW_TAPE_HOLE_Y,
                          PREVIEW_TAPE_HOLE_R,
                          `tape-preview-cover-mask-${componentId}`
                        )}
                        {renderTapeFrameMask(
                          PREVIEW_TAPE_W,
                          PREVIEW_TAPE_H,
                          PREVIEW_TAPE_LEFT_HOLE_X,
                          PREVIEW_TAPE_RIGHT_HOLE_X,
                          PREVIEW_TAPE_HOLE_Y,
                          PREVIEW_TAPE_HOLE_R,
                          `tape-preview-frame-mask-${componentId}`
                        )}
                        {renderTapeReelOverlay(
                          PREVIEW_TAPE_W,
                          PREVIEW_TAPE_H,
                          PREVIEW_TAPE_LEFT_HOLE_X,
                          PREVIEW_TAPE_RIGHT_HOLE_X,
                          PREVIEW_TAPE_HOLE_Y,
                          PREVIEW_TAPE_HOLE_R,
                          rotationSeconds,
                          `tape-preview-reel-overlay-${componentId}`
                        )}
                      </div>
                    </div>
                  ) : data.style === 'vinyl3' ? (
                    <div className="relative w-[160px] h-[160px] overflow-hidden">
                      {/* 圆在底层：直径 160，圆心在 (80,80)，整圆在容器内 */}
                      <div
                        className="absolute left-0 top-0 w-[160px] h-[160px] rounded-full record-spin motion-reduce:animate-none"
                        style={mergeRecordSpinStyle({
                          backgroundImage: `url(${RECORD_TEXTURE_SRC})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                          zIndex: 0,
                        })}
                      />
                      {/* 封面在左 80×160，完全遮住圆的左半 */}
                      <div className="absolute left-0 top-0 w-[80px] h-[160px] bg-white/90 border border-white/40 shadow z-10">
                        {data.coverUrl && (
                          <img
                            src={data.coverUrl}
                            alt="cover"
                            className="w-full h-full object-cover"
                            draggable={false}
                          />
                        )}
                      </div>
                    </div>
                  ) : data.style === 'vinyl4' ? (
                    <div className="relative w-[160px] h-[160px] overflow-hidden">
                      {/* 底层唱片：直径略小于封面高度，贴右侧且不越界 */}
                      <div
                        className="absolute left-[30px] top-[15px] w-[130px] h-[130px] rounded-full record-spin motion-reduce:animate-none"
                        style={mergeRecordSpinStyle({
                          backgroundImage: `url(${RECORD_TEXTURE_SRC})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                          boxShadow: '0 10px 24px rgba(0,0,0,0.55)',
                          zIndex: 0,
                        })}
                      />

                      {/* 上层封面：完整显示（略小于容器），上传图片默认显示在这里 */}
                      <div className="absolute left-0 top-[11px] w-[134px] h-[134px] rounded-sm overflow-hidden bg-white/5 border border-white/20 shadow z-10">
                        {data.coverUrl && (
                          <img
                            src={data.coverUrl}
                            alt="cover"
                            className="w-full h-full object-cover"
                            draggable={false}
                          />
                        )}
                      </div>
                    </div>
                  ) : data.style === 'vinyl5' ? (
                    <div className="relative w-[160px] h-[160px] overflow-hidden">
                      {/* 底层：用户图片裁成圆形后旋转 */}
                      <div className="absolute inset-[10%] rounded-full overflow-hidden record-spin motion-reduce:animate-none" style={recordSpinStyle}>
                        {data.coverUrl ? (
                          <img
                            src={data.coverUrl}
                            alt="record"
                            className="w-full h-full object-cover"
                            draggable={false}
                          />
                        ) : (
                          <div className="w-full h-full bg-steam-item-in" />
                        )}
                      </div>
                      {/* 上层：record_2.gif 静态遮罩，透明区域露出底层旋转图片 */}
                      <img
                        src={RECORD2_FRAME_SRC}
                        alt=""
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                        draggable={false}
                      />
                    </div>
                  ) : data.style === 'record3' ? (
                    <div className="relative w-full h-full max-w-[184px] max-h-[184px] flex items-center justify-center overflow-hidden">
                      <div className="relative w-full h-full aspect-square max-w-[184px] max-h-[184px] record-spin motion-reduce:animate-none" style={recordSpinStyle}>
                        <div
                          className="absolute -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full"
                          style={{
                            left: `${RECORD3_HOLE_CENTER_SQUARE_RATIO * 100}%`,
                            top: `${RECORD3_HOLE_CENTER_SQUARE_RATIO * 100}%`,
                            width: `${RECORD3_HOLE_DIAMETER_SQUARE_RATIO * 100}%`,
                            height: `${RECORD3_HOLE_DIAMETER_SQUARE_RATIO * 100}%`,
                          }}
                        >
                          {data.coverUrl ? (
                            <img src={data.coverUrl} alt="record center" className="h-full w-full object-cover" draggable={false} />
                          ) : (
                            <div className="h-full w-full bg-steam-item-in" />
                          )}
                        </div>
                        <img src={RECORD3_FRAME_SRC} alt="" className="absolute inset-0 block h-full w-full object-contain pointer-events-none" draggable={false} />
                      </div>
                    </div>
                  ) : (
                    <div className="w-[160px] h-[160px] relative">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div
                          className="absolute inset-0 rounded-full record-spin motion-reduce:animate-none"
                          style={mergeRecordSpinStyle({
                            background: recordColors.base,
                            boxShadow: 'inset 0 0 0 6px rgba(255,255,255,0.05)',
                          })}
                        >
                          {data.coverUrl && (
                            <img
                              src={data.coverUrl}
                              alt="record texture"
                              className={`absolute ${data.style === 'vinyl2' ? 'inset-0 w-full h-full' : 'inset-[10%] w-[80%] h-[80%]'} rounded-full object-cover`}
                              draggable={false}
                            />
                          )}
                          {data.style === 'vinyl2' ? (
                            <>
                              <div className="absolute inset-0 rounded-full pointer-events-none opacity-70"
                                style={{
                                  background:
                                    'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.08), rgba(0,0,0,0) 60%)',
                                }}
                              />
                              <div className="absolute inset-[10%] rounded-full border border-black/20" />
                              <div className="absolute inset-[20%] rounded-full border border-black/20" />
                              <div className="absolute inset-[30%] rounded-full border border-black/20" />
                              <div className="absolute inset-[40%] rounded-full border border-black/20" />
                            </>
                          ) : (
                            <>
                              <div
                                className="absolute inset-0 rounded-full pointer-events-none"
                                style={{
                                  background:
                                    'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.18), rgba(255,255,255,0) 55%)',
                                }}
                              />
                              <div
                                className="absolute inset-[38%] rounded-full"
                                style={{ background: recordColors.label }}
                              />
                              <div className="absolute inset-[48%] rounded-full bg-black" />
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex-1 flex flex-col gap-1 pt-0 min-w-0 overflow-hidden">
                  <div className="text-steam-textPrimary text-[20px] leading-tight font-semibold -mt-1 truncate">
                    {data.title}
                  </div>
                  <div className="text-steam-textMuted text-sm font-bold truncate">{t('navigation:editMode.creatorLabel')} - {creatorName}</div>
                  <div className="text-white text-sm leading-snug line-clamp-2 overflow-hidden max-h-[2.5rem]">
                    {data.content}
                  </div>
                  <div className="text-xs text-steam-textMuted whitespace-pre mt-1 overflow-hidden">
                    {STEAM_PLAYER_PROGRESS_LINE}
                  </div>
                  <div className="text-xs text-steam-textMuted whitespace-pre overflow-hidden">
                    {STEAM_PLAYER_CONTROL_LINE}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="absolute inset-0 bg-black/40 text-steam-textPrimary opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            onClick={() => setIsModalOpen(true)}
            aria-label={overlayLabel}
          >
            <span className="px-3 py-1.5 bg-black/60 rounded text-sm">{overlayLabel}</span>
          </button>
        </div>

        <input
          ref={uploadRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </SectionContainer>

      {isModalOpen && createPortal((
        <div className="fixed inset-0 z-[9999]">
          <div className="absolute inset-0 bg-black/60" onClick={() => setIsModalOpen(false)} />
          <div className="absolute inset-0 overflow-y-auto p-4">
            <div className="flex min-h-full items-start justify-center sm:items-center">
            <div
              className="bg-[#090d15]/95 rounded-2xl shadow-2xl w-[980px] max-w-[calc(100vw-24px)] max-h-[calc(100vh-32px)] border border-white/10 flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between shrink-0">
                <div className="text-steam-textPrimary font-semibold">{editTitleLabel}</div>
                <button
                  type="button"
                  className="text-steam-textMuted hover:text-steam-textPrimary"
                  onClick={() => setIsModalOpen(false)}
                >
                  ×
                </button>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto min-h-0">
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/35 p-6">
                  <div
                    className="pointer-events-none absolute inset-0 transition-colors duration-700"
                    style={{
                      background: `radial-gradient(circle at 50% 45%, ${
                        ({
                          vinyl: 'rgba(59,130,246,0.18)',
                          vinyl2: 'rgba(168,85,247,0.18)',
                          vinyl3: 'rgba(236,72,153,0.18)',
                          vinyl4: 'rgba(34,197,94,0.18)',
                          vinyl5: 'rgba(14,165,233,0.18)',
                          record3: 'rgba(249,115,22,0.18)',
                          tape1: 'rgba(244,114,182,0.18)',
                        } as Record<RecordStyle, string>)[data.style]
                      } 0%, transparent 70%)`,
                    }}
                  />
                  <div className="relative mx-auto w-full max-w-[440px] text-center">
                    <div
                      className={`relative mx-auto ${
                        data.style === 'record3'
                          ? 'h-[230px] w-[230px]'
                          : data.style === 'tape1'
                            ? 'h-[160px] w-[256px]'
                            : 'h-[200px] w-[200px]'
                      }`}
                    >
                      {data.style === 'tape1' ? (
                        <div className="relative h-full w-full">
                          {renderTapeCoverMask(
                            MODAL_TAPE_W,
                            MODAL_TAPE_H,
                            data.coverUrl,
                            MODAL_TAPE_LABEL_X,
                            MODAL_TAPE_LABEL_Y,
                            MODAL_TAPE_LABEL_W,
                            MODAL_TAPE_LABEL_H,
                            MODAL_TAPE_LABEL_RADIUS,
                            MODAL_TAPE_LEFT_HOLE_X,
                            MODAL_TAPE_RIGHT_HOLE_X,
                            MODAL_TAPE_HOLE_Y,
                            MODAL_TAPE_HOLE_R,
                            `tape-modal-cover-mask-${componentId}`
                          )}
                          {renderTapeFrameMask(
                            MODAL_TAPE_W,
                            MODAL_TAPE_H,
                            MODAL_TAPE_LEFT_HOLE_X,
                            MODAL_TAPE_RIGHT_HOLE_X,
                            MODAL_TAPE_HOLE_Y,
                            MODAL_TAPE_HOLE_R,
                            `tape-modal-frame-mask-${componentId}`
                          )}
                          {renderTapeReelOverlay(
                            MODAL_TAPE_W,
                            MODAL_TAPE_H,
                            MODAL_TAPE_LEFT_HOLE_X,
                            MODAL_TAPE_RIGHT_HOLE_X,
                            MODAL_TAPE_HOLE_Y,
                            MODAL_TAPE_HOLE_R,
                            rotationSeconds,
                            `tape-modal-reel-overlay-${componentId}`
                          )}
                        </div>
                      ) : data.style === 'record3' ? (
                        <div className="relative h-full w-full record-spin motion-reduce:animate-none" style={recordSpinStyle}>
                          <div
                            className="absolute -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full"
                            style={{
                              left: `${RECORD3_HOLE_CENTER_SQUARE_RATIO * 100}%`,
                              top: `${RECORD3_HOLE_CENTER_SQUARE_RATIO * 100}%`,
                              width: `${RECORD3_HOLE_DIAMETER_SQUARE_RATIO * 100}%`,
                              height: `${RECORD3_HOLE_DIAMETER_SQUARE_RATIO * 100}%`,
                            }}
                          >
                            {data.coverUrl ? (
                              <img src={data.coverUrl} alt="record center" className="h-full w-full object-cover" draggable={false} />
                            ) : (
                              <div className="h-full w-full bg-steam-item-in" />
                            )}
                          </div>
                          <img src={RECORD3_FRAME_SRC} alt="" className="absolute inset-0 block h-full w-full object-contain pointer-events-none" draggable={false} />
                        </div>
                      ) : data.style === 'vinyl5' ? (
                        <div className="relative h-full w-full">
                          <div className="absolute inset-[10%] overflow-hidden rounded-full record-spin motion-reduce:animate-none" style={recordSpinStyle}>
                            {data.coverUrl ? (
                              <img src={data.coverUrl} alt="record" className="h-full w-full object-cover" draggable={false} />
                            ) : (
                              <div className="h-full w-full bg-steam-item-in" />
                            )}
                          </div>
                          <img src={RECORD2_FRAME_SRC} alt="" className="absolute inset-0 h-full w-full object-contain pointer-events-none" draggable={false} />
                        </div>
                      ) : data.style === 'vinyl4' ? (
                        <div className="relative h-full w-full overflow-hidden">
                          <div
                            className="absolute left-[38px] top-[19px] h-[162px] w-[162px] rounded-full record-spin motion-reduce:animate-none"
                            style={mergeRecordSpinStyle({ backgroundImage: `url(${RECORD_TEXTURE_SRC})`, backgroundSize: 'cover', backgroundPosition: 'center', boxShadow: '0 8px 20px rgba(0,0,0,0.55)' })}
                          />
                          <div className="absolute left-0 top-[14px] h-[168px] w-[168px] overflow-hidden rounded-sm border border-white/20 bg-white/5 shadow-lg">
                            {data.coverUrl && <img src={data.coverUrl} alt="cover" className="h-full w-full object-cover" draggable={false} />}
                          </div>
                        </div>
                      ) : data.style === 'vinyl3' ? (
                        <div className="relative h-full w-full overflow-hidden">
                          <div
                            className="absolute inset-0 rounded-full record-spin motion-reduce:animate-none"
                            style={mergeRecordSpinStyle({ backgroundImage: `url(${RECORD_TEXTURE_SRC})`, backgroundSize: 'cover', backgroundPosition: 'center' })}
                          />
                          <div className="absolute left-0 top-0 h-full w-1/2 border border-white/40 bg-white/90 shadow">
                            {data.coverUrl && <img src={data.coverUrl} alt="cover" className="h-full w-full object-cover" draggable={false} />}
                          </div>
                        </div>
                      ) : data.style === 'vinyl2' ? (
                        <div className="relative h-full w-full">
                          <div className="absolute inset-0 rounded-full record-spin motion-reduce:animate-none" style={mergeRecordSpinStyle({ background: recordColors.base })}>
                            {data.coverUrl && <img src={data.coverUrl} alt="record texture" className="absolute inset-0 h-full w-full rounded-full object-cover" draggable={false} />}
                            <div className="absolute inset-0 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.08), transparent 60%)' }} />
                            <div className="absolute inset-[10%] rounded-full border border-black/20" />
                            <div className="absolute inset-[20%] rounded-full border border-black/20" />
                            <div className="absolute inset-[30%] rounded-full border border-black/20" />
                            <div className="absolute inset-[40%] rounded-full border border-black/20" />
                          </div>
                        </div>
                      ) : (
                        <div className="relative h-full w-full">
                          <div className="absolute inset-0 rounded-full record-spin motion-reduce:animate-none" style={mergeRecordSpinStyle({ background: recordColors.base, boxShadow: 'inset 0 0 0 6px rgba(255,255,255,0.05)' })}>
                            {data.coverUrl && <img src={data.coverUrl} alt="record texture" className="absolute inset-[10%] h-[80%] w-[80%] rounded-full object-cover" draggable={false} />}
                            <div className="absolute inset-0 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.18), transparent 55%)' }} />
                            <div className="absolute inset-[38%] rounded-full" style={{ background: recordColors.label }} />
                            <div className="absolute inset-[48%] rounded-full bg-black" />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 text-[13px] tracking-wide text-sky-200/80">{uiText.currentTemplatePreview}</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_1fr]">
                    <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-steam-textPrimary text-sm font-semibold">
                          {styleLibraryCategory === 'record' ? uiText.recordLibrary : uiText.tapeLibrary}
                        </div>
                        <div className="text-xs text-steam-textMuted">
                          {styleLibraryCategory === 'record' ? uiText.totalStyles : uiText.tapeTotalStyles}
                        </div>
                      </div>
                      <div className="mb-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          className={`rounded-lg border px-3 py-2 text-xs transition-colors ${
                            styleLibraryCategory === 'record'
                              ? 'border-blue-400 bg-blue-500/25 text-white'
                              : 'border-white/10 bg-white/5 text-steam-textPrimary hover:bg-white/10'
                          }`}
                          onClick={() => setStyleLibraryCategory('record')}
                        >
                          {uiText.recordLibrary}
                        </button>
                        <button
                          type="button"
                          className={`rounded-lg border px-3 py-2 text-xs transition-colors ${
                            styleLibraryCategory === 'tape'
                              ? 'border-blue-400 bg-blue-500/25 text-white'
                              : 'border-white/10 bg-white/5 text-steam-textPrimary hover:bg-white/10'
                          }`}
                          onClick={() => setStyleLibraryCategory('tape')}
                        >
                          {uiText.tapeLibrary}
                        </button>
                      </div>
                      {styleLibraryCategory === 'record' ? (
                        <div className="grid grid-cols-3 gap-2">
                          {RECORD_STYLE_OPTIONS.map((style) => (
                            <button
                              key={style}
                              type="button"
                              className={`rounded-lg border p-2 text-left transition-colors ${
                                data.style === style
                                  ? 'border-blue-400 bg-blue-500/25 text-white'
                                  : 'border-white/10 bg-white/5 text-steam-textPrimary hover:bg-white/10'
                              }`}
                              onClick={() => setData((prev) => ({ ...prev, style }))}
                            >
                              <div className="mb-2 text-xs">{resolveRecordLabel(style, isZh)}</div>
                              <div className="h-14 w-full flex items-center justify-center">
                                {style === 'record3' ? (
                                  <div className="relative aspect-square h-12 w-12">
                                    <div
                                      className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/15"
                                      style={{
                                        left: `${RECORD3_HOLE_CENTER_SQUARE_RATIO * 100}%`,
                                        top: `${RECORD3_HOLE_CENTER_SQUARE_RATIO * 100}%`,
                                        width: `${RECORD3_HOLE_DIAMETER_SQUARE_RATIO * 100}%`,
                                        height: `${RECORD3_HOLE_DIAMETER_SQUARE_RATIO * 100}%`,
                                      }}
                                    />
                                    <img
                                      src={RECORD3_FRAME_SRC}
                                      alt=""
                                      className="pointer-events-none absolute inset-0 block h-full w-full object-contain opacity-90"
                                      draggable={false}
                                    />
                                  </div>
                                ) : style === 'vinyl5' ? (
                                  <div className="relative h-12 w-12">
                                    <div className="absolute inset-0 rounded-full bg-steam-item-in" />
                                    <img src={RECORD2_FRAME_SRC} alt="" className="absolute inset-0 h-full w-full object-contain opacity-80" />
                                  </div>
                                ) : style === 'vinyl4' ? (
                                  <div className="relative h-12 w-12 overflow-hidden">
                                    <div
                                      className="absolute right-0 top-[6px] h-9 w-9 rounded-full"
                                      style={{ background: resolveRecordColors(style).base }}
                                    />
                                    <div className="absolute left-0 top-[4px] h-10 w-10 rounded-sm border border-white/25 bg-white/10" />
                                  </div>
                                ) : style === 'vinyl3' ? (
                                  <div className="relative h-12 w-12 overflow-hidden">
                                    <div
                                      className="absolute inset-0 rounded-full"
                                      style={{ backgroundImage: `url(${RECORD_TEXTURE_SRC})`, backgroundSize: 'cover' }}
                                    />
                                    <div className="absolute left-0 top-0 h-12 w-6 border border-white/40 bg-white/85" />
                                  </div>
                                ) : style === 'vinyl2' ? (
                                  <div className="relative h-12 w-12 rounded-full" style={{ background: resolveRecordColors(style).base }}>
                                    <div className="absolute inset-[10%] rounded-full border border-black/25" />
                                    <div className="absolute inset-[24%] rounded-full border border-black/25" />
                                    <div className="absolute inset-[38%] rounded-full border border-black/25" />
                                  </div>
                                ) : (
                                  <div className="relative h-12 w-12 rounded-full" style={{ background: resolveRecordColors(style).base }}>
                                    <div className="absolute inset-[36%] rounded-full" style={{ background: resolveRecordColors(style).label }} />
                                    <div className="absolute inset-[46%] rounded-full bg-black" />
                                  </div>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2">
                          {TAPE_STYLE_OPTIONS.map((style) => (
                            <button
                              key={style}
                              type="button"
                              className={`rounded-lg border p-2 text-left transition-colors ${
                                data.style === style
                                  ? 'border-blue-400 bg-blue-500/25 text-white'
                                  : 'border-white/10 bg-white/5 text-steam-textPrimary hover:bg-white/10'
                              }`}
                              onClick={() => setData((prev) => ({ ...prev, style }))}
                            >
                              <div className="mb-2 text-xs">{resolveRecordLabel(style, isZh)}</div>
                              <div className="h-14 w-full flex items-center justify-center">
                                <div className="relative h-10 w-16 rounded-md border border-white/20 bg-black/35">
                                  <div className="absolute left-[10px] top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border border-white/30" />
                                  <div className="absolute right-[10px] top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border border-white/30" />
                                </div>
                              </div>
                              <div className="mt-1 text-[11px] text-steam-textMuted">{uiText.tapeTemplateDesc}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/25 p-3 space-y-3">
                      <div>
                        <div className="text-steam-textPrimary text-xs font-semibold mb-1">{uiText.trackTitle}</div>
                        <input
                          type="text"
                          value={data.title}
                          onChange={(e) => setData((prev) => ({ ...prev, title: e.target.value }))}
                          className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-steam-textPrimary text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                          maxLength={60}
                        />
                      </div>
                      <div>
                        <div className="text-steam-textPrimary text-xs font-semibold mb-1">{uiText.artist}</div>
                        <input
                          type="text"
                          value={creatorName}
                          onChange={(e) => setData((prev) => ({ ...prev, creatorName: e.target.value }))}
                          className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-steam-textPrimary text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                          maxLength={40}
                        />
                      </div>
                      <div>
                        <div className="text-steam-textPrimary text-xs font-semibold mb-1">{uiText.lyrics}</div>
                        <textarea
                          value={data.content}
                          onChange={(e) => setData((prev) => ({ ...prev, content: e.target.value }))}
                          className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-steam-textPrimary text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                          rows={3}
                          maxLength={240}
                        />
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/20">
                        <button
                          type="button"
                          className="w-full flex items-center justify-between px-3 py-2 text-left text-sm text-steam-textPrimary hover:bg-white/5 rounded-xl"
                          onClick={() => setIsAdvancedOpen((prev) => !prev)}
                        >
                          <span>{uiText.advancedExport}</span>
                          <span className="text-xs text-steam-textMuted">
                            {uiText.gifFpsDefault}
                          </span>
                        </button>
                        {isAdvancedOpen && (
                          <div className="px-3 pb-3 pt-1 border-t border-white/10 space-y-2">
                            <div className="text-steam-textPrimary text-xs font-semibold">{uiText.gifFps}</div>
                            <select
                              value={
                                RECORD_FPS_OPTIONS.includes(data.gifFps as (typeof RECORD_FPS_OPTIONS)[number])
                                  ? data.gifFps
                                  : RECORD_DEFAULT_FPS
                              }
                              onChange={(e) => setData((prev) => ({ ...prev, gifFps: Number(e.target.value) }))}
                              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-steam-textPrimary text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                              disabled={isGenerating}
                            >
                              {RECORD_FPS_OPTIONS.map((fps) => (
                                <option key={fps} value={fps}>
                                  {fps} FPS
                                </option>
                              ))}
                            </select>
                            <div className="text-xs text-steam-textMuted">
                              {data.gifFps === RECORD_DEFAULT_FPS
                                ? uiText.gifFpsUsingDefault
                                : uiText.gifFpsCurrent(data.gifFps)}
                            </div>
                            <div className="text-xs text-steam-textMuted">
                              {uiText.gifFpsHint}
                            </div>
                            <div className="pt-1 text-steam-textPrimary text-xs font-semibold">{uiText.rotationSpeed}</div>
                            <select
                              value={rotationSeconds}
                              onChange={(e) => setData((prev) => ({ ...prev, rotationSeconds: Number(e.target.value) }))}
                              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-steam-textPrimary text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                              disabled={isGenerating}
                            >
                              {RECORD_ROTATION_SECONDS_OPTIONS.map((seconds) => (
                                <option key={seconds} value={seconds}>
                                  {getRotationSpeedLabel(seconds, isZh)}
                                </option>
                              ))}
                            </select>
                            <div className="text-xs text-steam-textMuted">
                              {rotationSeconds === RECORD_DEFAULT_ROTATION_SECONDS
                                ? uiText.rotationDefault
                                : uiText.rotationCurrent(rotationSeconds)}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-steam-textPrimary hover:bg-white/10"
                          onClick={handlePickFile}
                        >
                          {uiText.uploadCover}
                        </button>
                        <button
                          type="button"
                          className={`rounded-xl px-3 py-2 text-sm transition-colors ${
                            isGenerating ? 'bg-gray-600 text-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                          onClick={handleDownloadGif}
                          disabled={isGenerating}
                        >
                          {isGenerating ? uiText.generating : isFfmpegLoading && !isFfmpegReady ? uiText.preloadingCore : uiText.downloadRecord}
                        </button>
                      </div>
                      {generateStatusText && (
                        <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-steam-textMuted">
                          {generateStatusText}
                        </div>
                      )}
                      <button
                        type="button"
                        className={`w-full rounded-xl border px-3 py-2 text-sm transition-colors ${
                          copyFeedback
                            ? 'bg-green-600/90 border-green-500 text-white'
                            : 'bg-steam-item-in border border-steam-border text-steam-textPrimary hover:bg-steam-item-in/80'
                        }`}
                        onClick={handleCopyPlayerText}
                      >
                        {copyFeedback ? uiText.copied : uiText.copyLyrics}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  )
}
