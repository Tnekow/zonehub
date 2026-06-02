
import { lazy, type ComponentType } from 'react';

const RELOAD_KEY = 'steamzone_chunk_reload';

/**
 * Wraps React.lazy() with automatic retry on chunk load failure.
 * After a new deployment, stale HTML may reference old chunk hashes
 * that no longer exist. This helper catches the import error and
 * performs a single hard reload to fetch the latest HTML + chunks.
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(() =>
    factory().catch((err: unknown) => {
      const alreadyReloaded = sessionStorage.getItem(RELOAD_KEY);
      if (!alreadyReloaded) {
        sessionStorage.setItem(RELOAD_KEY, '1');
        window.location.reload();
        // Return a never-resolving promise to avoid rendering while reloading
        return new Promise<{ default: T }>(() => {});
      }
      sessionStorage.removeItem(RELOAD_KEY);
      throw err;
    }),
  );
}
