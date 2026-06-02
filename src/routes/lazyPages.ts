import { lazyWithRetry } from '../lib/lazyWithRetry';

export const HomePage = lazyWithRetry(() => import('../pages/HomePage'));
export const DesktopHome = lazyWithRetry(() => import('../pages/DesktopHome'));

export const ArtworkShowcaseTool = lazyWithRetry(() => import('../pages/tools/ArtworkShowcaseTool'));
export const ArtworkGallery = lazyWithRetry(() => import('../pages/tools/ArtworkGallery'));
export const VideoToGifTool = lazyWithRetry(() => import('../pages/tools/VideoToGifTool'));
export const GuidesPage = lazyWithRetry(() => import('../pages/tools/GuidesPage'));
export const HowToPage = lazyWithRetry(() => import('../pages/tools/HowToPage'));
export const SupportPage = lazyWithRetry(() => import('../pages/tools/SupportPage'));
