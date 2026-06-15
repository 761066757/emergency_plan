<!-- 任务配置页面 -->
<template>
  <div class="task-config">
    <!-- 页面头部 -->
    <el-page-header
      content="任务配置"
      style="margin-bottom: 20px"
    ></el-page-header>
    <el-card>
      <!-- 左侧任务类型树 + 右侧任务配置 -->
      <div style="display: flex; height: calc(100vh - 200px);">
        <!-- 左侧：任务类型树形结构 -->
        <div style="width: 250px; border-right: 1px solid #ebeef5; padding: 10px;">
          <div class="task-type-tree">
            <el-button
              type="primary"
              @click="addNewTaskType"
              style="width: 100%; margin-bottom: 10px;"
            >
              新增任务类型
            </el-button>
            <el-divider />
            <el-tree
              :data="taskTypeTree"
              :props="treeProps"
              @node-click="handleTreeNodeClick"
              node-key="value"
              :default-expanded-keys="defaultExpandedKeys"
              highlight-current
              ref="treeRef"
              :expand-on-click-node="false"
            >
              <template #default="{ data }">
                <span>{{ data.label }}</span>
                <span v-if="data.children && data.children.length > 0" style="margin-left: 5px; color: #999;">
                  ({{ data.children.length }})
                </span>
              </template>
            </el-tree>
          </div>
        </div>

        <!-- 右侧：任务配置区域 -->
        <div style="flex: 1; padding: 10px; overflow-y: auto;">
          <!-- 顶部操作栏 -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div>
              <el-button
                v-if="selectedTreeNode && !selectedTreeNode.isLeaf"
                type="primary"
                @click="addNewTaskRow"
              >
                添加任务
              </el-button>
            </div>
          </div>

          <!-- 当前选中的任务类型显示区 -->
          <div v-if="selectedTreeNode && !selectedTreeNode.isLeaf" class="current-task-type-bar">
            <el-tag size="large" type="primary" effect="dark">
              当前任务类型：{{ selectedTreeNode.label }}
            </el-tag>
            <el-button
              type="text"
              @click="clearSelection"
              style="margin-left: 10px;"
            >
              清除筛选
            </el-button>
          </div>

          <!-- 任务表格（可编辑） -->
          <el-table
            :data="filteredTaskList"
            border
            style="margin-top: 20px"
            v-loading="loading"
            stripe
            :row-class-name="tableRowClassName"
          >
            <el-table-column prop="taskType" label="任务类型 *" width="200">
              <template #default="scope">
                <el-input
                  v-model="scope.row.taskType"
                  size="small"
                  v-if="scope.row.isEditing"
                  placeholder="请输入任务类型"
                />
                <span v-else>{{ scope.row.taskType }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="taskCode" label="任务编码" width="150">
              <template #default="scope">
                <el-select
                  v-model="scope.row.taskCode"
                  size="small"
                  v-if="scope.row.isEditing"
                  placeholder="请选择任务编码"
                  style="width: 100%"
                >
                  <el-option
                    v-for="i in 10"
                    :key="i"
                    :label="String(i)"
                    :value="String(i)"
                  />
                </el-select>
                <span v-else>{{ scope.row.taskCode }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="taskName" label="任务名称" width="180">
              <template #default="scope">
                <el-input
                  v-model="scope.row.taskName"
                  size="small"
                  v-if="scope.row.isEditing"
                  placeholder="请输入任务名称"
                />
                <span v-else>{{ scope.row.taskName }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="taskDesc" label="任务描述" min-width="200">
              <template #default="scope">
                <el-input
                  v-model="scope.row.taskDesc"
                  type="textarea"
                  :rows="1"
                  size="small"
                  v-if="scope.row.isEditing"
                  placeholder="请输入任务描述"
                />
                <span v-else>{{ scope.row.taskDesc }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="isSkippable" label="是否允许跳过" min-width="200">
              <template #default="scope">
                <el-switch
                  v-model="scope.row.isSkippable"
                  size="small"
                  v-if="scope.row.isEditing"
                  :active-value="1"
                  :inactive-value="0"
                />
                <span v-else>{{ scope.row.isSkippable === 1 ? '是' : '否' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="160">
              <template #default="scope">
                <el-button
                  type="text"
                  v-if="!scope.row.isEditing"
                  @click="startEdit(scope.row)"
                >
                  编辑
                </el-button>
                <el-button
                  type="text"
                  v-if="scope.row.isEditing"
                  @click="cancelEdit(scope.row)"
                >
                  取消
                </el-button>
                <el-button
                  type="text"
                  v-if="scope.row.isEditing"
                  @click="handleSaveTask(scope.row)"
                >
                  保存
                </el-button>
                <el-button
                  type="text"
                  danger
                  @click="handleDeleteTask(scope.row.id)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
// 引入修正后的API
import { queryTask, saveTask, deleteTask } from '@/modules/taskConfig/taskConfig.route'

// 任务列表（VO格式，含类型名称）
const taskList = ref([])
// 加载状态
const loading = ref(false)
// 保存状态标志（防止重复保存）
const isSaving = ref(false)
// 任务类型树形数据
const taskTypeTree = ref([])
// 树形组件属性配置
const treeProps = ref({
  children: 'children',
  label: 'label',
  value: 'value'
})
// 当前选中的任务类型节点
const selectedTreeNode = ref(null)
// 树形组件引用
const treeRef = ref(null)
// 默认展开的节点key数组
const defaultExpandedKeys = ref([])

// 计算属性：过滤后的任务列表
const filteredTaskList = computed(() => {
  if (!selectedTreeNode.value) {
    // 如果没有选中节点，显示所有数据（但不包括编辑中的新增行）
    return taskList.value.filter(task => task.id) // 只显示已保存的行
  }

  // 选中的是父节点（任务类型），显示该类型下的所有任务
  const currentTaskType = selectedTreeNode.value.value

  // 按节点归属控制可见性：仅显示归属于当前节点类型的编辑中新增行
  return taskList.value.filter(task =>
    task.taskType === currentTaskType ||
    (task.isEditing && (!task.taskType || task.taskType === currentTaskType))
  )
})

// 1. 加载任务列表
const getTaskInfo = async () => {
  loading.value = true
  try {
    // 调用接口获取任务列表
    const res = await queryTask()
    if (res.code === 200) {
      // 初始化编辑状态
      taskList.value = res.data.map(item => ({
        ...item,
        isEditing: false
      }))
      // 构建树形结构
      buildTaskTypeTree(res.data)
    } else {
      ElMessage.error(res.msg || '获取任务列表失败')
    }
  } catch (e) {
    ElMessage.error(`获取任务列表失败：${e.message || '网络异常'}`)
  } finally {
    loading.value = false
  }
}

// 构建任务类型树形结构（根据taskType字段分组）
const buildTaskTypeTree = (tasks) => {
  // 根据taskType字段分组
  const groups = {}

  tasks.forEach(task => {
    const taskType = task.taskType || '未分类'

    if (!groups[taskType]) {
      groups[taskType] = {
        label: taskType,
        value: taskType,
        children: []
      }
    }

    groups[taskType].children.push({
      label: task.taskName,
      value: task.id,
      taskData: task,
      isLeaf: true
    })
  })

  // 将分组转换为树形数据
  const treeData = Object.values(groups).map(group => ({
    ...group,
    children: group.children.map(child => ({
      ...child,
      label: child.label,
      value: child.value,
      isLeaf: true
    }))
  }))

  taskTypeTree.value = treeData

  // 设置默认展开的节点（所有父节点）
  defaultExpandedKeys.value = treeData.map(node => node.value)
}

// 获取任务类型标签（根据前缀）
// const getTaskTypeLabel = (prefix) => {
//   const labels = {
//     '1': '初期处置',
//     '2': '系统联动响应',
//     '3': '预警阶段',
//     '4': '协调指挥',
//     '5': '提供维持网路运营的辅助信息',
//     '6': '车站处置',
//     '7': '乘客信息发布',
//     '8': '车辆段运维',
//     '9': '预警告阶段',
//     '10': '响应启动',
//     '11': '应急处置',
//     '12': '联锁故障场景应急'
//   }
//   return labels[prefix] || `任务类型${prefix}`
// }

// 处理树节点点击事件
const handleTreeNodeClick = (data) => {
  // 切换上下文时，彻底删除所有未保存的新增行（没有id的行）
  taskList.value = taskList.value.filter(row => {
    return row.id // 只保留已保存的行
  })

  // 如果点击的是叶子节点（子节点），找到其父节点并选中父节点
  if (data.isLeaf && data.taskData) {
    const parentTaskType = data.taskData.taskType
    const parentNode = taskTypeTree.value.find(node => node.value === parentTaskType)
    if (parentNode) {
      // 选中父节点，而不是子节点
      selectedTreeNode.value = parentNode
      // 同步树形组件的选中状态
      if (treeRef.value) {
        treeRef.value.setCurrentKey(parentNode.value)
      }
      return
    }
  }

  // 如果点击的是父节点，直接选中
  selectedTreeNode.value = data
}

// 清除选择，显示全部数据
const clearSelection = () => {
  // 视图重置时，彻底删除所有未保存的新增行
  taskList.value = taskList.value.filter(row => {
    return row.id // 只保留已保存的行
  })

  selectedTreeNode.value = null
  if (treeRef.value) {
    treeRef.value.setCurrentKey(null)
  }
}

// 新增任务类型（顶部按钮）
const addNewTaskType = async () => {
  try {
    // 弹窗输入新的任务类型名称
    const { value: newTaskType } = await ElMessageBox.prompt('请输入新的任务类型名称', '新增任务类型', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPlaceholder: '例如：初期处置、预警阶段等',
      inputValidator: (value) => {
        if (!value) {
          return '任务类型名称不能为空'
        }
        // 检查是否已存在
        const exists = taskTypeTree.value.some(node => node.value === value)
        if (exists) {
          return '该任务类型已存在'
        }
        return true
      }
    })

    // 创建新的任务类型节点
    const newTypeNode = {
      label: newTaskType,
      value: newTaskType,
      children: []
    }

    // 添加到树形数据中
    taskTypeTree.value.push(newTypeNode)

    // 自动选中新创建的任务类型
    selectedTreeNode.value = newTypeNode
    if (treeRef.value) {
      treeRef.value.setCurrentKey(newTaskType)
    }

    // 同步展开新节点
    if (!defaultExpandedKeys.value.includes(newTaskType)) {
      defaultExpandedKeys.value.push(newTaskType)
    }

    ElMessage.success('任务类型已添加，请在右侧新增任务')
  } catch {
    // 用户取消操作
    ElMessage.info('已取消新增')
  }
}

// 添加任务行
const addNewTaskRow = () => {
  const newRow = {
    id: '',
    taskType: selectedTreeNode.value && !selectedTreeNode.value.isLeaf
      ? selectedTreeNode.value.value
      : '',
    taskCode: '',
    taskName: '',
    taskDesc: '',
    isSkippable: false,
    isEditing: true
  }
  taskList.value.unshift(newRow)
}

// 开始编辑行
const startEdit = (row) => {
  row.isEditing = true
}

// 取消编辑
const cancelEdit = (row) => {
  row.isEditing = false
  // 如果是新建行，删除它
  if (!row.id) {
    const index = taskList.value.indexOf(row)
    if (index !== -1) {
      taskList.value.splice(index, 1)
    }
  }
}

// 保存任务
const handleSaveTask = async (row) => {
  if (!row.isEditing) return
  // 防止重复保存
  if (isSaving.value) return

  try {
    // 设置保存状态
    isSaving.value = true

    // 验证必填字段
    if (!row.taskType) {
      ElMessage.error('请填写任务类型')
      return
    }

    // 调用保存接口
    const res = await saveTask(row)
    if (res.code === 200) {
      ElMessage.success('保存成功')
      row.isEditing = false
      // 如果是新建行，更新id
      if (!row.id && res.data && res.data.id) {
        row.id = res.data.id
      }
      // 保存成功后重新加载列表，确保数据与后端同步
      await getTaskInfo()

      // 如果当前选中了父节点，重新触发选中状态以刷新过滤后的列表
      if (selectedTreeNode.value && !selectedTreeNode.value.isLeaf) {
        const currentNodeType = selectedTreeNode.value.value
        const updatedNode = taskTypeTree.value.find(node => node.value === currentNodeType)
        if (updatedNode) {
          selectedTreeNode.value = updatedNode
          if (treeRef.value) {
            treeRef.value.setCurrentKey(updatedNode.value)
          }
        }
      }
    } else {
      ElMessage.error(res.msg || '保存失败')
    }
  } catch (e) {
    ElMessage.error(`保存失败：${e.message || '网络异常'}`)
  } finally {
    // 清除保存状态
    isSaving.value = false
  }
}

// 删除任务
const handleDeleteTask = async (id) => {
  if (!id) return

  try {
    await ElMessageBox.confirm('确定要删除该任务吗？删除后不可恢复！', '温馨提示', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    })
    const res = await deleteTask(id)
    if (res.code === 200) {
      ElMessage.success('删除成功')
      getTaskInfo() // 刷新列表
    } else {
      ElMessage.error(res.msg || '删除失败')
    }
  } catch (e) {
    console.log(e)
    ElMessage.info('已取消删除')
  }
}

// 表格行样式
const tableRowClassName = ({ row }) => {
  return row.isEditing ? 'editing-row' : ''
}

// 页面加载时初始化
onMounted(() => {
  getTaskInfo()
})
</script>

<style scoped>
.task-config {
  padding: 20px;
}

.task-type-tree .el-tree-node__content {
  height: 36px;
  line-height: 36px;
}

.task-type-tree .el-tree-node__expand-icon {
  margin-right: 5px;
}

.editing-row {
  background-color: #f5f7fa !important;
}

:deep(.el-tag) {
  margin: 0;
}

:deep(.el-input__inner) {
  height: 28px;
  line-height: 28px;
}

.current-task-type-bar {
  padding: 15px;
  background-color: #ecf5ff;
  border: 1px solid #b3d8ff;
  border-radius: 4px;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
}

.current-task-type-bar .el-tag {
  font-size: 14px;
  padding: 8px 15px;
}
</style>
