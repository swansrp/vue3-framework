<script setup lang="ts">
import { PlusOutlined } from '@ant-design/icons-vue'
import { Modal, message } from 'ant-design-vue'
import { ref, watch } from 'vue'

import {
  searchByDictName,
  searchByDictItemName,
  getEnterpriseDictByCode,
  getDictList,
  deleteEnterpriseDict,
  systemBizDictAddDict,
  systemBizDictUpdateEnterpriseDict,
  getDictExisted,
  systemBizDictUpdateDictName
} from '@/framework/apis/dict/bizDictController'
import type { BizDictVO, BizDictRes } from '@/framework/apis/dict/bizDictController'
import { deleteDict } from '@/framework/apis/dict/dict'
import DictItemEditModal from '@/framework/components/common/dict/DictItemEditModal.vue'

// 左侧字典列表
const dictList = ref<BizDictRes[]>([])
const dictListLoading = ref(false)
const dictNameSearch = ref('')
const selectedDictCode = ref<string>('')
const selectedDictName = ref<string>('')

// 右侧字典项列表
const dictItems = ref<BizDictVO[]>([])
const dictItemsLoading = ref(false)

// 右侧反查功能
const itemLabelSearch = ref('')
const itemSearchLoading = ref(false)
const itemSearchResults = ref<BizDictRes[]>([])
const showItemSearchResults = ref(false)

// 编辑弹窗
const editModalVisible = ref(false)
const editingItem = ref<BizDictVO | null>(null)

// 新增字典弹窗
const addDictModalVisible = ref(false)
const addDictFormRef = ref()
// 新增字典表单：包含字典类型信息和第一个字典项
const addDictForm = ref({
  dictCode: '',      // 字典编码
  dictName: '',      // 字典名称
  label: '',         // 第一个字典项名称
  value: '',         // 第一个字典项值
  description: '',   // 描述
  isDefault: '0'     // 是否默认
})

// 编辑字典名称
const isEditingDictName = ref(false)
const editingDictName = ref('')

// 字典名称映射（dictCode → dictName）
const dictNameMap = ref<Record<string, string>>({})

// 上级字典项值→标签映射（格式：parentDictCode_parentValue → label）
const parentValueLabelMap = ref<Record<string, string>>({})

// 加载字典列表
const loadDictList = async () => {
  dictListLoading.value = true
  try {
    const res = await searchByDictName(
        dictNameSearch.value ? { dictName: dictNameSearch.value } : {},
        false,
        false,
        true
    )
    if (res?.status?.code === 0 && res.payload) {
      dictList.value = res.payload
    } else {
      dictList.value = []
    }
  } catch (error) {
    console.error('加载字典列表失败:', error)
    dictList.value = []
  } finally {
    dictListLoading.value = false
  }
}

// 根据字典项名称反查
const searchByItemLabel = async () => {
  if (!itemLabelSearch.value.trim()) {
    showItemSearchResults.value = false
    itemSearchResults.value = []
    return
  }

  itemSearchLoading.value = true
  showItemSearchResults.value = true
  try {
    const res = await searchByDictItemName(
        { itemName: itemLabelSearch.value },
        false,
        false,
        true
    )
    if (res?.status?.code === 0 && res.payload) {
      itemSearchResults.value = res.payload
    } else {
      itemSearchResults.value = []
    }
  } catch (error) {
    console.error('反查字典失败:', error)
    itemSearchResults.value = []
  } finally {
    itemSearchLoading.value = false
  }
}

// 选择字典
const selectDict = (dict: BizDictRes) => {
  selectedDictCode.value = dict.dictCode || ''
  selectedDictName.value = dict.dictName || ''
  showItemSearchResults.value = false
  loadDictItems()
}

// 加载字典项
const loadDictItems = async () => {
  if (!selectedDictCode.value) {
    dictItems.value = []
    return
  }

  dictItemsLoading.value = true
  try {
    const res = await getEnterpriseDictByCode(
        { dictCode: selectedDictCode.value, bizId: null as any },
        false,
        false,
        true
    )
    if (res?.status?.code === 0 && res.payload) {
      dictItems.value = (res.payload as BizDictVO[]).sort((a, b) => (a.sort || 0) - (b.sort || 0))
      // 加载上级字典项的映射
      await loadParentValueLabelMap()
    } else {
      dictItems.value = []
    }
  } catch (error) {
    console.error('加载字典项失败:', error)
    dictItems.value = []
  } finally {
    dictItemsLoading.value = false
  }
}

// 加载字典名称映射
const loadDictNameMap = async () => {
  try {
    const res = await getDictList({ bizId: undefined }, false, false, false)

    if (res?.status?.code === 0 && res.payload) {
      const nameMap: Record<string, string> = {}
      ;(res.payload as Array<{ value?: string; label?: string }>).forEach((item: any) => {
        if (item.value) {
          nameMap[item.value] = item.label || item.value
        }
      })
      dictNameMap.value = nameMap
    }
  } catch (error) {
    console.error('加载字典名称映射失败:', error)
  }
}

// 加载上级字典项的 value→label 映射
const loadParentValueLabelMap = async () => {
  // 收集所有需要加载的上级字典编码
  const parentDictCodes = new Set<string>()
  dictItems.value.forEach(item => {
    if (item.parentDictCode) {
      parentDictCodes.add(item.parentDictCode)
    }
  })

  if (parentDictCodes.size === 0) {
    parentValueLabelMap.value = {}
    return
  }

  const newMap: Record<string, string> = {}

  // 并行加载所有上级字典的项
  await Promise.all(
      Array.from(parentDictCodes).map(async (dictCode) => {
        try {
          const res = await getEnterpriseDictByCode(
              { dictCode, bizId: null as any },
              false,
              false,
              false
          )

          if (res?.status?.code === 0 && res.payload) {
            const items = res.payload as BizDictVO[]
            items.forEach(item => {
              if (item.value) {
                // 使用 "dictCode_value" 作为 key
                newMap[`${dictCode}_${item.value}`] = item.label || item.value
              }
            })
          }
        } catch (error) {
          console.error(`加载上级字典 ${dictCode} 失败:`, error)
        }
      })
  )

  parentValueLabelMap.value = newMap
}

// 从反查结果选择字典
const selectDictFromSearch = (dict: BizDictRes) => {
  itemLabelSearch.value = ''
  showItemSearchResults.value = false
  selectDict(dict)
}

// 添加新字典项
const addNewDictItem = () => {
  if (!selectedDictCode.value) {
    message.warning('请先选择一个字典')
    return
  }
  editingItem.value = {
    dictCode: selectedDictCode.value,
    dictName: selectedDictName.value,
    bizId: null,
    label: '',
    value: '',
    description: '',
    sort: dictItems.value.length + 1,
    isDefault: '0'
  } as BizDictVO
  editModalVisible.value = true
}

// 编辑字典项
const editDictItem = (item: BizDictVO) => {
  editingItem.value = JSON.parse(JSON.stringify(item))
  editModalVisible.value = true
}

// 删除字典项
const deleteDictItem = async (item: BizDictVO) => {
  if (!item.bizId && item.bizId !== null) {
    message.warning('系统字典项不能删除')
    return
  }

  Modal.confirm({
    title: '确认删除',
    content: `确定要删除字典项 "${item.label}" 吗？`,
    onOk: async () => {
      try {
        if (item.id) {
          await deleteEnterpriseDict({ id: item.id, bizId: null as any })
          message.success('删除成功')
          await loadDictItems()
        }
      } catch (error) {
        console.error('删除失败:', error)
      }
    }
  })
}

// 保存编辑
const saveEditItem = async (item: BizDictVO) => {
  try {
    if (item.id) {
      await systemBizDictUpdateEnterpriseDict({ bizId: null as any }, item)
      message.success('更新成功')
    } else {
      await systemBizDictAddDict({ bizId: null as any }, item)
      message.success('添加成功')
    }
    editModalVisible.value = false
    editingItem.value = null
    await loadDictItems()
  } catch (error) {
    console.error('保存失败:', error)
  }
}

// 拖拽排序
const draggedItemIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

const onItemDragStart = (index: number) => {
  draggedItemIndex.value = index
}

const onItemDragOver = (index: number) => {
  dragOverIndex.value = index
}

const onItemDrop = (targetIndex: number) => {
  if (draggedItemIndex.value === null || draggedItemIndex.value === targetIndex) {
    draggedItemIndex.value = null
    dragOverIndex.value = null
    return
  }
  const items = [...dictItems.value]
  const [movedItem] = items.splice(draggedItemIndex.value, 1)
  items.splice(targetIndex, 0, movedItem)
  draggedItemIndex.value = null
  dragOverIndex.value = null
  handleSortChange(items)
}

const onItemDragEnd = () => {
  draggedItemIndex.value = null
  dragOverIndex.value = null
}

// 获取上级字典项标签
const getParentValueLabel = (parentDictCode: string, parentValue: string): string => {
  return parentValueLabelMap.value[`${parentDictCode}_${parentValue}`] || parentValue
}

// 排序变化
const handleSortChange = async (items: BizDictVO[]) => {
  dictItems.value = items
  try {
    const updatePromises: Promise<any>[] = []
    let sortCounter = 0

    items.forEach((item) => {
      if (!item.id) return
      sortCounter++
      const updatedItem = { ...item, sort: sortCounter }
      item.sort = sortCounter
      updatePromises.push(
          systemBizDictUpdateEnterpriseDict({ bizId: null as any }, updatedItem)
      )
    })

    await Promise.all(updatePromises)
    message.success('排序已保存')
    await loadDictItems()
  } catch (error) {
    console.error('保存排序失败:', error)
    message.error('保存排序失败')
  }
}

// 添加字典（一步完成：创建字典类型 + 添加第一个字典项）
const handleAddDict = () => {
  addDictModalVisible.value = true
}

const onAddDictFinish = async () => {
  // 校验字典编码是否已存在
  try {
    const codeCheckRes = await getDictExisted({ code: addDictForm.value.dictCode }, false, false, false)
    if (codeCheckRes?.payload === '1') {
      message.warning(`字典编码 "${addDictForm.value.dictCode}" 已存在，请使用其他编码`)
      return
    }
  } catch (error) {
    console.error('校验字典编码失败:', error)
  }
  
  // 校验字典名称是否已存在
  try {
    const nameCheckRes = await getDictExisted({ name: addDictForm.value.dictName }, false, false, false)
    if (nameCheckRes?.payload === '1') {
      message.warning(`字典名称 "${addDictForm.value.dictName}" 已存在，请使用其他名称`)
      return
    }
  } catch (error) {
    console.error('校验字典名称失败:', error)
  }
  
  try {
    // 使用业务字典接口添加第一个字典项，同时创建字典类型
    await systemBizDictAddDict(
      { bizId: null as any },
      {
        dictCode: addDictForm.value.dictCode,
        dictName: addDictForm.value.dictName,
        label: addDictForm.value.label,
        value: addDictForm.value.value,
        description: addDictForm.value.description,
        isDefault: addDictForm.value.isDefault,
        sort: 1,
        bizId: null
      }
    )
    message.success('字典创建成功')
    addDictModalVisible.value = false
    // 选中新创建的字典
    selectedDictCode.value = addDictForm.value.dictCode
    selectedDictName.value = addDictForm.value.dictName
    // 重置表单
    addDictForm.value = {
      dictCode: '',
      dictName: '',
      label: '',
      value: '',
      description: '',
      isDefault: '0'
    }
    addDictFormRef.value?.resetFields()
    await loadDictList()
    await loadDictItems()
  } catch (error) {
    console.error('添加字典失败:', error)
  }
}

// 编辑字典名称
const startEditDictName = () => {
  editingDictName.value = selectedDictName.value
  isEditingDictName.value = true
}

const cancelEditDictName = () => {
  editingDictName.value = ''
  isEditingDictName.value = false
}

const saveDictName = async () => {
  if (!editingDictName.value.trim()) {
    message.warning('字典名称不能为空')
    return
  }
  
  if (editingDictName.value === selectedDictName.value) {
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
  }
  
  try {
    // 调用更新字典名称接口
    // value 填 dictCode, label 填 dictName
    await systemBizDictUpdateDictName({
      value: selectedDictCode.value,
      label: editingDictName.value
    })
    
    selectedDictName.value = editingDictName.value
    isEditingDictName.value = false
    message.success('字典名称更新成功')
    
    // 重新加载字典列表和字典项
    await loadDictList()
    await loadDictItems()
  } catch (error) {
    console.error('更新字典名称失败:', error)
  }
}

const resetAddDictForm = () => {
  addDictFormRef.value?.resetFields()
}

// 删除字典
const handleDeleteDict = () => {
  if (!selectedDictCode.value) {
    message.warning('请先选择一个字典')
    return
  }

  Modal.confirm({
    title: '确认删除',
    content: `确定要删除字典 "${selectedDictName.value}" 吗？该操作会删除该字典对应的所有字典项！`,
    okType: 'danger',
    onOk: async () => {
      try {
        await deleteDict({ id: selectedDictCode.value })
        message.success('删除字典成功')
        selectedDictCode.value = ''
        selectedDictName.value = ''
        dictItems.value = []
        await loadDictList()
      } catch (error) {
        console.error('删除字典失败:', error)
      }
    }
  })
}

// 监听字典名称搜索
let dictNameTimer: ReturnType<typeof setTimeout> | null = null
watch(dictNameSearch, () => {
  if (dictNameTimer) clearTimeout(dictNameTimer)
  dictNameTimer = setTimeout(() => {
    loadDictList()
  }, 300)
})

// 监听字典项名称搜索
let itemLabelTimer: ReturnType<typeof setTimeout> | null = null
watch(itemLabelSearch, () => {
  if (itemLabelTimer) clearTimeout(itemLabelTimer)
  itemLabelTimer = setTimeout(() => {
    searchByItemLabel()
  }, 300)
})

// 初始化
loadDictList()
loadDictNameMap()
</script>

<template>
  <div class="dict-manage-page">
    <!-- 左侧字典列表 -->
    <div class="dict-list-panel">
      <div class="panel-header">
        <div class="header-top">
          <h3>字典列表</h3>
          <a-button
            type="primary"
            size="small"
            @click="handleAddDict"
          >
            <template #icon>
              <PlusOutlined />
            </template>
            新增字典
          </a-button>
        </div>
        <a-input-search
          v-model:value="dictNameSearch"
          placeholder="搜索字典名称"
          :loading="dictListLoading"
          allow-clear
        />
      </div>
      <div class="panel-content">
        <a-spin :spinning="dictListLoading">
          <div
            v-for="dict in dictList"
            :key="dict.dictCode"
            :class="['dict-list-item', { active: selectedDictCode === dict.dictCode }]"
            @click="selectDict(dict)"
          >
            <div class="dict-list-item-info">
              <span class="dict-list-item-name">{{ dict.dictName }}</span>
              <span class="dict-list-item-code">{{ dict.dictCode }}</span>
            </div>
            <a-tag
              v-if="dict.dictItemList?.length"
              color="blue"
              style="margin: 0;"
            >
              {{ dict.dictItemList.length }}项
            </a-tag>
          </div>
          <a-empty
            v-if="dictList.length === 0 && !dictListLoading"
            description="暂无字典数据"
          />
        </a-spin>
      </div>
    </div>

    <!-- 右侧字典项管理 -->
    <div class="dict-items-panel">
      <div class="panel-header">
        <h3
          v-if="selectedDictCode"
          style="display: flex; align-items: center; gap: 8px;"
        >
          <template v-if="!isEditingDictName">
            <span>{{ selectedDictName }}</span>
            <a-button
              type="link"
              size="small"
              @click="startEditDictName"
            >
              编辑
            </a-button>
          </template>
          <template v-else>
            <a-input
              v-model:value="editingDictName"
              placeholder="请输入字典名称"
              style="width: 200px;"
              size="small"
              @press-enter="saveDictName"
            />
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
          <span class="dict-code-tag">{{ selectedDictCode }}</span>
        </h3>
        <h3 v-else>
          字典项管理
        </h3>

        <!-- 反查搜索框 -->
        <a-input-search
          v-model:value="itemLabelSearch"
          placeholder="根据字典项名称反查字典"
          :loading="itemSearchLoading"
          allow-clear
          @search="searchByItemLabel"
        />
      </div>

      <div class="panel-content">
        <!-- 反查结果 -->
        <div
          v-if="showItemSearchResults"
          class="item-search-results"
        >
          <div class="search-result-header">
            <span>包含「{{ itemLabelSearch }}」的字典项结果</span>
            <a-button
              type="link"
              size="small"
              @click="showItemSearchResults = false"
            >
              关闭
            </a-button>
          </div>
          <a-spin :spinning="itemSearchLoading">
            <div
              v-for="dict in itemSearchResults"
              :key="dict.dictCode"
              class="search-result-item"
              @click="selectDictFromSearch(dict)"
            >
              <div class="dict-info">
                <span class="dict-name">{{ dict.dictName }}</span>
                <span class="dict-code">{{ dict.dictCode }}</span>
              </div>
              <div class="matched-items">
                <a-tag
                  v-for="item in dict.dictItemList?.slice(0, 3)"
                  :key="item.id"
                  color="orange"
                >
                  {{ item.label }}
                </a-tag>
                <a-tag
                  v-if="(dict.dictItemList?.length || 0) > 3"
                  color="default"
                >
                  +{{ dict.dictItemList!.length - 3 }}
                </a-tag>
              </div>
            </div>
            <a-empty
              v-if="itemSearchResults.length === 0 && !itemSearchLoading"
              description="未找到匹配的字典项"
            />
          </a-spin>
        </div>

        <!-- 字典项列表 -->
        <div
          v-else
          class="dict-items-content"
        >
          <template v-if="selectedDictCode">
            <div class="items-toolbar">
              <a-button
                type="primary"
                @click="addNewDictItem"
              >
                <template #icon>
                  <PlusOutlined />
                </template>
                添加字典项
              </a-button>
              <a-button
                danger
                @click="handleDeleteDict"
              >
                删除字典
              </a-button>
            </div>
            <a-spin :spinning="dictItemsLoading">
              <div class="items-grid">
                <div
                  v-for="(item, index) in dictItems"
                  :key="item.id || index"
                  class="item-card"
                  :class="{
                    'item-card-dragging': draggedItemIndex === index,
                    'item-card-over': dragOverIndex === index && draggedItemIndex !== null && draggedItemIndex !== index
                  }"
                  draggable="true"
                  @dragstart="onItemDragStart(index)"
                  @dragover.prevent="onItemDragOver(index)"
                  @drop="onItemDrop(index)"
                  @dragend="onItemDragEnd"
                >
                  <span class="item-card-sort">{{ index + 1 }}</span>
                  <div class="item-card-body" @click="editDictItem(item)">
                    <div class="item-card-label">{{ item.label }}</div>
                    <div class="item-card-value">{{ item.value }}</div>
                    <div
                      v-if="item.parentDictCode && item.parentValue"
                      class="item-card-parent"
                    >
                      ← {{ dictNameMap[item.parentDictCode] || item.parentDictCode }} / {{ getParentValueLabel(item.parentDictCode, item.parentValue) }}
                    </div>
                    <a-tag
                      v-if="item.bizId == null"
                      class="item-card-sys-tag"
                      color="orange"
                    >
                      系统
                    </a-tag>
                  </div>
                  <div class="item-card-actions">
                    <a-button
                      size="small"
                      type="link"
                      @click="editDictItem(item)"
                    >
                      编辑
                    </a-button>
                    <a-button
                      size="small"
                      type="link"
                      danger
                      @click="deleteDictItem(item)"
                    >
                      删除
                    </a-button>
                  </div>
                </div>
              </div>
            </a-spin>
          </template>
          <a-empty
            v-else
            description="请在左侧选择一个字典"
          />
        </div>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <DictItemEditModal
      v-model:visible="editModalVisible"
      :editing-item="editingItem"
      :all-items="dictItems"
      :current-item-id="editingItem?.id"
      :current-dict-code="selectedDictCode"
      :is-manage-mode="true"
      @save="saveEditItem"
    />

    <!-- 新增字典弹窗 -->
    <a-modal
      v-model:open="addDictModalVisible"
      title="新增字典"
      :width="520"
      @ok="onAddDictFinish"
      @cancel="resetAddDictForm"
    >
      <a-form
        ref="addDictFormRef"
        :model="addDictForm"
        :label-col="{ span: 6 }"
        :wrapper-col="{ span: 14 }"
      >
        <a-divider orientation="left">
          字典类型
        </a-divider>
        <a-form-item
          label="字典名称"
          name="dictName"
          :rules="[{ required: true, message: '请输入字典名称!' }]"
        >
          <a-input
            v-model:value="addDictForm.dictName"
            placeholder="如：订单状态"
          />
        </a-form-item>
        <a-form-item
          label="字典编码"
          name="dictCode"
          :rules="[{ required: true, message: '请填写字典编码!' }]"
        >
          <a-input
            v-model:value="addDictForm.dictCode"
            placeholder="如：ORDER_STATUS"
          />
        </a-form-item>
        
        <a-divider orientation="left">
          第一个字典项
        </a-divider>
        <a-form-item
          label="字典项名称"
          name="label"
          :rules="[{ required: true, message: '请输入字典项名称!' }]"
        >
          <a-input
            v-model:value="addDictForm.label"
            placeholder="如：待审批"
          />
        </a-form-item>
        <a-form-item
          label="字典项值"
          name="value"
          :rules="[{ required: true, message: '请填写字典项值!' }]"
        >
          <a-input
            v-model:value="addDictForm.value"
            placeholder="如：PENDING"
          />
        </a-form-item>
        <a-form-item label="描述">
          <a-input
            v-model:value="addDictForm.description"
            placeholder="可选"
          />
        </a-form-item>
        <a-form-item label="是否默认">
          <a-switch
            :checked="addDictForm.isDefault === '1'"
            @change="addDictForm.isDefault = $event ? '1' : '0'"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped lang="less">
.dict-manage-page {
  display: flex;
  height: 100%;
  background: #f5f7fa;
  gap: 16px;
  padding: 16px;
}

.dict-list-panel,
.dict-items-panel {
  background: var(--bg-elevated);
  border-radius: 8px;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dict-list-panel {
  width: 320px;
  flex-shrink: 0;
}

.dict-items-panel {
  flex: 1;
  min-width: 0;
}

.panel-header {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;

  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #333;
      display: flex;
      align-items: center;
      gap: 8px;

      .dict-code-tag {
        font-size: 12px;
        font-weight: normal;
        color: #8c8c8c;
        background: #f5f5f5;
        padding: 2px 8px;
        border-radius: 4px;
      }
    }
  }
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.dict-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 4px;

  &:hover {
    background: #f0f5ff;
  }

  &.active {
    background: #e6f4ff;
    border-left: 3px solid #1677ff;
    padding-left: 11px;
  }

  .dict-list-item-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow: hidden;
  }

  .dict-list-item-name {
    font-size: 14px;
    font-weight: 500;
    color: #333;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dict-list-item-code {
    font-size: 12px;
    color: #8c8c8c;
  }
}

.item-search-results {
  .search-result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid #f0f0f0;
    color: #666;
    font-size: 14px;
  }

  .search-result-item {
    padding: 12px;
    border-radius: 6px;
    border: 1px solid #e8e8e8;
    margin-bottom: 8px;
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
      border-color: #fa8c16;
      background: #fffbf5;
    }

    .dict-info {
      margin-bottom: 8px;

      .dict-name {
        font-size: 14px;
        font-weight: 500;
        color: #333;
      }

      .dict-code {
        font-size: 12px;
        color: #8c8c8c;
        margin-left: 8px;
      }
    }

    .matched-items {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
  }
}

.dict-items-content {
  .items-toolbar {
    margin-bottom: 16px;
    display: flex;
    gap: 12px;
  }
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
}

.item-card {
  position: relative;
  display: flex;
  flex-direction: column;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
  cursor: grab;
  transition: all 0.25s;

  &:hover {
    border-color: #69b1ff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  &:active {
    cursor: grabbing;
  }

  &.item-card-dragging {
    opacity: 0.4;
  }

  &.item-card-over {
    border-color: #1677ff;
    border-style: dashed;
    background: #f0f5ff;
  }

  .item-card-sort {
    position: absolute;
    top: 6px;
    right: 8px;
    font-size: 11px;
    color: #bfbfbf;
    font-weight: 600;
  }

  .item-card-body {
    flex: 1;
    cursor: pointer;
  }

  .item-card-label {
    font-size: 14px;
    font-weight: 600;
    color: #333;
    margin-bottom: 4px;
    padding-right: 16px;
  }

  .item-card-value {
    font-size: 12px;
    color: #8c8c8c;
    margin-bottom: 4px;
    word-break: break-all;
  }

  .item-card-parent {
    font-size: 11px;
    color: #8c8c8c;
    background: #f5f5f5;
    padding: 2px 6px;
    border-radius: 3px;
    display: inline-block;
    margin-top: 4px;
  }

  .item-card-sys-tag {
    margin-top: 4px;
  }

  .item-card-actions {
    display: flex;
    justify-content: flex-end;
    gap: 2px;
    margin-top: 8px;
    padding-top: 6px;
    border-top: 1px solid #f5f5f5;
  }
}
</style>
