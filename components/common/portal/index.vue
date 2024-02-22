<template>
  <div ref="root" class="root" v-bind="$attrs">
    <!-- region 树形配置 -->
    <div v-if="config.treeMenuShow" class="menu-tree">
      <div class="menu-category">{{ config.title }}</div>
      <!--如果treeData的length为0，说明没有数据，展示提示信息-->
      <div v-if="!treeData || !treeData.length" class="no-data">暂无数据</div>
      <!--使用treeData作为a-tree的key，实现在数据更新时，正确渲染a-tree的样式-->
      <a-tree
        :key="treeData"
        :defaultExpandAll="true"
        :draggable="config.treeDragAble"
        :show-line="true"
        :tree-data="treeData"
        @drop="updateTree" />
    </div>
    <!-- endregion 树形配置 -->
    <!-- region 数据 -->
    <div style="width: 100%;">
      <!-- region 按钮区 -->
      <portal-button-action
        :advancedCondition="advancedCondition"
        :config="config"
        @download="download"
        @refresh="refresh"
        @show-tree-menu="showTreeMenu"
        @add-row="addRow"
        @save-all="saveAll"
        @open-upload-modal="openUploadModal" />
      <!-- endregion -->
      <!-- region 表格区 -->
      <div ref="portalConfigSpace" class="portal-table-space">
        <div class="portal-table">
          <!-- region 表格 -->
          <s-table
            :key="config.key"
            :columns="columns"
            :data-source="dataSource"
            :loading="config.loading"
            :pagination="false"
            :range-selection="false"
            :row-selection="rowSelection"
            :rowKey="config.rowKey"
            :scroll="{x: getTableWidth(), y: getTableHeight()}"
            :size="config.size"
            :style="{width: String(tableWidth) === 'auto' ? '100%' : tableWidth + 'px'}"
            :table-id="config.tableId"
            auto-header-height
            bordered
            columnDrag
            deepWatchDataSource
            showSorterTooltip
            sticky
            stripe
            summary-fixed
            @change="handleTableChange">
            <!-- region 表头样式 -->
            <template #headerCell="{title, column}">
              <div v-if="title.indexOf('\n') !== -1" class="table-title-cell">
                <div v-for="(item, index) in title.split('\n')" :key="index">{{ item }}</div>
              </div>
              <div v-else-if="title.indexOf('\\n') !== -1" class="table-title-cell">
                <div v-for="(item, index) in title.split('\\n')" :key="index">{{ item }}</div>
              </div>
              <span v-else-if="column.dataIndex === 'index'"></span>
              <span v-else class="table-title-cell">{{ title }}</span>
            </template>
            <!-- endregion -->
            <!-- region 单元格样式-->
            <template #bodyCell="{ column, record, index }">
              <portal-body-cell
                :column="column"
                :config="config"
                :index="index"
                :record="record"
                @is-cell-update="isCellUpdate">
                <template #action="{}">
                  <slot
                    :column="column"
                    :portal-config="config"
                    :record="record"
                    name="action">
                  </slot>
                </template>
              </portal-body-cell>
            </template>
            <!-- endregion -->
            <!-- region 总结栏样式 -->
            <template #summary>
              <s-table-summary-row v-if="config.summary">
                <s-table-summary-cell v-for="index of columns.length" :key="index" :index="index">
                  <div v-if="index === 1">总计</div>
                  <div v-else-if="index === columns.length"></div>
                  <div v-else> {{ dataSummary[`${columns[index - 1].dataIndex}`] || '--' }}</div>
                </s-table-summary-cell>
              </s-table-summary-row>
            </template>
            <!-- endregion -->
            <!-- region 提示样式 -->
            <template #tooltipTitle="{ value }">
              {{ value }}
            </template>
            <!-- endregion -->
            <!-- region 右键菜单样式 -->
            <template #contextmenuPopup="args">
              <portal-context-menu-popup
                :args="args"
                :config="config"
                @reset-cell="resetCell"
                @save-cell="saveCell"
                @save-row="saveRow"
                @detail-row="detailRow"
                @edit-row="editRow"
                @delete-row="deleteRow"
                @is-cell-update="isCellUpdate"
                @is-row-update="isRowUpdate"
                @row-allow-edit="rowAllowEdit"
                @row-allow-delete="rowAllowDelete"
              />
            </template>
            <!-- endregion -->
            <!-- region 下拉搜索样式 -->
            <template #menuIcon="{ column, filtered }">
              <bars-outlined v-if="column.dataIndex === 'index'" :class="filtered && 'filter-active'" />
              <filter-outlined v-else-if="column.filterAble" :class="filtered && 'filter-active'" />
            </template>
            <template
              #menuPopup="{ column, hidePopup, filter: { setSelectedKeys, selectedKeysRef, confirm, clearFilters } }">
              <!-- region 列显示选择 -->
              <div v-if="column.dataIndex === 'index'">
                <div class="menu-popup-container">
                  <ul class="menu-popup">
                    <li class="menu-popup-item" style="border-bottom: 1px solid #f0f0f0">
                      <a-checkbox v-model:checked="checkedAll" :indeterminate="indeterminate">
                        全选 / 取消选择
                      </a-checkbox>
                    </li>
                    <template v-for="col in columnArray" :key="col.key">
                      <li class="menu-popup-item">
                        <a-checkbox
                          v-model:checked="col.checked"
                          :disabled="!!col.disabled"
                          style="width: 100%"
                        >
                          {{ col.title }}
                        </a-checkbox>
                      </li>
                    </template>
                  </ul>
                </div>
              </div>
              <!-- endregion -->
              <!-- region 列搜索 -->
              <div v-else-if="column.filterAble">
                <portal-column-condition
                  :clearFilters="clearFilters"
                  :column="column"
                  :config="config"
                  :confirm="confirm"
                  :hidePopup="hidePopup"
                  :selectedKeysRef="selectedKeysRef"
                  :setSelectedKeys="setSelectedKeys"
                  @handle-search="handleSearch"
                  @handle-reset="handleReset"
                />
              </div>
              <!-- endregion -->
            </template>
            <!-- endregion -->
            <!-- region 拖拽显示样式 -->
            <template #rowDragGhost="{ record, icon, preTargetInfo, nextTargetInfo }">
              <component :is="icon" />
              <span style="color: red">
                dragging from {{ record.name }} to
                {{ preTargetInfo?.record.name || nextTargetInfo?.record.name }}
              </span>
            </template>
            <!-- endregion -->
            <!-- region 单元格编辑样式 -->
            <template
              #cellEditor="{ column, modelValue, save, closeEditor, editorRef, getPopupContainer, recordIndexs }">
              <portal-cell-editor
                :closeEditor="closeEditor"
                :column="column"
                :config="config"
                :editorRef="editorRef"
                :getPopupContainer="getPopupContainer"
                :modelValue="modelValue"
                :recordIndexs="recordIndexs"
                :save="save"
                @cell-update="cellUpdate"
              />
            </template>
            <!-- endregion -->
          </s-table>
          <!-- endregion -->
          <!-- region 分页 -->
          <a-pagination
            v-model:current="config.currentPage"
            v-model:pageSize="config.pageSize"
            :page-size="config.pageSize"
            :page-size-options="['10','20','30','50','100','200', '500', '1000']"
            :show-total="total => `共 ${total} 项`"
            :size="config.size"
            :total="config.total"
            class="pagination"
            hideOnSinglePage
            show-less-items
            show-quick-jumper
            show-size-changer
            @change="paginationChange">
            <template #itemRender="{ type, originalElement }">
              <a v-if="type === 'prev'">&lt;</a>
              <a v-else-if="type === 'next'">&gt;</a>
              <component :is="originalElement" v-else />
            </template>
            <template #buildOptionText="prop">
              <span v-if="+prop.value <= 500" style="width: 60px; display: inline-block">
                {{ prop.value }}条/页
              </span>
              <span v-else style="width: 60px; display: inline-block">全部</span>
            </template>
          </a-pagination>
          <!-- endregion -->
        </div>
      </div>
      <!-- endregion -->
    </div>
    <!-- endregion 数据 -->
    <!-- region 详情框 -->
    <portal-view-modal
      v-if="config.modal.type === 'view'"
      :columnArray="columnArray"
      :config="config"
      :dataSource="dataSource"
      :modifyCellMap="modifyCellMap"
      @cancel="handleModalCancel"
      @close="handleModalClose"
      @confirm="handleModalConfirm"
    />
    <portal-edit-modal
      v-else
      :columnArray="columnArray"
      :config="config"
      :entityDialogBox="entityDialogBox"
      @cancel="handleModalCancel"
      @close="handleModalClose"
      @confirm="handleModalConfirm"
    />
    <portal-upload
      ref="portalUploadModal"
      @upload="uploadAdd"
      @after-close="queryData"
      @template-export="templateExport"
      @upload-progress="uploadAddProgress"
    />
    <!-- endregion -->
    <!-- region 高级筛选 -->
    <a-drawer
      :visible="advancedCondition.show"
      :width="1050"
      placement="right"
      title="高级筛选"
      @close="advancedConditionDrawClose"
    >
      <template #extra>
        <div></div>
      </template>
      <AdvancedSearch
        :columns="columnArray.filter(item => item.filterAble)"
        @get-condition="getAdvancedCondition" />
    </a-drawer>
  </div>
  <!-- endregion -->
</template>
<script lang="ts" setup>
import Table from '@surely-vue/table'
import {
  addEntity,
  advancedQuery,
  deleteEntity,
  exportData,
  exportTemplate,
  getTreeData,
  importAdd,
  importAddProgress,
  updateEntity,
  updateEntityListSelective,
  updateEntitySelective,
  updateOrder,
  updateTreePid
} from '@/framework/apis/portal'
import {getPortalConfig} from '@/framework/apis/portal/config'
import {dictStore} from '@/framework/store/common'
import * as _ from 'lodash'
import {
  ColumnType,
  FIELD_TYPE,
  ModalType,
  ModifyCellType,
  QuerySortType,
  QueryType,
  TableConfigType
} from '@/framework/components/common/Portal/type'
import {BarsOutlined, ExclamationCircleOutlined, FilterOutlined} from '@ant-design/icons-vue'
import {
  doFunctions,
  getAllParentNodes,
  getBrotherNodes,
  isEmpty,
  isNotEmpty,
  log,
  updateTableSize
} from '@/framework/utils/common'
import {
  actionColumn,
  defaultColumn,
  getDefaultFilterType,
  indexColumn
} from '@/framework/components/common/Portal/constant'
import dayjs from 'dayjs'
import {AUTO} from '@/framework/utils/constant'
import {createVNode, Ref} from 'vue'
import {message, Modal} from 'ant-design-vue'
import {AntTreeNodeDropEvent} from 'ant-design-vue/es/tree'
import {getDroppedData} from '@/framework/hooks/antTreeDropSort'
import {DataNode} from 'ant-design-vue/es/vc-tree/interface'
import {ConditionType} from '@/framework/components/common/AdvancedSearch/type'
import {ConditionListType} from '@/framework/components/common/AdvancedSearch/ConditionList/type'

/**
 * @param tableId 表格ID
 * @param readOnly 不能编辑
 * @param actionWidth 操作栏宽度
 * @param advanceCondition 默认查询参数
 * @param defaultSortColumn 默认排序字段
 */
const props = defineProps<{
  tableId: string,
  readOnly?: boolean,
  actionWidth?: number,
  advanceCondition?: ConditionType,
  defaultSortColumn?: Array<QuerySortType>
}>()

const emit = defineEmits<{
  (e: 'rowAllowEdit', record: any, result: { updated: boolean }): void
  (e: 'rowAllowDelete', record: any, result: { updated: boolean }): void
}>()
const $attrs = useAttrs()
const dict = dictStore()
// region 调整表格大小
const root: Ref = ref()
let tableWidth: Ref<number> = ref(0)
let tableHeight: Ref<number> = ref(0)
const getTableWidth = () => {
  if (tableWidth.value == undefined) return AUTO
  return tableWidth.value - 20
}
const getTableHeight = () => {
  if (tableHeight.value == undefined) return AUTO
  return tableHeight.value
}
const updateTableWidthAndHeight = () => {
  console.debug('updateTableWidthAndHeight')
  updateTableSize(root, tableWidth, 40 + (config.treeMenuShow ? 230 : 0), tableHeight, 250)
}
window.addEventListener('resize', _.debounce(updateTableWidthAndHeight, 200))
//endregion


//region 表格显示配置
/**
 * 整体配置
 */
const config: TableConfigType = reactive({
  tableId: props.tableId,
  key: 1,
  size: '',
  rowKey: 'id',
  loading: true,
  currentPage: 1,
  pageSize: 10,
  total: 100,
  modal: {
    show: false,
    type: undefined,
    data: {},
    editRowIndex: null
  } as ModalType,
  saveAllButtonShow: false,
  descriptionCount: 4,
  detailWidth: '100%',
  addWidth: '100%',
  editWidth: '100%',
  addModalAble: false,
  editModalAble: false,
  importAble: false,
  exportAble: false
} as TableConfigType)
/**
 * 数据
 */
let dataSource: Ref<Array<any>> = ref([] as Array<any>)
let dataSummary = ref({} as any)
const modifyCellMap = new Map<string, ModifyCellType>()
const entityDialogBox: { show: boolean, column: ColumnType } = reactive({show: false, column: {} as ColumnType} as any)
let treeData: Ref<Array<DataNode>> = ref([])
/**
 * 表头
 */
const columnArray: Ref<Array<ColumnType>> = ref([] as Array<ColumnType>)
const columnRaw = []
const columns = computed(() => {
  return columnArray.value.filter(item => item.checked)
})
const dictColumnArray: Array<ColumnType> = []
/**
 * 列显示
 */
const checkedAll = computed({
  get() {
    return columnArray.value.every(column => column.checked)
  },
  set(value: boolean) {
    columnArray.value.forEach(column => {
      if (!column.disabled) {
        column.checked = value
      }
    })
  }
})
const indeterminate = computed(() => {
  const checkedCount = columns.value.filter(column => column.checked).length
  return checkedCount > 0 && checkedCount < columns.value.length
})
/**
 * 行选择配置
 */
const rowSelection = computed(() => {
  return {
    selectedRowKeys: unref(selectedRowKeys),
    onChange: onSelectChange,
    hideDefaultSelections: true,
    selections: [
      Table.SELECTION_ALL,
      Table.SELECTION_INVERT,
      Table.SELECTION_NONE
    ]
  }
})
/**
 * 树形菜单是否显示
 */
const showTreeMenu = () => {
  config.treeMenuShow = !config.treeMenuShow
  updateTableWidthAndHeight()
}
//endregion
//region 表格修改
const _getContainer = (name: string, defaultName: string) => {
  let res = document.querySelector(name)
  if (isEmpty(res)) {
    res = document.querySelector(defaultName)
  }
  return () => {
    return res
  }
}

const initCellData = (index: number, dataIndex: string, value: any, id: any) => {
  modifyCellMap.set(index + dataIndex, {
    needUpdated: false,
    current: value,
    original: value,
    rowIndex: index,
    dataIndex: dataIndex,
    id: id
  } as ModifyCellType)
}
const cellUpdate = (index: number, dataIndex: string, v: any) => {
  const modifyCell = modifyCellMap.get(index + dataIndex)
  if (modifyCell) {
    modifyCell.current = v
    modifyCell.needUpdated = v !== modifyCell.original
  }
}
const isCellUpdate = (index: number, column: any, result: { updated: boolean } = {updated: false}): Boolean => {
  const modifyCell = modifyCellMap.get(index + column.dataIndex)
  if (modifyCell && isNotEmpty(modifyCell)) {
    if (modifyCell.needUpdated) config.saveAllButtonShow = true
    result.updated = modifyCell.needUpdated
  }
  return result.updated
}
const isRowUpdate = (index: number, result: { updated: boolean } = {updated: false}): Boolean => {
  for (let column of columns.value) {
    const modifyCell = modifyCellMap.get(index + column.dataIndex)
    if (modifyCell && isNotEmpty(modifyCell) && modifyCell.needUpdated) {
      result.updated = true
      return result.updated
    }
  }
  return result.updated
}
const saveCell = (args: any) => {
  const modifyCell = modifyCellMap.get(args.recordIndexs[0] + args.column.dataIndex)
  if (modifyCell && modifyCell.needUpdated) {
    updateEntitySelective(config.url, {
      [modifyCell.dataIndex]: modifyCell.current,
      [config.rowKey]: modifyCell.id
    }).then(() => queryData())
    log('保存单元格内容', {[args.column.dataIndex]: modifyCell.current, [config.rowKey]: modifyCell.id})
  }
  args.hidePopup()
}
const resetCell = (args: any) => {
  const modifyCell = modifyCellMap.get(args.recordIndexs[0] + args.column.dataIndex)
  if (modifyCell && modifyCell.needUpdated) {
    cellUpdate(args.recordIndexs[0], args.column.dataIndex, modifyCell.original)
    dataSource.value[args.recordIndexs[0]][args.column.dataIndex] = modifyCell.original
    log('撤销单元格修改')
  }
  args.hidePopup()
}
const resetRow = (index: any) => {
  for (let column of columns.value) {
    const modifyCell = modifyCellMap.get(index + column.dataIndex)
    if (modifyCell && isNotEmpty(modifyCell) && modifyCell.needUpdated) {
      cellUpdate(index, column.dataIndex, modifyCell.original)
      dataSource.value[index][column.dataIndex] = modifyCell.original
    }
  }
  log('撤销行数据修改')
}
const saveRow = (args: any) => {
  let {id, data} = _buildUpdatedRowData(args.recordIndexs[0])
  if (data.size != 0) {
    data.set(config.rowKey, id)
    log('保存行内容', data)
    updateEntitySelective(config.url, Object.fromEntries(data)).then(() => {
      queryData()
      args.hidePopup()
    })
  }
}
const _buildUpdatedRowData = (index: any) => {
  let id
  const data = new Map()
  for (let column of columns.value) {
    const modifyCell = modifyCellMap.get(index + column.dataIndex)
    if (modifyCell && isNotEmpty(modifyCell) && modifyCell.needUpdated) {
      data.set(modifyCell.dataIndex, modifyCell.current)
      id = modifyCell.id
    }
  }
  return {id, data}
}
const _buildRowData = (index: any) => {
  let id
  const data = new Map()
  for (let column of columns.value) {
    const modifyCell = modifyCellMap.get(index + column.dataIndex)
    if (modifyCell) {
      data.set(modifyCell.dataIndex, modifyCell.current)
      id = modifyCell.id
    }
  }
  return {id, data}
}
const saveAll = () => {
  const dataMap = new Map<number, Map<String, any>>()
  for (let index = 0; index < dataSource.value.length; index++) {
    let {id, data} = _buildUpdatedRowData(index)
    if (data.size != 0) {
      data.set(config.rowKey, id)
      log('保存行内容' + index, data)
      dataMap.set(index, Object.fromEntries(data))
    }
  }
  updateEntityListSelective(config.url, [...dataMap.values()]).then(() => queryData())
  log('保存所有内容', dataMap)
}
const deleteRow = (args: any) => {
  Modal.confirm({
    title: '注意',
    icon: createVNode(ExclamationCircleOutlined),
    content: createVNode('div', {style: 'color:red;'}, '即将删除该记录,请确认'),
    onOk() {
      const modifyCell = modifyCellMap.get(args.recordIndexs[0] + args.column.dataIndex)
      if (modifyCell) {
        deleteEntity(config.url, modifyCell.id).then(() => queryData())
        log('删除整行内容')
      }
      args.hidePopup()
    },
    onCancel() {
      args.hidePopup()
    }
  })
}
const updateTree = async (info: AntTreeNodeDropEvent) => {
  const dragKey = info.dragNode.key
  treeData.value = getDroppedData(info, treeData)
  const brotherNodes = getBrotherNodes(treeData.value, dragKey, 'key')
  const parentNodes = getAllParentNodes(treeData.value, dragKey, 'key')
  const pid = parentNodes.length ? parentNodes[0].key : null

  let updateOrderData: any = []
  brotherNodes.forEach((node: any, index: number) => {
    updateOrderData.push({id: node.key, showOrder: index})
  })
  await updateOrder(config.url, updateOrderData)
  if (info.dragNode.pid !== pid) {
    await updateTreePid(config.url, {
      id: dragKey,
      pid
    })
  }
  return queryDataAsync()
}
// endregion
// region 编辑弹框
const rowAllowEdit = (record: any, result: { updated: boolean } = {updated: false}) => {
  let allow = !config.readOnly
  allow = allow && !isRowUpdate(record.index) && config.editModalAble
  let res = {updated: false}
  emit('rowAllowEdit', record, res)
  result.updated = allow && res
  return result.updated
}
const rowAllowDelete = (record: any, result: { updated: boolean } = {updated: false}) => {
  let allow = !config.readOnly
  allow = allow && !isRowUpdate(record.index)
  let res = {updated: false}
  emit('rowAllowDelete', record, res)
  result.updated = allow && res
  return result.updated
}
// 相应确认按钮
const handleModalConfirm = () => {
  switch (config.modal.type) {
    case 'view':
      closeModal()
      break
    case 'add':
      saveAddRow().then(() => doFunctions(queryData, closeModal))
      break
    case 'modify':
      updateEditRow().then(() => doFunctions(queryData, closeModal))
      break
    default:
      closeModal()
  }
}
// 相应取消按钮
const handleModalCancel = () => {
  switch (config.modal.type) {
    case 'view':
      closeModal()
      break
    case 'add':
      config.modal.data = {}
      closeModal()
      break
    case 'modify':
      resetRow(config.modal.editRowIndex)
      closeModal()
      break
    default:
      closeModal()
  }
}
// 相应关闭按钮
const handleModalClose = () => {
  handleModalCancel()
}
// 查看行数据详情
const detailRow = (args: any) => {
  console.debug(modifyCellMap, args.recordIndexs[0])
  const {data} = _buildRowData(args.recordIndexs[0])
  config.modal.data = Object.fromEntries(data)
  if (data.size != 0) {
    config.modal.editRowIndex = args.recordIndexs[0]
  }
  openModal('view')
  args.hidePopup()
}
// 添加数据
const addRow = () => {
  openModal('add')
  config.modal.data = {}
  config.modal.editRowIndex = null
}
// 保存添加数据
const saveAddRow = async () => {
  return await addEntity(config.url, config.modal.data)
}
// 模版下载
const templateExport = () => {
  exportTemplate(config.url, config.tableId, config.title + '-模版' + '.xlsx')
}
const portalUploadModal = ref()
// 上传弹框
const openUploadModal = () => {
  importAddProgress(config.url, config.tableId).then(resp => {
    portalUploadModal.value.openUploadModal(resp)
  })
}
const uploadAdd = async (file: Object, onUploadProgress: Function, onSuccess: Function, onFailed: Function) => {
  return await importAdd(config.url, config.tableId, file, onUploadProgress).then(resp => onSuccess(resp)).catch(resp => onFailed(resp))
}
const uploadAddProgress = (onSuccess: Function) => {
  return importAddProgress(config.url, config.tableId).then((resp) => onSuccess(resp))
}
// 打开编辑详情页
const editRow = (args: any) => {
  const {id, data} = _buildRowData(args.recordIndexs[0])
  console.debug('打开编辑详情页', id, data)
  if (data.size != 0) {
    data.set(config.rowKey, id)
    config.modal.data = Object.fromEntries(data)
    config.modal.editRowIndex = args.recordIndexs[0]
  }
  openModal('modify')
  args.hidePopup()

}
// 保存编辑详情页
const updateEditRow = async () => {
  console.debug('原始内容', dataSource.value[config.modal.editRowIndex])
  console.debug('保存内容', config.modal.data)
  return await updateEntity(config.url, {
    ...dataSource.value[config.modal.editRowIndex],
    ...config.modal.data
  })
}
const closeModal = () => {
  config.modal.show = false
  config.modal.type = undefined
}
const openModal = (type: 'view' | 'add' | 'modify' | undefined) => {
  config.modal.show = true
  config.modal.type = type
}
// endregion
// region 表格搜索

const query = computed(() => {
  const queryCondition: QueryType = {
    currentPage: config.currentPage,
    pageSize: config.pageSize
  } as QueryType
  queryCondition.sortList = props.defaultSortColumn || []
  if (isNotEmpty(querySortMap)) {
    queryCondition.sortList = [...querySortMap.values()]
  }
  if (isNotEmpty(advancedCondition.condition)) {
    if (isNotEmpty(queryCondition.condition)) {
      queryCondition.condition = {
        conditionList: [queryCondition.condition as ConditionListType, advancedCondition.condition as ConditionListType],
        andOr: '0'
      }
    } else {
      queryCondition.condition = {
        conditionList: [advancedCondition.condition as ConditionListType],
        andOr: '0'
      }
    }
  }
  if (isNotEmpty(queryConditionMap)) {
    if (isNotEmpty(queryCondition.condition)) {
      queryCondition.condition = {
        conditionList: [queryCondition.condition as ConditionListType, ...queryConditionMap.values()],
        andOr: '0'
      }
    } else {
      queryCondition.condition = {
        conditionList: [...queryConditionMap.values()],
        andOr: '0'
      }
    }
  }
  if (isNotEmpty(props.advanceCondition)) {
    if (isNotEmpty(queryCondition.condition)) {
      queryCondition.condition = {
        conditionList: [queryCondition.condition as ConditionListType, props.advanceCondition as ConditionListType],
        andOr: '0'
      }
    } else {
      queryCondition.condition = {
        conditionList: [props.advanceCondition as ConditionListType],
        andOr: '0'
      }
    }
  }

  return queryCondition
})
const queryConditionMap = reactive(new Map<String, ConditionListType>())
const querySortMap = reactive(new Map<String, QuerySortType>())
const initQueryCondition = () => {
  queryConditionMap.clear()
  querySortMap.clear()
}

const handleSearch = (selectedKeys: any, confirm: any, dataIndex: any, hidePopup: any, column: any) => {
  console.log(column)
  const condition = {
    property: dataIndex as string,
    value: selectedKeys as Array<any>,
    relation: getDefaultFilterType(column.fieldType)
  } as ConditionListType

  if (isNotEmpty(selectedKeys)) {
    queryConditionMap.set(dataIndex as string, condition)
  } else {
    queryConditionMap.delete(dataIndex as string)
  }
  confirm()
  hidePopup()
  queryData()
}

const handleReset = (clearFilters: any, dataIndex: any, hidePopup: any) => {
  queryConditionMap.delete(dataIndex as string)
  clearFilters()
  hidePopup()
  queryData()
}
const selectedRowKeys = ref<any['key'][]>([])
const onSelectChange = (changableRowKeys: string[]) => {
  console.log('selectedRowKeys changed: ', changableRowKeys)
  selectedRowKeys.value = changableRowKeys
}
const handleTableChange = (pagination: { current: number, pageSize: number, total: number, size: number },
                           filter: any,
                           column: any,
                           data: { currentDataSource: any[], action: string }) => {
  console.log('handleTableChange', pagination, filter, column, data)
  if (data.action === 'sort') {
    querySortMap.clear()
    if (isNotEmpty(column.order)) {
      querySortMap.set(column.columnKey,
          {
            property: column.column.dbField ? column.column.dbField : column.columnKey,
            type: (column.order === 'ascend' ? 0 : 1)
          })
    }
    queryData()
  }
}
const advancedCondition = reactive({
  show: false,
  condition: {} as ConditionType
})
const advancedConditionDrawClose = () => {
  advancedCondition.show = false
}
const getAdvancedCondition = (condition: ConditionType) => {
  advancedCondition.condition = condition
  console.log('getAdvancedCondition', advancedCondition)
  queryData()
  advancedConditionDrawClose()

}
// endregion

//region 常用功能函数
/**
 * 获取数据
 */
const queryData = () => {
  queryDataAsync().then(data => {
    initData(data)
  })
}
const initData = (data: Array<any>) => {
  dataSource.value = data || []
  config.saveAllButtonShow = false
  for (let index in data) {
    for (let dataIndex in data[index]) {
      initCellData(Number(index), dataIndex, data[index][`${dataIndex}`], data[index][`${config.rowKey}`])
    }
  }
}
const queryDataAsync = async () => {
  return await advancedQuery(config.url, query.value).then(res => {
    config.total = res.payload.total
    const data = []
    for (let record of res.payload.records) {
      for (let dictColumn of dictColumnArray) {
        if (typeof record[`${dictColumn.dataIndex}`] === 'number') {
          record[`${dictColumn.dataIndex}`] = String(record[`${dictColumn.dataIndex}`])
        }
      }
      data.push(record)
    }
    return data
  })
}
/**
 * 分页变更
 */
const paginationChange = () => {
  queryData()
}
/**
 * 导出
 */
const download = () => {
  exportData(config.url, config.tableId, query.value, config.title + '-' + dayjs().format('YYYYMMDDHHmmss') + '.xlsx')
}
/**
 * 刷新
 */
const refresh = () => {
  init().then(data => initData(data))
}
/**
 * 初始化
 */
const init = async () => {
  console.log('init start')
  console.debug(props)
  updateTableWidthAndHeight()
  initQueryCondition()
  return await getPortalConfig(config.tableId).then(async res => {
    dictColumnArray.length = 0
    columnArray.value.length = 0
    const index = _.cloneDeep(indexColumn)
    columnArray.value.push(index)
    const tableConfig = res.payload
    config.title = tableConfig.displayName
    config.size = tableConfig.size
    config.loading = false
    config.rowKey = tableConfig.idColumn
    config.nameKey = tableConfig.nameColumn
    config.readOnly = tableConfig.readOnly === '1'
    if (props.readOnly) {
      config.readOnly = true
    }
    config.url = tableConfig.url
    config.summary = tableConfig.summary === '1'
    config.treeMode = isNotEmpty(tableConfig.pidColumn)
    config.orderMode = isNotEmpty(tableConfig.orderColumn)
    config.treeDragAble = tableConfig.treeDrag === '1'
    config.descriptionCount = tableConfig.descriptionCount
    config.detailWidth = tableConfig.detailWidth + '%'
    config.addWidth = tableConfig.addWidth + '%'
    config.editWidth = tableConfig.editWidth + '%'
    config.importAble = tableConfig.importAble === '1'
    config.exportAble = tableConfig.exportAble === '1'
    if (isEmpty(config.url)) {
      message.error('尚未配置访问地址')
      throw new Error('尚未配置访问地址')
    }
    if (isEmpty(config.rowKey)) {
      message.error('尚未配置字段id')
      throw new Error('尚未配置字段id')
    }
    for (let layout of tableConfig.columns) {
      const column = _.cloneDeep(defaultColumn)
      column.title = layout.displayName
      column.dataIndex = layout.property
      column.dbField = layout.dbField
      column.key = layout.property
      column.width = layout.width !== 0 ? layout.width : 140
      column.fixed = layout.fixed === '1'
      column.fieldType = layout.fieldType
      column.referenceDict = layout.reference || layout.entity
      column.referenceEntityField = layout.entityField
      column.contentAlign = layout.align
      column.filterAble = layout.filterAble === '1'
      column.sorter = layout.sortAble === '1'
      column.addShow = layout.addShow === '1'
      if (!config.addModalAble && column.addShow) config.addModalAble = column.addShow
      column.editShow = layout.editShow === '1'
      if (!config.editModalAble && column.editShow) config.editModalAble = column.editShow
      column.checked = layout.show === '1'
      column.detailShow = layout.detailShow === '1'
      column.detailSize = layout.detailSize
      column.addSize = layout.addSize
      column.addPadding = layout.addPadding
      column.editSize = layout.editSize
      column.editPadding = layout.editPadding
      // 单元格编辑模式
      if (layout.editAble !== '1') {
        column.editable = layout.editAble
      }
      // 提示有默认值配置
      if (layout.tooltip !== '1') {
        column.tooltip = false
      }
      column.required = layout.required === '1'
      column.min = layout.min
      column.max = layout.max
      column.defaultValue = layout.defaultValue
      if (isNotEmpty(column.referenceDict)) {
        if (column.fieldType !== FIELD_TYPE.ENTITY) {
          dictColumnArray.push(column)
          column.referenceDictOption = await dict.getDict(column.referenceDict)
        } else {
          column.entityCondition = JSON.parse(layout.entityCondition)
        }
      }
      if (layout.enable === '1') {
        columnArray.value.push(column)
      }
      columnRaw.push(column)
    }
    actionColumn.width = props.actionWidth ? props.actionWidth : actionColumn.width
    columnArray.value.push(actionColumn)
    // 首列支持拖拽
    columnArray.value[0].rowDrag = tableConfig.tableDrag === '1'

    console.log('init finish')
    console.debug(config, columnArray.value, columns.value)
    config.key = config.key + 1

    if (config.treeMode) {
      await getTreeData(config.url).then(res => treeData.value = res.payload || [])
    }
    return await queryDataAsync()
  })
}
//endregion

onMounted(() => {
  init().then(data => initData(data))
})
watch(() => props.tableId, value => {
  config.tableId = value
  refresh()
})
defineExpose({queryData})
</script>
<style lang="less" scoped>
.root {
  height: calc(100% - 70px);
  display: flex;

  .menu-tree {
    width: 280px;
    box-shadow: 0 4px 10px 0 rgba(69, 89, 120, 0.5);
    margin: 5px 0 5px 15px;
    position: relative;

    .no-data {
      width: 100%;
      font-size: 17px;
      font-weight: bold;
      text-align: center;
      color: #8e8e8e;
      padding-top: 20px;
    }

    .menu-category {
      font-size: 23px;
      font-weight: bold;
      text-align: center;
      padding: 10px 0;
    }
  }

  .portal-button-space {
    display: flex;
    justify-content: space-between;
    margin: 3px 20px 3px 15px;
  }

  .portal-table-space {
    position: relative;
    height: calc(100% - 70px);
    width: 100%;

    .portal-table {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);

      .pagination {
        margin-top: 15px;
        margin-right: 0;
        display: flex;
        justify-content: flex-end;
      }
    }
  }
}

/**
 保证数据少时右键菜单显示完整
 */
:deep(.surely-table-body-viewport-container) {
  min-height: 350px !important;
}

:deep(.surely-table-cell > .surely-table-cell-edit-wrapper > .surely-table-cell-edit-inner) {
  padding: 0 !important;
}

.table-title-cell {
  display: flex;
  font-weight: bold;
  flex-direction: column;
  justify-content: center;
}

:deep(.surely-table-header-cell) {
  font-weight: bold;
}

:deep(.surely-table-body .surely-table-row-odd:not(.surely-table-row-selected):hover) {
  background-color: #f5f7fa;
}

:deep(.surely-table-body .surely-table-row-even:not(.surely-table-row-selected):hover) {
  background-color: #f5f7fa;
}

.filter-active {
  color: var(--surely-table-primary-color) !important;
  opacity: 1 !important;
}

.menu-popup-container {
  background-color: white;
  width: fit-content !important;
  max-height: 250px;
  overflow-y: auto;
  padding: 4px 0;
}

:deep(.surely-table-popup-container-inner) {
  width: 580px;
  height: 400px;
}

:deep(.surely-table-popup-container) {
  background-color: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

.menu-popup {
  width: 100%;

  .menu-popup-item {
    width: 100%;
    padding: 4px 8px;

    &:hover {
      background-color: var(--surely-table-row-hover-bg);
    }

    &.disabled {
      color: var(--surely-table-disabled-color);
      cursor: not-allowed;
    }
  }
}

.surely-table-cell > .surely-table-cell-edit-wrapper > .surely-table-cell-edit-inner {
  padding: 1px !important;
}

</style>
