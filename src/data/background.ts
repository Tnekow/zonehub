export interface BackgroundConfig {
  image: string;
  alt: string;
  blur?: boolean;
  brightness?: number;
  overlay?: boolean;
  // 新增视频相关配置
  isVideo?: boolean;
  videoLoop?: boolean;
  videoMuted?: boolean;
  videoAutoplay?: boolean;
  // 背景显示模式：original（原尺寸）、cover（自适应全屏）
  fitMode?: 'original' | 'cover';
}

const zonehubGradientSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
<defs>
  <radialGradient id="g1" cx="18%" cy="10%" r="58%">
    <stop offset="0%" stop-color="#5b3a7f" stop-opacity="0.24"/>
    <stop offset="55%" stop-color="#5b3a7f" stop-opacity="0.06"/>
    <stop offset="100%" stop-color="#030208" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="g2" cx="86%" cy="20%" r="44%">
    <stop offset="0%" stop-color="#3f2b57" stop-opacity="0.3"/>
    <stop offset="55%" stop-color="#3f2b57" stop-opacity="0.08"/>
    <stop offset="100%" stop-color="#030208" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#04030a"/>
    <stop offset="58%" stop-color="#080613"/>
    <stop offset="100%" stop-color="#020107"/>
  </linearGradient>
</defs>
<rect width="1920" height="1080" fill="url(#bg)"/>
<rect width="1920" height="1080" fill="url(#g1)"/>
<rect width="1920" height="1080" fill="url(#g2)"/>
</svg>`;

const zonehubGradientDataUrl = `data:image/svg+xml,${encodeURIComponent(zonehubGradientSvg)}`;

// 默认背景配置
export const defaultBackground: BackgroundConfig = {
      image: '/background/default.webp',
  alt: 'Steam Profile Background',
  blur: false,
  brightness: 100,
  overlay: false,
  isVideo: false,
  videoLoop: true,
  videoMuted: true,
  videoAutoplay: true,
  fitMode: 'original',
};

// 预设背景配置
export const backgroundPresets: BackgroundConfig[] = [
  {
    image: zonehubGradientDataUrl,
    alt: 'ZoneHub Default Gradient',
    blur: false,
    brightness: 100,
    overlay: false,
    isVideo: false,
    videoLoop: true,
    videoMuted: true,
    videoAutoplay: true,
  },
  {
    image: '/background/default.webp',
    alt: 'Steam Default Background',
    blur: false,
    brightness: 100,
    overlay: false,
    isVideo: false,
    videoLoop: true,
    videoMuted: true,
    videoAutoplay: true,
  },
  {
    image: '/background/Levia.webp',
    alt: 'Steam Levia',
    blur: true,
    brightness: 50,
    overlay: true,
    isVideo: false,
    videoLoop: true,
    videoMuted: true,
    videoAutoplay: true,
  },
  {
    image: '/background/qianxia.webp',
    alt: '千夏能量——补充！',
    blur: true,
    brightness: 40,
    overlay: true,
    isVideo: false,
    videoLoop: true,
    videoMuted: true,
    videoAutoplay: true,
  },
  {
    image: '/background/mushdash.mp4',
    alt: 'mushdash',
    blur: false,
    brightness: 100,
    overlay: false,
    isVideo: true,
    videoLoop: true,
    videoMuted: true,
    videoAutoplay: true,
  },
  {
    image: '/background/Reflection.webp',
    alt: 'Reflection',
    blur: true,
    brightness: 80,
    overlay: false,
    isVideo: false,
    videoLoop: true,
    videoMuted: true,
    videoAutoplay: true,
  },
  {
    image: '/background/touhou.webp',
    alt: 'TOUHOU SKY ARENA MATSURI CLIMAX',
    blur: true,
    brightness: 30,
    overlay: true,
    isVideo: false,
    videoLoop: true,
    videoMuted: true,
    videoAutoplay: true,
  },
  {
    image: '/background/TruePanic.jpg',
    alt: 'True Panic',
    blur: true,
    brightness: 90,
    overlay: false,
    isVideo: false,
    videoLoop: true,
    videoMuted: true,
    videoAutoplay: true,
  },
  //Mantra.mp4
  {
    image: '/background/SPHERE.mp4',
    alt: 'SPHERE',
    blur: false,
    brightness: 100,
    overlay: false,
    isVideo: true,
    videoLoop: true,
    videoMuted: true,
    videoAutoplay: true,
  },

];
