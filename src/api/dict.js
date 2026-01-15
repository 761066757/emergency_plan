// src/api/dict.js
import request from '@/utils/request'
/**
 * 按模块+类型查询字典下拉列表
 * @param {String} moduleCode 模块编码（如 emergency）
 * @param {String} dictType 字典类型（如 step_type）
 * @returns {Array} 下拉选项列表 [{label: '预警', value: 'warn'}, ...]
 */
export const getDictOptionsByModuleAndType = (moduleCode, dictType) => {
  return request({
    url: `/api/dict/options/module/${moduleCode}/type/${dictType}`,
    method: 'get',
  })
}

/**
 * 步骤配置相关接口（原有步骤CRUD）
 */
// 获取步骤列表
export const getStepList = () => {
  return request({
    url: '/step/listAll',
    method: 'get',
  })
}

// 保存步骤（新增/编辑）- 重命名为 requestSaveStep，避免和页面函数冲突
export const requestSaveStep = (data) => {
  return request({
    url: '/step/save',
    method: 'post',
    data,
  })
}

// 删除步骤 - 重命名为 requestDeleteStep，统一规范
export const requestDeleteStep = (id) => {
  return request({
    url: `/step/${id}`,
    method: 'delete',
  })
}
