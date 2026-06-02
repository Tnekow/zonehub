import React from 'react';
import SidebarItem from '../../common/SidebarItem';
import { useI18n } from '../../../hooks/useI18n';

interface VideoItemProps {
  count: number;
  onCountChange?: (count: number) => void;
  onClick?: () => void;
}

const VideoItem: React.FC<VideoItemProps> = ({ count, onCountChange, onClick }) => {
  const { t } = useI18n();
  return (
    <SidebarItem
      name={t('profile:sidebarItems.videos')}
      count={count}
      onCountChange={onCountChange}
      onClick={onClick}
    />
  );
};

export default VideoItem; 
