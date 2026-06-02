import { useState, useEffect, useRef } from 'react';
import { readLocalStorageValue, writeLocalStorageValue } from '../lib/localStorageHelpers';
import { removeStorageAndNotify, subscribeStorageKeys } from '../lib/storageSync';

/**
 * 自定义hook用于管理本地存储
 * @param key 存储键名
 * @param initialValue 初始值
 * @returns [storedValue, setValue] 存储的值和设置函数
 */
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const initialValueRef = useRef(initialValue);
  initialValueRef.current = initialValue;

  // 获取存储的值或使用初始值
  const [storedValue, setStoredValue] = useState<T>(() => readLocalStorageValue(key, initialValue));
  const latestValueRef = useRef<T>(storedValue);

  // storageKey 变化时重新从 localStorage 读取，避免组件复用导致读到旧 key 的内存态
  useEffect(() => {
    const next = readLocalStorageValue(key, initialValueRef.current);
    latestValueRef.current = next;
    setStoredValue(next);
  }, [key]);

  // 设置值的函数
  const setValue = (value: T | ((val: T) => T)) => {
    // 允许值是一个函数，这样我们就有了与useState相同的API。
    // 使用 ref 保存最新值，避免连续更新时闭包拿到旧值。
    const previousValue = latestValueRef.current;
    const valueToStore = value instanceof Function ? value(previousValue) : value;
    latestValueRef.current = valueToStore;

    setStoredValue(valueToStore);

    try {
      writeLocalStorageValue(key, valueToStore);
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  // 监听localStorage变化（跨标签页同步）
  useEffect(() => {
    return subscribeStorageKeys([key], ({ newValue }) => {
      if (newValue !== null) {
        try {
          const parsed = JSON.parse(newValue);
          latestValueRef.current = parsed;
          setStoredValue(parsed);
        } catch (error) {
          console.warn(`Error parsing localStorage value for key "${key}":`, error);
        }
      } else {
        latestValueRef.current = initialValueRef.current;
        setStoredValue(initialValueRef.current);
      }
    });
  }, [key]);

  return [storedValue, setValue];
}

/**
 * 清除所有Steam主题相关的本地存储数据
 */
export const clearSteamThemeData = () => {
  const steamThemeKeys = [
    'steamzone_profile', 'steamzone_background', 'steamzone_theme',
    'steamzone_userStatus', 'steamzone_customNickname', 'steamzone_sidebarCounts',
    'steamzone_workshopImages', 'steamzone_editMode', 'steamzone_editableComponents',
    'steamzone_customBackground',
    'steamzone_showHeroBanner',
    'steamzone_customDescription',
    // Badge collector layouts
    'steamzone_badgeCollector_1x6',
    'steamzone_badgeCollector_1x6_counters',
    'steamzone_badgeCollector_2x6',
    'steamzone_badgeCollector_2x6_counters',
  ];
  
  // 清理所有customSection数据
  const customSectionKeys = Object.keys(localStorage).filter(key => 
    key.startsWith('steamzone_customSection_')
  );
  
  // 清理所有featuredArtwork数据
  const featuredArtworkKeys = Object.keys(localStorage).filter(key => 
    key.startsWith('steamzone_featuredArtwork_')
  );
  
  [...steamThemeKeys, ...customSectionKeys, ...featuredArtworkKeys].forEach(key => {
    try {
      removeStorageAndNotify(key);
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  });
};

/**
 * 获取所有Steam主题相关的存储数据（用于调试）
 */
export const getSteamThemeData = () => {
  const steamThemeKeys = [
    'steamzone_profile',
    'steamzone_background', 
    'steamzone_theme',
    'steamzone_userStatus',
    'steamzone_customNickname',
    'steamzone_sidebarCounts',
    'steamzone_workshopImages',
    'steamzone_editMode',
    'steamzone_editableComponents',
    'steamzone_customBackground',
    'steamzone_showHeroBanner',
    'steamzone_customDescription'
  ];
  
  const data: Record<string, unknown> = {};
  steamThemeKeys.forEach(key => {
    const item = readLocalStorageValue<unknown | null>(key, null);
    if (item !== null) {
      data[key] = item;
    }
  });
  
  return data;
};

export default useLocalStorage;