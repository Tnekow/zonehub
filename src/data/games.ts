export interface Achievement {
  icon: string;
  name: string;
}

export interface Game {
  id: number;
  cover: string;
  name: string;
  playtimeHours: number; // 改为数字，便于格式化
  lastPlayedDate: string; // 改为日期字符串，统一为8月25日
  achievements: Achievement[];
  achievementProgress: { unlocked: number; total: number };
}

// 创建获取本地化游戏信息的函数
export const getGamePlaytime = (
  hours: number,
  t: (key: string, options?: Record<string, unknown>) => string,
): string => {
  return t('common:games.playtime', { hours });
};

export const getGameLastPlayed = (
  t: (key: string, options?: Record<string, unknown>) => string,
): string => {
  return t('common:games.lastPlayed');
};

export const games: Game[] = [
  {
    id: 1,
    cover: '/images/Header Capsule.png',
    name: 'zonehub',
    playtimeHours: 2268,
    lastPlayedDate: '2024-08-25', // 统一为8月25日
    achievements: [
      { icon: '/images/star.webp', name: 'Kurast Cleanser' },
      { icon: '/images/star.webp', name: 'Hireling Commander' },
      { icon: '/images/star.webp', name: 'Nahantu Sightseer' },
    ],
    achievementProgress: { unlocked: 27, total: 35 },
  }
]; 