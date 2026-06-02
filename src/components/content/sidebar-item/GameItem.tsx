import React from 'react';
import SidebarItem from '../../common/SidebarItem';
import { useI18n } from '../../../hooks/useI18n';

interface GameItemProps {
  count: number;
  onCountChange?: (count: number) => void;
  onClick?: () => void;
}

const GameItem: React.FC<GameItemProps> = ({ count, onCountChange, onClick }) => {
  const { t } = useI18n();
  return (
    <SidebarItem
      name={t('profile:sidebarItems.games')}
      count={count}
      onCountChange={onCountChange}
      onClick={onClick}
    />
  );
};

export default GameItem; 
