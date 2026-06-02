import { MDXProvider } from '@mdx-js/react';
import React from 'react';
import { mdxComponents } from './mdxComponents';

type MdxArticleProps = {
  children: React.ReactNode;
  className?: string;
};

/** 为 MDX 正文提供统一的 Steam 主题排版与组件映射 */
export function MdxArticle({ children, className = '' }: MdxArticleProps) {
  return (
    <MDXProvider components={mdxComponents}>
      <article
        className={`prose prose-invert max-w-none text-steam-textMuted ${className}`.trim()}
      >
        {children}
      </article>
    </MDXProvider>
  );
}
