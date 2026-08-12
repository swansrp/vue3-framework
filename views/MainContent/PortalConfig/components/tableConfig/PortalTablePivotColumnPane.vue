<template>
  <!-- 透视列配置(父表头条件列) -->
  <div class="filter-config-section pivot-config-section tab-fill-section">
    <div class="section-title">
      <span>透视列配置（父表头条件列）</span>
      <a-space :size="4">
        <a-button
          size="small"
          @click="showGenPivotModal = true"
        >
          按字典批量生成
        </a-button>
        <a-button
          type="primary"
          size="small"
          :loading="savingPivotColumn"
          @click="handleSavePivotColumn"
        >
          保存配置
        </a-button>
      </a-space>
    </div>
    <div class="filter-config-content">
      <div class="filter-list-panel">
        <div class="filter-list-header">
          <span>透视列 ({{ pivotColumnList.length }})</span>
          <a-space :size="4">
            <a-button
              size="small"
              @click="openPivotEditModal"
            >
              <template #icon>
                <EditOutlined />
              </template>
              编辑
            </a-button>
            <a-button
              type="primary"
              size="small"
              @click="handleAddPivotColumn"
            >
              <template #icon>
                <PlusOutlined />
              </template>
              新增
            </a-button>
          </a-space>
        </div>
        <div class="filter-list-content">
          <div
            v-for="(column, index) in pivotColumnList"
            :key="column.id || 'unsaved'"
            :class="[
              'filter-item',
              {
                active: selectedPivotColumn === column,
                'drag-over': pivotDragOverIndex === index,
              },
            ]"
            draggable="true"
            @click="selectedPivotColumn = column"
            @dragstart="handlePivotDragStart($event, index)"
            @dragover="handlePivotDragOver($event, index)"
            @drop="handlePivotDrop($event, index)"
            @dragend="handlePivotDragEndReset"
          >
            <div class="drag-handle">
              <HolderOutlined />
            </div>
            <div class="filter-item-content">
              <div class="filter-item-label">
                {{ column.itemName || '未命名' }}
              </div>
              <div class="filter-item-type">
                {{ column.itemValue }}
              </div>
            </div>
            <div class="filter-item-actions">
              <a-popconfirm
                title="确定删除该透视列？"
                @confirm="handleDeletePivotColumn(column)"
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
            v-if="pivotColumnList.length === 0"
            description="暂无透视列"
          />
        </div>
      </div>
      <div class="filter-detail-panel">
        <template v-if="selectedPivotColumn">
          <div class="filter-detail-header">
            <span class="filter-detail-title">
              透视列：{{ selectedPivotColumn.itemName || '未命名' }}
            </span>
            <a-button
              size="small"
              @click="openPivotConditionModal"
            >
              {{ hasPivotCondition ? '已配置列条件' : '配置列条件' }}
            </a-button>
          </div>
          <div class="filter-detail-content">
            <a-form
              :model="selectedPivotColumn"
              :label-col="{ span: 6 }"
              :wrapper-col="{ span: 18 }"
            >
              <a-row :gutter="24">
                <a-col :span="12">
                  <a-form-item label="列标识">
                    <a-select
                      v-model:value="selectedPivotColumn.itemValue"
                      :options="pivotItemValueOptions"
                      :placeholder="pivotItemValueOptions.length > 0 ? '请选择列标识' : '请先配置列条件'"
                      show-search
                      allow-clear
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="表头名称">
                    <a-input
                      v-model:value="selectedPivotColumn.itemName"
                      placeholder="父表头显示名称"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="显示顺序">
                    <a-input-number
                      v-model:value="selectedPivotColumn.displayOrder"
                      :min="1"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="状态">
                    <a-select v-model:value="selectedPivotColumn.status">
                      <a-select-option value="1">
                        启用
                      </a-select-option>
                      <a-select-option value="0">
                        禁用
                      </a-select-option>
                    </a-select>
                  </a-form-item>
                </a-col>
              </a-row>
            </a-form>
            <!-- 列条件 JSON 编辑区：可手动修改/粘贴，保存配置时校验应用 -->
            <div class="pivot-condition-json">
              <div class="pivot-condition-json-header">
                <span>列条件 JSON</span>
                <span class="pivot-condition-json-tip">可直接编辑/粘贴，点「保存配置」校验后生效</span>
              </div>
              <a-textarea
                v-model:value="conditionJsonDraft"
                :rows="15"
                class="pivot-condition-json-textarea"
                placeholder="{&quot;andOr&quot;:&quot;0&quot;,&quot;conditionList&quot;:[...]}"
              />
            </div>
          </div>
        </template>
        <a-empty
          v-else
          description="请选择或新增一个透视列进行配置"
        />
      </div>
    </div>
  </div>

  <!-- 管理透视列弹窗(参照管理筛选项弹窗：拖拽排序、编辑名称) -->
  <a-modal
    v-model:open="showEditPivotModal"
    title="管理透视列"
    width="800px"
    :body-style="{ height: '60vh', overflow: 'hidden', padding: '0' }"
    :footer="null"
    @cancel="handleCloseEditPivotModal"
  >
    <div class="add-filter-container">
      <div class="add-filter-selected-panel">
        <div class="add-filter-selected-header">
          <span class="selected-title">透视列 ({{ pivotColumnList.length }})</span>
          <span class="drag-tip">拖拽调整顺序，排序自动保存</span>
        </div>
        <div class="add-filter-selected-list">
          <div
            v-for="(column, index) in pivotColumnList"
            :key="column.id || 'unsaved'"
            :class="[
              'modal-filter-card',
              { 'drag-over': pivotModalDragOverIndex === index },
            ]"
            draggable="true"
            @dragstart="handlePivotModalDragStart($event, index)"
            @dragover.prevent="pivotModalDragOverIndex = index"
            @drop="handlePivotModalDrop($event, index)"
            @dragend="handlePivotModalDragEnd"
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
                    @click="movePivotModalToEdge(index, 'top')"
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
                    :disabled="index === pivotColumnList.length - 1"
                    @click="movePivotModalToEdge(index, 'bottom')"
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
              v-model:value="column.itemName"
              size="small"
              placeholder="表头名称"
              style="width: 100%"
              @blur="handlePivotModalNameSave(column)"
              @press-enter="handlePivotModalNameSave(column)"
            />
            <div class="card-bottom-bar">
              <span class="modal-filter-code">{{ column.itemValue || '未设置列标识' }}</span>
              <span
                v-if="!column.id"
                class="modal-filter-type-tag"
              >未保存</span>
            </div>
          </div>
          <a-empty
            v-if="pivotColumnList.length === 0"
            description="暂无透视列，请关闭弹窗后点击「新增」或「按字典批量生成」"
          />
        </div>
      </div>
    </div>
  </a-modal>

  <!-- 按字典批量生成透视列弹窗 -->
  <portal-pivot-gen-modal
    v-model:open="showGenPivotModal"
    :table-id="tableId"
    :portal-name="portalName"
    :available-fields="availableFields"
    :existing-pivot-values="pivotColumnList.map((c) => c.itemValue || '')"
    @generated="handleGenPivotGenerated"
  />

  <!-- 透视列条件配置弹窗 -->
  <portal-advanced-search-modal
    :advanced-condition="filterConditionConfig"
    @confirm="savePivotCondition"
  />
</template>

<script setup lang="ts">
import {
  DeleteOutlined,
  DownSquareOutlined,
  EditOutlined,
  HolderOutlined,
  PlusOutlined,
  UpSquareOutlined,
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, ref, watch } from 'vue'

import PortalPivotGenModal from './PortalPivotGenModal.vue'
import { normalizePivotCondition, useConditionModal } from './useConditionModal'

import {
  addPortalPivotColumn,
  deletePortalPivotColumn,
  getPortalPivotColumnList,
  IdOrderReqVO,
  PortalPivotColumnVO,
  updatePortalPivotColumn,
  updatePortalPivotColumnOrder,
} from '@/framework/apis/portal/table'
import { ConditionType } from '@/framework/components/common/AdvancedSearch/type'
import PortalAdvancedSearchModal from '@/framework/components/common/Portal/modal/PortalAdvancedSearchModal.vue'


const props = defineProps<{
  tableId?: number;
  pivotMode?: string;
  columns?: any[];
  availableFields: Array<{
    key: string;
    title: string;
    property: string;
    displayName: string;
    reference: string;
  }>;
  portalName?: string;
}>()

// 透视列(父表头条件列)列表
const pivotColumnList = ref<PortalPivotColumnVO[]>([])
const selectedPivotColumn = ref<PortalPivotColumnVO | null>(null)
const savingPivotColumn = ref(false)

// 解析透视列 condition 中的 conditionList
const parsePivotConditionList = (conditionStr: string | undefined): any[] => {
  if (!conditionStr) {
    return []
  }
  try {
    const parsed = JSON.parse(conditionStr)
    if (Array.isArray(parsed)) {
      return parsed
    }
    return parsed.conditionList || []
  } catch (e) {
    console.warn('解析透视列 condition 失败:', e)
    return []
  }
}

// 列标识下拉选项：取自当前列条件中的条件值(保证标识与条件一致，排除含 __ 的值)
const pivotItemValueOptions = computed(() => {
  const values: string[] = []
  parsePivotConditionList(selectedPivotColumn.value?.condition).forEach((cond: any) => {
    const vals = Array.isArray(cond?.value) ? cond.value : cond?.value != null ? [cond.value] : []
    vals.forEach((v: any) => {
      const s = String(v)
      if (s && !s.includes('__') && !values.includes(s)) {
        values.push(s)
      }
    })
  })
  return values.map((v) => ({ label: v, value: v }))
})

// 列条件 JSON 草稿(展示与手动编辑用)
const conditionJsonDraft = ref('')

// 格式化 condition 为缩进 JSON，非法时原样展示(保存时报错)
const formatPivotCondition = (condition?: string): string => {
  if (!condition) return ''
  try {
    return JSON.stringify(JSON.parse(condition), null, 2)
  } catch (e) {
    return condition
  }
}

// 切换列或条件被弹窗外部修改时刷新草稿
watch(
  () => selectedPivotColumn.value?.condition,
  (cond) => {
    conditionJsonDraft.value = formatPivotCondition(cond)
  },
  { immediate: true }
)

// 当前透视列是否已配置条件
const hasPivotCondition = computed(() => {
  return parsePivotConditionList(selectedPivotColumn.value?.condition).length > 0
})

// 加载透视列列表
const loadPivotColumnList = async (tableId: number) => {
  try {
    const res = await getPortalPivotColumnList(tableId)
    pivotColumnList.value = res.payload?.records || []
    selectedPivotColumn.value = pivotColumnList.value.length > 0 ? pivotColumnList.value[0] : null
  } catch (error) {
    console.error('加载透视列失败:', error)
    pivotColumnList.value = []
    selectedPivotColumn.value = null
  }
}

// 切换表格时重置选中并加载/清空透视列
watch(
  () => props.tableId,
  async (tableId) => {
    selectedPivotColumn.value = null
    if (tableId && props.pivotMode === '1') {
      await loadPivotColumnList(tableId)
    } else {
      pivotColumnList.value = []
    }
  },
  { immediate: true }
)

// 开启透视模式时补载透视列列表(tab 常挂载，不再依赖重新选表触发)
watch(
  () => props.pivotMode,
  async (mode, oldMode) => {
    if (mode === '1' && oldMode !== '1' && props.tableId) {
      await loadPivotColumnList(props.tableId)
    }
  }
)

// 新增透视列(本地创建临时行，填写后点保存配置才落库，避免空标识被后端校验拒绝)
const handleAddPivotColumn = () => {
  if (!props.tableId) return
  // 已有未保存的新增行时不重复创建
  if (pivotColumnList.value.some((c) => !c.id)) {
    message.warning('请先保存或删除未保存的新增透视列')
    return
  }
  const newColumn: PortalPivotColumnVO = {
    tableId: props.tableId,
    itemValue: '',
    itemName: '',
    condition: JSON.stringify({ conditionList: [] }),
    displayOrder: pivotColumnList.value.length + 1,
    status: '1',
  }
  pivotColumnList.value = [...pivotColumnList.value, newColumn]
  selectedPivotColumn.value = newColumn
  message.info('请在右侧填写列标识与表头名称，然后点击「保存配置」')
}

// 保存透视列
const handleSavePivotColumn = async () => {
  if (!props.tableId) return
  if (!selectedPivotColumn.value) {
    message.warning('请先选择或新增一个透视列')
    return
  }
  // 新增保存前校验列标识，避免后端报错
  if (!selectedPivotColumn.value.id && !selectedPivotColumn.value.itemValue?.trim()) {
    message.warning('列标识不能为空')
    return
  }
  // 应用列条件 JSON 草稿：非空则解析归一化，非法则报错阻断
  const draft = conditionJsonDraft.value.trim()
  if (draft) {
    const normalized = normalizePivotCondition(draft)
    if (!normalized) {
      message.warning('列条件 JSON 格式不合法，请检查后再保存')
      return
    }
    selectedPivotColumn.value.condition = normalized
  }
  savingPivotColumn.value = true
  try {
    if (selectedPivotColumn.value.id) {
      await updatePortalPivotColumn(selectedPivotColumn.value)
    } else {
      const res = await addPortalPivotColumn(selectedPivotColumn.value)
      selectedPivotColumn.value.id = res.payload
    }
    message.success('保存成功')
    // 先记录当前选中 id(loadPivotColumnList 会默认选中第一列，须在其之前取)，刷新后恢复选中
    const keepId = selectedPivotColumn.value?.id
    await loadPivotColumnList(props.tableId)
    selectedPivotColumn.value = pivotColumnList.value.find((c) => c.id === keepId) || null
  } catch (error) {
    console.error('保存透视列失败:', error)
  } finally {
    savingPivotColumn.value = false
  }
}

// 删除透视列(未保存的临时行直接本地移除)
const handleDeletePivotColumn = async (column: PortalPivotColumnVO) => {
  if (!column.id) {
    pivotColumnList.value = pivotColumnList.value.filter((c) => c !== column)
    if (selectedPivotColumn.value === column) {
      selectedPivotColumn.value = pivotColumnList.value[0] || null
    }
    return
  }
  try {
    await deletePortalPivotColumn(column.id!)
    message.success('删除成功')
    if (selectedPivotColumn.value?.id === column.id) {
      selectedPivotColumn.value = null
    }
    await loadPivotColumnList(props.tableId!)
  } catch (error) {
    console.error('删除透视列失败:', error)
  }
}

// ==================== 透视列拖拽排序(范式同筛选项) ====================
const pivotDraggedIndex = ref<number | null>(null)
const pivotDragOverIndex = ref<number | null>(null)

// 透视列拖拽排序结束: 重算 displayOrder 并批量保存(未保存的新列待「保存配置」后生效)
const handlePivotDragEnd = async () => {
  const orderList: IdOrderReqVO[] = []
  pivotColumnList.value.forEach((column, index) => {
    column.displayOrder = index + 1
    if (column.id) {
      orderList.push({ id: column.id as any, showOrder: index + 1 })
    }
  })
  if (orderList.length > 0) {
    try {
      await updatePortalPivotColumnOrder(orderList, false, false, false)
      message.success('排序已保存')
    } catch (error) {
      console.error('保存透视列排序失败:', error)
    }
  }
  if (pivotColumnList.value.some(c => !c.id)) {
    message.info('存在未保存的透视列，点击「保存配置」后其顺序生效')
  }
}

// 透视列拖拽开始
const handlePivotDragStart = (e: DragEvent, index: number) => {
  pivotDraggedIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }
}

// 透视列拖拽悬停
const handlePivotDragOver = (e: DragEvent, index: number) => {
  e.preventDefault()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
  pivotDragOverIndex.value = index
}

// 透视列拖拽放置
const handlePivotDrop = (e: DragEvent, targetIndex: number) => {
  e.preventDefault()
  if (pivotDraggedIndex.value === null || pivotDraggedIndex.value === targetIndex) {
    return
  }
  const newList = [...pivotColumnList.value]
  const [movedItem] = newList.splice(pivotDraggedIndex.value, 1)
  newList.splice(targetIndex, 0, movedItem)
  pivotColumnList.value = newList
  handlePivotDragEnd()
}

// 透视列拖拽结束(清理状态)
const handlePivotDragEndReset = () => {
  pivotDraggedIndex.value = null
  pivotDragOverIndex.value = null
}

// ==================== 管理透视列弹窗(交互范式同管理筛选项弹窗) ====================
const showEditPivotModal = ref(false)
const pivotModalDraggedIndex = ref<number | null>(null)
const pivotModalDragOverIndex = ref<number | null>(null)

// 打开管理透视列弹窗
const openPivotEditModal = () => {
  pivotModalDraggedIndex.value = null
  pivotModalDragOverIndex.value = null
  showEditPivotModal.value = true
}

// 关闭管理透视列弹窗(排序/名称均已实时保存，直接关闭即可)
const handleCloseEditPivotModal = () => {
  showEditPivotModal.value = false
}

// 弹窗内拖拽开始
const handlePivotModalDragStart = (e: DragEvent, index: number) => {
  pivotModalDraggedIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }
}

// 弹窗内拖拽放置: 复用列表拖拽的排序持久化逻辑
const handlePivotModalDrop = (e: DragEvent, targetIndex: number) => {
  e.preventDefault()
  if (pivotModalDraggedIndex.value === null || pivotModalDraggedIndex.value === targetIndex) {
    return
  }
  const newList = [...pivotColumnList.value]
  const [movedItem] = newList.splice(pivotModalDraggedIndex.value, 1)
  newList.splice(targetIndex, 0, movedItem)
  pivotColumnList.value = newList
  handlePivotDragEnd()
}

// 弹窗内拖拽结束(清理状态)
const handlePivotModalDragEnd = () => {
  pivotModalDraggedIndex.value = null
  pivotModalDragOverIndex.value = null
}

// 弹窗内透视列移到最前/最后: 复用列表拖拽的排序持久化逻辑
const movePivotModalToEdge = (index: number, edge: 'top' | 'bottom') => {
  const target = edge === 'top' ? 0 : pivotColumnList.value.length - 1
  if (index === target) return
  const newList = [...pivotColumnList.value]
  const [movedItem] = newList.splice(index, 1)
  newList.splice(target, 0, movedItem)
  pivotColumnList.value = newList
  handlePivotDragEnd()
}

// 弹窗中修改透视列表头名称(未保存的临时列待「保存配置」生效)
const handlePivotModalNameSave = async (column: PortalPivotColumnVO) => {
  if (!column.id) return
  if (!column.itemName?.trim()) {
    message.warning('表头名称不能为空')
    return
  }
  try {
    await updatePortalPivotColumn(column)
    message.success('名称已更新')
  } catch (error) {
    console.error('更新透视列名称失败:', error)
  }
}

// ==================== 按字典批量生成 ====================
const showGenPivotModal = ref(false)

// 生成完成后刷新透视列列表
const handleGenPivotGenerated = async () => {
  if (props.tableId) {
    await loadPivotColumnList(props.tableId)
  }
}

// ==================== 透视列条件配置弹窗 ====================
const savePivotCondition = (condition: ConditionType) => {
  const conditionList = condition.conditionList || []
  if (!selectedPivotColumn.value) return
  // relation 统一为数字(与 FILTER_TYPE 枚举及历史数据一致，弹窗返回的是字符串)
  conditionList.forEach((cond: any) => {
    if (cond?.relation != null && cond.relation !== '' && !isNaN(Number(cond.relation))) {
      cond.relation = Number(cond.relation)
    }
  })
  const conditionStr = JSON.stringify({ conditionList })
  selectedPivotColumn.value.condition = conditionStr
  // 立即同步 JSON 草稿：handleSavePivotColumn 会基于草稿覆盖 condition，
  // 若等 watch 异步刷新，草稿仍是旧值会把弹窗修改回滚
  conditionJsonDraft.value = formatPivotCondition(conditionStr)
  closeConditionModal()
  // 自动保存
  handleSavePivotColumn()
}

const { filterConditionConfig, openConditionModal, closeConditionModal } =
  useConditionModal(() => props.columns, savePivotCondition)

// 打开透视列条件配置弹窗(复用高级搜索条件弹窗)
const openPivotConditionModal = async () => {
  if (!selectedPivotColumn.value) return
  await openConditionModal(parsePivotConditionList(selectedPivotColumn.value.condition))
}
</script>

<style scoped lang="less">
@import './portal-table-config.less';

.pivot-config-section {
  flex: 0 0 600px;
}

// 透视列条件 JSON 编辑区
.pivot-condition-json {
  margin-top: 12px;

  .pivot-condition-json-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
    font-weight: 500;

    .pivot-condition-json-tip {
      font-size: 12px;
      font-weight: normal;
      color: var(--text-tertiary);
    }
  }

  .pivot-condition-json-textarea {
    font-family: Consolas, Monaco, monospace;
    font-size: 12px;
  }
}
</style>
