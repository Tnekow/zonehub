import { decompressFrames, parseGIF, type ParsedFrame } from 'gifuct-js'

const MIN_GIF_DELAY_MS = 20

export type DecodedGifFrames = {
  frames: HTMLCanvasElement[]
  delaysMs: number[]
  durationMs: number
  width: number
  height: number
  getFrameAtTime: (timeMs: number) => HTMLCanvasElement
}

const sourceToArrayBuffer = async (source: string): Promise<ArrayBuffer> => {
  if (!source.startsWith('data:')) {
    const response = await fetch(source)
    if (!response.ok) {
      throw new Error('Failed to load GIF source.')
    }
    return await response.arrayBuffer()
  }

  const commaIndex = source.indexOf(',')
  if (commaIndex < 0) {
    throw new Error('Invalid GIF data URL.')
  }

  const base64 = source.slice(commaIndex + 1)
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

const clampDelayMs = (delayMs: number) => {
  if (!Number.isFinite(delayMs)) return MIN_GIF_DELAY_MS
  return Math.max(MIN_GIF_DELAY_MS, Math.round(delayMs))
}

const toFrameDelayMs = (frame: ParsedFrame) => {
  return clampDelayMs(frame.delay)
}

const clearRectOnRgba = (
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  rectWidth: number,
  rectHeight: number
) => {
  for (let yy = y; yy < y + rectHeight; yy += 1) {
    if (yy < 0 || yy >= height) continue
    for (let xx = x; xx < x + rectWidth; xx += 1) {
      if (xx < 0 || xx >= width) continue
      const idx = (yy * width + xx) * 4
      rgba[idx] = 0
      rgba[idx + 1] = 0
      rgba[idx + 2] = 0
      rgba[idx + 3] = 0
    }
  }
}

const applyPatchOnRgba = (
  rgba: Uint8ClampedArray,
  frame: ParsedFrame,
  canvasWidth: number,
  canvasHeight: number
) => {
  const { left, top, width, height } = frame.dims
  const patch = frame.patch
  for (let y = 0; y < height; y += 1) {
    const destY = top + y
    if (destY < 0 || destY >= canvasHeight) continue
    for (let x = 0; x < width; x += 1) {
      const destX = left + x
      if (destX < 0 || destX >= canvasWidth) continue

      const patchIdx = (y * width + x) * 4
      const alpha = patch[patchIdx + 3]
      if (alpha === 0) continue

      const destIdx = (destY * canvasWidth + destX) * 4
      rgba[destIdx] = patch[patchIdx]
      rgba[destIdx + 1] = patch[patchIdx + 1]
      rgba[destIdx + 2] = patch[patchIdx + 2]
      rgba[destIdx + 3] = alpha
    }
  }
}

const getFrameIndexAtTime = (delaysMs: number[], durationMs: number, timeMs: number) => {
  if (delaysMs.length <= 1 || durationMs <= 0) return 0
  const normalized = ((timeMs % durationMs) + durationMs) % durationMs
  let acc = 0
  for (let i = 0; i < delaysMs.length; i += 1) {
    acc += delaysMs[i]
    if (normalized < acc) {
      return i
    }
  }
  return delaysMs.length - 1
}

export const decodeGifSourceToFrames = async (source: string): Promise<DecodedGifFrames> => {
  const arrayBuffer = await sourceToArrayBuffer(source)
  const parsed = parseGIF(arrayBuffer)
  const parsedFrames = decompressFrames(parsed, true)
  if (!parsedFrames.length) {
    throw new Error('GIF has no decodable frames.')
  }

  const width = parsed.lsd.width
  const height = parsed.lsd.height
  const composed = new Uint8ClampedArray(width * height * 4)
  const canvases: HTMLCanvasElement[] = []
  const delaysMs: number[] = []

  for (let i = 0; i < parsedFrames.length; i += 1) {
    const frame = parsedFrames[i]
    const previousForRestore = frame.disposalType === 3 ? new Uint8ClampedArray(composed) : null

    applyPatchOnRgba(composed, frame, width, height)

    const outputCanvas = document.createElement('canvas')
    outputCanvas.width = width
    outputCanvas.height = height
    const outputCtx = outputCanvas.getContext('2d')
    if (!outputCtx) {
      throw new Error('Canvas is not supported.')
    }
    outputCtx.putImageData(new ImageData(new Uint8ClampedArray(composed), width, height), 0, 0)
    canvases.push(outputCanvas)
    delaysMs.push(toFrameDelayMs(frame))

    if (frame.disposalType === 2) {
      clearRectOnRgba(composed, width, height, frame.dims.left, frame.dims.top, frame.dims.width, frame.dims.height)
    } else if (frame.disposalType === 3 && previousForRestore) {
      composed.set(previousForRestore)
    }
  }

  const durationMs = delaysMs.reduce((sum, delay) => sum + delay, 0)
  return {
    frames: canvases,
    delaysMs,
    durationMs,
    width,
    height,
    getFrameAtTime: (timeMs: number) => {
      const index = getFrameIndexAtTime(delaysMs, durationMs, timeMs)
      return canvases[index]
    },
  }
}
