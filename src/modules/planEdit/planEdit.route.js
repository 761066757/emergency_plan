/*
 * @Author: sp1ke 761066757@qq.com
 * @Date: 2026-01-13 15:23:40
 * @LastEditors: sp1ke 761066757@qq.com
 * @LastEditTime: 2026-06-11 14:56:06
 * @FilePath: \emergency_plan\src\modules\planEdit\planEdit.route.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import request from '@/utils/request'

// 获取摄像头列表
// TODO 待完善
export const getCameraList = () => {
  return request({
    url: '/camera/queryCameraList',
    method: 'get'
  })
}

// 上传预案文档
export const uploadPlanDoc = (formData) => {
  return request({
    url: '/plan/uploadPlanDoc',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

// 保存预案（含关联任务）
export function savePlan(data) {
  return request({
    url: '/plan/savePlan',
    method: 'post',
    data: data,
  })
}

// 获取预案列表
export function getPlanList(data) {
  return request({
    url: '/plan/queryPlanList',
    method: 'post',
    data: data
  })
}

// 根据ID查询预案详情
export function getPlanDetail(id) {  // 修改参数为直接传入id
  return request({
    url: '/plan/getPlanDetail',  // 使用查询参数而非路径参数
    method: 'get',
    params: { planId: id }  // 使用params传递查询参数
  })
}


// BPMN文件校验
export function bpmnValidate(data) {
  return request({
    url: '/plan/bpmnValidate',
    method: 'post',
    data: data,
  })
}
