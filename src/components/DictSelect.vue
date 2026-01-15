<!-- src/components/DictSelect.vue -->
<template>
  <!-- 核心修改：v-model 绑定本地变量 localValue，而非直接绑 props 的 modelValue -->
  <el-select
    v-model="localValue"
    :placeholder="placeholder"
    v-bind="$attrs"
    :disabled="disabled"
    clearable
  >
    <el-option
      v-for="item in options"
      :key="item.value"
      :label="item.label"
      :value="item.value"
    ></el-option>
  </el-select>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getDictOptionsByModuleAndType } from '@/api/dict'

// 1. 定义组件属性（modelValue 是只读的 props）
const props = defineProps({
  moduleCode: {
    type: String,
    required: true,
  },
  dictType: {
    type: String,
    default: 'step_type',
  },
  // 父组件 v-model 绑定的值（只读）
  modelValue: {
    type: [String, Number],
    default: '',
  },
  placeholder: {
    type: String,
    default: '请选择',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

// 2. 定义事件：触发 update:modelValue 通知父组件更新值
const emit = defineEmits(['update:modelValue', 'change'])

// 3. 核心：定义本地响应式变量，同步 modelValue 的值（解决 props 只读问题）
const localValue = ref(props.modelValue)

// 4. 监听本地变量变化：通知父组件更新
watch(localValue, (newVal) => {
  // 触发 update:modelValue 事件（Vue3 v-model 标准事件）
  emit('update:modelValue', newVal)
  // 触发自定义 change 事件（可选，方便父组件监听）
  emit('change', newVal)
})

// 5. 监听父组件传入的 modelValue 变化：同步更新本地变量（父组件主动改值时）
watch(
  () => props.modelValue,
  (newVal) => {
    localValue.value = newVal
  },
)

// ========== 原有逻辑保持不变 ==========
const options = ref([])
const loading = ref(false)
let timer = null

// 加载字典选项
const loadOptions = async () => {
  if (!props.moduleCode) {
    ElMessage.warning('请配置模块编码')
    return
  }

  loading.value = true
  try {
    const res = await getDictOptionsByModuleAndType(props.moduleCode, props.dictType)
    if (res && res.code === 200) {
      options.value = res.data || []
    } else {
      options.value = []
      ElMessage.warning(`加载字典失败：${res?.msg || '接口返回异常'}`)
    }
  } catch (e) {
    options.value = []
    ElMessage.error(`加载字典失败：${e.message || '网络异常'}`)
  } finally {
    loading.value = false
  }
}

// 监听模块/类型变化
watch(
  [() => props.moduleCode, () => props.dictType],
  () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      loadOptions()
    }, 300)
  },
  { immediate: true },
)

onMounted(() => {
  loadOptions()
})

onUnmounted(() => {
  clearTimeout(timer)
})
</script>
