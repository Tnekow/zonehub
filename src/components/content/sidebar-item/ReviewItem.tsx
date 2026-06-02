import React from 'react';
import SidebarItem from '../../common/SidebarItem';
import { useI18n } from '../../../hooks/useI18n';

interface ReviewItemProps {
  count: number;
  onCountChange?: (count: number) => void;
  onClick?: () => void;
}

const ReviewItem: React.FC<ReviewItemProps> = ({ count, onCountChange, onClick }) => {
  const { t } = useI18n();
  return (
    <SidebarItem
      name={t('profile:sidebarItems.reviews')}
      count={count}
      onCountChange={onCountChange}
      onClick={onClick}
    />
  );
};

export default ReviewItem; 
