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
  systemBizDictUpdateEnterpriseDict
} from '@/framework/apis/dict/bizDictController'
import type { BizDictVO, BizDictRes } from '@/framework/apis/dict/bizDictController'
import { addDict, deleteDict } from '@/framework/apis/dict/dict'
import DictItemEditModal from '@/framework/components/common/dict/DictItemEditModal.vue'
import DictItemsList from '@/framework/components/common/dict/DictItemsList.vue'

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
const addDictForm = ref({ dictName: '', dictTitle: '' })

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

// 排序变化
const handleSortChange = async (items: BizDictVO[]) => {
  dictItems.value = items
  // 自动保存排序
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

// 添加字典
const handleAddDict = () => {
  addDictModalVisible.value = true
}

const onAddDictFinish = async () => {
  try {
    await addDict(addDictForm.value)
    message.success('添加字典成功')
    addDictModalVisible.value = false
    addDictForm.value = { dictName: '', dictTitle: '' }
    addDictFormRef.value?.resetFields()
    await loadDictList()
  } catch (error) {
    console.error('添加字典失败:', error)
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
            :class="['dict-item', { active: selectedDictCode === dict.dictCode }]"
            @click="selectDict(dict)"
          >
            <div class="dict-info">
              <span class="dict-name">{{ dict.dictName }}</span>
              <span class="dict-code">{{ dict.dictCode }}</span>
            </div>
            <a-tag
              v-if="dict.dictItemList?.length"
              color="blue"
            >
              {{ dict.dictItemList.length }} 项
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
        <h3 v-if="selectedDictCode">
          {{ selectedDictName }}
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
              <DictItemsList
                :items="dictItems"
                :is-manage-mode="true"
                :dict-name-map="dictNameMap"
                :parent-value-label-map="parentValueLabelMap"
                sort-mode="buttons"
                title="字典项列表"
                @edit="editDictItem"
                @delete="deleteDictItem"
                @sort-change="handleSortChange"
              />
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
      @ok="onAddDictFinish"
      @cancel="resetAddDictForm"
    >
      <a-form
        ref="addDictFormRef"
        :model="addDictForm"
        :label-col="{ span: 6 }"
        :wrapper-col="{ span: 14 }"
      >
        <a-form-item
          label="字典名称"
          name="dictTitle"
          :rules="[{ required: true, message: '请输入字典名称!' }]"
        >
          <a-input v-model:value="addDictForm.dictTitle" />
        </a-form-item>
        <a-form-item
          label="字典值"
          name="dictName"
          :rules="[{ required: true, message: '请填写字典值!' }]"
        >
          <a-input v-model:value="addDictForm.dictName" />
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
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
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

.dict-item {
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #e8e8e8;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  justify-content: space-between;
  align-items: center;

  &:hover {
    border-color: #667eea;
    background: #f8f9ff;
  }

  &.active {
    border-color: #667eea;
    background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
  }

  .dict-info {
    flex: 1;
    min-width: 0;

    .dict-name {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: #333;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .dict-code {
      display: block;
      font-size: 12px;
      color: #8c8c8c;
      margin-top: 4px;
    }
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
</style>
