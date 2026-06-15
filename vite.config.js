/*
 * @Author: sp1ke 761066757@qq.com
 * @Date: 2025-12-30 10:25:36
 * @LastEditors: sp1ke 761066757@qq.com
 * @LastEditTime: 2026-06-12 14:08:23
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
      // 匹配 /task 开头的请求（步骤接口）
      '/task': {
        target: 'http://localhost:3278',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => `/emergency${path}`, // 拼接上下文：/task/xxx → /emergency/task/xxx
      },
      // 匹配 /plan 开头的请求（预案接口）
      '/plan': {
        target: 'http://localhost:3278',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => `/emergency${path}`, // 拼接上下文：/plan/xxx → /emergency/plan/xxx
      },
      // 匹配 /flow 开头的请求（Flowable接口）
      '/flow': {
        target: 'http://localhost:3278',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => `/emergency${path}`, // 拼接上下文：/flow/xxx → /emergency/flow/xxx
      },
      // 匹配 /instHi 开头的请求（文件接口）
      '/instHi': {
        target: 'http://localhost:3278',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => `/emergency${path}`, // 拼接上下文：/instHi/xxx → /emergency/instHi/xxx
      },
      // ========== 新增：Flowable模型器代理 ==========
      '/flowable-modeler': {
        target: 'http://localhost:3278', // 后端端口（替换8080）
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
