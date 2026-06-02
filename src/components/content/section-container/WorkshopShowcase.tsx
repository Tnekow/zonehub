import React, { useState, useRef, useEffect } from 'react';
import SectionContainer from '../../common/SectionContainer';
import { useI18n } from '../../../hooks/useI18n';
import useImageStorage from '../../../hooks/useImageStorage';

interface WorkshopShowcaseProps {
  username?: string;
  customNickname?: string | null;
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

// 自定义字体样式 - 使用游黑体（Yu Gothic），缺字时用微软正黑体（Microsoft JhengHei）替补
const customFontStyle = {
  fontFamily: '"Yu Gothic", "Microsoft JhengHei", "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "Heiti SC", "Source Han Sans SC", "Noto Sans CJK SC", "WenQuanYi Micro Hei", sans-serif'
};

// GIF同步组件 - 改进版本
const SynchronizedGif: React.FC<{ src: string; alt: string; className: string; syncKey: number }> = ({ src, alt, className, syncKey }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    // 检查是否为GIF
    const isGif = src.toLowerCase().includes('.gif');
    
    if (isGif) {
      // 对于GIF，实现时间轴对齐功能
      const handleLoad = () => {
        setIsLoaded(true);
        
        // 使用时间戳参数强制GIF重新开始播放，实现时间轴对齐
        setTimeout(() => {
          if (img.src) {
            const currentSrc = img.src;
            // 移除可能已存在的时间戳参数
            const baseSrc = currentSrc.split('?')[0];
            // 添加新的时间戳和同步键，确保GIF从第一帧开始播放
            img.src = `${baseSrc}?t=${Date.now()}&sync=${syncKey}`;
          }
        }, 100); // 延迟100ms确保GIF完全加载
      };

      img.addEventListener('load', handleLoad);
      return () => img.removeEventListener('load', handleLoad);
    } else {
      // 对于非GIF图片，直接设置加载状态
      setIsLoaded(true);
    }
  }, [src, syncKey]);

  return (
    <img 
      ref={imgRef}
      src={src} 
      alt={alt}
      className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      style={{ transition: 'opacity 0.2s ease-in-out' }}
    />
  );
};

const WorkshopShowcase: React.FC<WorkshopShowcaseProps> = ({ 
  username,
  customNickname,
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
  
  // GIF时间轴对齐功能说明：
  // 1. 每次上传新GIF时，所有GIF都会重新对齐到第一帧
  // 2. 删除GIF后，剩余GIF也会重新对齐
  // 3. 用户可以手动点击"同步GIF时间轴"按钮来随时对齐
  // 4. 通过syncKey的变化触发所有GIF重新加载，实现同步播放
  
  // 使用localStorage持久化图片数据
  const [images, setImages] = useImageStorage('steamzone_workshopImages', []);
  const [hoveredImageIndex, setHoveredImageIndex] = useState<number | null>(null);
  const [syncKey, setSyncKey] = useState(0); // 用于强制重新渲染GIF
  const [showUploadButton, setShowUploadButton] = useState(false); // 控制Upload按钮显示
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 新增：拖拽排序状态
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  // 清空前确认弹窗开关
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  // 计算相邻卡片在拖拽时的位移，突出插入位置
  const getShiftX = (i: number) => {
    if (draggedIndex === null || dragOverIndex === null || i === draggedIndex) return 0;
    // 向右拖拽：被跨过的卡片左移
    if (dragOverIndex > draggedIndex && i > draggedIndex && i <= dragOverIndex) return -16;
    // 向左拖拽：被跨过的卡片右移
    if (dragOverIndex < draggedIndex && i >= dragOverIndex && i < draggedIndex) return 16;
    return 0;
  };

  // 计算图片数量
  const imageCount = images.length;

  // 移除复杂的全局同步机制，因为GIF现在不会被压缩

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newImages: string[] = [];
      const maxImages = Math.min(files.length, 5 - images.length);
      
      for (let i = 0; i < maxImages; i++) {
        const file = files[i];
        
        // 压缩图片以减少存储大小
        const compressImage = (file: File): Promise<string> => {
          return new Promise((resolve) => {
            // 对于GIF文件，跳过压缩以保持动画效果
            if (file.type.toLowerCase().includes('gif')) {
              const reader = new FileReader();
              reader.onload = (e) => {
                resolve(e.target?.result as string);
              };
              reader.readAsDataURL(file);
              return;
            }

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
              // 调整最大尺寸与质量以适配 localStorage 配额
              const maxWidth = 900;
              const maxHeight = 700;
              let { width, height } = img;
              
              // 只有当图片超过最大尺寸时才进行缩放
              if (width > height) {
                if (width > maxWidth) {
                  height = (height * maxWidth) / width;
                  width = maxWidth;
                }
              } else {
                if (height > maxHeight) {
                  width = (width * maxHeight) / height;
                  height = maxHeight;
                }
              }
              
              canvas.width = width;
              canvas.height = height;
              
              // 设置更好的图像渲染质量
              ctx!.imageSmoothingEnabled = true;
              ctx!.imageSmoothingQuality = 'high';
              
              ctx?.drawImage(img, 0, 0, width, height);
              
              // 根据文件类型选择最佳格式和质量（尽量压缩体积）
              const fileType = file.type.toLowerCase();
              let mimeType = 'image/jpeg';
              let quality = 0.75;
              
              if (fileType.includes('png')) {
                // PNG 无损体积通常较大，转换为 WebP 以降低体积
                mimeType = 'image/webp';
                quality = 0.8;
              } else if (fileType.includes('webp')) {
                mimeType = 'image/webp';
                quality = 0.8;
              }
              
              const compressedDataUrl = canvas.toDataURL(mimeType, quality);
              resolve(compressedDataUrl);
            };
            
            img.src = URL.createObjectURL(file);
          });
        };
        
        compressImage(file).then((compressedImage) => {
          newImages.push(compressedImage);
          
          if (newImages.length === maxImages) {
            const updatedImages = [...images, ...newImages];
            setImages(updatedImages);
            
            // 检查是否包含GIF，如果包含则立即同步播放时间戳
            const hasNewGifs = newImages.some(img => img.toLowerCase().includes('.gif'));
            if (hasNewGifs) {
              // 延迟一点时间确保所有图片都加载完成，然后同步GIF播放
              setTimeout(() => {
                setSyncKey(prev => prev + 1);
              }, 200); // 增加延迟确保新上传的GIF完全加载
            }
          }
        });
      }
    }
  };

  const handleUploadClick = () => {
    if (images.length < 5) {
      fileInputRef.current?.click();
    }
  };

  // 新增：一键清空（改为弹窗确认）
  const handleClearAll = () => {
    setShowConfirmClear(true);
  };

  // 确认清空
  const confirmClearAll = () => {
    setImages([]);
    setShowConfirmClear(false);
    // 清空后轻微更新syncKey，确保UI即时刷新（含GIF状态）
    setTimeout(() => setSyncKey(prev => prev + 1), 50);
  };

  // 取消清空
  const cancelClearAll = () => {
    setShowConfirmClear(false);
  };

  const handleDeleteImage = (index: number) => {
    const deletedImage = images[index];
    const updatedImages = images.filter((_, i) => i !== index);
    setImages(updatedImages);
    
    // 如果删除的是GIF，且剩余图片中还有GIF，则重新同步播放时间戳
    const isDeletedGif = deletedImage.toLowerCase().includes('.gif');
    const hasRemainingGifs = updatedImages.some(img => img.toLowerCase().includes('.gif'));
    if (isDeletedGif && hasRemainingGifs) {
      // 延迟一点时间确保删除操作完成，然后同步剩余GIF
      setTimeout(() => {
        setSyncKey(prev => prev + 1);
      }, 150);
    }
  };

  // 新增：拖拽排序处理函数
  const handleDragStartImage = (index: number) => (e: React.DragEvent<HTMLDivElement>) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', String(index)); } catch (error) { void error; }
  };

  const handleDragOverImage = (index: number) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDropImage = (index: number) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const from = draggedIndex ?? parseInt(e.dataTransfer.getData('text/plain') || '-1', 10);
    const to = index;
    if (from >= 0 && to >= 0 && from !== to) {
      const newImages = [...images];
      const [moved] = newImages.splice(from, 1);
      const insertIndex = from < to ? to - 1 : to; // 修复向右拖拽时的插入位置偏移问题
      newImages.splice(insertIndex, 0, moved);
      setImages(newImages);
      if (
        moved.toLowerCase().includes('.gif') ||
        newImages[insertIndex].toLowerCase().includes('.gif')
      ) {
        setTimeout(() => setSyncKey(prev => prev + 1), 100);
      }
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEndImage = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // 移除手动同步函数，因为不再需要

  // 鼠标事件处理
  const handleMouseEnter = () => {
    setShowUploadButton(true);
  };

  const handleMouseLeave = () => {
    setShowUploadButton(false);
  };

  return (
    <div 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <SectionContainer 
        title={t('profile:actions.workshopShowcase')}
        subtitle={
          showUploadButton ? (
            images.length < 5 ? (
              <span 
                onClick={handleUploadClick}
                className="text-steam-primary hover:text-steam-secondary cursor-pointer transition-colors"
              >
                {t('profile:actions.upload')}
              </span>
            ) : (
              <span 
                onClick={handleClearAll}
                className="text-red-400 hover:text-red-300 cursor-pointer transition-colors"
                title="清空所有已上传图片"
              >
                {t('common:clear')}
              </span>
            )
          ) : undefined
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
        <div className="flex flex-col gap-4">
          {/* 第一行：用户名和创意工坊标题 */}
          <h2 className="text-steam-textPrimary text-2xl font-semibold" style={customFontStyle}>
            {customNickname 
              ? `${customNickname}${t('profile:actions.workshopShowcaseOf').includes("'s") ? "'s" : " 的"} ${t('profile:actions.workshopShowcase')}`
              : t('profile:actions.workshopShowcaseOf', { nickname: username || t('profile:defaultProfile.nickname') })
            }
          </h2>

          {/* 手动同步按钮 - 只在有GIF时显示 */}
          {images.some(img => img.toLowerCase().includes('.gif')) && (
            <div className="flex justify-center">
              <button
                onClick={() => setSyncKey(prev => prev + 1)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition-colors flex items-center space-x-2"
                title="同步所有GIF播放时间，让它们从第一帧开始播放"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                <span style={customFontStyle}>同步GIF时间轴</span>
              </button>
            </div>
          )}

          {/* 图片网格区域 - 只显示已上传的图片 */}
          {images.length > 0 && (
            <div className="flex gap-2 px-2.5">
              {images.map((image, index) => (
                <div 
                  key={`${index}-${syncKey}`} // 使用syncKey强制重新渲染
                  className={`flex-1 h-[400px] bg-steam-item rounded overflow-hidden relative ${draggedIndex === index ? 'opacity-70' : ''} ${dragOverIndex === index ? 'border-2 border-blue-400 border-dashed ring-2 ring-blue-400/50' : ''}`}
                  onMouseEnter={() => setHoveredImageIndex(index)}
                  onMouseLeave={() => setHoveredImageIndex(null)}
                  draggable={images.length > 1}
                  onDragStart={handleDragStartImage(index)}
                  onDragOver={handleDragOverImage(index)}
                  onDrop={handleDropImage(index)}
                  onDragEnd={handleDragEndImage}
                  onDragLeave={() => {
                    if (dragOverIndex === index) setDragOverIndex(null);
                  }}
                  style={{
                    cursor: draggedIndex === null ? 'grab' : 'grabbing',
                    transform: `translateX(${getShiftX(index)}px) scale(${dragOverIndex === index ? 1.03 : draggedIndex === index ? 0.97 : 1})`,
                    transition: 'transform 180ms ease, box-shadow 180ms ease, opacity 180ms ease',
                    boxShadow: dragOverIndex === index ? '0 0 0 2px rgba(59,130,246,0.3), 0 8px 20px rgba(0,0,0,0.35)' : undefined,
                  }}
                >
                  <SynchronizedGif 
                    src={image} 
                    alt={`Workshop image ${index + 1}`}
                    className="w-full h-full object-fill"
                    syncKey={syncKey}
                  />
                  {/* 删除按钮 */}
                  {hoveredImageIndex === index && (
                    <button
                      onClick={() => handleDeleteImage(index)}
                      className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-bold transition-colors z-10"
                    >
                      ×
                    </button>
                  )}
                  {/* 目标位置的细线指示（更显眼） */}
                  {dragOverIndex === index && (
                    <div className="absolute inset-y-2 left-0 w-1 rounded bg-blue-400/70 shadow-[0_0_10px_rgba(96,165,250,0.6)]"></div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 空状态提示 - 当没有图片时显示，保持区域大小 */}
          {images.length === 0 && (
            <div className="flex justify-center items-center h-[400px] bg-steam-item rounded">
              <div className="text-center">
                <div className="text-steam-textMuted text-2xl font-semibold">
                  
                </div>
              </div>
            </div>
          )}

          {/* 图片数量和提交作品数 */}
          <div className="bg-steam-item p-4 rounded">
            <div className="text-left">
              <h2 className="text-steam-textPrimary text-2xl font-bold mb-1">
                {imageCount}
              </h2>
              <div className="text-steam-textMuted text-sm">
                {t('profile:actions.submissionsCount')}
              </div>
            </div>
          </div>
        </div>
      </SectionContainer>
      
      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleImageUpload}
        className="hidden"
        disabled={images.length >= 5}
      />

      {/* 清空前确认弹窗 */}
      {showConfirmClear && (
        <div className="fixed inset-0 z-50">
          {/* 背景遮罩 */}
          <div className="absolute inset-0 bg-black/60" onClick={cancelClearAll} />
          {/* 弹窗主体 */}
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-steam-item rounded shadow-xl w-[360px] border border-steam-secondary-border">
              <div className="p-4">
                <h3 className="text-steam-textPrimary text-lg font-semibold mb-2" style={customFontStyle}>
                  {t('profile:actions.clearUploadsTitle')}
                </h3>
                <p className="text-steam-textMuted text-sm mb-4" style={customFontStyle}>
                  {t('profile:actions.clearUploadsMessage')}
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={cancelClearAll}
                    className="px-3 py-1 rounded bg-steam-item-in hover:bg-steam-item-in/80 text-steam-textPrimary text-sm transition-colors"
                    style={customFontStyle}
                  >
                    {t('common:cancel')}
                  </button>
                  <button
                    onClick={confirmClearAll}
                    className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-sm transition-colors"
                    style={customFontStyle}
                  >
                    {t('common:confirm')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkshopShowcase;
