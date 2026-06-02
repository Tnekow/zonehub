import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { badgesCatalog } from '../../data/badges'
import type { BadgeEntry } from '../../data/badges'
import { XMarkIcon } from '@heroicons/react/24/solid'
import { useTitleBorder } from '../../hooks/useTitleBorder'
import { useI18n } from '../../hooks/useI18n'
import SafeImage from '../common/SafeImage'

type Selection = { color: string; name: string; level: number; image?: string }

export default function BadgePicker({
  isOpen,
  onClose,
  onApply,
  initialColor,
}: {
  isOpen: boolean
  onClose: () => void
  onApply: (sel: Selection) => void
  initialColor?: string
}) {
  const titleBorderStyle = useTitleBorder()
  const { t } = useI18n()
  const normalizeColor = (name: string) => name.replace(/\s*\[\d+\]\s*$/, '').trim()
  const aggregated = useMemo(() => {
    const map = new Map<string, BadgeEntry[]>()
    for (const grp of badgesCatalog.colors) {
      const key = normalizeColor(grp.color)
      const arr = map.get(key) || []
      const merged = arr.concat(grp.badges)
      const unique: BadgeEntry[] = []
      const seen = new Set<string>()
      for (const b of merged) {
        const name = (b?.name || '').trim()
        if (!seen.has(name)) {
          seen.add(name)
          unique.push(b)
        }
      }
      map.set(key, unique)
    }
    return Array.from(map.entries()).map(([label, badges]) => ({ label, badges }))
  }, [])
  const initialIndex = Math.max(0, aggregated.findIndex(c => c.label === (initialColor || aggregated[0]?.label)))
  const [active, setActive] = useState(initialIndex)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<Selection | null>(null)
  const [visible, setVisible] = useState(40)
  const listRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const list = useMemo(() => {
    const group = aggregated[active]
    if (!group) return [] as BadgeEntry[]
    const base = group.badges
    const filtered = !q.trim() ? base : base.filter(b => b.name.toLowerCase().includes(q.trim().toLowerCase()))
    return filtered.slice(0, visible)
  }, [aggregated, active, q, visible])

  const handleScroll = () => {
    const el = listRef.current
    if (!el) return
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 24
    if (nearBottom) setVisible(v => Math.min(v + 40, (aggregated[active]?.badges.length || 0)))
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    inputRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    // 重置滚动与可见数量，避免残留导致越界显示
    const total = aggregated[active]?.badges.length || 0
    setVisible(Math.min(40, total))
    if (listRef.current) listRef.current.scrollTop = 0
  }, [active, aggregated])

  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [isOpen])

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-[720px] max-w-[90vw] max-h-[80vh] bg-steam-card backdrop-blur-steam-card border border-white/10 rounded-xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="text-steam-textPrimary font-semibold">{t('badgePicker:title')}</div>
          <button aria-label={t('common:buttons.close')} onClick={onClose} className="p-1 rounded hover:bg-steam-secondary">
            <XMarkIcon className="w-5 h-5 text-steam-textPrimary" />
          </button>
        </div>
        <div className="px-5 py-3 flex items-center gap-3 overflow-x-auto">
          {aggregated.map((c, i) => (
            <button
              key={c.label}
              onClick={() => {
                setActive(i)
                setSel(null)
                setQ('')
                const total = aggregated[i]?.badges.length || 0
                setVisible(Math.min(40, total))
              }}
              className={`inline-flex items-center px-3 py-2 rounded-md text-sm whitespace-nowrap ${i === active ? 'bg-steam-primary text-white' : 'bg-steam-profileEditButton text-steam-textPrimary hover:bg-steam-secondary'}`}
              style={titleBorderStyle}
            >
              <span className="leading-none">{c.label}</span>
              <span className="ml-2 text-xs opacity-80 leading-none">[{c.badges.length}]</span>
            </button>
          ))}
          <div className="flex-1" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={t('badgePicker:searchPlaceholder')}
            className="bg-steam-border text-steam-textPrimary border border-steam-secondary-border rounded px-3 py-2 text-sm w-[240px]"
            ref={inputRef}
          />
        </div>
        <div className="px-5 pb-3">
          <div className="flex gap-4">
            {/* 左侧徽章网格 */}
            <div
              ref={listRef}
              onScroll={handleScroll}
              className="grid grid-cols-4 gap-3 max-h-[48vh] overflow-auto flex-1"
            >
              {list.map(b => {
                const levels = b.levels
                const preview = levels[0]
                const previewUrl = preview?.image || preview?.image_cdn || preview?.image_url || preview?.image_local
                const isSelected = sel?.name === b.name && sel?.color === aggregated[active].label
                return (
                  <button
                    key={b.name}
                    onClick={() => setSel({ color: aggregated[active].label, name: b.name, level: levels[0]?.level || 1, image: levels[0]?.image })}
                    onDoubleClick={() => {
                      const first = levels[0]
                      const img = first?.image || first?.image_cdn || first?.image_url || first?.image_local
                      onApply({ color: aggregated[active].label, name: b.name, level: first?.level || 1, image: img })
                      onClose()
                    }}
                    className={`text-left border border-steam-border rounded-lg p-3 hover:border-steam-primary transition-colors ${isSelected ? 'ring-1 ring-steam-primary' : ''}`}
                  >
                    <SafeImage src={previewUrl} alt={b.name} className="w-full h-24 object-cover rounded bg-steam-border" loading="lazy" />
                    <div className="mt-2 text-steam-textPrimary text-xs truncate" title={b.name}>{b.name}</div>
                  </button>
                )
              })}
            </div>
            {/* 右侧等级预览面板 */}
            <div className="w-[220px] border border-steam-border rounded-lg p-3 max-h-[48vh] overflow-auto">
              <div className="text-steam-textPrimary text-sm font-medium mb-2">{sel ? sel.name : '请选择徽章'}</div>
              {sel ? (
                <div className="flex flex-col gap-2">
                  {(aggregated[active]?.badges.find(b => b.name === sel.name)?.levels || []).map(lv => {
                    const img = lv.image || lv.image_cdn || lv.image_url || lv.image_local
                    const activeLv = lv.level === sel.level
                    return (
                      <button
                        key={`${sel.name}-preview-${lv.level}`}
                        onClick={() => setSel({ ...sel, level: lv.level, image: img })}
                        className={`flex items-center gap-2 border rounded-md p-2 ${activeLv ? 'border-steam-primary' : 'border-steam-border hover:border-steam-secondary-border'}`}
                      >
                        <SafeImage src={img} alt={`${sel.name} Lv.${lv.level}`} className="w-12 h-12 object-cover rounded bg-steam-border" />
                        <span className={`text-xs ${activeLv ? 'text-steam-primary' : 'text-steam-textPrimary'}`}>Lv.{lv.level}</span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="text-steam-textMuted text-xs">{t('badgePicker:previewEmpty')}</div>
              )}
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {sel?.image && <SafeImage src={sel.image} alt="预览" className="w-10 h-10 rounded" />}
            <div className="text-steam-textPrimary text-sm">{sel ? `${sel.name} · Lv.${sel.level}` : '未选择'}</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1 rounded bg-steam-profileEditButton text-steam-textPrimary hover:bg-steam-secondary" style={titleBorderStyle}>{t('common:buttons.cancel')}</button>
            <button
              onClick={() => { if (sel) { onApply(sel); onClose() } }}
              disabled={!sel}
              className={`px-3 py-1 rounded ${sel ? 'bg-steam-profileEditButton text-steam-textPrimary hover:bg-steam-secondary' : 'bg-steam-profileEditButton text-steam-textPrimary cursor-not-allowed'}`}
              style={titleBorderStyle}
            >{t('common:common.apply')}</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
