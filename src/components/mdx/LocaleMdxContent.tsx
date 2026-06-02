import React, { useEffect, useState } from 'react';
import type { AppLocale } from '../../lib/localePath';
import { MdxArticle } from './MdxArticle';

type LocaleMdxContentProps<T> = {
  locale: AppLocale;
  load: (locale: AppLocale) => Promise<T & { default: React.ComponentType }>;
  fallback?: React.ReactNode;
};

/** 按 locale 动态加载 MDX 模块并渲染 default 导出 */
export function LocaleMdxContent<T>({ locale, load, fallback = null }: LocaleMdxContentProps<T>) {
  const [Content, setContent] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    let cancelled = false;
    setContent(null);
    load(locale).then((mod) => {
      if (!cancelled) setContent(() => mod.default);
    });
    return () => {
      cancelled = true;
    };
  }, [locale, load]);

  if (!Content) return <>{fallback}</>;

  return (
    <MdxArticle>
      <Content />
    </MdxArticle>
  );
}
