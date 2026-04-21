import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

const komariProxyTarget = 'http://localhost:8080'

// 中文说明：开发和预览环境统一代理到真实 Komari 服务端，避免目标站关闭 CORS 后本地调试无法直连。
const komariProxy = {
  '/api': {
    target: komariProxyTarget,
    changeOrigin: true,
    ws: true,
    secure: true,
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  base: '/themes/Koumei/dist/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: komariProxy,
  },
  preview: {
    proxy: komariProxy,
  },
})
