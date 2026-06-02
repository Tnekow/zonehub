type TrackPayload = Record<string, unknown> | undefined;

/**
 * No-op analytics wrapper for Electron-only mode.
 * Keep this interface so existing track(...) call sites remain stable.
 */
export function track(_event: string, _payload?: TrackPayload) {
  void _event;
  void _payload;
  return;
}
