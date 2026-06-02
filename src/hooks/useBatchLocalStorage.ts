import { useState, useEffect, useMemo } from 'react';
import { readLocalStorageValue, writeLocalStorageValue } from '../lib/localStorageHelpers';
import { subscribeStorageKeys } from '../lib/storageSync';

/**
 * 批量读取 localStorage 的 Hook
 * 一次性读取多个键，减少同步阻塞时间
 * 
 * @param keys 键值对配置，key 为状态名，value 为 { storageKey: string, defaultValue: any }
 * @returns 状态对象，每个键对应 [value, setter] 元组
 * 
 * @example
 * const storage = useBatchLocalStorage({
 *   profileHeader: { storageKey: 'steamzone_profile', defaultValue: initialProfileHeader },
 *   customNickname: { storageKey: 'steamzone_customNickname', defaultValue: null },
 * })
 * const [profileHeader, setProfileHeader] = storage.profileHeader
 * const [customNickname, setCustomNickname] = storage.customNickname
 */
export function useBatchLocalStorage<T extends Record<string, unknown>>(
  keys: {
    [K in keyof T]: {
      storageKey: string;
      defaultValue: T[K];
    };
  }
): {
  [K in keyof T]: [T[K], (value: T[K] | ((val: T[K]) => T[K])) => void];
} {
  // 初始化：一次性读取所有 localStorage 键
  const [values, setValues] = useState<T>(() => {
    const result = {} as T;
    for (const [name, { storageKey, defaultValue }] of Object.entries(keys)) {
      result[name as keyof T] = readLocalStorageValue(storageKey, defaultValue);
    }
    return result;
  });

  // 监听 localStorage 变化（跨标签页同步）
  useEffect(() => {
    return subscribeStorageKeys(
      Object.values(keys).map(({ storageKey }) => storageKey),
      ({ key, newValue }) => {
        if (!key) return;

      // 找到对应的状态名
      for (const [name, { storageKey }] of Object.entries(keys)) {
        if (key === storageKey) {
          try {
            setValues((prev) => ({
              ...prev,
              [name]:
                newValue !== null ? JSON.parse(newValue) : keys[name as keyof T].defaultValue,
            }));
          } catch (error) {
            console.warn(`Error parsing localStorage value for key "${storageKey}":`, error);
          }
          break;
        }
      }
      }
    );
  }, [keys]);

  // 为每个键创建独立的 setter 函数，使用 useMemo 确保引用稳定
  const setters = useMemo(() => {
    const result = {} as {
      [K in keyof T]: (value: T[K] | ((val: T[K]) => T[K])) => void;
    };

    for (const name of Object.keys(keys) as Array<keyof T>) {
      const { storageKey } = keys[name];
      
      result[name] = (value: T[typeof name] | ((val: T[typeof name]) => T[typeof name])) => {
        setValues((prev) => {
          const valueToStore = value instanceof Function ? value(prev[name]) : value;
          try {
            writeLocalStorageValue(storageKey, valueToStore);
            return { ...prev, [name]: valueToStore };
          } catch (error) {
            console.error(`Error setting localStorage key "${storageKey}":`, error);
            return prev;
          }
        });
      };
    }

    return result;
  }, [keys]);

  // 返回格式：[value, setter] 的元组，与 useLocalStorage 保持一致
  return useMemo(() => {
    const result = {} as {
      [K in keyof T]: [T[K], (value: T[K] | ((val: T[K]) => T[K])) => void];
    };

    for (const name of Object.keys(keys) as Array<keyof T>) {
      result[name] = [values[name], setters[name]];
    }

    return result;
  }, [values, setters, keys]);
}

