export interface BadgeLevelAsset {
  level: number
  image_url?: string
  image_local?: string
  image_cdn?: string
  image?: string
}

export interface BadgeEntry {
  name: string
  levels: BadgeLevelAsset[]
}

export interface BadgeColorGroup {
  color: string
  badges: BadgeEntry[]
}

export interface BadgeCatalog {
  colors: BadgeColorGroup[]
}

import raw from './badges.json'
import { toPublicAssetUrl } from '../lib/publicAsset'
import { isRecord } from '../lib/typeGuards'

/** badges.json 中 image_local 的前缀，对应 public/badges/assets/（offline 分支内置资源） */
const BUNDLED_ASSET_PREFIX = 'data/assets/'

function normalizeSteamUrl(u?: string) {
  if (!u) return undefined
  let s = u.trim()
  s = s.replace(/^`+|`+$/g, '')
  s = s.replace(/^"+|"+$/g, '')
  if (s.startsWith('//')) s = 'https:' + s
  if (s.startsWith('/')) s = 'https://community.cloudflare.steamstatic.com' + s
  return s
}

/**
 * 将 catalog 中的 image_local 映射为可离线访问的静态资源 URL（public/badges/assets）。
 * 在线分支若无内置资源，应优先使用 CDN（见 resolveBadgeImage）。
 */
export function toBundledBadgeUrl(imageLocal?: string): string | undefined {
  if (!imageLocal) return undefined
  let rel = imageLocal.trim()
  rel = rel.replace(/^`+|`+$/g, '').replace(/^"+|"+$/g, '')
  if (rel.startsWith(BUNDLED_ASSET_PREFIX)) {
    rel = rel.slice(BUNDLED_ASSET_PREFIX.length)
  } else if (rel.startsWith('badges/assets/')) {
    rel = rel.slice('badges/assets/'.length)
  } else if (rel.startsWith('/badges/assets/')) {
    rel = rel.slice('/badges/assets/'.length)
  }
  if (!rel || rel.includes('..')) return undefined
  return toPublicAssetUrl(`/badges/assets/${rel}`)
}

/** badgesimg → badgesapi，走 image-proxy 白名单（proxy.ts） */
function toWorkerBadgeUrl(u?: string): string | undefined {
  const s = normalizeSteamUrl(u)
  if (!s) return undefined
  try {
    const url = new URL(s)
    if (url.hostname === 'badgesimg.steamzone.site') {
      url.hostname = 'badgesapi.steamzone.site'
      return url.toString()
    }
    if (s.includes('/assets/')) {
      return s.replace('badgesimg.steamzone.site', 'badgesapi.steamzone.site')
    }
  } catch {
    // ignore invalid URL
  }
  return s
}

/**
 * 在线版（steamsoftware / master）：CDN → Steam 官方图。
 * 离线版可在构建时设 VITE_PREFER_BUNDLED_BADGES=true 优先本地 public/badges/assets。
 */
function resolveBadgeImage(level: {
  image_local?: string
  image_cdn?: string
  image_url?: string
}): string | undefined {
  const preferBundled = import.meta.env.VITE_PREFER_BUNDLED_BADGES === 'true'
  const bundled = toBundledBadgeUrl(level.image_local)
  const remote =
    toWorkerBadgeUrl(level.image_cdn) ?? normalizeSteamUrl(level.image_url)

  if (preferBundled) {
    return bundled ?? remote
  }
  return remote ?? bundled
}

function sanitizeCatalog(input: unknown): BadgeCatalog {
  const root = isRecord(input) ? input : {}
  const colors = Array.isArray(root.colors) ? root.colors : []
  const out: BadgeCatalog = { colors: [] }
  for (const grp of colors) {
    if (!isRecord(grp)) continue
    const color = String(grp.color ?? '').trim()
    const badges = Array.isArray(grp.badges) ? grp.badges : []
    const normBadges: BadgeEntry[] = badges.flatMap((b) => {
      if (!isRecord(b)) return []
      const name = String(b.name ?? '').trim()
      const levels = Array.isArray(b.levels) ? b.levels : []
      const normLevels: BadgeLevelAsset[] = levels.flatMap((lv) => {
        if (!isRecord(lv)) return []
        const image_cdn = normalizeSteamUrl(typeof lv.image_cdn === 'string' ? lv.image_cdn : undefined)
        const image_url = normalizeSteamUrl(typeof lv.image_url === 'string' ? lv.image_url : undefined)
        const image_local = typeof lv.image_local === 'string' ? lv.image_local.trim() : undefined
        return [{
          level: Number(lv.level ?? 0),
          image_url,
          image_local,
          image_cdn,
          image: resolveBadgeImage({ image_local, image_cdn, image_url }),
        }]
      })
      return [{ name, levels: normLevels }]
    })
    out.colors.push({ color, badges: normBadges })
  }
  return out
}

export const badgesCatalog: BadgeCatalog = sanitizeCatalog(raw)

export interface FlatBadgeLevel {
  color: string
  name: string
  level: number
  image?: string
  image_url?: string
  image_cdn?: string
  image_local?: string
}

export function getAllBadgeLevels(): FlatBadgeLevel[] {
  const result: FlatBadgeLevel[] = []
  for (const grp of badgesCatalog.colors) {
    for (const b of grp.badges) {
      for (const lv of b.levels) {
        const image =
          lv.image ??
          resolveBadgeImage(lv)
        result.push({
          color: grp.color,
          name: b.name,
          level: lv.level,
          image,
          image_url: undefined,
          image_cdn: undefined,
          image_local: undefined,
        })
      }
    }
  }
  return result
}

export function getBadgeByName(name: string): BadgeEntry | undefined {
  const n = name.trim().toLowerCase()
  for (const grp of badgesCatalog.colors) {
    for (const b of grp.badges) {
      if (b.name.trim().toLowerCase() === n) return b
    }
  }
  return undefined
}

export function searchBadgeLevelsByName(q: string): FlatBadgeLevel[] {
  const s = q.trim().toLowerCase()
  if (!s) return []
  return getAllBadgeLevels().filter(x => x.name.toLowerCase().includes(s))
}

export function randomBadgeLevels(count = 20, opts?: { colors?: string[] }) {
  const pool = getAllBadgeLevels().filter(x => !opts?.colors || opts.colors.includes(x.color))
  const out: FlatBadgeLevel[] = []
  const used = new Set<string>()
  for (let i = 0; i < pool.length && out.length < Math.max(1, count); i++) {
    const j = Math.floor(Math.random() * pool.length)
    const item = pool[j]
    const key = `${item.name}-${item.level}-${item.color}`
    if (used.has(key)) continue
    used.add(key)
    out.push(item)
  }
  return out
}
