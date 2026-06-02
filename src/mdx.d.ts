import type { MDXProps } from 'mdx/types';

/** 所有 .mdx 模块的默认导出为 React 组件；命名导出类型见 src/content/types.ts */
declare module '*.mdx' {
  export default function MDXContent(props: MDXProps): JSX.Element;
}
