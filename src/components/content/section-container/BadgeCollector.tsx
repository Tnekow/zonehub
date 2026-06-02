import React, { Suspense, useMemo, useState } from 'react'
import SectionContainer from '../../common/SectionContainer'
import useLocalStorage from '../../../hooks/useLocalStorage'
import { useI18n } from '../../../hooks/useI18n'
import { lazyWithRetry } from '../../../lib/lazyWithRetry'
import SafeImage from '../../common/SafeImage'

const BadgePicker = lazyWithRetry(() => import('../../profile/BadgePicker'))

type LayoutType = '1x6' | '2x6'

interface BadgeSlot {
  name?: string
  image?: string
  level?: number
}

interface BadgeCollectorProps {
  layout?: LayoutType
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

const DEFAULT_LAYOUT: LayoutType = '1x6'

const BadgeCollector: React.FC<BadgeCollectorProps> = ({
  layout = DEFAULT_LAYOUT,
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
}) => {
  const { t } = useI18n()
  const slotsCount = layout === '1x6' ? 6 : 12
  const storageKey = `steamzone_badgeCollector_${layout}`
  const [slots, setSlots] = useLocalStorage<BadgeSlot[]>(storageKey, Array.from({ length: slotsCount }, () => ({ })))
  const [pickerOpenIndex, setPickerOpenIndex] = useState<number | null>(null)

  const totalSelected = useMemo(() => slots.filter(s => !!s.image).length, [slots])

  // Editable counters persisted per layout
  const [counters, setCounters] = useLocalStorage<{ total: number; cards: number }>(
    `${storageKey}_counters`,
    { total: totalSelected, cards: totalSelected }
  )
  const [editing, setEditing] = useState<{ total: boolean; cards: boolean }>({ total: false, cards: false })

  const handleApplySelection = (sel: { name: string, level: number, image?: string }) => {
    if (pickerOpenIndex === null) return
    const next = [...slots]
    next[pickerOpenIndex] = { name: sel.name, level: sel.level, image: sel.image }
    setSlots(next)
    setPickerOpenIndex(null)
  }

  const saveCounter = (key: 'total' | 'cards', value: number) => {
    setCounters(prev => ({ ...prev, [key]: Math.max(0, Number.isFinite(value) ? value : 0) }))
    setEditing(prev => ({ ...prev, [key]: false }))
  }

  const gridClass = layout === '1x6' ? 'grid grid-cols-6 gap-3' : 'grid grid-cols-6 gap-3'
  const rows = layout === '1x6' ? 1 : 2

  return (
    <SectionContainer
      title={t('navigation:editMode.badgeCollector')}
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
      <div className={`flex flex-col ${rows === 2 ? 'space-y-3' : ''}`}>
        {/* 展柜网格：尽量贴近 Steam Badge Collector 上层视觉 */}
        <div className="bg-steam-item border border-steam-border px-4 py-5">
          <div className={gridClass}>
          {slots.map((slot, idx) => (
            <button
              key={idx}
              className={`relative border border-steam-border bg-steam-item-in h-20 flex items-center justify-center hover:border-steam-primary transition-colors`}
              onClick={() => setPickerOpenIndex(idx)}
              title={slot.name || 'Pick a badge'}
            >
              {slot.image ? (
                <SafeImage src={slot.image} alt={slot.name} className="w-full h-full object-cover" />
              ) : (
                <div className="text-steam-textMuted text-xs">Select</div>
              )}
            </button>
          ))}
          </div>
        </div>

        {/* 统计区：对齐 Steam Badge Collector 下层大数字布局 */}
        <div className="bg-[#101822] border border-steam-border px-5 py-4 grid grid-cols-2 gap-6">
          <div className="border-r border-steam-border pr-5">
            {editing.total ? (
              <input
                type="number"
                className="bg-steam-border text-steam-textPrimary border border-steam-secondary-border rounded px-2 py-1 text-2xl w-24"
                defaultValue={counters.total}
                autoFocus
                onBlur={(e) => saveCounter('total', parseInt(e.currentTarget.value || '0'))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveCounter('total', parseInt((e.currentTarget as HTMLInputElement).value || '0'))
                  if (e.key === 'Escape') setEditing(prev => ({ ...prev, total: false }))
                }}
              />
            ) : (
              <button className="text-steam-textPrimary text-2xl md:text-4xl leading-none" onClick={() => setEditing(prev => ({ ...prev, total: true }))}>{counters.total}</button>
            )}
            <div className="text-steam-textSecondary text-sm md:text-xl leading-snug mt-2">{t('badgeCollector:totalOwned')}</div>
          </div>
          <div className="pl-1">
            {editing.cards ? (
              <input
                type="number"
                className="bg-steam-border text-steam-textPrimary border border-steam-secondary-border rounded px-2 py-1 text-2xl w-24"
                defaultValue={counters.cards}
                autoFocus
                onBlur={(e) => saveCounter('cards', parseInt(e.currentTarget.value || '0'))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveCounter('cards', parseInt((e.currentTarget as HTMLInputElement).value || '0'))
                  if (e.key === 'Escape') setEditing(prev => ({ ...prev, cards: false }))
                }}
              />
            ) : (
              <button className="text-steam-textPrimary text-2xl md:text-4xl leading-none" onClick={() => setEditing(prev => ({ ...prev, cards: true }))}>{counters.cards}</button>
            )}
            <div className="text-steam-textSecondary text-sm md:text-xl leading-snug mt-2">{t('badgeCollector:gameCardBadges')}</div>
          </div>
        </div>
      </div>

      {/* Picker modal */}
      {pickerOpenIndex !== null && (
        <Suspense fallback={null}>
          <BadgePicker
            isOpen={pickerOpenIndex !== null}
            onClose={() => setPickerOpenIndex(null)}
            onApply={handleApplySelection}
          />
        </Suspense>
      )}
    </SectionContainer>
  )
}

export default BadgeCollector