import React, { useEffect, useState } from 'react';
import { MdxArticle } from '../../components/mdx/MdxArticle';
import { loadUploadTutorial } from '../../content/loadMdxModule';
import type { UploadTutorialModule } from '../../content/types';
import type { AppLocale } from '../../lib/localePath';

type UploadTutorialSectionProps = {
  locale: AppLocale;
};

export function UploadTutorialSection({ locale }: UploadTutorialSectionProps) {
  const [module, setModule] = useState<UploadTutorialModule | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadUploadTutorial(locale).then((mod) => {
      if (!cancelled) setModule(mod);
    });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  if (!module) return null;

  const Content = module.default;

  return (
    <div className="bg-steam-item rounded p-6">
      <h3 className="text-lg font-medium text-steam-textPrimary mb-4">{module.stepTitle}</h3>
      <MdxArticle>
        <Content />
      </MdxArticle>
    </div>
  );
}
