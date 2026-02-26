<script setup lang="ts">
/**
 * DictItemsManager - 字典项管理组件
 * 
 * 可复用的字典项配置组件，支持添加、编辑、删除、排序字典项
 */
import { PlusOutlined, AppstoreAddOutlined } from '@ant-design/icons-vue'
import { Modal, message } from 'ant-design-vue'
import pinyin from 'pinyin'
import { ref, watch } from 'vue'

import DictItemEditModal from './DictItemEditModal.vue'
import DictItemsList from './DictItemsList.vue'

import { deleteEnterpriseDict, systemBizDictAddDict, systemBizDictUpdateEnterpriseDict, getEnterpriseDictByCode, systemBizDictUpdateDictName, getDictExisted } from '@/framework/apis/dict/bizDictController'
import type { BizDictVO } from '@/framework/apis/dict/bizDictController'

interface Props {
  // 是否为管理端模式
  isManageMode?: boolean
  // 企业ID字段配置
  entityIdField?: string
  // 企业ID的值（管理端传null）
  entityId?: string | null
}

interface Emits {
  (e: 'refresh', dictCode?: string): void
}

const props = withDefaults(defineProps<Props>(), {
  isManageMode: true,
  entityIdField: 'bizId'
})

const emit = defineEmits<Emits>()

const visible = ref(false)
const isCreatingMode = ref(false)
const currentDictCode = ref('')
const currentDictName = ref('')
const newDictCode = ref('')
const newDictName = ref('')
const manageDictItems = ref<BizDictVO[]>([])
const editingItem = ref<BizDictVO | null>(null)
const editModalVisible = ref(false)
const batchAddModalVisible = ref(false)
const batchAddText = ref('')
const isEditingDictName = ref(false)
const editingDictName = ref('')

// 将字典名称转换为拼音编码
const convertNameToPinyinCode = (name: string): string => {
  try {
    // 将中文转换为拼音，使用下划线连接，并转为大写
    const pinyinResult = pinyin(name, {
      style: pinyin.STYLE_NORMAL, // 不带音调
      heteronym: false // 不返回多音字的所有读音
    })
    // pinyin() 返回二维数组，需要展平并用下划线连接
    const dictCode = pinyinResult
      .map((item: string[]) => item[0]) // 取每个字的拼音
      .filter((item: string) => /[a-zA-Z]/.test(item)) // 只保留字母
      .join('_') // 用下划线连接
      .toUpperCase() // 转大写
    
    return dictCode
  } catch (error) {
    console.warn('拼音转换失败:', error)
    return ''
  }
}

// 监听字典名称变化，自动生成字典编码
watch(() => newDictName.value, (newName) => {
  // 只有当字典编码为空且没有字典项时才自动生成
  if (!newDictCode.value && newName && manageDictItems.value.length === 0) {
    const dictCode = convertNameToPinyinCode(newName)
    if (dictCode) {
      newDictCode.value = dictCode
    }
  }
})

// 手动同步拼音到字典编码
const syncPinyinToDictCode = () => {
  if (!newDictName.value) {
    return
  }
  const dictCode = convertNameToPinyinCode(newDictName.value)
  if (dictCode) {
    newDictCode.value = dictCode
  }
}

// 重新加载字典项
const reloadDictItems = async (dictCode: string) => {
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
      manageDictItems.value = (res.payload as BizDictVO[]).sort((a, b) => (a.sort || 0) - (b.sort || 0))
    }
  } catch (error) {
    console.error('重新加载字典项失败:', error)
  }
}

// 打开管理弹窗（编辑现有字典）
const open = (dictCode: string, items: BizDictVO[]) => {
  isCreatingMode.value = false
  currentDictCode.value = dictCode
  // 从现有项中获取 dictName
  currentDictName.value = items.length > 0 && items[0].dictName ? items[0].dictName : ''
  editingDictName.value = currentDictName.value
  isEditingDictName.value = false
  manageDictItems.value = JSON.parse(JSON.stringify(items))
  visible.value = true
}

// 打开创建新字典模式
const openForCreate = () => {
  isCreatingMode.value = true
  currentDictCode.value = ''
  currentDictName.value = ''
  newDictCode.value = ''
  newDictName.value = ''
  editingDictName.value = ''
  isEditingDictName.value = false
  manageDictItems.value = []
  visible.value = true
}

// 添加新字典项
const addNewDictItem = async () => {
  // 创建模式下，先验证字典编码和名称
  if (isCreatingMode.value && !newDictCode.value) {
    message.warning('请先输入字典编码')
    return
  }
  
  if (isCreatingMode.value && !newDictName.value) {
    message.warning('请先输入字典名称')
    return
  }
  
  // 创建模式下，校验字典编码和名称是否已存在
  if (isCreatingMode.value) {
    try {
      // 校验字典编码是否已存在
      const codeCheckRes = await getDictExisted({ code: newDictCode.value }, false, false, false)
      if (codeCheckRes?.payload === '1') {
        message.warning(`字典编码 "${newDictCode.value}" 已存在，请使用其他编码`)
        return
      }
      
      // 校验字典名称是否已存在
      const nameCheckRes = await getDictExisted({ name: newDictName.value }, false, false, false)
      if (nameCheckRes?.payload === '1') {
        message.warning(`字典名称 "${newDictName.value}" 已存在，请使用其他名称`)
        return
      }
    } catch (error) {
      console.error('校验字典失败:', error)
      // 校验失败时不阻止操作，继续执行
    }
  }
  
  const dictCode = isCreatingMode.value ? newDictCode.value : currentDictCode.value
  const dictName = isCreatingMode.value ? newDictName.value : currentDictName.value
  
  editingItem.value = {
    dictCode,
    dictName,
    [props.entityIdField]: props.isManageMode ? null : props.entityId,
    label: '',
    value: '',
    description: '',
    sort: manageDictItems.value.length + 1,
    isDefault: '0'
  } as BizDictVO
  editModalVisible.value = true
}

// 批量添加字典项
const openBatchAddModal = () => {
  batchAddText.value = ''
  batchAddModalVisible.value = true
}

// 保存批量添加
const saveBatchAdd = async () => {
  if (!batchAddText.value.trim()) {
    message.warning('请输入字典项')
    return
  }
  
  // 创建模式下，先验证字典编码
  if (isCreatingMode.value && !newDictCode.value) {
    message.warning('请先输入字典编码')
    return
  }
  
  // 创建模式下，校验字典编码和名称是否已存在
  if (isCreatingMode.value) {
    try {
      // 校验字典编码是否已存在
      const codeCheckRes = await getDictExisted({ code: newDictCode.value }, false, false, false)
      if (codeCheckRes?.payload === '1') {
        message.warning(`字典编码 "${newDictCode.value}" 已存在，请使用其他编码`)
        return
      }
      
      // 校验字典名称是否已存在
      const nameCheckRes = await getDictExisted({ name: newDictName.value }, false, false, false)
      if (nameCheckRes?.payload === '1') {
        message.warning(`字典名称 "${newDictName.value}" 已存在，请使用其他名称`)
        return
      }
    } catch (error) {
      console.error('校验字典失败:', error)
      // 校验失败时不阻止操作，继续执行
    }
  }
  
  // 企业端模式需要 entityId
  if (!props.isManageMode && !props.entityId) {
    message.warning('缺少企业ID，无法保存')
    return
  }
  
  const dictCode = isCreatingMode.value ? newDictCode.value : currentDictCode.value
  const dictName = isCreatingMode.value ? newDictName.value : currentDictName.value
  
  // 解析批量添加文本
  const lines = batchAddText.value.split('\n').filter(line => line.trim())
  const itemsToAdd: Array<{ label: string; value: string; description?: string }> = []
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    
    // 支持多种格式：
    // 1. 名称|值|描述
    // 2. 名称|值
    // 3. 名称（自动生成值）
    const parts = trimmed.split('|').map(p => p.trim())
    
    if (parts.length >= 2) {
      itemsToAdd.push({
        label: parts[0],
        value: parts[1],
        description: parts[2] || ''
      })
    } else if (parts.length === 1) {
      // 只有名称，自动生成值
      itemsToAdd.push({
        label: parts[0],
        value: parts[0],
        description: ''
      })
    }
  }
  
  if (itemsToAdd.length === 0) {
    message.warning('没有有效的字典项')
    return
  }
  
  try {
    // 批量添加
    const bizId = props.isManageMode ? null : props.entityId
    const currentMaxSort = Math.max(...manageDictItems.value.map(item => item.sort || 0), 0)
    const addPromises = itemsToAdd.map((item, index) => {
      const newItem = {
        dictCode,
        dictName,
        [props.entityIdField]: bizId,
        label: item.label,
        value: item.value,
        description: item.description,
        sort: currentMaxSort + index + 1,
        isDefault: '0'
      } as BizDictVO
      
      return systemBizDictAddDict(
        { bizId: bizId as string },
        newItem
      )
    })
    
    await Promise.all(addPromises)
    message.success(`成功添加 ${itemsToAdd.length} 个字典项`)
    
    batchAddModalVisible.value = false
    batchAddText.value = ''
    
    // 如果是创建模式，切换为编辑模式
    if (isCreatingMode.value) {
      isCreatingMode.value = false
      currentDictCode.value = dictCode
      currentDictName.value = dictName
    }
    
    // 重新加载字典项以更新列表
    await reloadDictItems(dictCode)
    
    emit('refresh', dictCode)
    // 不关闭主弹窗，重新加载数据
  } catch (error) {
    console.error('批量添加失败:', error)
    message.error('批量添加失败')
  }
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
  console.log('=== deleteDictItem 被调用 ===')
  console.log('要删除的项:', item)
  console.log('isManageMode:', props.isManageMode)
  console.log('entityIdField:', props.entityIdField)
  
  // 管理端模式下可以删除所有项，企业端只能删除企业字典项
  if (!props.isManageMode && !item[props.entityIdField as keyof BizDictVO]) {
    message.warning('系统字典项不能删除')
    return
  }
  
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除字典项 "${item.label}" 吗？`,
    onOk: async () => {
      console.log('用户确认删除')
      try {
        if (item.id) {
          console.log('删除已有项，id:', item.id)
          const bizId = props.isManageMode ? null : props.entityId
          console.log('bizId:', bizId)
          if (!props.isManageMode && !bizId) {
            message.warning('缺少企业ID，无法删除')
            return
          }
          await deleteEnterpriseDict({ 
            id: item.id,
            bizId: bizId as string
          })
          console.log('删除接口调用成功')
          message.success('删除成功')
          
          const dictCode = isCreatingMode.value ? newDictCode.value : currentDictCode.value
          console.log('dictCode:', dictCode)
          
          // 重新加载字典项以更新列表
          console.log('开始重新加载字典项')
          await reloadDictItems(dictCode)
          console.log('重新加载完成，当前项数:', manageDictItems.value.length)
          
          // 重新保存顺序，确保 sort 连续
          console.log('准备调用 autoSaveSortOrder')
          await autoSaveSortOrder()
          console.log('autoSaveSortOrder 调用完成')
          
          emit('refresh', dictCode)
          // 不关闭弹窗
        } else {
          console.log('删除本地新增项')
          // 本地新增的项，直接删除
          const index = manageDictItems.value.findIndex(i => i === item)
          if (index > -1) {
            manageDictItems.value.splice(index, 1)
            console.log('准备调用 autoSaveSortOrder (本地删除)')
            // 重新计算并保存顺序
            await autoSaveSortOrder()
            console.log('autoSaveSortOrder 调用完成 (本地删除)')
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
  // 创建模式下，先验证字典编码
  if (isCreatingMode.value && !newDictCode.value) {
    message.warning('请先输入字典编码')
    return
  }
  
  // 企业端模式需要 entityId
  if (!props.isManageMode && !props.entityId) {
    message.warning('缺少企业ID，无法保存')
    return
  }
  
  const dictCode = isCreatingMode.value ? newDictCode.value : currentDictCode.value
  const dictName = isCreatingMode.value ? newDictName.value : currentDictName.value
  
  // 确保 dictCode 和 dictName 被包含
  if (!item.dictCode) {
    item.dictCode = dictCode
  }
  if (!item.dictName) {
    item.dictName = dictName
  }
  
  try {
    // 统一使用新接口，通过 bizId 区分
    const bizId = props.isManageMode ? null : props.entityId
    
    if (item.id) {
      // 更新
      await systemBizDictUpdateEnterpriseDict(
        { bizId: bizId as string },
        item
      )
      message.success('更新成功')
    } else {
      // 新增
      await systemBizDictAddDict(
        { bizId: bizId as string },
        item
      )
      message.success('添加成功')
    }
    
    editModalVisible.value = false
    editingItem.value = null
    
    // 如果是创建模式，切换为编辑模式
    if (isCreatingMode.value) {
      isCreatingMode.value = false
      currentDictCode.value = dictCode
      currentDictName.value = dictName
    }
    
    // 重新加载字典项以更新列表
    await reloadDictItems(dictCode)
    
    emit('refresh', dictCode)
    // 不关闭主弹窗
  } catch (error) {
    console.error('保存失败:', error)
  }
}

// 保存字典名称
const saveDictName = async () => {
  if (!editingDictName.value.trim()) {
    message.warning('字典名称不能为空')
    return
  }
  
  if (editingDictName.value === currentDictName.value) {
    isEditingDictName.value = false
    return
  }
  
  // 校验新的字典名称是否已存在
  try {
    const nameCheckRes = await getDictExisted({ name: editingDictName.value }, false, false, false)
    if (nameCheckRes?.payload === '1') {
      message.warning(`字典名称 "${editingDictName.value}" 已存在，请使用其他名称`)
      return
    }
  } catch (error) {
    console.error('校验字典名称失败:', error)
    // 校验失败时不阻止操作，继续执行
  }
  
  try {
    // 调用更新字典名称接口
    // value 填 dictCode, label 填 dictName
    await systemBizDictUpdateDictName(
      {
        value: currentDictCode.value,
        label: editingDictName.value
      }
    )
    
    currentDictName.value = editingDictName.value
    isEditingDictName.value = false
    
    // 重新加载字典项以更新 dictName
    await reloadDictItems(currentDictCode.value)
    
    emit('refresh', currentDictCode.value)
  } catch (error) {
    console.error('更新字典名称失败:', error)
  }
}

// 取消编辑字典名称
const cancelEditDictName = () => {
  editingDictName.value = currentDictName.value
  isEditingDictName.value = false
}

// 自动保存排序
const autoSaveSortOrder = async () => {
  console.log('=== autoSaveSortOrder 被调用 ===')
  console.log('isCreatingMode:', isCreatingMode.value)
  console.log('newDictCode:', newDictCode.value)
  console.log('isManageMode:', props.isManageMode)
  console.log('entityId:', props.entityId)
  
  // 创建模式下，先验证字典编码
  if (isCreatingMode.value && !newDictCode.value) {
    console.log('创建模式下缺少字典编码，返回')
    return
  }
  
  // 企业端模式需要 entityId
  if (!props.isManageMode && !props.entityId) {
    console.log('企业模式下缺少 entityId，返回')
    return
  }
  
  const dictCode = isCreatingMode.value ? newDictCode.value : currentDictCode.value
  
  try {
    // 统一使用新接口，通过 bizId 区分
    const bizId = props.isManageMode ? null : props.entityId
    
    console.log('=== 自动保存排序 ===')
    console.log('isManageMode:', props.isManageMode)
    console.log('entityIdField:', props.entityIdField)
    console.log('bizId:', bizId)
    
    // 根据 isManageMode 过滤要更新的字典项
    // isManageMode=true: 只更新系统字典项（bizId 为 null）
    // isManageMode=false: 只更新企业字典项（bizId 不为 null）
    // 排序需要全局连续，不同类型的项按在列表中的顺序编号
    const updatePromises: Promise<any>[] = []
    let sortCounter = 0
    
    manageDictItems.value.forEach((item) => {
      if (!item.id) return
      
      const isSystemItem = !item[props.entityIdField as keyof BizDictVO]
      
      console.log(`项 id=${item.id}, label=${item.label}, ${props.entityIdField}=${item[props.entityIdField as keyof BizDictVO]}, isSystemItem=${isSystemItem}`)
      
      // 判断是否需要更新该项
      const shouldUpdate = props.isManageMode ? isSystemItem : !isSystemItem
      
      console.log(`  shouldUpdate=${shouldUpdate}`)
      
      // 所有项都递增计数器，保证全局连续
      sortCounter++
      
      if (shouldUpdate) {
        console.log(`  将更新 sort 为 ${sortCounter}`)
        const updatedItem = {
          ...item,
          sort: sortCounter
        }
        updatePromises.push(
          systemBizDictUpdateEnterpriseDict(
            { bizId: bizId as string | null },
            updatedItem
          )
        )
      }
    })
    
    console.log(`共需更新 ${updatePromises.length} 个项`)
    
    await Promise.all(updatePromises)
    message.success('排序已保存')
    emit('refresh', dictCode)
  } catch (error) {
    console.error('保存排序失败:', error)
    message.error('保存排序失败')
  }
}

defineExpose({
  open,
  openForCreate
})
</script>

<template>
  <div>
    <!-- 管理弹窗 -->
    <a-modal
      v-model:open="visible"
      width="800px"
      :footer="null"
    >
      <template #title>
        <div style="display: flex; align-items: center; gap: 12px;">
          <span v-if="isCreatingMode">添加字典</span>
          <template v-else>
            <span v-if="!isEditingDictName">
              {{ currentDictName || '字典项配置' }}
            </span>
            <a-input
              v-else
              v-model:value="editingDictName"
              placeholder="请输入字典名称"
              style="width: 200px;"
              size="small"
              @press-enter="saveDictName"
            />
            <a-button
              v-if="!isEditingDictName"
              type="link"
              size="small"
              @click="isEditingDictName = true"
            >
              编辑
            </a-button>
            <template v-else>
              <a-button
                type="primary"
                size="small"
                @click="saveDictName"
              >
                保存
              </a-button>
              <a-button
                size="small"
                @click="cancelEditDictName"
              >
                取消
              </a-button>
            </template>
          </template>
        </div>
      </template>
      
      <div class="dict-manage-content">
        <div
          v-if="isCreatingMode"
          class="dict-info-section"
        >
          <a-alert
            message="创建新字典"
            type="info"
            show-icon
            style="margin-bottom: 16px;"
          >
            <template #description>
              请先输入字典编码，然后添加字典项。至少需要添加一个字典项后才能保存字典。
            </template>
          </a-alert>
          <a-form
            :label-col="{ span: 4 }"
            :wrapper-col="{ span: 20 }"
          >
            <a-form-item
              label="字典名称"
              required
            >
              <a-input
                v-model:value="newDictName"
                placeholder="请输入字典名称"
              />
              <template #extra>
                <span style="color: #8c8c8c; font-size: 12px;">
                  用于显示的字典名称，如：产品类型
                </span>
              </template>
            </a-form-item>
            <a-form-item
              label="字典编码"
              required
            >
              <a-input-group compact>
                <a-input
                  v-model:value="newDictCode"
                  placeholder="如: PRODUCT_TYPE"
                  :disabled="manageDictItems.length > 0"
                  style="width: calc(100% - 80px)"
                />
                <a-button
                  type="primary"
                  style="width: 80px"
                  :disabled="manageDictItems.length > 0"
                  @click="syncPinyinToDictCode"
                >
                  同步拼音
                </a-button>
              </a-input-group>
              <template #extra>
                <span style="color: #8c8c8c; font-size: 12px;">
                  建议使用大写字母和下划线，如: PRODUCT_TYPE
                  <span
                    v-if="manageDictItems.length > 0"
                    style="color: #52c41a;"
                  >
                    （已添加字典项，不可修改）
                  </span>
                </span>
              </template>
            </a-form-item>
          </a-form>
          <a-divider style="margin: 12px 0;" />
        </div>
        
        <div class="dict-manage-header">
          <a-space>
            <a-button
              type="primary"
              @click="addNewDictItem"
            >
              <template #icon>
                <PlusOutlined />
              </template>
              添加单个
            </a-button>
            <a-button
              @click="openBatchAddModal"
            >
              <template #icon>
                <AppstoreAddOutlined />
              </template>
              批量添加
            </a-button>
          </a-space>
        </div>
        
        <div class="dict-list">
          <DictItemsList
            :items="manageDictItems"
            :entity-id-field="entityIdField"
            :is-manage-mode="isManageMode"
            sort-mode="drag"
            @edit="editDictItem"
            @delete="deleteDictItem"
            @sort-change="handleSortChange"
          />
        </div>
      </div>
    </a-modal>
    
    <!-- 批量添加弹窗 -->
    <a-modal
      v-model:open="batchAddModalVisible"
      title="批量添加字典项"
      width="600px"
      @ok="saveBatchAdd"
    >
      <a-alert
        message="输入格式说明"
        type="info"
        show-icon
        style="margin-bottom: 16px;"
      >
        <template #description>
          <div>
            支持三种格式（每行一个字典项）：<br />
            1. <code>名称|值|描述</code> - 例如：甲类|A|甲类材料<br />
            2. <code>名称|值</code> - 例如：乙类|B<br />
            3. <code>名称</code> - 值自动使用名称，例如：丙类
          </div>
        </template>
      </a-alert>
      <a-form
        :label-col="{ span: 4 }"
        :wrapper-col="{ span: 20 }"
      >
        <a-form-item label="字典项">
          <a-textarea
            v-model:value="batchAddText"
            placeholder="甲类|A|甲类材料&#10;乙类|B|乙类材料&#10;丙类|C&#10;丁类"
            :rows="10"
          />
        </a-form-item>
      </a-form>
    </a-modal>
    
    <!-- 编辑弹窗 -->
    <DictItemEditModal
      v-model:visible="editModalVisible"
      :editing-item="editingItem"
      :all-items="manageDictItems"
      @save="saveEditItem"
    />
  </div>
</template>

<style scoped lang="less">
.dict-manage-content {
  .dict-info-section {
    margin-bottom: 16px;
  }
  
  .dict-manage-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 16px;
  }
}
</style>
