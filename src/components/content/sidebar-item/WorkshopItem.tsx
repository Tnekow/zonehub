import React from 'react';
import SidebarItem from '../../common/SidebarItem';
import { useI18n } from '../../../hooks/useI18n';

interface WorkshopItemProps {
  count: number;
  onCountChange?: (count: number) => void;
  onClick?: () => void;
}

const WorkshopItem: React.FC<WorkshopItemProps> = ({ count, onCountChange, onClick }) => {
  const { t } = useI18n();
  return (
    <SidebarItem
      name={t('profile:sidebarItems.workshop')}
      count={count}
      onCountChange={onCountChange}
      onClick={onClick}
    />
  );
};

export default WorkshopItem; 
