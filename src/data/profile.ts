export interface Profile {
  avatar: string;
  nicknameKey: string; // 改为使用翻译键
  level: number;
  descriptionKey?: string; // 改为使用翻译键
  badge: {
    icon: string;
    nameKey: string; // 改为使用翻译键
    xp: number;
  };
}

// 创建获取本地化profile信息的函数
export const getProfileNickname = (t: (key: string) => string): string => {
  return t('profile:defaultProfile.nickname');
};

export const getProfileDescription = (t: (key: string) => string): string => {
  return t('profile:defaultProfile.description');
};

export const getProfileBadgeName = (t: (key: string) => string): string => {
  return t('profile:defaultProfile.badgeName');
};

export const profileHeader: Profile = {
  avatar: '/images/default_avatar.jpg',
  nicknameKey: 'defaultProfile.nickname',
  level: 190,
  descriptionKey: 'defaultProfile.description',
  badge: {
    icon: '/images/star.webp',
    nameKey: 'defaultProfile.badgeName',
    xp: 50,
  },
}; 
