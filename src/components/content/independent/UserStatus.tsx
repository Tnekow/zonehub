import React, { useState } from 'react';
import { useI18n } from '../../../hooks/useI18n';

export interface UserStatusData {
  isOnline: boolean;
  lastOnlineDays?: number;
}

interface UserStatusProps {
  status: UserStatusData;
  onChange?: (status: UserStatusData) => void;
}

const UserStatus: React.FC<UserStatusProps> = ({ status, onChange }) => {
  const { t } = useI18n();
  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [editDays, setEditDays] = useState(status.lastOnlineDays?.toString() || '12');

  const handleStatusChange = (isOnline: boolean) => {
    const newStatus: UserStatusData = {
      isOnline,
      lastOnlineDays: isOnline ? undefined : parseInt(editDays) || 12
    };
    onChange?.(newStatus);
    setIsEditing(false);
  };

  const handleDaysChange = (days: string) => {
    setEditDays(days);
    if (onChange) {
      onChange({
        isOnline: false,
        lastOnlineDays: parseInt(days) || 12
      });
    }
  };

  const getStatusColor = () => {
    return status.isOnline ? 'text-steam-textSecondary' : 'text-steam-textMuted';
  };

  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 主状态显示 */}
      <div className={`text-lg leading-8 ${getStatusColor()}`}>
        {status.isOnline ? t('profile:userStatus.currentOnline') : t('profile:userStatus.currentOffline')}
      </div>
      
      {/* 离线时的上次在线时间 */}
      {!status.isOnline && (
        <div className={`text-base leading-8 ${getStatusColor()}`}>
          {t('profile:userStatus.lastOnlineTemplate', { days: status.lastOnlineDays || 12 })}
        </div>
      )}

      {/* 编辑按钮 - 只在悬停时显示 */}
      {isHovered && (
        <button
          onClick={() => setIsEditing(true)}
          className="absolute top-0 right-0 p-1 text-steam-textMuted hover:text-steam-textSecondary transition-colors duration-200"
          title={t('profile:userStatus.editStatus')}
        >
          {/* 编辑图标 */}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
          </svg>
        </button>
      )}

      {/* 编辑模态框 */}
      {isEditing && (
        <div className="absolute top-8 right-0 bg-steam-item-in border border-steam-secondary-border rounded p-3 shadow-lg z-10 min-w-[200px]">
          <div className="flex flex-col gap-3">
            {/* 在线状态选择 */}
            <div className="flex flex-col gap-2">
              <label className="text-steam-textPrimary text-sm font-medium">{t('profile:userStatus.onlineStatus')}</label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleStatusChange(true)}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    status.isOnline 
                      ? 'bg-steam-primary text-steam-buttonText' 
                      : 'bg-steam-secondary-border text-steam-textMuted hover:bg-steam-border'
                  }`}
                >
                  {t('profile:header.online')}
                </button>
                <button
                  onClick={() => handleStatusChange(false)}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    !status.isOnline 
                      ? 'bg-steam-primary text-steam-buttonText' 
                      : 'bg-steam-secondary-border text-steam-textMuted hover:bg-steam-border'
                  }`}
                >
                  {t('profile:header.offline')}
                </button>
              </div>
            </div>

            {/* 离线天数编辑 */}
            {!status.isOnline && (
              <div className="flex flex-col gap-2">
                <label className="text-steam-textPrimary text-sm font-medium">{t('profile:userStatus.offlineDays')}</label>
                <input
                  type="number"
                  value={editDays}
                  onChange={(e) => handleDaysChange(e.target.value)}
                  className="bg-steam-border text-steam-textPrimary border border-steam-secondary-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-steam-primary"
                  min="1"
                  max="365"
                />
              </div>
            )}

            {/* 关闭按钮 */}
            <button
              onClick={() => setIsEditing(false)}
              className="text-steam-textMuted hover:text-steam-textSecondary text-sm transition-colors"
            >
              {t('profile:userStatus.close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserStatus; 
