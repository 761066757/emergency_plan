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
    <el-dialog v-model="viewDialogVisible" title="预案详情" width="800px">
      <el-tabs v-model="viewActiveTab">
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
            <!-- BPMN流程渲染容器 -->
            <div
              v-if="bpmnXml"
              class="bpmn-container"
              style="width: 100%; height: 500px; border: 1px solid #e6e6e6"
            ></div>
            <div v-else class="text-gray" style="text-align: center; padding: 20px">
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
        <!-- 多摄像头切换 -->
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
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

// 引入BPMN渲染相关依赖（需先安装：npm install bpmn-js）
import BpmnJS from 'bpmn-js/lib/Modeler'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css'
import 'bpmn-js/dist/assets/diagram-js.css'
//import { R } from 'vue-router/dist/router-CWoNjPRp.mjs'

// 预案列表
const planList = ref([])
// 摄像头列表
const cameraList = ref([])
// 详情弹窗
const viewDialogVisible = ref(false)
const viewActiveTab = ref('view-base')
const currentPlan = ref({})
const taskList = ref([])
// 摄像头弹窗
const cameraDialogVisible = ref(false)
const currentCameraId = ref('')
const currentPlanCameras = ref([])
// BPMN相关
const bpmnXml = ref('') // 存储当前预案的BPMN XML
let bpmnModeler = null // BPMN渲染实例

// 获取摄像头列表
const getCameraList = async () => {
  try {
    const res = await axios.get('/camera/list')
    if (res.code === 200) {
      cameraList.value = res.data
    }
  } catch (e) {
    ElMessage.error(e, '获取摄像头列表失败')
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
    ElMessage.error(e, '获取预案列表失败')
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

// 查看预案（关键修改：加载BPMN XML并渲染）
const viewPlan = async (plan) => {
  currentPlan.value = plan
  viewDialogVisible.value = true

  // 1. 已启动：加载任务列表
  if (plan.processInstId) {
    await getTaskList(plan.processInstId)
  }
  // 2. 未启动：加载BPMN XML并渲染流程
  else {
    await loadBpmnXml(plan.id)
  }
}

// 加载预案的BPMN XML（新增方法）
const loadBpmnXml = async (planId) => {
  try {
    const res = await axios.get(`/flow/bpmn/${planId}`)
    if (res.code === 200) {
      bpmnXml.value = res.data
      // 渲染BPMN流程
      renderBpmnDiagram()
    }
  } catch (e) {
    ElMessage.warning('加载流程模板失败：' + e.message)
    bpmnXml.value = ''
  }
}

// 渲染BPMN流程图（新增方法）
const renderBpmnDiagram = () => {
  // 销毁旧实例
  if (bpmnModeler) {
    bpmnModeler.destroy()
  }

  // 创建新实例
  const container = document.querySelector('.bpmn-container')
  if (!container || !bpmnXml.value) return

  bpmnModeler = new BpmnJS({
    container: container,
    keyboard: {
      bindTo: document,
    },
  })

  // 导入XML并渲染
  bpmnModeler.importXML(bpmnXml.value, (err) => {
    if (err) {
      ElMessage.error('流程渲染失败：' + err.message)
    } else {
      // 适配画布大小
      const canvas = bpmnModeler.get('canvas')
      canvas.zoom('fit-viewport')
    }
  })
}

// 查看摄像头（从预案获取摄像头）
const viewCamera = (plan) => {
  if (!plan.cameraIds) {
    ElMessage.warning('该预案未关联任何摄像头')
    return
  }
  // 修正：split分隔符改为|（和getCameraNames保持一致）
  const cameraIds = plan.cameraIds.split('|')
  currentPlanCameras.value = cameraList.value.filter((camera) =>
    cameraIds.includes(camera.id.toString()),
  )
  // 默认选中第一个摄像头
  if (currentPlanCameras.value.length > 0) {
    currentCameraId.value = currentPlanCameras.value[0].id
    cameraDialogVisible.value = true
    // 加载摄像头流
    switchCamera()
  }
}

// 切换摄像头
const switchCamera = () => {
  const camera = currentPlanCameras.value.find((item) => item.id === currentCameraId.value)
  if (camera) {
    const video = document.getElementById('cameraVideo')
    // 替换为真实的摄像头流地址
    video.src = camera.cameraUrl
    video.play()
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
    ElMessage.error(e, '获取任务列表失败')
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
      // 启动成功后刷新当前预案信息
      if (currentPlan.value.id === planId) {
        // 重新获取预案列表，更新processInstId
        await getPlanList()
        const updatedPlan = planList.value.find((item) => item.id === planId)
        if (updatedPlan) {
          currentPlan.value = updatedPlan
          await getTaskList(updatedPlan.processInstId)
          // 清空BPMN渲染
          bpmnXml.value = ''
          if (bpmnModeler) {
            bpmnModeler.destroy()
            bpmnModeler = null
          }
        }
      }
    } else {
      ElMessage.error(res.msg)
    }
  } catch (e) {
    if (e !== 'cancel') {
      // 排除取消操作的提示
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
    }
  } catch (e) {
    ElMessage.info(e, '取消终止')
  }
}

// 完成步骤
const completeStep = async (taskId) => {
  try {
    const res = await axios.post(`/flow/complete/${taskId}`)
    if (res.code === 200) {
      ElMessage.success('步骤完成，流程已推进')
      getTaskList(currentPlan.value.processInstId)
    }
  } catch (e) {
    ElMessage.error(e, '完成步骤失败')
  }
}

// 销毁BPMN实例（防止内存泄漏）
onUnmounted(() => {
  if (bpmnModeler) {
    bpmnModeler.destroy()
    bpmnModeler = null
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
</style>
