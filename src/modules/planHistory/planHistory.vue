<template>
  <div class="plan-history-container">
    <!-- 页面头部 -->
    <el-page-header
      content="历史记录"
      style="margin-bottom: 20px"
    ></el-page-header>

    <!-- 搜索区域 -->
    <el-card class="query-card" shadow="never">

          <el-form :inline="true" :model="searchForm" class="query-form" style="display: flex; justify-content: space-between; align-items: center;">
          <div class="form-items">
            <el-form-item label="预案名称">
            <el-input
              v-model="searchForm.planName"
              placeholder="请输入预案名称"
              clearable
              style="width: 200px"
            />
          </el-form-item>

          <el-form-item label="开始时间">
            <el-date-picker
              v-model="searchForm.startTime"
              type="datetime"
              placeholder="选择开始时间"
              value-format="YYYY-MM-DDTHH:mm:ss.SSSSSS"
              style="width: 200px"
            />
          </el-form-item>

          <el-form-item label="结束时间">
            <el-date-picker
              v-model="searchForm.endTime"
              type="datetime"
              placeholder="选择结束时间"
              value-format="YYYY-MM-DDTHH:mm:ss.SSSSSS"
              style="width: 200px"
            />
          </el-form-item>
          </div>


        <div class="form-buttons">
          <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </div>
 </el-form>
    </el-card>

    <!-- 数据表格区域 -->
    <el-card class="table-card" shadow="never">
      <el-table
        :data="tableData"
        stripe
        border
        style="width: 100%"
        v-loading="loading"
      >
        <el-table-column type="index" label="编号" width="60" align="center" />

        <el-table-column prop="planName" label="预案名称" min-width="180" show-overflow-tooltip />

        <el-table-column prop="planType" label="预案类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getPlanTypeTag(row.planType)" size="small">
              {{ getPlanTypeName(row.planType) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="station" label="车站" width="100" align="center" />

        <el-table-column prop="startTime" label="开始日期" width="170" align="center">
          <template #default="{ row }">
            {{ formatDateTime(row.startTime) }}
          </template>
        </el-table-column>

        <el-table-column prop="endTime" label="结束日期" width="170" align="center">
          <template #default="{ row }">
            {{ formatDateTime(row.endTime) }}
          </template>
        </el-table-column>

        <el-table-column prop="optName" label="操作员" width="100" align="center" />

        <el-table-column label="操作" width="80" align="center" fixed="right">
          <template #default="{ row }">
            <el-button
              type="success"
              size="small"
              circle
              @click="handleView(row)"
              title="查看详情"
            >
              <el-icon><View /></el-icon>
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 无数据提示 -->
      <el-empty
        v-if="!loading && tableData.length === 0"
        description="暂无数据"
        :image-size="150"
      />

      <!-- 分页 -->
      <el-pagination
        v-if="total > 0"
        v-model:current-page="pagination.pageNum"
        v-model:page-size="pagination.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
        style="margin-top: 20px; justify-content: flex-end"
      />
    </el-card>

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="预案执行详情"
      width="600px"
      destroy-on-close
    >
      <el-descriptions :column="2" border v-if="currentRow">
        <el-descriptions-item label="预案ID">{{ currentRow.planId }}</el-descriptions-item>
        <el-descriptions-item label="预案名称">{{ currentRow.planName }}</el-descriptions-item>
        <el-descriptions-item label="预案类型">
          <el-tag :type="getPlanTypeTag(currentRow.planType)">
            {{ getPlanTypeName(currentRow.planType) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="车站">{{ currentRow.station }}</el-descriptions-item>
        <el-descriptions-item label="操作员">{{ currentRow.optName }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDateTime(currentRow.createTime) }}</el-descriptions-item>
        <el-descriptions-item label="开始时间">{{ formatDateTime(currentRow.startTime) }}</el-descriptions-item>
        <el-descriptions-item label="结束时间">{{ formatDateTime(currentRow.endTime) }}</el-descriptions-item>
        <el-descriptions-item label="摄像头ID" :span="2">{{ currentRow.cameraIds || '-' }}</el-descriptions-item>
        <el-descriptions-item label="流程实例ID" :span="2">{{ currentRow.hiProcInstId }}</el-descriptions-item>
      </el-descriptions>

      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import { getPlanHistory } from './planHistory.route.js'

// 搜索表单
const searchForm = reactive({
  planName: '',
  startTime: '',
  endTime: ''
})

// 表格数据
const allTableData = ref([]) // 存储所有数据
const loading = ref(false)

// 分页
const pagination = reactive({
  pageNum: 1,
  pageSize: 10
})

// 详情弹窗
const detailDialogVisible = ref(false)
const currentRow = ref(null)

// 预案类型映射
const planTypeMap = {
  FLOOD: { name: '防汛', type: 'warning' },
  FIRE: { name: '火灾', type: 'danger' },
  CROWD_FLOW: { name: '大客流', type: 'info' },
  PUBLIC_HEALTH: { name: '公共卫生', type: 'success' }
}

// 获取预案类型名称
const getPlanTypeName = (type) => {
  return planTypeMap[type]?.name || type
}

// 获取预案类型标签样式
const getPlanTypeTag = (type) => {
  return planTypeMap[type]?.type || 'info'
}

// 格式化日期时间
const formatDateTime = (dateTime) => {
  if (!dateTime) return '-'
  return dayjs(dateTime).format('YYYY-MM-DD HH:mm:ss')
}

// 计算当前页显示的数据（前端分页）
const tableData = computed(() => {
  const start = (pagination.pageNum - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  return allTableData.value.slice(start, end)
})

// 计算总记录数
const total = computed(() => allTableData.value.length)

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    // 构建查询参数
    const params = {}

    if (searchForm.planName) {
      params.planName = searchForm.planName
    }
    if (searchForm.startTime) {
      params.startTime = searchForm.startTime
    }
    if (searchForm.endTime) {
      params.endTime = searchForm.endTime
    }

    // 调用接口获取所有数据
    const res = await getPlanHistory(params)

    if (res.code === 200) {
      allTableData.value = res.data || []
      // 重置到第一页
      pagination.pageNum = 1

      if (allTableData.value.length === 0) {
        ElMessage.info('暂无数据')
      }
    } else {
      ElMessage.error(res.msg || '加载失败')
    }
  } catch (error) {
    console.error('加载数据失败:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

// 查询
const handleSearch = () => {
  loadData()
}

// 重置
const handleReset = () => {
  searchForm.planName = ''
  searchForm.startTime = ''
  searchForm.endTime = ''
  loadData()
}

// 查看详情
const handleView = (row) => {
  currentRow.value = row
  detailDialogVisible.value = true
}

// 分页大小改变
const handleSizeChange = (val) => {
  pagination.pageSize = val
  pagination.pageNum = 1 // 切换每页条数时回到第一页
}

// 当前页改变
const handleCurrentChange = (val) => {
  pagination.pageNum = val
}

// 初始化
onMounted(() => {
  loadData()
})
</script>

<style scoped>
.plan-history-container {
  padding: 20px;
}

.query-card {
  margin-bottom: 20px;
}

.query-form {
  margin: 0;
}

.form-items {
  display: flex;
  align-items: center;
}
/* 搜索表单容器，使用flex布局 */
.search-form-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 40px;
}

.form-buttons {
  display: flex;
  align-items: center;
}


.table-card {
  min-height: 400px;
}
</style>
