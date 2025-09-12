<template>
  <a-modal
    v-model:open="_visible"
    :title="modalTitle"
    :width="800"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <a-form
      ref="formRef"
      :model="formState"
      :rules="formRules"
      layout="vertical"
    >
      <!-- 指标配置 -->
      <div>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="指标标题" name="title">
              <a-input v-model:value="formState.title" placeholder="请输入指标标题" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="指标类型" name="type">
              <a-select
                v-model:value="formState.type"
                placeholder="请选择指标类型"
                :options="indicatorTypeOptions"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="显示顺序" name="displayOrder">
              <a-input-number
                v-model:value="formState.displayOrder"
                :min="0"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="树形顺序" name="treeOrder">
              <a-input-number
                v-model:value="formState.treeOrder"
                :min="0"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="横向格子数" name="xGrid">
              <a-slider
                v-model:value="formState.xGrid"
                :min="1"
                :max="5"
                :marks="{ 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' }"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="纵向格子数" name="yGrid">
              <a-slider
                v-model:value="formState.yGrid"
                :min="1"
                :max="3"
                :marks="{ 1: '1', 2: '2', 3: '3' }"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="是否显示" name="show">
          <a-switch v-model:checked="formState.show" />
        </a-form-item>

        <!-- 指标配置参数 -->
        <a-form-item label="配置参数">
          <a-textarea
            v-model:value="formState.config"
            :auto-size="{ minRows: 4, maxRows: 8 }"
            placeholder="请输入指标配置参数（JSON格式）"
          />
        </a-form-item>
      </div>
    </a-form>
  </a-modal>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import type { IndicatorTreeNode } from '../types'

interface Props {
  visible: boolean
  config: IndicatorTreeNode | null
  mode: 'add' | 'edit'
  tableId: string
}

interface Emits {
  (e: 'update:visible', value: boolean): void

  (e: 'save', config: IndicatorTreeNode): void
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  config: null,
  mode: 'add',
  tableId: ''
})
const _visible = ref(props.visible)
watch(
  () => _visible.value,
  () => emit('update:visible', _visible.value)
)
const emit = defineEmits<Emits>()

// 表单引用
const formRef = ref()

// 表单状态
const formState = ref({
  title: '',
  type: 'personal' as 'common' | 'personal',
  treeOrder: 0,
  displayOrder: 0,
  xGrid: 1,
  yGrid: 1,
  show: true,
  config: '{}'
})

// 表单规则
const formRules = {
  title: [{ required: true, message: '请输入标题' }],
  type: [{ required: true, message: '请选择指标类型' }]
}

// 指标类型选项
const indicatorTypeOptions = [
  { label: '通用指标', value: 'common' },
  { label: '个人指标', value: 'personal' }
]

// 计算属性
const modalTitle = computed(() => {
  return props.mode === 'add' ? '新增指标' : '编辑指标'
})

// 监听props变化
watch(() => props.visible, (newVal) => {
  if (newVal) {
    resetForm()
    if (props.config) {
      setFormValues(props.config)
    }
  }
})

// 重置表单
const resetForm = () => {
  formState.value = {
    title: '',
    type: 'personal',
    treeOrder: 0,
    displayOrder: 0,
    xGrid: 1,
    yGrid: 1,
    show: true,
    config: '{}'
  }
}

// 设置表单值
const setFormValues = (config: IndicatorTreeNode) => {
  formState.value.title = config.title
  formState.value.type = config.type
  formState.value.treeOrder = config.treeOrder
  formState.value.displayOrder = config.displayOrder
  formState.value.xGrid = config.xGrid
  formState.value.yGrid = config.yGrid
  formState.value.show = config.show
  formState.value.config = JSON.stringify(config.config, null, 2)
}

// 处理确认
const handleOk = async () => {
  try {
    await formRef.value.validateFields()

    // 指标配置
    let parsedConfig = {}
    try {
      parsedConfig = JSON.parse(formState.value.config)
    } catch (e) {
      message.error('配置参数格式不正确，请输入有效的JSON')
      return
    }

    const config: IndicatorTreeNode = {
      id: (props.config as IndicatorTreeNode)?.id || Date.now().toString(),
      pid: (props.config as IndicatorTreeNode)?.pid || '0',
      key: (props.config as IndicatorTreeNode)?.key || Date.now().toString(),
      title: formState.value.title,
      type: formState.value.type,
      treeOrder: formState.value.treeOrder,
      displayOrder: formState.value.displayOrder,
      xGrid: formState.value.xGrid,
      yGrid: formState.value.yGrid,
      show: formState.value.show,
      config: parsedConfig
    }

    emit('save', config)
  } catch (error) {
    console.error('表单验证失败:', error)
  }
}

// 处理取消
const handleCancel = () => {
  emit('update:visible', false)
}

// 组件挂载
onMounted(() => {
  // 可以在这里初始化数据
})
</script>

<style lang="less" scoped>
.resize-slider {
  margin: 20px 0;

  :deep(.ant-slider-mark-text) {
    font-size: 12px;
  }
}
</style>