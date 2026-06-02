import React from 'react'
import { useI18n } from '../../../hooks/useI18n'
import type { ShareInfo } from './types'
import { captureShareImage } from './capture'

interface ShareButtonProps {
  appRootRef: React.RefObject<HTMLDivElement>
  onCaptureDone: (dataUrl: string) => void
  includeSetup: boolean
  shareInfo: ShareInfo
}

const ShareButton: React.FC<ShareButtonProps> = ({
  appRootRef,
  onCaptureDone,
  includeSetup,
  shareInfo,
}) => {
  const { t } = useI18n()
  const handleClick = async () => {
    const rootEl = appRootRef.current
    if (!rootEl) {
      alert('App root container not found, cannot capture')
      return
    }
    const dataUrl = await captureShareImage(rootEl, { includeSetup, shareInfo })
    onCaptureDone(dataUrl)
  }
  return (
    <button
      onClick={handleClick}
      className="bg-steam-card backdrop-blur-steam-card border border-white/10 rounded-lg p-3 hover:bg-steam-secondary-border transition-colors group"
      title={t('navigation:actions.share')}
      aria-label={t('navigation:actions.share')}
    >
      <svg
        className="w-6 h-6 text-white group-hover:text-steam-primary transition-colors"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="18" cy="5" r="3"></circle>
        <circle cx="6" cy="12" r="3"></circle>
        <circle cx="18" cy="19" r="3"></circle>
        <path d="M8.6 13.5 L15.9 17.1"></path>
        <path d="M15.9 6.9 L8.6 10.5"></path>
      </svg>
    </button>
  )
}

export default ShareButton
