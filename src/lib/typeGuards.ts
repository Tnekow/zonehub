export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function readQueryErrorMeta(error: unknown): { status?: number; code?: string } {
  if (!isRecord(error)) return {}
  const status = typeof error.status === 'number' ? error.status : undefined
  const code = typeof error.code === 'string' ? error.code : undefined
  return { status, code }
}
