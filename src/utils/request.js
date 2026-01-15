/*
 * @Author: sp1ke 761066757@qq.com
 * @Date: 2026-01-08 14:37:10
 * @LastEditors: sp1ke 761066757@qq.com
 * @LastEditTime: 2026-01-08 14:40:44
 * @FilePath: \emergency_plan\src\utils\request.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
// src/utils/request.js 封装后的 Axios 请求工具-请求实例
import axios from 'axios'
import { ElMessage } from 'element-plus'

// 1. 创建 Axios 实例（配置基础路径、超时时间等）
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/', // 接口基础路径（从环境变量读取）
  timeout: 10000, // 请求超时时间（10秒）
  headers: {
    'Content-Type': 'application/json;charset=utf-8', // 默认请求头
  },
})

// 2. 请求拦截器（发送请求前的处理：如添加 token、拼接参数等）
request.interceptors.request.use(
  (config) => {
    // 示例：从 localStorage 获取 token，添加到请求头（如果你的项目需要登录认证）
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    // 请求错误的前置处理
    ElMessage.error('请求发送失败，请稍后重试')
    return Promise.reject(error)
  },
)

// 3. 响应拦截器（接口返回后的统一处理：如解析数据、统一异常提示）
request.interceptors.response.use(
  (response) => {
    // 后端返回格式是 { code: 200, data: ..., msg: ... }
    const res = response.data

    // 1. 接口请求成功（code=200），直接返回数据
    if (res.code === 200) {
      return res
    }

    // 2. 接口返回非200（如业务错误：参数错误、权限不足等）
    ElMessage.error(res.msg || '接口请求失败')
    return Promise.reject(res)
  },
  (error) => {
    // 网络错误/服务器错误（如404、500、超时等）
    let message = ''
    if (error.response) {
      // 有响应但状态码非2xx
      switch (error.response.status) {
        case 401:
          message = '登录过期，请重新登录'
          // 登出操作：清空token，跳转到登录页
          localStorage.removeItem('token')
          window.location.href = '/login'
          break
        case 403:
          message = '没有权限访问该接口'
          break
        case 404:
          message = '接口地址不存在'
          break
        case 500:
          message = '服务器内部错误'
          break
        default:
          message = `请求错误：${error.response.status}`
      }
    } else if (error.request) {
      // 发了请求但没收到响应（如网络断开、超时）
      message = '网络异常，请检查网络连接'
    } else {
      // 请求配置错误
      message = '请求配置失败'
    }

    ElMessage.error(message)
    return Promise.reject(error)
  },
)

// 导出封装后的 request 实例
export default request
