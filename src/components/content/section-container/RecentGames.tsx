import React, { useState } from 'react';
import SectionContainer from '../../common/SectionContainer';
import { games as gamesData, type Game, getGamePlaytime, getGameLastPlayed } from '../../../data/games';
import { useI18n } from '../../../hooks/useI18n';
import { ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';
import { toPublicAssetUrl } from '../../../lib/publicAsset';

const MAX_VISIBLE_ACHIEVEMENTS = 4;

// 自定义字体样式 - 使用游黑体（Yu Gothic），缺字时用微软正黑体（Microsoft JhengHei）替补
const customFontStyle = {
  fontFamily: '"Yu Gothic", "Microsoft JhengHei", "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "Heiti SC", "Source Han Sans SC", "Noto Sans CJK SC", "WenQuanYi Micro Hei", sans-serif'
};

interface RecentGamesProps {
  // 拖拽相关props
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragEnter?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  // 编辑模式相关props
  isEditMode?: boolean;
  onDelete?: () => void;
  isDragging?: boolean;
  isDragOver?: boolean;
}

const RecentGames: React.FC<RecentGamesProps> = ({
  // 拖拽相关props
  draggable = false,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  // 编辑模式相关props
  isEditMode = false,
  onDelete,
  isDragging = false,
  isDragOver = false
}) => {
  const { t } = useI18n();
  const [games] = useState<Game[]>(gamesData);

  const displayTitle = (title: string, maxChars = 25) => {
    const s = (title || '').trim();
    if (s.length <= maxChars) return s;
    return s.slice(0, maxChars) + '…';
  };

  const copyText = async (text: string) => {
    const value = (text || '').trim();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Fallback for older browsers / restricted contexts
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.style.position = 'fixed';
      ta.style.top = '0';
      ta.style.left = '0';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand('copy');
      } catch (error) {
        // Ignore fallback copy failures in restricted environments.
        void error;
      }
      document.body.removeChild(ta);
    }
  };
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  return (
    <SectionContainer 
      title={t('profile:recentGames.title')}
      subtitle={t('profile:recentGames.subtitle', { hours: '27.4', days: '2' })}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      isEditMode={isEditMode}
      onDelete={onDelete}
      isDragging={isDragging}
      isDragOver={isDragOver}
    >
      <div className="flex flex-col gap-7">
        {games.map((game) => {
          const key = game.id;
          const name = game.name;
          const nameShown = displayTitle(name, 25);
          const cover = toPublicAssetUrl(game.cover);
          const achievements = game.achievements;
          const visibleAchievements = achievements.slice(0, MAX_VISIBLE_ACHIEVEMENTS);
          const overflow = achievements.length - MAX_VISIBLE_ACHIEVEMENTS;
          const progress = game.achievementProgress;
          const progressPercent = progress.total > 0 ? Math.round((progress.unlocked / progress.total) * 100) : 0;

          const topRightLine1 = t('profile:recentGames.totalPlaytime', { playtime: getGamePlaytime(game.playtimeHours, t) });
          const topRightLine2 = t('profile:recentGames.lastPlayed', { date: getGameLastPlayed(t) });

          return (
            <div key={key} className="bg-steam-item shadow border border-steam-border overflow-hidden w-full" style={{ height: '140px' }}>
            <div className="grid grid-rows-[1fr_auto] h-full">
              {/* 上部分：游戏封面 + 游戏信息 */}
              <div className="flex">
                {/* 左侧游戏封面 */}
                <div className="flex-shrink-0 w-48 bg-black flex items-center justify-center">
                  <img 
                      src={cover}
                      alt={name}
                    className="object-cover" 
                    style={{ width: '181px', height: '68px' }}
                      loading="lazy"
                  />
                </div>
                
                {/* 右侧游戏信息 */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center" style={{ paddingLeft: '6px', paddingRight: '12px' }}>
                  {/* 游戏名称 - 左对齐 */}
                    <div className="flex items-center gap-2 mb-1 min-w-0">
                      <h3
                        className="text-xl text-white text-left truncate min-w-0 flex-1"
                        style={customFontStyle}
                        title={name}
                      >
                        {nameShown}
                      </h3>
                      <button
                        type="button"
                        aria-label="Copy title"
                        title="Copy title"
                        className="flex-shrink-0 inline-flex items-center gap-1 text-[#aaaaaa] hover:text-steam-primary transition-colors"
                        onClick={async () => {
                          await copyText(name);
                          setCopiedKey(String(key));
                          window.setTimeout(() => setCopiedKey(prev => (prev === String(key) ? null : prev)), 1200);
                        }}
                      >
                        {copiedKey === String(key) ? (
                          <>
                            <CheckIcon className="w-4 h-4" />
                            <span className="text-xs" style={customFontStyle}>Copied</span>
                          </>
                        ) : (
                          <ClipboardDocumentIcon className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  
                  {/* 游戏信息 - 右对齐 */}
                  <div className="flex flex-col gap-1 text-sm text-[#aaaaaa] items-end" style={customFontStyle}>
                      <span>{topRightLine1}</span>
                      <span>{topRightLine2}</span>
                  </div>
                </div>
              </div>
              
              {/* 下部分：成就进度 + 成就图标 */}
              <div className="bg-steam-cardFooter px-6 py-3 flex items-center justify-between mt-2">
                {/* 成就进度 */}
                <div className="flex items-center gap-4">
                  <span className="text-sm text-white font-medium" style={customFontStyle}>{t('profile:recentGames.achievementProgress')}</span>
                  <span className="text-sm text-[#e6e6e6] font-mono" style={customFontStyle}>
                      {progress.unlocked} <span className="text-[#888]">/ {progress.total}</span>
                  </span>
                  <div className="w-32 h-3 bg-steam-progress rounded-full overflow-hidden border border-steam-border">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#666] to-[#222]"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              </div>
                
                {/* 成就图标 */}
                <div className="flex items-center gap-2">
                {visibleAchievements.map((ach, idx) => (
                  <img
                        key={`${key}-ach-${idx}`}
                        src={toPublicAssetUrl(ach.icon)}
                    alt={ach.name}
                    title={ach.name}
                      className="w-8 h-8 rounded bg-black border border-steam-border object-cover"
                        loading="lazy"
                  />
                ))}
                {overflow > 0 && (
                    <span className="ml-1 px-2 py-1 bg-steam-badge text-white text-xs rounded font-bold flex items-center justify-center min-w-[2rem]" style={customFontStyle}>
                      +{overflow}
                    </span>
                )}
                </div>
              </div>
            </div>
            </div>
          );
        })}
      </div>
      
      {/* 底部导航链接 */}
      <div className="flex justify-end gap-5 text-steam-textPrimary text-sm mt-4" style={customFontStyle}>
        <a href="#" className="hover:text-steam-textSecondary transition-colors">{t('profile:recentGames.viewAllRecentGames')}</a>
        <span className="text-steam-textMuted">|</span>
        <a href="#" className="hover:text-steam-textSecondary transition-colors">{t('profile:recentGames.wishlist')}</a>
        <span className="text-steam-textMuted">|</span>
        <a href="#" className="hover:text-steam-textSecondary transition-colors">{t('profile:recentGames.reviews')}</a>
      </div>
    </SectionContainer>
  );
};

export default RecentGames; 
