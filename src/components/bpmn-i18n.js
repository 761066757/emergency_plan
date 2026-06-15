// bpmn-js 中文国际化配置
// 用于将工具栏中的英文网关标签改为中文

export const bpmnI18n = {
  // 网关类型标签
  'bpmn:ExclusiveGateway': '排他网关',
  'bpmn:InclusiveGateway': '包容网关',
  'bpmn:ParallelGateway': '并行网关',
  'bpmn:EventBasedGateway': '事件网关',
  
  // 其他常用元素标签（可选）
  'bpmn:StartEvent': '开始事件',
  'bpmn:EndEvent': '结束事件',
  'bpmn:UserTask': '用户任务',
  'bpmn:ManualTask': '人工任务',
  'bpmn:ServiceTask': '服务任务',
  'bpmn:ScriptTask': '脚本任务',
  'bpmn:ReceiveTask': '接收任务',
  'bpmn:SendTask': '发送任务',
  'bpmn:BusinessRuleTask': '业务规则任务',
  'bpmn:SubProcess': '子流程',
  'bpmn:CallActivity': '调用活动',
  'bpmn:SequenceFlow': '顺序流',
  'bpmn:MessageFlow': '消息流',
  'bpmn:DataObjectReference': '数据对象',
  'bpmn:DataStoreReference': '数据存储',
  
  // 工具栏分组标题
  'general': '通用',
  'events': '事件',
  'gateways': '网关',
  'activities': '活动',
  'connectors': '连接线'
};