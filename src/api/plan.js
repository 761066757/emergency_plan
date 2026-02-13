/*
 * @Author: sp1ke 761066757@qq.com
 * @Date: 2026-01-13 15:23:40
 * @LastEditors: sp1ke 761066757@qq.com
 * @LastEditTime: 2026-02-12 09:32:57
 * @FilePath: \emergency_plan\src\api\plan.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import request from '@/utils/request'

// 保存预案（含步骤关联）
export function savePlan(data) {
  return request({
    url: '/plan/savePlan',
    method: 'post',
    data: data,
  })
}

// 根据ID查询预案
export function getPlanById(params) {
  return request({
    url: '/plan/getById',
    method: 'get',
    params: params,
  })
}

// 查询预案关联步骤
export function getPlanStepRelations(params) {
  return request({
    url: '/plan/getPlanStepRelations',
    method: 'get',
    params: params,
  })
}

// 部署预案
export function deployPlan(data) {
  return request({
    url: '/flow/deploy',
    method: 'post',
    data: data,
  })
}

// 查询部署记录
export function getDeployRecord(params) {
  return request({
    url: '/plan/getDeployRecord',
    method: 'get',
    params: params,
  })
}

// 激活部署
export function activateDeploy(data) {
  return request({
    url: '/plan/activateDeploy',
    method: 'post',
    data: data,
  })
}

// 失效部署
export function invalidDeploy(data) {
  return request({
    url: '/plan/invalidDeploy',
    method: 'post',
    data: data,
  })
}

// 导入BPMN文件
export function importBpmn(data) {
  return request({
    url: '/plan/importBpmn',
    method: 'post',
    data: data,
  })
}
