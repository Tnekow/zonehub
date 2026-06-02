import React, { useState } from 'react';
import { useI18n } from '../../hooks/useI18n';

interface SidebarItemProps {
  name: string;
  count: number;
  onCountChange?: (newCount: number) => void;
  onClick?: () => void;
  className?: string;
}

// 自定义字体样式 - 使用游黑体（Yu Gothic），缺字时用微软正黑体（Microsoft JhengHei）替补
const customFontStyle = {
  fontFamily: '"Yu Gothic", "Microsoft JhengHei", "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "Heiti SC", "Source Han Sans SC", "Noto Sans CJK SC", "WenQuanYi Micro Hei", sans-serif'
};

const SidebarItem: React.FC<SidebarItemProps> = ({ 
  name, 
  count, 
  onCountChange,
  onClick, 
  className = '' 
}) => {
  const { t } = useI18n();
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(count.toString());

  // 格式化数字，添加千位分隔符
  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditValue(count.toString());
  };

  const handleSave = () => {
    const newCount = parseInt(editValue) || 0;
    onCountChange?.(newCount);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(count.toString());
    setIsEditing(false);
  };

  return (
    <div 
      className={`relative flex items-center cursor-pointer rounded px-2 py-1 transition-colors duration-200 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* 组件名称 */}
      <span className={`text-base text-steam-textPrimary transition-all duration-200 ${
        isHovered ? 'underline decoration-steam-textSecondary underline-offset-2' : ''
      }`} style={customFontStyle}>
        {name}
      </span>
      
      {/* 数字 */}
      <span className="text-2xl text-steam-textMuted ml-2 transform -translate-y-[2.3px]" style={customFontStyle}>
        {formatNumber(count)}
      </span>

      {/* 编辑按钮 - 只在悬停时显示 */}
      {isHovered && !isEditing && (
        <button
          onClick={handleEditClick}
          className="absolute top-0 right-0 p-1 text-steam-textMuted hover:text-steam-textSecondary transition-colors duration-200"
          title={t('profile:sidebarItems.editCount')}
        >
          {/* 编辑图标 */}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
          </svg>
        </button>
      )}

      {/* 编辑模态框 */}
      {isEditing && (
        <div className="absolute top-8 right-0 bg-steam-item-in border border-steam-secondary-border rounded p-3 shadow-lg z-10 min-w-[150px]">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-steam-textPrimary text-sm font-medium" style={customFontStyle}>{t('profile:sidebarItems.quantity')}</label>
              <input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="bg-steam-border text-steam-textPrimary border border-steam-secondary-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-steam-primary"
                min="0"
                max="999999"
                autoFocus
                style={customFontStyle}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="px-3 py-1 bg-steam-primary text-steam-buttonText rounded text-sm font-medium hover:bg-steam-secondary transition-colors"
                style={customFontStyle}
              >
                {t('profile:sidebarItems.save')}
              </button>
              <button
                onClick={handleCancel}
                className="px-3 py-1 bg-steam-secondary-border text-steam-textMuted rounded text-sm font-medium hover:bg-steam-border transition-colors"
                style={customFontStyle}
              >
                {t('profile:sidebarItems.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SidebarItem; 
