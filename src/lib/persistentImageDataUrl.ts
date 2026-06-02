type FileToPersistentOptions = {
  maxWidth?: number
  maxHeight?: number
  quality?: number
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Failed to read file.'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image.'))
    img.src = src
  })
}

export async function fileToPersistentDataUrl(
  file: File,
  options: FileToPersistentOptions = {},
): Promise<string> {
  const source = await readFileAsDataUrl(file)
  const image = await loadImage(source)

  const maxWidth = options.maxWidth ?? 1400
  const maxHeight = options.maxHeight ?? 1400
  const quality = options.quality ?? 0.85

  const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height)
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas is unavailable.')
  }
  ctx.drawImage(image, 0, 0, width, height)

  return canvas.toDataURL('image/jpeg', quality)
}
