import React from 'react';
import SidebarItem from '../../common/SidebarItem';
import { useI18n } from '../../../hooks/useI18n';

interface InventoryItemProps {
  count: number;
  onCountChange?: (count: number) => void;
  onClick?: () => void;
}

const InventoryItem: React.FC<InventoryItemProps> = ({ count, onCountChange, onClick }) => {
  const { t } = useI18n();
  return (
    <SidebarItem
      name={t('profile:sidebarItems.inventory')}
      count={count}
      onCountChange={onCountChange}
      onClick={onClick}
    />
  );
};

export default InventoryItem; 
