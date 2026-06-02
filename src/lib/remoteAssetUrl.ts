import { toPublicAssetUrl } from './publicAsset';

/** Resolve a remote or bundled asset URL for display in the app. */
export function resolveRemoteAssetUrl(raw: string): string {
  if (typeof raw !== 'string' || !raw) {
    return toPublicAssetUrl(raw);
  }
  if (raw.startsWith('blob:') || raw.startsWith('data:')) {
    return raw;
  }
  if (raw.startsWith('https://')) {
    return raw;
  }
  return toPublicAssetUrl(raw);
}
