import React from 'react';
import SidebarItem from '../../common/SidebarItem';
import { useI18n } from '../../../hooks/useI18n';

interface ArtworkItemProps {
  count: number;
  onCountChange?: (count: number) => void;
  onClick?: () => void;
}

const ArtworkItem: React.FC<ArtworkItemProps> = ({ count, onCountChange, onClick }) => {
  const { t } = useI18n();
  return (
    <SidebarItem
      name={t('profile:sidebarItems.artwork')}
      count={count}
      onCountChange={onCountChange}
      onClick={onClick}
    />
  );
};

export default ArtworkItem; 
