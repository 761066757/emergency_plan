// 预案类型枚举
export const PLAN_TYPE_ENUMS = [
  { value: 'FIRE', label: '火灾', type: 'danger' },
  { value: 'FLOOD', label: '汛情', type: 'danger' },
  { value: 'EARTHQUAKE', label: '地震', type: 'danger' },
  { value: 'NATURAL_DISASTER', label: '自然灾害', type: 'danger' },
  { value: 'HEALTH', label: '公共卫生', type: 'danger' },
  { value: 'ELECTRICITY_OUTAGE', label: '大面积停电', type: 'danger' },
  { value: '', label: '大客流', type: 'danger' }
]

// 预案状态枚举
export const PLAN_STATUS_ENUMS = [
  { value: 0, label: '未发布', type: 'info' },
  { value: 1, label: '已发布', type: 'primary' },
  { value: 2, label: '执行中', type: 'success' }
]

// 摄像头列表枚举
export const CAMERA_LIST = [
  { id: 1, name: '摄像头1', cameraName: '摄像头1', status: 1 },
  { id: 2, name: '摄像头2', cameraName: '摄像头2', status: 1 },
  { id: 3, name: '摄像头3', cameraName: '摄像头3', status: 1 },
  { id: 4, name: '摄像头4', cameraName: '摄像头4', status: 1 },
  { id: 5, name: '摄像头5', cameraName: '摄像头5', status: 1 }
]

// 获取预案类型标签
export function getPlanTypeLabel(value) {
  const item = PLAN_TYPE_ENUMS.find(item => item.value === value)
  return item ? item.label : value
}

// 获取预案类型样式类型
export function getPlanTypeType(value) {
  const item = PLAN_TYPE_ENUMS.find(item => item.value === value)
  return item ? item.type : 'info'
}

// 获取预案状态标签
export function getPlanStatusLabel(value) {
  const item = PLAN_STATUS_ENUMS.find(item => item.value === value)
  return item ? item.label : value
}

// 获取预案状态样式类型
export function getPlanStatusType(value) {
  const item = PLAN_STATUS_ENUMS.find(item => item.value === value)
  return item ? item.type : 'info'
}

// 获取摄像头列表
export function getCameraList() {
  return CAMERA_LIST
}