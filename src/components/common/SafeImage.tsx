import React from 'react';
import { resolveRemoteAssetUrl } from '../../lib/remoteAssetUrl';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
}

/**
 * 安全图片组件：自动处理 Steam/Supabase 代理逻辑和 CORS 属性
 */
export const SafeImage: React.FC<SafeImageProps> = ({ src, loading = 'lazy', ...props }) => {
  if (!src) return null;

  return (
    <img
      loading={loading}
      {...props}
      src={resolveRemoteAssetUrl(src)}
      crossOrigin="anonymous"
    />
  );
};

export default SafeImage;



