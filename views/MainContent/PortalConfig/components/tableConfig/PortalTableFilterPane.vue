<template>
  <!-- 筛选项配置 - 左右分栏 -->
  <div class="filter-config-section tab-fill-section">
    <div class="section-title">
      <span>筛选项配置</span>
      <a-button
        v-if="selectedFilter"
        type="primary"
        size="small"
        :loading="savingFilter"
        @click="handleSaveFilter(selectedFilter)"
      >
        保存配置
      </a-button>
    </div>
    <div class="filter-config-content">
      <!-- 左侧：字段列表 -->
      <div class="filter-list-panel">
        <div class="filter-list-header">
          <span>字段列表 ({{ filterList.length }})</span>
          <a-button
            type="primary"
            size="small"
            @click="showAddFilterModal = true"
          >
            <template #icon>
              <EditOutlined />
            </template>
            编辑
          </a-button>
        </div>
        <div class="filter-list-content">
          <div
            v-for="(filter, index) in filterList"
            :key="filter.id || index"
            :class="[
              'filter-item',
              {
                active: selectedFilter?.id === filter.id,
                'drag-over': dragOverIndex === index,
              },
            ]"
            draggable="true"
            @click="handleSelectFilter(filter)"
            @dragstart="handleDragStart($event, index)"
            @dragover="handleDragOver($event, index)"
            @drop="handleDrop($event, index)"
            @dragend="handleDragEnd"
          >
            <div class="drag-handle">
              <HolderOutlined />
            </div>
            <div class="filter-item-content">
              <div class="filter-item-label">
                {{ filter.label }}
              </div>
              <div class="filter-item-type">
                {{ getFilterTypeLabel(filter.filterType) }}
              </div>
            </div>
            <div class="filter-item-actions">
              <a-popconfirm
                title="确定删除该筛选项？"
                @confirm="handleDeleteFilter(filter)"
              >
                <a-button
                  type="link"
                  size="small"
                  danger
                  @click.stop
                >
                  <DeleteOutlined />
                </a-button>
              </a-popconfirm>
            </div>
          </div>
          <a-empty
            v-if="filterList.length === 0"
            description="暂无筛选项"
          />
        </div>
      </div>

      <!-- 右侧：字段配置详情 -->
      <div class="filter-detail-panel">
        <template v-if="selectedFilter">
          <div class="filter-detail-header">
            <span class="filter-detail-title">
              配置项：{{ selectedFilter.label }}
            </span>
          </div>
          <div class="filter-detail-content">
            <a-form
              :model="selectedFilter"
              :label-col="{ span: 6 }"
              :wrapper-col="{ span: 18 }"
            >
              <a-row :gutter="24">
                <a-col :span="12">
                  <a-form-item label="字段编码">
                    <a-input
                      v-model:value="selectedFilter.code"
                      placeholder="请输入字段编码"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="字段标签">
                    <a-input
                      v-model:value="selectedFilter.label"
                      placeholder="请输入字段标签"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="筛选类型">
                    <a-select
                      v-model:value="selectedFilter.filterType"
                      :options="filterTypeOptions"
                      style="width: 100%"
                      @change="handleFilterTypeChange"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="字典编码">
                    <a-select
                      v-model:value="selectedFilter.dictCode"
                      :filter-option="filterOption"
                      :options="sysDictList"
                      placeholder="下拉选择类型需要填写字典编码"
                      show-search
                      style="width: 100%"
                      allow-clear
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="占位文本">
                    <a-input
                      v-model:value="selectedFilter.placeholder"
                      placeholder="请输入占位文本"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="默认值">
                    <a-input
                      v-model:value="selectedFilter.defaultValue"
                      placeholder="请输入默认值"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="通用筛选条件">
                    <a-button @click="openDefaultConditionModal">
                      {{
                        hasDefaultCondition ? "已配置通用条件" : "配置通用条件"
                      }}
                    </a-button>
                  </a-form-item>
                </a-col>
                <a-col :span="24">
                  <a-form-item
                    label="特殊选项条件"
                    :label-col="{ span: 3 }"
                    :wrapper-col="{ span: 21 }"
                  >
                    <div class="option-condition-section">
                      <div class="option-condition-header">
                        <span>为字典选项配置专属条件（可选）</span>
                        <a-button
                          v-if="selectedFilter.dictCode"
                          type="link"
                          size="small"
                          @click="loadFilterDictOptions"
                        >
                          加载字典选项
                        </a-button>
                      </div>
                      <div
                        v-if="filterDictOptions.length > 0"
                        class="option-condition-list"
                      >
                        <div
                          v-for="option in filterDictOptions"
                          :key="option.value"
                          class="option-condition-item"
                        >
                          <span class="option-label">{{ option.label }}</span>
                          <span class="option-value">({{ option.value }})</span>
                          <a-button
                            type="link"
                            size="small"
                            @click="openOptionConditionModal(option.value)"
                          >
                            {{
                              conditionConfig.options[option.value]
                                ? "已配置"
                                : "配置"
                            }}
                          </a-button>
                          <a-button
                            v-if="conditionConfig.options[option.value]"
                            type="link"
                            size="small"
                            danger
                            @click="removeOptionCondition(option.value)"
                          >
                            删除
                          </a-button>
                        </div>
                      </div>
                      <a-empty
                        v-else-if="selectedFilter.dictCode"
                        description="点击上方按钮加载字典选项"
                      />
                      <a-empty
                        v-else
                        description="请先选择字典编码"
                      />
                    </div>
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="是否多选">
                    <a-radio-group v-model:value="selectedFilter.multiple">
                      <a-radio value="1">
                        是
                      </a-radio>
                      <a-radio value="0">
                        否
                      </a-radio>
                    </a-radio-group>
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="允许清空">
                    <a-radio-group v-model:value="selectedFilter.allowClear">
                      <a-radio value="1">
                        是
                      </a-radio>
                      <a-radio value="0">
                        否
                      </a-radio>
                    </a-radio-group>
                  </a-form-item>
                </a-col>
              </a-row>
            </a-form>
          </div>
        </template>
        <a-empty
          v-else
          description="请选择一个筛选项进行配置"
        />
      </div>
    </div>
  </div>

  <!-- 添加筛选项弹窗 -->
  <a-modal
    v-model:open="showAddFilterModal"
    title="管理筛选项"
    width="1000px"
    :body-style="{ height: '70vh', overflow: 'hidden', padding: '0' }"
    :footer="null"
    @cancel="handleCloseAddFilterModal"
  >
    <div class="add-filter-container">
      <!-- 左侧：字段勾选 -->
      <div class="add-filter-fields-panel">
        <div class="add-filter-fields-header">
          <a-input
            v-model:value="fieldSearchKeyword"
            allow-clear
            placeholder="搜索字段名称或编码"
            style="width: 100%"
          >
            <template #prefix>
              <SearchOutlined />
            </template>
          </a-input>
        </div>
        <div class="add-filter-fields-list">
          <label
            v-for="field in filteredAvailableFields"
            :key="field.key"
            :class="['add-filter-field-item', { checked: isFieldSelected(field.key) }]"
          >
            <a-checkbox
              :checked="isFieldSelected(field.key)"
              :disabled="modalSaving"
              @change="(e: any) => handleFieldToggle(field, e.target.checked)"
            >
              <div class="field-info">
                <span class="field-name">{{ field.displayName }}</span>
                <span class="field-code">{{ field.property }}</span>
              </div>
            </a-checkbox>
          </label>
          <a-empty
            v-if="filteredAvailableFields.length === 0"
            description="无匹配字段"
          />
        </div>
      </div>

      <!-- 右侧：已选筛选项（可拖拽排序、编辑名称） -->
      <div class="add-filter-selected-panel">
        <div class="add-filter-selected-header">
          <span class="selected-title">已选筛选项 ({{ modalFilterList.length }})</span>
          <span class="drag-tip">拖拽调整顺序</span>
        </div>
        <div class="add-filter-selected-list">
          <div
            v-for="(item, index) in modalFilterList"
            :key="item.uid"
            :class="[
              'modal-filter-card',
              { 'drag-over': modalDragOverIndex === index },
            ]"
            draggable="true"
            @dragstart="handleModalDragStart($event, index)"
            @dragover.prevent="modalDragOverIndex = index"
            @drop="handleModalDrop($event, index)"
            @dragend="handleModalDragEnd"
          >
            <div class="card-top-bar">
              <div class="modal-filter-index">
                {{ index + 1 }}
              </div>
              <div class="card-move-actions">
                <a-tooltip title="移到最前">
                  <a-button
                    type="text"
                    size="small"
                    :disabled="index === 0"
                    @click="moveModalFilterToEdge(index, 'top')"
                  >
                    <template #icon>
                      <UpSquareOutlined />
                    </template>
                  </a-button>
                </a-tooltip>
                <a-tooltip title="移到最后">
                  <a-button
                    type="text"
                    size="small"
                    :disabled="index === modalFilterList.length - 1"
                    @click="moveModalFilterToEdge(index, 'bottom')"
                  >
                    <template #icon>
                      <DownSquareOutlined />
                    </template>
                  </a-button>
                </a-tooltip>
              </div>
              <div class="drag-handle">
                <HolderOutlined />
              </div>
            </div>
            <a-input
              v-model:value="item.label"
              size="small"
              placeholder="筛选项名称"
              style="width: 100%"
              @blur="handleModalLabelSave(item)"
              @press-enter="handleModalLabelSave(item)"
            />
            <div class="card-bottom-bar">
              <span class="modal-filter-code">{{ item.code || item.property }}</span>
              <span class="modal-filter-type-tag">{{
                getFilterTypeLabel(item.filterType)
              }}</span>
            </div>
          </div>
          <a-empty
            v-if="modalFilterList.length === 0"
            description="请从左侧勾选字段添加筛选项"
          />
        </div>
      </div>
    </div>
  </a-modal>

  <!-- 筛选条件配置弹窗 -->
  <portal-advanced-search-modal
    :advanced-condition="filterConditionConfig"
    @confirm="saveFilterCondition"
  />
</template>

<script setup lang="ts">
import {
  DeleteOutlined,
  DownSquareOutlined,
  EditOutlined,
  HolderOutlined,
  SearchOutlined,
  UpSquareOutlined,
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'

import { useConditionModal } from './useConditionModal'

import {
  addPortalTableFilter,
  deletePortalTableFilter,
  FILTER_TYPE_OPTIONS,
  getPortalTableFilterList,
  IdOrderReqVO,
  PortalTableFilterVO,
  updatePortalTableFilter,
  updatePortalTableFilterOrder,
} from '@/framework/apis/portal/table'
import { ConditionType } from '@/framework/components/common/AdvancedSearch/type'
import PortalAdvancedSearchModal from '@/framework/components/common/Portal/modal/PortalAdvancedSearchModal.vue'
import { FILTER_TYPE } from '@/framework/components/common/Portal/type'
import { buildCondition } from '@/framework/components/common/Portal/utils'
import { dictStore } from '@/framework/store/common'


const props = defineProps<{
  tableId?: number;
  columns?: any[];
  portalConfig?: any;
  availableFields: Array<{
    key: string;
    title: string;
    property: string;
    displayName: string;
    reference: string;
  }>;
}>()

const emit = defineEmits<{
  'count-change': [count: number];
}>()

const dict = dictStore()

const savingFilter = ref(false)
const loadingFilters = ref(false)
const filterList = ref<PortalTableFilterVO[]>([])
const selectedFilter = ref<PortalTableFilterVO | null>(null)

// 字典列表
const sysDictList = ref<Array<any>>([])

// 拖拽状态
const draggedIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

// 添加筛选项弹窗状态
const showAddFilterModal = ref(false)

// 弹窗中的筛选项列表（本地副本，可拖拽排序、编辑名称）
interface ModalFilterItem {
  uid: string;
  id?: number;
  code: string;
  label: string;
  property: string;
  displayName: string;
  filterType: string;
  dictCode: string;
  originalFilter?: PortalTableFilterVO;
}
const modalFilterList = ref<ModalFilterItem[]>([])
const modalDraggedIndex = ref<number | null>(null)
const modalDragOverIndex = ref<number | null>(null)
const modalSaving = ref(false)

// 字段搜索关键词
const fieldSearchKeyword = ref('')

// 过滤后的可选字段
const filteredAvailableFields = computed(() => {
  const keyword = fieldSearchKeyword.value.trim().toLowerCase()
  if (!keyword) return props.availableFields
  return props.availableFields.filter(
    (f) =>
      f.displayName.toLowerCase().includes(keyword) ||
      f.property.toLowerCase().includes(keyword)
  )
})

// 条件配置（新格式）
interface ConditionConfig {
  default: any[]; // 通用兜底 condition
  options: Record<string, any[]>; // 按字典值映射的特殊 condition
}

// 当前筛选项的条件配置
const conditionConfig = reactive<ConditionConfig>({
  default: [],
  options: {},
})

// 当前编辑的特殊选项值
const editingOptionValue = ref<string>('')

// 当前筛选项的字典选项列表
const filterDictOptions = ref<Array<{ label: string; value: string }>>([])

// 判断是否有通用 condition
const hasDefaultCondition = computed(() => {
  return conditionConfig.default && conditionConfig.default.length > 0
})

// 判断是否是新格式的 condition
const isNewConditionFormat = (condition: any): condition is ConditionConfig => {
  return condition && typeof condition === 'object' && 'default' in condition
}

// 解析 condition 字符串到 conditionConfig
const parseCondition = (conditionStr: string | undefined) => {
  if (!conditionStr) {
    conditionConfig.default = []
    conditionConfig.options = {}
    return
  }

  try {
    const parsed = JSON.parse(conditionStr)

    if (isNewConditionFormat(parsed)) {
      // 新格式
      conditionConfig.default = parsed.default || []
      conditionConfig.options = parsed.options || {}
    } else {
      // 老格式，作为通用 condition
      if (Array.isArray(parsed)) {
        conditionConfig.default = parsed
      } else if (parsed.conditionList && Array.isArray(parsed.conditionList)) {
        conditionConfig.default = parsed.conditionList
      } else {
        conditionConfig.default = []
      }
      conditionConfig.options = {}
    }
  } catch (e) {
    console.warn('解析 condition 失败:', e)
    conditionConfig.default = []
    conditionConfig.options = {}
  }
}

// 序列化 conditionConfig 到字符串
const serializeCondition = (): string => {
  const config: ConditionConfig = {
    default: conditionConfig.default,
    options: conditionConfig.options,
  }
  return JSON.stringify(config)
}

// 加载当前筛选项的字典选项
const loadFilterDictOptions = async () => {
  if (!selectedFilter.value?.dictCode) {
    filterDictOptions.value = []
    return
  }

  try {
    const res = await dict.getDict(selectedFilter.value.dictCode)
    filterDictOptions.value = (res || []).map((item: any) => ({
      label: item.label || item.value,
      value: String(item.value),
    }))
  } catch (error) {
    console.error('加载字典选项失败:', error)
    filterDictOptions.value = []
  }
}

// 删除特殊选项条件
const removeOptionCondition = (optionValue: string) => {
  delete conditionConfig.options[optionValue]
  // 保存
  selectedFilter.value!.condition = serializeCondition()
  handleSaveFilter(selectedFilter.value!)
}

// 筛选类型选项
const filterTypeOptions = FILTER_TYPE_OPTIONS

// 获取筛选类型标签
const getFilterTypeLabel = (type: string | undefined) => {
  const option = filterTypeOptions.find((o) => o.value === type)
  return option?.label || type || '未知'
}

// 监听添加筛选项弹窗打开，初始化本地筛选项列表
watch(showAddFilterModal, (newVal) => {
  if (newVal) {
    modalFilterList.value = filterList.value.map((f) => ({
      uid: `item-${f.id || Math.random()}`,
      id: f.id,
      code: f.code || '',
      label: f.label || '',
      property: f.code || '',
      displayName: f.label || '',
      filterType: f.filterType || 'input',
      dictCode: f.dictCode || '',
      originalFilter: f,
    }))
    modalDraggedIndex.value = null
    modalDragOverIndex.value = null
    fieldSearchKeyword.value = ''
  }
})

// 切换表格时重置选中并加载筛选项列表
watch(
  () => props.tableId,
  async (tableId) => {
    selectedFilter.value = null
    filterDictOptions.value = []
    if (tableId) {
      await loadFilterList(tableId)
    } else {
      filterList.value = []
    }
  },
  { immediate: true }
)

// 加载字典列表
const loadDictList = async () => {
  const res = await dict.getAllDict('')
  sysDictList.value = (res || []).map((item: any) => ({
    label: item.label || item.value,
    value: item.value,
  }))
}

onMounted(loadDictList)

// 选择筛选项
const handleSelectFilter = (filter: PortalTableFilterVO) => {
  selectedFilter.value = filter
  // 解析 condition 到 conditionConfig
  parseCondition(filter.condition)
  // 清空字典选项，需要用户手动加载
  filterDictOptions.value = []
  // 如果有 dictCode，自动加载
  if (filter.dictCode) {
    loadFilterDictOptions()
  }
}

// 加载筛选项列表
const loadFilterList = async (tableId: number) => {
  loadingFilters.value = true
  try {
    const res = await getPortalTableFilterList(tableId)
    filterList.value = res.payload?.records || []
    // 默认选中第一个
    if (filterList.value.length > 0 && !selectedFilter.value) {
      selectedFilter.value = filterList.value[0]
    }
    emit('count-change', filterList.value.length)
  } catch (error) {
    console.error('加载筛选项失败:', error)
    filterList.value = []
  } finally {
    loadingFilters.value = false
  }
}

// 保存筛选项
const handleSaveFilter = async (filter: PortalTableFilterVO) => {
  savingFilter.value = true
  try {
    if (filter.id) {
      await updatePortalTableFilter(filter)
    } else {
      const res = await addPortalTableFilter(filter)
      filter.id = res.payload
    }
    message.success('保存成功')
    await loadFilterList(props.tableId!)
  } catch (error) {
    console.error('保存筛选项失败:', error)
  } finally {
    savingFilter.value = false
  }
}

// 删除筛选项
const handleDeleteFilter = async (filter: PortalTableFilterVO) => {
  try {
    await deletePortalTableFilter(filter.id!)
    message.success('删除成功')
    // 如果删除的是当前选中的筛选项，清空选中状态
    if (selectedFilter.value?.id === filter.id) {
      selectedFilter.value = null
    }
    await loadFilterList(props.tableId!)
  } catch (error) {
    console.error('删除筛选项失败:', error)
  }
}

// 拖拽排序结束
const handleFilterDragEnd = async () => {
  // 更新 displayOrder
  const orderList: IdOrderReqVO[] = []
  filterList.value.forEach((filter, index) => {
    filter.displayOrder = index + 1
    if (filter.id) {
      orderList.push({ id: filter.id as any, showOrder: index + 1 })
    }
  })

  // 调用接口保存排序
  if (orderList.length > 0) {
    try {
      await updatePortalTableFilterOrder(orderList)
      message.success('排序已保存')
    } catch (error) {
      console.error('保存排序失败:', error)
    }
  }
}

// 拖拽开始
const handleDragStart = (e: DragEvent, index: number) => {
  draggedIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }
}

// 拖拽悬停
const handleDragOver = (e: DragEvent, index: number) => {
  e.preventDefault()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
  dragOverIndex.value = index
}

// 拖拽放置
const handleDrop = (e: DragEvent, targetIndex: number) => {
  e.preventDefault()
  if (draggedIndex.value === null || draggedIndex.value === targetIndex) {
    return
  }

  // 重新排序
  const newList = [...filterList.value]
  const [movedItem] = newList.splice(draggedIndex.value, 1)
  newList.splice(targetIndex, 0, movedItem)
  filterList.value = newList

  // 保存排序
  handleFilterDragEnd()
}

// 拖拽结束
const handleDragEnd = () => {
  draggedIndex.value = null
  dragOverIndex.value = null
}

// 穿梭框过滤
const filterOption = (inputValue: string, option: any) => {
  const label = option.title || option.label || ''
  return label.toLowerCase().indexOf(inputValue.toLowerCase()) > -1
}

// 判断字段是否已被选为筛选项
const isFieldSelected = (fieldKey: string) => {
  return modalFilterList.value.some((item) => item.property === fieldKey)
}

// 根据字段配置推断筛选类型和字典编码
const inferFilterType = (fieldKey: string) => {
  const fieldConfig = props.portalConfig?.columns?.find(
    (col: any) => col.property === fieldKey
  )
  const selectedField = props.availableFields.find((f) => f.key === fieldKey)
  let filterType = 'input'
  let dictCode = ''

  if (fieldConfig) {
    if (fieldConfig.fieldType === '6' || fieldConfig.fieldType === '7') {
      filterType = 'date'
    } else if (fieldConfig.fieldType === '4' || fieldConfig.fieldType === '18') {
      filterType = 'select'
    } else if (fieldConfig.fieldType === '2') {
      filterType = 'switch'
    } else if (fieldConfig.fieldType === '3') {
      filterType = 'number'
    } else if (
      fieldConfig.property.includes('Status') ||
      fieldConfig.property.includes('Type')
    ) {
      filterType = 'select'
    }
    if (
      (filterType === 'select' || filterType === 'select_multi_in_one') &&
      fieldConfig.reference
    ) {
      dictCode = fieldConfig.reference
    }
  } else if (selectedField) {
    if (
      selectedField.property.includes('Time') ||
      selectedField.property.includes('Date')
    ) {
      filterType = 'date'
    } else if (
      selectedField.property.includes('Status') ||
      selectedField.property.includes('Type')
    ) {
      filterType = 'select'
    }
  }

  return { filterType, dictCode }
}

// 勾选/取消勾选字段
const handleFieldToggle = async (
  field: { key: string; property: string; displayName: string; reference: string },
  checked: boolean
) => {
  if (modalSaving.value) return
  modalSaving.value = true

  try {
    if (checked) {
      const { filterType, dictCode } = inferFilterType(field.key)
      const conditionList = [buildCondition(field.property, FILTER_TYPE.EQUAL, ['$1'])]

      const newFilter: PortalTableFilterVO = {
        tableId: props.tableId!,
        code: field.property,
        label: field.displayName,
        filterType,
        dictCode,
        placeholder: `请输入${field.displayName}`,
        defaultValue: '',
        multiple: '1',
        allowClear: '1',
        displayOrder: modalFilterList.value.length + 1,
        status: '1',
        condition: JSON.stringify(conditionList),
      }

      const res = await addPortalTableFilter(newFilter)
      if (res.payload) {
        newFilter.id = res.payload
        const newItem: ModalFilterItem = {
          uid: `item-${res.payload}`,
          id: res.payload,
          code: field.property,
          label: field.displayName,
          property: field.property,
          displayName: field.displayName,
          filterType,
          dictCode,
          originalFilter: newFilter,
        }
        modalFilterList.value.push(newItem)
        message.success(`已添加：${field.displayName}`)
      }
    } else {
      const index = modalFilterList.value.findIndex(
        (item) => item.property === field.key
      )
      if (index !== -1) {
        const item = modalFilterList.value[index]
        if (item.id) {
          await deletePortalTableFilter(item.id)
        }
        modalFilterList.value.splice(index, 1)
        message.success(`已移除：${field.displayName}`)
      }
    }
  } catch (error) {
    console.error('操作筛选项失败:', error)
  } finally {
    modalSaving.value = false
  }
}

// 弹窗内拖拽排序
const handleModalDragStart = (e: DragEvent, index: number) => {
  modalDraggedIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }
}

// 弹窗内筛选项排序持久化(按当前列表顺序重算 showOrder 并批量保存)
const persistModalFilterOrder = async () => {
  const orderList: IdOrderReqVO[] = []
  modalFilterList.value.forEach((item, index) => {
    if (item.id) {
      orderList.push({ id: item.id as any, showOrder: index + 1 })
    }
  })
  if (orderList.length > 0) {
    try {
      await updatePortalTableFilterOrder(orderList)
      message.success('排序已保存')
    } catch (error) {
      console.error('保存排序失败:', error)
    }
  }
}

const handleModalDrop = async (e: DragEvent, targetIndex: number) => {
  e.preventDefault()
  if (modalDraggedIndex.value === null || modalDraggedIndex.value === targetIndex) {
    return
  }

  const newList = [...modalFilterList.value]
  const [movedItem] = newList.splice(modalDraggedIndex.value, 1)
  newList.splice(targetIndex, 0, movedItem)
  modalFilterList.value = newList

  await persistModalFilterOrder()
}

// 弹窗内筛选项移到最前/最后
const moveModalFilterToEdge = async (index: number, edge: 'top' | 'bottom') => {
  const target = edge === 'top' ? 0 : modalFilterList.value.length - 1
  if (index === target) return
  const newList = [...modalFilterList.value]
  const [movedItem] = newList.splice(index, 1)
  newList.splice(target, 0, movedItem)
  modalFilterList.value = newList
  await persistModalFilterOrder()
}

const handleModalDragEnd = () => {
  modalDraggedIndex.value = null
  modalDragOverIndex.value = null
}

// 弹窗中修改筛选项名称
const handleModalLabelSave = async (item: ModalFilterItem) => {
  if (!item.id || !item.originalFilter) return
  if (!item.label.trim()) {
    message.warning('筛选项名称不能为空')
    return
  }
  if (item.originalFilter.label === item.label) return

  item.originalFilter.label = item.label
  item.originalFilter.placeholder = `请输入${item.label}`
  try {
    await updatePortalTableFilter(item.originalFilter)
    message.success('名称已更新')
  } catch (error) {
    console.error('更新名称失败:', error)
  }
}

// 关闭弹窗时同步数据
const handleCloseAddFilterModal = async () => {
  showAddFilterModal.value = false
  fieldSearchKeyword.value = ''
  if (props.tableId) {
    await loadFilterList(props.tableId)
  }
}

// 筛选类型变化时自动设置字典编码
const handleFilterTypeChange = (value: any) => {
  // 如果切换到select/select_multi_in_one类型，且当前选中的字段有reference，则自动填入
  if ((value === 'select' || value === 'select_multi_in_one') && selectedFilter.value) {
    console.log('筛选类型变更为下拉选择，尝试自动填充字典编码')

    // 首先尝试通过label精确匹配
    let matchedField = props.availableFields.find(
      (f) => f.displayName === selectedFilter.value?.label
    )
    console.log('通过label匹配结果:', matchedField)

    // 如果没找到，尝试通过property匹配
    if (!matchedField && selectedFilter.value.label) {
      // 从condition中提取property
      try {
        const conditionStr = selectedFilter.value.condition
        if (conditionStr) {
          const condition = JSON.parse(conditionStr)
          const conditionList = Array.isArray(condition)
            ? condition
            : condition.conditionList || []
          if (conditionList.length > 0 && conditionList[0].property) {
            matchedField = props.availableFields.find(
              (f) => f.property === conditionList[0].property
            )
            console.log('通过property匹配结果:', matchedField)
          }
        }
      } catch (e) {
        console.warn('解析condition失败:', e)
      }
    }

    // 如果找到了匹配的字段且有reference，则填入字典编码
    if (matchedField?.reference) {
      selectedFilter.value.dictCode = matchedField.reference
      message.success(`已自动填入字典编码: ${matchedField.reference}`)
      console.log(
        `成功为筛选项 "${selectedFilter.value.label}" 填入字典编码: ${matchedField.reference}`
      )
    } else {
      console.log('未找到匹配的字段或字段没有reference')
      message.info('未找到对应的字典编码，请手动选择')
    }
  }
}

// ==================== 条件配置弹窗(通用条件/特殊选项条件) ====================
const saveFilterCondition = (condition: ConditionType) => {
  const conditionList = condition.conditionList || []

  if (!selectedFilter.value) return

  if (editingOptionValue.value) {
    // 保存特殊选项条件
    if (conditionList.length > 0) {
      conditionConfig.options[editingOptionValue.value] = conditionList
    } else {
      // 空条件则删除
      delete conditionConfig.options[editingOptionValue.value]
    }
  } else {
    // 保存通用条件
    conditionConfig.default = conditionList
  }

  // 序列化存储
  selectedFilter.value.condition = serializeCondition()
  closeConditionModal()

  // 自动保存
  handleSaveFilter(selectedFilter.value)
}

const { filterConditionConfig, openConditionModal, closeConditionModal } =
  useConditionModal(() => props.columns, saveFilterCondition)

// 打开通用条件配置弹窗
const openDefaultConditionModal = async () => {
  if (!selectedFilter.value) return
  editingOptionValue.value = '' // 标记为编辑通用条件
  // 使用 conditionConfig.default 作为当前条件
  await openConditionModal(conditionConfig.default || [])
}

// 打开特殊选项条件配置弹窗
const openOptionConditionModal = async (optionValue: string) => {
  if (!selectedFilter.value) return
  editingOptionValue.value = optionValue // 标记为编辑特殊选项条件
  // 使用该选项的专属条件
  await openConditionModal(conditionConfig.options[optionValue] || [])
}
</script>

<style scoped lang="less">
@import './portal-table-config.less';

.option-condition-section {
  margin-top: 8px;
  padding: 12px;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  background: var(--bg-hover);
}

.option-condition-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  font-size: 13px;
  color: var(--text-secondary);
}

.option-condition-list {
  max-height: 200px;
  overflow-y: auto;
  padding: 8px 12px;
  border-top: 1px solid var(--border-subtle);
}

.option-condition-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 4px;
  margin-bottom: 4px;
  background: var(--bg-elevated);
  transition: all 0.2s;

  &:hover {
    background: var(--accent-soft);
  }

  .option-label {
    font-weight: 500;
    margin-right: 4px;
  }

  .option-value {
    font-size: 12px;
    color: var(--text-tertiary);
    margin-right: auto;
  }
}
</style>
