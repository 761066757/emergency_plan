<template>
  <div class="flow-container">
    <!-- 1. 功能按钮区（导入/导出/流程重置/画布重置） -->
    <div class="btn-group">
      <!-- 导入按钮 + 隐藏的文件选择器 -->
      <label class="import-btn">
        导入流程文件
        <input type="file" accept=".bpmn,.xml" @change="handleImportFile" class="file-input" />
      </label>
      <button class="export-btn" @click="handleExportFile">导出流程文件</button>
      <button class="reset-process-btn" @click="resetProcess">重置流程</button>
      <button class="reset-canvas-btn" @click="resetCanvasView">重置画布视角</button>
    </div>

    <!-- 2. BPMN流程可视化/编辑容器 -->
    <div class="bpmn-modeler" ref="bpmnContainer"></div>

    <!-- 3. 当前步骤信息 + 下一步按钮 -->
    <div class="task-info">
      <h3>当前步骤：{{ currentTask?.taskName || '无' }}</h3>
      <button class="next-btn" @click="handleNextStep" :disabled="!currentTask?.taskId">
        下一步
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
// import axios from 'axios'
import BpmnModeler from 'bpmn-js/lib/Modeler'
import 'bpmn-js/dist/assets/bpmn-js.css'
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css'

// 核心变量
// const planId = ref('plan_001')
const currentTask = ref({})
const bpmnContainer = ref(null)
let bpmnModeler = null

// 初始流程XML（站厅火灾预案）
const initBpmnXml = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
             xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
             xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
             xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
             xmlns:flowable="http://flowable.org/bpmn"
             typeLanguage="http://www.w3.org/2001/XMLSchema"
             expressionLanguage="http://www.w3.org/1999/XPath"
             targetNamespace="http://www.flowable.org/processdef"
             id="definitions_zhanting_fire">
  <process id="zhantingFirePlanProcess" name="站厅火灾预案" isExecutable="true">
    <startEvent id="startEvent" name="流程开始"></startEvent>
    <userTask id="task_start_plan" name="启动火灾应急预案"></userTask>
    <userTask id="task_power_off" name="通知现场人员立即切断电源"></userTask>
    <parallelGateway id="parallelGateway" name="并行执行"></parallelGateway>
    <userTask id="task1" name="对火灾现场人员进行救援，同时用灭火器进行灭火"></userTask>
    <userTask id="task2" name="根据火灾大小迅速拨打119报警，详细报告火灾地点、火情、可燃物、被困人员等信息"></userTask>
    <userTask id="task3" name="疏散引导员迅速有效引导乘客疏散并协助灭火，维护现场秩序"></userTask>
    <userTask id="task4" name="现场清理：解除隔离或处理事故调查"></userTask>
    <userTask id="task5" name="应急恢复"></userTask>
    <userTask id="task6" name="应急结束"></userTask>
    <endEvent id="endEvent" name="流程结束"></endEvent>
    <sequenceFlow id="flow1" sourceRef="startEvent" targetRef="task_start_plan"></sequenceFlow>
    <sequenceFlow id="flow2" sourceRef="task_start_plan" targetRef="task_power_off"></sequenceFlow>
    <sequenceFlow id="flow3" sourceRef="task_power_off" targetRef="parallelGateway"></sequenceFlow>
    <sequenceFlow id="flow4" sourceRef="parallelGateway" targetRef="task1"></sequenceFlow>
    <sequenceFlow id="flow5" sourceRef="parallelGateway" targetRef="task2"></sequenceFlow>
    <sequenceFlow id="flow6" sourceRef="parallelGateway" targetRef="task3"></sequenceFlow>
    <sequenceFlow id="flow7" sourceRef="task1" targetRef="task4"></sequenceFlow>
    <sequenceFlow id="flow8" sourceRef="task2" targetRef="task4"></sequenceFlow>
    <sequenceFlow id="flow9" sourceRef="task3" targetRef="task4"></sequenceFlow>
    <sequenceFlow id="flow10" sourceRef="task4" targetRef="task5"></sequenceFlow>
    <sequenceFlow id="flow11" sourceRef="task5" targetRef="task6"></sequenceFlow>
    <sequenceFlow id="flow12" sourceRef="task6" targetRef="endEvent"></sequenceFlow>
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_zhanting_fire">
    <bpmndi:BPMNPlane id="BPMNPlane_zhanting_fire" bpmnElement="zhantingFirePlanProcess">
      <bpmndi:BPMNShape id="shape_start" bpmnElement="startEvent">
        <dc:Bounds x="100" y="150" width="36" height="36"></dc:Bounds>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="shape_task_start_plan" bpmnElement="task_start_plan">
        <dc:Bounds x="200" y="120" width="200" height="80"></dc:Bounds>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="shape_task_power_off" bpmnElement="task_power_off">
        <dc:Bounds x="450" y="120" width="200" height="80"></dc:Bounds>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="shape_gateway" bpmnElement="parallelGateway">
        <dc:Bounds x="700" y="150" width="36" height="36"></dc:Bounds>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="shape_task1" bpmnElement="task1">
        <dc:Bounds x="800" y="50" width="200" height="80"></dc:Bounds>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="shape_task2" bpmnElement="task2">
        <dc:Bounds x="800" y="150" width="200" height="80"></dc:Bounds>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="shape_task3" bpmnElement="task3">
        <dc:Bounds x="800" y="250" width="200" height="80"></dc:Bounds>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="shape_task4" bpmnElement="task4">
        <dc:Bounds x="1050" y="150" width="150" height="80"></dc:Bounds>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="shape_task5" bpmnElement="task5">
        <dc:Bounds x="1250" y="150" width="120" height="80"></dc:Bounds>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="shape_task6" bpmnElement="task6">
        <dc:Bounds x="1420" y="150" width="120" height="80"></dc:Bounds>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="shape_end" bpmnElement="endEvent">
        <dc:Bounds x="1590" y="168" width="36" height="36"></dc:Bounds>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="edge1" bpmnElement="flow1">
        <di:waypoint x="136" y="168"></di:waypoint>
        <di:waypoint x="200" y="160"></di:waypoint>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="edge2" bpmnElement="flow2">
        <di:waypoint x="400" y="160"></di:waypoint>
        <di:waypoint x="450" y="160"></di:waypoint>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="edge3" bpmnElement="flow3">
        <di:waypoint x="650" y="160"></di:waypoint>
        <di:waypoint x="700" y="168"></di:waypoint>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="edge4" bpmnElement="flow4">
        <di:waypoint x="736" y="168"></di:waypoint>
        <di:waypoint x="800" y="90"></di:waypoint>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="edge5" bpmnElement="flow5">
        <di:waypoint x="736" y="168"></di:waypoint>
        <di:waypoint x="800" y="190"></di:waypoint>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="edge6" bpmnElement="flow6">
        <di:waypoint x="736" y="168"></di:waypoint>
        <di:waypoint x="800" y="290"></di:waypoint>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="edge7" bpmnElement="flow7">
        <di:waypoint x="1000" y="90"></di:waypoint>
        <di:waypoint x="1050" y="190"></di:waypoint>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="edge8" bpmnElement="flow8">
        <di:waypoint x="1000" y="190"></di:waypoint>
        <di:waypoint x="1050" y="190"></di:waypoint>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="edge9" bpmnElement="flow9">
        <di:waypoint x="1000" y="290"></di:waypoint>
        <di:waypoint x="1050" y="190"></di:waypoint>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="edge10" bpmnElement="flow10">
        <di:waypoint x="1200" y="190"></di:waypoint>
        <di:waypoint x="1250" y="190"></di:waypoint>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="edge11" bpmnElement="flow11">
        <di:waypoint x="1370" y="190"></di:waypoint>
        <di:waypoint x="1420" y="190"></di:waypoint>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="edge12" bpmnElement="flow12">
        <di:waypoint x="1540" y="190"></di:waypoint>
        <di:waypoint x="1590" y="186"></di:waypoint>
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`

// 初始化BPMN Modeler
const initBpmnModeler = async (xml = initBpmnXml) => {
  try {
    // 如果已有实例，先销毁
    if (bpmnModeler) {
      bpmnModeler.destroy()
    }

    // 初始化Modeler实例
    bpmnModeler = new BpmnModeler({
      container: bpmnContainer.value,
      keyboard: { bindTo: document },
      // 可选：禁用编辑（仅查看）
      // disableDelete: true,
      // disableMove: true,
      // disableCopyPaste: true,
    })

    // 导入XML并渲染
    await bpmnModeler.importXML(xml)
    const canvas = bpmnModeler.get('canvas')
    canvas.zoom('fit-viewport') // 初始适配视角

    // 高亮当前任务
    if (currentTask.value.stepId) {
      highlightCurrentTask(currentTask.value.stepId)
    }
  } catch (e) {
    console.error('渲染BPMN流程失败：', e)
    alert(`流程渲染失败：${e.message}`)
  }
}

// 高亮当前任务节点
const highlightCurrentTask = (stepId) => {
  if (!bpmnModeler) return
  const canvas = bpmnModeler.get('canvas')

  const stepNodeMap = {
    '001': 'task_start_plan',
    '002': 'task_power_off',
    '003': 'task1',
    '004': 'task2',
    '005': 'task3',
    '006': 'task4',
    '007': 'task5',
    '008': 'task6',
  }

  const nodeId = stepNodeMap[stepId] || ''
  if (!nodeId) return

  // 清除旧高亮
  canvas.getRootElements().forEach((el) => {
    canvas.removeMarker(el.id, 'highlight')
  })

  // 添加新高亮
  if (canvas.getGraphics(nodeId)) {
    canvas.addMarker(nodeId, 'highlight')
  } else {
    console.warn(`节点${nodeId}不存在`)
  }
}

// 查询当前待办任务
const getCurrentTask = async () => {
  try {
    currentTask.value = {
      taskId: 'task_001',
      taskName: '启动火灾应急预案',
      stepId: '001',
    }
    // 真实接口替换：
    // const res = await axios.get(`/emergency/flow/task/${planId.value}`)
    // currentTask.value = res.data.data || {}
  } catch (e) {
    console.error('查询待办任务失败：', e)
    currentTask.value = {}
  }
}

// 下一步推进流程
const handleNextStep = async () => {
  if (!currentTask.value.taskId) {
    alert('暂无待办任务')
    return
  }
  try {
    const stepNextMap = {
      '001': { stepId: '002', taskId: 'task_002', taskName: '通知现场人员立即切断电源' },
      '002': {
        stepId: '003',
        taskId: 'task_003',
        taskName: '对火灾现场人员进行救援，同时用灭火器进行灭火',
      },
      '003': {
        stepId: '004',
        taskId: 'task_004',
        taskName: '根据火灾大小迅速拨打119报警，详细报告火灾地点、火情、可燃物、被困人员等信息',
      },
      '004': {
        stepId: '005',
        taskId: 'task_005',
        taskName: '疏散引导员迅速有效引导乘客疏散并协助灭火，维护现场秩序',
      },
      '005': { stepId: '006', taskId: 'task_006', taskName: '现场清理：解除隔离或处理事故调查' },
      '006': { stepId: '007', taskId: 'task_007', taskName: '应急恢复' },
      '007': { stepId: '008', taskId: 'task_008', taskName: '应急结束' },
      '008': { stepId: '', taskId: '', taskName: '流程结束' },
    }

    const nextStep = stepNextMap[currentTask.value.stepId] || {}
    currentTask.value = nextStep

    alert(`已完成当前步骤，当前推进至：${nextStep.taskName || '流程结束'}`)

    if (nextStep.stepId) {
      highlightCurrentTask(nextStep.stepId)
    } else {
      const canvas = bpmnModeler.get('canvas')
      canvas.getRootElements().forEach((el) => {
        canvas.removeMarker(el.id, 'highlight')
      })
    }

    // 真实接口替换：
    // const res = await axios.post(`/emergency/flow/next/${currentTask.value.taskId}`)
    // alert(res.data.msg)
    // await getCurrentTask()
  } catch (e) {
    console.error('完成任务失败：', e)
    alert('下一步执行失败：' + (e.response?.data?.msg || e.message))
  }
}

// 导入本地BPMN文件
const handleImportFile = async (e) => {
  const file = e.target.files[0]
  if (!file) return

  // 校验文件类型
  const fileType = file.name.split('.').pop().toLowerCase()
  if (!['bpmn', 'xml'].includes(fileType)) {
    alert('仅支持导入.bpmn或.xml格式的流程文件！')
    e.target.value = '' // 清空文件选择器
    return
  }

  // 读取文件内容
  const reader = new FileReader()
  reader.onload = async (event) => {
    try {
      const xmlContent = event.target.result
      await initBpmnModeler(xmlContent) // 用导入的XML重新初始化
      currentTask.value = {
        // 重置任务状态
        taskId: 'task_001',
        taskName: '启动火灾应急预案',
        stepId: '001',
      }
      highlightCurrentTask('001')
      alert('流程文件导入成功！')
      e.target.value = '' // 清空文件选择器
    } catch (err) {
      console.error('导入文件失败：', err)
      alert('文件导入失败，请检查文件格式是否正确！')
    }
  }
  reader.readAsText(file)
}

// 导出BPMN文件到本地
const handleExportFile = async () => {
  try {
    if (!bpmnModeler) {
      alert('暂无流程可导出！')
      return
    }

    // 导出当前流程XML
    const { xml } = await bpmnModeler.saveXML({ format: true })

    // 创建Blob并下载
    const blob = new Blob([xml], { type: 'application/xml' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = '站厅火灾预案.bpmn' // 推荐用.bpmn后缀
    a.click()
    URL.revokeObjectURL(a.href)

    alert('流程文件导出成功！')
  } catch (e) {
    console.error('导出文件失败：', e)
    alert('文件导出失败：' + e.message)
  }
}

// 重置流程（恢复到初始XML+初始任务状态）
const resetProcess = async () => {
  if (confirm('确定要重置流程吗？所有编辑内容将丢失！')) {
    await initBpmnModeler(initBpmnXml) // 恢复初始XML
    currentTask.value = {
      // 恢复初始任务状态
      taskId: 'task_001',
      taskName: '启动火灾应急预案',
      stepId: '001',
    }
    highlightCurrentTask('001')
    alert('流程已重置为初始状态！')
  }
}

// 重置画布视角（仅恢复缩放/平移，不改变流程内容）
const resetCanvasView = () => {
  if (!bpmnModeler) return
  const canvas = bpmnModeler.get('canvas')
  canvas.zoom('fit-viewport') // 回到初始适配视角
  canvas.scrollToElement(null, { x: 0, y: 0 }) // 回到画布原点
  alert('画布视角已重置！')
}

// 生命周期函数
onMounted(async () => {
  await initBpmnModeler()
  await getCurrentTask()
  if (currentTask.value.stepId) {
    highlightCurrentTask(currentTask.value.stepId)
  }
})

onUnmounted(() => {
  if (bpmnModeler) {
    bpmnModeler.destroy()
    bpmnModeler = null
  }
})
</script>

<style scoped>
.flow-container {
  width: 100%;
  max-width: 1800px;
  margin: 20px auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 0 20px;
}

/* 功能按钮区样式 */
.btn-group {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 4px;
}

.import-btn {
  padding: 6px 15px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: inline-block;
}
.import-btn:hover {
  background: #40a9ff;
}

.export-btn {
  padding: 6px 15px;
  background: #67c23a;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.export-btn:hover {
  background: #52c41a;
}

.reset-process-btn {
  padding: 6px 15px;
  background: #faad14;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.reset-process-btn:hover {
  background: #ffc53d;
}

.reset-canvas-btn {
  padding: 6px 15px;
  background: #722ed1;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.reset-canvas-btn:hover {
  background: #9254de;
}

/* 隐藏文件选择器 */
.file-input {
  display: none;
}

/* BPMN画布样式 */
.bpmn-modeler {
  width: 100%;
  height: 600px;
  border: 1px solid #e6e6e6;
  border-radius: 4px;
  overflow: auto;
}

/* 任务信息区样式 */
.task-info {
  padding: 10px 20px;
  background: #f5f5f5;
  border-radius: 4px;
}

.next-btn {
  padding: 8px 20px;
  background: #409eff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}
.next-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* 高亮样式 */
:deep(.highlight) {
  fill: #409eff !important;
  stroke: #1989fa !important;
  stroke-width: 2px !important;
  fill-opacity: 0.6 !important;
}

/* 节点文字样式 */
:deep(.djs-label) {
  z-index: 999 !important;
  font-size: 12px !important;
}

/* 并行网关样式 */
:deep(.djs-shape.bpmn-ParallelGateway) {
  fill: #f0f9ff !important;
  stroke: #409eff !important;
}
</style>
