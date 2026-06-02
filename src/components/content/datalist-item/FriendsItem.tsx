import React from 'react';
import { DataListContainer } from '../../common/DataListItem';
import { type Friend, getFriendStatus } from '../../../data/friends';
import { getLevelStyle } from '../../../data/levels';
import { useI18n } from '../../../hooks/useI18n';
import '../../../styles/levels.css';

interface FriendsListProps {
  friends: Friend[];
  onFriendClick?: (friend: Friend) => void;
}

const FriendsList: React.FC<FriendsListProps> = ({ friends, onFriendClick }) => {
  const { t } = useI18n();

  // 渲染等级信息
  const renderLevel = (level: number) => {
    const levelStyle = getLevelStyle(level);
    return (
      <div className={`level-base ${levelStyle?.className || ''}`}>
        {level}
      </div>
    );
  };

  // 根据在线状态设置文字颜色
  const getPrimaryTextColor = (friend: Friend) => {
    return friend.isOnline ? 'text-steam-online' : 'text-steam-textPrimary';
  };

  const getSecondaryTextColor = (friend: Friend) => {
    return friend.isOnline ? 'text-steam-online' : 'text-steam-textMuted';
  };

  // 处理好友数据，为每个好友添加本地化状态
  const friendsWithLocalizedStatus = friends.map(friend => ({
    ...friend,
    status: getFriendStatus(friend, t)
  }));

  return (
    <DataListContainer
      data={friendsWithLocalizedStatus}
      title={t('common:friends.title')}
      avatarKey="avatar"
      primaryTextKey="nickname"
      secondaryTextKey="status"
      extraInfoKey="level"
      extraInfoRenderer={renderLevel}
      onItemClick={onFriendClick}
      avatarSize={38}
      textSize={12}
      getPrimaryTextColor={getPrimaryTextColor}
      getSecondaryTextColor={getSecondaryTextColor}
    />
  );
};

export default FriendsList; 
