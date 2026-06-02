/** @type {import('tailwindcss').Config} */

// 从单一数据源读取主题配置
const themesConfig = require('./src/config/themes.json');

module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // ===== 移除硬编码配置，全部从 themes.json 动态生成 =====
      
      borderColor: {
        // ===== 边框颜色配置 =====
        'steam-border': 'rgba(35, 38, 46, 0.8)',      // 通用边框颜色
        'steam-header-border': 'rgba(255, 255, 255, 0.1)', // ProfileHeader专用边框颜色
        'steam-gray': 'rgba(42, 71, 94, 0.8)',        // 灰色边框
      },
      
      borderWidth: {
        // ===== 边框宽度配置 =====
        'steam': '1px',           // 通用边框宽度
        'steam-header': '2px',    // ProfileHeader专用边框宽度
      },
      
      borderRadius: {
        // ===== 边框圆角配置 =====
        'steam': '0.5rem',        // 通用边框圆角
      },
      
      // ===== 主题配置数组 - 从单一数据源读取 =====
      themes: themesConfig.themes,

    },
  },
  plugins: [
    // ===== 动态生成所有Steam主题工具类的插件 =====
    function({ addUtilities, theme }) {
      // 获取默认主题的配置
      const defaultTheme = theme('themes')[0];
      const steamColors = defaultTheme.colors;
      const steamBackgrounds = defaultTheme.backgrounds;
      
      // 动态生成所有工具类
      const steamUtilities = {};
      
      // 为 colors 生成工具类 - 使用 CSS 变量
      Object.entries(steamColors).forEach(([key, value]) => {
        // 生成背景色类 - 使用 CSS 变量
        steamUtilities[`.bg-steam-${key}`] = {
          backgroundColor: `var(--steam-${key})`
        };
        
        // 生成文字颜色类 - 使用 CSS 变量
        steamUtilities[`.text-steam-${key}`] = {
          color: `var(--steam-${key})`
        };
        
        // 生成边框颜色类 - 使用 CSS 变量
        steamUtilities[`.border-steam-${key}`] = {
          borderColor: `var(--steam-${key})`
        };
      });
      
      // 为 backgrounds 生成工具类 - 使用 CSS 变量
      Object.entries(steamBackgrounds).forEach(([key, value]) => {
        // 处理特殊的变量名映射
        const cssClassName = key === 'itemIn' ? 'item-in' : key;
        const cssVarName = key === 'itemIn' ? 'itemIn' : key;
        
        // 生成背景类 - 使用 background 支持多层渐变（遮罩层）
        steamUtilities[`.bg-steam-${cssClassName}`] = {
          background: `var(--steam-${cssVarName})`
        };
      });
      
      // 添加生成的工具类
      addUtilities(steamUtilities);
    }
  ],
}

