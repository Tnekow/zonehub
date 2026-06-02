/**
 * 通用截图模块：使用 html2canvas 对指定 DOM 区域生成 PNG 截图
 * 参考 home-right/share 及 CollectedGuideShowcase 的 record 生成思路
 */
import type { ShareInfo } from './types'

export interface CaptureOptions {
  /** 是否在截图中叠加配置信息卡片 */
  includeSetup: boolean
  /** 配置信息（用于绘制 setup 卡片） */
  shareInfo: ShareInfo
}

export async function captureShareImage(
  appRootEl: HTMLDivElement,
  options: CaptureOptions
): Promise<string> {
  const { includeSetup, shareInfo } = options
  const [{ default: html2canvas }, { default: screenLogoUrl }] = await Promise.all([
    import('html2canvas'),
    import('../../../assets/screenlogo.webp'),
  ])

  let overlayImgEl: HTMLImageElement | null = null
  try {
    const videoEl = appRootEl.querySelector('video') as HTMLVideoElement | null
    if (videoEl && videoEl.readyState >= 2) {
      const tempCanvas = document.createElement('canvas')
      const vw = videoEl.videoWidth || videoEl.clientWidth
      const vh = videoEl.videoHeight || videoEl.clientHeight
      tempCanvas.width = vw
      tempCanvas.height = vh
      const tempCtx = tempCanvas.getContext('2d')
      if (tempCtx) {
        tempCtx.drawImage(videoEl, 0, 0, vw, vh)
        const url = tempCanvas.toDataURL('image/png')
        overlayImgEl = document.createElement('img')
        overlayImgEl.src = url
        overlayImgEl.setAttribute('data-share-overlay', 'true')
        overlayImgEl.style.position = 'absolute'
        overlayImgEl.style.pointerEvents = 'none'
        const parent = videoEl.parentElement
        if (parent) {
          const parentRect = parent.getBoundingClientRect()
          const videoRect = videoEl.getBoundingClientRect()
          overlayImgEl.style.left = `${videoRect.left - parentRect.left}px`
          overlayImgEl.style.top = `${videoRect.top - parentRect.top}px`
          overlayImgEl.style.width = `${videoRect.width}px`
          overlayImgEl.style.height = `${videoRect.height}px`
          const cs = getComputedStyle(videoEl)
          overlayImgEl.style.objectFit = cs.objectFit || 'contain'
          parent.appendChild(overlayImgEl)
        }
      }
    }
  } catch (error) {
    void error
  }

  const bgVar =
    getComputedStyle(appRootEl).getPropertyValue('--steam-background') ||
    getComputedStyle(document.documentElement).getPropertyValue('--steam-background') ||
    '#000000'
  const canvas = await html2canvas(appRootEl, {
    backgroundColor: bgVar && bgVar.trim().length > 0 ? bgVar : '#000000',
    useCORS: true,
    scale: Math.min(2, window.devicePixelRatio || 1),
    logging: false,
    ignoreElements: (el) => el.hasAttribute('data-html2canvas-ignore'),
    removeContainer: true,
  })

  if (overlayImgEl?.parentElement) {
    overlayImgEl.parentElement.removeChild(overlayImgEl)
  }

  const ctx = canvas.getContext('2d')
  if (ctx) {
    const watermarkImg = new Image()
    watermarkImg.src = screenLogoUrl
    await new Promise<void>((resolve) => {
      watermarkImg.onload = () => resolve()
      watermarkImg.onerror = () => resolve()
    })
    const margin = 16
    const maxWidth = Math.min(320, Math.floor(canvas.width * 0.25))
    const ratio =
      watermarkImg.naturalHeight && watermarkImg.naturalWidth
        ? watermarkImg.naturalHeight / watermarkImg.naturalWidth
        : 0.4
    const width = maxWidth
    const height = Math.round(width * ratio)
    const x = canvas.width - width - margin
    const y = canvas.height - height - margin
    ctx.save()
    ctx.globalAlpha = 0.6
    ctx.drawImage(watermarkImg, x, y, width, height)
    ctx.restore()
  }

  if (includeSetup) {
    const cardBg =
      getComputedStyle(document.documentElement).getPropertyValue('--steam-card') ||
      'rgba(0,0,0,0.85)'
    const textColor =
      getComputedStyle(document.documentElement).getPropertyValue('--steam-textPrimary') ||
      '#ffffff'
    const pad = 12
    const margin = 16
    const maxW = Math.min(460, Math.floor(canvas.width * 0.45))
    const startX = margin
    const startY = margin
    const lines = [
      `Theme: ${shareInfo.themeName}`,
      `Background: ${shareInfo.backgroundName}`,
      `Badge Collector: ${shareInfo.badgeNames.length ? shareInfo.badgeNames.join(', ') : '-'}`,
      `Components: ${shareInfo.componentNames.length ? shareInfo.componentNames.join(', ') : '-'}`,
    ]
    const lineHeight = 20
    const totalH = pad * 2 + lines.length * lineHeight
    const boxW = maxW
    const r = 10
    const drawRoundRect = (
      c: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      radius: number
    ) => {
      c.beginPath()
      c.moveTo(x + radius, y)
      c.arcTo(x + w, y, x + w, y + h, radius)
      c.arcTo(x + w, y + h, x, y + h, radius)
      c.arcTo(x, y + h, x, y, radius)
      c.arcTo(x, y, x + w, y, radius)
      c.closePath()
    }
    const ctx2 = canvas.getContext('2d')!
    ctx2.save()
    ctx2.globalAlpha = 0.88
    ctx2.fillStyle = cardBg.trim() || 'rgba(0,0,0,0.88)'
    drawRoundRect(ctx2, startX, startY, boxW, totalH, r)
    ctx2.fill()
    ctx2.globalAlpha = 1
    ctx2.fillStyle = textColor.trim() || '#ffffff'
    ctx2.font = '14px system-ui, -apple-system, Segoe UI, Roboto'
    lines.forEach((line, i) => {
      ctx2.fillText(line, startX + pad, startY + pad + (i + 1) * lineHeight - 6)
    })
    ctx2.restore()
  }

  return canvas.toDataURL('image/png')
}
