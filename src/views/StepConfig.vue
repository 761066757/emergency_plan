<!-- 步骤配置页面 -->
<template>
  <div class="step-config">
    <el-page-header content="步骤配置"></el-page-header>
    <el-card>
      <!-- 新增按钮 + 模块选择（可选，如需切换不同模块的步骤） -->
      <div
        style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        "
      >
        <el-button type="primary" @click="openAddDialog">新增步骤</el-button>
        <el-select
          v-model="currentModuleCode"
          placeholder="选择业务模块"
          style="width: 200px"
          @change="getStepList"
        >
          <el-option label="应急流程" value="emergency"></el-option>
          <el-option label="巡检流程" value="inspect"></el-option>
          <el-option label="维保流程" value="maintain"></el-option>
        </el-select>
      </div>

      <!-- 步骤列表 （直接展示关联后的类型名称）-->
      <el-table :data="stepList" border style="margin-top: 20px" v-loading="loading" stripe>
        <el-table-column prop="stepCode" label="步骤编码" width="150"></el-table-column>
        <el-table-column prop="stepName" label="步骤名称" width="180"></el-table-column>
        <el-table-column prop="stepTypeName " label="步骤类型" width="150">
          <!-- 步骤类型值转标签展示（更友好） -->
          <template #default="scope">
            <el-tag type="info">
              {{ getStepTypeName(scope.row.stepTypeName) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="stepDesc" label="步骤描述" min-width="200"></el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="scope">
            <el-button type="text" @click="editStep(scope.row)">编辑</el-button>
            <el-button type="text" danger @click="handleDeleteStep(scope.row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑步骤弹窗 -->
    <el-dialog v-model="dialogVisible" title="步骤配置" width="500px" destroy-on-close>
      <el-form
        :model="stepForm"
        label-width="100px"
        :rules="stepRules"
        ref="stepFormRef"
        size="default"
      >
        <el-form-item label="步骤编码" prop="stepCode">
          <el-input v-model="stepForm.stepCode" placeholder="请输入唯一的步骤编码"></el-input>
        </el-form-item>
        <el-form-item label="步骤名称" prop="stepName">
          <el-input v-model="stepForm.stepName" placeholder="请输入步骤名称"></el-input>
        </el-form-item>
        <el-form-item label="步骤类型" prop="stepType">
          <!-- 替换为动态字典下拉组件 （固定应急模块“emergency”，也可绑定currentModuleCode）-->
          <DictSelect
            v-model="stepForm.stepType"
            module-code="emergency"
            dict-type="step_type"
            placeholder="请选择步骤类型"
          />
          <!--- （直接调用修正后的接口） -->
          <!-- <el-option
            v-for="item in stepTypeDict"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          ></el-option> -->
        </el-form-item>
        <el-form-item label="步骤描述" prop="stepDesc">
          <el-input
            v-model="stepForm.stepDesc"
            type="textarea"
            rows="3"
            placeholder="请输入步骤描述"
          ></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveStep">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
// 引入自定义字典下拉组件
// import DictSelect from '@/components/DictSelect.vue'
// 引入修正后的API
import { getStepListAll, requestSaveStep, requestDeleteStep } from '@/api/step'
import { getDictOptionsByModuleAndType } from '@/api/dict'

// 当前选择的模块编码（默认应急流程）
const currentModuleCode = ref('emergency')
// 步骤列表（VO格式，含类型名称）
const stepList = ref([])
// 加载状态
const loading = ref(false)
// 弹窗相关
const dialogVisible = ref(false)
const stepFormRef = ref(null)
const stepForm = ref({
  id: '',
  stepCode: '',
  stepName: '',
  stepType: '',
  stepDesc: '',
})
// 步骤类型字典列表（下拉用）
const stepTypeDict = ref([])

// 表单校验规则
const stepRules = ref({
  stepCode: [{ required: true, message: '请输入步骤编码', trigger: 'blur' }],
  stepName: [{ required: true, message: '请输入步骤名称', trigger: 'blur' }],
  stepType: [{ required: true, message: '请选择步骤类型', trigger: 'change' }],
})

// 1. 加载步骤列表（核心：按模块查询，直接获取含类型名称的VO）
const getStepList = async () => {
  loading.value = true
  try {
    // 先加载步骤类型字典（下拉用）
    await loadStepTypeDict()
    // 调用修正后的接口，传入模块编码
    const res = await getStepListAll()
    if (res.code === 200) {
      stepList.value = res.data || []
    } else {
      ElMessage.error(res.msg || '获取步骤列表失败')
    }
  } catch (e) {
    ElMessage.error(`获取步骤列表失败：${e.message || '网络异常'}`)
  } finally {
    loading.value = false
  }
}

// 2. 加载步骤类型字典（下拉用）
// 获取步骤列表
// 重写loadStepList，增加依赖
const loadStepList = async () => {
  loading.value = true
  try {
    // 先确保字典数据加载完成
    await loadStepTypeDict()
    const res = await getStepListAll({ moduleCode: currentModuleCode.value })
    if (res.code === 200) {
      stepList.value = res.data || []
    } else {
      ElMessage.error(res.msg || '获取步骤列表失败')
    }
  } catch (e) {
    ElMessage.error(`获取步骤列表失败：${e.message || '网络异常'}`)
  } finally {
    loading.value = false
  }
}

// 加载步骤类型字典（用于值转标签）
const loadStepTypeDict = async () => {
  try {
    const res = await getDictOptionsByModuleAndType(currentModuleCode.value, 'step_type')
    // 关键：必须校验res.code === 200，再取data
    if (res.code === 200) {
      stepTypeDict.value = res.data || []
    } else {
      ElMessage.warning(`加载步骤类型字典失败：${res.msg}`)
      stepTypeDict.value = []
    }
  } catch (e) {
    ElMessage.error(`加载字典接口异常：${e.message || '网络错误'}`)
    stepTypeDict.value = []
  }
}

// 步骤类型值转标签（展示用）
const getStepTypeName = (value) => {
  if (!value) return '-'
  const item = stepTypeDict.value.find((item) => item.value === value)
  return item ? item.label : value
}

// 3. 打开新增弹窗
const openAddDialog = () => {
  stepForm.value = {
    id: '',
    stepCode: '',
    stepName: '',
    stepType: '',
    stepDesc: '',
  }
  dialogVisible.value = true
}

// 4. 编辑步骤
const editStep = (row) => {
  // 深拷贝避免修改原数据
  stepForm.value = JSON.parse(JSON.stringify(row))
  dialogVisible.value = true
}

// 5. 保存步骤
// 保存步骤 - 调用重命名后的API函数
const saveStep = async () => {
  try {
    // 表单校验
    await stepFormRef.value.validate()
    // 调用保存接口（使用重命名后的requestSaveStep）
    const res = await requestSaveStep(stepForm.value)
    if (res.code === 200) {
      ElMessage.success('保存成功')
      dialogVisible.value = false
      loadStepList() // 刷新列表
    } else {
      ElMessage.error(res.msg || '保存失败')
    }
  } catch (e) {
    ElMessage.error(`保存失败：${e.message || '表单校验失败'}`)
  }
}

// 6. 删除步骤
// 删除步骤 - 重命名为handleDeleteStep，调用重命名后的API
const handleDeleteStep = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除该步骤吗？删除后不可恢复！', '温馨提示', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    })
    const res = await requestDeleteStep(id)
    if (res.code === 200) {
      ElMessage.success('删除成功')
      loadStepList() // 刷新列表
    } else {
      ElMessage.error(res.msg || '删除失败')
    }
  } catch (e) {
    console.log(e)
    ElMessage.info('已取消删除')
  }
}

// 页面加载时初始化
onMounted(() => {
  getStepList()
  loadStepTypeDict() // 加载步骤类型字典用于展示
})
</script>

<style scoped>
.step-config {
  padding: 20px;
}

:deep(.el-tag) {
  margin: 0;
}
</style>
