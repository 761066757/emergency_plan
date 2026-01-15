/*
 * @Author: sp1ke 761066757@qq.com
 * @Date: 2025-12-30 10:25:36
 * @LastEditors: sp1ke 761066757@qq.com
 * @LastEditTime: 2026-01-13 16:45:58
 * @FilePath: \emergency_plan\vite.config.js
 */
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig({
  plugins: [vue(), vueDevTools()],
  build: {
    sourcemap: false,
  },
  server: {
    port: 5173,
    sourcemap: true,
    open: true,
    cors: true,
    proxy: {
      // ========== 只代理后端接口，拼接上下文 /emergency ==========
      // 匹配 /step 开头的请求（步骤接口）
      '/step': {
        target: 'http://localhost:3278',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => `/emergency${path}`, // 拼接上下文：/step/list → /emergency/step/list
      },
      // 匹配 /api 开头的请求（字典接口）
      '/api': {
        target: 'http://localhost:3278',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => `/emergency${path}`, // 拼接上下文：/api/dict/xxx → /emergency/api/dict/xxx
      },
      '/plan': {
        target: 'http://localhost:3278',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => `/emergency${path}`, // 拼接上下文：/plan/xxx → /emergency/plan/xxx
      },
      // ========== 新增：Flowable模型器代理 ==========
      '/flowable-modeler': {
        target: 'http://localhost:3278', // 你的后端端口（替换8080）
        changeOrigin: true, // 开启跨域
        ws: true, // 支持WebSocket（Flowable编辑器需要）
        rewrite: (path) => `/emergency${path}`, // 拼接上下文/emergency
        // 解决iframe跨域的额外配置
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            // 允许iframe跨域加载
            proxyRes.headers['Access-Control-Allow-Origin'] = '*'
            proxyRes.headers['Access-Control-Allow-Credentials'] = 'true'
            proxyRes.headers['Access-Control-Allow-Headers'] =
              'Origin, X-Requested-With, Content-Type, Accept'
          })
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
