<template>
  <el-dialog :model-value="visible" @update:model-value="handleClose" width="95%" top="5vh" custom-class="plan-detail-dialog">
    <div class="dialog-container">
      <!-- 左侧：流程展示区域 -->
      <div class="left-panel">
        <!-- 顶部标题栏 -->
        <div class="panel-header">
          <h3 class="plan-title">{{ currentPlanData.planName || '预案详情' }}</h3>
          <el-tag :type="getPlanStatusType(currentPlanData.planStatus)" size="large">
            {{ getPlanStatusLabel(currentPlanData.planStatus) }}
          </el-tag>
        </div>

        <!-- BPMN流程图容器 -->
        <div class="bpmn-wrapper">
          <div
            ref="bpmnContainerRef"
            class="bpmn-container"
          ></div>
          <div v-if="!bpmnXml" class="text-gray" style="text-align: center; padding: 20px">
            该预案未配置流程模板
          </div>
        </div>

        <!-- 底部任务执行区域（仅在已启动时显示） -->
        <div v-if="currentPlanData.planStatus === 2" class="task-execution-section">
          <!-- 第一行：当前执行任务信息 -->
          <div class="task-info-row">
            <span class="task-label">当前执行任务：</span>
            <span class="task-name">{{ currentTask?.taskName || '任务已结束' }}</span>
          </div>

          <!-- 第二行：补充说明和确认按钮 -->
          <div class="task-action-row" v-if="currentTask">
            <el-input
              v-model="executeNote "
              type="textarea"
              :rows="2"
              placeholder="请输入情况补充说明..."
              class="task-description-input"
            />
            <el-button
              type="primary"
              size="large"
              @click="completeCurrentTask"
              :loading="completing"
              :disabled="completing || !currentTask"
              class="confirm-btn"
            >
              确认，下一步
            </el-button>
          </div>
          <div class="task-completed-message" v-else>
            <el-alert
              title="流程已全部执行完成"
              type="success"
              :closable="false"
              center
            />
          </div>
        </div>
      </div>

      <!-- 右侧：操作面板 -->
      <div class="right-panel">
        <!-- 运行时间显示 - 临时强制显示用于调试 -->
        <div class="time-display">
          <div class="time-value">{{ formattedRuntime }}</div>
          <div class="time-label">预案累计运行时间</div>
        </div>


        <!-- 操作按钮组 -->
        <div class="action-buttons">
          <!-- 启动按钮 - 仅当预案已发布且未启动时可用 -->
          <el-button
            type="success"
            size="large"
            :disabled="!(currentPlanData.planStatus === 1)"
            @click="startPlanFunc(originalPlanId)"
          >
            开始预案
          </el-button>

          <!-- 终止按钮 - 仅在预案进行中时可用 -->
          <el-button
            type="danger"
            size="large"
            :disabled="!(currentPlanData.planStatus === 2)"
            @click="stopPlanFunc(originalPlanId)"
          >
            终止预案
          </el-button>

          <!-- 实时监控按钮 - 始终可用 -->
          <el-button
            type="primary"
            size="large"
            @click="viewCamera(currentPlanData)"
          >
            实时监控
          </el-button>

          <!-- 查看预案文档 - 始终可用 -->
          <el-button
            type="primary"
            size="large"
            @click="viewDocument"
          >
            查看预案文档
          </el-button>
        </div>

        <!-- 返回列表按钮 - 固定在底部，尺寸较小 -->
        <div class="back-button-wrapper">
          <el-button
            size="default"
            @click="handleClose(false)"
          >
            返回列表
          </el-button>
        </div>
      </div>
    </div>
  </el-dialog>

  <!-- 节点任务详情弹窗 -->
  <el-dialog
    v-model="nodeDetailDialogVisible"
    :title="selectedNodeInfo.taskName || '任务列表'"
    width="700px"
    top="20vh"
    append-to-body
    @close="handleNodeDialogClose"
  >
    <div class="task-list-container">
      <el-table :data="selectedNodeInfo.taskList" border stripe style="width: 100%">
        <el-table-column prop="taskCode" label="任务编码" width="150" />
        <el-table-column prop="taskName" label="任务名称" min-width="200" />
        <el-table-column prop="isSkippable" label="是否跳过" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isSkippable ? 'warning' : 'info'" size="small">
              {{ row.isSkippable ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>
    <template #footer>
      <el-button @click="handleNodeDialogClose">关闭</el-button>
    </template>
  </el-dialog>

  <!-- 摄像头监控弹窗 -->
  <el-dialog v-model="cameraDialogVisible" title="实时监控" width="800px">
    <div class="camera-container">
      <el-select v-model="currentCameraId" style="margin-bottom: 20px" @change="switchCamera">
        <el-option
          v-for="camera in currentPlanCameras"
          :key="camera.id"
          :label="camera.cameraName"
          :value="camera.id"
        ></el-option>
      </el-select>
      <video id="cameraVideo" width="100%" height="400px" autoplay></video>
    </div>
  </el-dialog>

  <!-- 文档预览弹窗 -->
  <el-dialog
    v-model="documentDialogVisible"
    title="预案文档预览"
    width="80%"
    top="5vh"
    @opened="onDocumentDialogOpened"
  >
    <div class="document-preview-container" :style="{ height: previewHeight }">
      <iframe
        v-if="documentPreviewUrl && !showExternalLinkWarning"
        ref="documentFrameRef"
        :src="documentPreviewUrl"
        width="100%"
        height="100%"
        frameborder="0"
        style="border-radius: 4px;"
        @load="onDocumentFrameLoad"
        @error="onDocumentFrameError"
      ></iframe>
      <div v-else-if="showExternalLinkWarning" class="external-link-warning">
        <p>此文档无法在弹窗中预览，因为它不允许被嵌入到iframe中。</p>
        <el-button type="primary" @click="openInNewTab">在新标签页中打开</el-button>
      </div>
      <div v-else class="no-document-tip">
        暂无文档内容
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, onUnmounted, nextTick, watch, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getCurrentTask,
  startPlan as startProcessPlan,
  completeTask,
  stopPlan as stopProcessPlan
} from './planList.route'

import { getPlanDetail } from '../planEdit/planEdit.route'

// 引入任务配置相关接口
import { queryByType } from '../taskConfig/taskConfig.route'

// 引入BPMN渲染相关依赖
import BpmnJS from 'bpmn-js/lib/Viewer'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css'
import 'bpmn-js/dist/assets/diagram-js.css'

// 引入枚举配置
import {
  getPlanStatusLabel,
  getPlanStatusType
} from '@/config/planEnums'

// 接收props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  planData: {
    type: Object,
    default: () => ({})
  },
  cameraList: {
    type: Array,
    default: () => []
  }
})

// 定义emit事件
const emit = defineEmits(['update:visible', 'update:planData', 'close'])

// 本地响应式数据副本，用于存储最新的预案数据
const currentPlanData = ref({})

// 保存原始的planId，确保在所有操作中都能使用正确的planId
const originalPlanId = ref('')

// 状态定义
const taskList = ref([])
const originalTaskList = ref([])
const isParallelPhase = ref(false)
const cameraDialogVisible = ref(false)
const documentDialogVisible = ref(false)  // 文档预览弹窗
const nodeDetailDialogVisible = ref(false)  // 节点详情弹窗
const selectedNodeInfo = ref({ taskList: [] })  // 选中的节点信息，包含任务列表
const documentPreviewUrl = ref('')        // 文档预览URL
const previewHeight = ref('600px')        // 预览区域高度
const showExternalLinkWarning = ref(false) // 是否显示外部链接警告
const documentFrameRef = ref(null)         // 文档iframe引用
const currentCameraId = ref('')
const currentPlanCameras = ref([])
const bpmnXml = ref('')
const bpmnContainerRef = ref(null)
let bpmnViewer = null
let planType = ref('')
const currentHighlightedElementIds = ref([])
const completing = ref(false)
const executeNote = ref('') // 任务补充说明
const runtimeUpdateTimer = ref(null) // 运行时间更新定时器
const currentTime = ref(Date.now()) // 当前时间，用于计算运行时长

// 计算当前执行的任务（第一个未完成的任务）
const currentTask = computed(() => {
  if (!taskList.value || taskList.value.length === 0) return null
  // 返回第一个未完成的任务
  return taskList.value.find(task => !task.completed) || taskList.value[0]
})

// 计算运行时间 - 基于relCreateTime和当前时间的差值
const runtimeInMilliseconds = computed(() => {
  // 使用后端返回的 relCreateTime 字段（预案关联创建时间/启动时间）
  const startTimeValue = currentPlanData.value.relCreateTime

  if (!startTimeValue) {
    return 0
  }

  const startTime = new Date(startTimeValue).getTime()

  if (isNaN(startTime)) {
    return 0
  }

  const now = currentTime.value
  const diff = now - startTime

  // 确保返回的是有效的数值
  return Math.max(0, diff)
})

// 格式化运行时间为 HH:MM:SS
const formattedRuntime = computed(() => {
  // 如果预案是未发布状态，直接返回 00:00:00
  if (currentPlanData.value.planStatus === 0) {
    return '00:00:00'
  }

  const totalSeconds = Math.floor(runtimeInMilliseconds.value / 1000)

  if (totalSeconds <= 0) return '00:00:00'

  const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0')
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0')
  const seconds = (totalSeconds % 60).toString().padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
})

// 查看预案文档
const viewDocument = () => {
  if (currentPlanData.value.planDoc) {
    // 根据文档URL类型决定预览方式
    let docUrl = currentPlanData.value.planDoc

    // 如果planDoc是对象，尝试从中提取URL
    if (typeof currentPlanData.value.planDoc === 'object' && currentPlanData.value.planDoc.url) {
      docUrl = currentPlanData.value.planDoc.url
    } else if (typeof currentPlanData.value.planDoc === 'string') {
      // 如果planDoc本身就是字符串，直接使用
      docUrl = currentPlanData.value.planDoc
    } else {
      ElMessage.warning('文档URL格式不正确')
      return
    }

    // 如果文档URL是完整路径，直接使用；如果是相对路径，加上基础URL
    if (typeof docUrl === 'string') {
      // 检查是否为有效的URL
      if (docUrl.startsWith('http') || docUrl.startsWith('/')) {
        // 设置预览URL
        documentPreviewUrl.value = docUrl

        // 计算预览区域高度（根据屏幕大小调整）
        const windowHeight = window.innerHeight
        previewHeight.value = Math.min(windowHeight * 0.7, 800) + 'px'

        // 显示文档预览弹窗
        documentDialogVisible.value = true
      } else {
        // 如果不是有效URL，显示警告
        ElMessage.warning('文档URL格式不正确')
        return
      }
    } else {
      ElMessage.warning('文档URL格式不正确')
      return
    }
  } else {
    ElMessage.warning('该预案未上传文档')
  }
}

// 检查iframe是否可访问
const checkIframeAccessibility = () => {
  const iframe = document.querySelector('.document-preview-container iframe')
  if (iframe) {
    try {
      // 尝试访问iframe内容，如果失败则说明受到安全策略限制
      if (iframe.contentDocument == null) {
        // 无法访问内容，说明iframe被安全策略限制
        showExternalLinkWarning.value = true
      }
    } catch {
      // 访问iframe内容时出错，说明受到安全策略限制
      showExternalLinkWarning.value = true
    }
  }
}

// 处理iframe加载失败的情况
// const handleIframeLoadError = (docUrl) => {
//   showExternalLinkWarning.value = true
// }

// 在弹窗打开后检查iframe是否能正常加载
const onDocumentDialogOpened = () => {
  // 重置警告状态
  showExternalLinkWarning.value = false

  // 延迟检查iframe加载情况
  setTimeout(() => {
    checkIframeAccessibility()
  }, 1000)
}

// iframe加载完成事件
const onDocumentFrameLoad = () => {
  // 检查iframe是否可以正常访问
  checkIframeAccessibility()
}

// iframe加载错误事件
const onDocumentFrameError = () => {
  // iframe加载失败，显示警告
  showExternalLinkWarning.value = true
}

// 在新标签页打开文档
const openInNewTab = () => {
  window.open(documentPreviewUrl.value, '_blank')
  // 关闭弹窗
  documentDialogVisible.value = false
}

// 加载BPMN XML - 支持传入已获取的预案数据，避免重复调用接口
const loadBpmnXml = async (planId, planData = null) => {
  try {
    console.log('加载BPMN XML，planId:', planId)

    if (!planId) {
      console.error('planId 不能为空')
      ElMessage.warning('预案ID不能为空')
      bpmnXml.value = ''
      return
    }

    // 如果传入了planData，直接使用；否则调用接口获取
    let res
    if (planData) {
      console.log('使用传入的预案数据')
      res = { code: 200, data: planData }
    } else {
      console.log('调用接口获取预案数据')
      res = await getPlanDetail(planId)
    }

    console.log('BPMN接口响应:', res)

    if (res.code === 200 && res.data) {
      let xml = res.data.bpmnXml
      planType.value = res.data.planType

      // 打印完整的预案数据，查看所有字段
      console.log('=== 后端返回的完整预案数据 ===')
      console.log(res.data)
      console.log('所有字段名:', Object.keys(res.data))
      console.log('==============================')

      if (!xml || typeof xml !== 'string' || xml.trim() === '') {
        console.warn('BPMN XML数据为空或格式不正确:', xml)
        ElMessage.warning('该预案未配置流程模板')
        bpmnXml.value = ''
        return
      }

      xml = xml.replace(/\\n/g, '\n').replace(/\\"/g, '"')

      if (!xml.trim().startsWith('<?xml') && !xml.trim().includes('<bpmn:') && !xml.trim().includes('<definitions')) {
        console.error('BPMN XML格式不正确:', xml.substring(0, 100) + '...')
        ElMessage.error('流程模板格式错误')
        bpmnXml.value = ''
        return
      }

      bpmnXml.value = xml
      console.log('BPMN XML加载成功，处理后长度:', bpmnXml.value.length)
    } else {
      console.warn('接口返回错误:', res)
      ElMessage.warning('加载流程模板失败：' + (res.msg || '未知错误'))
      bpmnXml.value = ''
    }
  } catch (e) {
    console.error('加载BPMN XML时发生错误:', e)
    console.error('错误详情:', e.message, e.stack)
    ElMessage.warning('加载流程模板失败：' + (e.message || e))
    bpmnXml.value = ''
  }
}

// 渲染BPMN流程图
const renderBpmnDiagram = async (retryCount = 0) => {
  console.log('开始渲染BPMN流程图,重试次数:', retryCount)

  if (bpmnViewer) {
    bpmnViewer.destroy()
    bpmnViewer = null
  }

  await nextTick()

  const container = bpmnContainerRef.value
  if (!container) {
    if (retryCount < 3) {
      setTimeout(() => renderBpmnDiagram(retryCount + 1), 300)
      return
    }
    ElMessage.error('BPMN渲染容器未找到')
    return
  }

  if (!bpmnXml.value) {
    ElMessage.warning('BPMN XML数据为空')
    return
  }

  bpmnViewer = new BpmnJS({
    container: container,
    additionalModules: [],
    moddleExtensions: {}
  })

  try {
    const result = await bpmnViewer.importXML(bpmnXml.value)
    const { warnings } = result
    console.log('BPMN渲染成功,警告:', warnings)

    const canvas = bpmnViewer.get('canvas')
    canvas.zoom('fit-viewport')

    // 注册节点点击事件
    registerNodeClickHandler()

    // 渲染完成后自动处理高亮 - 只要有任务列表就高亮
    console.log('渲染完成，准备高亮流程节点，当前任务列表:', taskList.value)
    if (taskList.value.length > 0) {
      const elementIds = taskList.value
        .filter(task => task.bpmnElementId)
        .map(task => task.bpmnElementId)
      highlightBpmnElements(elementIds)
    }
  } catch (err) {
    console.error('BPMN渲染失败:', err)
    ElMessage.error('流程渲染失败：' + err.message)
  }
}

// 注册节点点击事件处理器
const registerNodeClickHandler = () => {
  if (!bpmnViewer) return

  const eventBus = bpmnViewer.get('eventBus')

  // 监听元素点击事件
  eventBus.on('element.click', async function(event) {
    const element = event.element
    console.log('点击了BPMN元素:', element)

    // 只处理用户任务节点的点击
    if (element.type === 'bpmn:UserTask') {
      // 取消之前选中的文字高亮
      cancelSelectedNodes()

      // 高亮选中节点的文字（添加选中样式）
      highlightSingleNode(element.id)

      try {
        // 从BPMN节点中获取任务类型和节点名称
        const taskType = element.businessObject?.name || element.id
        const nodeName = element.businessObject?.name || element.id

        // 调用接口获取任务列表
        const res = await queryByType(taskType)

        if (res.code === 200 && res.data) {
          // 设置任务列表数据和节点名称
          selectedNodeInfo.value = {
            taskName: nodeName,
            taskList: res.data.map(item => ({
              taskCode: item.taskCode,
              taskName: item.taskName,
              isSkippable: item.isSkippable !== undefined ? item.isSkippable : false
            }))
          }

          // 显示任务详情弹窗
          nodeDetailDialogVisible.value = true
        } else {
          ElMessage.error('获取任务列表失败')
        }
      } catch (error) {
        console.error('获取任务列表失败:', error)
        ElMessage.error('获取任务列表失败')
      }
    }
  })
}

// 高亮单个节点的文字（用于选中效果）
const highlightSingleNode = (elementId) => {
  if (!bpmnViewer) return

  const elementRegistry = bpmnViewer.get('elementRegistry')
  const canvas = bpmnViewer.get('canvas')

  const element = elementRegistry.get(elementId)
  if (element) {
    // 添加选中标记，只对文字应用样式
    canvas.addMarker(element.id, 'bpmn-text-selected')
  }
}

// 取消节点文字选中状态
const cancelSelectedNodes = () => {
  if (!bpmnViewer) return

  const elementRegistry = bpmnViewer.get('elementRegistry')
  const canvas = bpmnViewer.get('canvas')

  // 获取所有元素，移除文字选中标记，保留任务高亮标记
  const allElements = elementRegistry.getAll();
  allElements.forEach(element => {
    canvas.removeMarker(element.id, 'bpmn-text-selected');
  });
}

// 查看摄像头
const viewCamera = (plan) => {
  if (!plan.cameraIds) {
    ElMessage.warning('该预案未关联任何摄像头')
    return
  }
  const cameraIds = plan.cameraIds.split('|')
  currentPlanCameras.value = props.cameraList.filter((camera) =>
    cameraIds.includes(camera.id.toString()),
  )
  if (currentPlanCameras.value.length > 0) {
    currentCameraId.value = currentPlanCameras.value[0].id
    cameraDialogVisible.value = true
    switchCamera()
  }
}

// 切换摄像头
const switchCamera = () => {
  const camera = currentPlanCameras.value.find((item) => item.id === currentCameraId.value)
  if (camera) {
    const video = document.getElementById('cameraVideo')
    video.src = camera.cameraUrl
    video.play().catch(err => {
      console.error('视频播放失败:', err)
      ElMessage.error('摄像头流播放失败：' + err.message)
    })
  }
}

// 处理节点详情弹窗关闭
const handleNodeDialogClose = () => {
  // 关闭弹窗
  nodeDetailDialogVisible.value = false

  // 清除选中的文字高亮
  cancelSelectedNodes()

  // 重置选中的节点信息
  selectedNodeInfo.value = { taskList: [] }
}

// 查询当前待办任务
const getCurrentTaskFunc = async (planId) => {
  try {
    const res = await getCurrentTask(planId)
    if (res.code === 200) {
      let taskData = res.data || {}
      let tasks = Array.isArray(taskData) ? taskData : [taskData]

      originalTaskList.value = tasks
      console.log('任务列表（原始）:', originalTaskList.value)

      isParallelPhase.value = tasks.length > 1
      if (isParallelPhase.value) {
        console.log('当前处于并行任务阶段，需要完成所有并行任务后才能继续')
      }

      let processedTasks = tasks
      if (!isParallelPhase.value && tasks.length > 1) {
        const uniqueTasks = []
        const taskKeys = new Set()
        tasks.forEach(task => {
          const taskKey = task.taskName || task.bpmnElementId || task.id
          if (taskKey && !taskKeys.has(taskKey)) {
            taskKeys.add(taskKey)
            uniqueTasks.push(task)
          }
        })
        processedTasks = uniqueTasks
        console.log('非并行任务阶段，去重后的任务列表:', processedTasks)
      }

      taskList.value = processedTasks
      console.log('任务列表（处理后）:', processedTasks)

      if (isParallelPhase.value) {
        const taskNames = new Set()
        tasks.forEach(task => {
          taskNames.add(task.taskName)
        })

        if (taskNames.size === 1) {
          console.log('所有任务都是并行任务，用户只能完成这些任务')
        }
      }
    }
  } catch (e) {
    ElMessage.error('获取任务列表失败：' + (e.message || e))
  }
}

// 启动预案
const startPlanFunc = async (planId) => {
  try {
    await ElMessageBox.confirm('确定要启动该预案吗？', '提示', {
      type: 'warning',
    })
    const res = await startProcessPlan(planId)
    if (res.code === 200) {
      ElMessage.success('预案启动成功')
      console.log('启动成功，开始刷新数据...')

      // 等待一小段时间，确保流程实例已经创建完成
      await new Promise(resolve => setTimeout(resolve, 800))

      // 获取最新的预案数据
      const detailRes = await getPlanDetail(planId)
      if (detailRes.code === 200 && detailRes.data) {
        const latestPlanData = detailRes.data

        // 更新本地副本
        currentPlanData.value = { ...latestPlanData }

        // 通知父组件更新为最新数据
        emit('update:planData', latestPlanData)
        console.log('预案数据已更新为最新:', latestPlanData)

        // 使用planId获取任务列表
        await getCurrentTaskFunc(planId)
        console.log('任务列表已更新:', taskList.value)

        // 重新加载BPMN XML（传入已获取的数据，避免重复调用接口）
        await loadBpmnXml(planId, latestPlanData)

        // 等待DOM更新，然后重新渲染BPMN流程图（包含高亮逻辑）
        await nextTick()

        // 渲染BPMN图并应用高亮
        await renderBpmnDiagram()

        console.log('启动预案流程完成，BPMN图已渲染并高亮')
      } else {
        ElMessage.error('获取最新预案数据失败')
      }
    } else {
      ElMessage.error(res.msg)
    }
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.info('取消启动')
    }
  }
}

// 终止预案
const stopPlanFunc = async (planId) => {
  try {
    await ElMessageBox.confirm('确定要终止该预案吗？', '提示', {
      type: 'warning',
    })
    const res = await stopProcessPlan(planId)
    if (res.code === 200) {
      ElMessage.success('预案终止成功')

      // 重新调用getPlanDetail接口获取最新的预案数据 - 使用函数参数planId
      const detailRes = await getPlanDetail(planId)
      if (detailRes.code === 200 && detailRes.data) {
        const latestPlanData = detailRes.data

        // 更新本地副本，使UI能够即时响应
        currentPlanData.value = { ...latestPlanData }

        // 通知父组件更新为最新数据
        emit('update:planData', latestPlanData)
        console.log('预案数据已更新为最新:', latestPlanData)
      } else {
        ElMessage.error('获取最新预案数据失败')

        // 如果获取最新数据失败，使用本地更新的数据
        currentPlanData.value = {
          ...currentPlanData.value,
          flowStatus: 0,
        }

        emit('update:planData', currentPlanData.value)
      }

      taskList.value = []
      cancelBpmnHighlight()
    } else {
      ElMessage.error(res.msg)
    }
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.info('取消终止')
    }
  }
}

// 多节点高亮
const highlightBpmnElements = (elementIds) => {
  if (!bpmnViewer || !elementIds || elementIds.length === 0) return

  cancelBpmnHighlight()

  const elementRegistry = bpmnViewer.get('elementRegistry')
  const canvas = bpmnViewer.get('canvas')

  elementIds.forEach(elementId => {
    const element = elementRegistry.get(elementId)
    if (!element) {
      console.warn(`未找到BPMN元素：${elementId}`)
      return
    }
    canvas.addMarker(element.id, 'bpmn-highlight')
    currentHighlightedElementIds.value.push(element.id)
  })

  if (elementIds.length > 0) {
    const firstElement = elementRegistry.get(elementIds[0])
    if (firstElement) {
      canvas.zoom('fit-viewport', firstElement)
    }
  }
}

// 取消所有节点的高亮
const cancelBpmnHighlight = () => {
  if (!bpmnViewer || currentHighlightedElementIds.value.length === 0) return

  const elementRegistry = bpmnViewer.get('elementRegistry')
  const canvas = bpmnViewer.get('canvas')

  currentHighlightedElementIds.value.forEach(elementId => {
    const element = elementRegistry.get(elementId)
    if (element) {
      canvas.removeMarker(element.id, 'bpmn-highlight')
    }
  })

  currentHighlightedElementIds.value = []
}

// 完成当前步骤
const completeCurrentTask = async () => {
  if (!currentTask.value) {
    ElMessage.warning('当前没有可执行的任务')
    return
  }

  try {
    completing.value = true
    console.log('完成任务:', currentTask.value.taskId, '补充说明:', executeNote.value)

    const res = await completeTask(currentTask.value.taskId, executeNote.value)

    if (res.code === 200) {
      const msg = res.data?.msg || '操作成功'
      const nextTask = res.data?.nextTaskName || '任务已完成'
      ElMessage.success(`${msg}：${nextTask}`)
      executeNote.value = '' // 清空补充说明

      // 等待一小段时间，确保后端任务状态已更新
      await new Promise(resolve => setTimeout(resolve, 300))

      // 重新加载任务列表 - 使用originalPlanId确保参数始终有效
      if (!originalPlanId.value) {
        console.error('无法获取originalPlanId')
        ElMessage.error('获取预案ID失败')
        return
      }

      await getCurrentTaskFunc(originalPlanId.value)
      console.log('完成任务后，新的任务列表:', taskList.value)

      // 检查任务列表是否为空，如果为空表示流程已完成
      if (taskList.value.length === 0) {
        console.log('所有任务已完成，流程结束')
        ElMessage.info('该预案流程已全部执行完成')

        // 更新本地计划数据，标记流程为已完成
        currentPlanData.value = {
          ...currentPlanData.value,
          flowStatus: 0 // 标记为已完成状态
        }

        // 通知父组件更新
        emit('update:planData', currentPlanData.value)
      }

      // 重新渲染BPMN流程图以更新高亮状态
      await renderBpmnDiagram()
    } else {
      ElMessage.error(res.msg || '完成任务失败')
    }
  } catch (error) {
    console.error('完成任务时发生错误:', error)
    ElMessage.error('完成任务失败：' + error.message)
  } finally {
    completing.value = false
  }
}

// 处理弹窗关闭
const handleClose = (val = false) => {
  emit('update:visible', val)
  // emit('close')
}

// 监听弹窗关闭，销毁BPMN实例
watch(() => props.visible, async (newVal) => {
  if (!newVal) {
    if (bpmnViewer) {
      bpmnViewer.destroy()
      bpmnViewer = null
      cancelBpmnHighlight()
      bpmnXml.value = ''
      taskList.value = []
    }
  }
})

// 监听planData变化，加载BPMN XML和任务列表
watch(() => props.planData, async (newPlanData) => {
  if (newPlanData && newPlanData.planId) {
    // 保存原始的planId，确保在所有操作中都能使用
    originalPlanId.value = newPlanData.planId

    // 同步到本地副本
    currentPlanData.value = { ...newPlanData }

    await loadBpmnXml(newPlanData.planId)
    await getCurrentTaskFunc(newPlanData.planId)
    await nextTick()
    if (bpmnXml.value) {
      await renderBpmnDiagram()
    }
  }
}, { immediate: true })

// 启动运行时间更新定时器
const startRuntimeTimer = () => {
  // 清除旧定时器
  if (runtimeUpdateTimer.value) {
    clearInterval(runtimeUpdateTimer.value)
  }

  // 初始化当前时间
  currentTime.value = Date.now()

  // 每秒更新一次当前时间，触发运行时间重新计算
  runtimeUpdateTimer.value = setInterval(() => {
    currentTime.value = Date.now()
  }, 1000)
}

// 停止运行时间更新定时器
const stopRuntimeTimer = () => {
  if (runtimeUpdateTimer.value) {
    clearInterval(runtimeUpdateTimer.value)
    runtimeUpdateTimer.value = null
  }
}

// 立即启动定时器，因为运行时间总是需要显示（根据需求描述或现有模板结构）
startRuntimeTimer()

// 组件卸载时清理定时器
onUnmounted(() => {
  stopRuntimeTimer()
  if (bpmnViewer) {
    bpmnViewer.destroy()
    bpmnViewer = null
  }
})
</script>

<style scoped>
.dialog-container {
  display: flex;
  gap: 20px;
  height: calc(90vh - 100px);
}

.left-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.plan-title {
  margin: 0;
  font-size: 20px;
  font-weight: bold;
}

.bpmn-wrapper {
  flex: 1;
  position: relative;
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  margin: 15px;
  border-radius: 4px;
  overflow: hidden;
}

.bpmn-container {
  width: 100%;
  height: 100%;
}

.task-execution-section {
  margin-top: 15px;
  padding: 10px 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.25);
}

.task-info-row {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  font-size: 14px;
  color: white;
}

.task-label {
  font-weight: bold;
  white-space: nowrap;
  margin-right: 8px;
  opacity: 0.9;
}

.task-name {
  font-weight: 500;
  flex: 1;
  padding: 6px 10px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  backdrop-filter: blur(10px);
}

.task-action-row {
  display: flex;
  gap: 12px;
  align-items: stretch;
}

.task-description-input {
  flex: 1;
}

.task-description-input :deep(.el-textarea__inner) {
  background-color: rgba(255, 255, 255, 0.95);
  border: none;
  border-radius: 4px;
  resize: none;
  padding: 4px 8px;
  font-size: 12px;
  min-height: 40px !important;
}

.confirm-btn {
  height: auto !important;
  min-width: 100px;
  padding: 0 20px;
  font-weight: bold;
  font-size: 14px;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.confirm-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.right-panel {
  width: 380px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.time-display {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  margin-bottom: 20px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.time-value {
  font-size: 36px;
  font-weight: bold;
  letter-spacing: 2px;
}

.time-label {
  font-size: 14px;
  opacity: 0.9;
  margin-top: 5px;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action-buttons .el-button {
  width: 100% !important;
  height: 50px !important;
  font-size: 16px !important;
  margin: 0 !important;
  padding: 0 20px !important;
  box-sizing: border-box !important;
  border-radius: 4px !important;
}

.back-button-wrapper {
  margin-top: auto;
  padding-top: 15px;
}

.back-button-wrapper .el-button {
  width: 100% !important;
  height: 40px !important;
  font-size: 14px !important;
  margin: 0 !important;
  padding: 0 15px !important;
  box-sizing: border-box !important;
  border-radius: 4px !important;
}

.info-card {
  flex: 1;
  overflow-y: auto;
}

.card-header {
  font-weight: bold;
  font-size: 14px;
}

.camera-container {
  text-align: center;
}

.camera-video {
  width: 100%;
  height: 400px;
  background-color: #000;
  border-radius: 4px;
}

.no-camera-tip {
  color: #999;
  font-size: 14px;
}

.document-preview-container {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
  background-color: #fff;
}

.external-link-warning {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  padding: 20px;
  text-align: center;
  color: #606266;
}

.external-link-warning p {
  margin-bottom: 20px;
  line-height: 1.5;
}

.no-document-tip {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #999;
  font-size: 14px;
}

.text-gray {
  color: #909399;
}

/* BPMN元素高亮样式 */
:deep(.bpmn-highlight .djs-visual > rect) {
  stroke: #6cf56c !important;
  stroke-width: 3px !important;
  fill: rgba(108, 245, 161, 0.1) !important;
}

:deep(.bpmn-highlight .djs-visual > path) {
  stroke: #6cf56c !important;
  stroke-width: 3px !important;
}

/* BPMN元素文字选中样式（点击节点） - 只高亮文字，不影响外框 */
:deep(.bpmn-text-selected .djs-label) {
  color: #409eff !important;
  font-weight: bold !important;
  text-shadow: 0 0 3px rgba(64, 158, 255, 0.5) !important;
}

:deep(.bpmn-text-selected .djs-label tspan) {
  fill: #409eff !important;
  font-weight: bold !important;
}

/* 节点详情弹窗样式 */
.node-detail-content {
  padding: 10px 0;
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-item {
  display: flex;
  align-items: flex-start;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-label {
  font-weight: 600;
  color: #303133;
  min-width: 100px;
  flex-shrink: 0;
}

.detail-value {
  color: #606266;
  flex: 1;
  word-break: break-word;
}

/* 任务列表容器样式 */
.task-list-container {
  padding: 10px 0;
}

/* 对话框自定义样式 */
:deep(.plan-detail-dialog) {
  margin: 0;
  border-radius: 8px;
  overflow: hidden;
}

:deep(.plan-detail-dialog .el-dialog__header) {
  padding: 0;
  margin: 0;
}

:deep(.plan-detail-dialog .el-dialog__body) {
  padding: 20px;
  height: calc(90vh - 100px);
  overflow: hidden;
}

:deep(.plan-detail-dialog .el-dialog__footer) {
  display: none;
}
</style>
