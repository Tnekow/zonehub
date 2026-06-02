export type LocalePrefix = '' | '/en' | '/ja';

export type AppLocale = 'zh-CN' | 'en-US' | 'ja-JP';

/** 从 pathname 解析 locale 前缀（'' | '/en' | '/ja'） */
export function getLocalePrefix(pathname: string): LocalePrefix {
  if (pathname === '/en' || pathname.startsWith('/en/')) return '/en';
  if (pathname === '/ja' || pathname.startsWith('/ja/')) return '/ja';
  return '';
}

/** 去掉 locale 前缀，得到无前缀路径（如 `/en/foo` → `/foo`） */
export function stripLocalePrefix(pathname: string): string {
  const prefix = getLocalePrefix(pathname);
  if (!prefix) return pathname;
  const rest = pathname.slice(prefix.length);
  return rest === '' ? '/' : rest;
}

/** 归一化为无前缀的绝对路径 */
export function normalizePathname(pathname: string): string {
  const base = stripLocalePrefix(pathname);
  return base.startsWith('/') ? base : `/${base}`;
}

/** 在给定 locale 前缀下拼接目标路径 */
export function withLocalePrefix(prefix: LocalePrefix, path: string): string {
  const segment = path.startsWith('/') ? path : `/${path}`;
  if (prefix === '') return segment;
  if (segment === '/') return prefix;
  return `${prefix}${segment}`;
}

/** 保持当前 pathname 的 locale，跳转到 targetSegment */
export function withLocalePath(pathname: string, targetSegment: string): string {
  return withLocalePrefix(getLocalePrefix(pathname), targetSegment);
}

/** 是否为编辑器首页路由（/、/en、/ja） */
export function isEditorHomeRoute(pathname: string): boolean {
  return normalizePathname(pathname) === '/';
}

/** 是否为 Landing 首页路由（/home、/en/home、/ja/home） */
export function isLandingHomeRoute(pathname: string): boolean {
  return normalizePathname(pathname) === '/home';
}

/** pathname 是否与给定无前缀路由一致（忽略 /en、/ja 前缀） */
export function matchesRoutePath(pathname: string, routePath: string): boolean {
  const target = routePath.startsWith('/') ? routePath : `/${routePath}`;
  return normalizePathname(pathname) === target;
}

/** 中文或日文编辑器首页（用于保留现有导航不对称逻辑） */
export function isZhOrJaEditorHome(pathname: string): boolean {
  const prefix = getLocalePrefix(pathname);
  return isEditorHomeRoute(pathname) && (prefix === '' || prefix === '/ja');
}

/** 从 pathname 推断 i18n locale */
export function localeFromPathname(pathname: string): AppLocale {
  const prefix = getLocalePrefix(pathname);
  if (prefix === '/en') return 'en-US';
  if (prefix === '/ja') return 'ja-JP';
  return 'zh-CN';
}

/** 将 pathname 切换到目标 locale，保持无前缀路径段不变 */
export function switchPathToLocale(pathname: string, locale: AppLocale): string {
  const base = normalizePathname(pathname);
  if (locale === 'en-US') {
    if (getLocalePrefix(pathname) === '/en') return pathname;
    return base === '/' ? '/en' : `/en${base}`;
  }
  if (locale === 'ja-JP') {
    if (getLocalePrefix(pathname) === '/ja') return pathname;
    return base === '/' ? '/ja' : `/ja${base}`;
  }
  if (getLocalePrefix(pathname) !== '') {
    return base;
  }
  return pathname;
}
