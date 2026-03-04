<script setup lang="ts">
import { PlusOutlined } from '@ant-design/icons-vue'
import { Modal, message } from 'ant-design-vue'
import { ref, watch, onMounted, computed } from 'vue'

import DictItemEditModal from './DictItemEditModal.vue'
import DictItemsList from './DictItemsList.vue'

import { getEnterpriseDictByCode, deleteEnterpriseDict, systemBizDictAddDict, systemBizDictUpdateEnterpriseDict } from '@/framework/apis/dict/bizDictController'
import type { BizDictVO } from '@/framework/apis/dict/bizDictController'

interface Props {
  modelValue?: string | number
  // 字典编码
  dictCode: string
  // 是否为管理端模式，默认false（企业端）
  isManageMode?: boolean
  // 企业ID字段配置，默认为 'bizId'
  entityIdField?: string
  // 企业ID的值（企业端必填，管理端传null）
  entityId?: string | null
  // 是否禁用
  disabled?: boolean
  // 占位符
  placeholder?: string
  // 是否显示管理按钮
  showManageBtn?: boolean
  // 管理按钮文字
  manageBtnText?: string
  // 是否允许清空
  allowClear?: boolean
  // 是否多选，默认false
  multiple?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string | number | undefined): void
  (e: 'change', value: string | number | undefined, option: BizDictVO | undefined): void
}

const props = withDefaults(defineProps<Props>(), {
  isManageMode: false,
  entityIdField: 'bizId',
  disabled: false,
  placeholder: '请选择',
  showManageBtn: true,
  manageBtnText: '配置',
  allowClear: true,
  multiple: false
})

const emit = defineEmits<Emits>()

// 解析逗号分隔的字符串为数组（多选模式）
const parseValueToArray = (value: string | number | undefined): (string | number)[] => {
  if (value === undefined || value === null || value === '') {
    return []
  }
  if (Array.isArray(value)) {
    return value
  }
  // 将逗号分隔的字符串转为数组
  const strValue = String(value)
  return strValue.split(',').filter(v => v !== '')
}

// 将数组转为逗号分隔的字符串
const stringifyValue = (value: (string | number)[] | undefined): string | undefined => {
  if (!value || value.length === 0) {
    return undefined
  }
  return value.join(',')
}

// 内部值：单选时为 string|number|undefined，多选时为数组
const internalValue = ref<string | number | undefined | (string | number)[]>(
  props.multiple ? parseValueToArray(props.modelValue) : props.modelValue
)
const allDictItems = ref<BizDictVO[]>([]) // 所有字典项（系统+企业）
const loading = ref(false)
const manageModalVisible = ref(false)
const manageDictItems = ref<BizDictVO[]>([]) // 管理弹窗中的字典项
const editingItem = ref<BizDictVO | null>(null)
const editModalVisible = ref(false)

// 选项列表
const selectOptions = computed(() => {
  return allDictItems.value.map((item, index) => ({
    value: item.value,
    label: item.label,
    key: `${item.value}_${index}`,
    disabled: false,
    data: item
  }))
})

// 多选模式下超出数量时的占位显示
const maxTagPlaceholder = (omittedValues: (string | number)[]) => {
  if (omittedValues.length === 0) return ''
  // 获取省略项的标签名称
  const labels = omittedValues.map(v => {
    const item = allDictItems.value.find(d => d.value === v)
    return item?.label || v
  })
  // 显示省略的数量
  return `+${omittedValues.length}...`
}

// 加载字典数据
const loadDictData = async () => {
  if (!props.dictCode) {
    return
  }
  
  // 企业端模式需要 entityId
  if (!props.isManageMode && !props.entityId) {
    console.warn('企业端模式缺少 entityId，无法加载字典数据')
    return
  }
  
  try {
    loading.value = true
    
    // 统一使用新接口，通过 bizId 区分管理端和企业端
    const bizId = props.isManageMode ? null : props.entityId
    const res = await getEnterpriseDictByCode(
      { 
        dictCode: props.dictCode,
        bizId: bizId as string | null
      },
      false,
      false,
      false
    )
    
    if (res?.status?.code === 0 && res.payload) {
      // 按 sort 排序
      allDictItems.value = (res.payload as BizDictVO[]).sort((a, b) => (a.sort || 0) - (b.sort || 0))
    } else {
      allDictItems.value = []
    }
  } catch (error) {
    console.error('加载字典数据失败:', error)
    allDictItems.value = []
  } finally {
    loading.value = false
  }
}

// 处理选择变化
const handleChange = (value: string | number | undefined | (string | number)[]) => {
  internalValue.value = value
  
  if (props.multiple) {
    // 多选模式：返回逗号分隔的字符串
    const strValue = stringifyValue(value as (string | number)[])
    const selectedItems = (value as (string | number)[])
      .map(v => allDictItems.value.find(item => item.value === v))
      .filter(Boolean) as BizDictVO[]
    emit('update:modelValue', strValue as any)
    emit('change', strValue as any, selectedItems)
  } else {
    // 单选模式
    const option = allDictItems.value.find(item => item.value === value)
    emit('update:modelValue', value as string | number | undefined)
    emit('change', value as string | number | undefined, option)
  }
}

// 打开管理弹窗
const openManageModal = () => {
  // 复制字典数据到管理列表，确保按 sort 排序
  manageDictItems.value = JSON.parse(JSON.stringify(
    allDictItems.value.sort((a, b) => (a.sort || 0) - (b.sort || 0))
  ))
  manageModalVisible.value = true
}

// 添加新字典项
const addNewDictItem = () => {
  editingItem.value = {
    dictCode: props.dictCode,
    [props.entityIdField]: props.isManageMode ? null : props.entityId,
    label: '',
    value: '',
    description: '',
    sort: manageDictItems.value.length + 1,
    isDefault: '0'
  } as BizDictVO
  editModalVisible.value = true
}

// 编辑字典项
const editDictItem = (item: BizDictVO) => {
  editingItem.value = JSON.parse(JSON.stringify(item))
  editModalVisible.value = true
}

// 处理排序变化
const handleSortChange = async (items: BizDictVO[]) => {
  manageDictItems.value = items
  await autoSaveSortOrder()
}

// 删除字典项
const deleteDictItem = async (item: BizDictVO) => {
  // 只能删除企业字典项
  if (!item[props.entityIdField as keyof BizDictVO]) {
    message.warning('系统字典项不能删除')
    return
  }
  
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除字典项 "${item.label}" 吗？`,
    onOk: async () => {
      try {
        if (item.id) {
          // 统一使用新接口，通过 bizId 区分
          const bizId = props.isManageMode ? null : props.entityId
          if (!props.isManageMode && !bizId) {
            message.warning('缺少企业ID，无法删除')
            return
          }
          await deleteEnterpriseDict({ 
            id: item.id,
            bizId: bizId as string | null
          })
          message.success('删除成功')
          await loadDictData()
          // 更新管理列表
          manageDictItems.value = JSON.parse(JSON.stringify(allDictItems.value))
          // 重新保存顺序，确保 sort 连续
          await autoSaveSortOrder()
        } else {
          // 本地新增的项，直接删除
          const index = manageDictItems.value.findIndex(i => i === item)
          if (index > -1) {
            manageDictItems.value.splice(index, 1)
            // 重新计算并保存顺序
            await autoSaveSortOrder()
          }
        }
      } catch (error) {
        console.error('删除失败:', error)
      }
    }
  })
}

// 保存编辑的字典项
const saveEditItem = async (item: BizDictVO) => {
  // 企业端模式需要 entityId
  if (!props.isManageMode && !props.entityId) {
    message.warning('缺少企业ID，无法保存')
    return
  }
  
  try {
    // 统一使用新接口，通过 bizId 区分
    const bizId = props.isManageMode ? null : props.entityId
    
    if (item.id) {
      // 更新
      await systemBizDictUpdateEnterpriseDict(
        { bizId: bizId as string | null },
        item
      )
      message.success('更新成功')
    } else {
      // 新增
      await systemBizDictAddDict(
        { bizId: bizId as string | null },
        item
      )
      message.success('添加成功')
    }
    
    editModalVisible.value = false
    editingItem.value = null
    await loadDictData()
    // 更新管理列表
    manageDictItems.value = JSON.parse(JSON.stringify(allDictItems.value))
  } catch (error) {
    console.error('保存失败:', error)
  }
}

// 自动保存排序
const autoSaveSortOrder = async () => {
  // 企业端模式需要 entityId
  if (!props.isManageMode && !props.entityId) {
    return
  }
  
  try {
    // 统一使用新接口，通过 bizId 区分
    const bizId = props.isManageMode ? null : props.entityId
    
    // 根据 isManageMode 过滤要更新的字典项
    // isManageMode=true: 只更新系统字典项（bizId 为 null）
    // isManageMode=false: 只更新企业字典项（bizId 不为 null）
    // 排序需要全局连续，不同类型的项按在列表中的顺序编号
    const updatePromises: Promise<any>[] = []
    let sortCounter = 0
    
    manageDictItems.value.forEach((item) => {
      if (!item.id) return
      
      const isSystemItem = !item[props.entityIdField as keyof BizDictVO]
      
      // 判断是否需要更新该项
      const shouldUpdate = props.isManageMode ? isSystemItem : !isSystemItem
      
      // 所有项都递增计数器，保证全局连续
      sortCounter++
      
      if (shouldUpdate) {
        const updatedItem = {
          ...item,
          sort: sortCounter
        }
        // 同步更新本地数据
        item.sort = sortCounter
        
        updatePromises.push(
          systemBizDictUpdateEnterpriseDict(
            { bizId: bizId as string | null },
            updatedItem
          )
        )
      }
    })
    
    await Promise.all(updatePromises)
    message.success('排序已保存')
    await loadDictData()
  } catch (error) {
    console.error('保存排序失败:', error)
    message.error('保存排序失败')
  }
}

// 监听外部值变化
watch(() => props.modelValue, (newVal) => {
  if (props.multiple) {
    internalValue.value = parseValueToArray(newVal)
  } else {
    internalValue.value = newVal
  }
})

// 监听字典编码和企业ID变化，重新加载数据
watch([() => props.dictCode, () => props.entityId], () => {
  loadDictData()
}, { immediate: false })

// 初始化加载
onMounted(() => {
  loadDictData()
})

// 暴露刷新方法
defineExpose({
  refresh: loadDictData
})
</script>

<template>
  <div class="evaluation-dict-wrapper">
    <a-select
      v-model:value="internalValue"
      :disabled="disabled"
      :loading="loading"
      :placeholder="placeholder"
      :allow-clear="allowClear"
      :options="selectOptions"
      :mode="multiple ? 'multiple' : undefined"
      :max-tag-count="multiple ? 2 : undefined"
      :max-tag-placeholder="multiple ? maxTagPlaceholder : undefined"
      style="flex: 1"
      @change="handleChange"
    />
    <a-button
      v-if="showManageBtn"
      type="link"
      :disabled="disabled"
      @click="openManageModal"
    >
      {{ manageBtnText }}
    </a-button>
    
    <!-- 管理弹窗 -->
    <a-modal
      v-model:open="manageModalVisible"
      title="字典项配置"
      width="800px"
      :footer="null"
    >
      <div class="dict-manage-content">
        <div class="dict-manage-header">
          <a-button
            type="primary"
            @click="addNewDictItem"
          >
            <template #icon>
              <PlusOutlined />
            </template>
            添加字典项
          </a-button>
        </div>
        
        <div class="dict-list">
          <DictItemsList
            :items="manageDictItems"
            :entity-id-field="entityIdField"
            :is-manage-mode="isManageMode"
            sort-mode="buttons"
            @edit="editDictItem"
            @delete="deleteDictItem"
            @sort-change="handleSortChange"
          />
        </div>
      </div>
    </a-modal>
    
    <!-- 编辑弹窗 -->
    <DictItemEditModal
      v-model:visible="editModalVisible"
      :editing-item="editingItem"
      :all-items="allDictItems"
      @save="saveEditItem"
    />
  </div>
</template>

<style scoped lang="less">
.evaluation-dict-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dict-manage-content {
  .dict-manage-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 16px;
  }
}
</style>
