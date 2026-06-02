import type { MDXComponents } from 'mdx/types';
import React from 'react';
import { CopyCodeBlock } from './CopyCodeBlock';

export const mdxComponents: MDXComponents = {
  CopyCodeBlock,
  a: ({ href, children, ...props }) => (
    <a
      href={href}
      target={href?.startsWith('http') ? '_blank' : undefined}
      rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
      className="text-steam-textSecondary hover:underline"
      {...props}
    >
      {children}
    </a>
  ),
  h2: ({ children, ...props }) => (
    <h2 className="text-xl font-semibold text-steam-textPrimary mb-4 mt-0" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="text-lg font-medium text-steam-textPrimary mb-3 mt-6" {...props}>
      {children}
    </h3>
  ),
  h4: ({ children, ...props }) => (
    <h4 className="text-steam-textPrimary font-medium mb-2 mt-4" {...props}>
      {children}
    </h4>
  ),
  p: ({ children, ...props }) => (
    <p className="text-steam-textMuted text-sm leading-relaxed" {...props}>
      {children}
    </p>
  ),
  ol: ({ children, ...props }) => (
    <ol className="list-decimal list-inside space-y-3 ml-4 my-4" {...props}>
      {children}
    </ol>
  ),
  ul: ({ children, ...props }) => (
    <ul className="list-disc list-inside space-y-1 text-sm my-3" {...props}>
      {children}
    </ul>
  ),
  li: ({ children, ...props }) => (
    <li className="text-steam-textMuted" {...props}>
      {children}
    </li>
  ),
  strong: ({ children, ...props }) => (
    <strong className="text-steam-textPrimary font-medium" {...props}>
      {children}
    </strong>
  ),
};
