import React from 'react';
import SidebarItem from '../../common/SidebarItem';
import { useI18n } from '../../../hooks/useI18n';

interface GuideItemProps {
  count: number;
  onCountChange?: (count: number) => void;
  onClick?: () => void;
}

const GuideItem: React.FC<GuideItemProps> = ({ count, onCountChange, onClick }) => {
  const { t } = useI18n();
  return (
    <SidebarItem
      name={t('profile:sidebarItems.guides')}
      count={count}
      onCountChange={onCountChange}
      onClick={onClick}
    />
  );
};

export default GuideItem; 
