export const STORAGE_SYNC_EVENT = 'steamzone:storage-sync';

type StorageSyncDetail = {
  key: string;
  newValue: string | null;
};

export function setStorageAndNotify(key: string, value: unknown): string {
  const newValue = JSON.stringify(value);
  window.localStorage.setItem(key, newValue);
  window.dispatchEvent(
    new CustomEvent<StorageSyncDetail>(STORAGE_SYNC_EVENT, {
      detail: { key, newValue },
    })
  );
  return newValue;
}

export function removeStorageAndNotify(key: string) {
  window.localStorage.removeItem(key);
  window.dispatchEvent(
    new CustomEvent<StorageSyncDetail>(STORAGE_SYNC_EVENT, {
      detail: { key, newValue: null },
    })
  );
}

export function subscribeStorageKeys(
  keys: string[],
  onChange: (payload: StorageSyncDetail) => void
) {
  const keySet = new Set(keys);

  const handleStorage = (e: StorageEvent) => {
    if (!e.key || !keySet.has(e.key)) return;
    onChange({ key: e.key, newValue: e.newValue });
  };

  const handleCustom = (e: Event) => {
    const detail = (e as CustomEvent<StorageSyncDetail>).detail;
    if (!detail || !keySet.has(detail.key)) return;
    onChange(detail);
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener(STORAGE_SYNC_EVENT, handleCustom as EventListener);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(STORAGE_SYNC_EVENT, handleCustom as EventListener);
  };
}
