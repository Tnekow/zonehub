import { Suspense, type ReactNode } from 'react';

export function routeSuspense(node: ReactNode) {
  return (
    <Suspense fallback={<div className="relative z-10 max-w-5xl mx-auto px-4 py-8 text-steam-textMuted">加载中…</div>}>
      {node}
    </Suspense>
  );
}

/** fixed/absolute 定位组件使用空 fallback，避免加载时撑开文档流 */
export function routeSuspenseFloat(node: ReactNode) {
  return <Suspense fallback={null}>{node}</Suspense>;
}
