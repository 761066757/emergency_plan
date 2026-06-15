<template>
  <div class="plan-list">
    <!-- 页面头部 -->
    <el-page-header
      content="预案列表"
      style="margin-bottom: 20px"
    ></el-page-header>

    <!-- 查询条件 -->
    <el-card class="query-card">
      <el-form :inline="true" :model="queryForm" class="query-form" style="display: flex; justify-content: space-between; align-items: center;">
        <div class="form-items">
          <el-form-item label="预案名称">
            <el-input
              v-model="queryForm.planName"
              placeholder="请输入预案名称"
              clearable
              @keyup.enter="getPlanListFunc"
              style="width: 180px;"
            />
          </el-form-item>
          <el-form-item label="预案状态">
            <el-select
              v-model="queryForm.planStatus"
              placeholder="请选择预案状态"
              clearable
              style="width: 150px;"
            >
              <el-option
                v-for="item in PLAN_STATUS_ENUMS"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              ></el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="预案类型">
            <el-select
              v-model="queryForm.planType"
              placeholder="请选择预案类型"
              clearable
              style="width: 150px;"
            >
              <el-option
                v-for="item in PLAN_TYPE_ENUMS"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              ></el-option>
            </el-select>
          </el-form-item>
        </div>
        <div class="form-buttons">
          <el-form-item>
            <el-button type="primary" @click="getPlanListFunc">查询</el-button>
            <el-button @click="resetQuery">重置</el-button>
          </el-form-item>
        </div>
      </el-form>
    </el-card>

    <!-- 卡片列表 -->
    <el-row :gutter="20">
      <el-col :span="8" v-for="plan in planList" :key="plan.planId">
        <el-card class="plan-card" shadow="hover" @click="viewPlanFunc(plan)">
          <!-- 右上角操作菜单 -->
          <el-dropdown v-if="plan.planStatus !== 2" trigger="click" placement="bottom-end" class="card-menu">
            <el-icon size="20" style="cursor: pointer;" @click.stop><MoreFilled /></el-icon>
            <template #dropdown>
              <el-dropdown-menu>
                <!-- 编辑和发布：仅未发布状态可用 (假设 0 为未发布) -->
                <el-dropdown-item
                  :disabled="plan.planStatus === 1"
                  @click="editPlanFunc(plan.planId)"
                >编辑</el-dropdown-item>
                <!-- 发布 = 部署 -->
                <el-dropdown-item
                  :disabled="plan.planStatus === 1"
                  @click="deployPlanFunc(plan.planId)"
                >发布</el-dropdown-item>
                <!-- 撤回和演练：仅已发布中状态可用 -->
                <el-dropdown-item
                  :disabled="plan.planStatus === 0"
                  @click="revokePlanFunc(plan.planId)"
                >撤回</el-dropdown-item>
                <el-dropdown-item
                  :disabled="plan.planStatus === 0"
                  @click="exercisePlanFunc(plan.planId)"
                >演练</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>

          <!-- 第1行：预案名称、预案类型、状态 -->
          <div class="card-row-1">
            <span class="plan-name">{{ plan.planName }}</span>
            <el-tag
              :type="getPlanTypeType(plan.planType)"
              size="small"
              class="plan-type-tag"
            >{{ getPlanTypeLabel(plan.planType) }}</el-tag>
            <el-tag
              :type="getPlanStatusType(plan.planStatus)"
              size="small"
              class="plan-status-tag"
            >{{ getPlanStatusLabel(plan.planStatus) }}</el-tag>
          </div>

          <!-- 第2行：创建时间 -->
          <div class="card-row-2">
            <span class="create-time">{{ formatDate(plan.planCreateTime) }}</span>
          </div>

          <!-- 第3行：预案描述 -->
          <div class="card-row-3">
            <p class="plan-desc">{{ plan.planDesc || '暂无描述' }}</p>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 预案详情弹窗 -->
    <ViewPlanDialog
      :visible="viewDialogVisible"
      @update:visible="handleDialogVisibilityChange"
      :plan-data="currentPlan"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { MoreFilled } from '@element-plus/icons-vue'
import dayjs from 'dayjs'  // 引入 dayjs
import {
  deployPlan as deployProcessPlan,
  revokePlan as revokeProcessPlan,
} from './planList.route'

import { getPlanList } from '../planEdit/planEdit.route'

// 引入枚举配置
import {
  PLAN_TYPE_ENUMS,
  PLAN_STATUS_ENUMS,
  getPlanTypeLabel,
  getPlanTypeType,
  getPlanStatusLabel,
  getPlanStatusType
} from '@/config/planEnums'

// 引入详情弹窗组件
import ViewPlanDialog from './ViewPlanDialog.vue'

// 查询表单
const queryForm = ref({
  planName: '',
  planStatus: '',
  planType: ''
})

// 状态定义
const planList = ref([])
const viewDialogVisible = ref(false)
const currentPlan = ref({})

// 路由实例
const router = useRouter()

// 格式化日期时间
const formatDate = (dateString) => {
  if (!dateString) return '暂无时间'
  return dayjs(dateString).format('YYYY-MM-DD HH:mm:ss')
}

// 编辑预案 - 跳转到编辑页面并携带planId参数
const editPlanFunc = (planId) => {
  if (!planId) {
    ElMessage.warning('预案ID不存在')
    return
  }
  // 跳转到编辑页面，携带planId参数
  router.push({
    path: '/plan/edit',
    query: { id: planId }
  })
}

// 重置查询
const resetQuery = () => {
  queryForm.value.planName = ''
  queryForm.value.planStatus = ''
  queryForm.value.planType = ''
  getPlanListFunc('resetQuery')
}

// 获取预案列表
const getPlanListFunc = async (caller = 'unknown') => {
  console.log(`[DEBUG] getPlanListFunc 被调用，调用者: ${caller}`)
  try {
    const res = await getPlanList(queryForm.value)
    if (res.code === 200) {
      planList.value = res.data
    }
  } catch (e) {
    ElMessage.error('获取预案列表失败：' + (e.message || e))
  }
}

// 查看预案
const viewPlanFunc = async (plan) => {
  currentPlan.value = plan
  viewDialogVisible.value = true
}

// 处理弹窗可见性变化
const handleDialogVisibilityChange = (val) => {
  // 防止重复调用：如果当前状态与目标状态一致，直接返回
  if (viewDialogVisible.value === val) {
    return
  }

  viewDialogVisible.value = val
  // 只有在弹窗关闭时才重新查询预案列表
  if (!val) {
    getPlanListFunc('handleDialogVisibilityChange')
  }
}

// 部署预案
const deployPlanFunc = async (planId) => {
  try {
    await ElMessageBox.confirm('确定要部署该流程吗？部署后将在Flowable中生效', '部署确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })


    const res = await deployProcessPlan(planId)

    if (res.code === 200) {
      ElMessage.success('流程部署成功')
      // 部署成功后，重新查询预案列表以更新状态
      await getPlanListFunc('deployPlanFunc')
    } else {
      ElMessage.error(res.data.msg || '部署失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(`部署失败：${error.message}`)
    }
  }
}

// 撤回预案
const revokePlanFunc = async (planId) => {
  try {
    await ElMessageBox.confirm('确定要撤回该预案吗？', '撤回确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    const res = await revokeProcessPlan(planId)

    if (res.code === 200) {
      ElMessage.success('流程撤回成功')
      // 撤回成功后，重新查询预案列表以更新状态
      await getPlanListFunc('revokePlanFunc')
    } else {
      ElMessage.error(res.data.msg || '撤回失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(`撤回失败：${error.message}`)
    }
  }
}


// 页面加载
onMounted(() => {
  getPlanListFunc('onMounted')
})
</script>

<style scoped>
.plan-list {
  padding: 20px;
}
.query-card {
  margin-bottom: 20px;
}
.query-form {
  margin: 0;
}
.query-form .el-form-item {
  margin-right: 20px;
  margin-bottom: 0;
}
.form-items {
  display: flex;
  align-items: center;
}
.form-buttons {
  display: flex;
  align-items: center;
}

/* 卡片样式 */
.plan-card {
  position: relative;
  margin-bottom: 20px;
  min-height: 200px;
}

.card-menu {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
}

.card-row-1 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  padding-right: 40px;
}

.plan-name {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}

.plan-type-tag {
  margin-left: 0;
}

.plan-status-tag {
  margin-left: auto;
}

.card-row-2 {
  margin-bottom: 10px;
  color: #909399;
  font-size: 14px;
}

.create-time {
  color: #606266;
}

.card-row-3 {
  margin-top: 10px;
}

.plan-desc {
  color: #606266;
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
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
