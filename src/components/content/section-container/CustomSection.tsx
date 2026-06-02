import React, { useState, useRef, useEffect } from 'react';
import SectionContainer from '../../common/SectionContainer';
import { useI18n } from '../../../hooks/useI18n';
import useLocalStorage from '../../../hooks/useLocalStorage';
import ProfileRichText from '../../common/ProfileRichText';

interface CustomSectionProps {
  // 组件唯一标识
  id: string;
  // 默认标题和内容
  defaultTitle?: string;
  defaultContent?: string;
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

interface CustomSectionData {
  title: string;
  content: string;
}

// 自定义字体样式 - 使用游黑体（Yu Gothic），缺字时用微软正黑体（Microsoft JhengHei）替补
const customFontStyle = {
  fontFamily: '"Yu Gothic", "Microsoft JhengHei", "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "Heiti SC", "Source Han Sans SC", "Noto Sans CJK SC", "WenQuanYi Micro Hei", sans-serif'
};

const CustomSection: React.FC<CustomSectionProps> = ({
  id,
  defaultTitle,
  defaultContent,
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
  
  // 使用localStorage持久化数据
  const [sectionData, setSectionData] = useLocalStorage<CustomSectionData>(
    `steamzone_customSection_${id}`,
    { 
      title: defaultTitle || t('profile:customSection.defaultTitle'), 
      content: defaultContent || t('profile:customSection.defaultContent') 
    }
  );
  
  // 编辑状态
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(sectionData.title);
  const [editContent, setEditContent] = useState(sectionData.content);
  
  // 悬停状态
  const [isHovered, setIsHovered] = useState(false);
  
  // 输入框引用
  const titleInputRef = useRef<HTMLInputElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  // 当数据更新时，同步编辑状态
  useEffect(() => {
    setEditTitle(sectionData.title);
    setEditContent(sectionData.content);
  }, [sectionData]);

  // 进入编辑模式
  const handleStartEdit = () => {
    setIsEditing(true);
    setEditTitle(sectionData.title);
    setEditContent(sectionData.content);
    
    // 延迟聚焦，确保DOM已更新
    setTimeout(() => {
      titleInputRef.current?.focus();
    }, 100);
  };

  // 保存编辑
  const handleSave = () => {
    if (editTitle.trim() === '') {
      alert(t('profile:customSection.titleRequired'));
      return;
    }
    
    setSectionData({
      title: editTitle.trim(),
      content: editContent.trim()
    });
    setIsEditing(false);
  };

  // 取消编辑
  const handleCancel = () => {
    setEditTitle(sectionData.title);
    setEditContent(sectionData.content);
    setIsEditing(false);
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // 自定义编辑图标
  const EditIcon = () => (
    <button
      onClick={handleStartEdit}
      className="w-6 h-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center text-sm font-bold transition-colors shadow-lg"
      title={t('profile:customSection.editContent')}
    >
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    </button>
  );

  // 编辑模式下的操作按钮
  const EditActions = () => (
    <div className="flex items-center space-x-2">
      <button
        onClick={handleSave}
        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors flex items-center space-x-1"
        title={t('profile:customSection.saveShortcut')}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
        </svg>
        <span>{t('profile:customSection.save')}</span>
      </button>
      <button
        onClick={handleCancel}
        className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm font-medium transition-colors flex items-center space-x-1"
        title={t('profile:customSection.cancelShortcut')}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
        <span>{t('profile:customSection.cancel')}</span>
      </button>
    </div>
  );

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative"
    >
      <SectionContainer
        title={sectionData.title}
        customTitle={
          isEditing ? (
            <input
              ref={titleInputRef}
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent border-none outline-none text-steam-textPrimary text-base font-semibold"
              placeholder={t('profile:customSection.titlePlaceholder')}
              maxLength={50}
              style={customFontStyle}
            />
          ) : undefined
        }
        subtitle={
          isEditing ? (
            <EditActions />
          ) : (
            isHovered && !isEditMode && (
              <EditIcon />
            )
          )
        }
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
        <div className="bg-steam-item rounded p-4">
          {isEditing ? (
            <textarea
              ref={contentTextareaRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent border-none outline-none text-steam-textPrimary resize-none min-h-[100px]"
              placeholder={t('profile:customSection.contentPlaceholder')}
              maxLength={2000}
              style={{ 
                minHeight: '100px',
                height: 'auto',
                overflow: 'hidden',
                ...customFontStyle
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.max(100, target.scrollHeight) + 'px';
              }}
            />
          ) : (
            <div 
              className="text-steam-textPrimary whitespace-pre-wrap leading-relaxed break-words"
              style={{
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                fontSize: '14px',
                ...customFontStyle
              }}
            >
              <ProfileRichText text={sectionData.content} />
            </div>
          )}
        </div>
      </SectionContainer>
    </div>
  );
};

export default CustomSection; 