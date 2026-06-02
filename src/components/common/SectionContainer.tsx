import React from 'react';
import { useTitleBorder } from '../../hooks/useTitleBorder';

interface SectionContainerProps {
  title: string;           // 主标题
  subtitle?: string | React.ReactNode; // 副标题（可选）
  subtitlePosition?: 'right' | 'below'; // 副标题位置：右侧或下方
  children: React.ReactNode; // 内容区域
  className?: string;      // 额外的样式类
  /** Optional class for the content wrapper (replaces default p-3 when set, e.g. py-3 px-0 for 632px width) */
  contentClassName?: string;
  /** Hide the title bar completely (used by preview-only components) */
  hideTitleBar?: boolean;
  // 自定义渲染props
  customTitle?: React.ReactNode; // 自定义标题渲染
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

const SectionContainer: React.FC<SectionContainerProps> = ({
  title,
  subtitle,
  subtitlePosition = 'right',
  children,
  className = '',
  contentClassName,
  hideTitleBar = false,
  // 自定义渲染props
  customTitle,
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
  const titleBorderStyle = useTitleBorder();

  return (
    <div 
      className={`w-full flex flex-col gap-0 backdrop-blur-steam-title-container ${className} ${
        isDragging ? 'opacity-50' : ''
      } ${
        isDragOver ? 'border-2 border-blue-400 border-dashed' : ''
      }`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* 标题区域 */}
      {!hideTitleBar && (
      <div 
        className={`bg-steam-title px-4 py-2 ${isEditMode ? 'cursor-move' : ''}`} 
        style={titleBorderStyle}
      >
        {subtitlePosition === 'right' ? (
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              {isEditMode && (
                <svg className="w-4 h-4 text-steam-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" />
                </svg>
              )}
              {customTitle || <h2 className="text-steam-textPrimary text-base font-semibold">{title}</h2>}
            </div>
            <div className="flex items-center space-x-2">
              {subtitle && (
                typeof subtitle === 'string' ? (
                  <span className="text-steam-textPrimary text-sm">{subtitle}</span>
                ) : (
                  subtitle
                )
              )}
              {isEditMode && onDelete && (
                <button
                  onClick={onDelete}
                  className="w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold transition-colors"
                  title="删除组件"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {isEditMode && (
                  <svg className="w-4 h-4 text-steam-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" />
                  </svg>
                )}
                {customTitle || <h2 className="text-steam-textPrimary text-base font-semibold">{title}</h2>}
              </div>
              {isEditMode && onDelete && (
                <button
                  onClick={onDelete}
                  className="w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold transition-colors"
                  title="删除组件"
                >
                  ×
                </button>
              )}
            </div>
            {subtitle && (
              typeof subtitle === 'string' ? (
                <span className="text-steam-textPrimary text-sm">{subtitle}</span>
              ) : (
                subtitle
              )
            )}
          </div>
        )}
      </div>
      )}
      
      {/* 容器背景区域 */}
      <div className={`bg-steam-container border border-steam-border ${contentClassName ?? 'p-3'}`}>
        {children}
      </div>
    </div>
  );
};

export default SectionContainer;
