import React, { useState } from 'react';
import SafeImage from './SafeImage';

interface DataListItemProps<T> {
  data: T;
  avatarKey: keyof T;
  primaryTextKey: keyof T;
  secondaryTextKey: keyof T;
  extraInfoKey?: keyof T;
  extraInfoRenderer?: (value: unknown) => React.ReactNode;
  onClick?: (data: T) => void;
  className?: string;
  avatarSize?: number;
  textSize?: number;
  getPrimaryTextColor?: (data: T) => string;
  getSecondaryTextColor?: (data: T) => string;
}

interface DataListContainerProps<T> {
  data: T[];
  title: string;
  avatarKey: keyof T;
  primaryTextKey: keyof T;
  secondaryTextKey: keyof T;
  extraInfoKey?: keyof T;
  extraInfoRenderer?: (value: unknown) => React.ReactNode;
  onItemClick?: (data: T) => void;
  className?: string;
  avatarSize?: number;
  textSize?: number;
  getPrimaryTextColor?: (data: T) => string;
  getSecondaryTextColor?: (data: T) => string;
}

const DataListItem = <T extends Record<string, unknown>>({
  data,
  avatarKey,
  primaryTextKey,
  secondaryTextKey,
  extraInfoKey,
  extraInfoRenderer,
  onClick,
  className = '',
  avatarSize = 45,
  textSize = 16,
  getPrimaryTextColor,
  getSecondaryTextColor
}: DataListItemProps<T>) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    onClick?.(data);
  };

  return (
    <div 
      className={`relative flex items-center cursor-pointer rounded px-2 py-1 transition-colors duration-200 h-12 ${
        isHovered ? 'bg-steam-item-in' : ''
      } ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      {/* 左侧头像 */}
      <div className="flex-shrink-0">
        <SafeImage
          src={data[avatarKey] as string} 
          alt="Avatar" 
          className="rounded border border-steam-secondary-border object-cover"
          style={{ width: `${avatarSize}px`, height: `${avatarSize}px` }}
        />
      </div>
      
      {/* 中间文本信息 */}
      <div className="flex-1 flex flex-col justify-center ml-3 min-w-0">
        {/* 主要文本 */}
        <div 
          className={`truncate ${getPrimaryTextColor ? getPrimaryTextColor(data) : 'text-steam-textPrimary'}`} 
          style={{ fontSize: `${textSize}px` }}
        >
          {data[primaryTextKey] as string}
        </div>
        
        {/* 次要文本 */}
        <div 
          className={`truncate ${getSecondaryTextColor ? getSecondaryTextColor(data) : 'text-steam-textMuted'}`} 
          style={{ fontSize: `${textSize}px` }}
        >
          {data[secondaryTextKey] as string}
        </div>
      </div>

      {/* 右侧额外信息 */}
      {extraInfoKey && data[extraInfoKey] && (
        <div className="flex-shrink-0 ml-2">
          {extraInfoRenderer ? (
            extraInfoRenderer(data[extraInfoKey])
          ) : (
            <div className="text-base text-steam-textMuted">
              {data[extraInfoKey] as string}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const DataListContainer = <T extends Record<string, unknown>>({
  data,
  title,
  avatarKey,
  primaryTextKey,
  secondaryTextKey,
  extraInfoKey,
  extraInfoRenderer,
  onItemClick,
  className = '',
  avatarSize = 45,
  textSize = 16,
  getPrimaryTextColor,
  getSecondaryTextColor
}: DataListContainerProps<T>) => {
  // 格式化数字，添加千位分隔符
  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {/* 标题和计数*/}
      <div className="flex items-center px-2 py-1">
        <span className="text-base text-steam-textPrimary">
          {title}
        </span>
        <span className="text-xl text-steam-textMuted ml-2 transform -translate-y-[2.3px]">
          {formatNumber(data.length)}
        </span>
      </div>
      
      {/* 数据项列表*/}
      {data.map((item, index) => (
        <DataListItem
          key={index}
          data={item}
          avatarKey={avatarKey}
          primaryTextKey={primaryTextKey}
          secondaryTextKey={secondaryTextKey}
          extraInfoKey={extraInfoKey}
          extraInfoRenderer={extraInfoRenderer}
          onClick={onItemClick}
          avatarSize={avatarSize}
          textSize={textSize}
          getPrimaryTextColor={getPrimaryTextColor}
          getSecondaryTextColor={getSecondaryTextColor}
        />
      ))}
    </div>
  );
};

export { DataListContainer };
export default DataListItem; 
