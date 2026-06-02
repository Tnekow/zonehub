export function isDesktopRoute(pathname: string): boolean {
  return pathname.startsWith('/desktop');
}

/**
 * 在桌面壳环境下，确保路径带有 /desktop 前缀，防止导航“跳壳”回普通 Web 路由。
 * - 已经是 /desktop 或 /desktop/* 的路径会原样返回
 * - 其它绝对路径会被重写为 /desktop + 原路径
 * - "/" 会被重写为 "/desktop"
 */
export function ensureDesktopPath(path: string): string {
  if (!path) return '/desktop';
  let next = path;
  if (!next.startsWith('/')) {
    next = `/${next}`;
  }
  if (next === '/desktop' || next.startsWith('/desktop/')) {
    return next;
  }
  if (next === '/') {
    return '/desktop';
  }
  return `/desktop${next}`;
}

