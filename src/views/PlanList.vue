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
            <el-button type="text" @click="deployPlan(scope.row.id)">部署</el-button>
            <el-button type="text" @click="startPlan(scope.row.id)">启动</el-button>
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
          <!-- 1. 已启动：显示任务列表 -->
          <div v-if="currentPlan.processInstId">
            <el-alert title="当前预案已启动，正在执行中" type="info" :closable="false"></el-alert>
            <el-card style="margin-top: 20px">
              <el-table :data="taskList" border>
                <el-table-column prop="name" label="当前步骤"></el-table-column>
                <el-table-column prop="createTime" label="创建时间"></el-table-column>
                <el-table-column label="操作">
                  <template #default="scope">
                    <el-button type="primary" @click="completeStep(scope.row.id)"
                      >完成步骤</el-button
                    >
                    <el-button @click="viewCamera(currentPlan)">查看监控</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-card>
          </div>
          <!-- 2. 未启动：显示BPMN流程预览 + 启动按钮 -->
          <div v-else>
            <el-alert
              title="该预案尚未启动，以下是流程模板预览"
              type="warning"
              :closable="false"
              style="margin-bottom: 20px"
            ></el-alert>
            <!-- BPMN流程渲染容器 - 用v-show保持DOM存在 -->
            <div
              ref="bpmnContainerRef"
              class="bpmn-container"
              style="width: 100%; height: 500px; border: 1px solid #e6e6e6"
              v-show="bpmnXml"
            ></div>
            <div v-show="!bpmnXml" class="text-gray" style="text-align: center; padding: 20px">
              该预案未配置流程模板
            </div>
            <!-- 快捷启动按钮 -->
            <el-button type="primary" style="margin-top: 20px" @click="startPlan(currentPlan.id)">
              启动该预案流程
            </el-button>
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
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios, { toFormData } from 'axios'

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
const cameraDialogVisible = ref(false)
const currentCameraId = ref('')
const currentPlanCameras = ref([])
const bpmnXml = ref('')
const bpmnContainerRef = ref(null)
//let bpmnModeler = null
let bpmnViewer = null // 变量名同步改为bpmnViewer，语义更贴合
let needRenderBpmn = ref(false)
const planType = {}

// 获取摄像头列表
const getCameraList = async () => {
  try {
    const res = await axios.get('/camera/list')
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
    const res = await axios.get('/plan/list')
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
  needRenderBpmn.value = false

  if (plan.processInstId) {
    await getTaskList(plan.processInstId)
  } else {
    await loadBpmnXml(plan.id)
    needRenderBpmn.value = true
  }
}

// 弹窗打开后的回调
const onDialogOpened = async () => {
  await nextTick()
  if (needRenderBpmn.value && viewActiveTab.value === 'view-process' && bpmnXml.value) {
    renderBpmnDiagram()
  }
}

// 监听标签页切换
const handleTabChange = async (tabName) => {
  await nextTick()
  if (tabName === 'view-process' && needRenderBpmn.value && bpmnXml.value) {
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
  console.log('开始渲染BPMN流程图，重试次数:', retryCount)

  // 销毁旧实例
  if (bpmnViewer) {
    bpmnViewer.destroy()
    bpmnViewer = null
  }

  await nextTick()

  // 获取容器
  const container = bpmnContainerRef.value
  console.log('BPMN容器元素:', container)

  if (!container) {
    if (retryCount < 3) {
      console.warn('BPMN容器未找到，将重试...')
      setTimeout(() => renderBpmnDiagram(retryCount + 1), 300)
      return
    }
    console.error('BPMN容器未找到（重试次数已用完）')
    ElMessage.error('BPMN渲染容器未找到，请切换到流程执行标签页')
    return
  }

  if (!bpmnXml.value) {
    console.warn('BPMN XML为空')
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
    ElMessage.success('流程模板渲染成功')
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

// 获取流程任务列表
const getTaskList = async (processInstId) => {
  try {
    const res = await axios.get(`/flow/task/${processInstId}`)
    if (res.code === 200) {
      taskList.value = res.data
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
      getPlanList()
      if (currentPlan.value.id === planId) {
        await getPlanList()
        const updatedPlan = planList.value.find((item) => item.id === planId)
        if (updatedPlan) {
          currentPlan.value = updatedPlan
          await getTaskList(updatedPlan.processInstId)
          bpmnXml.value = ''
          needRenderBpmn.value = false
          if (bpmnViewer) {
            bpmnViewer.destroy()
            bpmnViewer = null
          }
        }
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
const stopPlan = async (processInstId) => {
  try {
    await ElMessageBox.confirm('确定要终止该预案吗？', '提示', {
      type: 'warning',
    })
    const res = await axios.post(`/flow/stop/${processInstId}`)
    if (res.code === 200) {
      ElMessage.success('预案终止成功')
      getPlanList()
    } else {
      ElMessage.error(res.msg)
    }
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.info('取消终止')
    }
  }
}

// 完成步骤
const completeStep = async (taskId) => {
  try {
    const res = await axios.post(`/flow/complete/${taskId}`)
    if (res.code === 200) {
      ElMessage.success('步骤完成，流程已推进')
      getTaskList(currentPlan.value.processInstId)
    } else {
      ElMessage.error(res.msg)
    }
  } catch (e) {
    ElMessage.error('完成步骤失败：' + (e.message || e))
  }
}

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
</style>
