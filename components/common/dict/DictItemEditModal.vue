<script setup lang="ts">
/**
 * DictItemEditModal - 字典项编辑弹窗组件
 * 
 * 可复用的字典项编辑弹窗，支持新增和编辑字典项
 */
import { message } from 'ant-design-vue'
import { ref, watch, computed } from 'vue'

import { getEnterpriseDictByCode } from '@/framework/apis/dict/bizDictController'
import type { BizDictVO } from '@/framework/apis/dict/bizDictController'

interface Props {
  visible: boolean
  editingItem: BizDictVO | null
  // 所有字典项（用于值重复校验）
  allItems?: BizDictVO[]
  // 当前编辑项的ID（用于排除自身，避免循环引用）
  currentItemId?: number
  // 当前字典编码
  currentDictCode?: string
  // 是否管理端模式
  isManageMode?: boolean
  // 企业ID
  entityId?: string | null
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'save', item: BizDictVO): void
}

const props = withDefaults(defineProps<Props>(), {
  allItems: () => [],
  currentItemId: undefined,
  currentDictCode: '',
  isManageMode: true,
  entityId: null
})

const emit = defineEmits<Emits>()

const internalVisible = ref(props.visible)
const internalItem = ref<BizDictVO | null>(null)

// 监听外部 visible 变化
watch(() => props.visible, (newVal) => {
  internalVisible.value = newVal
  if (newVal && props.editingItem) {
    internalItem.value = JSON.parse(JSON.stringify(props.editingItem))
    // 根据已有数据设置输入模式
    // 如果有 parentDictCode，使用"从字典选择"模式
    // 如果只有 parentValue 而没有 parentDictCode，使用"手动输入"模式
    if (props.editingItem.parentDictCode) {
      parentValueInputMode.value = 'select'
    } else if (props.editingItem.parentValue) {
      parentValueInputMode.value = 'input'
    } else {
      parentValueInputMode.value = 'select'
    }
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

// 上级字典编码选项（所有字典列表）
const parentDictCodeOptions = ref<Array<{ value: string; label: string }>>([])
const parentDictCodeLoading = ref(false)

// 上级字典项选项（从选中的上级字典编码加载）
const parentCodeOptions = ref<Array<{ value: string; label: string; disabled?: boolean }>>([])
const parentCodeLoading = ref(false)

// 上级字典项输入模式：'select' | 'input'
const parentValueInputMode = ref<'select' | 'input'>('select')

// 字典名称映射（用于显示上级字典名称）
const dictNameMap = ref<Record<string, string>>({})

// 加载字典列表（用于上级字典编码选择）
const loadParentDictList = async () => {
  parentDictCodeLoading.value = true
  try {
    // 动态导入避免循环依赖
    const { getDictList } = await import('@/framework/apis/dict/bizDictController')
    const res = await getDictList({ bizId: props.isManageMode ? undefined : props.entityId || undefined }, false, false, false)
    
    if (res?.status?.code === 0 && res.payload) {
      // 构建字典名称映射
      const nameMap: Record<string, string> = {}
      ;(res.payload as Array<{ value?: string; label?: string }>).forEach((item: any) => {
        if (item.value) {
          nameMap[item.value] = item.label || item.value
        }
      })
      dictNameMap.value = nameMap
      
      // 排除当前字典编码（不能选择自己作为上级）
      parentDictCodeOptions.value = (res.payload as Array<{ value?: string; label?: string }>)
        .filter((item: any) => item.value !== props.currentDictCode)
        .map((item: any) => ({
          value: item.value || '',
          label: item.label || item.value || ''
        }))
    }
  } catch (error) {
    console.error('加载字典列表失败:', error)
  } finally {
    parentDictCodeLoading.value = false
  }
}

// 获取上级字典名称
const getParentDictName = computed(() => {
  if (!internalItem.value?.parentDictCode) return ''
  return dictNameMap.value[internalItem.value.parentDictCode] || internalItem.value.parentDictCode
})

// 加载上级字典项（根据选中的上级字典编码）
const loadParentCodeOptions = async (parentDictCode: string) => {
  if (!parentDictCode) {
    parentCodeOptions.value = []
    return
  }
  
  parentCodeLoading.value = true
  try {
    const bizId = props.isManageMode ? null : props.entityId
    const res = await getEnterpriseDictByCode(
      { 
        dictCode: parentDictCode,
        bizId: bizId as string
      },
      false,
      false,
      false
    )
    
    if (res?.status?.code === 0 && res.payload) {
      // 构建树形选项
      const items = res.payload as BizDictVO[]
      parentCodeOptions.value = buildTreeOptions(items)
    }
  } catch (error) {
    console.error('加载上级字典项失败:', error)
  } finally {
    parentCodeLoading.value = false
  }
}

// 构建树形选项
const buildTreeOptions = (items: BizDictVO[], parentValue = '', level = 0): Array<{ value: string; label: string; disabled?: boolean }> => {
  const result: Array<{ value: string; label: string; disabled?: boolean }> = []
  
  // 获取当前层级的项目
  const currentLevelItems = items.filter(item => (item.parentValue || '') === parentValue)
  
  for (const item of currentLevelItems) {
    const prefix = '　'.repeat(level)
    result.push({
      value: item.value || '',
      label: `${prefix}${item.label}`,
      disabled: false
    })
    
    // 递归添加子项
    const children = buildTreeOptions(items, item.value || '', level + 1)
    result.push(...children)
  }
  
  return result
}

// 监听上级字典编码变化
watch(() => internalItem.value?.parentDictCode, (newVal) => {
  if (newVal) {
    loadParentCodeOptions(newVal)
  } else {
    parentCodeOptions.value = []
  }
  // 清空上级字典项选择
  if (internalItem.value) {
    internalItem.value.parentValue = ''
  }
})

// 监听输入模式切换
watch(parentValueInputMode, (newMode) => {
  // 切换模式时清空已选值
  if (internalItem.value) {
    internalItem.value.parentValue = ''
    // 手动输入模式下，清空上级字典
    if (newMode === 'input') {
      internalItem.value.parentDictCode = ''
    }
  }
})

// 监听弹窗打开
watch(() => props.visible, (newVal) => {
  if (newVal) {
    loadParentDictList()
    // 如果有上级字典编码，加载对应的字典项
    if (internalItem.value?.parentDictCode) {
      loadParentCodeOptions(internalItem.value.parentDictCode)
    }
  }
})
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
      <a-form-item label="上级字典项来源">
        <!-- 输入模式切换 -->
        <a-radio-group
          v-model:value="parentValueInputMode"
          size="small"
        >
          <a-radio-button value="select">
            从字典选择
          </a-radio-button>
          <a-radio-button value="input">
            手动输入
          </a-radio-button>
        </a-radio-group>
        <template #extra>
          <span style="color: #8c8c8c; font-size: 12px;">
            <template v-if="parentValueInputMode === 'select'">
              选择上级字典后，从该字典中选择一个值作为过滤条件
            </template>
            <template v-else>
              直接输入一个值作为上级字典项值，不依赖字典
            </template>
          </span>
        </template>
      </a-form-item>
      
      <!-- 从字典选择模式：显示上级字典选择 -->
      <a-form-item
        v-if="parentValueInputMode === 'select'"
        label="上级字典"
      >
        <a-select
          v-model:value="internalItem.parentDictCode"
          placeholder="选择上级字典（用于级联）"
          allow-clear
          show-search
          :loading="parentDictCodeLoading"
          :filter-option="(input: string, option: any) => option.label.toLowerCase().includes(input.toLowerCase())"
        >
          <a-select-option
            v-for="opt in parentDictCodeOptions"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </a-select-option>
        </a-select>
      </a-form-item>
      
      <!-- 从字典选择模式：显示上级字典项选择 -->
      <a-form-item
        v-if="parentValueInputMode === 'select'"
        label="上级字典项值"
      >
        <a-select
          v-model:value="internalItem.parentValue"
          placeholder="请先选择上级字典"
          :disabled="!internalItem.parentDictCode"
          allow-clear
          show-search
          :loading="parentCodeLoading"
          :filter-option="(input: string, option: any) => option.label.toLowerCase().includes(input.toLowerCase())"
        >
          <a-select-option
            v-for="opt in parentCodeOptions"
            :key="opt.value"
            :value="opt.value"
            :disabled="opt.disabled"
          >
            {{ opt.label }}
          </a-select-option>
        </a-select>
        <template #extra>
          <span style="color: #8c8c8c; font-size: 12px;">
            <template v-if="!internalItem.parentDictCode">
              请先选择上级字典
            </template>
            <template v-else>
              从「{{ getParentDictName }}」字典中选择一个值作为过滤条件
            </template>
          </span>
        </template>
      </a-form-item>
      
      <!-- 手动输入模式：只显示值输入框 -->
      <a-form-item
        v-if="parentValueInputMode === 'input'"
        label="上级字典项值"
      >
        <a-input
          v-model:value="internalItem.parentValue"
          placeholder="输入父级字典项的值"
        />
        <template #extra>
          <span style="color: #8c8c8c; font-size: 12px;">
            手动输入上级字典项的值，适用于用户填写内容的场景
          </span>
        </template>
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
