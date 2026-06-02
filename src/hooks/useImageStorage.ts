import { useEffect, useRef, useState } from 'react';
import { readLocalStorageValue, writeLocalStorageValue } from '../lib/localStorageHelpers';
import { subscribeStorageKeys } from '../lib/storageSync';

function openImageDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('steamzone-image-db', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(id: string, blob: Blob): Promise<void> {
  const db = await openImageDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('images', 'readwrite');
    const store = tx.objectStore('images');
    const req = store.put(blob, id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(id: string): Promise<Blob | null> {
  const db = await openImageDB();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction('images', 'readonly');
    const store = tx.objectStore('images');
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], { type: mime });
}

function hashString(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return 'h' + (h >>> 0).toString(16) + '_' + Math.floor(Math.random() * 1e6);
}

function toStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.filter((item): item is string => typeof item === 'string');
}

async function resolveImageTokens(tokens: string[]): Promise<string[]> {
  const resolved: string[] = [];
  for (const t of tokens) {
    if (t.startsWith('idb:')) {
      const id = t.slice(4);
      const blob = await idbGet(id);
      if (blob) {
        const fr = new FileReader();
        const dataUrl: string = await new Promise((res) => {
          fr.onload = () => res(fr.result as string);
          fr.readAsDataURL(blob);
        });
        resolved.push(dataUrl);
      }
    } else {
      resolved.push(t);
    }
  }
  return resolved;
}

async function tokensFromStorage(key: string, initial: string[]): Promise<string[]> {
  const raw = readLocalStorageValue<unknown>(key, initial);
  return resolveImageTokens(toStringArray(raw));
}

export default function useImageStorage(
  key: string,
  initial: string[],
): [string[], (value: string[] | ((val: string[]) => string[])) => void] {
  const [value, setValue] = useState<string[]>(initial);
  const latestValueRef = useRef<string[]>(initial);
  const initialRef = useRef(initial);
  initialRef.current = initial;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resolved = await tokensFromStorage(key, initialRef.current);
        if (cancelled) return;
        latestValueRef.current = resolved;
        setValue(resolved);
      } catch {
        if (cancelled) return;
        latestValueRef.current = initialRef.current;
        setValue(initialRef.current);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  useEffect(() => {
    return subscribeStorageKeys([key], ({ newValue }) => {
      void (async () => {
        try {
          const tokens =
            newValue !== null ? toStringArray(JSON.parse(newValue)) : initialRef.current;
          const resolved = await resolveImageTokens(tokens);
          latestValueRef.current = resolved;
          setValue(resolved);
        } catch {
          latestValueRef.current = initialRef.current;
          setValue(initialRef.current);
        }
      })();
    });
  }, [key]);

  const setter = (next: string[] | ((val: string[]) => string[])) => {
    const nextArrRaw = next instanceof Function ? next(latestValueRef.current) : next;
    const nextArr = toStringArray(nextArrRaw);
    latestValueRef.current = nextArr;
    setValue(nextArr);
    void (async () => {
      const tokens: string[] = [];
      for (const item of nextArr) {
        // 超过 300KB 的图片存到 IndexedDB
        if (item.length > 300 * 1024) {
          const id = hashString(item.slice(0, 512));
          try {
            await idbPut(id, dataUrlToBlob(item));
            tokens.push('idb:' + id);
          } catch {
            tokens.push(item); // 回退到直接存储
          }
        } else {
          tokens.push(item);
        }
      }
      try {
        writeLocalStorageValue(key, tokens);
      } catch (e) {
        console.warn('Failed saving image tokens', e);
      }
    })();
  };

  return [value, setter];
}
