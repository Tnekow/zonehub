import React from 'react'
import { useI18n } from '../../../hooks/useI18n'

interface ShareConfigPanelProps {
  includeSetup: boolean
  onToggleInclude: (next: boolean) => void
}

const ShareConfigPanel: React.FC<ShareConfigPanelProps> = ({ includeSetup, onToggleInclude }) => {
  const { t } = useI18n()
  return (
    <label className="flex items-center gap-2 select-none">
      <input
        type="checkbox"
        checked={includeSetup}
        onChange={(e) => onToggleInclude(e.currentTarget.checked)}
        className="w-4 h-4"
      />
      <span className="text-steam-textPrimary text-base font-medium">
        {t('navigation:actions.includeSetup')}
      </span>
    </label>
  )
}

export default ShareConfigPanel
