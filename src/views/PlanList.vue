<template>
  <div class="plan-list">
    <el-page-header content="预案列表"></el-page-header>
    <el-card>
      <el-button type="primary" @click="$router.push('/plan/edit')">新增预案</el-button>
      <el-table :data="planList" border style="margin-top: 20px">
        <el-table-column prop="planType" label="预案类型">
          <template #default="scope">
            <el-tag v-if="scope.row.planType === 'FIRE'">消防预案</el-tag>
            <el-tag v-else-if="scope.row.planType === 'FLOOD'">防汛预案</el-tag>
            <el-tag v-else-if="scope.row.planType === 'EARTHQUAKE'">地震预案</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="planName" label="预案名称"></el-table-column>
        <el-table-column prop="planDesc" label="预案说明"></el-table-column>
        <el-table-column label="关联摄像头">
          <template #default="scope">
            <span v-if="scope.row.cameraIds">{{ getCameraNames(scope.row.cameraIds) }}</span>
            <span v-else class="text-gray">无</span>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间"></el-table-column>
        <el-table-column label="操作">
          <template #default="scope">
            <el-button type="text" @click="viewPlan(scope.row)">查看</el-button>
            <el-button type="text" @click="deployPlan(scope.row.planId)">部署</el-button>
            <el-button type="text" @click="startPlan(scope.row.planId)">启动</el-button>
            <el-button
              type="text"
              danger
              @click="stopPlan(scope.row.processInstId)"
              v-if="scope.row.processInstId"
              >终止</el-button
            >
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 预案详情弹窗 -->
    <el-dialog v-model="viewDialogVisible" title="预案详情" width="800px" @opened="onDialogOpened">
      <el-tabs v-model="viewActiveTab" @tab-change="handleTabChange">
        <el-tab-pane label="基础信息" name="view-base">
          <el-descriptions :column="2" :data="currentPlan">
            <el-descriptions-item label="预案类型">
              <el-tag v-if="currentPlan.planType === 'FIRE'">消防预案</el-tag>
              <el-tag v-else-if="currentPlan.planType === 'FLOOD'">防汛预案</el-tag>
              <el-tag v-else-if="currentPlan.planType === 'EARTHQUAKE'">地震预案</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="预案名称">{{ currentPlan.planName }}</el-descriptions-item>
            <el-descriptions-item label="预案说明">{{ currentPlan.planDesc }}</el-descriptions-item>
            <el-descriptions-item label="关联摄像头">
              <span v-if="currentPlan.cameraIds">{{ getCameraNames(currentPlan.cameraIds) }}</span>
              <span v-else>无</span>
            </el-descriptions-item>
            <el-descriptions-item label="预案文档">
              <el-link v-if="currentPlan.docUrl" :href="currentPlan.docUrl" target="_blank"
                >点击下载</el-link
              >
              <span v-else>无</span>
            </el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>
        <el-tab-pane label="流程执行" name="view-process">
          <!-- 1. 已启动预案：显示任务列表 + 流程状态提示 -->
          <div v-if="currentPlan.procInstId && currentPlan.flowStatus === 1">
            <el-alert title="当前预案已启动，正在执行中" type="info" :closable="false"></el-alert>
            <el-card style="margin-top: 20px; margin-bottom: 20px">
              <el-table :data="taskList" border>
                <el-table-column prop="taskName" label="当前步骤"></el-table-column>
                <!-- <el-table-column prop="createTime" label="创建时间"></el-table-column> -->
                <el-table-column label="操作">
                  <template #default="scope">
                    <el-button
                      type="primary"
                      @click="completeStep(scope.row.taskId)"
                      :loading="completing"
                      :disabled="completing"
                      >
                      完成步骤
                    </el-button>
                    <el-button @click="viewCamera(currentPlan)">查看监控</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-card>
          </div>

          <!-- 2. 未启动预案：显示流程状态提示 + 启动按钮 -->
          <div v-else>
            <el-alert
              title="该预案尚未启动，以下是流程模板预览"
              type="warning"
              :closable="false"
              style="margin-bottom: 20px"
            ></el-alert>
            <!-- 快捷启动按钮 -->
            <el-button type="primary" style="margin-top: 20px; margin-bottom: 20px" @click="startPlan(currentPlan.planId)">
              启动该预案流程
            </el-button>
          </div>

          <!-- 3. 统一显示 BPMN 流程图（无论是否启动，DOM 始终存在） -->
          <div>
            <!-- BPMN流程渲染容器（始终渲染，不再受 v-if/v-else 控制） -->
            <div
              ref="bpmnContainerRef"
              class="bpmn-container"
              style="width: 100%; height: 500px; border: 1px solid #e6e6e6"
            ></div>
            <div v-if="!bpmnXml" class="text-gray" style="text-align: center; padding: 20px">
              该预案未配置流程模板
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
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
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

// 引入BPMN渲染相关依赖（移除废弃的keyboard配置）
//import BpmnJS from 'bpmn-js/lib/Modeler'
// 核心替换：Modeler（建模器）→ Viewer（纯预览器），无左侧图形工具栏
import BpmnJS from 'bpmn-js/lib/Viewer'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css'
import 'bpmn-js/dist/assets/diagram-js.css'

import {deployPlan as deployProcessPlan} from '@/api/plan'

// 状态定义
const planList = ref([])
const cameraList = ref([])
const viewDialogVisible = ref(false)
const viewActiveTab = ref('view-process') // 默认直接显示流程执行标签页
const currentPlan = ref({})
const taskList = ref([])
const originalTaskList = ref([]) // 存储原始任务列表，用于处理并行任务
const isParallelPhase = ref(false) // 标记当前是否处于并行任务阶段
const cameraDialogVisible = ref(false)
const currentCameraId = ref('')
const currentPlanCameras = ref([])
const bpmnXml = ref('')
const bpmnContainerRef = ref(null)
//let bpmnModeler = null
let bpmnViewer = null // 变量名同步改为bpmnViewer，语义更贴合
//let needRenderBpmn = ref(false)
let planType = ref('')
// 新增：存储当前高亮的BPMN元素ID，方便后续清除旧高亮
const currentHighlightedElementIds = ref([])

// 获取摄像头列表
const getCameraList = async () => {
  try {
    const res = await axios.get('/camera/getCameralist')
    if (res.code === 200) {
      cameraList.value = res.data
    }
  } catch (e) {
    ElMessage.error('获取摄像头列表失败：' + (e.message || e))
  }
}

// 获取预案列表
const getPlanList = async () => {
  try {
    const res = await axios.get('/plan/queryPlanList')
    if (res.code === 200) {
      planList.value = res.data
    }
  } catch (e) {
    ElMessage.error('获取预案列表失败：' + (e.message || e))
  }
}

// 根据摄像头ID拼接名称
const getCameraNames = (cameraIdsStr) => {
  if (!cameraIdsStr) return '无'
  const cameraIds = cameraIdsStr.split('|')
  const names = cameraList.value
    .filter((camera) => cameraIds.includes(camera.id.toString()))
    .map((camera) => camera.cameraName)
  return names.join('、')
}

// 查看预案
const viewPlan = async (plan) => {
  currentPlan.value = plan
  viewDialogVisible.value = true
  // 加载BPMN XML（无论是否启动，都加载）
  await loadBpmnXml(plan.planId)
  // 查询当前任务（无论是否启动，都查询）
  await getCurrentTask(plan.planId)
}

// 弹窗打开后的回调
const onDialogOpened = async () => {
  await nextTick()
  if (viewActiveTab.value === 'view-process' && bpmnXml.value) {
    renderBpmnDiagram()
  }
}

// 监听标签页切换
const handleTabChange = async (tabName) => {
  await nextTick()
  if (tabName === 'view-process' && bpmnXml.value) {
    renderBpmnDiagram()
  }
}

// 加载BPMN XML
const loadBpmnXml = async (planId) => {
  try {
    console.log('加载BPMN XML，planId:', planId)
    //const res = await axios.get(`/flow/bpmn/${planId}`)
    const res = await axios.get(`/plan/getById/${planId}`)
    console.log('BPMN接口响应:', res)

    if (res.code === 200) {
      // 清理XML中的转义字符，确保格式正确
      let xml = res.data.bpmnXml
      planType.value = res.data.planType
      // 处理转义的换行符和引号
      xml = xml.replace(/\\n/g, '\n').replace(/\\"/g, '"')
      bpmnXml.value = xml
      console.log('BPMN XML加载成功，处理后长度:', bpmnXml.value.length)
    } else {
      ElMessage.warning('加载流程模板失败：' + res.msg)
      bpmnXml.value = ''
    }
  } catch (e) {
    ElMessage.warning('加载流程模板失败：' + (e.message || e))
    console.error('BPMN加载错误:', e)
    bpmnXml.value = ''
  }
}

// 渲染BPMN流程图（核心修复：移除废弃的keyboard配置 + XML格式清理）
const renderBpmnDiagram = async (retryCount = 0) => {
  console.log('开始渲染BPMN流程图,重试次数:', retryCount)
  // 销毁旧实例
  if (bpmnViewer) {
    bpmnViewer.destroy()
    bpmnViewer = null
  }

  await nextTick()

  // 获取容器
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

  // 创建新实例（移除废弃的keyboard.bindTo配置）
  bpmnViewer = new BpmnJS({
    container: container,
    // 移除 keyboard 配置，解决 unsupported configuration 错误
    additionalModules: [],
    moddleExtensions: {}
  })

  // 导入XML并渲染
  try {
    const result = await bpmnViewer.importXML(bpmnXml.value)
    const { warnings } = result
    console.log('BPMN渲染成功,警告:', warnings)

    // 适配画布大小
    const canvas = bpmnViewer.get('canvas')
    canvas.zoom('fit-viewport')
    // ElMessage.success('流程模板渲染成功')

    // 渲染完成后，自动高亮所有当前任务（仅已启动预案，支持并行网关多节点）
    if (currentPlan.value.procInstId && taskList.value.length > 0) {
      // 提取所有待办任务的 bpmnElementId 组成数组
      const elementIds = taskList.value
        .filter(task => task.bpmnElementId) // 过滤掉无 bpmnElementId 的任务
        .map(task => task.bpmnElementId) // 提取 elementId 数组
      // 调用多节点高亮方法
      highlightBpmnElements(elementIds)
    }
  } catch (err) {
    console.error('BPMN渲染失败:', err)
    ElMessage.error('流程渲染失败：' + err.message)
  }
}

// 查看摄像头
const viewCamera = (plan) => {
  if (!plan.cameraIds) {
    ElMessage.warning('该预案未关联任何摄像头')
    return
  }
  const cameraIds = plan.cameraIds.split('|')
  currentPlanCameras.value = cameraList.value.filter((camera) =>
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

// 查询当前待办任务
const getCurrentTask = async (planId) => {
  try {
    const res = await axios.get(`/flow/task/${planId}`)
    if (res.code === 200) {
      let taskData = res.data || {}
      let tasks = Array.isArray(taskData) ? taskData : [taskData]

      // 保存原始任务列表，用于处理并行任务
      originalTaskList.value = tasks
      console.log('任务列表（原始）:', originalTaskList.value)

      // 识别并行任务：如果任务列表中有多个任务，且它们的bpmnElementId相同或任务名称相似，则认为是并行任务
      isParallelPhase.value = tasks.length > 1
      if (isParallelPhase.value) {
        console.log('当前处于并行任务阶段，需要完成所有并行任务后才能继续')
      }

      // 处理任务列表：并行任务阶段显示所有任务，非并行任务阶段去重
      let processedTasks = tasks
      if (!isParallelPhase.value && tasks.length > 1) {
        // 非并行任务阶段，对任务进行去重处理
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

      // 并行任务阶段的安全检查：确保只显示当前并行任务，不显示后续任务
      if (isParallelPhase.value) {
        // 检查任务列表中的任务是否都是并行任务
        const taskNames = new Set()
        tasks.forEach(task => {
          taskNames.add(task.taskName)
        })

        // 如果任务名称都相同或相似，说明是并行任务
        if (taskNames.size === 1) {
          console.log('所有任务都是并行任务，用户只能完成这些任务')
        }
      }
    }
  } catch (e) {
    ElMessage.error('获取任务列表失败：' + (e.message || e))
  }
}


// 部署流程
const deployPlan = async (planId) => {
  try {
    await ElMessageBox.confirm('确定要部署该流程吗？部署后将在Flowable中生效', '部署确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    const res = await deployProcessPlan({
      planId: planId,
      moduleCode: planType,
      deployUser: 'sp1ke',
    })

    if (res.code === 200) {
      ElMessage.success('流程部署成功')
    } else {
      ElMessage.error(res.data.msg || '部署失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(`部署失败：${error.message}`)
    }
  }
}

// 启动预案
const startPlan = async (planId) => {
  try {
    await ElMessageBox.confirm('确定要启动该预案吗？', '提示', {
      type: 'warning',
    })
    const res = await axios.post(`/flow/start/${planId}`)
    if (res.code === 200) {
      ElMessage.success('预案启动成功')
      console.log('启动成功，开始刷新数据...')

      // 1. 立即更新当前预案状态（不等待getPlanList），确保界面立即响应
      currentPlan.value = {
        ...currentPlan.value,
        flowStatus: 1,
        procInstId: res.data.procInstId || currentPlan.value.procInstId
      }
      console.log('当前预案状态已更新:', currentPlan.value)

      // 2. 重新查询任务列表，确保有任务数据
      await getCurrentTask(planId)
      console.log('任务列表已更新:', taskList.value)

      // 3. 重新渲染BPMN流程图
      await renderBpmnDiagram()

      // 4. 刷新预案列表（后台操作，不阻塞界面）
      await getPlanList()
      console.log('预案列表已刷新')
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
const stopPlan = async (processInstId) => {
  try {
    await ElMessageBox.confirm('确定要终止该预案吗？', '提示', {
      type: 'warning',
    })
    const res = await axios.post(`/flow/stop/${processInstId}`)
    if (res.code === 200) {
      ElMessage.success('预案终止成功')
      await getPlanList()
      // 清空任务列表 + 取消高亮
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

// 完成步骤（核心：同步刷新任务列表 + BPMN高亮）
const completing = ref(false) // 完成步骤加载状态
const completeStep = async (taskId) => {
  completing.value = true // 点击后禁用按钮
  try {
    await ElMessageBox.confirm('确定要完成该步骤吗？', '步骤确认', {
      type: 'info'
    })

    // 1. 先完成当前点击的任务
    const res = await axios.post(`/flow/next/${taskId}`)
    if (res.code === 200) {
      ElMessage.success('步骤完成，流程已推进')

      // 2. 刷新当前任务列表（获取最新任务，包括并行网关的多个任务）
      await getCurrentTask(currentPlan.value.planId)

      // 3. 重新渲染BPMN流程图 + 高亮所有最新任务
      await renderBpmnDiagram()

      // 4. 无任务时提示流程完成
      if (taskList.value.length === 0) {
        ElMessage.info('该预案流程已全部执行完成')
      }
    } else {
      ElMessage.error(res.msg)
    }
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('完成步骤失败：' + (e.message || e))
    }
  }
  finally {
    completing.value = false // 无论成功失败，都取消加载状态
  }
}


// 多节点高亮：传入elementId数组，逐个添加高亮标记
const highlightBpmnElements = (elementIds) => {
  if (!bpmnViewer || !elementIds || elementIds.length === 0) return

  // 先取消所有旧节点的高亮
  cancelBpmnHighlight()

  // 获取 BPMN 核心服务
  const elementRegistry = bpmnViewer.get('elementRegistry')
  const canvas = bpmnViewer.get('canvas')

  // 遍历所有 elementId，逐个高亮
  elementIds.forEach(elementId => {
    const element = elementRegistry.get(elementId)
    if (!element) {
      console.warn(`未找到BPMN元素：${elementId}`)
      return
    }
    canvas.addMarker(element.id, 'bpmn-highlight')
    currentHighlightedElementIds.value.push(element.id) // 记录所有高亮节点ID
  })

  // 可选：自动定位到第一个高亮节点（方便查看）
  if (elementIds.length > 0) {
    const firstElement = elementRegistry.get(elementIds[0])
    if (firstElement) {
      canvas.zoom('fit-viewport', firstElement)
    }
  }
}

// 2. 取消所有节点的高亮（适配数组存储）
const cancelBpmnHighlight = () => {
  if (!bpmnViewer || currentHighlightedElementIds.value.length === 0) return

  const elementRegistry = bpmnViewer.get('elementRegistry')
  const canvas = bpmnViewer.get('canvas')

  // 遍历所有高亮节点，移除标记
  currentHighlightedElementIds.value.forEach(elementId => {
    const element = elementRegistry.get(elementId)
    if (element) {
      canvas.removeMarker(element.id, 'bpmn-highlight')
    }
  })

  // 清空高亮记录
  currentHighlightedElementIds.value = []
}

// 监听弹窗关闭，销毁BPMN实例（避免内存泄漏）
watch(viewDialogVisible, async (newVal) => {
  if (!newVal) {
    if (bpmnViewer) {
      bpmnViewer.destroy()
      bpmnViewer = null
      cancelBpmnHighlight()
      bpmnXml.value = ''
      taskList.value = []
    }
    // 弹窗关闭后，重新查询预案列表，确保数据最新
    try {
      console.log('弹窗关闭，开始重新查询预案列表...')
      await getPlanList()
      console.log('预案列表重新查询完成')
    } catch (error) {
      console.error('重新查询预案列表失败:', error)
      ElMessage.error('刷新预案列表失败：' + (error.message || error))
    }
  }
})

// 销毁BPMN实例
onUnmounted(() => {
  if (bpmnViewer) {
    bpmnViewer.destroy()
    bpmnViewer = null
  }
})

// 页面加载
onMounted(() => {
  getPlanList()
  getCameraList()
})
</script>

<style scoped>
.plan-list {
  padding: 20px;
}
.camera-container {
  text-align: center;
}
.text-gray {
  color: #909399;
}
/* BPMN容器样式 */
.bpmn-container {
  background: #fff;
}
/* 解决scoped样式穿透问题 */
:deep(.bpmn-diagram) {
  width: 100%;
  height: 100%;
}
:deep(.bpmn-element) {
  fill: #fff;
}

/* 新增：BPMN元素高亮样式 */
:deep(.bpmn-highlight .djs-visual > rect) {
  stroke: #6cf56c !important; /* 高亮边框色 */
  stroke-width: 3px !important; /* 高亮边框宽度 */
  fill: rgba(108, 245, 161, 0.1) !important; /* 高亮背景色（半透明） */
}
:deep(.bpmn-highlight .djs-visual > path) {
  stroke: #6cf56c !important;
  stroke-width: 3px !important;
}
</style>
