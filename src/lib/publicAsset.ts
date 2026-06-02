function hasExplicitProtocol(value: string): boolean {
  return /^(?:[a-z]+:)?\/\//i.test(value) || /^(?:data:|blob:|file:)/i.test(value)
}

export function toPublicAssetUrl(raw: string): string {
  if (!raw) return raw
  if (hasExplicitProtocol(raw)) return raw
  if (!raw.startsWith('/')) return raw

  const base = (import.meta.env.BASE_URL as string | undefined) || '/'
  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  return `${normalizedBase}${raw.slice(1)}`
}

