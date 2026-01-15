/*
 * @Author: sp1ke 761066757@qq.com
 * @Date: 2026-01-13 15:13:51
 * @LastEditors: sp1ke 761066757@qq.com
 * @LastEditTime: 2026-01-13 16:30:18
 * @FilePath: \emergency_plan\src\api\step.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import request from '@/utils/request'

// 1. 按模块查询步骤列表
export function getStepListAll() {
  return request({
    url: '/step/listAll',
    method: 'get',
  })
}

export function getStepList(moduleCode) {
  return request({
    url: '/step/list',
    method: 'get',
    params: { moduleCode },
  })
}

// 2. 保存步骤（新增/编辑）
export function requestSaveStep(data) {
  return request({
    url: '/step/save',
    method: 'post',
    data: data,
  })
}

// 3. 删除步骤
export function requestDeleteStep(id) {
  return request({
    url: `/step/delete/${id}`,
    method: 'post',
  })
}

// 4. 批量查询步骤名称
export function getStepNameByIds(stepIds) {
  return request({
    url: '/step/getStepNameByIds',
    method: 'post',
    data: stepIds,
  })
}

// 5. 查询步骤类型字典
export function getStepTypeDict(moduleCode) {
  return request({
    url: '/step/getStepTypeDict',
    method: 'get',
    params: { moduleCode },
  })
}
