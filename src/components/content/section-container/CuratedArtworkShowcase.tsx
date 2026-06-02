import React, { useMemo, useRef } from 'react'
import SectionContainer from '../../common/SectionContainer'
import useLocalStorage from '../../../hooks/useLocalStorage'
import { useI18n } from '../../../hooks/useI18n'
import SafeImage from '../../common/SafeImage'
import { fileToPersistentDataUrl } from '../../../lib/persistentImageDataUrl'

type CuratedArtworkData = {
  imageUrl: string | null
}

interface CuratedArtworkShowcaseProps {
  /** Component instance id (used for persistence) */
  componentId: string
  className?: string
  // drag & edit props (follow existing components conventions)
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDragEnter?: (e: React.DragEvent) => void
  onDragLeave?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  isEditMode?: boolean
  onDelete?: () => void
  isDragging?: boolean
  isDragOver?: boolean
}

const OUTER_INNER_GAP_PX = 10

export default function CuratedArtworkShowcase(props: CuratedArtworkShowcaseProps) {
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

  const storageKey = `steamzone_curatedArtwork_${componentId}`
  const [data, setData] = useLocalStorage<CuratedArtworkData>(storageKey, { imageUrl: null })

  const fileRef = useRef<HTMLInputElement | null>(null)

  const titleLabel = useMemo(() => {
    // Prefer i18n keys; fallback for safety
    return i18n.language?.startsWith('zh')
      ? (t('navigation:editMode.curatedArtworkShowcase') || '精选艺术展柜')
      : (t('navigation:editMode.curatedArtworkShowcase') || 'Featured Artwork Showcase')
  }, [i18n.language, t])

  const uploadLabel = useMemo(() => {
    return t('navigation:editMode.upload') || (i18n.language?.startsWith('zh') ? '上传' : 'Upload')
  }, [i18n.language, t])

  const handlePickFile = () => fileRef.current?.click()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Only image files are allowed.')
      return
    }
    try {
      const result = await fileToPersistentDataUrl(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.82 })
      setData({ imageUrl: result || null })
    } catch (error) {
      console.error(error)
      alert('Image processing failed.')
    }
  }

  const clearImage = () => setData({ imageUrl: null })

  return (
    <div className="relative">
      <SectionContainer
        title={titleLabel}
        // Requirement: in "preview mode" (non-edit), do not show title bar.
        hideTitleBar={!isEditMode}
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
        {/* Double border frame: outer border + 10px gap + inner border */}
        <div
          className="w-full border border-steam-border bg-steam-item-in"
          style={{ padding: `${OUTER_INNER_GAP_PX}px` }}
        >
          {/* Click-to-upload area (empty or with image) */}
          <div className="relative">
            <button
              type="button"
              className="w-full border border-steam-border bg-black/20 block text-left"
              onClick={handlePickFile}
              title={uploadLabel}
              style={{ cursor: 'pointer' }}
            >
              {data.imageUrl ? (
                <SafeImage
                  src={data.imageUrl}
                  alt="Curated artwork"
                  className="block"
                  style={{
                    maxWidth: '100%',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain',
                    display: 'block',
                    margin: '0 auto',
                  }}
                  draggable={false}
                />
              ) : (
                <div className="w-full py-10 text-center text-steam-textMuted text-sm hover:text-steam-textPrimary transition-colors">
                  {uploadLabel}
                </div>
              )}
            </button>
            {isEditMode && data.imageUrl && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); clearImage(); }}
                className="absolute bottom-2 right-2 px-2 py-1 bg-red-600/90 hover:bg-red-600 text-white rounded text-xs transition-colors"
                title={i18n.language?.startsWith('zh') ? '移除图片' : 'Remove image'}
              >
                ×
              </button>
            )}
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </SectionContainer>
    </div>
  )
}


