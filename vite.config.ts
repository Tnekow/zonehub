import mdx from '@mdx-js/rollup'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isElectronBuild = mode === 'electron';

  return {
  plugins: [
    { enforce: 'pre', ...mdx() },
    react(),
  ],

  // Electron 打包版使用 file:// 协议加载，需要相对资源路径避免白屏。
  // Web 构建仍保持默认根路径，避免线上路由资源路径回归。
  base: isElectronBuild ? './' : '/',

  // 优化依赖配置：避免预构建 FFmpeg 相关依赖
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/core', '@ffmpeg/util'],
    include: ['tslib']
  },

  // Worker 配置：使用 ES 格式，避免 IIFE 格式的问题
  worker: {
    format: 'es'
  },

  // 服务器配置：添加 FFmpeg 所需的响应头
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },

  // 构建配置：不将 FFmpeg 标记为外部，让它正常打包
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-i18n': ['i18next', 'react-i18next'],
        }
      }
    }
  },

  // 定义全局变量
  define: {
    global: 'globalThis'
  }
}
})
