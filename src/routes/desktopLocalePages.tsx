import {
  ArtworkGallery,
  ArtworkShowcaseTool,
  HowToPage,
  GuidesPage,
  SupportPage,
  VideoToGifTool,
} from './lazyPages';

/** 桌面壳：与 Web 共用同一套工具页（语言由 i18n + URL 前缀共同决定） */
export function DesktopArtworkShowcase() {
  return <ArtworkShowcaseTool />;
}

export function DesktopVideoToGifTool() {
  return <VideoToGifTool />;
}

export function DesktopArtworkGallery() {
  return <ArtworkGallery />;
}

export function DesktopSteamGuides() {
  return <GuidesPage />;
}

export function DesktopHowToPage() {
  return <HowToPage />;
}

export function DesktopSupportPage() {
  return <SupportPage />;
}
