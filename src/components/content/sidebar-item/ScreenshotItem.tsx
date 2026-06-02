import React from 'react';
import SidebarItem from '../../common/SidebarItem';
import { useI18n } from '../../../hooks/useI18n';

interface ScreenshotItemProps {
  count: number;
  onCountChange?: (count: number) => void;
  onClick?: () => void;
}

const ScreenshotItem: React.FC<ScreenshotItemProps> = ({ count, onCountChange, onClick }) => {
  const { t } = useI18n();
  return (
    <SidebarItem
      name={t('profile:sidebarItems.screenshots')}
      count={count}
      onCountChange={onCountChange}
      onClick={onClick}
    />
  );
};

export default ScreenshotItem; 
