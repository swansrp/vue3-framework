<script setup lang="ts">
/**
 * DictCodeSelector - 字典编码选择器
 * 
 * 基于 searchSelect 组件，支持搜索字典编码，并可配置字典项
 */
import { PlusOutlined, SettingOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { ref, watch, onMounted } from 'vue'

import { getEnterpriseDictByCode, getDictList } from '@/framework/apis/dict/bizDictController'
import type { BizDictVO } from '@/framework/apis/dict/bizDictController'
import DictItemsManager from '@/framework/components/common/dict/DictItemsManager.vue'
import SearchSelect from '@/framework/components/common/searchSelect/index.vue'

interface Props {
  modelValue?: string
  // 是否为管理端模式
  isManageMode?: boolean
  // 企业ID（管理端传null）
  entityId?: string | null
  // 是否禁用
  disabled?: boolean
  // 占位符
  placeholder?: string
  // 是否允许清空
  allowClear?: boolean
  // 是否显示配置按钮
  showConfigBtn?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string | undefined): void
  (e: 'change', value: string | undefined): void
}

const props = withDefaults(defineProps<Props>(), {
  isManageMode: false,
  disabled: false,
  placeholder: '请搜索或添加字典',
  allowClear: true,
  showConfigBtn: true
})

const emit = defineEmits<Emits>()

const searchSelectRef = ref()
const dictItemsManagerRef = ref()
const internalValue = ref<string | undefined>(props.modelValue)
const currentDictItems = ref<BizDictVO[]>([])

// 自定义请求构造函数（同时用于搜索和翻译）
const buildDictRequest = (keyword: string) => {
  // 如果关键字为空，返回 null 阻止搜索
  if (!keyword || !keyword.trim()) {
    return null
  }
  
  const params: any = {}
  // 使用 code 参数进行查询
  params.code = keyword
  return params
}

// 处理选择变化
const handleChange = (value: string | undefined) => {
  internalValue.value = value
  emit('update:modelValue', value)
  emit('change', value)
  
  // 加载选中字典的字典项
  if (value) {
    loadDictItems(value)
  }
}

// 加载字典项
const loadDictItems = async (dictCode: string) => {
  if (!dictCode) return
  
  try {
    // 统一使用新接口，通过 bizId 区分
    const bizId = props.isManageMode ? null : props.entityId
    const res = await getEnterpriseDictByCode(
      { dictCode, bizId: bizId as string },
      false,
      false,
      false
    )
    
    if (res?.status?.code === 0 && res.payload) {
      currentDictItems.value = (res.payload as BizDictVO[]).sort((a, b) => (a.sort || 0) - (b.sort || 0))
    } else {
      currentDictItems.value = []
    }
  } catch (error) {
    console.error('加载字典项失败:', error)
    currentDictItems.value = []
  }
}

// 打开字典项管理（支持新建）
const openDictItemsManager = (isCreatingNew = false) => {
  if (!isCreatingNew && !internalValue.value) {
    message.warning('请先选择字典')
    return
  }
  
  if (dictItemsManagerRef.value) {
    if (isCreatingNew) {
      // 创建新字典模式
      dictItemsManagerRef.value.openForCreate()
    } else {
      // 编辑现有字典模式
      dictItemsManagerRef.value.open(internalValue.value, currentDictItems.value)
    }
  }
}

// 刷新字典项并更新选中值
const handleDictItemsRefresh = async (dictCode?: string) => {
  // 如果是新创建的字典，需要更新选中值
  if (dictCode && dictCode !== internalValue.value) {
    internalValue.value = dictCode
    emit('update:modelValue', dictCode)
    emit('change', dictCode)
  }
  
  // 刷新搜索列表（更新 options 中的 label）
  if (searchSelectRef.value) {
    await searchSelectRef.value.refresh()
  }
  
  if (internalValue.value) {
    await loadDictItems(internalValue.value)
  }
}

// 监听外部值变化
watch(() => props.modelValue, (newVal) => {
  internalValue.value = newVal
  if (newVal) {
    loadDictItems(newVal)
  }
})

// 初始化
onMounted(() => {
  if (internalValue.value) {
    loadDictItems(internalValue.value)
  }
})
</script>

<template>
  <div class="dict-code-selector-wrapper">
    <div class="selector-main">
      <SearchSelect
        ref="searchSelectRef"
        v-model="internalValue"
        :api-fn="getDictList"
        :custom-request-builder="buildDictRequest"
        value-field="value"
        label-field="label"
        :placeholder="placeholder"
        :disabled="disabled"
        :allow-clear="allowClear"
        @change="handleChange"
      >
        <template #option="{ option }">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
            <span
              v-if="option.label"
              style="font-size: 14px; font-weight: 500; color: #262626; flex: 1;"
            >
              {{ option.label }}
            </span>
            <span style="font-size: 11px; color: #bfbfbf; font-weight: 300;">{{ option.value }}</span>
          </div>
        </template>
      </SearchSelect>
      
      <div class="action-buttons">
        <a-button
          v-if="!disabled"
          type="link"
          size="small"
          title="添加新字典"
          @click="openDictItemsManager(true)"
        >
          <template #icon>
            <PlusOutlined />
          </template>
        </a-button>
        
        <a-button
          v-if="showConfigBtn && internalValue"
          type="link"
          size="small"
          title="配置字典项"
          :disabled="disabled"
          @click="openDictItemsManager(false)"
        >
          <template #icon>
            <SettingOutlined />
          </template>
        </a-button>
      </div>
    </div>
    
    <!-- 字典项管理 -->
    <DictItemsManager
      ref="dictItemsManagerRef"
      :is-manage-mode="isManageMode"
      :entity-id="entityId"
      @refresh="handleDictItemsRefresh"
    />
  </div>
</template>

<style scoped lang="less">
.dict-code-selector-wrapper {
  width: 100%;
  
  .selector-main {
    display: flex;
    align-items: center;
    gap: 4px;
    
    :deep(.ant-select) {
      flex: 1;
    }
    
    .action-buttons {
      display: flex;
      align-items: center;
      gap: 0;
      
      .ant-btn-link {
        padding: 4px 8px;
        height: auto;
        
        .anticon {
          font-size: 14px;
        }
      }
    }
  }
}
</style>
