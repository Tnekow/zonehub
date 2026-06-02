import { useEffect } from 'react';

interface MetaOptions {
  title: string;
  description: string;
}

function ensureTag(selector: string, create: () => HTMLElement): HTMLElement {
  const existing = document.querySelector(selector);
  if (existing) return existing as HTMLElement;
  const el = create();
  document.head.appendChild(el);
  return el;
}

export function useMeta({ title, description }: MetaOptions) {
  useEffect(() => {
    // document title
    if (title) {
      document.title = title;
    }

    // description meta
    if (description) {
      const descTag = ensureTag('meta[name="description"]', () => {
        const m = document.createElement('meta');
        m.setAttribute('name', 'description');
        return m;
      });
      descTag.setAttribute('content', description);
    }

    // Open Graph
    const ogTitle = ensureTag('meta[property="og:title"]', () => {
      const m = document.createElement('meta');
      m.setAttribute('property', 'og:title');
      return m;
    });
    ogTitle.setAttribute('content', title);

    const ogDesc = ensureTag('meta[property="og:description"]', () => {
      const m = document.createElement('meta');
      m.setAttribute('property', 'og:description');
      return m;
    });
    ogDesc.setAttribute('content', description);

    // Twitter
    const twTitle = ensureTag('meta[name="twitter:title"]', () => {
      const m = document.createElement('meta');
      m.setAttribute('name', 'twitter:title');
      return m;
    });
    twTitle.setAttribute('content', title);

    const twDesc = ensureTag('meta[name="twitter:description"]', () => {
      const m = document.createElement('meta');
      m.setAttribute('name', 'twitter:description');
      return m;
    });
    twDesc.setAttribute('content', description);
  }, [title, description]);
}

export default useMeta;