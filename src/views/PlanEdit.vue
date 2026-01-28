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
        <!-- 左侧：步骤库 + 节点替换操作 -->
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
              <p v-if="selectedCanvasNode?.flowableStepId">
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
              操作提示：1.从左侧图形栏拖拽节点→2.选中画布中的任务节点→3.选中左侧步骤→4.点击替换
            </div>
          </el-card>
        </div>

        <!-- 中间：完整BPMN画布（保留图形栏+ContextPad） -->
        <div class="flowable-canvas-panel">
          <el-card header="流程设计画布" class="canvas-card">
            <div class="canvas-toolbar">
              <el-button @click="handleSaveCanvas">保存画布</el-button>
              <el-button @click="handleRefreshCanvas">刷新画布</el-button>
              <el-button @click="handleAddDefaultTask">添加默认任务节点</el-button>
              <el-button type="info" @click="handleUndo">撤销</el-button>
              <el-button type="info" @click="handleRedo">重做</el-button>
            </div>
            <!-- BPMN画布容器（关键：不隐藏图形栏） -->
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

// 引入完整的bpmn-js（保留所有核心模块）
import BpmnModeler from 'bpmn-js/lib/Modeler'
import 'bpmn-js/dist/assets/bpmn-js.css'
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css'

// Flowable扩展（保留完整支持，lowable+BPMN 模型器联动的必备配置，且完全透明无隐式写入）
// 作用仅仅让 bpmn-js 能识别 Flowable 的自定义属性（如flowable:stepId/flowable:moduleCode）
import flowableModdle from 'flowable-bpmn-moddle/resources/camunda.json'

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
let bpmnModeler = null // BPMN模型器实例

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
    <sequenceFlow id="flow_start_end" sourceRef="startEvent" targetRef="endEvent"/>
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_emergencyPlanProcess">
    <bpmndi:BPMNPlane id="BPMNPlane_emergencyPlanProcess" bpmnElement="emergencyPlanProcess">
      <bpmndi:BPMNShape id="BPMNShape_startEvent" bpmnElement="startEvent">
        <dc:Bounds x="200" y="200" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="BPMNShape_endEvent" bpmnElement="endEvent">
        <dc:Bounds x="600" y="200" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="BPMNEdge_flow_start_end" bpmnElement="flow_start_end">
        <di:waypoint x="236" y="218"/>
        <di:waypoint x="600" y="218"/>
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`

// 测试流程模板（含网关/多任务）
const testXml = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:flowable="http://flowable.org/bpmn" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" targetNamespace="http://www.flowable.org/processdef">
  <process id="emergencyPlanProcess" name="应急预案流程" isExecutable="true">
    <startEvent id="startEvent" name="开始">
      <outgoing>Flow_13ulyn7</outgoing>
    </startEvent>
    <endEvent id="endEvent" name="结束">
      <incoming>Flow_1eudd50</incoming>
    </endEvent>
    <userTask id="Activity_0bdud75" name="初期灭火设备启动（处置）" flowable:stepId="6ff9dd42c1e84365baccaffafe5e7079" flowable:stepCode="1-3" flowable:stepType="dispose" flowable:moduleCode="emergency" flowable:stepName="初期灭火设备启动">
      <incoming>Flow_0y2lt12</incoming>
      <outgoing>Flow_1emcl4y</outgoing>
    </userTask>
    <userTask id="Activity_0x8nyw1" name="现场人员上报（处置）" flowable:stepId="1f64993a5f03ac0f136df24b137010ed" flowable:stepCode="1-2" flowable:stepType="dispose" flowable:moduleCode="emergency" flowable:stepName="现场人员上报">
      <incoming>Flow_1v3h28r</incoming>
      <outgoing>Flow_1fcv7u9</outgoing>
    </userTask>
    <userTask id="Activity_19qgx7c" name="危险源切断（处置）" flowable:stepId="f02a384267b060afb2ef84aeb044d695" flowable:stepCode="1-1" flowable:stepType="dispose" flowable:moduleCode="emergency" flowable:stepName="危险源切断">
      <incoming>Flow_0bwbm6a</incoming>
      <outgoing>Flow_0hfxp5r</outgoing>
    </userTask>
    <sequenceFlow id="Flow_1fcv7u9" sourceRef="Activity_0x8nyw1" targetRef="Activity_0hc1b4y" />
    <sequenceFlow id="Flow_1emcl4y" sourceRef="Activity_0bdud75" targetRef="Activity_0hc1b4y" />
    <userTask id="Activity_0hc1b4y" name="快速上报（上报）" flowable:stepId="6d07bb490fe029c2cd85d463dcf7ac10" flowable:stepCode="2-1" flowable:stepType="report" flowable:moduleCode="emergency" flowable:stepName="快速上报">
      <incoming>Flow_0hfxp5r</incoming>
      <incoming>Flow_1emcl4y</incoming>
      <incoming>Flow_1fcv7u9</incoming>
      <outgoing>Flow_1eudd50</outgoing>
    </userTask>
    <userTask id="Activity_15vva0h" name="预警预警（预警）" flowable:stepId="40bf0196d7db51895101c25391a63a77" flowable:stepCode="3-1" flowable:stepType="warn" flowable:moduleCode="emergency" flowable:stepName="预警预警">
      <incoming>Flow_13ulyn7</incoming>
      <outgoing>Flow_01w7uds</outgoing>
    </userTask>
    <sequenceFlow id="Flow_13ulyn7" sourceRef="startEvent" targetRef="Activity_15vva0h" />
    <exclusiveGateway id="Gateway_1myf8pv">
      <incoming>Flow_01w7uds</incoming>
      <outgoing>Flow_1v3h28r</outgoing>
      <outgoing>Flow_0y2lt12</outgoing>
      <outgoing>Flow_0bwbm6a</outgoing>
    </exclusiveGateway>
    <sequenceFlow id="Flow_1v3h28r" sourceRef="Gateway_1myf8pv" targetRef="Activity_0x8nyw1" />
    <sequenceFlow id="Flow_0y2lt12" sourceRef="Gateway_1myf8pv" targetRef="Activity_0bdud75" />
    <sequenceFlow id="Flow_0bwbm6a" sourceRef="Gateway_1myf8pv" targetRef="Activity_19qgx7c" />
    <sequenceFlow id="Flow_0hfxp5r" sourceRef="Activity_19qgx7c" targetRef="Activity_0hc1b4y" />
    <sequenceFlow id="Flow_01w7uds" sourceRef="Activity_15vva0h" targetRef="Gateway_1myf8pv" />
    <sequenceFlow id="Flow_1eudd50" sourceRef="Activity_0hc1b4y" targetRef="endEvent" />
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_emergencyPlanProcess">
    <bpmndi:BPMNPlane id="BPMNPlane_emergencyPlanProcess" bpmnElement="emergencyPlanProcess">
      <bpmndi:BPMNShape id="BPMNShape_startEvent" bpmnElement="startEvent">
        <dc:Bounds x="200" y="200" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="206" y="243" width="23" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="BPMNShape_endEvent" bpmnElement="endEvent">
        <dc:Bounds x="1172" y="200" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="1178" y="243" width="23" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_0bdud75_di" bpmnElement="Activity_0bdud75">
        <dc:Bounds x="740" y="300" width="120" height="80" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_0x8nyw1_di" bpmnElement="Activity_0x8nyw1">
        <dc:Bounds x="740" y="60" width="120" height="80" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_19qgx7c_di" bpmnElement="Activity_19qgx7c">
        <dc:Bounds x="740" y="178" width="120" height="80" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_0hc1b4y_di" bpmnElement="Activity_0hc1b4y">
        <dc:Bounds x="930" y="178" width="120" height="80" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_15vva0h_di" bpmnElement="Activity_15vva0h">
        <dc:Bounds x="370" y="178" width="120" height="80" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_1myf8pv_di" bpmnElement="Gateway_1myf8pv" isMarkerVisible="true">
        <dc:Bounds x="565" y="193" width="50" height="50" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1fcv7u9_di" bpmnElement="Flow_1fcv7u9">
        <di:waypoint x="860" y="90" />
        <di:waypoint x="1000" y="90" />
        <di:waypoint x="1000" y="178" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_1emcl4y_di" bpmnElement="Flow_1emcl4y">
        <di:waypoint x="860" y="340" />
        <di:waypoint x="990" y="340" />
        <di:waypoint x="990" y="258" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_13ulyn7_di" bpmnElement="Flow_13ulyn7">
        <di:waypoint x="236" y="218" />
        <di:waypoint x="370" y="218" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_1v3h28r_di" bpmnElement="Flow_1v3h28r">
        <di:waypoint x="590" y="193" />
        <di:waypoint x="590" y="100" />
        <di:waypoint x="740" y="100" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_0y2lt12_di" bpmnElement="Flow_0y2lt12">
        <di:waypoint x="590" y="243" />
        <di:waypoint x="590" y="360" />
        <di:waypoint x="740" y="360" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_0bwbm6a_di" bpmnElement="Flow_0bwbm6a">
        <di:waypoint x="615" y="218" />
        <di:waypoint x="740" y="218" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_0hfxp5r_di" bpmnElement="Flow_0hfxp5r">
        <di:waypoint x="860" y="218" />
        <di:waypoint x="930" y="218" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_01w7uds_di" bpmnElement="Flow_01w7uds">
        <di:waypoint x="490" y="218" />
        <di:waypoint x="565" y="218" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_1eudd50_di" bpmnElement="Flow_1eudd50">
        <di:waypoint x="1050" y="218" />
        <di:waypoint x="1172" y="218" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`

// 初始化BPMN模型器（核心：保留所有模块+解决事件冲突）
const initBpmnModeler = async (xml = testXml) => {
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

    // 3. 初始化完整Modeler（保留所有核心模块，解决ContextPad冲突）
    bpmnModeler = new BpmnModeler({
      container: bpmnContainer.value,
      // 仅注册Flowable扩展schema，让模型器识别flowable:*属性，无任何写入操作
      moddleExtensions: {
        flowable: flowableModdle
      },
      // 启用所有核心模块（解决ContextPad/图形栏冲突）
      keyboard: {
        bindTo: document,
        focusOnStart: true
      },
      contextPad: { enabled: true }, // 右键菜单
      palette: { enabled: true },    // 图形栏（完整保留）
      zoomScroll: { enabled: true }, // 缩放
      selection: { enabled: true },  // 选中
      connect: { enabled: true },    // 连线
      resize: { enabled: true },     // 调整大小
      // 禁用重复模块（解决配置冲突）
      disableStackTools: false
    })

    // 4. 导入XML
    const result = await bpmnModeler.importXML(xml)
    const { warnings } = result
    if (warnings.length > 0) {
      console.warn('BPMN导入警告：', warnings)
    }

    // 5. 事件监听（解决原生事件与自定义事件冲突）
    const eventBus = bpmnModeler.get('eventBus')
    const selection = bpmnModeler.get('selection')

    // 先移除旧监听（解决重复监听冲突）
    eventBus.off('element.select')
    eventBus.off('selection.changed')
    eventBus.off('element.click')

    // 核心：监听原生选中事件（不阻断ContextPad）
    eventBus.on('selection.changed', (e) => {
      const selectedElements = selection.get() || []
      const element = selectedElements[0]

      if (element) {
        // 仅同步自定义状态，不修改原生逻辑（解决ContextPad冲突）
        const nodeType = element.type || element.$type || element.businessObject?.$type || ''
        const flowableStepId = element.businessObject?.['flowable:stepId'] || ''

        selectedCanvasNode.value = {
          id: element.id,
          name: element.businessObject?.name || element.name || '未命名',
          type: nodeType,
          flowableStepId: flowableStepId,
          rawElement: element // 保留原始引用（不写入XML）
        }

        // 非用户任务清空步骤（不影响其他节点）
        if (nodeType !== 'bpmn:UserTask') {
          selectedStep.value = null
          activeStepId.value = ''
        }
      } else {
        // 未选中时清空状态
        selectedCanvasNode.value = null
        selectedStep.value = null
        activeStepId.value = ''
      }
    })

    // 兜底监听点击事件（解决选中冲突）
    eventBus.on('element.click', (e) => {
      if (e.element) {
        selection.deselectAll()
        selection.select(e.element)
      }
    })

    // 6. 适配画布
    const canvas = bpmnModeler.get('canvas')
    canvas.zoom('fit-viewport')
    ElMessage.success('BPMN画布初始化完成（图形栏+右键菜单已启用）')
  } catch (e) {
    ElMessage.error(`画布初始化失败：${e.message}`)
    console.error('初始化详情：', e)
    bpmnModeler = null
  }
}

// 加载步骤信息
const loadStepInfoById = async (stepId) => {
  try {
    const res = await getStepNameByIds(Array.isArray(stepId) ? stepId : [stepId])
    if (res.code === 200 && res.data?.length) {
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
      ElMessage.warning(`未找到步骤ID：${stepId}`)
    }
  } catch (e) {
    console.error('加载步骤失败：', e)
    selectedStep.value = null
    activeStepId.value = ''
    ElMessage.error(`加载步骤失败：${e.message}`)
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

// 步骤搜索
const handleStepSearch = () => {
  stepTreeRef.value.filter(stepSearchKey.value)
}

// 选中步骤
const handleStepNodeClick = (data) => {
  if (data.isTypeNode) {
    ElMessage.info('请选择具体步骤（非分类）')
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

  ElMessage.success(`选中步骤：${data.stepName}`)

  // 提示非用户任务节点
  if (selectedCanvasNode.value?.type !== 'bpmn:UserTask') {
    ElMessage.warning('当前选中的不是用户任务节点，无法替换')
  }
}

// 替换节点（核心：解决属性写入冲突）
const handleReplaceNodeWithStep = () => {
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
  if (!selectedStep.value) {
    ElMessage.warning('请先选中左侧步骤')
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

    // 写入属性（解决Flowable属性冲突）
    const newName = `${selectedStep.value.stepName}（${selectedStep.value.stepTypeName}）`
    const stepProps = {
      stepId: selectedStep.value.id,
      stepCode: selectedStep.value.stepCode,
      stepType: selectedStep.value.stepType,
      moduleCode: currentModuleCode.value,
      stepName: selectedStep.value.stepName,
    }

    // 同步写入properties和flowable属性（解决属性丢失冲突）
    node.properties = { ...node.properties, ...stepProps }
    // 仅在你点击“替换节点”时，才会显式写入flowable属性，无任何隐式操作
    modeling.updateProperties(node, {
      name: newName,
      'flowable:stepId': selectedStep.value.id,
      'flowable:stepCode': selectedStep.value.stepCode,
      'flowable:stepType': selectedStep.value.stepType,
      'flowable:moduleCode': currentModuleCode.value,
      'flowable:stepName': selectedStep.value.stepName,
    })

    // 更新自定义状态
    selectedCanvasNode.value.name = newName
    selectedCanvasNode.value.flowableStepId = selectedStep.value.id
    ElMessage.success(`节点替换成功：${newName}`)
  } catch (e) {
    ElMessage.error(`替换失败：${e.message}`)
    console.error('替换详情：', e)
  }
}

// 添加默认任务节点（解决节点添加冲突）
const handleAddDefaultTask = () => {
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
    const moddle = bpmnModeler.get('moddle')
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
    const taskBo = moddle.create('bpmn:UserTask', {
      id: taskId,
      name: '未命名任务'
    })

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

    // 创建连线（解决连线冲突）
    if (lastTaskNode) {
      const flow1Id = `flow_${lastTaskNode.id}_${task.id}`
      modeling.connect(lastTaskNode, task, {
        id: flow1Id,
        type: 'bpmn:SequenceFlow'
      })
      // 删除旧连线
      const oldEndFlows = elementRegistry.getAll().filter(el =>
        el.type === 'bpmn:SequenceFlow' && el.source === lastTaskNode && el.target === endEvent
      )
      oldEndFlows.forEach(flow => modeling.removeElements([flow]))
    } else {
      const flow1Id = `flow_${startEvent.id}_${task.id}`
      modeling.connect(startEvent, task, {
        id: flow1Id,
        type: 'bpmn:SequenceFlow'
      })
      // 删除默认连线
      const defaultFlow = elementRegistry.get('flow_start_end')
      if (defaultFlow) modeling.removeElements([defaultFlow])
    }

    // 连接到结束节点
    const flow2Id = `flow_${task.id}_${endEvent.id}`
    modeling.connect(task, endEvent, {
      id: flow2Id,
      type: 'bpmn:SequenceFlow',
      waypoints: [
        { x: task.x + 120, y: task.y + 40 },
        { x: endEvent.x, y: endEvent.y + 18 }
      ]
    })

    // 适配画布+选中节点
    canvas.zoom('fit-viewport')
    setTimeout(() => {
      if (task && selection) {
        selection.deselectAll()
        selection.select(task)
        selectedCanvasNode.value = {
          id: task.id,
          name: task.name || '未命名',
          type: task.type,
          flowableStepId: ''
        }
      }
    }, 300)

    ElMessage.success('默认任务节点添加成功（可拖拽其他节点）')
  } catch (e) {
    ElMessage.error(`添加节点失败：${e.message}`)
    console.error('添加节点详情：', e)
  }
}

// 撤销/重做（解决命令栈冲突）
const handleUndo = () => {
  if (!bpmnModeler) {
    ElMessage.warning('画布未初始化')
    return
  }
  const commandStack = bpmnModeler.get('commandStack')
  if (commandStack.canUndo()) {
    commandStack.undo()
    ElMessage.success('已撤销操作')
  } else {
    ElMessage.info('无可撤销操作')
  }
}

const handleRedo = () => {
  if (!bpmnModeler) {
    ElMessage.warning('画布未初始化')
    return
  }
  const commandStack = bpmnModeler.get('commandStack')
  if (commandStack.canRedo()) {
    commandStack.redo()
    ElMessage.success('已重做操作')
  } else {
    ElMessage.info('无可重做操作')
  }
}

// 模块切换
const handleModuleChange = () => {
  loadStepList()
  initBpmnModeler(planForm.bpmnXml || testXml)
}

// 保存画布
const handleSaveCanvas = async () => {
  if (!bpmnModeler) {
    ElMessage.error('画布未初始化')
    return
  }
  try {
    const { xml } = await bpmnModeler.saveXML({ format: true })
    planForm.bpmnXml = xml
    ElMessage.success('BPMN XML已保存')
  } catch (e) {
    ElMessage.error(`保存画布失败：${e.message}`)
    console.error(e)
  }
}

// 刷新画布
const handleRefreshCanvas = () => {
  initBpmnModeler(planForm.bpmnXml || testXml)
}

// 保存预案 - 修复 planStepRelations 为空的问题
const handleSavePlan = async () => {
  try {
    await planFormRef.value.validate()

    // ========== 修复后的核心逻辑 ==========
    const planStepRelations = []
    if (bpmnModeler) {
      // 1. 先保存画布（确保 XML 和节点属性同步）
      await handleSaveCanvas()

      // 2. 获取所有节点（精准过滤用户任务节点）
      const elementRegistry = bpmnModeler.get('elementRegistry')
      const allElements = elementRegistry.getAll()

      // 3. 遍历节点，正确读取 Flowable 属性
      allElements.forEach(el => {
        // 精准判断：用户任务节点
        const isUserTask = el.businessObject?.$type === 'bpmn:UserTask'
        if (!isUserTask) return

        // 正确读取 flowable:* 属性（关键修复）
        const stepId = el.businessObject?.$attrs?.['flowable:stepId'] || el.properties?.stepId
        const stepType = el.businessObject?.$attrs?.['flowable:stepType'] || el.properties?.stepType

        // 只有绑定了 stepId 的节点才加入关联列表
        if (stepId) {
          planStepRelations.push({
            planId: planForm.id,
            stepId: stepId,
            stepType: stepType || '',
            flowNodeId: el.id, // 节点ID
            flowNodeName: el.businessObject?.name || '未命名节点' // 可选：增加节点名称，便于排查
          })
        }
      })

      // 调试：打印收集到的关联关系（方便你排查）
      console.log('收集到的 planStepRelations：', planStepRelations)
    }
    // ========== 修复结束 ==========

    // 生成ID（解决ID冲突）
    if (!planForm.id) {
      planForm.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
    }

    // 保存数据
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
    ElMessage.error(`保存失败：${error.message}`)
  }
}
// 部署流程
const handleDeployPlan = async () => {
  try {
    if (!planForm.id) {
      ElMessage.warning('请先保存预案')
      return
    }

    await ElMessageBox.confirm('确定部署流程？部署后Flowable生效', '确认', {
      type: 'warning'
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
const handleImportSuccess = (response) => {
  if (response.code === 200) {
    ElMessage.success('BPMN导入成功')
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

    // 重置状态
    selectedCanvasNode.value = null
    selectedStep.value = null
    activeStepId.value = ''

    // 重置画布
    initBpmnModeler(testXml)
    ElMessage.success('数据已清空')
  } catch (e) {
    ElMessage.info('已取消清空')
  }
}

// 激活/失效部署
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

      stepList.forEach(step => {
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
    ElMessage.error(`加载步骤失败：${error.message}`)
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
    ElMessage.error(`加载摄像头失败：${error.message}`)
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
    ElMessage.error(`加载预案失败：${error.message}`)
  }
}

// 监听变化
watch([() => planForm.planName, () => currentModuleCode.value], () => {
  if (!planForm.id) {
    initBpmnModeler(testXml)
  }
})

// 页面初始化
onMounted(async () => {
  await loadStepList()
  await loadCameraList()
  await initBpmnModeler()
  if (planId.value) {
    await getPlanDetail()
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

/* 左侧步骤库 */
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

/* 解决BPMN原生样式冲突 */
:deep(.djs-palette) {
  z-index: 2; /* 图形栏层级 */
}
:deep(.djs-context-pad) {
  z-index: 3; /* 右键菜单层级 */
}
:deep(.djs-element) {
  cursor: pointer;
}
</style>
