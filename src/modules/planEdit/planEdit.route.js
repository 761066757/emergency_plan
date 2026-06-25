/*
 * @Author: sp1ke 761066757@qq.com
 * @Date: 2026-01-13 15:23:40
 * @LastEditors: sp1ke 761066757@qq.com
 * @LastEditTime: 2026-06-25 10:25:31
 * @FilePath: \emergency_plan\src\modules\planEdit\planEdit.route.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import request from '@/utils/request'

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
export function getPlanDetail(planId) {  // 修改参数为直接传入id
  return request({
    url: '/plan/getPlanDetail',  // 使用查询参数而非路径参数
    method: 'post',
    params: {planId}  // 使用params传递查询参数
  })
}


// BPMN文件校验
// TODO 待完善-GRPC接口需要将文件类型转换为 Base64 字符串
export function bpmnValidate(data) {
  return request({
    url: '/plan/bpmnValidate',
    method: 'post',
    data: data,
  })
}


// 获取摄像头列表（树状）
// TODO 待完善-此接口由壳提供
export const getCameraList = () => {
  return request({
    url: '/camera/queryCameraList',
    method: 'get'
  })
}

// 上传预案文档
// TODO 待完善-GRPC接口需要将文件类型转换为 Base64 字符串
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

// 实时监控
export const realTimeMonitor = (planId,cameraId) => {
  return request({
    url: '/plan/realTimeMonitor',
    method: 'post',
    params: {planId,cameraId}
  })
}
