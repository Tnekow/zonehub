import React, { useState } from 'react'
import { useI18n } from '../../../hooks/useI18n'
import ShareConfigPanel from './ShareConfigPanel'
import {
  buildTwitterShareUrl,
  buildWeiboShareUrl,
  copyLinkToClipboard,
} from './socialShare'
import type { ShareInfo } from './types'

interface SharePreviewModalProps {
  isOpen: boolean
  imageUrl: string
  onClose: () => void
  onDownload: () => void
  includeSetup: boolean
  onToggleInclude: (next: boolean) => void
  onRecapture: () => void
  shareInfo: ShareInfo
  /** 分享时使用的页面 URL，默认当前页 */
  shareUrl?: string
  /** 分享文案，默认 "My SteamZone design" */
  shareText?: string
}

const SharePreviewModal: React.FC<SharePreviewModalProps> = ({
  isOpen,
  imageUrl,
  onClose,
  onDownload,
  includeSetup,
  onToggleInclude,
  onRecapture,
  shareInfo,
  shareUrl = typeof window !== 'undefined' ? window.location.href : '',
  shareText = 'My SteamZone design',
}) => {
  const { t } = useI18n()
  const [copyFeedback, setCopyFeedback] = useState(false)

  const handleShareWeibo = () => {
    const url = buildWeiboShareUrl({ url: shareUrl, title: shareText })
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=400')
  }

  const handleShareTwitter = () => {
    const url = buildTwitterShareUrl({ url: shareUrl, text: shareText })
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=400')
  }

  const handleCopyLink = async () => {
    const ok = await copyLinkToClipboard(shareUrl)
    if (ok) {
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 2000)
    }
  }

  if (!isOpen) return null
  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center"
      data-html2canvas-ignore
    >
      <div className="bg-steam-card border border-white/10 rounded-xl p-4 max-w-[92vw]">
        <div className="flex justify-between items-center mb-3">
          <div className="text-white text-lg font-semibold">
            {t('navigation:actions.sharePreview')}
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="mb-3 flex items-center justify-between">
          <div className="bg-steam-item border border-steam-border rounded px-3 py-2">
            <ShareConfigPanel
              includeSetup={includeSetup}
              onToggleInclude={(next) => {
                onToggleInclude(next)
                onRecapture()
              }}
            />
          </div>
        </div>
        <img
          src={imageUrl}
          alt={t('navigation:actions.sharePreview')}
          className="max-w-[88vw] max-h-[70vh] rounded-md shadow-lg"
        />
        {includeSetup && (
          <div className="mt-3">
            <textarea
              className="w-full bg-steam-item-in text-steam-textPrimary border border-steam-border rounded p-3 text-sm"
              rows={4}
              readOnly
              value={
                `${t('navigation:actions.shareDetails.theme')}: ${shareInfo.themeName}\n` +
                `${t('navigation:actions.shareDetails.background')}: ${shareInfo.backgroundName}\n` +
                `${t('navigation:actions.shareDetails.badges')}: ${shareInfo.badgeNames.length ? shareInfo.badgeNames.join(', ') : '-'}\n` +
                `${t('navigation:actions.shareDetails.components')}: ${shareInfo.componentNames.length ? shareInfo.componentNames.join(', ') : '-'}`
              }
            />
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              onClick={handleShareWeibo}
              className="bg-[#e6162d] text-white rounded-lg px-3 py-2 text-sm hover:opacity-90"
              title={t('navigation:actions.shareToWeibo')}
            >
              Weibo
            </button>
            <button
              onClick={handleShareTwitter}
              className="bg-[#1da1f2] text-white rounded-lg px-3 py-2 text-sm hover:opacity-90"
              title={t('navigation:actions.shareToTwitter')}
            >
              X
            </button>
            <button
              onClick={handleCopyLink}
              className="bg-[#00a1d6] text-white rounded-lg px-3 py-2 text-sm hover:opacity-90"
              title={t('navigation:actions.shareToBilibili')}
            >
              {copyFeedback ? t('navigation:actions.linkCopied') : 'Bilibili'}
            </button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onDownload}
              className="bg-steam-primary text-white rounded-lg px-4 py-2 hover:bg-steam-secondary-border"
            >
              {t('navigation:actions.download')}
            </button>
            <button
              onClick={onClose}
              className="bg-steam-card border border-white/10 text-white rounded-lg px-4 py-2 hover:bg-steam-secondary-border"
            >
              {t('navigation:actions.close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SharePreviewModal
