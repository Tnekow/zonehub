import { clearSteamThemeData } from '../hooks/useLocalStorage'

export type ProfileConfigEnvelope = {
  schemaVersion: number
  createdAt: string
  appVersion?: string
  /** Key-value dump of profile localStorage keys safe for sharing. */
  kv: Record<string, unknown>
}

/** @deprecated Use ProfileConfigEnvelope */
export type SteamzoneConfigEnvelope = ProfileConfigEnvelope

const INCLUDED_KEYS = [
  'steamzone_profile',
  'steamzone_background',
  'steamzone_theme',
  'steamzone_customBackground',
] as const

function listCustomSectionKeys(): string[] {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith('steamzone_customSection_')) keys.push(k)
  }
  return keys
}

function listFeaturedArtworkKeys(): string[] {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith('steamzone_featuredArtwork_')) keys.push(k)
  }
  return keys
}

function listCuratedArtworkKeys(): string[] {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith('steamzone_curatedArtwork_')) keys.push(k)
  }
  return keys
}

function safeParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function getActiveShowcaseComponents(): string[] {
  try {
    const raw = localStorage.getItem('steamzone_editableComponents')
    if (!raw) return []
    const components = JSON.parse(raw) as Array<{ id: string; type: string }>
    return components.map(c => c.id).filter(Boolean)
  } catch {
    return []
  }
}

export function exportProfileConfig(): ProfileConfigEnvelope {
  const kv: Record<string, unknown> = {}

  for (const k of INCLUDED_KEYS) {
    const raw = localStorage.getItem(k)
    if (raw != null) kv[k] = safeParseJson(raw)
  }

  const editableComponentsRaw = localStorage.getItem('steamzone_editableComponents')
  if (editableComponentsRaw != null) {
    kv['steamzone_editableComponents'] = safeParseJson(editableComponentsRaw)
  }

  const activeComponents = getActiveShowcaseComponents()

  for (const k of listCustomSectionKeys()) {
    const componentId = k.replace('steamzone_customSection_', '')
    if (activeComponents.includes(componentId)) {
      const raw = localStorage.getItem(k)
      if (raw != null) kv[k] = safeParseJson(raw)
    }
  }

  for (const k of listFeaturedArtworkKeys()) {
    const componentId = k.replace('steamzone_featuredArtwork_', '')
    if (activeComponents.includes(componentId)) {
      const raw = localStorage.getItem(k)
      if (raw != null) kv[k] = safeParseJson(raw)
    }
  }

  for (const k of listCuratedArtworkKeys()) {
    const componentId = k.replace('steamzone_curatedArtwork_', '')
    if (activeComponents.includes(componentId)) {
      const raw = localStorage.getItem(k)
      if (raw != null) kv[k] = safeParseJson(raw)
    }
  }

  const hasBadgeCollector = activeComponents.some(id => id.startsWith('badgeCollector'))
  if (hasBadgeCollector) {
    const badgeKeys = [
      'steamzone_badgeCollector_1x6',
      'steamzone_badgeCollector_1x6_counters',
      'steamzone_badgeCollector_2x6',
      'steamzone_badgeCollector_2x6_counters',
    ]
    for (const k of badgeKeys) {
      const raw = localStorage.getItem(k)
      if (raw != null) kv[k] = safeParseJson(raw)
    }
  }

  if (activeComponents.includes('workshopShowcase')) {
    const raw = localStorage.getItem('steamzone_workshopImages')
    if (raw != null) {
      const images = safeParseJson(raw)
      if (Array.isArray(images)) {
        kv['steamzone_workshopImages'] = images
      }
    }
  }

  return {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    kv,
  }
}

export function importProfileConfig(envelope: ProfileConfigEnvelope): void {
  clearSteamThemeData()

  const kv = envelope?.kv ?? {}
  for (const [k, v] of Object.entries(kv)) {
    const allowed =
      (INCLUDED_KEYS as readonly string[]).includes(k) ||
      k.startsWith('steamzone_customSection_') ||
      k.startsWith('steamzone_featuredArtwork_') ||
      k.startsWith('steamzone_curatedArtwork_') ||
      k.startsWith('steamzone_badgeCollector_') ||
      k === 'steamzone_workshopImages' ||
      k === 'steamzone_editableComponents' ||
      k === 'steamzone_customNickname' ||
      k === 'steamzone_customDescription' ||
      k === 'steamzone_userStatus' ||
      k === 'steamzone_sidebarCounts'

    if (!allowed) continue

    try {
      localStorage.setItem(k, JSON.stringify(v))
    } catch {
      // ignore
    }
  }
}

export function estimateUtf8BytesOfJson(value: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength
  } catch {
    return Infinity
  }
}

/** @deprecated Use exportProfileConfig */
export const exportSteamzoneConfig = exportProfileConfig
/** @deprecated Use importProfileConfig */
export const importSteamzoneConfig = importProfileConfig
