/*
 * @Author: sp1ke 761066757@qq.com
 * @Date: 2026-01-13 15:13:51
 * @LastEditors: sp1ke 761066757@qq.com
 * @LastEditTime: 2026-06-12 16:34:11
 * @FilePath: \emergency_plan\src\modules\stepConfig\stepConfig.route.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import request from '@/utils/request'

// 1. 查询步骤
export function queryTask() {
  return request({
    url: '/task/query',
    method: 'get',
  })
}

// 2. 保存步骤（新增/编辑）
export function saveTask(data) {
  return request({
    url: '/task/save',
    method: 'post',
    data: data,
  })
}

// 3. 删除步骤
export function deleteTask(id) {
  return request({
    url: '/task/delete',
    method: 'post',
    params: { id: id }
  })
}

// 4.根据任务类型（父任务）查询任务名称（子任务）
export function queryByType(type) {
  return request({
    url: '/task/queryByType',
    method: 'get',
    params: { type: type }
  })
}
