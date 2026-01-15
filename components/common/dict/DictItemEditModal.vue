<script setup lang="ts">
/**
 * DictItemEditModal - 字典项编辑弹窗组件
 * 
 * 可复用的字典项编辑弹窗，支持新增和编辑字典项
 */
import { message } from 'ant-design-vue'
import { ref, watch } from 'vue'

import type { BizDictVO } from '@/framework/apis/dict/bizDictController'

interface Props {
  visible: boolean
  editingItem: BizDictVO | null
  // 所有字典项（用于值重复校验）
  allItems?: BizDictVO[]
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'save', item: BizDictVO): void
}

const props = withDefaults(defineProps<Props>(), {
  allItems: () => []
})

const emit = defineEmits<Emits>()

const internalVisible = ref(props.visible)
const internalItem = ref<BizDictVO | null>(null)

// 监听外部 visible 变化
watch(() => props.visible, (newVal) => {
  internalVisible.value = newVal
  if (newVal && props.editingItem) {
    internalItem.value = JSON.parse(JSON.stringify(props.editingItem))
  }
})

// 监听内部 visible 变化
watch(internalVisible, (newVal) => {
  emit('update:visible', newVal)
})

// 保存
const handleOk = () => {
  if (!internalItem.value) return
  
  // 验证必填项
  if (!internalItem.value.label || !internalItem.value.value) {
    message.warning('请填写字典项名称和值')
    return
  }
  
  // 验证值是否重复（仅新增时检查）
  if (!internalItem.value.id) {
    // 使用 bizId###value 的组合来判断值是否重复
    const currentBizId = internalItem.value.bizId || ''
    const currentValue = internalItem.value.value || ''
    const currentLabel = internalItem.value.label || ''
    // 将输入的 value 拼接成完整格式用于比对
    const currentValueKey = `${currentBizId}###${currentValue}`
    
    // 检查 value 是否重复（后端返回的 value 已经是完整格式，直接比对）
    const duplicateValue = props.allItems.find(item => {
      const itemValue = item.value || ''
      return itemValue === currentValueKey
    })
    
    if (duplicateValue) {
      message.warning(`字典项值 "${currentValue}" 已存在，请使用不同的值`)
      return
    }
    
    // 检查 label 是否重复（整个字典编码范围内必须唯一，不区分 bizId）
    const duplicateLabel = props.allItems.find(item => {
      const itemLabel = item.label || ''
      return itemLabel === currentLabel
    })
    
    if (duplicateLabel) {
      message.warning(`字典项名称 "${currentLabel}" 已存在，请使用不同的名称`)
      return
    }
  }
  
  emit('save', internalItem.value)
  internalVisible.value = false
}

// 取消
const handleCancel = () => {
  internalVisible.value = false
}
</script>

<template>
  <a-modal
    v-model:open="internalVisible"
    :title="internalItem?.id ? '编辑字典项' : '添加字典项'"
    width="600px"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <a-form
      v-if="internalItem"
      :label-col="{ span: 6 }"
      :wrapper-col="{ span: 16 }"
    >
      <a-form-item
        label="字典项名称"
        required
      >
        <a-input
          v-model:value="internalItem.label"
          placeholder="请输入字典项名称"
        />
      </a-form-item>
      <a-form-item
        label="字典项值"
        required
      >
        <a-input
          v-if="!internalItem.id"
          v-model:value="internalItem.value"
          placeholder="请输入字典项值"
        />
        <span
          v-else
          class="readonly-value"
        >{{ internalItem.value }}</span>
      </a-form-item>
      <a-form-item label="描述">
        <a-textarea
          v-model:value="internalItem.description"
          placeholder="请输入描述"
          :rows="3"
        />
      </a-form-item>
      <a-form-item label="是否默认">
        <a-radio-group v-model:value="internalItem.isDefault">
          <a-radio value="1">
            是
          </a-radio>
          <a-radio value="0">
            否
          </a-radio>
        </a-radio-group>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<style scoped lang="less">
.readonly-value {
  color: rgba(0, 0, 0, 0.85);
  line-height: 32px;
}
</style>
