import type { AppLocale } from '../lib/localePath';
import type { BackgroundCutModule, UploadTutorialModule } from './types';

type LocaleMap<T> = Record<AppLocale, () => Promise<T>>;

const backgroundCutLoaders: LocaleMap<BackgroundCutModule> = {
  'zh-CN': () => import('./artwork-showcase/background-cut.zh-CN.mdx'),
  'en-US': () => import('./artwork-showcase/background-cut.en-US.mdx'),
  'ja-JP': () => import('./artwork-showcase/background-cut.ja-JP.mdx'),
};

const uploadTutorialLoaders: LocaleMap<UploadTutorialModule> = {
  'zh-CN': () => import('./video-to-gif/upload-tutorial.zh-CN.mdx'),
  'en-US': () => import('./video-to-gif/upload-tutorial.en-US.mdx'),
  'ja-JP': () => import('./video-to-gif/upload-tutorial.ja-JP.mdx'),
};

export function loadBackgroundCutTutorial(locale: AppLocale): Promise<BackgroundCutModule> {
  return backgroundCutLoaders[locale]();
}

export function loadUploadTutorial(locale: AppLocale): Promise<UploadTutorialModule> {
  return uploadTutorialLoaders[locale]();
}
