/*
 * @Author: sp1ke 761066757@qq.com
 * @Date: 2026-01-08 14:27:51
 * @LastEditors: sp1ke 761066757@qq.com
 * @LastEditTime: 2026-02-13 14:14:57
 * @FilePath: \emergency_plan\src\api\dict.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
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
    url: `/dict/module/${moduleCode}/type/${dictType}`,
    method: 'get',
  })
}

// /**
//  * 步骤配置相关接口（原有步骤CRUD）
//  */
// // 获取步骤列表
// export const getStepList = () => {
//   return request({
//     url: '/step/listAll',
//     method: 'get',
//   })
// }

// // 保存步骤（新增/编辑）- 重命名为 requestSaveStep，避免和页面函数冲突
// export const requestSaveStep = (data) => {
//   return request({
//     url: '/step/save',
//     method: 'post',
//     data,
//   })
// }

// // 删除步骤 - 重命名为 requestDeleteStep，统一规范
// export const requestDeleteStep = (id) => {
//   return request({
//     url: `/step/${id}`,
//     method: 'delete',
//   })
// }
