import React from 'react';
import { sponsors } from '../../data/sponsors';

type SponsorWallProps = {
  /** 头像尺寸，默认 md */
  size?: 'md' | 'lg';
  emptyMessage?: string;
};

const sizeClasses = {
  md: 'w-14 h-14',
  lg: 'w-16 h-16',
};

/**
 * 赞助者头像墙：数据来自 sponsors.json
 */
const SponsorWall: React.FC<SponsorWallProps> = ({ size = 'md', emptyMessage }) => {
  const avatarSize = sizeClasses[size];

  if (sponsors.length === 0) {
    if (!emptyMessage) return null;
    return <p className="text-steam-textMuted text-sm text-center">{emptyMessage}</p>;
  }

  return (
    <div className="flex flex-wrap justify-center gap-6">
      {sponsors.map((s, i) => (
        <div key={`${s.nickname}-${i}`} className="flex flex-col items-center">
          {s.url ? (
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`block rounded-full overflow-hidden border-2 border-steam-border hover:border-steam-primary transition-colors flex-shrink-0 ${avatarSize}`}
              title={s.nickname}
            >
              {s.avatar ? (
                <img src={s.avatar} alt={s.nickname} className="w-full h-full object-cover" />
              ) : (
                <span className="w-full h-full flex items-center justify-center bg-steam-item-in text-steam-textMuted text-xl font-bold">
                  ?
                </span>
              )}
            </a>
          ) : (
            <div
              className={`rounded-full overflow-hidden border-2 border-steam-border flex-shrink-0 flex items-center justify-center bg-steam-item-in ${avatarSize}`}
              title={s.nickname}
            >
              {s.avatar ? (
                <img src={s.avatar} alt={s.nickname} className="w-full h-full object-cover" />
              ) : (
                <span className="text-steam-textMuted text-xl font-bold">?</span>
              )}
            </div>
          )}
          <span className="text-steam-textSecondary text-xs mt-2 max-w-[96px] truncate">{s.nickname}</span>
        </div>
      ))}
    </div>
  );
};

export default SponsorWall;
