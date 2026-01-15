/*
 * @Author: sp1ke 761066757@qq.com
 * @Date: 2025-12-30 10:25:36
 * @LastEditors: sp1ke 761066757@qq.com
 * @LastEditTime: 2025-12-30 15:02:06
 * @FilePath: \emergency_plan\src\main.js
 * @Description: 全局配置
 */
import { createApp } from 'vue'
// import './assets/main.css'
// 引入全局样式文件
import './assets/style.css'
// 引入根组件
import App from './App.vue'
// 1. 引入 Element Plus 核心库
import ElementPlus from 'element-plus'
// 2. 必须引入 Element Plus 的样式文件（关键遗漏项）
import 'element-plus/dist/index.css'
// 可选：引入 Element Plus 图标（如果用到）
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
// 引入路由
import router from './router'
// 引入 Pinia 状态管理
import { createPinia } from 'pinia'
// 引入 Axios
import axios from 'axios'

// 创建 Vue 应用实例
const app = createApp(App)

// 3. 全局注册 Element Plus
app.use(ElementPlus)

// 可选：全局注册 Element Plus 所有图标（方便模板中直接使用）
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 4. 注册路由
app.use(router)

// 5. 注册 Pinia
app.use(createPinia())

// 6. 全局挂载 Axios（Vue 3 写法）
// 方式1：挂载到 globalProperties（模板中用 $axios，组合式API中需通过 getCurrentInstance 获取）
app.config.globalProperties.$axios = axios
// 方式2：提供 Axios 实例（推荐在组合式API中使用 inject 获取）
app.provide('$axios', axios)

// 配置 Axios 基础路径
axios.defaults.baseURL = 'http://localhost:3278/emergency'
// 配置 Axios 请求超时
axios.defaults.timeout = 10000
// 可选：Axios 请求拦截器（添加 token 等）
axios.interceptors.request.use(
  (config) => {
    // 示例：添加 token 到请求头
    // const token = localStorage.getItem('token')
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`
    // }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// 可选：Axios 响应拦截器（统一处理错误）
axios.interceptors.response.use(
  (response) => {
    // 统一处理返回结果
    return response.data
  },
  (error) => {
    // 统一捕获错误
    console.error('请求错误：', error)
    return Promise.reject(error)
  },
)

// 挂载应用到 DOM
app.mount('#app')
