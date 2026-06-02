import { removeStorageAndNotify, setStorageAndNotify } from './storageSync';

export const LOCAL_STORAGE_WARN_BYTES = 5 * 1024 * 1024;
export const WORKSHOP_IMAGES_STORAGE_KEY = 'steamzone_workshopImages';

export function readLocalStorageValue<T>(key: string, fallback: T): T {
  try {
    const item = window.localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : fallback;
  } catch (error) {
    console.warn(`Error reading localStorage key "${key}":`, error);
    return fallback;
  }
}

export function writeLocalStorageValue<T>(key: string, value: T): void {
  const jsonValue = JSON.stringify(value);
  if (jsonValue.length > LOCAL_STORAGE_WARN_BYTES) {
    console.warn(`Data too large (${jsonValue.length} characters), may not save properly`);
  }

  try {
    setStorageAndNotify(key, value);
    return;
  } catch (error) {
    if (!(error instanceof Error) || error.name !== 'QuotaExceededError') {
      throw error;
    }
  }

  // 配额不足时先清理体积较大的工坊图片缓存，再重试一次
  try {
    if (key !== WORKSHOP_IMAGES_STORAGE_KEY) {
      removeStorageAndNotify(WORKSHOP_IMAGES_STORAGE_KEY);
    }
    setStorageAndNotify(key, value);
  } catch (retryError) {
    console.error(`Error setting localStorage key "${key}" after cleanup:`, retryError);
    if (retryError instanceof Error && retryError.name === 'QuotaExceededError') {
      console.warn(`localStorage quota exceeded while saving "${key}".`);
    }
    throw retryError;
  }
}
