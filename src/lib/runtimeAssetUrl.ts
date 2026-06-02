import { toPublicAssetUrl } from './publicAsset';

function hasExplicitProtocol(value: string): boolean {
  return /^(?:[a-z]+:)?\/\//i.test(value) || /^(?:data:|blob:|file:)/i.test(value);
}

/**
 * 统一处理运行时资源地址：
 * - 绝对 URL / data: / blob: / file: 原样返回
 * - 其它 /images/* 等 public 资源走 BASE_URL 兼容 file://
 */
export function toRuntimeAssetUrl(raw: string | null | undefined): string {
  if (!raw) return '';
  const value = String(raw).trim();
  if (!value) return '';
  if (hasExplicitProtocol(value)) return value;

  return toPublicAssetUrl(value);
}

