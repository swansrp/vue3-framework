<template>
  <div
    ref="root"
    class="root"
    v-bind="$attrs"
  >
    <a-layout v-if="isTreeMode || isListMode || isGridMode">
      <a-layout-sider
        v-if="layoutSiderDisplay"
        :class="[isBindTabExisted ? 'portal-tree-bind-wrapper':'portal-tree-wrapper']"
        :width="isBindTabExisted ? '20%':'99%'"
      >
        <div style="margin: 10px">
          <template v-if="isTreeMode">
            <portal-tree-mode
              v-model:selected-tree-data="selectedTreeData"
              :check-strictly="props.checkStrictly"
              :config="config"
              :tree-check-able="props.treeCheckAble"
              :tree-data="treeData"
              @update-tree="updateTree"
              @handle-tree-selected="handleTreeSelected"
              @handle-menu-context-view="handleMenuContextView"
              @handle-menu-context-add="handleMenuContextAdd"
              @handle-menu-context-modify="handleMenuContextModify"
              @handle-menu-context-copy="handleMenuContextCopy"
              @handle-menu-context-delete="handleMenuContextDelete"
              @handle-add-root-node="handleMenuContextAdd(null)"
            >
              <template #end-action>
                <portal-mode-button
                  v-if="!modeLock"
                  :config="config"
                  :is-list-mode="isListMode"
                  :is-tree-data-empty="treeData.length === 0"
                  :is-tree-mode="isTreeMode"
                  @on-display-changed="handleDisplayModeChange"
                />
              </template>
            </portal-tree-mode>
          </template>
          <portal-list-mode
            v-else-if="isListMode"
            :config="config"
            :data-source="listData"
            :pagination-change="paginationChange"
            :row-selection="hideRowSelection ? null : rowSelection"
            :title-column="titleColumn"
            class="list-mode-table"
            @search="onListDataSearch"
            @row-drag-end="_updateOrder"
            @handle-menu-context-view="handleMenuContextView"
            @handle-menu-context-add="handleMenuContextAdd"
            @handle-menu-context-modify="handleMenuContextModify"
            @handle-menu-context-copy="handleMenuContextCopy"
            @handle-menu-context-delete="handleMenuContextDelete"
          >
            <template #display="{record}">
              <slot
                :record="record.record"
                name="list-mode-display"
              ></slot>
            </template>
            <template #end-action>
              <portal-mode-button
                v-if="!modeLock"
                :config="config"
                :is-list-mode="isListMode"
                :is-tree-data-empty="treeData.length === 0"
                :is-tree-mode="isTreeMode"
                :is-grid-mode="isGridMode"
                @on-display-changed="handleDisplayModeChange"
              />
            </template>
          </portal-list-mode>
          <portal-grid-mode
            v-else-if="isGridMode"
            :config="config"
            :data-source="listData"
            :pagination-change="paginationChange"
            :row-selection="hideRowSelection ? null : rowSelection"
            :title-column="titleColumn"
            :card-width="props.gridCardWidth"
            class="grid-mode-table"
            @search="onListDataSearch"
            @row-drag-end="_updateOrder"
            @handle-menu-context-view="handleMenuContextView"
            @handle-menu-context-add="handleMenuContextAdd"
            @handle-menu-context-modify="handleMenuContextModify"
            @handle-menu-context-copy="handleMenuContextCopy"
            @handle-menu-context-delete="handleMenuContextDelete"
          >
            <template #display="{record}">
              <slot
                :record="record.record"
                name="grid-mode-display"
              ></slot>
            </template>
            <template #item-actions="{record, index}">
              <slot
                :record="record"
                :index="index"
                name="grid-mode-item-actions"
              ></slot>
            </template>
            <template #header-action>
              <slot name="header-action"></slot>
            </template>
            <template #end-action>
              <portal-mode-button
                v-if="!modeLock"
                :config="config"
                :is-list-mode="isListMode"
                :is-tree-data-empty="treeData.length === 0"
                :is-tree-mode="isTreeMode"
                :is-grid-mode="isGridMode"
                @on-display-changed="handleDisplayModeChange"
              />
            </template>
          </portal-grid-mode>
          <a-empty v-else />
        </div>
      </a-layout-sider>
      <a-layout-content
        v-if="isBindTabExisted"
        style="margin-left: 10px; margin-right: 10px"
      >
        <div
          v-if="isNotEmpty(selectedEntityName)"
          style="margin-top: 10px; font-size: 20px; font-weight: bold;"
        >
          <caret-right-outlined
            :rotate="layoutSiderDisplay ? 180 : 0"
            style="color: #1677ff;font-size: 15px;margin-right: 5px"
            @click="handleLayoutSiderDisplay"
          />
          <span>{{ selectedEntityName }}</span>
        </div>
        <portal-bind-tab
          :base-domain="props.baseDomain"
          :bind-tabs="bindTabs"
          :entity-name="props.tableId"
          :record="selectedRecord"
          :row-key="config.rowKey"
        />
      </a-layout-content>
    </a-layout>
    <template v-else>
      <!-- region 树形配置 -->
      <div
        v-if="config.treeMenuShow"
        class="menu-tree"
      >
        <div class="menu-category">
          {{ config.title }}
        </div>
        <!--如果treeData的length为0，说明没有数据，展示提示信息-->
        <div
          v-if="!treeData || !treeData.length"
          class="no-data"
        >
          暂无数据
        </div>
        <!--使用treeData作为a-tree的key，实现在数据更新时，正确渲染a-tree的样式-->
        <a-tree
          :key="treeData"
          :default-expand-all="true"
          :draggable="!config.readOnly && config.treeDragAble"
          :show-line="true"
          :tree-data="treeData"
          @drop="updateTree"
        />
      </div>
      <!-- endregion 树形配置 -->
      <!-- region 数据 -->
      <div style="width: 100%;">
        <!-- region 按钮区 -->
        <portal-button-action
          :advanced-condition="advancedCondition"
          :config="config"
          :is-tree-data-empty="treeData.length === 0"
          @download="download"
          @refresh="refresh"
          @query-data="queryData"
          @show-tree-menu="showTreeMenu"
          @add-row="addRow"
          @save-all="saveAll"
          @delete-selected="deleteSelected"
          @open-upload-modal="openUploadModal"
        >
          <template #left-btns>
            <slot name="left-btns"></slot>
          </template>
          <template #right-btns>
            <slot name="right-btns"></slot>
          </template>
        </portal-button-action>
        <!-- endregion -->
        <!-- region 表格区 -->
        <div
          ref="portalConfigSpace"
          class="portal-table-space"
        >
          <div class="portal-table">
            <!-- region 表格 -->
            <s-table
              :key="config.key"
              :columns="multiHeader ? multiHeadColumns : columns"
              :data-source="dataSource"
              :loading="config.loading"
              :pagination="false"
              :range-selection="false"
              :row-expandable="props.rowExpandable || allTextAreaColumnsNotEmpty"
              :row-selection="hideRowSelection ? null : rowSelection"
              :row-key="config.rowKey"
              :scroll="{x: getTableWidth(), y: getTableHeight()}"
              :size="config.size"
              :style="{width: autoWidth ? undefined : tableWidth + 'px'}"
              :table-id="config.tableId"
              auto-header-height
              bordered
              column-drag
              deep-watch-columns
              deep-watch-data-source
              show-sorter-tooltip
              sticky
              stripe
              summary-fixed
              @change="handleTableChange"
              @expand="handleExpand"
              @column-drag-end="handleColumnDragEnd"
              @row-drag-end="() => isNotEmpty(rowDragEnd) ? rowDragEnd(dataSource, config.currentPage, config.pageSize) : handleRowDragEnd()"
            >
              <!-- region 表头样式 -->
              <template #headerCell="{title, column}">
                <slot
                  :column="column"
                  :name="'headerCell_' + column.dataIndex"
                  :title="title"
                >
                  <div
                    v-if="title?.indexOf('\n') !== -1"
                    :style="column.editable === 'cellEditorSlot' ? { borderBottom: '1px ridge'} : { borderBottom: '0px ridge'}"
                    class="table-title-cell"
                  >
                    <div
                      v-for="(item, index) in title?.split('\n')"
                      :key="index"
                    >
                      {{ item }}
                    </div>
                  </div>
                  <div
                    v-else-if="title?.indexOf('\\n') !== -1"
                    :style="column.editable === 'cellEditorSlot' ? { borderBottom: '1px ridge'} : { borderBottom: '0px ridge'}"
                    class="table-title-cell"
                  >
                    <div
                      v-for="(item, index) in title?.split('\\n')"
                      :key="index"
                    >
                      {{ item }}
                    </div>
                  </div>
                  <span v-else-if="column.dataIndex === 'index'">{{ title }}</span>
                  <span
                    v-else
                    :style="column.editable === 'cellEditorSlot' ? { borderBottom: '1px ridge'} : { borderBottom: '0px ridge'}"
                    class="table-title-cell"
                  >{{ title }}</span>
                </slot>
              </template>
              <!-- endregion -->
              <!-- region 单元格样式-->
              <template #bodyCell="{ column, record, index }">
                <slot
                  :column="column"
                  :index="index"
                  :name="'bodyCell_' + column.dataIndex"
                  :record="record"
                >
                  <portal-body-cell
                    v-if="isNotEmpty($slots.action) || isNotEmpty($slots.index) || !config.readOnly"
                    :key="modifyCellMap.get(index + column.dataIndex).current"
                    :column="column"
                    :config="config"
                    :display-index="isEmpty($slots.index)"
                    :display-map="modifyCellMap"
                    :index="index"
                    :is-cell-update="isCellUpdate"
                    :record="record"
                  >
                    <template #action="{}">
                      <slot
                        :column="column"
                        :columns="columns"
                        :parsed-record="parsedDataSource[index]"
                        :portal-config="config"
                        :record="record"
                        name="action"
                      ></slot>
                    </template>
                    <template #index="{}">
                      <slot
                        :column="column"
                        :columns="columns"
                        :parsed-record="parsedDataSource[index]"
                        :portal-config="config"
                        :record="record"
                        name="index"
                      ></slot>
                    </template>
                  </portal-body-cell>
                  <template v-else>
                    <template v-if="column.fieldType === FIELD_TYPE.IMAGE">
                      <multimedia
                        v-model="record[column.dataIndex]"
                        :height="column.referenceDict?.split(',')[1] || 120"
                        :type="column.fieldType"
                        :width="column.referenceDict?.split(',')[0] || 120"
                        use-original-file-name
                      />
                    </template>
                    <template
                      v-else-if="column.fieldType === FIELD_TYPE.AUDIO || column.fieldType === FIELD_TYPE.VIDEO ||
                        column.fieldType === FIELD_TYPE.FILE"
                    >
                      <multimedia
                        v-model="record[column.dataIndex]"
                        :height="35"
                        :type="column.fieldType"
                        :width="80"
                      />
                    </template>
                    <span
                      v-else
                      :style="column.tooltip ? {display: 'block',
                                                textAlign: column.contentAlign || 'left',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                height: '100%'} :
                        {display: 'block', textAlign: column.contentAlign || 'center'}"
                    >
                      {{ parsedDataSource[index] && parsedDataSource[index][column.dataIndex] }}
                    </span>
                  </template>
                </slot>
              </template>
              <!-- endregion -->
              <!-- region 总结栏样式 -->
              <template #summary>
                <portal-summary
                  :columns="columns"
                  :config="config"
                  :data-summary="dataSummary"
                  :hide-row-selection="hideRowSelection"
                  :is-expanded="isNotEmpty($slots.expandedRowRender) || props.textAreaInExpanded"
                />
              </template>
              <!-- endregion -->
              <!-- region 提示样式 -->
              <template #tooltipTitle="{ value }">
                {{ value }}
              </template>
              <!-- endregion -->
              <!-- region 右键菜单样式 -->
              <template #contextmenuPopup="args">
                <slot
                  :args="args"
                  :name="'contextmenuPopup_' + args?.column?.dataIndex"
                >
                  <portal-context-menu-popup
                    :args="args"
                    :association="isBindTabExisted"
                    :config="config"
                    :is-cell-update="isCellUpdate"
                    :is-row-update="isRowUpdate"
                    :row-allow-delete="_rowAllowDelete"
                    :row-allow-edit="_rowAllowEdit"
                    @association="associationRow"
                    @copy-row="copyRow"
                    @reset-cell="resetCell"
                    @save-cell="saveCell"
                    @save-row="saveRow"
                    @detail-row="detailRow"
                    @edit-row="editRow"
                    @delete-row="deleteRow"
                  />
                </slot>
              </template>
              <!-- endregion -->
              <!-- region 下拉搜索样式 -->
              <template #menuIcon="{ column, filtered }">
                <bars-outlined
                  v-if="column.dataIndex === 'index'"
                  :class="filtered && 'filter-active'"
                />
                <filter-outlined
                  v-else-if="column.filterAble"
                  :class="filtered && 'filter-active'"
                />
              </template>
              <template
                #menuPopup="{ column }"
              >
                <!-- region 列显示选择 -->
                <div v-if="column.dataIndex === 'index'">
                  <div class="menu-popup-container">
                    <ul class="menu-popup">
                      <li
                        class="menu-popup-item"
                        style="border-bottom: 1px solid #f0f0f0"
                      >
                        <a-checkbox
                          v-model:checked="checkedAll"
                          :indeterminate="indeterminate"
                          style="margin: 2px;"
                        >
                          全选 / 取消选择
                        </a-checkbox>
                        <a-tooltip
                          placement="right"
                          title="恢复默认"
                        >
                          <a-button
                            size="small"
                            type="ghost"
                            @click="handleColumnReset"
                          >
                            <RedoOutlined />
                          </a-button>
                        </a-tooltip>
                      </li>
                      <template
                        v-for="col in columnArray"
                        :key="col.key"
                      >
                        <li class="menu-popup-item">
                          <a-checkbox
                            v-model:checked="col.checked"
                            :disabled="!!col.disabled"
                            style="width: 100%"
                            @change="handleColumnChecked"
                          >
                            {{ col.title }}
                          </a-checkbox>
                        </li>
                      </template>
                    </ul>
                  </div>
                </div>
                <!-- endregion -->
              </template>
              <!-- endregion -->
              <!-- region 列搜索 -->
              <template #customFilterIcon="{ filtered }">
                <search-outlined :style="{ fontSize: '15px', color: filtered ? '#108ee9' : undefined }" />
              </template>
              <template
                #customFilterDropdown="{ setSelectedKeys, selectedKeys, confirm, clearFilters, column }"
              >
                <slot
                  :clear-filters="clearFilters"
                  :column="column"
                  :name="'customFilterDropdown_' + column.dataIndex"
                  :selected-keys="selectedKeys"
                  :set-selected-keys="setSelectedKeys"
                  confirm="confirm"
                >
                  <portal-column-condition
                    ref="filterDropdownRef"
                    :clear-filters="clearFilters"
                    :column="column"
                    :confirm="confirm"
                    :selected-keys-ref="selectedKeys"
                    :set-selected-keys="setSelectedKeys"
                    @handle-search-condition-changed="handleSearchConditionChanged"
                  />
                </slot>
              </template>
              <!-- endregion -->
              <!-- region 拖拽显示样式 -->
              <template #rowDragGhost="{ record, icon, preTargetInfo, nextTargetInfo }">
                <component :is="icon" />
                <span style="color: gray">
                  dragging from {{ record[config.nameKey] }} to
                  {{ preTargetInfo?.record[config.nameKey] || nextTargetInfo?.record[config.nameKey] }}
                </span>
              </template>
              <!-- endregion -->
              <!-- region 单元格编辑样式 -->
              <template
                #cellEditor="{ column, modelValue, save, closeEditor, editorRef, getPopupContainer, record, recordIndexs }"
              >
                <slot
                  :close-editor="closeEditor"
                  :column="column"
                  :editor-ref="editorRef"
                  :get-popup-container="getPopupContainer"
                  :model-value="modelValue"
                  :name="'cellEditor_' + column.dataIndex"
                  :record="record"
                  :save="save"
                  record-indexs="recordIndexs"
                >
                  <portal-cell-editor
                    :close-editor="closeEditor"
                    :column="column"
                    :config="config"
                    :editor-ref="editorRef"
                    :get-popup-container="getPopupContainer"
                    :model-value="modelValue"
                    :record="record"
                    :record-indexs="recordIndexs"
                    :row-allow-edit="rowAllowEdit"
                    :save="save"
                    @cell-update="cellUpdate"
                  />
                </slot>
              </template>
              <template
                v-if="isNotEmpty($slots.expandedRowRender) || props.textAreaInExpanded"
                #expandedRowRender="{record, index}"
              >
                <slot
                  v-if="isNotEmpty($slots.expandedRowRender)"
                  :parse-record="parsedDataSource[index]"
                  :record="record"
                  name="expandedRowRender"
                ></slot>
                <portal-text-area-expanded
                  v-else-if="props.textAreaInExpanded"
                  :columns="textAreaColumns"
                  :record="record"
                />
              </template>
              <template #footer>
                <div class="pagination">
                  <a-button
                    v-if="_statisticButton"
                    type="text"
                    @click="statisticShow = true"
                  >
                    <template #icon>
                      <PieChartOutlined />
                    </template>
                  </a-button>
                  <div>
                    <slot name="footer-action"></slot>
                  </div>
                  <div style="display: flex">
                    <a-pagination
                      v-if="config.total > config.pageSize || !hidePagination"
                      v-model:current="config.currentPage"
                      v-model:page-size="config.pageSize"
                      :page-size-options="['10','20','30','50','100','200', '500', '1000']"
                      :show-total="total => `共 ${total} 项`"
                      :size="config.size"
                      :total="config.total"
                      show-less-items
                      show-quick-jumper
                      show-size-changer
                      @change="paginationChange"
                    >
                      <template #itemRender="{ type, originalElement }">
                        <a v-if="type === 'prev'">&lt;</a>
                        <a v-else-if="type === 'next'">&gt;</a>
                        <component
                          :is="originalElement"
                          v-else
                        />
                      </template>
                      <template #buildOptionText="prop">
                        <span
                          v-if="+prop.value <= 500"
                          style="width: 60px; display: inline-block"
                        >
                          {{ prop.value }}条/页
                        </span>
                        <span
                          v-else
                          style="width: 60px; display: inline-block"
                        >全部</span>
                      </template>
                    </a-pagination>
                    <portal-mode-button
                      v-if="!modeLock"
                      :config="config"
                      :is-list-mode="isListMode"
                      :is-tree-data-empty="treeData.length === 0"
                      :is-tree-mode="isTreeMode"
                      :is-grid-mode="isGridMode"
                      @on-display-changed="handleDisplayModeChange"
                    />
                  </div>
                </div>
              </template>
              <!-- endregion -->
            </s-table>
            <!-- endregion -->
          </div>
        </div>
        <!-- endregion -->
      </div>
      <!-- endregion 数据 -->
    </template>
    <!-- region 详情框 -->
    <slot
      v-if="config.modal.type === 'view'"
      :data-source="dataSource"
      :modal="config.modal"
      :modify-cell-map="modifyCellMap"
      name="view"
    >
      <portal-view-modal
        :column-display-map="columnDisplayMap"
        :config="config"
        :data-source="dataSource"
        :modify-cell-map="modifyCellMap"
        @cancel="handleModalCancel"
        @close="handleModalClose"
        @confirm="handleModalConfirm"
      />
    </slot>
    <slot
      v-else-if="config.modal.type === 'association'"
      :bind-tabs="bindTabs"
      :modal="config.modal"
      name="association"
    >
      <portal-association-modal
        :bind-tabs="bindTabs"
        :config="config"
        @cancel="handleModalCancel"
        @close="handleModalClose"
        @confirm="handleModalConfirm"
      />
    </slot>
    <slot
      v-else-if="config.modal.type === 'modify'"
      :column-display-map="columnDisplayMap"
      :modal="config.modal"
      name="modify"
    >
      <portal-edit-modal
        v-model:config="config"
        :column-display-map="columnDisplayMap"
        @cancel="handleModalCancel"
        @close="handleModalClose"
        @confirm="handleModalConfirm"
      />
    </slot>
    <slot
      v-else-if="config.modal.type === 'add'"
      :column-display-map="columnDisplayMap"
      :modal="config.modal"
      name="add"
    >
      <portal-edit-modal
        v-model:config="config"
        :column-display-map="columnDisplayMap"
        @cancel="handleModalCancel"
        @close="handleModalClose"
        @confirm="handleModalConfirm"
      />
    </slot>
    <portal-upload
      ref="portalUploadModal"
      @upload="uploadAdd"
      @after-close="queryData"
      @template-export="templateExport"
      @upload-progress="uploadAddProgress"
    />
    <dashboard-modal
      v-model:show="statisticShow"
      :config="config"
    />
    <!-- endregion -->
  </div>
</template>
<script lang="ts" setup>
import {
  BarsOutlined,
  CaretRightOutlined,
  ExclamationCircleOutlined,
  FilterOutlined,
  PieChartOutlined,
  RedoOutlined,
  SearchOutlined
} from '@ant-design/icons-vue'
import Table from '@surely-vue/table'
import { message, Modal } from 'ant-design-vue'
import { AntTreeNodeDropEvent } from 'ant-design-vue/es/tree'
import { DefaultRecordType } from 'ant-design-vue/es/vc-table/interface'
import { DataNode } from 'ant-design-vue/es/vc-tree/interface'
import * as _ from 'lodash'
import { createVNode, Ref, useSlots } from 'vue'

import { name } from '@/../package.json'
import {
  addEntity,
  advancedQuery,
  advancedSelect,
  advancedSummary,
  deleteEntity,
  deleteEntityList,
  exportTemplate,
  generalQuery,
  generalSelect,
  generalSummary,
  getById,
  getTreeData,
  importAdd,
  importAddProgress,
  updateEntity,
  updateEntityListSelective,
  updateEntitySelective,
  updateOrder,
  updateTreePid
} from '@/framework/apis/portal'
import { getPortalConfig } from '@/framework/apis/portal/config'
import { ConditionListType } from '@/framework/components/common/AdvancedSearch/ConditionList/type'
import { ConditionType } from '@/framework/components/common/AdvancedSearch/type'
import { PortalBindType } from '@/framework/components/common/Portal/bind/type'
import {
  actionColumn,
  AUTO_UUID_ROW_KEY,
  defaultColumn,
  getDefaultFilterType,
  indexColumn
} from '@/framework/components/common/Portal/constant'
import DashboardModal from '@/framework/components/common/Portal/dashboard/dashboardModal.vue'
import { db } from '@/framework/components/common/Portal/db'
import PortalAssociationModal from '@/framework/components/common/Portal/modal/PortalAssociationModal.vue'
import PortalGridMode from '@/framework/components/common/Portal/mode/PortalGridMode.vue'
import PortalTextAreaExpanded from '@/framework/components/common/Portal/table/PortalTextAreaExpanded.vue'
import {
  ColumnType,
  FIELD_TYPE,
  FILTER_TYPE,
  ModalType,
  ModifyCellType,
  QuerySortType,
  QueryType,
  TableConfigType,
  UpdateOrderType
} from '@/framework/components/common/Portal/type'
import { parse } from '@/framework/components/common/Portal/utils'
import { getDroppedData } from '@/framework/hooks/antTreeDropSort'
import bus, { PORTAL_RESIZE } from '@/framework/mitt'
import { dictStore, useTreeStore } from '@/framework/store/common'
import {
  doFunctions,
  getAllParentNodes,
  getBrotherNodes,
  isEmpty,
  isNotEmpty,
  log,
  updateTableSize,
  uuid
} from '@/framework/utils/common'
import { AUTO } from '@/framework/utils/constant'
import { excelExport } from '@/framework/utils/excel'

const __ = getInstance()
/**
 * @param tableId 表格ID
 * @param multiHeader 是否多重表头
 * @param data 显示数据
 * @param readOnly 不能编辑
 * @param currentPage 当前页码
 * @param pageSize 每页显示条数
 * @param autoWidth 自动宽度
 * @param autoHeight 自动高度
 * @param actionWidth 操作栏宽度
 * @param indexWidth 序号栏宽度
 * @param indexTitle 序号栏标题
 * @param advance 是否支持高级查询(需要having查询时不能支持高级查询)
 * @param advanceButton 是否显示高级查询按钮
 * @param statisticButton 是否显示统计按钮
 * @param selectColumnCondition 动态字段条件
 * @param advanceCondition 默认查询参数
 * @param defaultSortColumn 默认排序字段
 * @param singleSelect 是否单选
 * @param hideRefresh 隐藏刷新按钮
 * @param hideRowSelection 是否行能选择
 * @param hideAdd 隐藏添加按钮
 * @param hideEdit 隐藏修改按钮
 * @param hideDelete 隐藏删除按钮
 * @param hideAssociation 隐藏关联信息
 * @param hidePagination 隐藏分页信息
 * @param rowAllowEdit 该行右键是否能够编辑
 * @param rowAllowDelete 该行右键是否能够删除
 * @param rowSelectProps 行选择属性配置函数
 * @param query 查询函数
 * @param showTree 默认显示树形结构
 * @param treeMode 是否以树形结构展示
 * @param listMode 是否以列表形式展示
 * @param gridMode 是否以网格形式展示
 * @param modeLock 是否锁定模式
 * @param bindTabs 显示需要绑定的数据标签
 * @param treeCheckAble 绑定操作树是否有可选框
 * @param selectedTreeData 树形结构展示当前选择项
 * @param checkStrictly 树形结构选择是否完全受控
 * @param bindDefaultValue 1:N entity字段名称-字段属性
 * @param textAreaInExpanded 长文本自动在展开区域显示
 * @param rowExpandable 每行是否展示展开按钮
 * @param rowDragEnd 行拖拽结束
 * @param columnFilter 列过滤方法
 * @param columnDisplayCustom 列显示自定义方法
 * @param downloadFileName 下载文件命名方法
 * @param showLoading 查询时是否显示加载中
 * @param gridCardWidth grid模式卡片宽度
 */
const props = withDefaults(defineProps<{
    baseDomain?: string,
    tableId: string,
    multiHeader?: boolean,
    data?: Array<any>,
    readOnly?: boolean,
    currentPage?: number,
    pageSize?: number
    autoWidth?: boolean,
    autoHeight?: boolean,
    actionWidth?: number | string,
    indexWidth?: number,
    indexTitle?: string,
    advance?: boolean,
    advanceButton?: boolean,
    statisticButton?: boolean,
    selectColumnCondition?: Map<string, string>,
    advanceCondition?: ConditionListType,
    defaultSortColumn?: Array<QuerySortType>,
    singleSelect?: boolean,
    hideRefresh?: boolean,
    hideRowSelection?: boolean,
    hideAdd?: boolean,
    hideEdit?: boolean,
    hideDelete?: boolean,
    hideAssociation?: boolean,
    hidePagination?: boolean,
    rowAllowEdit?: (record: any) => boolean,
    rowAllowDelete?: (record: any) => boolean,
    rowSelectProps?: (record: any) => any
    query?: (url: string, query: QueryType) => Promise<any>,
    showTree?: boolean,
    treeMode?: boolean,
    listMode?: boolean,
    gridMode?: boolean,
    modeLock?: boolean,
    bindTabs?: Array<PortalBindType>,
    treeCheckAble?: boolean,
    selectedTreeData?: Array<any>,
    checkStrictly?: boolean
    bindDefaultValue?: any
    textAreaInExpanded?: boolean,
    rowExpandable?: (record: DefaultRecordType) => boolean
    rowDragEnd?: (data: Array<any>, currentPage: number, pageSize: number) => void
    columnFilter?: (column: ColumnType) => boolean
    columnDisplayCustom?: any
    downloadFileName?: (config: TableConfigType) => string
    showLoading?: boolean
    gridCardWidth?: number
  }>(),
  {
    baseDomain: '/' + name,
    data: undefined,
    readOnly: false,
    currentPage: 1,
    pageSize: 10,
    autoWidth: false,
    autoHeight: false,
    actionWidth: 150,
    indexWidth: 80,
    indexTitle: '',
    advance: true,
    advanceButton: false,
    statisticButton: false,
    selectColumnCondition: undefined,
    advanceCondition: undefined,
    defaultSortColumn: undefined,
    singleSelect: false,
    hideRefresh: false,
    hideRowSelection: false,
    hideAdd: false,
    hideEdit: false,
    hideDelete: false,
    hideAssociation: false,
    hidePagination: false,
    rowAllowEdit: () => true,
    rowAllowDelete: () => true,
    rowSelectProps: undefined,
    query: undefined,
    showTree: false,
    treeMode: false,
    listMode: false,
    gridMode: false,
    modeLock: true,
    bindTabs: undefined,
    treeCheckAble: false,
    selectedTreeData: undefined,
    checkStrictly: false,
    bindDefaultValue: undefined,
    textAreaInExpanded: false,
    rowExpandable: undefined,
    rowDragEnd: undefined,
    columnFilter: (column: ColumnType) => column.checked,
    columnDisplayCustom: new Map<string, string>(),
    downloadFileName: (config: TableConfigType) => config.title,
    showLoading: false,
    gridCardWidth: 350
  })
const emit = defineEmits<{
  (e: 'update:selectedTreeData', selectedTreeData: Array<any>): void
  (e: 'selectedData', selectedData: Array<any>): void
  (e: 'expand', expanded: boolean, record: any): void
}>()
const slots = useSlots()
const {
  data, columnFilter, downloadFileName, rowSelectProps, hideAssociation,
  columnDisplayCustom, showLoading,
  hideAdd, hideEdit, hideDelete, hideRefresh
} = toRefs(props)
const isBindTabExisted = computed(() => {
  return !hideAssociation.value && bindTabs.value && bindTabs.value.length > 0
})
const bindTabs: Ref<Array<PortalBindType>> = ref(props.bindTabs || [] as Array<PortalBindType>)
const isTreeMode: Ref<boolean> = ref(props.treeMode)
const isListMode: Ref<boolean> = ref(props.listMode)
const isGridMode: Ref<boolean> = ref(props.gridMode)
const statisticShow: Ref<boolean> = ref(false)
const layoutSiderDisplay = ref(true)
const $attrs = useAttrs()
const dict = dictStore()
const treeDict = useTreeStore()
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
  return tableHeight.value < 350 ? 350 : tableHeight.value
}
const updateTableWidthAndHeight = () => {
  console.debug('updateTableWidthAndHeight')
  updateTableSize(root, tableWidth, 10 + (config.treeMenuShow ? 230 : 0), tableHeight, 225)
}
const _updateTableSize = _.debounce(updateTableWidthAndHeight, 200)
const _statisticButton = ref(false)
//endregion


//region 表格显示配置
/**
 * 整体配置
 */
const config: TableConfigType = reactive({
  baseDomain: props.baseDomain,
  tableId: props.tableId,
  url: '',
  key: 1,
  title: '',
  size: 'default',
  rowKey: 'id',
  nameKey: 'name',
  parentKey: '',
  getPopupContainer: () => {
  },
  loading: true,
  currentPage: props.currentPage,
  pageSize: props.pageSize,
  total: props.data ? props.data.length : 0,
  modal: {
    show: false,
    type: undefined,
    data: {} as { [key: string]: any },
    editRowIndex: null
  } as ModalType,
  readOnly: false,
  summary: false,
  treeMode: false,
  treeDragAble: false,
  orderMode: false,
  treeMenuShow: false,
  saveAllButtonShow: false,
  deleteSelectedButtonShow: false,
  descriptionCount: 4,
  detailWidth: '100%',
  addWidth: '100%',
  editWidth: '100%',
  addModalAble: !hideAdd.value,
  editModalAble: !hideEdit.value,
  deleteAble: !hideDelete.value,
  importAble: false,
  exportAble: false,
  defaultCondition: {} as ConditionListType,
  defaultSort: [] as Array<QuerySortType>,
  hideRefresh: hideRefresh.value,
  plain: false,
  advancedSearchAble: true,
  advancedSearchButton: true
} as TableConfigType)

/**
 * 数据
 */
let dataSource: Ref<Array<any>> = ref([] as Array<any>)
const parsedDataSource: Ref<Array<any>> = ref([] as Array<any>)
const dataSourceMap: Ref<Map<any, any>> = ref(new Map() as Map<any, any>)
const dataSummary = ref({} as { [key: string]: any })
const summaryColumns = [] as Array<string>
const modifyCellMap = new Map<string, ModifyCellType>()
const treeData: Ref<Array<DataNode>> = ref([])
const listData = computed(() => {
  return dataSource.value.map((value) => {
    return { value: value[config.rowKey], label: value[config.nameKey], record: value }
  })
})
/**
 * 表头
 */
const columnArray: Ref<Array<ColumnType>> = ref([] as Array<ColumnType>)
const columnDisplayMap: Ref<Map<any, Array<ColumnType>>> = ref(new Map<any, Array<ColumnType>>())
const columnRaw = new Map<string, ColumnType>()
const columns = computed(() => {
  return columnArray.value.filter(item => columnFilter.value(item)).sort((a: ColumnType, b: ColumnType) => a.order - b.order)
})
const textAreaColumns = computed(() => {
  return columnArray.value.filter(item => item.fieldType === FIELD_TYPE.TEXT_AREA)
})
const multiHeadColumns = computed(() => {
  const res = [] as Array<any>
  columns.value.forEach((column: ColumnType) => {
    if (isNotEmpty(column.displayGroupName)) {
      if (res[res.length - 1].title !== column.displayGroupName) {
        res.push({ title: column.displayGroupName, children: columnDisplayMap.value.get(column.displayGroupName) })
      }
    } else {
      res.push(column)
    }
  })
  return res
})
const dictColumnArray: Array<ColumnType> = []
let titleColumn = {} as ColumnType
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
const selectedRecord = computed(() => {
  if ((isListMode.value || isGridMode.value) && isNotEmpty(selectedListDataItem.value)) {
    console.debug('selectedRecord', dataSourceMap.value, selectedListDataItem.value[0][config.rowKey], dataSourceMap.value.get(selectedListDataItem.value[0][config.rowKey]))
    return dataSourceMap.value.get(selectedListDataItem.value[0][config.rowKey])
  } else if (isTreeMode.value && isNotEmpty(selectedTreeDataNode.value)) {
    return dataSourceMap.value.get(selectedTreeDataNode.value.key)
  } else {
    return null
  }

})
const selectedEntityName = computed(() => {
  if (isNotEmpty(selectedListDataItem.value)) {
    return selectedListDataItem.value.label
  } else if (isNotEmpty(selectedTreeDataNode.value)) {
    return selectedTreeDataNode.value.title
  } else {
    return null
  }
})
const handleLayoutSiderDisplay = () => {
  layoutSiderDisplay.value = !layoutSiderDisplay.value
  bus.emit(PORTAL_RESIZE)
}
const handleDisplayModeChange = (menuKey: any) => {
  switch (menuKey) {
    case 'tableMode':
      isListMode.value = false
      isTreeMode.value = false
      isGridMode.value = false
      break
    case 'listMode':
      isListMode.value = true
      isTreeMode.value = false
      isGridMode.value = false
      break
    case 'gridMode':
      isListMode.value = false
      isTreeMode.value = false
      isGridMode.value = true
      break
    case 'treeMode':
      isTreeMode.value = true
      isListMode.value = false
      isGridMode.value = false
      break
  }
}
/**
 * 树选择配置
 */
const selectedTreeData = ref(props.selectedTreeData || [])
watch(
  () => props.selectedTreeData,
  (data: Array<any> | undefined) => {
    if (data !== undefined) {
      selectedTreeData.value = data
    }
  },
  {
    immediate: true
  }
)
watch(
  () => selectedTreeData.value,
  (data: Array<any>) => {
    emit('update:selectedTreeData', data)
    emit('selectedData', data)
  })
const selectedTreeDataNode = ref()
/**
 * 列表选择配置
 */
const selectedListDataItem = ref()
const onListDataSearch = (searchName: string, searchStrict: boolean) => {
  const condition = {
    property: config.nameKey,
    value: [searchName?.trim()],
    relation: getDefaultFilterType(FIELD_TYPE.INPUT, searchStrict)
  } as ConditionListType
  queryConditionMap.set(config.nameKey, condition)
  config.currentPage = 1
  queryData()
}
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
    ],
    allowCancelRadio: true,
    type: props.singleSelect ? 'radio' : 'checkbox',
    getCheckboxProps: rowSelectProps.value
  }
})
const getRowSelection = () => {
  return rowSelection.value.selectedRowKeys
}
/**
 * 树形菜单是否显示
 */
const showTreeMenu = (show?: boolean) => {
  config.treeMenuShow = show || !config.treeMenuShow
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
const isCellUpdate = (index: number, column: any): boolean => {
  let result = false
  const modifyCell = modifyCellMap.get(index + column.dataIndex)
  if (modifyCell && isNotEmpty(modifyCell)) {
    if (modifyCell.needUpdated) config.saveAllButtonShow = true
    result = modifyCell.needUpdated
  }
  return result
}
const isRowUpdate = (index: number): boolean => {
  let result = false
  for (let column of columns.value) {
    const modifyCell = modifyCellMap.get(index + column.dataIndex)
    if (modifyCell && isNotEmpty(modifyCell) && modifyCell.needUpdated) {
      result = true
      return result
    }
  }
  return result
}
const saveCell = (args: any) => {
  const modifyCell = modifyCellMap.get(args.recordIndexs[0] + args.column.dataIndex)
  if (modifyCell && modifyCell.needUpdated) {
    updateEntitySelective(config.url, {
      [modifyCell.dataIndex]: modifyCell.current,
      [config.rowKey]: modifyCell.id
    }, config.baseDomain).then(() => queryData())
    log('保存单元格内容', { [args.column.dataIndex]: modifyCell.current, [config.rowKey]: modifyCell.id })
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
  for (let column of columnArray.value) {
    const modifyCell = modifyCellMap.get(index + column.dataIndex)
    if (modifyCell && isNotEmpty(modifyCell) && modifyCell.needUpdated) {
      cellUpdate(index, column.dataIndex, modifyCell.original)
      dataSource.value[index][column.dataIndex] = modifyCell.original
    }
  }
  log('撤销行数据修改')
}
const saveRow = (args: any) => {
  let { id, data } = _buildUpdatedRowData(args.recordIndexs[0])
  if (data.size != 0) {
    data.set(config.rowKey, id)
    log('保存行内容', data)
    updateEntitySelective(config.url, Object.fromEntries(data), config.baseDomain).then(() => {
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
  return { id, data }
}
const _buildRowData = (index: any) => {
  let id
  const data = new Map()
  for (let column of columnArray.value) {
    const modifyCell = modifyCellMap.get(index + column.dataIndex)
    if (modifyCell) {
      data.set(modifyCell.dataIndex, modifyCell.current)
      id = modifyCell.id
    }
  }
  return { id, data }
}
const saveAll = () => {
  const dataMap = new Map<number, Map<String, any>>()
  for (let index = 0; index < dataSource.value.length; index++) {
    let { id, data } = _buildUpdatedRowData(index)
    if (data.size != 0) {
      data.set(config.rowKey, id)
      log('保存行内容' + index, data)
      dataMap.set(index, Object.fromEntries(data))
    }
  }
  updateEntityListSelective(config.url, [...dataMap.values()], config.baseDomain).then(() => queryData())
  log('保存所有内容', dataMap)
}
const deleteSelected = () => {
  Modal.confirm({
    title: '注意',
    icon: createVNode(ExclamationCircleOutlined),
    content: createVNode('div', { style: 'color:red;' }, '即将删除选定' + selectedRowKeys.value.length + '个记录,请确认'),
    onOk() {
      deleteEntityList(config.url, [...selectedRowKeys.value], config.baseDomain).then(() => queryData())
    },
    onCancel() {

    }
  })
}
const deleteRow = (args: any) => {
  Modal.confirm({
    title: '注意',
    icon: createVNode(ExclamationCircleOutlined),
    content: createVNode('div', { style: 'color:red;' }, '即将删除该记录,请确认'),
    onOk() {
      const modifyCell = modifyCellMap.get(args.recordIndexs[0] + args.column.dataIndex)
      if (modifyCell) {
        deleteEntity(config.url, modifyCell.id, config.baseDomain).then(() => queryData())
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
    updateOrderData.push({ id: node.key, showOrder: index })
  })
  await updateOrder(config.url, updateOrderData, config.baseDomain)
  if (info.dragNode.parent?.key !== pid) {
    await updateTreePid(config.url, {
      id: dragKey,
      pid
    }, config.baseDomain)
  }
  const condition = queryCondition()
  return queryDataAsync(condition)
}
const handleTreeSelected = (selectedKeys: any, e: { selected: boolean, selectedNodes: any, node: any, event: any }) => {
  if (e.selected) {
    selectedTreeDataNode.value = e.node
    emit('selectedData', selectedKeys)
  }
}
watch(
  () => selectedListDataItem.value,
  () => emit('selectedData', selectedListDataItem?.value),
  {
    deep: true
  }
)
// endregion
// region 编辑弹框
const _rowAllowEdit = (record: any) => {
  let allow = !config.readOnly
  allow = allow && !isRowUpdate(record.index) && config.editModalAble
  if (props.rowAllowEdit) {
    allow = allow && props.rowAllowEdit(record)
  }
  return allow
}
const _rowAllowDelete = (record: any) => {
  let allow = !config.readOnly
  allow = allow && !isRowUpdate(record.index)
  if (props.rowAllowDelete) {
    allow = allow && props.rowAllowDelete(record)
  }
  return allow
}
const handleMenuContextView = (recordId: any) => {
  getById(config.url, recordId, config.baseDomain).then(resp => {
    config.modal.data = resp.payload
    openModal('view')
  })
}
const handleMenuContextAdd = (recordId: any) => {
  if (config.parentKey) {
    config.modal.data[`${ config.parentKey }`] = recordId
  }
  addRow()
}
const handleMenuContextCopy = (recordId: any) => {
  getById(config.url, recordId, config.baseDomain).then(resp => {
    config.modal.data = resp.payload
    config.modal.data[config.rowKey] = null
    openModal('add')
  })
}
const handleMenuContextModify = (recordId: any) => {
  getById(config.url, recordId, config.baseDomain).then(resp => {
    config.modal.data = resp.payload
    openModal('modify')
  })
}
const handleMenuContextDelete = (recordId: any) => {
  Modal.confirm({
    title: '注意',
    icon: createVNode(ExclamationCircleOutlined),
    content: createVNode('div', { style: 'color:red;' }, '即将删除该记录,请确认'),
    onOk() {
      deleteEntity(config.url, recordId, config.baseDomain).then(() => queryData())
    },
    onCancel() {

    }
  })
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
// 查看行数据关联信息
const associationRow = (args: any) => {
  const { data } = _buildRowData(args.recordIndexs[0])
  config.modal.data = Object.fromEntries(data)
  if (data.size != 0) {
    config.modal.editRowIndex = args.recordIndexs[0]
  }
  openModal('association')
  args.hidePopup()
}
// 查看行数据详情
const detailRow = (args: any) => {
  console.debug(modifyCellMap, args.recordIndexs[0])
  const { data } = _buildRowData(args.recordIndexs[0])
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

  // 保存已设置的父节点ID（如果存在）
  const existingParentId = config.modal.data?.[config.parentKey]
  
  // 初始化modal.data
  if (props.bindDefaultValue) {
    config.modal.data = { ...props.bindDefaultValue }
  } else {
    config.modal.data = {}
  }
  
  // 恢复父节点ID
  if (existingParentId !== undefined && existingParentId !== null) {
    config.modal.data[config.parentKey] = existingParentId
  }
  
  for (let column of columnArray.value) {
    if (column.addShow && isNotEmpty(column.defaultValue)) {
      config.modal.data[column.dataIndex] = column.defaultValue
    }
  }
  config.modal.editRowIndex = null
}
// 保存添加数据
const saveAddRow = async () => {
  await addEntity(config.url, config.modal.data, config.baseDomain)
}
// 模版下载
const templateExport = () => {
  exportTemplate(config.url, config.tableId, downloadFileName.value(config) + '-模版' + '.xlsx', config.baseDomain)
}
const portalUploadModal = ref()
// 上传弹框
const openUploadModal = () => {
  importAddProgress(config.url, config.tableId).then(resp => {
    portalUploadModal.value.openUploadModal(resp)
  })
}
const uploadAdd = async (file: Object, onUploadProgress: Function, onSuccess: Function, onFailed: Function) => {
  return await importAdd(config.url, config.tableId, file, onUploadProgress, config.baseDomain).then(resp => onSuccess(resp)).catch(resp => onFailed(resp))
}
const uploadAddProgress = (onSuccess: Function) => {
  return importAddProgress(config.url, config.tableId).then((resp) => onSuccess(resp))
}
// 打开编辑详情页
const editRow = (args: any) => {
  const { id, data } = _buildRowData(args.recordIndexs[0])
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
  }, config.baseDomain)
}
const copyRow = (args: any) => {
  const { id, data } = _buildRowData(args.recordIndexs[0])
  console.debug('打开复制详情页', id, data)
  if (data.size != 0) {
    data.set(config.rowKey, null)
    config.modal.data = Object.fromEntries(data)
    config.modal.editRowIndex = args.recordIndexs[0]
  }
  openModal('add')
  args.hidePopup()
}
const closeModal = () => {
  config.modal.show = false
  config.modal.type = undefined
}
const openModal = (type: 'view' | 'add' | 'modify' | 'association' | undefined) => {
  config.modal.show = true
  config.modal.type = type
}
// endregion

// region 表格搜索

const getAdvancedCondition = () => {
  const queryCondition: QueryType = {
    condition: config.defaultCondition,
    currentPage: config.currentPage,
    pageSize: config.pageSize
  } as QueryType
  queryCondition.sortList = props.defaultSortColumn || config.defaultSort || []
  if (isNotEmpty(querySortMap)) {
    queryCondition.sortList = [...querySortMap.values()]
  }
  if (isNotEmpty(advancedCondition.condition) && isNotEmpty(advancedCondition.condition.conditionList)) {
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
  console.debug('queryConditionMap', queryConditionMap)
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
}

const getGeneralCondition = () => {
  const queryCondition: QueryType = {
    conditionList: config.defaultCondition.conditionList,
    sortList: [] as Array<QuerySortType>,
    currentPage: config.currentPage,
    pageSize: config.pageSize
  } as QueryType
  queryCondition.sortList = props.defaultSortColumn || config.defaultSort || []
  if (isNotEmpty(querySortMap)) {
    queryCondition.sortList = [...querySortMap.values()]
  }
  console.debug('queryConditionMap', queryConditionMap)
  if (isNotEmpty(queryConditionMap)) {
    if (isNotEmpty(queryCondition.conditionList)) {
      queryCondition.conditionList = [...queryCondition.conditionList, ...queryConditionMap.values()]
    } else {
      queryCondition.conditionList = [...queryConditionMap.values()]
    }
  }
  if (props.advanceCondition && isNotEmpty(props.advanceCondition)) {
    if (isNotEmpty(queryCondition.conditionList)) {
      queryCondition.conditionList = [...queryCondition.conditionList, ...props.advanceCondition.conditionList]
    } else {
      queryCondition.conditionList = [...props.advanceCondition.conditionList]
    }
  }

  return queryCondition
}
const queryConditionMap = reactive(new Map<String, ConditionListType>())
const querySortMap = reactive(new Map<String, QuerySortType>())
const initQueryCondition = () => {
  config.currentPage = 1
  config.pageSize = props.pageSize
  queryConditionMap.clear()
  querySortMap.clear()
}

const handleSearchConditionChanged = (selectedKeys: any, dataIndex: any, relation: any, filterStrict: boolean) => {
  console.log('handleSearchConditionChanged', selectedKeys, dataIndex, relation, filterStrict)
  if (isNotEmpty(selectedKeys)) {
    if (relation === FILTER_TYPE.BETWEEN && !filterStrict) {
      const conditionArray = [] as Array<ConditionListType>
      conditionArray.push(
        {
          property: dataIndex,
          value: [selectedKeys[0]],
          relation: FILTER_TYPE.GREATER
        } as ConditionListType,
        {
          property: dataIndex,
          value: [selectedKeys[1]],
          relation: FILTER_TYPE.LESS
        } as ConditionListType
      )
      queryConditionMap.set(dataIndex + '0', conditionArray[0])
      queryConditionMap.set(dataIndex + '1', conditionArray[1])
    } else {
      const condition = {} as ConditionListType
      condition.property = dataIndex
      condition.value = selectedKeys
      condition.relation = relation
      queryConditionMap.set(dataIndex as string, condition)
    }
  } else {
    queryConditionMap.delete(dataIndex as string)
    queryConditionMap.delete(dataIndex + '0' as string)
    queryConditionMap.delete(dataIndex + '1' as string)
  }
}

const onFilterDropdownOpenChange = (visible: boolean) => {
  if (!visible) {
    config.currentPage = 1
    queryData()
  }
}

const selectedRowKeys = ref<Array<string>>([])
const onSelectChange = (changedRowKeys: any) => {
  selectedRowKeys.value = changedRowKeys
  const selectedData = selectedRowKeys.value.map(key => {
    return dataSourceMap.value.get(key)
  })
  if (isListMode.value || isGridMode.value) {
    selectedListDataItem.value = selectedData || []
  }
  if (isNotEmpty(selectedRowKeys.value)) {
    config.deleteSelectedButtonShow = true
  } else {
    config.deleteSelectedButtonShow = false
  }
  console.debug('selectedRowKeys changed: ', changedRowKeys, selectedData)
  emit('selectedData', selectedData)
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
const handleRowDragEnd = () => {
  nextTick(() => {
    let updateOrderData: any = []
    dataSource.value.forEach((node: any, index: number) => {
      updateOrderData.push({
        id: node[config.rowKey],
        showOrder: (index + 1) + config.pageSize * (config.currentPage - 1)
      })
    })
    _updateOrder(updateOrderData)
  })
}

const handleColumnDragEnd = (arg: { column: ColumnType, targetColumn: ColumnType }) => {
  nextTick(async () => {
    const itemToMove = columnArray.value.find((item: ColumnType) => item.dataIndex === arg.column.dataIndex)
    if (!itemToMove) return
    const remainingItems = columnArray.value.filter((item: ColumnType) => item.dataIndex !== arg.column.dataIndex)
    remainingItems.splice(arg.targetColumn.order - 1, 0, itemToMove)
    remainingItems.forEach((item, index) => {
      item.order = index + 1
    })
    for (const column of columnArray.value) {
      column.tableId && await db.update('portalColumn', column)
    }
    columnArray.value.sort((a, b) => a.order - b.order)
  })
}

const handleColumnReset = async () => {
  await db.deleteByProperty('portalColumn', 'tableId', config.tableId)
  refresh()
}

const handleColumnChecked = async () => {
  for (const column of columnArray.value) {
    column.tableId && await db.update('portalColumn', column)
  }
}

const _updateOrder = (data: Array<UpdateOrderType>) => {
  updateOrder(config.url, data, config.baseDomain).then(() => queryData())
}

const handleExpand = (expanded: boolean, record: any) => emit('expand', expanded, record)

const advancedCondition = reactive({
  show: false,
  condition: {} as ConditionType,
  columnArray: [] as Array<any>,
  okText: '查询'
})
// endregion

//region 常用功能函数
const queryCondition = () => {
  let query: QueryType
  if (config.advancedSearchAble) {
    query = getAdvancedCondition()
  } else {
    query = getGeneralCondition()
  }
  if (isNotEmpty(props.selectColumnCondition)) {
    query = { ...query, selectColumnCondition: props.selectColumnCondition }
  }
  return query
}
const getConfig = () => {
  return config
}
const getData = () => {
  return dataSource.value
}
/**
 * 获取数据
 */
const allTextAreaColumnsNotEmpty = (record: DefaultRecordType) => {
  if (isNotEmpty(textAreaColumns.value)) {
    for (let checkColumn of textAreaColumns.value) {
      if (isNotEmpty(record[checkColumn.dataIndex])) {
        return true
      }
    }
  }
  return false
}
const queryData = () => {
  // 外部组件调用queryData接口 尚未完成初始化
  if (config.url) {
    const condition = queryCondition()
    if (config.treeMode) {
      queryTreeData()
    }
    if (config.summary && !config.plain) {
      getDataSummary(condition)
    }
    queryDataAsync(condition).then(data => {
      initData(data)
    })
  }

}
const initData = (data: Array<any>) => {
  dataSource.value = data || []
  parsedDataSource.value = []
  config.saveAllButtonShow = false
  for (let index in data) {
    const parsedData = _.cloneDeep(data[index])
    dataSourceMap.value.set(data[index][config.rowKey], data[index])
    columnArray.value.forEach((column: ColumnType) => {
      initCellData(Number(index), column.dataIndex, data[index][`${ column.dataIndex }`], data[index][`${ config.rowKey }`])
      parse(parsedData, Number(index), column, config)
    })
    parsedDataSource.value.push(parsedData)
  }
  onSelectChange([])
}
const queryDataAsync = async (condition: QueryType) => {
  const resolve = (res: any) => {
    config.total = res.payload.total
    const data = []
    for (let record of res.payload.records) {
      for (let dictColumn of dictColumnArray) {
        if (typeof record[`${ dictColumn.dataIndex }`] === 'number') {
          record[`${ dictColumn.dataIndex }`] = String(record[`${ dictColumn.dataIndex }`])
        }
      }
      if (config.rowKey === AUTO_UUID_ROW_KEY) {
        record[config.rowKey] = uuid()
      }
      data.push(record)
    }
    return data
  }
  if (config.plain) {
    return await data.value?.slice(
      (config.currentPage - 1) * config.pageSize,
      (config.currentPage - 1) * config.pageSize + config.pageSize
    ) || []
  } else {
    if (props.query) {
      return await props.query(config.url, condition).then(resolve)
    } else {
      if (config.advancedSearchAble) {
        return await advancedQuery(config.url, condition, config.baseDomain, true, showLoading.value).then(resolve)
      } else {
        return await generalQuery(config.url, condition, config.baseDomain, true, showLoading.value).then(resolve)
      }
    }
  }
}
const getDataSummary = async (condition: QueryType) => {
  if (config.advancedSearchAble) {
    return advancedSummary(config.url, condition, summaryColumns, config.baseDomain)
      .then((resp: any) => dataSummary.value = resp.payload)
  } else {
    return generalSummary(config.url, condition, summaryColumns, config.baseDomain)
      .then((resp: any) => dataSummary.value = resp.payload)
  }

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
  const downloadFunc = () => {
    if (config.plain) {
      let exportDataArray
      if (isNotEmpty(data.value)) {
        exportDataArray = []
        for (let index in data.value) {
          const parsedData = _.cloneDeep(data.value[Number(index)])
          columnArray.value.forEach((column: ColumnType) => {
            parse(parsedData, Number(index), column, config)
          })
          exportDataArray.push(parsedData)
        }
      } else {
        exportDataArray = [...parsedDataSource.value]
      }
      excelExport(exportDataArray, props.multiHeader ? multiHeadColumns.value : columns.value, columns.value, downloadFileName.value(config))
    } else {
      const resolve = (resp: any) => {
        const dataArray = resp.payload || []
        for (let index in dataArray) {
          columnArray.value.forEach((column: ColumnType) => {
            parse(dataArray[index], Number(index), column, config)
          })
        }
        excelExport(dataArray, multiHeadColumns.value, columns.value, downloadFileName.value(config))
      }
      if (config.advancedSearchAble) {
        advancedSelect(config.url, queryCondition(), config.baseDomain).then((resp: any) => resolve(resp))
      } else {
        generalSelect(config.url, queryCondition(), config.baseDomain).then((resp: any) => resolve(resp))
      }
    }
  }
  if (config.total > 1000) {
    Modal.confirm({
      title: '下载数据量过大',
      icon: createVNode(ExclamationCircleOutlined),
      content: createVNode('div', {}, '注意: 单次下载数量' + config.total + '条可能会失败, 请设置恰当条件'),
      okText: '取消',
      cancelText: '继续下载',
      onOk() {

      },
      onCancel() {
        downloadFunc()
      }
    })
  } else {
    downloadFunc()
  }

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
  await initConfig()
  watch(props, (value, old) => {
    if (value.readOnly != old.readOnly) {
      config.readOnly = value.readOnly
    }
    console.debug('propsChanged', value, old)
    config.pageSize = value.pageSize
    config.currentPage = value.currentPage
    queryData()
  })

  if (config.treeMode) {
    await queryTreeData()
  }
  _statisticButton.value = props.statisticButton
  const condition = queryCondition()
  if (config.summary && !config.plain) {
    await getDataSummary(condition)
  }
  return await queryDataAsync(condition)
}
const initConfig = async () => {
  return await getPortalConfig(config.tableId).then(async res => {
    dictColumnArray.length = 0
    columnArray.value.length = 0
    columnDisplayMap.value.clear()
    advancedCondition.columnArray = []
    summaryColumns.length = 0
    const index = _.cloneDeep(indexColumn)
    index.width = props.indexWidth
    index.minWidth = props.indexWidth
    index.maxWidth = props.indexWidth
    index.title = props.indexTitle
    columnArray.value.push(index)
    columnRaw.set(index.dataIndex, _.cloneDeep(index))
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
    if (data.value !== undefined) {
      config.plain = true
      config.readOnly = true
    }
    config.url = tableConfig.url
    config.summary = tableConfig.summary === '1'
    config.advancedSearchAble = tableConfig.advanced === '1' && props.advance
    config.advancedSearchButton = config.advancedSearchAble && props.advanceButton
    config.treeMode = isNotEmpty(tableConfig.pidColumn) && isEmpty(data.value)
    config.parentKey = tableConfig.pidColumn
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
      message.error('尚未配置id字段')
      throw new Error('尚未配置id字段')
    }
    if (tableConfig.defaultCondition && isEmpty(props.advanceCondition)) {
      config.defaultCondition = JSON.parse(tableConfig.defaultCondition)
    }
    if (tableConfig.defaultSort && isEmpty(props.defaultSortColumn)) {
      config.defaultSort = JSON.parse(tableConfig.defaultSort)
    }

    let promiseList = []
    // 第一位是标题栏
    const customerColumns = db.reflectToPrimaryKeyMap('portalColumn', await db.selectAll('portalColumn', 'order'))
    let order = 2
    for (let layout of tableConfig.columns) {
      const column = _.cloneDeep(defaultColumn)
      column.tableId = config.tableId
      column.title = layout.displayName
      column.dataIndex = layout.property
      column.dbField = layout.dbField
      column.key = layout.property
      if (layout.width !== 0) {
        column.width = layout.width || 140
      } else {
        column.minWidth = 140
      }
      column.fixed = layout.fixed === '1'
      column.fieldType = layout.fieldType
      column.referenceDict = layout.reference || layout.entity
      column.referenceEntityField = layout.entityField
      column.contentAlign = layout.align
      if (layout.filterAble === '1' && !config.plain) {
        column.customFilterDropdown = true
        column.onFilterDropdownOpenChange = onFilterDropdownOpenChange
        advancedCondition.columnArray.push(column)
      }
      column.sorter = layout.sortAble === '1' && !config.plain
      if (layout.summaryAble === '1') {
        summaryColumns.push(layout.property)
        column.summary = true
      }
      column.addShow = layout.addShow === '1'
      if (config.addModalAble && column.addShow) config.addModalAble = column.addShow
      column.editShow = layout.editShow === '1'
      if (config.editModalAble && column.editShow) config.editModalAble = column.editShow
      column.checked = layout.show === '1'
      column.displayGroupName = layout.displayGroupName
      column.detailShow = layout.detailShow === '1'
      column.detailSize = layout.detailSize
      column.detailPadding = layout.detailPadding
      column.addSize = layout.addSize
      column.addPadding = layout.addPadding
      column.addDisabled = layout.addDisabled === '1'
      column.editSize = layout.editSize
      column.editPadding = layout.editPadding
      column.editDisabled = layout.editDisabled === '1'
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
        if (column.fieldType === FIELD_TYPE.SELECT ||
          column.fieldType === FIELD_TYPE.TREE ||
          column.fieldType === FIELD_TYPE.SELECT_MULTI_IN_ONE ||
          column.fieldType === FIELD_TYPE.TREE_MULTI_IN_ONE) {
          dictColumnArray.push(column)
          let promise
          if (column.fieldType === FIELD_TYPE.SELECT ||
            column.fieldType === FIELD_TYPE.SELECT_MULTI_IN_ONE) {
            promise = dict.getDict(column.referenceDict).then((data: any) => column.referenceDictOption = data)
          } else {
            promise = treeDict.getTree(column.referenceDict).then((data: any) => column.referenceDictOption = data)
          }
          promiseList.push(promise)
        } else {
          column.entityCondition = JSON.parse(layout.entityCondition)
        }
      }
      if (column.dataIndex === config.nameKey) {
        titleColumn = column
      }

      if (layout.enable === '1') {
        // 本地库同步
        syncLocalDb(column, customerColumns, order++)
        columnArray.value.push(column)
        if (isEmpty(columnDisplayMap.value.get(column.displayGroupName))) {
          columnDisplayMap.value.set(column.displayGroupName, [])
        }
        columnDisplayMap.value.get(column.displayGroupName)?.push(column)
      }
      columnRaw.set(column.dataIndex, _.cloneDeep(column))
    }
    columnArray.value.sort((a, b) => a.order - b.order)
    if (config.rowKey === AUTO_UUID_ROW_KEY) {
      config.readOnly = true
      if (isNotEmpty(slots.action)) {
        const actionWidth = Number(props.actionWidth) ? Number(props.actionWidth) : actionColumn.width
        actionColumn.width = actionWidth
        actionColumn.minWidth = actionWidth
        actionColumn.maxWidth = actionWidth
        columnArray.value.push(actionColumn)
        columnRaw.set(actionColumn.dataIndex, _.cloneDeep(actionColumn))
      }
    } else {
      if (Number(props.actionWidth) > 0) {
        const actionWidth = Number(props.actionWidth) ? Number(props.actionWidth) : actionColumn.width
        actionColumn.width = actionWidth
        actionColumn.minWidth = actionWidth
        actionColumn.maxWidth = actionWidth
        columnArray.value.push(actionColumn)
        columnRaw.set(actionColumn.dataIndex, _.cloneDeep(actionColumn))
      }
    }

    // 首列支持拖拽
    columnArray.value[0].rowDrag = (tableConfig.tableDrag === '1' && config.orderMode) || props.rowDragEnd !== undefined

    // 关联配置
    if (isNotEmpty(tableConfig.associates) && isEmpty(bindTabs.value)) {
      for (let associate of tableConfig.associates) {
        const bind: PortalBindType = {} as PortalBindType
        bind.title = associate.title
        bind.tableId = associate.bindPortalName
        bind.bindType = associate.bindType
        if (isNotEmpty(associate.attachCondition)) {
          console.log(associate.attachCondition)
          bind.defaultAdvancedCondition = JSON.parse(associate.attachCondition)
        }
        bind.defaultSortColumn = [{
          property: associate.bindSortProperty,
          type: associate.bindSortType
        }]
        bind.treeMode = associate.treeMode === '1'
        bind.checkStrictly = associate.treeCheckStrict === '1'
        bind.bindFieldProperty = associate.bindProperty
        bindTabs.value.push(bind)
      }
    }
    console.log('init finish')
    config.key = config.key + 1
    console.debug(config, columnArray.value, columns.value, bindTabs.value)
    return await Promise.all(promiseList)
  })
}
const syncLocalDb = (column: ColumnType, customerColumns: Map<any, any>, order: number) => {
  if (customerColumns) {
    const customerColumn = customerColumns.get(db.getPrimaryKey('portalColumn', column))
    if (customerColumn) {
      column.order = customerColumn.order
      column.checked = customerColumn.checked
    } else {
      column.order = customerColumns.size + order
    }
  } else {
    column.order = order
  }
}
const queryTreeData = async () => {
  // 外部组件调用queryData接口 尚未完成初始化
  if (config.url) {
    await getTreeData(config.url, queryCondition(), config.baseDomain).then(res => {
      treeData.value = res.payload || []
      isNotEmpty(treeData.value) && props.showTree && showTreeMenu(true)
    })
  }
}
//endregion

onMounted(() => {
  window.addEventListener('resize', _updateTableSize)
  bus.on(PORTAL_RESIZE, _updateTableSize)
  init().then(data => initData(data))
})
watch(() => props.tableId, value => {
  config.tableId = value
  refresh()
})

watch(
  () => data.value,
  () => {
    config.total = data.value?.length || 0
    initData(data.value || [])
  }
)
watch(
  () => [columnDisplayCustom.value, columnArray.value],
  () => {
    columnArray.value.forEach((column: ColumnType) => {
      column.title = columnDisplayCustom.value.get(column.dataIndex) || columnRaw.get(column.dataIndex)?.title || column.title
    })
  },
  {
    deep: true
  }
)
watch(
  () => [hideAdd.value, hideEdit.value, hideDelete.value, hideRefresh.value],
  () => {
    config.hideRefresh = hideRefresh.value
    config.addModalAble = !hideAdd.value
    config.deleteAble = !hideDelete.value
    config.editModalAble = !hideEdit.value
  }
)
onUnmounted(() => {
  dataSource.value.length = 0
  parsedDataSource.value.length = 0
  dataSourceMap.value.clear()
  dataSummary.value = {}
  summaryColumns.length = 0
  modifyCellMap.clear()
  treeData.value.length = 0
  columnArray.value.length = 0
  columnDisplayMap.value.clear()
  columnRaw.clear()
  dictColumnArray.length = 0
  titleColumn = {} as ColumnType
  window.removeEventListener('resize', _updateTableSize)
  bus.off(PORTAL_RESIZE)
})

defineExpose({ queryData, queryTreeData, queryCondition, getRowSelection, getConfig, getData, handleMenuContextAdd, addRow })
</script>
<style lang="less" scoped>
// 主要容器样式
.portal-tree-wrapper {
  background: linear-gradient(145deg, #ffffff, #f8f9fa);
  border: 1px solid #e6e8eb;
  border-radius: 8px;
  box-sizing: border-box;
  overflow: auto;
  height: calc(100vh - 200px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.12);
  }
}

.portal-tree-bind-wrapper {
  background: linear-gradient(145deg, #ffffff, #f8f9fa);
  border: 1px solid #e6e8eb;
  border-radius: 12px;
  box-sizing: border-box;
  overflow: auto;
  height: calc(100vh - 150px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.12);
  margin: 10px 15px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1), 0 3px 10px rgba(0, 0, 0, 0.15);
  }
}

.root {
  height: calc(100% - 70px);
  display: flex;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  
  .menu-tree {
    width: 280px;
    background: linear-gradient(145deg, #ffffff, #f8f9fa);
    border: 1px solid #e6e8eb;
    border-radius: 12px;
    box-shadow: 0 3px 12px rgba(0, 0, 0, 0.08), 0 1px 6px rgba(0, 0, 0, 0.1);
    margin: 5px 0 5px 15px;
    position: relative;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    
    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 5px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.12);
    }

    .no-data {
      width: 100%;
      font-size: 16px;
      font-weight: 500;
      text-align: center;
      color: #64748b;
      padding: 40px 20px;
      letter-spacing: 0.5px;
    }

    .menu-category {
      font-size: 20px;
      font-weight: 600;
      text-align: center;
      padding: 16px 0;
      color: #1e293b;
      background: linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 100%);
      border-bottom: 2px solid #e2e8f0;
      letter-spacing: 0.5px;
    }
  }

  .portal-button-space {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 8px 20px 8px 15px;
    padding: 12px 16px;
    background: linear-gradient(145deg, #ffffff, #f8f9fa);
    border: 1px solid #e6e8eb;
    border-radius: 10px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  }

  .portal-table-space {
    position: relative;
    height: calc(100% - 70px);
    width: 100%;
    padding: 0 15px;

    .portal-table {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      width: 99%;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.08);
      border: 1px solid #e6e8eb;
    }
  }
}

// 分页样式优化
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: linear-gradient(145deg, #f8f9fa, #ffffff);
  border-top: 1px solid #e6e8eb;
  border-radius: 0 0 12px 12px;
}

// 表格主体样式
:deep(.surely-table-body-viewport-container) {
  min-height: 350px !important;
  background: #ffffff;
}

:deep(.surely-table-cell > .surely-table-cell-edit-wrapper > .surely-table-cell-edit-inner) {
  padding: 0 !important;
}

// 表头样式优化
.table-title-cell {
  display: flex;
  font-weight: 600;
  flex-direction: column;
  justify-content: center;
  color: #374151;
  font-size: 14px;
  letter-spacing: 0.3px;
}

:deep(.surely-table-header-cell) {
  font-weight: 600;
  background: #f8fafc !important;
  color: #374151 !important;
  border-bottom: 1px solid #e5e7eb !important;
  font-size: 14px;
  letter-spacing: 0.3px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  
  // 移除动画效果，保持静态样式
  &:hover {
    background: #f8fafc !important;
    transform: none;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }
}

// 单元格样式
:deep(.surely-table-cell) {
  font-size: 14px;
  color: #374151;
  border-right: 1px solid #f3f4f6;
  transition: all 0.2s ease;
}

// 过滤器样式
.filter-active {
  color: #3b82f6 !important;
  opacity: 1 !important;
  font-weight: 600;
}

// 弹出菜单样式优化
.menu-popup-container {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04);
  width: fit-content !important;
  min-width: 200px;
  max-height: 320px;
  overflow-y: auto;
  padding: 6px 0;
  backdrop-filter: blur(8px);
  
  // 微妙的立体感
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, #f1f5f9, transparent);
    opacity: 0.6;
  }
  
  // 滚动条优化
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
    
    &:hover {
      background: #94a3b8;
    }
  }
}

:deep(.surely-table-popup-container-inner) {
  width: 600px;
  height: 420px;
  border-radius: 12px;
  overflow: hidden;
}

:deep(.surely-table-popup-container) {
  background-color: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

.menu-popup {
  width: 100%;
  margin: 0;
  padding: 0;
  list-style: none;

  .menu-popup-item {
    width: 100%;
    padding: 10px 16px;
    font-size: 14px;
    color: #374151;
    font-weight: 500;
    line-height: 1.4;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 0;
    margin: 0;
    border-bottom: 1px solid #f1f5f9;
    position: relative;
    
    // 首个项目的特殊样式
    &:first-child {
      border-top-left-radius: 5px;
      border-top-right-radius: 5px;
    }
    
    // 最后一个项目的特殊样式
    &:last-child {
      border-bottom: none;
      border-bottom-left-radius: 5px;
      border-bottom-right-radius: 5px;
    }

    &:hover {
      background: #f8fafc;
      color: #1e40af;
      transform: none;
      
      // 微妙的左侧标识
      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        background: #3b82f6;
        opacity: 0.6;
        transition: all 0.2s ease;
      }
    }

    &.disabled {
      color: #9ca3af;
      cursor: not-allowed;
      opacity: 0.5;
      
      &:hover {
        background: transparent;
        color: #9ca3af;
        
        &::before {
          display: none;
        }
      }
    }
    
    // 复选框和按钮的对齐优化
    .ant-checkbox {
      margin-right: 8px;
      
      .ant-checkbox-inner {
        border-color: #d1d5db;
        
        &:hover {
          border-color: #3b82f6;
        }
      }
    }
    
    .ant-btn {
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      border-color: #d1d5db;
      
      &:hover {
        border-color: #3b82f6;
        color: #3b82f6;
      }
    }
  }
}

.surely-table-cell > .surely-table-cell-edit-wrapper > .surely-table-cell-edit-inner {
  padding: 4px !important;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
  transition: all 0.2s ease;
  
  &:focus-within {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
}

// 列表模式激活样式
.activate-item {
  background: linear-gradient(135deg, #dbeafe, #bfdbfe) !important;
  border-right: 4px solid #3b82f6;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
  transform: translateY(-1px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

// 滚动条美化
:deep(::-webkit-scrollbar) {
  width: 8px;
  height: 8px;
}

:deep(::-webkit-scrollbar-track) {
  background: #f1f5f9;
  border-radius: 4px;
}

:deep(::-webkit-scrollbar-thumb) {
  background: linear-gradient(135deg, #cbd5e1, #94a3b8);
  border-radius: 4px;
  transition: all 0.2s ease;
  
  &:hover {
    background: linear-gradient(135deg, #94a3b8, #64748b);
  }
}

// 加载状态美化
:deep(.ant-spin-container) {
  border-radius: 12px;
  overflow: hidden;
}

:deep(.ant-spin) {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
  border-radius: 12px;
}

// 空状态样式
:deep(.ant-empty) {
  padding: 40px 20px;
  
  .ant-empty-description {
    color: #64748b;
    font-size: 14px;
  }
}

.surely-table {
  // 使用组件自带的奇偶类名，更稳定可靠
  .surely-table-row-even,
  tbody tr.surely-table-row-even,
  .surely-table-body .surely-table-row-even {
    background-color: #f9fafb !important;
  }

  .surely-table-row-odd,
  tbody tr.surely-table-row-odd,
  .surely-table-body .surely-table-row-odd {
    background-color: #ffffff !important;
  }

  .surely-table-row-even:hover,
  tbody tr.surely-table-row-even:hover,
  .surely-table-body .surely-table-row-even:hover {
    background-color: #f3f4f6 !important;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .surely-table-row-odd:hover,
  tbody tr.surely-table-row-odd:hover,
  .surely-table-body .surely-table-row-odd:hover {
    background-color: #f8fafc !important;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
}
</style>
