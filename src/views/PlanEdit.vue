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
        <el-button type="primary" @click="handleSavePlan">保存预案</el-button>
        <el-button type="success" @click="handleDeployPlan">部署流程</el-button>
        <el-button @click="handleExportBpmn">导出BPMN文件</el-button>
        <el-button type="warning" @click="handleImportBpmn">导入BPMN文件</el-button>
        <el-button type="danger" @click="handleClearAll">清空所有数据</el-button>

        <div class="right-group">
          <el-select
            v-model="currentModuleCode"
            placeholder="选择预案类型（模块）"
            style="width: 180px; margin-right: 10px"
            @change="handleModuleChange"
          >
            <el-option label="消防应急" value="emergency"></el-option>
            <el-option label="防汛应急" value="flood"></el-option>
            <el-option label="地震应急" value="earthquake"></el-option>
          </el-select>
          <el-input
            v-model="planForm.planName"
            placeholder="请输入预案名称"
            style="width: 200px"
          ></el-input>
        </div>
      </div>

      <!-- 核心布局：步骤库 + bpmn.js画布 + 预案配置 -->
      <div class="main-layout">
        <!-- 左侧：步骤库 + 节点替换操作（强制显示，不再依赖selectedCanvasNode） -->
        <div class="step-library-panel">
          <el-card header="全局步骤库" class="step-library-card">
            <el-input
              v-model="stepSearchKey"
              placeholder="搜索步骤名称/编码"
              prefix-icon="Search"
              style="margin-bottom: 15px"
              @input="handleStepSearch"
            ></el-input>

            <el-tree
              ref="stepTreeRef"
              :data="stepTreeData"
              :props="treeProps"
              node-key="id"
              :filter-node-method="filterStepNode"
              @node-click="handleStepNodeClick"
              default-expand-all
              class="step-tree"
              :current-node-key="activeStepId"
              highlight-current
            >
              <template #default="{ node, data }">
                <span class="custom-tree-node">
                  <span v-if="data.isTypeNode">
                    <el-icon><Folder /></el-icon>
                    {{ node.label }}（{{ data.stepTypeCount }}个步骤）
                  </span>
                  <span v-else>
                    <el-icon><Operation /></el-icon>
                    {{ node.label }}
                    <span class="step-code-tag">{{ data.stepCode }}</span>
                    <span class="step-type-tag">{{ data.stepTypeName }}</span>
                  </span>
                </span>
              </template>
            </el-tree>
          </el-card>

          <!-- 节点替换操作：移除v-if，强制显示 + 明确提示 -->
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
                    : '非任务节点（不可替换）'
                }}
              </p>
              <p v-if="selectedCanvasNode?.businessObject['flowable:stepId']">
                <strong>已绑定步骤：</strong>{{ selectedStep?.stepName || '无' }}
              </p>
            </div>
            <el-button
              type="primary"
              @click="handleReplaceNodeWithStep"
              :disabled="
                !selectedStep || !selectedCanvasNode || selectedCanvasNode.type !== 'bpmn:UserTask'
              "
              style="margin-top: 10px; width: 100%"
            >
              将选中步骤替换到当前节点
            </el-button>
            <div style="margin-top: 8px; font-size: 12px; color: #999">
              操作提示：1.点击「添加默认任务节点」→2.选中画布中的任务节点→3.选中左侧步骤→4.点击替换
            </div>
          </el-card>
        </div>

        <!-- 中间：纯bpmn.js画布 -->
        <div class="flowable-canvas-panel">
          <el-card header="流程设计画布" class="canvas-card">
            <div class="canvas-toolbar">
              <el-button @click="handleSaveCanvas">保存画布</el-button>
              <el-button @click="handleRefreshCanvas">刷新画布</el-button>
              <el-button @click="handleAddDefaultTask">添加默认任务节点</el-button>
            </div>
            <div class="canvas-container" ref="bpmnContainer"></div>
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
                <el-input v-model="planForm.planName" placeholder="请输入预案名称"></el-input>
              </el-form-item>
              <el-form-item label="预案类型" prop="planType">
                <el-select v-model="planForm.planType" placeholder="请选择预案类型">
                  <el-option label="消防应急" value="fire"></el-option>
                  <el-option label="防汛应急" value="flood"></el-option>
                  <el-option label="地震应急" value="earthquake"></el-option>
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

          <!-- 部署记录 -->
          <el-card header="流程部署记录" class="deploy-record-card">
            <el-table :data="deployRecordList" border stripe size="small" max-height="200">
              <el-table-column prop="deployTime" label="部署时间" width="180"></el-table-column>
              <el-table-column prop="deployUser" label="部署人" width="120"></el-table-column>
              <el-table-column prop="status" label="状态" width="100">
                <template #default="scope">
                  <el-tag :type="scope.row.status === 'ACTIVE' ? 'success' : 'danger'">
                    {{ scope.row.status === 'ACTIVE' ? '已激活' : '已失效' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="100">
                <template #default="scope">
                  <el-button
                    type="text"
                    size="small"
                    @click="handleActivateDeploy(scope.row)"
                    v-if="scope.row.status !== 'ACTIVE'"
                  >
                    激活
                  </el-button>
                  <el-button
                    type="text"
                    size="small"
                    danger
                    @click="handleInvalidDeploy(scope.row)"
                    v-if="scope.row.status === 'ACTIVE'"
                  >
                    失效
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
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
import { ref, reactive, onMounted, watch, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Folder, Operation, UploadFilled } from '@element-plus/icons-vue'
import { useRouter, useRoute } from 'vue-router'

// 仅引入bpmn-js核心（无属性面板依赖）
import BpmnModeler from 'bpmn-js/lib/Modeler'
import 'bpmn-js/dist/assets/bpmn-js.css'
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css' // 新增：确保小人图标等字体加载
// 原有API引入（请根据实际路径调整）
import { getStepList, getStepNameByIds } from '@/api/step'
import {
  savePlan,
  getPlanById,
  getPlanStepRelations,
  deployPlan,
  getDeployRecord,
  activateDeploy,
  invalidDeploy,
} from '@/api/plan'
import { getCameraList } from '@/api/camera'

// 路由相关
const router = useRouter()
const route = useRoute()

// 页面参数
const planId = ref(route.query.id || '')
const uploadRef = ref(null)
const stepTreeRef = ref(null)
const planFormRef = ref(null)
const bpmnContainer = ref(null)
let bpmnModeler = null

// 响应式数据
const currentModuleCode = ref('emergency')
const stepSearchKey = ref('')
const importDialogVisible = ref(false)
const importBpmnUrl = ref('/api/plan/importBpmn')
const selectedCanvasNode = ref(null) // 当前选中的画布节点
const selectedStep = ref(null) // 当前选中的步骤
const activeStepId = ref('') // 选中步骤的ID（用于树形高亮）

// 预案表单
const planForm = reactive({
  id: planId.value || '',
  planName: '',
  planType: '',
  planDesc: '',
  cameraIds: [],
  bpmnXml: '',
})

// 表单校验规则
const planRules = ref({
  planName: [{ required: true, message: '请输入预案名称', trigger: 'blur' }],
  planType: [{ required: true, message: '请选择预案类型', trigger: 'change' }],
})

// 步骤相关数据
const stepTreeData = ref([])
const treeProps = ref({
  label: 'stepName',
  children: 'children',
})

// 下拉列表数据
const cameraList = ref([])
const deployRecordList = ref([])

// 修正后的空流程模板（带完整布局）
const initEmptyXml = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
             xmlns:flowable="http://flowable.org/bpmn"
             xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
             xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
             xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
             targetNamespace="http://www.flowable.org/processdef">
  <process id="emptyProcess" name="空流程" isExecutable="true">
    <startEvent id="startEvent" name="开始"></startEvent>
    <endEvent id="endEvent" name="结束"></endEvent>
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_emptyProcess">
    <bpmndi:BPMNPlane id="BPMNPlane_emptyProcess" bpmnElement="emptyProcess">
      <bpmndi:BPMNShape id="BPMNShape_startEvent" bpmnElement="startEvent">
        <dc:Bounds x="200" y="200" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="BPMNShape_endEvent" bpmnElement="endEvent">
        <dc:Bounds x="600" y="200" width="36" height="36"/>
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`

// 初始化bpmn.js画布// 修正后的画布初始化方法（彻底解决Constructor报错）
const initBpmnModeler = async (xml = initEmptyXml) => {
  try {
    // 1. 先销毁旧实例（避免重复构造）
    if (bpmnModeler) {
      try {
        bpmnModeler.destroy()
      } catch (e) {
        console.warn('销毁旧Modeler实例时的兼容警告：', e.message)
      }
      bpmnModeler = null
    }

    // 2. 校验容器元素是否存在（关键：避免构造函数传null）
    if (!bpmnContainer.value) {
      ElMessage.error('BPMN画布容器未找到，请检查页面DOM是否加载完成')
      return
    }

    // 3. 重新引入Modeler（避免模块缓存问题）
    const { default: BpmnModeler } = await import('bpmn-js/lib/Modeler')

    // 4. 初始化Modeler（简化配置，避免插件冲突）
    bpmnModeler = new BpmnModeler({
      container: bpmnContainer.value,
      // 仅保留必要的Flowable扩展，禁用所有非核心插件
      moddleExtensions: {
        flowable: {
          uri: 'http://flowable.org/bpmn',
          prefix: 'flowable',
        },
      },
      // 禁用所有可选插件，避免构造函数冲突
      keyboard: { bindTo: document },
      additionalModules: [], // 暂时清空自定义模块，先解决构造函数问题
      disableStackTools: true,
    })

    // 5. 导入XML（兼容处理）
    const result = await bpmnModeler.importXML(xml)
    const { warnings } = result
    if (warnings.length > 0) {
      console.warn('BPMN XML导入警告：', warnings)
    }

    // 6. 监听节点选中事件（简化版，避免额外冲突）
    const eventBus = bpmnModeler.get('eventBus')
    eventBus.off('element.select')
    eventBus.on('element.select', (e) => {
      const element = e.element
      if (element) {
        selectedCanvasNode.value = {
          id: element.id,
          name: element.businessObject.name || '未命名节点',
          type: element.type,
          businessObject: JSON.parse(JSON.stringify(element.businessObject || {})),
        }
        if (element.type !== 'bpmn:UserTask') {
          selectedStep.value = null
          activeStepId.value = ''
        }
      } else {
        selectedCanvasNode.value = null
      }
    })

    // 7. 适配画布视角
    const canvas = bpmnModeler.get('canvas')
    canvas.zoom('fit-viewport')
    ElMessage.success('流程画布初始化成功')
  } catch (e) {
    ElMessage.error(`画布初始化失败：${e.message}`)
    console.error('画布初始化详细报错：', e)
    // 兜底：重置Modeler实例
    bpmnModeler = null
  }
}

// 加载步骤信息
const loadStepInfoById = async (stepId) => {
  try {
    const res = await getStepNameByIds(Array.isArray(stepId) ? stepId : [stepId])
    if (res.code === 200 && res.data && res.data.length > 0) {
      const step = res.data[0]
      selectedStep.value = {
        id: step.id,
        stepName: step.stepName,
        stepCode: step.stepCode,
        stepType: step.stepType,
        stepTypeName: step.stepTypeName,
      }
      activeStepId.value = step.id
    } else {
      selectedStep.value = null
      activeStepId.value = ''
      ElMessage.warning(`未找到ID为【${stepId}】的步骤`)
    }
  } catch (e) {
    console.error('加载步骤信息失败:', e)
    selectedStep.value = null
    activeStepId.value = ''
    ElMessage.error(`加载步骤信息失败：${e.message}`)
  }
}

// 页面回退
const handleBack = () => {
  router.push('/plan/list')
}

// 步骤搜索过滤
const filterStepNode = (value, data) => {
  if (!value) return true
  return (
    data.stepName?.includes(value) ||
    data.stepCode?.includes(value) ||
    data.stepTypeName?.includes(value)
  )
}

// 步骤搜索事件
const handleStepSearch = () => {
  stepTreeRef.value.filter(stepSearchKey.value)
}

// 选中步骤
const handleStepNodeClick = (data) => {
  if (data.isTypeNode) {
    ElMessage.info('请选择具体的步骤，而非步骤分类')
    return
  }

  selectedStep.value = {
    id: data.id,
    stepName: data.stepName,
    stepCode: data.stepCode,
    stepType: data.stepType,
    stepTypeName: data.stepTypeName,
  }
  activeStepId.value = data.id

  ElMessage.success(`已选中步骤：【${data.stepName}（${data.stepTypeName}）】`)

  if (selectedCanvasNode.value?.type !== 'bpmn:UserTask') {
    ElMessage.warning('当前选中的不是用户任务节点，无法替换，请先选中画布中的矩形任务节点')
  }
}

// 核心：替换节点为选中步骤
const handleReplaceNodeWithStep = () => {
  if (!bpmnModeler) {
    ElMessage.error('画布未初始化，请刷新页面重试')
    return
  }
  if (!selectedCanvasNode.value) {
    ElMessage.warning('请先在画布中选中【矩形样式】的用户任务节点')
    return
  }
  if (selectedCanvasNode.value.type !== 'bpmn:UserTask') {
    ElMessage.error('仅支持替换用户任务节点（矩形样式），请选中正确的节点')
    return
  }
  if (!selectedStep.value || !selectedStep.value.id) {
    ElMessage.warning('请先在左侧步骤库中选中一个具体的步骤')
    return
  }

  try {
    const elementRegistry = bpmnModeler.get('elementRegistry')
    const modeling = bpmnModeler.get('modeling')
    // 获取最新的节点实例
    const node = elementRegistry.get(selectedCanvasNode.value.id)

    if (!node) {
      ElMessage.error('选中的节点已失效，请重新选中节点')
      selectedCanvasNode.value = null
      return
    }

    // 1. 更新节点名称
    const newNodeName = `${selectedStep.value.stepName}（${selectedStep.value.stepTypeName}）`
    modeling.updateProperties(node, {
      name: newNodeName,
    })

    // 2. 写入Flowable扩展属性
    const businessObject = node.businessObject
    // 清空旧属性
    Object.keys(businessObject).forEach((key) => {
      if (key.startsWith('flowable:')) {
        delete businessObject[key]
      }
    })
    // 写入新属性
    businessObject['flowable:stepId'] = selectedStep.value.id
    businessObject['flowable:stepCode'] = selectedStep.value.stepCode
    businessObject['flowable:stepType'] = selectedStep.value.stepType
    businessObject['flowable:moduleCode'] = currentModuleCode.value
    businessObject['flowable:stepName'] = selectedStep.value.stepName

    // 3. 强制更新属性
    modeling.updateProperties(node, {
      businessObject: businessObject,
    })

    // 4. 同步更新选中状态
    selectedCanvasNode.value.name = newNodeName
    selectedCanvasNode.value.businessObject['flowable:stepId'] = selectedStep.value.id

    ElMessage.success(`✅ 节点替换成功！已绑定步骤：【${selectedStep.value.stepName}】`)
  } catch (e) {
    ElMessage.error(`❌ 节点替换失败：${e.message}`)
    console.error('替换失败详情：', e)
  }
}

// 添加默认任务节点
const handleAddDefaultTask = () => {
  if (!bpmnModeler) {
    ElMessage.error('画布未加载完成，请先等待画布初始化')
    return
  }

  try {
    const canvas = bpmnModeler.get('canvas')
    const elementFactory = bpmnModeler.get('elementFactory')
    const elementRegistry = bpmnModeler.get('elementRegistry')
    const modeling = bpmnModeler.get('modeling')
    const selection = bpmnModeler.get('selection')

    // 1. 获取开始/结束节点（确保存在）
    let startEvent = elementRegistry.get('startEvent')
    let endEvent = elementRegistry.get('endEvent')
    if (!startEvent || !endEvent) {
      ElMessage.error('画布中缺少开始或结束节点，请重新初始化画布')
      return
    }

    // 2. 获取所有已有的用户任务节点并按X坐标排序（找到最后一个任务节点）
    const taskNodes = elementRegistry
      .getAll()
      .filter((el) => el.type === 'bpmn:UserTask')
      .sort((a, b) => a.x - b.x) // 按X坐标从小到大排序

    // 3. 计算新节点位置（基于最后一个任务节点）
    let baseX = 300 + taskNodes.length * 150
    let baseY = 200
    let lastTaskNode = null

    if (taskNodes.length > 0) {
      lastTaskNode = taskNodes[taskNodes.length - 1] // 取最后一个任务节点
      baseX = lastTaskNode.x + 150 // 在上一个节点右侧150px
      baseY = lastTaskNode.y // 保持和上一个节点同一Y坐标
    }

    // 4. 创建任务节点（生成绝对唯一ID）
    let taskId = `userTask_${Date.now()}_${Math.floor(Math.random() * 10000)}`
    // 双重校验ID唯一性
    while (elementRegistry.get(taskId)) {
      taskId = `userTask_${Date.now()}_${Math.floor(Math.random() * 10000)}_${Math.floor(Math.random() * 100)}`
    }
    const task = elementFactory.createShape({
      type: 'bpmn:UserTask',
      id: taskId,
      x: baseX,
      y: baseY,
      name: '未命名任务',
    })

    // 5. 添加节点到画布
    canvas.addShape(task)

    // 6. 创建连接线（核心修复：链式连接）
    if (lastTaskNode) {
      // 如果已有任务节点，连接最后一个任务节点到新节点
      const flow1Id = `flow_${lastTaskNode.id}_${task.id}`
      modeling.connect(lastTaskNode, task, {
        id: flow1Id,
        type: 'bpmn:SequenceFlow',
      })

      // 删除最后一个任务节点到结束节点的旧连线
      const oldEndFlows = elementRegistry
        .getAll()
        .filter(
          (el) =>
            el.type === 'bpmn:SequenceFlow' && el.source === lastTaskNode && el.target === endEvent,
        )

      oldEndFlows.forEach((flow) => {
        modeling.removeElements([flow])
      })
    } else {
      // 如果没有任务节点，连接开始节点到新节点
      const flow1Id = `flow_${startEvent.id}_${task.id}`
      modeling.connect(startEvent, task, {
        id: flow1Id,
        type: 'bpmn:SequenceFlow',
      })
    }

    // 连接新节点到结束节点
    const flow2Id = `flow_${task.id}_${endEvent.id}`
    modeling.connect(task, endEvent, {
      id: flow2Id,
      type: 'bpmn:SequenceFlow',
    })

    // 7. 适配画布视角
    canvas.zoom('fit-viewport')

    // 8. 延迟选中新节点（确保元素完全注册）
    setTimeout(() => {
      if (task && selection) {
        selection.deselectAll()
        selection.select(task)
        // 同步更新选中状态
        selectedCanvasNode.value = JSON.parse(
          JSON.stringify({
            id: task.id,
            name: task.businessObject.name || '未命名节点',
            type: task.type,
            businessObject: task.businessObject || {},
          }),
        )
      }
    }, 300)

    ElMessage.success('✅ 任务节点添加成功，已自动选中该节点，请选择左侧步骤进行替换')
  } catch (e) {
    ElMessage.error(`❌ 添加节点失败：${e.message}`)
    console.error('添加节点失败详情：', e)
    // 兜底清空状态
    selectedCanvasNode.value = null
    selectedStep.value = null
    activeStepId.value = ''
  }
}

// 模块切换
const handleModuleChange = () => {
  loadStepList()
  initBpmnModeler(planForm.bpmnXml || initEmptyXml)
}

// 保存画布
const handleSaveCanvas = async () => {
  if (!bpmnModeler) {
    ElMessage.error('画布未加载完成')
    return
  }
  try {
    const { xml } = await bpmnModeler.saveXML({ format: true })
    planForm.bpmnXml = xml
    ElMessage.success('BPMN XML已保存到表单')
  } catch (e) {
    ElMessage.error(`保存画布失败：${e.message}`)
    console.error(e)
  }
}

// 刷新画布
const handleRefreshCanvas = () => {
  initBpmnModeler(planForm.bpmnXml || initEmptyXml)
}

// 保存预案
const handleSavePlan = async () => {
  try {
    await planFormRef.value.validate()

    const planStepRelations = []
    if (bpmnModeler) {
      const elementRegistry = bpmnModeler.get('elementRegistry')
      const taskNodes = elementRegistry.filter(
        (el) => el.type === 'bpmn:UserTask' && el.businessObject['flowable:stepId'],
      )
      taskNodes.forEach((node) => {
        planStepRelations.push({
          planId: planForm.id,
          stepId: node.businessObject['flowable:stepId'],
          stepType: node.businessObject['flowable:stepType'],
          flowNodeId: node.id,
        })
      })
    }

    if (!planForm.id) {
      planForm.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
    }

    const res = await savePlan({
      plan: planForm,
      planStepRelations: planStepRelations,
    })

    if (res.code === 200) {
      ElMessage.success('预案保存成功')
      getDeployRecordList()
    } else {
      ElMessage.error(res.data.msg || '保存失败')
    }
  } catch (error) {
    ElMessage.error(`保存预案失败：${error.message}`)
  }
}

// 部署流程
const handleDeployPlan = async () => {
  try {
    if (!planForm.id) {
      ElMessage.warning('请先保存预案')
      return
    }

    await ElMessageBox.confirm('确定要部署该流程吗？部署后将在Flowable中生效', '部署确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    const res = await deployPlan({
      planId: planForm.id,
      moduleCode: currentModuleCode.value,
      deployUser: 'admin',
    })

    if (res.code === 200) {
      ElMessage.success('流程部署成功')
      getDeployRecordList()
    } else {
      ElMessage.error(res.data.msg || '部署失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(`部署失败：${error.message}`)
    }
  }
}

// 导出BPMN文件
const handleExportBpmn = async () => {
  if (!bpmnModeler) {
    ElMessage.error('画布未加载完成')
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
    ElMessage.success('BPMN文件导出成功')
  } catch (e) {
    ElMessage.error(`导出失败：${e.message}`)
    console.error(e)
  }
}

// 导入BPMN文件
const handleImportBpmn = () => {
  importDialogVisible.value = true
}

// 导入前校验
const beforeImportUpload = (file) => {
  const isXml =
    file.type === 'text/xml' || file.name.endsWith('.bpmn') || file.name.endsWith('.bpmn20.xml')
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isXml) {
    ElMessage.error('只能上传xml/bpmn格式的文件！')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('文件大小不能超过2MB！')
    return false
  }
  return true
}

// 导入成功
const handleImportSuccess = (response) => {
  if (response.code === 200) {
    ElMessage.success('BPMN文件导入成功')
    importDialogVisible.value = false
    planForm.bpmnXml = response.data.bpmnXml
    initBpmnModeler(response.data.bpmnXml)
  } else {
    ElMessage.error(response.msg || '导入失败')
  }
}

// 导入失败
const handleImportError = (error) => {
  ElMessage.error(`导入失败：${error.message}`)
  console.error(error)
}

// 清空所有数据
const handleClearAll = async () => {
  try {
    await ElMessageBox.confirm('确定要清空所有数据吗？此操作不可恢复', '清空确认', {
      type: 'danger',
    })
    // 重置表单
    planForm.id = ''
    planForm.planName = ''
    planForm.planType = ''
    planForm.planDesc = ''
    planForm.cameraIds = []
    planForm.bpmnXml = ''
    // 重置选中状态
    selectedCanvasNode.value = null
    selectedStep.value = null
    activeStepId.value = ''
    // 重置画布
    initBpmnModeler(initEmptyXml)
    ElMessage.success('数据已清空')
  } catch (e) {
    console.log(e)
    ElMessage.info('已取消清空操作')
  }
}

// 激活部署记录
const handleActivateDeploy = async (row) => {
  try {
    const res = await activateDeploy({
      deployId: row.id,
      moduleCode: currentModuleCode.value,
    })
    if (res.code === 200) {
      ElMessage.success('流程已激活')
      getDeployRecordList()
    } else {
      ElMessage.error(res.data.msg || '激活失败')
    }
  } catch (error) {
    ElMessage.error(`激活失败：${error.message}`)
  }
}

// 失效部署记录
const handleInvalidDeploy = async (row) => {
  try {
    const res = await invalidDeploy({
      deployId: row.id,
      moduleCode: currentModuleCode.value,
    })
    if (res.code === 200) {
      ElMessage.success('流程已失效')
      getDeployRecordList()
    } else {
      ElMessage.error(res.data.msg || '失效失败')
    }
  } catch (error) {
    ElMessage.error(`失效失败：${error.message}`)
  }
}

// 加载步骤列表
const loadStepList = async () => {
  try {
    const res = await getStepList(currentModuleCode.value)
    if (res.code === 200) {
      const stepList = res.data || []
      const typeGroup = {}
      stepList.forEach((step) => {
        if (!typeGroup[step.stepType]) {
          typeGroup[step.stepType] = {
            id: `type_${step.stepType}`,
            stepName: step.stepTypeName,
            isTypeNode: true,
            stepTypeCount: 0,
            children: [],
          }
        }
        typeGroup[step.stepType].children.push(step)
        typeGroup[step.stepType].stepTypeCount = typeGroup[step.stepType].children.length
      })
      stepTreeData.value = Object.values(typeGroup)
    }
  } catch (error) {
    ElMessage.error(`加载步骤列表失败：${error.message}`)
  }
}

// 加载摄像头列表
const loadCameraList = async () => {
  try {
    const res = await getCameraList()
    if (res.code === 200) {
      cameraList.value = res.data || []
    }
  } catch (error) {
    ElMessage.error(`加载摄像头列表失败：${error.message}`)
  }
}

// 加载部署记录
const getDeployRecordList = async () => {
  try {
    if (!planForm.id) return
    const res = await getDeployRecord({
      planId: planForm.id,
      moduleCode: currentModuleCode.value,
    })
    if (res.code === 200) {
      deployRecordList.value = res.data || []
    }
  } catch (error) {
    ElMessage.error(`加载部署记录失败：${error.message}`)
  }
}

// 加载预案详情
const getPlanDetail = async () => {
  try {
    if (!planId.value) return
    const res = await getPlanById({ id: planId.value, moduleCode: currentModuleCode.value })
    if (res.code === 200) {
      const plan = res.data || {}
      Object.assign(planForm, plan)
      if (planForm.bpmnXml) {
        initBpmnModeler(planForm.bpmnXml)
      }
      getDeployRecordList()
    }
  } catch (error) {
    ElMessage.error(`加载预案详情失败：${error.message}`)
  }
}

// 监听预案名称/模块变化
watch([() => planForm.planName, () => currentModuleCode.value], () => {
  if (!planForm.id) {
    initBpmnModeler(initEmptyXml)
  }
})

// 页面初始化
onMounted(async () => {
  await loadStepList()
  await loadCameraList()
  // 初始化画布
  await initBpmnModeler()
  if (planId.value) {
    await getPlanDetail()
  }
})

// 页面卸载
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

/* 左侧步骤库面板 */
.step-library-panel {
  width: 320px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.step-library-card {
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

.step-tree {
  flex: 1;
  overflow-y: auto;
}

.custom-tree-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.step-code-tag {
  font-size: 12px;
  color: #909399;
  margin-left: 10px;
}

.step-type-tag {
  font-size: 11px;
  color: #409eff;
  margin-left: 5px;
  background: #ecf5ff;
  padding: 0 4px;
  border-radius: 2px;
}

/* 中间画布面板 */
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

/* 画布容器样式 */
.canvas-container {
  width: 100%;
  height: calc(100vh - 300px);
  border: 1px solid #e6e6e6;
  border-radius: 4px;
  overflow: hidden;
}

/* 右侧预案信息面板 */
.plan-info-panel {
  width: 350px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.info-card,
.deploy-record-card {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.upload-demo {
  margin-top: 10px;
}
</style>
