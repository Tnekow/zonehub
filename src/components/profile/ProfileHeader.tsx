// src/components/ProfileHeader.tsx

import { useState, useRef, Suspense } from 'react';
import type { Profile } from '../../data/profile';
import { getProfileNickname, getProfileDescription } from '../../data/profile';
import { PencilSquareIcon, CameraIcon } from '@heroicons/react/24/solid';
import { getLevelStyle } from '../../data/levels';
import { useI18n } from '../../hooks/useI18n';
import { useTitleBorder } from '../../hooks/useTitleBorder';
import '../../styles/levels.css';
import useLocalStorage from '../../hooks/useLocalStorage';
import { lazyWithRetry } from '../../lib/lazyWithRetry';
import ProfileRichText from '../common/ProfileRichText';
import SafeImage from '../common/SafeImage';

const BadgePicker = lazyWithRetry(() => import('./BadgePicker'));

type ProfileHeaderProps = Profile & {
  onChange: (data: Profile) => void;
  customNickname?: string | null;
  onCustomNicknameChange?: (nickname: string | null) => void;
};

// 自定义字体样式 - 使用游黑体（Yu Gothic），缺字时用微软正黑体（Microsoft JhengHei）替补
const customFontStyle = {
  fontFamily: '"Yu Gothic", "Microsoft JhengHei", "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "Heiti SC", "Source Han Sans SC", "Noto Sans CJK SC", "WenQuanYi Micro Hei", sans-serif'
};

// 字符过滤函数 - 过滤XSS注入类字符，支持中文
const filterNickname = (value: string): string => {
  // 过滤XSS相关的危险字符，但保留中文、字母、数字、下划线
  return value.replace(/[<>"'&]/g, '');
};

// 字符过滤函数 - 过滤XSS注入类字符，支持中文
const filterDescription = (value: string): string => {
  // 过滤XSS相关的危险字符，但保留中文、字母、数字、空格、常用标点
  return value.replace(/[<>"'&]/g, '');
};

// EditableField component for inline editing (保持不变)
const EditableField = ({ value, onSave, children, filterFunction, buttonPosition = 'top-right' }: {
  value: string | number;
  onSave: (value: string) => void;
  children: React.ReactNode;
  filterFunction?: (value: string) => string;
  buttonPosition?: 'top-right' | 'top-left';
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value.toString());

  const handleSave = () => {
    const filteredValue = filterFunction ? filterFunction(editValue) : editValue;
    onSave(filteredValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value.toString());
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="bg-gray-700 text-white px-2 py-1 rounded text-sm"
          autoFocus
          style={customFontStyle}
        />
        <button
          onClick={handleSave}
          className="text-green-400 hover:text-green-300 text-sm"
        >
          ✓
        </button>
        <button
          onClick={handleCancel}
          className="text-red-400 hover:text-red-300 text-sm"
        >
          ✗
        </button>
      </div>
    );
  }

  const getButtonClasses = () => {
    if (buttonPosition === 'top-left') {
      return 'absolute -top-1 -left-6 opacity-0 group-hover:opacity-100 transition-opacity';
    }
    return 'absolute -top-1 right-0 opacity-0 group-hover:opacity-100 transition-opacity';
  };

  return (
    <div className="group relative inline-block">
      {children}
      <button
        onClick={() => setIsEditing(true)}
        className={getButtonClasses()}
      >
        <PencilSquareIcon className="w-4 h-4 text-gray-400 hover:text-white" />
      </button>
    </div>
  );
};


const ProfileHeader = ({ avatar, level, badge, onChange, customNickname: propCustomNickname, onCustomNicknameChange }: ProfileHeaderProps) => {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleBorderStyle = useTitleBorder();
  
  // 本地状态管理自定义nickname和description
  const [localCustomNickname, setLocalCustomNickname] = useState<string | null>(null);
  const [customDescription, setCustomDescription] = useLocalStorage<string | null>('steamzone_customDescription', null);
  const [isPickerOpen, setPickerOpen] = useState(false);
  
  // 使用props传入的customNickname或本地状态
  const customNickname = propCustomNickname !== undefined ? propCustomNickname : localCustomNickname;

  // 获取本地化的profile信息
  const defaultNickname = getProfileNickname(t);
  const defaultDescription = getProfileDescription(t);

  // 徽章名称：若 nameKey 为 profile 下的 i18n 键则翻译，否则按字面显示（如从 BadgePicker 选中的名称）
  const displayBadgeName = (() => {
    const key = `profile:${badge.nameKey}`;
    const translated = t(key);
    return translated !== key ? translated : badge.nameKey;
  })();

  // 使用自定义nickname/description或默认值
  const displayNickname = customNickname || defaultNickname;
  const displayDescription = customDescription || defaultDescription;

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        onChange({ avatar: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  // 处理nickname修改
  const handleNicknameChange = (newNickname: string) => {
    if (onCustomNicknameChange) {
      onCustomNicknameChange(newNickname);
    } else {
      setLocalCustomNickname(newNickname);
    }
  };

  // 处理description修改
  const handleDescriptionChange = (newDescription: string) => {
    setCustomDescription(newDescription);
  };

  return (
    <header className="md:col-span-10 grid grid-cols-1 md:grid-cols-10">
      {/* 左侧个人信息区 */}
      <div className="md:col-span-7 flex items-center bg-steam-header-card backdrop-blur-steam-header-card 
        border-t border-l border-steam-header-border rounded-tl-lg 
        py-6 pl-6 pr-1">
        <div className="flex items-start gap-6 w-full">
          {/* 头像上传区域 - 固定尺寸 */}
          <div className="relative group cursor-pointer flex-shrink-0" onClick={handleAvatarClick}>
          <SafeImage
            src={avatar}
            alt="Avatar"
              className="w-[168px] h-[168px] rounded-md border-2 border-steam-gray object-cover"
            loading="eager"
          />
            {/* 上传覆盖层 */}
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center ">
              <CameraIcon className="w-8 h-8 text-white" />
            </div>
            {/* 隐藏的文件输入 */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
          {/* 用户信息 */}
          <div className="flex-grow flex flex-col justify-start min-h-[168px]">
            <div className="flex items-center gap-2">
              <EditableField 
                value={displayNickname} 
                onSave={handleNicknameChange}
                filterFunction={filterNickname}
              >
                <h1 className="text-lg text-steam-textPrimary" style={customFontStyle}>{displayNickname}</h1>
            </EditableField>
              {/* 下拉箭头指示器 */}
              <svg className="w-5 h-5 text-gray-400 cursor-pointer hover:text-white transition-colors" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="relative z-20">
              <EditableField 
                value={displayDescription} 
                onSave={handleDescriptionChange}
                filterFunction={filterDescription}
                buttonPosition="top-right"
              >
                <div className="text-steam-textPrimary mt-2 text-sm pr-8" style={customFontStyle}>
                  <ProfileRichText text={displayDescription} />
                </div>
              </EditableField>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧徽章区 */}
      <div className="md:col-span-3 flex flex-col justify-between bg-steam-header-card backdrop-blur-steam-header-card 
        border-t border-r border-steam-header-border rounded-tr-lg
        py-6 pr-6 pl-4">
        {/* 上部分：等级和徽章 */}
        <div className="flex flex-col gap-4">
          {/* 等级显示 - 与昵称同高度（将数字移到右侧），并使用基线对齐使数字稍低 */}
          <div className="flex items-baseline gap-2 min-h-[28px]">
            <span className="text-steam-textPrimary text-lg" style={customFontStyle}>{t('profile:profileHeader.level')}</span>
            {(() => {
              const levelStyle = getLevelStyle(level);
              return (
                <span className={`level-base ${levelStyle?.className || ''} translate-y-[4px]`} style={customFontStyle}>
                  {level}
                </span>
              );
            })()}
          </div>
          
          {/* 徽章显示 - 使用titleBorders（独立背景：detail.profileBadgeBox） */}
          <div 
            className="flex items-start gap-3 bg-steam-profileBadgeBox p-3" 
            style={titleBorderStyle}
          >
            <button onClick={() => setPickerOpen(true)} className="rounded">
              <SafeImage
                src={badge.icon}
                alt="Badge"
                className="w-16 h-[60px] rounded"
                loading="eager"
              />
            </button>
            <div className="flex flex-col">
              <p className="text-steam-textPrimary font-semibold text-sm" style={customFontStyle}>{displayBadgeName}</p>
              <EditableField value={badge.xp} onSave={(val: string) => onChange({ badge: { ...badge, xp: parseInt(val) || 0 } })}>
                <p className="text-steam-textMuted text-xs" style={customFontStyle}>{t('profile:profileHeader.experiencePoints', { xp: badge.xp })}</p>
          </EditableField>
            </div>
          </div>
        </div>

        {/* 下部分：操作按钮 - 使用titleBorders */}
        <div className="flex gap-2 mt-4">
          <button 
            className="bg-steam-profileEditButton text-steam-textPrimary px-4 py-2 text-sm font-medium hover:bg-steam-secondary transition-colors"
            style={{ ...titleBorderStyle, ...customFontStyle }}
          >
            {t('profile:profileHeader.addFriend')}
          </button>
          <button 
            className="bg-steam-profileEditButton text-steam-textPrimary px-4 py-2 text-sm font-medium hover:bg-steam-secondary transition-colors flex items-center gap-1"
            style={{ ...titleBorderStyle, ...customFontStyle }}
          >
            {t('profile:profileHeader.more')}
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      {isPickerOpen && (
        <Suspense fallback={null}>
          <BadgePicker
            isOpen={isPickerOpen}
            onClose={() => setPickerOpen(false)}
            onApply={(sel) => onChange({ badge: { ...badge, icon: sel.image || badge.icon, nameKey: sel.name } })}
          />
        </Suspense>
      )}
    </header>
  );
};

export default ProfileHeader;
