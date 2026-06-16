<template>
  <div class="plan-process-container">
    <!-- 页面头部 -->
    <el-page-header
      content="应急预案流程设计"
      @back="handleBack"
      style="margin-bottom: 20px"
    ></el-page-header>

    <!-- 主体内容 -->
    <el-card shadow="never">
      <!-- 顶部操作栏 -->
      <div class="top-toolbar">
        <el-button type="warning" @click="handleImportBpmn">导入BPMN文件</el-button>
        <el-button type="info" @click="handleExportBpmn">导出BPMN文件</el-button>
        <el-button type="danger" @click="handleClearAll">清空所有数据</el-button>
        <el-button type="primary" @click="handleSavePlan">保存预案</el-button>
      </div>

      <!-- 核心布局：任务库 + bpmn.js画布 + 预案配置 -->
      <div class="main-layout">
        <!-- 左侧：任务库 + 节点替换操作 -->
        <div class="task-library-panel">
          <el-card header="全局任务库" class="task-library-card">
            <el-input
              v-model="taskSearchKey"
              placeholder="搜索任务名称/编码"
              prefix-icon="Search"
              style="margin-bottom: 15px"
              @input="handleTaskSearch"
            ></el-input>

            <el-tree
              ref="taskTreeRef"
              :data="taskTreeData"
              :props="treeProps"
              node-key="id"
              :filter-node-method="filterTaskNode"
              @node-click="handleTaskNodeClick"
              default-expand-all
              class="task-tree"
              :current-node-key="activeTaskId"
              highlight-current
              :expand-on-click-node="false"
            >
              <template #default="{ node, data }">
                <span class="custom-tree-node">
                  <span v-if="data.isTypeNode">
                    <el-icon><Folder /></el-icon>
                    <strong>{{ data.taskType }}</strong>
                    <el-tag size="small" type="info" style="margin-left: 8px;">
                      {{ data.taskTypeCount }}个任务
                    </el-tag>
                  </span>
                  <span v-else class="child-node">
                    <el-icon><Operation /></el-icon>
                    {{ node.label }}
                    <span class="task-code-tag">{{ data.taskCode }}</span>
                  </span>
                </span>
              </template>
            </el-tree>
          </el-card>

          <!-- 节点替换操作 -->
          <el-card header="节点替换操作" class="node-replace-card">
            <div class="node-info">
              <p>
                <strong>当前选中节点：</strong
                >{{ selectedCanvasNode?.name || '未选中任务节点（请先在画布选中矩形任务节点）' }}
              </p>
              <p>
                <strong>节点类型：</strong
                >{{
                  selectedCanvasNode?.type === 'bpmn:UserTask'
                    ? '用户任务（可替换）'
                    : selectedCanvasNode?.type || '非任务节点（不可替换）'
                }}
              </p>
              <p v-if="selectedTask?.isTypeNode">
                <strong>已绑定任务类型：</strong>{{ selectedTask?.taskType || '无' }}
              </p>
              <p v-else-if="selectedTask">
                <strong>已绑定任务：</strong>{{ selectedTask?.taskName || '无' }}
              </p>
            </div>
            <el-button
              type="primary"
              @click="handleReplaceNodeWithTask"
              :disabled="
                !selectedTask || !selectedCanvasNode || selectedCanvasNode.type !== 'bpmn:UserTask' || !selectedTask.isTypeNode
              "
              style="margin-top: 10px; width: 100%"
            >
              将选中任务类型替换到当前节点
            </el-button>
            <div style="margin-top: 8px; font-size: 12px; color: #999">
              操作提示：1.从左侧图形栏拖拽节点→2.选中画布中的任务节点→3.点击“小扳手”选择User Task→4.选中左侧任务类型（父节点）→5.点击替换
            </div>
          </el-card>
        </div>

        <!-- 中间：完整BPMN画布（保留图形栏+ContextPad+属性面板） -->
        <div class="flowable-canvas-panel">
          <el-card header="流程设计画布" class="canvas-card">
            <div class="canvas-toolbar">
              <el-button @click="handleSaveCanvas">保存画布</el-button>
              <el-button @click="handleRefreshCanvas">刷新画布</el-button>
              <el-button @click="handleAddUserTask">添加默认任务节点</el-button>
              <el-button @click="handleAddParallelGateway">添加并行网关</el-button>
              <el-button @click="handleAddExclusiveGateway">添加互斥网关</el-button>
            </div>
            <!-- BPMN画布和属性面板容器 -->
            <div class="bpmn-editor-container">
              <!-- BPMN画布容器（关键：不隐藏图形栏） -->
              <div class="canvas-container" ref="bpmnContainer"></div>
              <!-- BPMN属性面板容器 -->
              <div class="properties-panel-container" ref="propertiesPanelContainer"></div>
            </div>
          </el-card>
        </div>

        <!-- 右侧：预案信息配置 -->
        <div class="plan-info-panel">
          <el-card header="预案基础信息" class="info-card">
            <el-form
              :model="planForm"
              label-width="100px"
              size="default"
              :rules="planRules"
              ref="planFormRef"
            >
              <el-form-item label="预案ID">
                <el-input v-model="planForm.id" disabled placeholder="自动生成"></el-input>
              </el-form-item>
              <el-form-item label="预案名称" prop="planName">
                <el-input
                  v-model="planForm.planName"
                  placeholder="请输入预案名称"
                  @blur="handlePlanNameBlur"
                ></el-input>
              </el-form-item>
              <el-form-item label="预案类型" prop="planType">
                <el-select v-model="planForm.planType" placeholder="请选择预案类型">
                  <el-option
                    v-for="item in PLAN_TYPE_ENUMS"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  ></el-option>
                </el-select>
              </el-form-item>
              <el-form-item label="预案描述" prop="planDesc">
                <el-input
                  v-model="planForm.planDesc"
                  type="textarea"
                  rows="5"
                  placeholder="请输入预案详细描述"
                ></el-input>
              </el-form-item>
              <el-form-item label="关联摄像头">
                <el-select v-model="planForm.cameraIds" multiple placeholder="请选择摄像头">
                  <el-option
                    v-for="camera in cameraList"
                    :key="camera.id"
                    :label="camera.name"
                    :value="camera.id"
                  ></el-option>
                </el-select>
              </el-form-item>
              <el-form-item label="预案文档">
                <el-upload
                  class="upload-demo"
                  :action="uploadDocUrl"
                  :on-success="handleDocUploadSuccess"
                  :on-error="handleDocUploadError"
                  :before-upload="beforeDocUpload"
                  :file-list="planForm.docFileList"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  :limit="1"
                >
                  <el-button type="primary" size="small">
                    <el-icon><Upload /></el-icon>
                    上传预案文档
                  </el-button>
                  <template #tip>
                    <div class="el-upload__tip">
                      支持pdf/word/excel格式，文件大小不超过10MB
                    </div>
                  </template>
                </el-upload>
              </el-form-item>
              <el-form-item label="BPMN文件">
                <el-input
                  v-model="planForm.bpmnXml"
                  type="textarea"
                  rows="3"
                  disabled
                  placeholder="画布自动生成"
                ></el-input>
              </el-form-item>
            </el-form>
          </el-card>

        </div>
      </div>
    </el-card>

    <!-- 导入BPMN文件弹窗 -->
    <el-dialog v-model="importDialogVisible" title="导入BPMN文件" width="400px">
      <el-upload
        ref="uploadRef"
        class="upload-demo"
        drag
        :action="importBpmnUrl"
        :on-success="handleImportSuccess"
        :on-error="handleImportError"
        :before-upload="beforeImportUpload"
        accept=".xml,.bpmn,.bpmn20.xml"
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
        <template #tip>
          <div class="el-upload__tip">只能上传xml/bpmn文件，且文件大小不超过2MB</div>
        </template>
      </el-upload>
      <template #footer>
        <el-button @click="importDialogVisible = false">取消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Upload, UploadFilled, Folder, Operation } from '@element-plus/icons-vue'
import { useRouter, useRoute } from 'vue-router'
import {
  CAMERA_LIST  // 导入摄像头列表
} from '@/config/planEnums'

// 引入完整的bpmn-js（保留所有核心模块）
import BpmnModeler from 'bpmn-js/lib/Modeler'
import 'bpmn-js/dist/assets/bpmn-js.css'
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css'

// Flowable扩展（保留完整支持，lowable+BPMN 模型器联动的必备配置，且完全透明无隐式写入）
// 作用仅仅让 bpmn-js 能识别 Flowable 的自定义属性（如flowable:taskId）
// import flowableModdle from 'flowable-bpmn-moddle/resources/camunda.json'

// 原有API引入（请根据实际路径调整）
import { queryTask } from '@/modules/taskConfig/taskConfig.route'
import {
  getCameraList,
  savePlan,
  getPlanDetail,
} from '@/modules/planEdit/planEdit.route'

// 引入枚举配置
import { PLAN_TYPE_ENUMS } from '@/config/planEnums'

// 路由相关
const router = useRouter()
const route = useRoute()

// 页面参数
const planId = ref(route.query.id || '')
const uploadRef = ref(null)
const taskTreeRef = ref(null)
const planFormRef = ref(null)
const bpmnContainer = ref(null)
let bpmnModeler = null // BPMN模型器实例

// 响应式数据
const taskSearchKey = ref('')
const importDialogVisible = ref(false)
const importBpmnUrl = ref('/plan/bpmnValidate')
const uploadDocUrl = ref('/plan/uploadPlanDoc')
const selectedCanvasNode = ref(null) // 当前选中的画布节点
const selectedTask = ref(null) // 当前选中的任务
const activeTaskId = ref('') // 选中任务的ID（用于树形高亮）

// 预案表单
const planForm = reactive({
  id: planId.value || '',
  planName: '',
  planType: '',
  planDesc: '',
  cameraIds: [],
  bpmnXml: '',
  planDoc: '',
  docFileList: [],
})

// 表单校验规则
const planRules = ref({
  planName: [{ required: true, message: '请输入预案名称', trigger: 'blur' }],
  planType: [{ required: true, message: '请选择预案类型', trigger: 'change' }],
})

// 任务相关数据
const taskTreeData = ref([])
const treeProps = ref({
  label: 'taskName',
  children: 'children',
})

// 下拉列表数据
const cameraList = ref([])

// 基础空流程模板（保留完整结构）
const initEmptyXml = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
             xmlns:flowable="http://flowable.org/bpmn"
             xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
             xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
             xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
             targetNamespace="http://www.flowable.org/processdef">
  <process id="emergencyPlanProcess" name="应急预案流程" isExecutable="true">
    <startEvent id="startEvent" name="开始"></startEvent>
    <endEvent id="endEvent" name="结束"></endEvent>
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_emergencyPlanProcess">
    <bpmndi:BPMNPlane id="BPMNPlane_emergencyPlanProcess" bpmnElement="emergencyPlanProcess">
      <bpmndi:BPMNShape id="BPMNShape_startEvent" bpmnElement="startEvent">
        <dc:Bounds x="200" y="200" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="BPMNShape_endEvent" bpmnElement="endEvent">
        <dc:Bounds x="600" y="200" width="36" height="36"/>
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`

// 初始化BPMN模型器（核心：保留所有模块+解决事件冲突）
const initBpmnModeler = async (xml = initEmptyXml) => {
  try {
    // 1. 销毁旧实例（解决重复初始化冲突）
    if (bpmnModeler) {
      try {
        bpmnModeler.destroy()
      } catch (e) {
        console.warn('销毁旧Modeler实例警告：', e.message)
      }
      bpmnModeler = null
    }

    // 2. 校验容器
    if (!bpmnContainer.value) {
      ElMessage.error('BPMN画布容器未找到，请检查DOM加载')
      return
    }

    // 3. 初始化BPMN模型器（与BpmnTest.vue配置一致）
    bpmnModeler = new BpmnModeler({
      container: bpmnContainer.value,
      moddleExtensions: {
        flowable: {
          uri: 'http://flowable.org/bpmn',
          prefix: 'flowable'
        }
      }
    })

    // 4. 导入XML
    const result = await bpmnModeler.importXML(xml)
    const { warnings } = result
    if (warnings.length > 0) {
      console.warn('BPMN导入警告:', warnings)
    }

    // 5. 事件监听（解决原生事件与自定义事件冲突）
    const eventBus = bpmnModeler.get('eventBus')
    const selection = bpmnModeler.get('selection')

    // 检查是否存在ContextPad
    const contextPad = bpmnModeler.get('contextPad')

    // 优化事件处理逻辑
    eventBus.on('element.click', (event) => {
      // 确保点击的是具体元素而不是Root
      if (contextPad && event.element && event.element.type !== 'bpmn:Process') {
        try {
          contextPad.open(event.element, event.originalEvent)
        } catch (e) {
          console.error('打开ContextPad失败:', e)
        }
      } else {
        // 点击空白处关闭ContextPad
        try {
          contextPad.close()
        } catch (e) {
          // 忽略关闭错误
          console.warn('关闭ContextPad警告:', e.message)
        }
      }
    })

    eventBus.on('element.select', (event) => {
      // 元素被选择时打开ContextPad
      if (contextPad && event.element && event.element.type !== 'bpmn:Process') {
        try {
          contextPad.open(event.element)
        } catch (e) {
          console.error('选择时打开ContextPad失败:', e)
        }
      }
    })

    // 点击画布空白处关闭ContextPad
    eventBus.on('canvas.click', () => {
      try {
        contextPad.close()
      } catch (e) {
        // 忽略关闭错误
        console.warn('关闭ContextPad警告:', e.message)
      }
    })

    // 只清理必要的旧监听，避免影响原生功能
    eventBus.off('selection.changed')

    // 只在selection.changed事件中同步自定义状态
    // 这个事件是在元素被选中后触发的，不会影响原生的点击行为
    eventBus.on('selection.changed', () => {
      const selectedElements = selection.get() || []
      const element = selectedElements[0]

      if (element) {
        // 仅同步自定义状态，不修改原生逻辑
        const nodeType = element.type || element.$type || element.businessObject?.$type || ''
        const flowableTaskType = element.businessObject?.$attrs?.['flowable:taskType'] || ''

        selectedCanvasNode.value = {
          id: element.id,
          name: element.businessObject?.name || element.name || '未命名',
          type: nodeType,
          flowableTaskType: flowableTaskType,
          rawElement: element
        }

        // 非用户任务清空任务
        if (nodeType !== 'bpmn:UserTask') {
          selectedTask.value = null
          activeTaskId.value = ''
        }
      } else {
        // 未选中时清空状态
        selectedCanvasNode.value = null
        selectedTask.value = null
        activeTaskId.value = ''
      }
    })

    // 6. 适配画布
    const canvas = bpmnModeler.get('canvas')
    canvas.zoom('fit-viewport')
    ElMessage.success('BPMN画布初始化完成(图形栏+菜单已启用)')
  } catch (e) {
    ElMessage.error(`画布初始化失败：${e.message}`)
    console.error('初始化详情：', e)
    bpmnModeler = null
  }
}

// 加载任务信息
// const loadTaskInfoById = async (taskId) => {
//   try {
//     const res = await getTaskNameByIds(Array.isArray(taskId) ? taskId : [taskId])
//     if (res.code === 200 && res.data?.length) {
//       const task = res.data[0]
//       selectedTask.value = {
//         id: task.id,
//         taskName: task.taskName,
//         taskCode: task.taskCode,
//         taskType: task.taskType,
//         taskType: task.taskType,
//       }
//       activeTaskId.value = task.id
//     } else {
//       selectedTask.value = null
//       activeTaskId.value = ''
//       ElMessage.warning(`未找到任务ID：${taskId}`)
//     }
//   } catch (e) {
//     console.error('加载任务失败：', e)
//     selectedTask.value = null
//     activeTaskId.value = ''
//     ElMessage.error(`加载任务失败：${e.message}`)
//   }
// }

// 页面回退
const handleBack = () => {
  router.push('/plan/list')
}

// 任务搜索过滤
const filterTaskNode = (value, data) => {
  if (!value) return true
  return (
    data.taskName?.includes(value) ||
    data.taskCode?.includes(value) ||
    data.taskType?.includes(value)
  )
}

// 任务搜索
const handleTaskSearch = () => {
  taskTreeRef.value.filter(taskSearchKey.value)
}

// 选中任务
const handleTaskNodeClick = (data) => {
  // 如果点击的是子节点，提示用户只能选择父节点
  if (!data.isTypeNode) {
    ElMessage.info('请选择任务类型（父节点），子节点仅用于展示')
    // 清空选中状态
    selectedTask.value = null
    activeTaskId.value = ''
    return
  }

  // 选中父节点（任务类型）
  selectedTask.value = {
    id: data.id,
    taskType: data.taskType,
    isTypeNode: true,
    taskTypeCount: data.taskTypeCount,
    children: data.children || []
  }
  activeTaskId.value = data.id

  // 根据画布节点状态给出不同提示
  if (!bpmnModeler) {
    ElMessage.info(`已选中任务类型：${data.taskType}（包含${data.taskTypeCount}个任务），请在画布中添加用户任务节点`)
  } else if (!selectedCanvasNode.value) {
    ElMessage.success(`已选中任务类型：${data.taskType}（包含${data.taskTypeCount}个任务），请在画布中选中用户任务节点进行替换`)
  } else if (selectedCanvasNode.value.type !== 'bpmn:UserTask') {
    ElMessage.success(`已选中任务类型：${data.taskType}，当前选中的不是用户任务节点，无法替换`)
  } else {
    ElMessage.success(`已选中任务类型：${data.taskType}（包含${data.taskTypeCount}个任务），可以点击"替换到当前节点"按钮`)
  }
}

// 替换节点（核心：解决属性写入冲突）
const handleReplaceNodeWithTask = () => {
  if (!bpmnModeler) {
    ElMessage.error('画布未初始化')
    return
  }
  if (!selectedCanvasNode.value) {
    ElMessage.warning('请先选中画布中的用户任务节点')
    return
  }
  if (selectedCanvasNode.value.type !== 'bpmn:UserTask') {
    ElMessage.error('仅支持替换用户任务节点')
    return
  }
  if (!selectedTask.value || !selectedTask.value.isTypeNode) {
    ElMessage.warning('请先选中左侧任务类型（父节点）')
    return
  }

  try {
    const elementRegistry = bpmnModeler.get('elementRegistry')
    const modeling = bpmnModeler.get('modeling')
    const node = elementRegistry.get(selectedCanvasNode.value.id)

    if (!node) {
      ElMessage.error('节点已失效，请重新选中')
      selectedCanvasNode.value = null
      return
    }

    // 写入属性（替换的是父节点/任务类型，只保留 taskType）
    const newName = `${selectedTask.value.taskType}`

    // 同步写入properties和flowable属性（仅写入 taskType）
    node.properties = { ...node.properties, taskType: selectedTask.value.taskType }
    modeling.updateProperties(node, {
      name: newName,
      'flowable:taskType': selectedTask.value.taskType,
    })

    // 更新自定义状态
    selectedCanvasNode.value.name = newName
    selectedCanvasNode.value.flowableTaskType = selectedTask.value.taskType
    ElMessage.success(`节点替换成功：${newName}`)
  } catch (e) {
    ElMessage.error(`替换失败：${e.message}`)
    console.error('替换详情：', e)
  }
}

// 添加默认任务节点（解决节点添加冲突）
const handleAddUserTask = () => {
  if (!bpmnModeler) {
    ElMessage.error('画布未初始化')
    return
  }

  try {
    const canvas = bpmnModeler.get('canvas')
    const elementFactory = bpmnModeler.get('elementFactory')
    const elementRegistry = bpmnModeler.get('elementRegistry')
    const modeling = bpmnModeler.get('modeling')
    const selection = bpmnModeler.get('selection')
    //const moddle = bpmnModeler.get('moddle')
    const process = elementRegistry.get('emergencyPlanProcess')

    // 获取开始/结束节点
    const startEvent = elementRegistry.get('startEvent')
    const endEvent = elementRegistry.get('endEvent')
    if (!startEvent || !endEvent) {
      ElMessage.error('画布缺少开始/结束节点，请刷新')
      return
    }

    // 计算节点位置
    const taskNodes = elementRegistry
      .getAll()
      .filter(el => el.type === 'bpmn:UserTask')
      .sort((a, b) => a.x - b.x)

    let baseX = 300 + taskNodes.length * 150
    let baseY = 200
    let lastTaskNode = taskNodes.length > 0 ? taskNodes[taskNodes.length - 1] : null

    if (lastTaskNode) {
      baseX = lastTaskNode.x + 150
      baseY = lastTaskNode.y
    }

    // 创建唯一ID（解决ID冲突）
    let taskId = `userTask_${Date.now()}_${Math.floor(Math.random() * 10000)}`
    while (elementRegistry.get(taskId)) {
      taskId = `userTask_${Date.now()}_${Math.floor(Math.random() * 10000)}_${Math.floor(Math.random() * 100)}`
    }

    // 创建任务节点（解决节点挂载冲突）
    // const taskBo = moddle.create('bpmn:UserTask', {
    //   id: taskId,
    //   name: '未命名任务'
    // })

    const task = elementFactory.createShape({
      type: 'bpmn:UserTask',
      id: taskId,
      x: baseX,
      y: baseY,
      width: 120,
      height: 80,
      parent: process
    })

    // 添加节点到流程（解决挂载冲突）
    modeling.createShape(task, { x: baseX, y: baseY }, process)

    // 适配画布+选中节点
    canvas.zoom('fit-viewport')
    setTimeout(() => {
      if (task && selection) {
        // 修复：在新版本bpmn-js中，selection.deselectAll()已不存在
        // 直接选择任务节点，会自动清除之前的选择
        selection.select(task)
        selectedCanvasNode.value = {
          id: task.id,
          name: task.name || '未命名',
          type: task.type,
          flowableTaskType: ''
        }
      }
    }, 300)

    ElMessage.success('默认任务节点添加成功（请手动连接前后节点）')
  } catch (e) {
    ElMessage.error(`添加节点失败：${e.message}`)
    console.error('添加节点详情：', e)
  }
}

// 添加并行网关（分叉/聚合）
const handleAddParallelGateway = () => {
  if (!bpmnModeler) {
    ElMessage.error('画布未初始化')
    return
  }

  try {
    const canvas = bpmnModeler.get('canvas')
    const elementFactory = bpmnModeler.get('elementFactory')
    const elementRegistry = bpmnModeler.get('elementRegistry')
    const modeling = bpmnModeler.get('modeling')
    const selection = bpmnModeler.get('selection')
    const process = elementRegistry.get('emergencyPlanProcess')

    // 获取开始/结束节点
    const startEvent = elementRegistry.get('startEvent')
    const endEvent = elementRegistry.get('endEvent')
    if (!startEvent || !endEvent) {
      ElMessage.error('画布缺少开始/结束节点，请刷新')
      return
    }

    // 计算网关位置
    const gatewayNodes = elementRegistry
      .getAll()
      .filter(el => el.type === 'bpmn:ParallelGateway')
      .sort((a, b) => a.x - b.x)

    let baseX = 300 + gatewayNodes.length * 200
    let baseY = 200
    let lastNode = elementRegistry.getAll().filter(el => el.type === 'bpmn:UserTask' || el.type === 'bpmn:ParallelGateway' || el.type === 'bpmn:ExclusiveGateway')
      .sort((a, b) => (b.x + b.width) - (a.x + a.width))[0]

    if (lastNode) {
      baseX = lastNode.x + lastNode.width + 100
      baseY = lastNode.y
    }

    // 创建唯一ID
    let gatewayId = `Gateway_Parallel_${Date.now()}_${Math.floor(Math.random() * 10000)}`
    while (elementRegistry.get(gatewayId)) {
      gatewayId = `Gateway_Parallel_${Date.now()}_${Math.floor(Math.random() * 10000)}_${Math.floor(Math.random() * 100)}`
    }

    // 创建并行网关节点
    const gateway = elementFactory.createShape({
      type: 'bpmn:ParallelGateway',
      id: gatewayId,
      x: baseX,
      y: baseY,
      width: 50,
      height: 50,
      parent: process
    })

    // 添加网关到流程
    modeling.createShape(gateway, { x: baseX, y: baseY }, process)

    // 适配画布+选中网关
    canvas.zoom('fit-viewport')
    setTimeout(() => {
      if (gateway && selection) {
        selection.select(gateway)
        selectedCanvasNode.value = {
          id: gateway.id,
          name: '并行网关',
          type: gateway.type,
          flowableTaskType: ''
        }
      }
    }, 300)

    ElMessage.success('并行网关添加成功（请手动连接前后节点）')
  } catch (e) {
    ElMessage.error(`添加并行网关失败：${e.message}`)
    console.error('添加详情：', e)
  }
}

// 添加互斥网关（条件分支）
const handleAddExclusiveGateway = () => {
  if (!bpmnModeler) {
    ElMessage.error('画布未初始化')
    return
  }

  try {
    const canvas = bpmnModeler.get('canvas')
    const elementFactory = bpmnModeler.get('elementFactory')
    const elementRegistry = bpmnModeler.get('elementRegistry')
    const modeling = bpmnModeler.get('modeling')
    const selection = bpmnModeler.get('selection')
    const process = elementRegistry.get('emergencyPlanProcess')

    // 获取开始/结束节点
    const startEvent = elementRegistry.get('startEvent')
    const endEvent = elementRegistry.get('endEvent')
    if (!startEvent || !endEvent) {
      ElMessage.error('画布缺少开始/结束节点，请刷新')
      return
    }

    // 计算网关位置
    const gatewayNodes = elementRegistry
      .getAll()
      .filter(el => el.type === 'bpmn:ExclusiveGateway')
      .sort((a, b) => a.x - b.x)

    let baseX = 300 + gatewayNodes.length * 200
    let baseY = 200
    let lastNode = elementRegistry.getAll().filter(el => el.type === 'bpmn:UserTask' || el.type === 'bpmn:ParallelGateway' || el.type === 'bpmn:ExclusiveGateway')
      .sort((a, b) => (b.x + b.width) - (a.x + a.width))[0]

    if (lastNode) {
      baseX = lastNode.x + lastNode.width + 100
      baseY = lastNode.y
    }

    // 创建唯一ID
    let gatewayId = `Gateway_Exclusive_${Date.now()}_${Math.floor(Math.random() * 10000)}`
    while (elementRegistry.get(gatewayId)) {
      gatewayId = `Gateway_Exclusive_${Date.now()}_${Math.floor(Math.random() * 10000)}_${Math.floor(Math.random() * 100)}`
    }

    // 创建互斥网关节点
    const gateway = elementFactory.createShape({
      type: 'bpmn:ExclusiveGateway',
      id: gatewayId,
      x: baseX,
      y: baseY,
      width: 50,
      height: 50,
      parent: process
    })

    // 添加网关到流程
    modeling.createShape(gateway, { x: baseX, y: baseY }, process)

    // 适配画布+选中网关
    canvas.zoom('fit-viewport')
    setTimeout(() => {
      if (gateway && selection) {
        selection.select(gateway)
        selectedCanvasNode.value = {
          id: gateway.id,
          name: '互斥网关',
          type: gateway.type,
          flowableTaskType: ''
        }
      }
    }, 300)

    ElMessage.success('互斥网关添加成功（请手动连接前后节点）')
  } catch (e) {
    ElMessage.error(`添加互斥网关失败：${e.message}`)
    console.error('添加详情：', e)
  }
}

// 预案名称失去焦点时自动生成ID
const handlePlanNameBlur = () => {
  // 如果已经有ID（编辑模式），不再生成
  if (planForm.id) {
    return
  }

  // 只有当预案名称不为空时才生成ID
  if (planForm.planName && planForm.planName.trim()) {
    // 生成唯一ID（解决ID冲突），使用EM作为前缀
    let newId = 'EM' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5)

    // 确保ID唯一性
    while (!newId || newId.length < 10) {
      newId = 'EM' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
    }

    planForm.id = newId
    ElMessage.success(`已自动生成预案ID：${newId}`)
    console.log('生成的预案ID：', newId)
  }
}

// 验证 BPMN 模型的有效性
const handleValidateBpmn = async () => {
  if (!bpmnModeler) {
    ElMessage.error('画布未初始化')
    return false
  }

  try {
    // 获取所有元素进行基本验证
    const elementRegistry = bpmnModeler.get('elementRegistry')

    // 获取所有元素
    const allElements = elementRegistry.getAll()

    // 验证基本业务规则
    const validationErrors = []

    // 检查是否有开始事件
    const startEvents = allElements.filter(el => el.type === 'bpmn:StartEvent')
    if (startEvents.length === 0) {
      validationErrors.push('流程必须包含至少一个开始事件')
    }

    // 检查是否有结束事件
    const endEvents = allElements.filter(el => el.type === 'bpmn:EndEvent')
    if (endEvents.length === 0) {
      validationErrors.push('流程必须包含至少一个结束事件')
    }

    // 检查是否有用户任务
    const userTasks = allElements.filter(el => el.type === 'bpmn:UserTask')
    if (userTasks.length === 0) {
      // 这里可以作为警告而不是错误，因为流程可能暂时不需要用户任务
      console.info('流程中没有用户任务，这可能是一个纯自动化流程')
    }

    // 如果有验证错误，显示并返回 false
    if (validationErrors.length > 0) {
      console.warn('BPMN 模型存在以下问题：', validationErrors)
      ElMessage.warning(`BPMN 模型存在 ${validationErrors.length} 个问题：\n${validationErrors.join('\n')}`)
      return false
    }

    // 尝试保存XML来验证语法
    try {
      const result = await bpmnModeler.saveXML({ format: true })
      // 安全地检查result是否包含warnings属性
      let warnings = []
      if (result && typeof result === 'object') {
        if (Array.isArray(result.warnings)) {
          warnings = result.warnings
        } else if (result.xml && typeof result.xml === 'string') {
          // 有时候返回的是 {xml: "..."} 格式
          // 不需要额外处理，因为XML格式正确
        } else {
          // 其他格式，尝试提取warnings
          warnings = result.warnings || []
        }
      }

      if (Array.isArray(warnings) && warnings.length > 0) {
        console.warn('BPMN XML 保存时存在警告：', warnings)
        // 警告不一定是错误，但可以提醒用户
      }
    } catch (saveError) {
      console.error('BPMN XML 保存验证失败：', saveError)
      ElMessage.error(`BPMN 语法验证失败：${saveError.message}`)
      return false
    }

    ElMessage.success('BPMN 模型验证通过')
    return true
  } catch (e) {
    console.error('模型验证失败：', e)
    ElMessage.error(`验证失败：${e.message}`)
    return false
  }
}

// 保存画布（带验证）
const handleSaveCanvas = async () => {
  if (!bpmnModeler) {
    ElMessage.error('画布未初始化')
    return false
  }

  try {
    // 校验预案名称是否已输入
    if (!planForm.planName || !planForm.planName.trim()) {
      ElMessage.warning('请先输入预案名称')
      // 聚焦到预案名称输入框
      planFormRef.value?.fields?.find(f => f.prop === 'planName')?.focus()
      return false
    }

    // 首先进行模型验证
    const isValid = await handleValidateBpmn()
    if (!isValid) {
      ElMessage.error('BPMN 模型验证未通过，请修正错误后重试')
      return false
    }

    // 在保存前，更新BPMN流程的name为预案名称
    try {
      // 检查bpmnModeler是否已初始化
      if (!bpmnModeler) {
        console.warn('BPMN Modeler尚未初始化，跳过流程名称和ID更新')
        // 不抛出错误，只是记录警告，因为这不影响保存功能
      } else if (typeof bpmnModeler.get !== 'function') {
        console.warn('BPMN Modeler实例无效，跳过流程名称和ID更新')
        // 不抛出错误，只是记录警告，因为这不影响保存功能
      } else {
        const elementRegistry = bpmnModeler.get('elementRegistry')
        const modeling = bpmnModeler.get('modeling')
        const moddle = bpmnModeler.get('moddle')

        // 获取流程定义元素
        const processElement = elementRegistry.get('emergencyPlanProcess')
        if (processElement && planForm.planName) {
          // 更新流程名称
          modeling.updateProperties(processElement, {
            name: planForm.planName
          })

          // 同时更新流程ID为预案的ID（如果存在）
          if (planForm.id) {
            modeling.updateProperties(processElement, {
              id: planForm.id
            })

            // 获取definitions来更新diagram
            const definitions = bpmnModeler.getDefinitions()

            if (definitions && definitions.diagrams) {
              definitions.diagrams.forEach(diagram => {
                if (diagram.$type === 'bpmndi:BPMNDiagram' &&
                    diagram.plane &&
                    diagram.plane.$type === 'bpmndi:BPMNPlane') {

                  // 检查是否是与当前流程相关的plane
                  if (diagram.plane.bpmnElement &&
                      (diagram.plane.bpmnElement.id === 'emergencyPlanProcess' ||
                       diagram.plane.bpmnElement.id === processElement.id)) {
                    // 使用moddle的工厂方法创建新的属性
                    moddle.ids.unclaim(diagram.id); // 释放旧ID
                    moddle.ids.claim(`BPMNDiagram_${planForm.id}`, diagram); // 分配新ID
                    diagram.id = `BPMNDiagram_${planForm.id}`;

                    moddle.ids.unclaim(diagram.plane.id); // 释放旧ID
                    moddle.ids.claim(`BPMNPlane_${planForm.id}`, diagram.plane); // 分配新ID
                    diagram.plane.id = `BPMNPlane_${planForm.id}`;
                    diagram.plane.bpmnElement = processElement;
                  }
                }
              });
            }

            console.log('已更新BPMN流程名称为：', planForm.planName)
            console.log('已更新BPMN流程ID为：', planForm.id)
            console.log('已更新BPMNDiagram和BPMNPlane的ID及bpmnElement引用')
          } else {
            console.log('已更新BPMN流程名称为：', planForm.planName)
          }
        }
      }
    } catch (updateError) {
      console.warn('更新BPMN流程名称或ID失败（不影响保存）：', updateError.message)
      console.error('详细错误信息：', updateError)
    }

    const { xml } = await bpmnModeler.saveXML({ format: true })
    planForm.bpmnXml = xml
    ElMessage.success('BPMN XML 验证并保存成功')
    return true
  } catch (e) {
    // ElMessage.error(`保存画布失败：${e.message}`)
    console.error(e)
    return false
  }
}

// 刷新画布
const handleRefreshCanvas = () => {
  initBpmnModeler(planForm.bpmnXml || initEmptyXml)
}

// 保存预案 - 修复 planTaskRelList 为空的问题
const handleSavePlan = async () => {
  try {
    await planFormRef.value.validate()

    // ========== 修复后的核心逻辑 ==========
    const planTaskRelList = []
    if (bpmnModeler) {
      // 1. 先保存画布（确保 XML 和节点属性同步）
      const canvasSaved = await handleSaveCanvas()
      // 如果画布保存失败，直接返回
      if (!canvasSaved) {
        ElMessage.error('画布验证失败，无法保存预案')
        return
      }

      // 2. 获取所有节点（精准过滤用户任务节点）
      const elementRegistry = bpmnModeler.get('elementRegistry')
      const allElements = elementRegistry.getAll()

      // 3. 遍历节点，正确读取 Flowable 属性
      allElements.forEach(el => {
        // 精准判断：用户任务节点
        const isUserTask = el.businessObject?.$type === 'bpmn:UserTask'
        if (!isUserTask) return

        // 正确读取 flowable:taskType 属性（替换的是父节点，仅保留 taskType）
        const taskType = el.businessObject?.$attrs?.['flowable:taskType'] || el.properties?.taskType

        // 只有绑定了 taskType 的节点才加入关联列表
        if (taskType) {
          planTaskRelList.push({
            planId: planForm.id,
            taskType: taskType,
            flowNodeId: el.id,
            flowNodeName: el.businessObject?.name || '未命名节点'
          })
        }
      })

      // 调试：打印收集到的关联关系
      console.log('收集到的 planTaskRelList：', planTaskRelList)
    }
    // ========== 修复结束 ==========

    // 校验预案ID是否已生成（应该在输入预案名称时已生成）
    if (!planForm.id) {
      ElMessage.error('预案ID未生成，请先输入预案名称并点击其他位置')
      return
    }

    // 将 cameraIds 数组转换为以分号分隔的字符串
    const saveData = {
      ...planForm,
      cameraIds: Array.isArray(planForm.cameraIds) ? planForm.cameraIds.join(';') : planForm.cameraIds,
      // 确保只传递planDoc字段，移除docFileList字段
      docFileList: undefined
    }

    // 保存数据
    const res = await savePlan({
      plan: saveData,
      planTaskRelList: planTaskRelList,
    })

    if (res.code === 200) {
      ElMessage.success('预案保存成功')
    } else {
      ElMessage.error(res.data.msg || '保存失败')
    }
  } catch (error) {
    ElMessage.error(`保存失败：${error.message}`)
  }
}


// 导出BPMN
const handleExportBpmn = async () => {
  if (!bpmnModeler) {
    ElMessage.error('画布未初始化')
    return
  }
  try {
    const { xml } = await bpmnModeler.saveXML({ format: true })
    const blob = new Blob([xml], { type: 'application/xml' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `预案流程_${planForm.planName || '未命名'}_${Date.now()}.bpmn`
    a.click()
    URL.revokeObjectURL(a.href)
    ElMessage.success('BPMN导出成功')
  } catch (e) {
    ElMessage.error(`导出失败：${e.message}`)
    console.error(e)
  }
}

// 导入BPMN
const handleImportBpmn = () => {
  importDialogVisible.value = true
}

// 导入前校验
const beforeImportUpload = (file) => {
  const isXml = file.type === 'text/xml' || file.name.endsWith('.bpmn') || file.name.endsWith('.bpmn20.xml')
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isXml) {
    ElMessage.error('仅支持xml/bpmn文件')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('文件大小不超过2MB')
    return false
  }
  return true
}

// 导入成功
const handleImportSuccess = async (response) => {
  if (response.code === 200) {
    ElMessage.success('BPMN导入成功')
    importDialogVisible.value = false

    // 初始化画布，加载导入的XML
    await initBpmnModeler(response.data.bpmnXml)

    // 导入后自动验证模型，但不自动赋值给表单
    const isValid = await handleValidateBpmn()
    if (isValid) {
      ElMessage.success('BPMN模型验证通过，请点击保存画布以更新到表单')
    } else {
      ElMessage.error('导入的BPMN模型存在错误，请修正后再保存')
      // 验证失败时不清空bpmnXml，让用户有机会修正后再保存
    }
  } else {
    ElMessage.error(response.msg || '导入失败')
  }
}

// 导入失败
const handleImportError = (error) => {
  ElMessage.error(`导入失败：${error.message}`)
  console.error(error)
}

// 预案文档上传前校验
const beforeDocUpload = (file) => {
  const isDoc =
    file.type === 'application/pdf' ||
    file.type === 'application/msword' ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.type === 'application/vnd.ms-excel' ||
    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

  const isLt10M = file.size / 1024 / 1024 < 10

  if (!isDoc) {
    ElMessage.error('仅支持pdf/word/excel文件')
    return false
  }
  if (!isLt10M) {
    ElMessage.error('文件大小不超过10MB')
    return false
  }
  return true
}

// 预案文档上传成功
const handleDocUploadSuccess = (response) => {
  if (response.code === 200) {
    planForm.planDoc = response.data
    ElMessage.success('预案文档上传成功')
  } else {
    ElMessage.error(response.msg || '上传失败')
  }
}

// 预案文档上传失败
const handleDocUploadError = (error) => {
  ElMessage.error(`文档上传失败：${error.message}`)
  console.error(error)
}

// 清空数据
const handleClearAll = async () => {
  try {
    await ElMessageBox.confirm('确定清空所有数据？不可恢复', '确认', {
      type: 'danger'
    })

    // 重置表单
    planForm.id = ''
    planForm.planName = ''
    planForm.planType = ''
    planForm.planDesc = ''
    planForm.cameraIds = []
    planForm.bpmnXml = ''
    planForm.planDoc = ''
    planForm.docFileList = []

    // 重置状态
    selectedCanvasNode.value = null
    selectedTask.value = null
    activeTaskId.value = ''

    // 重置画布
    initBpmnModeler(initEmptyXml)
    ElMessage.success('数据已清空')
  } catch (e) {
    ElMessage.info('已取消清空')
    console.log('清空数据时发生错误:', e)
  }
}

// 加载任务列表
const loadTaskList = async () => {
  try {
    const res = await queryTask()
    if (res.code === 200) {
      const taskList = res.data || []
      const typeGroup = {}

      taskList.forEach(task => {
        if (!typeGroup[task.taskType]) {
          typeGroup[task.taskType] = {
            id: `type_${task.taskType}`,
            taskType: task.taskType,
            isTypeNode: true,
            taskTypeCount: 0,
            children: [],
          }
        }
        typeGroup[task.taskType].children.push(task)
        typeGroup[task.taskType].taskTypeCount = typeGroup[task.taskType].children.length
      })

      taskTreeData.value = Object.values(typeGroup)
    }
  } catch (error) {
    ElMessage.error(`加载任务失败：${error.message}`)
  }
}

// 获取摄像头列表
const loadCameraList = async () => {
  try {
    // 使用枚举中的摄像头列表
    cameraList.value = CAMERA_LIST
  } catch (error) {
    console.error('获取摄像头列表失败:', error)
    // 如果获取失败，使用默认列表
    cameraList.value = CAMERA_LIST
    ElMessage.error('获取摄像头列表失败：' + error.message)
  }
}

// 加载预案详情并回显
const loadPlanDetail = async (id) => {
  try {
    const res = await getPlanDetail(id)
    if (res.code === 200 && res.data) {
      const detail = res.data

      // 1. 回显基础表单信息
      planForm.id = detail.id
      planForm.planName = detail.planName
      planForm.planType = detail.planType
      planForm.planDesc = detail.planDesc
      planForm.cameraIds = detail.cameraIds ? detail.cameraIds.split(';').map(id => Number(id)) : []
      planForm.planDoc = detail.planDoc
      planForm.bpmnXml = detail.bpmnXml

      // 如果有文档URL，构造文件列表以便展示
      if (detail.planDoc) {
        planForm.docFileList = [{
          name: detail.planDoc.split('/').pop() || '预案文档',
          url: detail.planDoc
        }]
      }

      // 2. 初始化画布并加载BPMN XML
      // 如果有保存的XML则加载，否则使用空模板（防止数据损坏导致白屏）
      const xmlToLoad = detail.bpmnXml || initEmptyXml
      await initBpmnModeler(xmlToLoad)

      ElMessage.success('预案详情加载成功')
    } else {
      ElMessage.error(res.msg || '获取预案详情失败')
      // 加载失败时，仍初始化空画布以便用户重新设计
      await initBpmnModeler()
    }
  } catch (error) {
    console.error('加载预案详情异常：', error)
    ElMessage.error(`加载预案详情失败：${error.message}`)
    // 异常时，仍初始化空画布
    await initBpmnModeler()
  }
}

// 监听变化
// 移除可能导致意外重置的监听器
// watch(() => planForm.planName, (newVal, oldVal) => {
//   // 只在新建预案且计划名称发生变化时重置画布
//   if (!planForm.id && newVal !== oldVal) {
//     // 防止意外重置画布，添加确认条件
//     initBpmnModeler(initEmptyXml)
//   }
// }, { immediate: false })

// 页面初始化
onMounted(async () => {
  await loadTaskList()
  await loadCameraList()

  // 如果有planId参数，则加载预案详情并回显
  if (planId.value) {
    await loadPlanDetail(planId.value)
  } else {
    // 只有在没有planId时才初始化空画布，否则loadPlanDetail中会初始化
    await initBpmnModeler()
  }
})

// 页面卸载（解决内存泄漏冲突）
onUnmounted(() => {
  if (bpmnModeler) {
    bpmnModeler.destroy()
    bpmnModeler = null
  }
})
</script>

<style scoped>
.plan-process-container {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 60px);
}

.top-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 10px;
}

.right-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.main-layout {
  display: flex;
  gap: 20px;
  height: calc(100vh - 200px);
}

/* 左侧任务库 */
.task-library-panel {
  width: 320px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.task-library-card {
  flex: 2;
  display: flex;
  flex-direction: column;
}

.node-replace-card {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.node-info {
  line-height: 1.8;
}

.task-tree {
  flex: 1;
  overflow-y: auto;
}

.custom-tree-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.task-code-tag {
  font-size: 12px;
  color: #909399;
  margin-left: 10px;
}

.task-type-tag {
  font-size: 11px;
  color: #409eff;
  margin-left: 5px;
  background: #ecf5ff;
  padding: 0 4px;
  border-radius: 2px;
}

/* 子节点样式（仅展示） */
.child-node {
  opacity: 0.7;
  color: #999;
  font-size: 13px;
  margin-left: 20px;
}

/* 中间画布（解决样式冲突） */
.flowable-canvas-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.canvas-card {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.canvas-toolbar {
  margin-bottom: 10px;
  display: flex;
  gap: 10px;
}

/* 画布容器（解决大小/层级冲突） */
.canvas-container {
  width: 100%;
  height: calc(100vh - 300px);
  border: 1px solid #e6e6e6;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
  z-index: 1; /* 解决层级冲突 */
}

/* 右侧信息面板 */
.plan-info-panel {
  width: 350px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.info-card {
  flex: 3;
  display: flex;
  flex-direction: column;
  overflow: auto;
}

.deploy-record-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.upload-demo {
  margin-top: 10px;
}

/* 解决BPMN原生样式冲突 */
:deep(.djs-palette) {
  z-index: 2; /* 图形栏层级 */
  display: block !important;
}
:deep(.djs-context-pad) {
  z-index: 1000 !important; /* 右键菜单层级 */
  display: block !important;
  pointer-events: auto !important;
}
:deep(.djs-element) {
  cursor: pointer;
  pointer-events: auto !important;
}
/* 确保ContextPad正常显示 */
:deep(.djs-context-pad) {
  z-index: 1000 !important;
  display: block !important;
}
/* 确保画布拖拽功能正常 */
:deep(.djs-drag-group) {
  pointer-events: auto !important;
}
/* 确保元素选择功能正常 */
:deep(.djs-selection) {
  pointer-events: auto !important;
}
</style>
