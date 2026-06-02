import { getLocalePrefix, withLocalePrefix } from './localePath';

/** Web / 桌面壳下的赞助支持页路径 */
export function resolveSupportPath(pathname: string): string {
  if (pathname.startsWith('/desktop')) {
    return '/desktop/support';
  }
  const localePrefix = getLocalePrefix(pathname);
  return withLocalePrefix(localePrefix, '/support');
}
