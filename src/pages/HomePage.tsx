// src/pages/HomePage.tsx
// Home-only: Steam profile renderer and all related heavy dependencies.
// This module is lazy-loaded to reduce initial bundle size.

import {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useMemo,
  useCallback,
  Suspense,
} from 'react'
import { useLocation } from 'react-router-dom'
import { isDesktopRoute } from '../lib/desktopRouting'
import { useDesktopOutletContext } from '../hooks/useDesktopOutletContext'
import { useI18n } from '../hooks/useI18n'
import useMeta from '../hooks/useMeta'
import { useTitleBorder } from '../hooks/useTitleBorder'
import { useBatchLocalStorage } from '../hooks/useBatchLocalStorage'
import { lazyWithRetry } from '../lib/lazyWithRetry'
import { trackMilestoneByEvent } from '../lib/localMilestones'
import { profileHeader as initialProfileHeader } from '../data/profile'
import { friends } from '../data/friends'
import type { BackgroundConfig } from '../data/background'
import type { Profile } from '../data/profile'
import type { UserStatusData } from '../components/content/independent/UserStatus'
import i18n from '../locales'

// 首屏可见 — 保持同步加载
import ProfileHeader from '../components/profile/ProfileHeader'
import UserStatus from '../components/content/independent/UserStatus'
import GameItem from '../components/content/sidebar-item/GameItem'
import InventoryItem from '../components/content/sidebar-item/InventoryItem'
import ScreenshotItem from '../components/content/sidebar-item/ScreenshotItem'
import VideoItem from '../components/content/sidebar-item/VideoItem'
import WorkshopItem from '../components/content/sidebar-item/WorkshopItem'
import ReviewItem from '../components/content/sidebar-item/ReviewItem'
import GuideItem from '../components/content/sidebar-item/GuideItem'
import ArtworkItem from '../components/content/sidebar-item/ArtworkItem'
// 展柜/重型组件 — lazy load 拆分 chunk（带部署刷新重试）
const WorkshopShowcase = lazyWithRetry(() => import('../components/content/section-container/WorkshopShowcase'))
const RecentGames = lazyWithRetry(() => import('../components/content/section-container/RecentGames'))
const CommentBoard = lazyWithRetry(() => import('../components/content/section-container/CommentBoard'))
const CustomSection = lazyWithRetry(() => import('../components/content/section-container/CustomSection'))
const FeaturedArtworkShowcase = lazyWithRetry(() => import('../components/content/section-container/FeaturedArtworkShowcase'))
const CuratedArtworkShowcase = lazyWithRetry(() => import('../components/content/section-container/CuratedArtworkShowcase'))
const BadgeCollector = lazyWithRetry(() => import('../components/content/section-container/BadgeCollector'))
const CollectedGuideShowcase = lazyWithRetry(() => import('../components/content/section-container/CollectedGuideShowcase'))
const FriendsList = lazyWithRetry(() => import('../components/content/datalist-item/FriendsItem'))

type EditableComponentType =
  | 'workshopShowcase'
  | 'recentGames'
  | 'customSection'
  | 'featuredArtworkShowcase'
  | 'curatedArtworkShowcase'
  | 'badgeCollector'
  | 'collectedGuideShowcase'
type EditableComponentMeta = {
  layout?: '1x6' | '2x6'
  [key: string]: unknown
}

interface EditableComponent {
  id: string
  type: EditableComponentType
  order: number
  meta?: EditableComponentMeta
}

export interface HomePageProps {
  background: BackgroundConfig
  backgroundTopOffsetPx: number
  isEditMode: boolean
  setIsEditMode: (v: boolean) => void
}

export interface HomePageRef {
  homepageRef: React.RefObject<HTMLDivElement | null>
}

const SectionSkeleton = () => (
  <div className="w-full h-24 bg-steam-card/40 rounded animate-pulse" />
)

const HomePage = forwardRef<HomePageRef, HomePageProps>(function HomePage(props, ref) {
  const { background, backgroundTopOffsetPx, isEditMode } = props
  const { t } = useI18n()
  const titleBorderStyle = useTitleBorder()
  useMeta({
    title: t('hero:seo.homeTitle'),
    description: t('hero:seo.homeDescription'),
  })
  const location = useLocation()
  const homepageRef = useRef<HTMLDivElement | null>(null)

  useImperativeHandle(ref, () => ({ homepageRef }), [])

  // Home-only state - 批量读取 localStorage 以减少同步阻塞
  const storage = useBatchLocalStorage({
    profileHeader: { storageKey: 'steamzone_profile', defaultValue: initialProfileHeader },
    customNickname: { storageKey: 'steamzone_customNickname', defaultValue: null as string | null },
    userStatus: { storageKey: 'steamzone_userStatus', defaultValue: { isOnline: false, lastOnlineDays: 12 } as UserStatusData },
    sidebarCounts: {
      storageKey: 'steamzone_sidebarCounts',
      defaultValue: {
        games: 156,
        inventory: 89,
        screenshots: 234,
        videos: 12,
        workshop: 45,
        reviews: 8,
        guides: 3,
        artwork: 67,
      },
    },
    editableComponents: {
      storageKey: 'steamzone_editableComponents',
      defaultValue: [
        { id: 'workshopShowcase', type: 'workshopShowcase' as EditableComponentType, order: 0 },
        { id: 'recentGames', type: 'recentGames' as EditableComponentType, order: 1 },
      ] as EditableComponent[],
    },
  })

  const [profileHeader, setProfileHeader] = storage.profileHeader
  const [customNickname, setCustomNickname] = storage.customNickname
  const [userStatus, setUserStatus] = storage.userStatus
  const [sidebarCounts, setSidebarCounts] = storage.sidebarCounts
  const [editableComponents, setEditableComponents] = storage.editableComponents
  const [friendsList] = useState(friends)
  const [draggedComponent, setDraggedComponent] = useState<string | null>(null)
  const [dragOverComponent, setDragOverComponent] = useState<string | null>(null)
  /** 用 ref 保存当前悬停目标，drop 时同步读取，避免 React 状态未 flush 导致 adjacent 交换失败（尤其 Electron） */
  const dragOverComponentRef = useRef<string | null>(null)
  /** 用 ref 保存拖拽源，避免 dragend 提前清空 state 影响 drop（Electron 下更常见） */
  const draggedComponentRef = useRef<string | null>(null)
  const dropInProgressRef = useRef(false)
  const [showAddComponentMenu, setShowAddComponentMenu] = useState(false)
  const [artworkShowcaseRefreshKey, setArtworkShowcaseRefreshKey] = useState(0)

  useEffect(() => {
    const seen = new Set<string>()
    const hasDuplicate = editableComponents.some((component) => {
      if (seen.has(component.id)) return true
      seen.add(component.id)
      return false
    })
    if (!hasDuplicate) return

    setEditableComponents((prev) => {
      const used = new Set<string>()
      let changed = false
      const next = prev.map((component) => {
        if (!used.has(component.id)) {
          used.add(component.id)
          return component
        }

        changed = true
        let repairedId = `${component.type}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
        while (used.has(repairedId)) {
          repairedId = `${component.type}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
        }
        used.add(repairedId)
        return { ...component, id: repairedId }
      })
      return changed ? next : prev
    })
  }, [editableComponents, setEditableComponents])

  const handleProfileChange = useCallback((data: Partial<Profile>) => {
    setProfileHeader((prev) => ({
      ...prev,
      ...data,
      badge: { ...prev.badge, ...data.badge },
    }))
  }, [setProfileHeader])

  const handleDeleteComponent = useCallback((componentId: string) => {
    setEditableComponents((prev) => prev.filter((comp) => comp.id !== componentId))
  }, [setEditableComponents])

  // Memoize sortedComponents before it's used in handlers
  const sortedComponents = useMemo(
    () => [...editableComponents].sort((a, b) => a.order - b.order),
    [editableComponents]
  )

  const handleReorderComponents = useCallback((fromIndex: number, toIndex: number) => {
    setEditableComponents((prev) => {
      // IMPORTANT: fromIndex/toIndex 是基于 order 排序后的索引，必须对 prev 先按 order 排序再 splice
      const ordered = [...prev].sort((a, b) => a.order - b.order)
      const [movedComponent] = ordered.splice(fromIndex, 1)
      ordered.splice(toIndex, 0, movedComponent)
      return ordered.map((comp, index) => ({ ...comp, order: index }))
    })
  }, [setEditableComponents])

  const getAvailableComponentTypes = useCallback((): EditableComponentType[] => {
    const existingTypes = editableComponents.map((comp) => comp.type)
    const allTypes: EditableComponentType[] = [
      'workshopShowcase',
      'recentGames',
      'customSection',
      'featuredArtworkShowcase',
      'curatedArtworkShowcase',
      'collectedGuideShowcase',
    ]
    return allTypes.filter((type) => !existingTypes.includes(type))
  }, [editableComponents])

  const handleAddComponent = useCallback((type: EditableComponentType, meta?: EditableComponentMeta) => {
    let added = false
    setEditableComponents((prev) => {
      const isDuplicate =
        type === 'badgeCollector'
          ? prev.some(
              (c) =>
                c.type === 'badgeCollector' &&
                (c.meta?.layout ?? null) === (meta?.layout ?? null),
            )
          : prev.some((c) => c.type === type)

      if (isDuplicate) return prev

      // 使用随机后缀规避 Date.now() 同毫秒碰撞，并在当前列表内再做一次兜底去重。
      const randomSuffix =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID().slice(0, 8)
          : Math.random().toString(36).slice(2, 10)
      let newId = `${type}_${Date.now()}_${randomSuffix}`
      while (prev.some((c) => c.id === newId)) {
        const retrySuffix = Math.random().toString(36).slice(2, 10)
        newId = `${type}_${Date.now()}_${retrySuffix}`
      }

      added = true
      const newComponent: EditableComponent = { id: newId, type, order: prev.length, meta }
      return [...prev, newComponent]
    })

    if (added) {
      trackMilestoneByEvent('desktop.showcase.added.first_time')
      if (type === 'collectedGuideShowcase') {
        trackMilestoneByEvent('desktop.collected_guide_showcase.created.first_time')
      }
      window.dispatchEvent(new CustomEvent('zonehub:tutorial-showcase-added'))
    }
    setShowAddComponentMenu(false)
  }, [setEditableComponents])

  const handleDragStart = useCallback((e: React.DragEvent, componentId: string) => {
    dropInProgressRef.current = false
    draggedComponentRef.current = componentId
    setDraggedComponent(componentId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', componentId)
    e.dataTransfer.setData('application/x-zonehub-section', componentId)
  }, [])
  const handleDragEnd = useCallback(() => {
    if (!dropInProgressRef.current) {
      const draggedId = draggedComponentRef.current
      const overId = dragOverComponentRef.current
      if (draggedId && overId && draggedId !== overId) {
        const fromIndex = sortedComponents.findIndex((comp) => comp.id === draggedId)
        const toIndex = sortedComponents.findIndex((comp) => comp.id === overId)
        if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
          handleReorderComponents(fromIndex, toIndex)
          // 仅在真实重排后触发 Artwork 刷新，避免多余重算
          setArtworkShowcaseRefreshKey((prev) => prev + 1)
        }
      }
    }
    draggedComponentRef.current = null
    dragOverComponentRef.current = null
    setDraggedComponent(null)
    setDragOverComponent(null)
    dropInProgressRef.current = false
  }, [sortedComponents, handleReorderComponents])

  /** section 级别的 dragOver：确保整个 section（含 gap 边缘）都是有效 drop 区 */
  const handleSectionDragOver = useCallback((e: React.DragEvent, componentId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const srcId = draggedComponentRef.current
    if (srcId && srcId !== componentId) {
      // 仅在目标变化时更新 state，减少 dragover 高频渲染
      if (dragOverComponentRef.current !== componentId) {
        dragOverComponentRef.current = componentId
        setDragOverComponent(componentId)
      }
    }
  }, [])

  /** section 级别的 drop：直接执行重排 */
  const handleSectionDrop = useCallback((e: React.DragEvent, targetComponentId: string) => {
    e.preventDefault()
    e.stopPropagation()
    dropInProgressRef.current = true
    // 优先从 ref 读取；回退从 dataTransfer 读取（防止嵌套 draggable 导致 ref 未设置）
    const draggedId = draggedComponentRef.current
      || e.dataTransfer.getData('application/x-zonehub-section')
      || null
    if (draggedId && draggedId !== targetComponentId) {
      const fromIndex = sortedComponents.findIndex((comp) => comp.id === draggedId)
      const toIndex = sortedComponents.findIndex((comp) => comp.id === targetComponentId)
      if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
        handleReorderComponents(fromIndex, toIndex)
        // 仅在真实重排后触发 Artwork 刷新，避免多余重算
        setArtworkShowcaseRefreshKey((prev) => prev + 1)
      }
    }
  }, [sortedComponents, handleReorderComponents])

  const renderEditableComponent = (component: EditableComponent) => {
    const isDragging = draggedComponent === component.id
    const isDragOver = dragOverComponent === component.id

    let inner: React.ReactNode = null

    switch (component.type) {
      case 'workshopShowcase':
        inner = (
          <WorkshopShowcase
            customNickname={customNickname}
            draggable={effectiveIsEditMode}
            onDragStart={(e: React.DragEvent) => handleDragStart(e, component.id)}
            onDragEnd={handleDragEnd}
            isEditMode={effectiveIsEditMode}
            onDelete={() => handleDeleteComponent(component.id)}
            isDragging={isDragging}
            isDragOver={isDragOver}
          />
        )
        break
      case 'recentGames':
        inner = (
          <RecentGames
            draggable={effectiveIsEditMode}
            onDragStart={(e: React.DragEvent) => handleDragStart(e, component.id)}
            onDragEnd={handleDragEnd}
            isEditMode={effectiveIsEditMode}
            onDelete={() => handleDeleteComponent(component.id)}
            isDragging={isDragging}
            isDragOver={isDragOver}
          />
        )
        break
      case 'customSection':
        inner = (
          <CustomSection
            id={component.id}
            draggable={effectiveIsEditMode}
            onDragStart={(e: React.DragEvent) => handleDragStart(e, component.id)}
            onDragEnd={handleDragEnd}
            isEditMode={effectiveIsEditMode}
            onDelete={() => handleDeleteComponent(component.id)}
            isDragging={isDragging}
            isDragOver={isDragOver}
          />
        )
        break
      case 'featuredArtworkShowcase':
        inner = (
          <div
            className={`w-full flex flex-col ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-2 border-blue-400 border-dashed' : ''}`}
            draggable={effectiveIsEditMode}
            onDragStart={(e: React.DragEvent) => handleDragStart(e, component.id)}
            onDragEnd={handleDragEnd}
          >
            <FeaturedArtworkShowcase
              componentId={component.id}
              refreshKey={artworkShowcaseRefreshKey}
              isEditMode={effectiveIsEditMode}
              onDelete={effectiveIsEditMode ? () => handleDeleteComponent(component.id) : undefined}
              background={background}
              backgroundTopOffsetPx={backgroundTopOffsetPx}
            />
          </div>
        )
        break
      case 'curatedArtworkShowcase':
        inner = (
          <CuratedArtworkShowcase
            componentId={component.id}
            draggable={effectiveIsEditMode}
            onDragStart={(e: React.DragEvent) => handleDragStart(e, component.id)}
            onDragEnd={handleDragEnd}
            isEditMode={effectiveIsEditMode}
            onDelete={() => handleDeleteComponent(component.id)}
            isDragging={isDragging}
            isDragOver={isDragOver}
          />
        )
        break
      case 'badgeCollector':
        inner = (
          <div
            className={`w-full flex flex-col ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-2 border-blue-400 border-dashed' : ''}`}
            draggable={effectiveIsEditMode}
            onDragStart={(e: React.DragEvent) => handleDragStart(e, component.id)}
            onDragEnd={handleDragEnd}
          >
            <BadgeCollector
              layout={component.meta?.layout ?? '1x6'}
              isEditMode={effectiveIsEditMode}
              onDelete={() => handleDeleteComponent(component.id)}
              isDragging={isDragging}
              isDragOver={isDragOver}
            />
          </div>
        )
        break
      case 'collectedGuideShowcase':
        inner = (
          <CollectedGuideShowcase
            componentId={component.id}
            draggable={effectiveIsEditMode}
            onDragStart={(e: React.DragEvent) => handleDragStart(e, component.id)}
            onDragEnd={handleDragEnd}
            isEditMode={effectiveIsEditMode}
            onDelete={() => handleDeleteComponent(component.id)}
            isDragging={isDragging}
            isDragOver={isDragOver}
          />
        )
        break
      default:
        return null
    }

    return (
      <Suspense fallback={<SectionSkeleton />}>
        {inner}
      </Suspense>
    )
  }

  const inDesktopShell = isDesktopRoute(location.pathname)
  const { desktopCanvasMode } = useDesktopOutletContext()
  const effectiveIsEditMode = inDesktopShell ? desktopCanvasMode === 'edit' : isEditMode

  const sidebarUserStatus = (
    <UserStatus status={userStatus} onChange={(status) => setUserStatus(status)} />
  )

  const sidebarWidgetsColumn = (
    <div className="flex flex-col gap-4">
      <section>
        <div className="flex flex-col gap-1">
          <GameItem
            count={sidebarCounts.games}
            onCountChange={(count) => setSidebarCounts((prev) => ({ ...prev, games: count }))}
            onClick={() => {}}
          />
          <InventoryItem
            count={sidebarCounts.inventory}
            onCountChange={(count) => setSidebarCounts((prev) => ({ ...prev, inventory: count }))}
            onClick={() => {}}
          />
          <ScreenshotItem
            count={sidebarCounts.screenshots}
            onCountChange={(count) => setSidebarCounts((prev) => ({ ...prev, screenshots: count }))}
            onClick={() => {}}
          />
          <VideoItem
            count={sidebarCounts.videos}
            onCountChange={(count) => setSidebarCounts((prev) => ({ ...prev, videos: count }))}
            onClick={() => {}}
          />
          <WorkshopItem
            count={sidebarCounts.workshop}
            onCountChange={(count) => setSidebarCounts((prev) => ({ ...prev, workshop: count }))}
            onClick={() => {}}
          />
          <ReviewItem
            count={sidebarCounts.reviews}
            onCountChange={(count) => setSidebarCounts((prev) => ({ ...prev, reviews: count }))}
            onClick={() => {}}
          />
          <GuideItem
            count={sidebarCounts.guides}
            onCountChange={(count) => setSidebarCounts((prev) => ({ ...prev, guides: count }))}
            onClick={() => {}}
          />
          <ArtworkItem
            count={sidebarCounts.artwork}
            onCountChange={(count) => setSidebarCounts((prev) => ({ ...prev, artwork: count }))}
            onClick={() => {}}
          />
        </div>
      </section>
      <section>
        <Suspense fallback={<SectionSkeleton />}>
          <FriendsList friends={friendsList} onFriendClick={() => {}} />
        </Suspense>
      </section>
    </div>
  )

  const sidebarColumn = (
    <div className="flex flex-col gap-4">
      <section>{sidebarUserStatus}</section>
      {sidebarWidgetsColumn}
    </div>
  )

  return (
    <div
      className={`relative z-10 max-w-[940px] mx-auto pb-4 mt-0 ${
        inDesktopShell ? 'px-3 sm:px-5 md:px-6' : 'px-2 md:px-0'
      }`}
      ref={homepageRef}
    >
      <h1 className="sr-only">{t('hero:seo.homeH1')}</h1>
      <div className="grid grid-cols-1 md:grid-cols-10" data-profile-root>
        <div className="md:col-span-10 bg-steam-main-container backdrop-blur-steam-main-container">
          <div className="grid grid-cols-1 md:grid-cols-[632px_1fr]">
            <header className="md:col-span-full">
              <ProfileHeader
                avatar={profileHeader.avatar}
                nicknameKey={profileHeader.nicknameKey}
                level={profileHeader.level}
                descriptionKey={profileHeader.descriptionKey}
                badge={profileHeader.badge}
                onChange={handleProfileChange}
                customNickname={customNickname}
                onCustomNicknameChange={setCustomNickname}
              />
            </header>

            {/* Header 与主体内容之间的过渡条（结构位点，便于后续对齐 Steam 的 nav 区域） */}
            <div className="md:col-span-full border-t border-steam-border mt-1 mb-2" />

            <main className="flex flex-col">
              <div className="h-full border-l border-b border-steam-border bg-steam-card pt-3 pb-6 px-4 backdrop-blur-steam-card md:pt-5 md:pb-8 md:px-0">
                <div className="flex flex-col gap-[9px]">
                  {sortedComponents.map((component) => (
                    <section
                      key={component.id}
                      onDragOver={(e: React.DragEvent) => handleSectionDragOver(e, component.id)}
                      onDragEnter={(e: React.DragEvent) => handleSectionDragOver(e, component.id)}
                      onDrop={(e: React.DragEvent) => handleSectionDrop(e, component.id)}
                    >
                      {renderEditableComponent(component)}
                    </section>
                  ))}

                  {effectiveIsEditMode && (
                    <section>
                      <div className="relative">
                          <div className="rounded-lg border border-steam-border bg-steam-card p-6 backdrop-blur-steam-card">
                            <div className="flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => setShowAddComponentMenu(!showAddComponentMenu)}
                                className={`flex items-center space-x-2 rounded-lg px-4 py-2 transition-colors ${
                                  getAvailableComponentTypes().length === 0
                                    ? 'cursor-not-allowed bg-gray-500 text-gray-300'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                                disabled={getAvailableComponentTypes().length === 0}
                              >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                <span>{t('navigation:editMode.addComponent')}</span>
                              </button>
                            </div>
                            {showAddComponentMenu && (
                              <div className="mt-4 rounded-lg border border-steam-border bg-steam-item p-4">
                                <h3 className="mb-3 font-semibold text-steam-textPrimary">
                                  {t('navigation:editMode.selectComponentType')}
                                </h3>
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                  {getAvailableComponentTypes().map((type) => (
                                    <button
                                      key={type}
                                      type="button"
                                      onClick={() => handleAddComponent(type)}
                                      className="flex items-center space-x-2 rounded-lg bg-steam-card p-3 text-left transition-colors hover:bg-steam-item-in"
                                    >
                                      <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600">
                                        <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                                          />
                                        </svg>
                                      </div>
                                      <div>
                                        <div className="font-medium text-steam-textPrimary">
                                          {type === 'workshopShowcase' && t('navigation:editMode.workshopShowcase')}
                                          {type === 'recentGames' && t('navigation:editMode.recentGames')}
                                          {type === 'customSection' && t('navigation:editMode.customSection')}
                                          {type === 'featuredArtworkShowcase' &&
                                            (i18n.language?.startsWith('zh') ? '艺术展柜' : 'Artworkshowcase')}
                                          {type === 'curatedArtworkShowcase' && t('navigation:editMode.curatedArtworkShowcase')}
                                          {type === 'collectedGuideShowcase' &&
                                            (t('navigation:editMode.collectedGuideShowcaseRecord') || '收藏的指南（唱片）')}
                                        </div>
                                        <div className="text-sm text-steam-textMuted">
                                          {type === 'workshopShowcase' && t('navigation:editMode.workshopShowcaseDesc')}
                                          {type === 'recentGames' && t('navigation:editMode.recentGamesDesc')}
                                          {type === 'customSection' && t('navigation:editMode.customSectionDesc')}
                                          {type === 'featuredArtworkShowcase' &&
                                            (t('navigation:editMode.featuredArtworkShowcaseDesc') || '上传并展示一张艺术图片')}
                                          {type === 'curatedArtworkShowcase' &&
                                            (t('navigation:editMode.curatedArtworkShowcaseDesc') || '上传并展示一张精选艺术图片')}
                                          {type === 'collectedGuideShowcase' &&
                                            (t('navigation:editMode.collectedGuideShowcaseDesc') || '展示收藏的指南唱片卡片')}
                                        </div>
                                      </div>
                                    </button>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() => handleAddComponent('badgeCollector', { layout: '1x6' })}
                                    className="flex items-center space-x-2 rounded-lg bg-steam-card p-3 text-left transition-colors hover:bg-steam-item-in"
                                  >
                                    <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600">
                                      <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth="2"
                                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                                        />
                                      </svg>
                                    </div>
                                    <div>
                                      <div className="font-medium text-steam-textPrimary">
                                        {t('navigation:editMode.badgeCollector')} (1×6)
                                      </div>
                                      <div className="text-sm text-steam-textMuted">
                                        {t('navigation:editMode.badgeCollector1x6Desc')}
                                      </div>
                                    </div>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAddComponent('badgeCollector', { layout: '2x6' })}
                                    className="flex items-center space-x-2 rounded-lg bg-steam-card p-3 text-left transition-colors hover:bg-steam-item-in"
                                  >
                                    <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600">
                                      <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth="2"
                                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                                        />
                                      </svg>
                                    </div>
                                    <div>
                                      <div className="font-medium text-steam-textPrimary">
                                        {t('navigation:editMode.badgeCollector')} (2×6)
                                      </div>
                                      <div className="text-sm text-steam-textMuted">
                                        {t('navigation:editMode.badgeCollector2x6Desc')}
                                      </div>
                                    </div>
                                  </button>
                                </div>
                                {getAvailableComponentTypes().length === 0 && (
                                  <div className="py-4 text-center text-steam-textMuted">
                                    {t('navigation:editMode.allComponentsAdded')}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                      </div>
                    </section>
                  )}

                  <section>
                    <Suspense fallback={<SectionSkeleton />}>
                      <CommentBoard />
                    </Suspense>
                  </section>
                </div>
              </div>
            </main>

            <aside className="flex flex-col border-r border-b border-steam-border bg-steam-card px-2 py-4 backdrop-blur-steam-card">
              <div
                className="mt-3 border-steam-border bg-steam-sidebar px-4 pb-6 pt-2 backdrop-blur-steam-sidebar md:pb-8 md:pl-2 md:pr-6 md:pt-2"
                style={titleBorderStyle}
              >
                {sidebarColumn}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  )
})

export default HomePage


