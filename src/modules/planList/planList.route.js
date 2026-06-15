/*
 * @Author: sp1ke 761066757@qq.com
 * @Date: 2026-06-04 08:23:40
 * @LastEditors: sp1ke 761066757@qq.com
 * @LastEditTime: 2026-06-12 16:26:53
 * @FilePath: \emergency_plan\src\modules\planList\planList.route.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import request from '@/utils/request'


// 查询当前待办任务
export const getCurrentTask = (planId) => {
  return request({
    url: '/flow/task',
    method: 'get',
    params: {planId}
  })
}

// 部署预案-创建部署
export const deployPlan = (planId) => {
  return request({
    url: '/flow/deploy',
    method: 'post',
    params: {planId}
  })
}

// 撤回预案-删除部署
export const revokePlan = (planId) => {
  return request({
    url: '/flow/revoke',
    method: 'post',
    params: {planId}
  })
}

// 启动预案-启动流程实例
export const startPlan = (planId) => {
  return request({
    url: '/flow/start',
    method: 'post',
    params: {planId}
  })
}

// 终止预案-终止流程实例
export const stopPlan = (planId) => {
  return request({
    url: '/flow/stop',
    method: 'post',
    params: {planId}
  })
}

// 完成步骤-流程流转到下一个节点
export const completeTask = (taskId,executeNote) => {
  return request({
    url: '/flow/next',
    method: 'post',
    params: {taskId,executeNote}
  })
}

