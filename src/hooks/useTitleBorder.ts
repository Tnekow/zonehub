import { useMemo, useEffect, useState } from 'react';

export const useTitleBorder = () => {
  const [themeUpdateTrigger, setThemeUpdateTrigger] = useState(0);

  // 监听主题变化
  useEffect(() => {
    const handleThemeChange = () => {
      setThemeUpdateTrigger(prev => prev + 1);
    };

    // 监听 CSS 变量变化
    const observer = new MutationObserver(handleThemeChange);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style']
    });

    return () => observer.disconnect();
  }, []);

  const titleBorderStyle = useMemo(() => {
    if (typeof window === 'undefined') {
      return {};
    }

    const root = document.documentElement;
    const titleBorderType = getComputedStyle(root).getPropertyValue('--steam-title-border-type').trim();
    const primaryColor = getComputedStyle(root).getPropertyValue('--steam-title-border-primary-color').trim();
    const width = getComputedStyle(root).getPropertyValue('--steam-title-border-width').trim();
    const glowColor = getComputedStyle(root).getPropertyValue('--steam-title-border-glow-color').trim();
    const glowIntensity = getComputedStyle(root).getPropertyValue('--steam-title-border-glow-intensity').trim();
    const borderRadius = getComputedStyle(root).getPropertyValue('--steam-border-radius').trim();
    
    // 检查是否应该显示边框
    const shouldShowBorder = () => {
      // 如果宽度为0，不显示边框
      if (width === '0px' || width === '0') {
        return false;
      }
      
      // 如果主颜色完全透明，不显示边框
      if (primaryColor === 'transparent' || 
          (primaryColor.includes('rgba') && primaryColor.includes(', 0)')) ||
          (primaryColor.includes('rgba') && primaryColor.includes(', 0.0)'))) {
        return false;
      }
      
      return true;
    };
    
    if (!shouldShowBorder()) {
      return {
        borderRadius: borderRadius || '0px'
      };
    }
    
    if (titleBorderType === 'glow') {
      // 检查发光效果是否应该显示
      const shouldShowGlow = glowIntensity !== '0px' && glowIntensity !== '0' && 
                            glowColor !== 'transparent' && 
                            !(glowColor.includes('rgba') && glowColor.includes(', 0)')) &&
                            !(glowColor.includes('rgba') && glowColor.includes(', 0.0)'));
      
      return {
        borderWidth: width,
        borderColor: primaryColor,
        borderStyle: 'solid',
        borderRadius: borderRadius || '0px',
        boxShadow: shouldShowGlow ? `inset 0 0 ${glowIntensity} ${glowColor}` : 'none'
      };
    } else if (titleBorderType === 'single-color') {
      return {
        borderWidth: width,
        borderColor: primaryColor,
        borderStyle: 'solid',
        borderRadius: borderRadius || '0px'
      };
    } else {
      // 容错：当类型变量缺失或非预期时，根据可用变量进行推断，避免标题边框完全失效
      const inferredShowGlow = glowIntensity !== '0px' && glowIntensity !== '0' && 
                               glowColor !== 'transparent' && 
                               !(glowColor.includes('rgba') && glowColor.includes(', 0)')) &&
                               !(glowColor.includes('rgba') && glowColor.includes(', 0.0)'));
      if (inferredShowGlow) {
        return {
          borderWidth: width,
          borderColor: primaryColor,
          borderStyle: 'solid',
          borderRadius: borderRadius || '0px',
          boxShadow: `inset 0 0 ${glowIntensity} ${glowColor}`
        };
      }
      // 默认至少渲染为单色边框
      return {
        borderWidth: width,
        borderColor: primaryColor,
        borderStyle: 'solid',
        borderRadius: borderRadius || '0px'
      };
    }
    
    // 不应到达此处，兜底
    return {
      borderRadius: borderRadius || '0px'
    };
  }, [themeUpdateTrigger]);

  return titleBorderStyle;
};