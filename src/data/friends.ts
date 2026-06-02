export interface Friend {
  id: number;
  avatar: string;
  nickname: string;
  isOnline: boolean;
  level: number;
  lastOnlineDays?: number;
  statusKey: string; // 改为状态键，用于i18n
  gameInPlay?: string; // 添加正在玩的游戏字段
}

// 创建获取本地化状态的函数
export const getFriendStatus = (
  friend: Friend,
  t: (key: string, options?: Record<string, unknown>) => string,
): string => {
  if (friend.isOnline) {
    if (friend.gameInPlay) {
      return t('common:status.playingGame', { game: friend.gameInPlay });
    }
    return t('common:status.online');
  } else {
    if (friend.lastOnlineDays) {
      return t('common:status.lastOnline', { count: friend.lastOnlineDays });
    }
    return t('common:status.offline');
  }
};

export const friends: Friend[] = [
  {
    id: 1,
    avatar: '/images/default_avatar.jpg',
    nickname: 'Fish!',
    isOnline: true,
    level: 42,
    statusKey: 'online'
  },
  {
    id: 2,
    avatar: '/images/default_avatar.jpg',
    nickname: 'GameHunter',
    isOnline: false,
    level: 28,
    lastOnlineDays: 3,
    statusKey: 'lastOnline'
  },
  {
    id: 3,
    avatar: '/images/default_avatar.jpg',
    nickname: 'SteamMaster',
    isOnline: true,
    level: 65,
    statusKey: 'playingGame',
    gameInPlay: 'CS2'
  },
  {
    id: 4,
    avatar: '/images/default_avatar.jpg',
    nickname: 'PixelArtist',
    isOnline: false,
    level: 19,
    lastOnlineDays: 1,
    statusKey: 'lastOnline'
  },
];

export default friends; 
