<template>
  <div
    ref="root"
    class="root"
  >
    <!-- region 左侧表格筛选栏 -->
    <div
      class="table-list"
      style="border: 1px solid #d9d9d9; border-radius: 6px"
    >
      <!-- 搜索和操作区域 -->
      <div class="folder-header-controls">
        <a-select
          v-model:value="selectedRole"
          :options="roleDictList || []"
          show-search
          style="width: 100%; margin-bottom: 5px"
          @change="init().then(() => onSearch())"
        />
        <a-input-search
          v-model:value="inputTableName"
          enter-button
          placeholder="请输入表格名称"
          @search="onSearch"
          @input="onSearchInput"
        />
      </div>
      <!-- 可滚动的文件夹内容区域 -->
      <div class="folder-list-content">
        <!-- 渲染多层级文件夹结构 -->
        <!-- 未分组项目 -->
        <div
          v-if="folderStructure.items && folderStructure.items.length > 0"
          class="folder-group"
        >
          <div class="ungrouped-header">
            <FileTextOutlined class="folder-icon" />
            <span class="folder-title">未分组</span>
            <span class="folder-count">({{ folderStructure.items.length }})</span>
          </div>
          <div class="folder-content">
            <div
              v-for="item in folderStructure.items"
              :key="item.value"
              :class="{ 'activate-item': tableConfig.name === item.value }"
              class="table-item"
              @click="getTableConfigByName(item.value)"
            >
              <div
                class="item-content"
                style="padding-left: 25px;"
              >
                <!-- 与第一层级项目保持一致：25px -->
                <FileTextOutlined class="file-icon" />
                <a-dropdown
                  v-if="tableList.length !== 0"
                  :trigger="['contextmenu']"
                >
                  <span
                    :title="item.label"
                    class="item-label"
                    v-html="highlightSearchText(item.label)"
                  ></span>
                  <template
                    v-if="selectedRole === '0'"
                    #overlay
                  >
                    <a-menu>
                      <a-menu-item key="0">
                        <a-popconfirm
                          title="注意 即将恢复该配置到默认状态"
                          @confirm="refreshConfig(item.value)"
                        >
                          <a-button
                            shape="text"
                            size="small"
                          >
                            恢复
                            <template #icon>
                              <UndoOutlined />
                            </template>
                          </a-button>
                        </a-popconfirm>
                      </a-menu-item>
                      <a-menu-item key="1">
                        <a-button
                          shape="text"
                          size="small"
                          @click="openCopyConfigModal(item)"
                        >
                          复制
                          <template #icon>
                            <CopyOutlined />
                          </template>
                        </a-button>
                      </a-menu-item>
                      <a-menu-item key="2">
                        <a-popconfirm
                          title="注意 即将删除该配置"
                          @confirm="deleteConfig(item.value)"
                        >
                          <a-button
                            shape="text"
                            size="small"
                          >
                            删除
                            <template #icon>
                              <DeleteOutlined />
                            </template>
                          </a-button>
                        </a-popconfirm>
                      </a-menu-item>
                    </a-menu>
                  </template>
                </a-dropdown>
                <!-- 如果没有右键菜单权限，直接显示标签 -->
                <span
                  v-else
                  :title="item.label"
                  class="item-label"
                  v-html="highlightSearchText(item.label)"
                ></span>
              </div>
            </div>
          </div>
        </div>

        <!-- 嵌套文件夹 -->
        <div
          v-for="(folderData, folderKey) in getSortedFolders(folderStructure.children)"
          :key="folderKey"
        >
          <FolderComponent
            :depth="0"
            :folder-data="folderData"
            :folder-key="String(folderKey)"
            :expanded-folders="expandedFolders"
            :highlight-search-text="highlightSearchText"
            :get-total-item-count="getTotalItemCount"
            :get-sorted-folders="getSortedFolders"
            :toggle-folder="toggleFolder"
            :table-config="tableConfig"
            :table-list="tableList"
            :get-table-config-by-name="getTableConfigByName"
            :selected-role="selectedRole"
            @refresh-config="refreshConfig"
            @open-copy-modal="openCopyConfigModal"
            @delete-config="deleteConfig"
          />
        </div>
      </div> <!-- 结束 folder-list-content -->

      <!-- 底部操作按钮 -->
      <div class="folder-footer-controls">
        <!-- 清空配置按钮 -->
        <a-popconfirm
          v-if="selectedRole !== '0' && tableList.length > 0"
          title="注意清空该角色的所有配置, 该角色即将使用默认配置"
          @confirm="cleanPortalConfigByRole"
        >
          <a-button
            shape="round"
            style="margin-top: 5px; width: 160px"
          >
            清空
            <template #icon>
              <MinusCircleOutlined />
            </template>
          </a-button>
        </a-popconfirm>

        <!-- 初始化配置按钮 -->
        <a-dropdown v-if="selectedRole !== '0' && tableList.length === 0 && bindRoleDictList.length > 0">
          <template #overlay>
            <a-menu @click="handleMenuClick">
              <a-menu-item
                v-for="role in bindRoleDictList"
                :key="role.value"
              >
                <UserOutlined />
                {{ role.label }}
              </a-menu-item>
            </a-menu>
          </template>
          <a-button
            shape="round"
            style="margin-top: 5px; width: 160px"
          >
            初始化
            <template #icon>
              <ForkOutlined />
            </template>
          </a-button>
        </a-dropdown>

        <!-- 当没有可绑定角色时的提示 -->
        <div
          v-if="selectedRole !== '0' && tableList.length === 0 && bindRoleDictList.length === 0"
          style="margin-top: 5px; padding: 8px 12px; font-size: 12px; color: #999; text-align: center; border: 1px dashed #d9d9d9; border-radius: 6px;"
        >
          暂无可用配置
        </div>
      </div>
    </div>
    <!-- endregion -->
    <upload-file
      ref="uploadTableConfigRef"
      :upload="importTableConfig"
      @after-confirm="getTableConfigByName(tableConfig.name)"
    />
    <dialog-box
      v-model:visible="associateDialogBox.show"
      :title="tableConfig.displayName + '关联配置'"
      is-full
    >
      <portal
        :action-width="0"
        :advance-condition="{
          andOr: '0',
          conditionList: [
            {
              property: 'portalId',
              relation: FILTER_TYPE.EQUAL,
              value: [tableConfig.id],
            },
            {
              property: 'roleId',
              relation: FILTER_TYPE.EQUAL,
              value: [selectedRole],
            },
          ],
        }"
        :bind-default-value="{ portalId: tableConfig.id, roleId: selectedRole }"
        :default-sort-column="[{ property: 'displayOrder', type: 0 }]"
        table-id="SysPortalAssociate"
      />
    </dialog-box>
    <!-- region 右侧编辑栏 -->
    <div
      v-if="isNotEmpty(tableConfig.name)"
      class="table-config"
    >
      <!-- region 表格整体配置 -->
      <a-descriptions
        :column="11"
        bordered
        layout="vertical"
        size="small"
      >
        <template #title>
          <div style="display: flex">
            <div>{{ tableConfig.displayName }}</div>
            <ConsoleSqlOutlined
              style="
                font-size: 12px;
                color: #2a64a6;
                margin-left: 5px;
                margin-bottom: 5px;
                align-self: flex-end;
              "
              @click="onSqlShow"
            />
          </div>
        </template>
        <template #extra>
          <a-button
            style="margin-right: 10px"
            type="primary"
            @click="exportTableConfig()"
          >
            导出配置
          </a-button>
          <a-button
            style="margin-right: 10px"
            type="primary"
            @click="uploadTableConfig()"
          >
            导入配置
          </a-button>
          <a-button
            style="margin-right: 10px"
            type="primary"
            @click="associateTableConfig()"
          >
            关联配置
          </a-button>
          <a-button
            style="margin-right: 10px"
            type="primary"
            @click="publicDashboardModalShow = true"
          >
            通用图表
          </a-button>
          <a-button
            style="margin-right: 10px"
            type="primary"
            @click="indicatorModalShow = true"
          >
            统计指标
          </a-button>
          <a-button
            style="margin-right: 10px"
            type="primary"
            @click="saveTableConfig(false)"
          >
            保存
          </a-button>
        </template>
        <a-descriptions-item
          :span="2"
          label="表格编码"
        >
          <span style="width: 120px">{{ tableConfig.name }}</span>
        </a-descriptions-item>
        <a-descriptions-item
          style="width: 300px"
          :span="1"
          label="表格名称"
        >
          <a-input
            :value="tableConfig.displayName"
            placeholder="输入表格名称"
            @update:value="(v) => (tableConfig.displayName = v)"
          />
        </a-descriptions-item>
        <a-descriptions-item
          :span="1"
          label="编辑分栏"
        >
          <a-input-number
            :disabled="tableConfig.readOnly === '1'"
            :value="tableConfig.descriptionCount"
            max="32"
            min="1"
            style="width: 100px"
            @update:value="
              (v) => {
                tableConfig.descriptionCount = v;
                saveTableConfig();
              }
            "
          />
        </a-descriptions-item>
        <a-descriptions-item
          :span="1"
          label="详情弹框宽度"
        >
          <a-input-number
            :disabled="tableConfig.readOnly === '1'"
            :value="tableConfig.detailWidth"
            max="100"
            min="1"
            style="width: 80px"
            @update:value="
              (v) => {
                tableConfig.detailWidth = v;
                saveTableConfig();
              }
            "
          />
        </a-descriptions-item>
        <a-descriptions-item
          :span="1"
          label="新增弹框宽度"
        >
          <a-input-number
            :disabled="tableConfig.readOnly === '1'"
            :value="tableConfig.addWidth"
            max="100"
            min="1"
            style="width: 80px"
            @update:value="
              (v) => {
                tableConfig.addWidth = v;
                saveTableConfig();
              }
            "
          />
        </a-descriptions-item>
        <a-descriptions-item
          :span="1"
          label="编辑弹框宽度"
        >
          <a-input-number
            :disabled="tableConfig.readOnly === '1'"
            :value="tableConfig.editWidth"
            max="100"
            min="1"
            style="width: 80px"
            @update:value="
              (v) => {
                tableConfig.editWidth = v;
                saveTableConfig();
              }
            "
          />
        </a-descriptions-item>
        <a-descriptions-item
          :span="1"
          label="默认排序字段"
        >
          <div style="display: flex">
            <arrow-up-outlined
              v-if="tableConfig.sortType"
              @click="
                () => {
                  tableConfig.sortType = !tableConfig.sortType;
                  saveTableConfig();
                }
              "
            />
            <arrow-down-outlined
              v-else
              @click="
                () => {
                  tableConfig.sortType = !tableConfig.sortType;
                  saveTableConfig();
                }
              "
            />
            <a-select
              :bordered="false"
              :options="columnDict || []"
              :value="tableConfig.sortColumn"
              allow-clear
              style="width: 100px"
              @update:value="
                (v) => {
                  tableConfig.sortColumn = v;
                  saveTableConfig();
                }
              "
            />
          </div>
        </a-descriptions-item>

        <a-descriptions-item
          :span="1"
          label="总结栏"
        >
          <a-switch
            v-model:checked="tableConfig.summary"
            checked-value="1"
            style="width: 40px"
            un-checked-value="0"
            @change="saveTableConfig"
          />
        </a-descriptions-item>
        <a-descriptions-item
          style="width: 100px"
          :span="1"
          label="支持导入"
        >
          <a-switch
            v-model:checked="tableConfig.importAble"
            checked-value="1"
            style="width: 40px"
            un-checked-value="0"
            @change="saveTableConfig"
          />
        </a-descriptions-item>
        <a-descriptions-item
          style="width: 100px"
          :span="1"
          label="支持导出"
        >
          <a-switch
            v-model:checked="tableConfig.exportAble"
            checked-value="1"
            style="width: 40px"
            un-checked-value="0"
            @change="saveTableConfig"
          />
        </a-descriptions-item>
        <a-descriptions-item
          :span="1"
          label="表格大小"
        >
          <a-select
            :bordered="false"
            :options="tableSizeDict || []"
            :value="tableConfig.size"
            style="width: 60px"
            @update:value="
              (v) => {
                tableConfig.size = v;
                saveTableConfig();
              }
            "
          />
        </a-descriptions-item>
        <a-descriptions-item
          :span="1"
          label="只读"
        >
          <a-switch
            v-model:checked="tableConfig.readOnly"
            checked-value="1"
            style="width: 40px"
            un-checked-value="0"
            @change="saveTableConfig"
          />
        </a-descriptions-item>
        <a-descriptions-item
          :span="1"
          label="接口地址"
        >
          <a-input
            :value="tableConfig.url"
            placeholder="输入接口地址"
            @update:value="(v) => (tableConfig.url = v)"
          />
        </a-descriptions-item>
        <a-descriptions-item
          :span="1"
          label="id字段"
        >
          <a-select
            :bordered="false"
            :options="[{ value: AUTO_UUID_ROW_KEY, label: '自动生成ID' }, ...columnDict]"
            :value="tableConfig.idColumn"
            style="width: 100px"
            @update:value="
              (v) => {
                tableConfig.idColumn = v;
                saveTableConfig();
              }
            "
          />
        </a-descriptions-item>
        <a-descriptions-item
          :span="1"
          label="名称字段"
        >
          <a-select
            :bordered="false"
            :options="columnDict || []"
            :value="tableConfig.nameColumn"
            style="width: 100px"
            @update:value="
              (v) => {
                tableConfig.nameColumn = v;
                saveTableConfig();
              }
            "
          />
        </a-descriptions-item>
        <a-descriptions-item
          :span="1"
          label="顺序字段"
        >
          <a-select
            :bordered="false"
            :options="columnDict || []"
            :value="tableConfig.orderColumn"
            allow-clear
            style="width: 100px"
            @update:value="
              (v) => {
                tableConfig.orderColumn = v;
                saveTableConfig();
              }
            "
          />
        </a-descriptions-item>
        <a-descriptions-item
          :span="1"
          label="父id字段"
        >
          <a-select
            :bordered="false"
            :options="columnDict || []"
            :value="tableConfig.pidColumn"
            allow-clear
            style="width: 100px"
            @update:value="
              (v) => {
                tableConfig.pidColumn = v;
                saveTableConfig();
              }
            "
          />
        </a-descriptions-item>
        <a-descriptions-item
          :span="1"
          label="默认查询条件"
        >
          <div style="display: flex; align-items: center; gap: 3px;">
            <delete-outlined
              v-if="tableConfig.defaultCondition !== null"
              @click="cleanDefaultCondition"
            />
            <a-button
              :type="tableConfig.defaultCondition !== null ? 'link' : 'dashed'"
              @click="defaultCondition.show = true"
            >
              默认筛选条件
            </a-button>
          </div>
        </a-descriptions-item>
        <a-descriptions-item
          style="width: 100px"
          :span="1"
          label="表格拖拽"
        >
          <a-switch
            v-model:checked="tableConfig.tableDrag"
            :disabled="isEmpty(tableConfig.orderColumn)"
            checked-value="1"
            style="width: 40px"
            un-checked-value="0"
            @change="saveTableConfig"
          />
        </a-descriptions-item>
        <a-descriptions-item
          :span="1"
          label="树形拖拽"
        >
          <a-switch
            v-model:checked="tableConfig.treeDrag"
            :disabled="isEmpty(tableConfig.pidColumn)"
            checked-value="1"
            style="width: 40px"
            un-checked-value="0"
            @change="saveTableConfig"
          />
        </a-descriptions-item>
        <a-descriptions-item
          :span="1"
          label="高级查询"
        >
          <a-switch
            v-model:checked="tableConfig.advanced"
            checked-value="1"
            style="width: 40px"
            un-checked-value="0"
            @change="saveTableConfig"
          />
        </a-descriptions-item>
      </a-descriptions>
      <!-- endregion 表格整体配置 -->
      <!-- region 表格字段 -->
      <div style="display: flex">
        <!-- region 表格字段筛选栏 -->
        <s-table
          :columns="[
            {
              title: '字段列表(拖动调整顺序)',
              align: 'center',
              dataIndex: 'displayName',
              tooltip: { placement: 'left', mouseEnterDelay: 1 },
              rowDrag: !columnFiltered,
              showMenu: true,
            },
          ]"
          :data-source="fieldRecords"
          :pagination="false"
          :scroll="{ y: getTableHeight() }"
          bordered
          deep-watch-data-source
          range-selection="single"
          row-key="id"
          size="small"
          style="width: 220px"
          @cell-click="handleColumnSelected"
          @row-drag-end="handleColumnOrderChanged"
        >
          <template #bodyCell="{ column, record }">
            <div
              :style="{
                textAlign: column.contentAlign || 'left',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                height: '100%',
              }"
            >
              {{ strRemoveLF(record[`${column.dataIndex}`]) }}
            </div>
          </template>
          <template #tooltipTitle="{ value }">
            <div v-html="strLF2HtmlLF(value)"></div>
          </template>
          <template #menuIcon="{ filtered }">
            <filter-outlined :class="filtered && 'filter-active'" />
          </template>
          <template
            #menuPopup="{
              column,
              hidePopup,
              filter: { setSelectedKeys, selectedKeysRef, confirm, clearFilters },
            }"
          >
            <div
              style="
                background-color: white;
                height: 80px;
                width: fit-content;
                padding: 8px 16px 8px 16px;
              "
            >
              <a-select
                :get-popup-container="(triggerNode) => triggerNode.parentNode"
                :options="[
                  { label: '有效', value: 'enable' },
                  { label: '表格显示', value: 'show' },
                  { label: '详情显示', value: 'detailShow' },
                  { label: '新增显示', value: 'addShow' },
                  { label: '编辑显示', value: 'editShow' },
                ]"
                :placeholder="`查看类型`"
                :show-search="false"
                :value="selectedKeysRef.value"
                clearable
                style="width: 188px; margin-bottom: 8px; display: block"
                @select="
                  (e) => {
                    const selectedKey = e ? e : '';
                    setSelectedKeys(selectedKey);
                    handleColumnFilter(
                      selectedKey,
                      confirm,
                      column.key,
                      hidePopup,
                      column,
                      clearFilters
                    );
                  }
                "
              />
              <a-button
                style="width: 100%"
                type="primary"
                @click="
                  handleColumnFilter(
                    '',
                    confirm,
                    column.key,
                    hidePopup,
                    column,
                    clearFilters
                  )
                "
              >
                显示全部
              </a-button>
            </div>
          </template>
          <template #contextmenuPopup="args">
            <ul class="popup">
              <li
                class="popup-item"
                @click="setOrderToTop(args)"
              >
                <vertical-align-top-outlined />
                置顶
              </li>
              <li
                class="popup-item"
                @click="setOrderToBottom(args)"
              >
                <vertical-align-bottom-outlined />
                置底
              </li>
            </ul>
          </template>
        </s-table>
        <!-- endregion -->
        <!-- region 表格字段编辑栏 -->
        <div
          v-if="selectedColumnId !== ''"
          style="width: 100%; margin-top: 5px; margin-left: 10px"
        >
          <a-descriptions
            :column="8"
            :title="'基础信息: ' +
              strRemoveLF(columnMap.get(selectedColumnId).displayName) +
              '(' +
              columnMap.get(selectedColumnId).property +
              ')'
            "
            bordered
            layout="vertical"
            size="small"
          >
            <template #extra>
              <a-dropdown>
                <template #overlay>
                  <a-menu @click="({ key: menuKey }) => quickConfig(columnMap.get(selectedColumnId), menuKey)">
                    <a-menu-item key="displayNone">
                      不显示
                    </a-menu-item>
                    <a-menu-item key="displaySearchSort">
                      显示/筛选/排序
                    </a-menu-item>
                    <a-menu-item key="displaySearch">
                      显示/筛选
                    </a-menu-item>
                    <a-menu-item key="displayNoAction">
                      只显示
                    </a-menu-item>
                    <a-menu-item key="displayTableOnly">
                      表格显示
                    </a-menu-item>
                    <a-menu-item key="displayDetailOnly">
                      详情显示
                    </a-menu-item>
                    <a-menu-item key="displayTableAndDetail">
                      不参与编辑
                    </a-menu-item>
                  </a-menu>
                </template>
                <a-button
                  style="margin-right: 5px"
                  type="link"
                >
                  常用配置
                </a-button>
              </a-dropdown>
              <a-button
                style="margin-right: 10px"
                type="primary"
                @click="saveTableColumn(false)"
              >
                保存
              </a-button>
            </template>
            <!-- region 字段基础信息 -->
            <a-descriptions-item
              :span="1"
              label="是否有效"
            >
              <a-switch
                v-model:checked="columnMap.get(selectedColumnId).enable"
                checked-value="1"
                un-checked-value="0"
                @change="saveTableColumn"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="字段名称"
            >
              <a-input
                :value="columnMap.get(selectedColumnId).displayName"
                placeholder="输入字段名称"
                @update:value="(v) => (columnMap.get(selectedColumnId).displayName = v)"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="字段类型"
            >
              <a-select
                :bordered="false"
                :options="fieldTypeDict || []"
                :value="columnMap.get(selectedColumnId).fieldType"
                style="width: 120px"
                @update:value="
                  (v) => {
                    if (columnMap.get(selectedColumnId).fieldType !== v) {
                      if (v === FIELD_TYPE.MONEY) {
                        columnMap.get(selectedColumnId).reference = '2,10000';
                      } else {
                        columnMap.get(selectedColumnId).reference = null;
                      }
                      columnMap.get(selectedColumnId).dbField = null;
                    }
                    columnMap.get(selectedColumnId).fieldType = v;
                    saveTableColumn();
                  }
                "
              />
            </a-descriptions-item>
            <a-descriptions-item
              v-if="columnMap.get(selectedColumnId).fieldType === FIELD_TYPE.MONEY"
              :span="1"
              label="显示格式(精度,单位)"
            >
              <a-input
                :value="columnMap.get(selectedColumnId).reference"
                placeholder="显示格式(精度,单位)"
                @update:value="(v) => (columnMap.get(selectedColumnId).reference = v)"
              />
            </a-descriptions-item>
            <a-descriptions-item
              v-if="columnMap.get(selectedColumnId).fieldType === FIELD_TYPE.PERCENT"
              :span="1"
              label="显示格式(精度,单位)"
            >
              <a-input
                :value="columnMap.get(selectedColumnId).reference"
                placeholder="显示格式(精度,单位)"
                @update:value="(v) => (columnMap.get(selectedColumnId).reference = v)"
              />
            </a-descriptions-item>
            <a-descriptions-item
              v-if="columnMap.get(selectedColumnId).fieldType === FIELD_TYPE.IMAGE"
              :span="1"
              label="显示样式(宽,高)"
            >
              <a-input
                :value="columnMap.get(selectedColumnId).reference"
                placeholder="显示样式(宽,高)"
                @update:value="(v) => (columnMap.get(selectedColumnId).reference = v)"
              />
            </a-descriptions-item>
            <a-descriptions-item
              v-if="
                columnMap.get(selectedColumnId).fieldType === FIELD_TYPE.SELECT ||
                  columnMap.get(selectedColumnId).fieldType === FIELD_TYPE.ENTITY ||
                  columnMap.get(selectedColumnId).fieldType ===
                  FIELD_TYPE.ENTITY_CONDITION ||
                  columnMap.get(selectedColumnId).fieldType === FIELD_TYPE.TREE ||
                  columnMap.get(selectedColumnId).fieldType ===
                  FIELD_TYPE.SELECT_MULTI_IN_ONE ||
                  columnMap.get(selectedColumnId).fieldType === FIELD_TYPE.TREE_MULTI_IN_ONE
              "
              :span="1"
              label="相关引用"
            >
              <a-select
                v-if="
                  columnMap.get(selectedColumnId).fieldType === FIELD_TYPE.SELECT ||
                    columnMap.get(selectedColumnId).fieldType === FIELD_TYPE.TREE ||
                    columnMap.get(selectedColumnId).fieldType ===
                    FIELD_TYPE.SELECT_MULTI_IN_ONE ||
                    columnMap.get(selectedColumnId).fieldType ===
                    FIELD_TYPE.TREE_MULTI_IN_ONE
                "
                :filter-option="filterOption"
                :options="columnMap.get(selectedColumnId).fieldType === FIELD_TYPE.SELECT ||
                  columnMap.get(selectedColumnId).fieldType ===
                  FIELD_TYPE.SELECT_MULTI_IN_ONE
                  ? sysDictList
                  : sysTreeDictList
                "
                :value="columnMap.get(selectedColumnId).reference"
                placeholder="输入相关引用名称"
                show-search
                style="width: 150px"
                @update:value="
                  (v) => {
                    columnMap.get(selectedColumnId).reference = v;
                    saveTableColumn();
                  }
                "
              />
              <a-select
                v-else-if="
                  columnMap.get(selectedColumnId).fieldType === FIELD_TYPE.ENTITY
                "
                :filter-option="filterOption"
                :options="tableList"
                :value="columnMap.get(selectedColumnId).reference"
                placeholder="输入相关引用名称"
                show-search
                style="width: 150px"
                @update:value="
                  (v) => {
                    if (columnMap.get(selectedColumnId).reference !== v) {
                      columnMap.get(selectedColumnId).dbField = null;
                      columnMap.get(selectedColumnId).entityField = null;
                    }
                    getEntityConfig(v);
                    columnMap.get(selectedColumnId).reference = v;
                    saveTableColumn();
                  }
                "
              />
              <a-select
                v-else-if="
                  columnMap.get(selectedColumnId).fieldType ===
                    FIELD_TYPE.ENTITY_CONDITION
                "
                :filter-option="filterOption"
                :options="tableList"
                :value="columnMap.get(selectedColumnId).reference"
                placeholder="输入存放实体名称字段"
                show-search
                style="width: 150px"
                @update:value="
                  (v) => {
                    if (columnMap.get(selectedColumnId).reference !== v) {
                      columnMap.get(selectedColumnId).dbField = null;
                      columnMap.get(selectedColumnId).entityField = null;
                    }
                    columnMap.get(selectedColumnId).reference = v;
                    saveTableColumn();
                  }
                "
              />
            </a-descriptions-item>
            <a-descriptions-item
              v-else
              :span="1"
              label=""
            />
            <template v-if="columnMap.get(selectedColumnId).fieldType === FIELD_TYPE.ENTITY">
              <a-descriptions-item
                v-if="columnMap.get(selectedColumnId).fieldType === FIELD_TYPE.ENTITY"
                :span="2"
                label="引用实体字段"
              >
                <a-select
                  :options="entityColumnDict"
                  :value="columnMap.get(selectedColumnId).entityField"
                  style="width: 150px"
                  @update:value="
                    (v) => {
                      columnMap.get(selectedColumnId).entityField = v;
                      saveTableColumn();
                    }
                  "
                />
              </a-descriptions-item>
              <a-descriptions-item
                v-if="columnMap.get(selectedColumnId).fieldType === FIELD_TYPE.ENTITY"
                :span="1"
                label="本体操作字段"
              >
                <a-select
                  :filter-option="filterOption"
                  :options="columnDict"
                  :value="columnMap.get(selectedColumnId).dbField"
                  show-search
                  style="width: 150px"
                  @update:value="
                    (v) => {
                      columnMap.get(selectedColumnId).dbField = v;
                      saveTableColumn();
                    }
                  "
                />
              </a-descriptions-item>
              <a-descriptions-item
                v-if="columnMap.get(selectedColumnId).fieldType === FIELD_TYPE.ENTITY"
                :span="1"
                label="关联参数"
              >
                <a-button
                  type="link"
                  @click="entityConditionDrawOpen"
                >
                  设置条件
                </a-button>
              </a-descriptions-item>
            </template>
            <template
              v-if="
                columnMap.get(selectedColumnId).fieldType === FIELD_TYPE.SELECT &&
                  columnMap.get(selectedColumnId).mobileDisplayType === '3'
              "
            >
              <a-descriptions-item
                :span="2"
                label="徽标颜色"
              >
                <a-input
                  :value="columnMap.get(selectedColumnId).entityField"
                  placeholder="按选项顺序(逗号隔开)"
                  @update:value="(v) => (columnMap.get(selectedColumnId).entityField = v)"
                />
              </a-descriptions-item>
            </template>
          </a-descriptions>
          <!-- endregion -->
          <!-- region 表格显示 -->
          <a-descriptions
            :column="10"
            :title="'表格显示'"
            bordered
            layout="vertical"
            size="small"
            style="margin-top: 10px"
          >
            <a-descriptions-item
              :span="1"
              label="是否显示"
            >
              <a-switch
                v-model:checked="columnMap.get(selectedColumnId).show"
                :disabled="columnMap.get(selectedColumnId).enable !== '1'"
                checked-value="1"
                un-checked-value="0"
                @change="saveTableColumn"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="内容宽度（px）"
            >
              <a-input-number
                :disabled="columnMap.get(selectedColumnId).enable !== '1' ||
                  columnMap.get(selectedColumnId).show !== '1'
                "
                :value="columnMap.get(selectedColumnId).width"
                max="1000"
                min="0"
                placeholder="内容宽度 0为自动"
                style="width: 100px"
                @update:value="(v) => (columnMap.get(selectedColumnId).width = v)"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="移动端显示"
            >
              <a-select
                :bordered="false"
                :disabled="columnMap.get(selectedColumnId).enable !== '1' ||
                  columnMap.get(selectedColumnId).show !== '1'
                "
                :options="mobileDisplayTypeDict || []"
                :value="columnMap.get(selectedColumnId).mobileDisplayType"
                style="width: 100px"
                @update:value="
                  (v) => {
                    columnMap.get(selectedColumnId).mobileDisplayType = v;
                    saveTableColumn();
                  }
                "
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="对齐方式"
            >
              <a-select
                :bordered="false"
                :disabled="columnMap.get(selectedColumnId).enable !== '1' ||
                  columnMap.get(selectedColumnId).show !== '1'
                "
                :options="alignDict || []"
                :value="columnMap.get(selectedColumnId).align"
                style="width: 100px"
                @update:value="
                  (v) => {
                    columnMap.get(selectedColumnId).align = v;
                    saveTableColumn();
                  }
                "
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="表格冻结列"
            >
              <a-switch
                v-model:checked="columnMap.get(selectedColumnId).fixed"
                :disabled="columnMap.get(selectedColumnId).enable !== '1' ||
                  columnMap.get(selectedColumnId).show !== '1'
                "
                checked-value="1"
                un-checked-value="0"
                @change="saveTableColumn"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="是否显示提示"
            >
              <a-switch
                v-model:checked="columnMap.get(selectedColumnId).tooltip"
                :disabled="columnMap.get(selectedColumnId).enable !== '1' ||
                  columnMap.get(selectedColumnId).show !== '1'
                "
                checked-value="1"
                un-checked-value="0"
                @change="saveTableColumn"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="是否筛选"
            >
              <a-switch
                v-model:checked="columnMap.get(selectedColumnId).filterAble"
                :disabled="columnMap.get(selectedColumnId).enable !== '1' ||
                  columnMap.get(selectedColumnId).show !== '1'
                "
                checked-value="1"
                un-checked-value="0"
                @change="saveTableColumn"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="是否排序"
            >
              <a-switch
                v-model:checked="columnMap.get(selectedColumnId).sortAble"
                :disabled="columnMap.get(selectedColumnId).enable !== '1' ||
                  columnMap.get(selectedColumnId).show !== '1'
                "
                checked-value="1"
                un-checked-value="0"
                @change="saveTableColumn"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="汇总"
            >
              <a-switch
                v-model:checked="columnMap.get(selectedColumnId).summaryAble"
                :disabled="columnMap.get(selectedColumnId).enable !== '1'"
                checked-value="1"
                un-checked-value="0"
                @change="saveTableColumn"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="表格编辑"
            >
              <a-switch
                v-model:checked="columnMap.get(selectedColumnId).editAble"
                :disabled="columnMap.get(selectedColumnId).enable !== '1' ||
                  columnMap.get(selectedColumnId).show !== '1'
                "
                checked-value="1"
                un-checked-value="0"
                @change="saveTableColumn"
              />
            </a-descriptions-item>
          </a-descriptions>
          <!-- endregion -->
          <!-- region 弹框显示 -->
          <a-descriptions
            :column="5"
            :title="'弹框显示'"
            bordered
            layout="vertical"
            size="small"
            style="margin-top: 10px"
          >
            <template #extra>
              <a-input
                :disabled="columnMap.get(selectedColumnId).enable !== '1'"
                :value="columnMap.get(selectedColumnId).displayGroupName"
                placeholder="输入分组名称"
                @update:value="
                  (v) => (columnMap.get(selectedColumnId).displayGroupName = v)
                "
              />
            </template>
            <a-descriptions-item
              :span="1"
              label="详情显示"
            >
              <a-switch
                v-model:checked="columnMap.get(selectedColumnId).detailShow"
                :disabled="columnMap.get(selectedColumnId).enable !== '1'"
                checked-value="1"
                un-checked-value="0"
                @change="saveTableColumn"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="详情显示格数"
            >
              <a-input-number
                :disabled="columnMap.get(selectedColumnId).enable !== '1' ||
                  columnMap.get(selectedColumnId).detailShow !== '1'
                "
                :value="columnMap.get(selectedColumnId).detailSize"
                max="32"
                min="1"
                placeholder="详情显示格数"
                style="width: 80px"
                @update:value="(v) => (columnMap.get(selectedColumnId).detailSize = v)"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="详情占位格数"
            >
              <a-input-number
                :disabled="columnMap.get(selectedColumnId).enable !== '1' ||
                  columnMap.get(selectedColumnId).detailShow !== '1'
                "
                :max="tableConfig.descriptionCount"
                :value="columnMap.get(selectedColumnId).detailPadding"
                min="0"
                placeholder="详情占位宽度"
                style="width: 80px"
                @update:value="(v) => (columnMap.get(selectedColumnId).detailPadding = v)"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="是否必填"
            >
              <a-switch
                v-model:checked="columnMap.get(selectedColumnId).required"
                :disabled="columnMap.get(selectedColumnId).enable !== '1' ||
                  (columnMap.get(selectedColumnId).editAble !== '1' &&
                    columnMap.get(selectedColumnId).addShow !== '1')
                "
                checked-value="1"
                un-checked-value="0"
                @change="saveTableColumn"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="默认值"
            >
              <a-input
                :disabled="columnMap.get(selectedColumnId).enable !== '1'"
                :value="columnMap.get(selectedColumnId).defaultValue"
                placeholder="默认值"
                @update:value="(v) => (columnMap.get(selectedColumnId).defaultValue = v)"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="编辑显示"
            >
              <a-switch
                v-model:checked="columnMap.get(selectedColumnId).editShow"
                :disabled="columnMap.get(selectedColumnId).enable !== '1'"
                checked-value="1"
                un-checked-value="0"
                @change="saveTableColumn"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="编辑显示格数"
            >
              <a-input-number
                :disabled="columnMap.get(selectedColumnId).editShow !== '1' ||
                  columnMap.get(selectedColumnId).enable !== '1'
                "
                :max="tableConfig.descriptionCount"
                :value="columnMap.get(selectedColumnId).editSize"
                min="1"
                placeholder="编辑显示格数"
                style="width: 80px"
                @update:value="(v) => (columnMap.get(selectedColumnId).editSize = v)"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="编辑占位格数"
            >
              <a-input-number
                :disabled="columnMap.get(selectedColumnId).editShow !== '1' ||
                  columnMap.get(selectedColumnId).enable !== '1'
                "
                :max="tableConfig.descriptionCount"
                :value="columnMap.get(selectedColumnId).editPadding"
                min="0"
                placeholder="编辑占位宽度"
                style="width: 80px"
                @update:value="(v) => (columnMap.get(selectedColumnId).editPadding = v)"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="编辑锁定"
            >
              <a-switch
                v-model:checked="columnMap.get(selectedColumnId).editDisabled"
                :disabled="columnMap.get(selectedColumnId).editShow !== '1' ||
                  columnMap.get(selectedColumnId).enable !== '1'
                "
                checked-value="1"
                un-checked-value="0"
                @change="saveTableColumn"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="最小值(最小长度)"
            >
              <a-input
                :disabled="columnMap.get(selectedColumnId).enable !== '1'"
                :value="columnMap.get(selectedColumnId).min"
                placeholder="输入最小值(最小长度)"
                @update:value="(v) => (columnMap.get(selectedColumnId).min = v)"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="新增显示"
            >
              <a-switch
                v-model:checked="columnMap.get(selectedColumnId).addShow"
                :disabled="columnMap.get(selectedColumnId).enable !== '1'"
                checked-value="1"
                un-checked-value="0"
                @change="saveTableColumn"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="新增显示格数"
            >
              <a-input-number
                :disabled="columnMap.get(selectedColumnId).addShow !== '1' ||
                  columnMap.get(selectedColumnId).enable !== '1'
                "
                :max="tableConfig.descriptionCount"
                :value="columnMap.get(selectedColumnId).addSize"
                min="1"
                placeholder="新增显示格数"
                style="width: 80px"
                @update:value="(v) => (columnMap.get(selectedColumnId).addSize = v)"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="新增占位格数"
            >
              <a-input-number
                :disabled="columnMap.get(selectedColumnId).addShow !== '1' ||
                  columnMap.get(selectedColumnId).enable !== '1'
                "
                :max="tableConfig.descriptionCount"
                :value="columnMap.get(selectedColumnId).addPadding"
                min="0"
                placeholder="新增占位宽度"
                style="width: 80px"
                @update:value="(v) => (columnMap.get(selectedColumnId).addPadding = v)"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="新增锁定"
            >
              <a-switch
                v-model:checked="columnMap.get(selectedColumnId).addDisabled"
                :disabled="columnMap.get(selectedColumnId).addShow !== '1' ||
                  columnMap.get(selectedColumnId).enable !== '1'
                "
                checked-value="1"
                un-checked-value="0"
                @change="saveTableColumn"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="最大值(最大长度)"
            >
              <a-input
                :disabled="columnMap.get(selectedColumnId).enable !== '1'"
                :value="columnMap.get(selectedColumnId).max"
                placeholder="输入最大值(最大长度)"
                @update:value="(v) => (columnMap.get(selectedColumnId).max = v)"
              />
            </a-descriptions-item>
            <!-- endregion -->
          </a-descriptions>
        </div>
        <!-- endregion -->
      </div>
      <!-- endregion -->
    </div>
    <!-- endregion 右侧编辑栏 -->
    <!-- region 复制配置 -->
    <a-modal
      v-model:open="copyConfigModal.visible"
      :title="copyConfigModal.title"
      centered
      @ok="copyConfig"
    >
      <a-form
        ref="copyConfigModalRef"
        :model="copyConfigModal"
      >
        <a-form-item
          :rules="[
            { required: true, message: '请输入表格编号' },
            { validator: checkConfigIdExisted, trigger: 'blur' },
          ]"
          has-feedback
          label="表格配置代码"
          name="configId"
        >
          <a-input
            v-model:value="copyConfigModal.configId"
            autocomplete="off"
            placeholder="表格配置代码"
          />
        </a-form-item>
        <a-form-item
          :rules="[{ required: true, message: '请输入表格名称' }]"
          has-feedback
          label="表格配置名称"
          name="configDescription"
        >
          <a-input
            v-model:value="copyConfigModal.configDescription"
            autocomplete="off"
            placeholder="表格配置名称"
          />
        </a-form-item>
      </a-form>
    </a-modal>
    <!-- endregion -->
    <!-- region 关联实体查询条件 -->
    <portal-advanced-search-modal
      :advanced-condition="entityCondition"
      @confirm="saveEntityCondition"
    />
    <!-- endregion 关联实体查询条件 -->
    <portal-advanced-search-modal
      :advanced-condition="defaultCondition"
      @confirm="saveDefaultCondition"
    />
    <sql-draw
      v-model:show="showSql"
      :sql="sqlData"
    />
    <indicator-modal
      v-model:show="indicatorModalShow"
      :config="tableConfig"
      :dict="entityColumnDict"
    />
    <!-- 通用图表弹窗 -->
    <a-modal
      v-model:open="publicDashboardModalShow"
      width="99vw"
      :style="{ top: '0px', maxWidth: '99vw' }"
      :body-style="{ padding: '0' }"
      :footer="null"
      :closable="true"
      :mask-closable="false"
      wrap-class-name="fullscreen-modal"
    >
      <template #title>
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; height: 100%;">
          <span style="line-height: 1;">通用图表</span>
          <div style="display: flex; gap: 10px; margin-right: 30px;">
            <a-button
              type="primary"
              size="middle"
              :loading="publicDashboardRefreshing"
              style="display: flex; align-items: center; justify-content: center;"
              @click="handlePublicDashboardRefreshDataOnly"
            >
              <template #icon>
                <ReloadOutlined />
              </template>
              刷新数据
            </a-button>
            <a-button
              size="middle"
              :loading="publicDashboardRearranging"
              style="display: flex; align-items: center; justify-content: center;"
              @click="handlePublicDashboardRearrange"
            >
              <template #icon>
                <AppstoreOutlined />
              </template>
              重新排列
            </a-button>
          </div>
        </div>
      </template>
      <public-dashboard
        v-if="publicDashboardModalShow"
        ref="publicDashboardRef"
        :table-id="tableConfig.name"
        :show-header="false"
        :show-personal-indicators="false"
        :use-common-dashboard="true"
        :common-indicator-permissions="{ edit: true, delete: true }"
        :personal-indicator-permissions="{ edit: false, delete: false }"
      />
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
import {
  AppstoreOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  ConsoleSqlOutlined,
  CopyOutlined,
  DeleteOutlined,
  FileTextOutlined,
  FilterOutlined,
  ForkOutlined,
  MinusCircleOutlined,
  ReloadOutlined,
  UndoOutlined,
  UserOutlined,
  VerticalAlignBottomOutlined,
  VerticalAlignTopOutlined
} from '@ant-design/icons-vue'
import { CellRenderArgs } from '@surely-vue/table'
import { MenuProps } from 'ant-design-vue'
import dayjs from 'dayjs'
import * as _ from 'lodash'
import { nextTick, Ref } from 'vue'

import FolderComponent from './components/FolderComponent.vue'
import IndicatorModal from './indicatorModal.vue'
import SqlDraw from './sqlDraw.vue'

import { getRoleList } from '@/framework/apis/admin/rolePermission'
import {
  bindRole,
  copyPortalConfig,
  deletePortalConfig,
  existedPortalConfig,
  exportPortalConfig,
  getBindRole,
  getPortalConfig,
  getPortalList,
  getSql,
  importPortalConfig,
  refreshPortalConfig,
  unbindRole,
  updatePortalColumn,
  updatePortalColumnOrder,
  updatePortalConfig
} from '@/framework/apis/portal/config'
import { ConditionType } from '@/framework/components/common/AdvancedSearch/type'
import PublicDashboard from '@/framework/components/common/chartConfig/index.vue'
import { AUTO_UUID_ROW_KEY } from '@/framework/components/common/Portal/constant'
import { ColumnType, FIELD_TYPE, FILTER_TYPE } from '@/framework/components/common/Portal/type'
import UploadFile from '@/framework/components/common/UploadFile/index.vue'
import { filterOption } from '@/framework/components/common/utils'
import { dictStore, useTreeStore } from '@/framework/store/common'
import { isEmpty, isNotEmpty, strLF2HtmlLF, strRemoveLF, updateTableSize } from '@/framework/utils/common'
import { AUTO } from '@/framework/utils/constant'
import { ValueLabel } from '@/framework/utils/type'

const dict = dictStore()
const treeDict = useTreeStore()
let inputTableName: Ref<string> = ref('')
let tableList: Ref<Array<ValueLabel>> = ref([] as Array<ValueLabel>)
// 文件夹结构相关
const expandedFolders = reactive({} as Record<string, boolean>)
// 构建多层级文件夹结构
const buildNestedFolders = (items: Array<ValueLabel>, searchTerm?: string) => {
  const root: any = { children: {}, items: [] }

  items.forEach((item) => {
    // 如果有搜索词，只处理匹配的项（同时匹配 label 和 value）
    if (searchTerm) {
      const labelMatch = item.label.toLowerCase().includes(searchTerm)
      const valueMatch = String(item.value).toLowerCase().includes(searchTerm)
      const isMatch = labelMatch || valueMatch
      if (!isMatch) return
    }

    const parts = item.label.split('-')
    let currentLevel = root

    // 如果没有'-'分隔符，直接放在根级别
    if (parts.length === 1) {
      currentLevel.items.push(item)
      return
    }

    // 遍历每个层级，构建嵌套结构
    for (let i = 0; i < parts.length - 1; i++) {
      const folderName = parts[i].trim()
      if (!folderName) continue

      if (!currentLevel.children[folderName]) {
        currentLevel.children[folderName] = {
          children: {},
          items: [],
          fullPath: parts.slice(0, i + 1).join('-')
        }
      }
      currentLevel = currentLevel.children[folderName]
    }

    // 将项目添加到最终层级
    currentLevel.items.push({
      ...item,
      shortLabel: parts[parts.length - 1].trim() || item.label
    })
  })

  return root
}

const folderStructure = computed(() => {
  const searchTerm = inputTableName.value.trim().toLowerCase()
  return buildNestedFolders(tableList.value, searchTerm || undefined)
})
let sysDictList = reactive([] as Array<any>)
let sysTreeDictList = reactive([] as Array<any>)
let tableSizeDict = reactive([] as Array<ValueLabel>)
let fieldTypeDict = reactive([] as Array<ValueLabel>)
let mobileDisplayTypeDict = reactive([] as Array<ValueLabel>)
let alignDict = reactive([] as Array<ValueLabel>)
let columnDict = reactive([] as Array<ValueLabel>)
let columnMap = reactive(new Map())
let selectedColumnId = ref('')
let columnFiltered: Ref<boolean> = ref(false)
let roleDictList = reactive([{ value: '0', label: '默认配置' }] as Array<ValueLabel>)
let bindRoleDictList = reactive([] as Array<ValueLabel>)
let selectedRole = ref('0')
// 关联属性
const entityConfig = ref({} as any)
const entityCondition = reactive({
  show: false,
  columnArray: [] as Array<ColumnType>,
  title: '',
  condition: {} as ConditionType | undefined,
  key: 0,
  okText: '保存',
})
const entityColumnDict = reactive([] as Array<ValueLabel>)
// 默认查询条件
const defaultCondition = reactive({
  show: false,
  columnArray: [] as Array<any>,
  title: '',
  condition: {} as ConditionType | undefined,
  key: 0,
  okText: '保存',
})
let copyConfigModal = reactive({
  visible: false,
  configId: '',
  configDescription: '',
  title: '',
})
const showSql: Ref<boolean> = ref(false)
const sqlData: Ref<string> = ref('')
const indicatorModalShow: Ref<boolean> = ref(false)
const publicDashboardModalShow: Ref<boolean> = ref(false)
const publicDashboardRefreshing: Ref<boolean> = ref(false)
const publicDashboardRearranging: Ref<boolean> = ref(false)
const publicDashboardRef = ref()
const checkConfigIdExisted = () => {
  return existedPortalConfig(copyConfigModal.configId, selectedRole.value)
}
const openCopyConfigModal = (item: any) => {
  copyConfigModal.visible = true
  copyConfigModal.title = item.label + '(' + item.value + ')'
}
const copyConfig = () => {
  copyPortalConfig(
    tableConfig.value.id,
    copyConfigModal.configId,
    copyConfigModal.configDescription
  ).then(() => {
    copyConfigModal.visible = false
    onSearch()
  })
}

// 处理通用指标刷新（只刷新数据）
const handlePublicDashboardRefreshDataOnly = async () => {
  if (!publicDashboardRef.value) {
    console.warn('publicDashboard组件引用未找到')
    return
  }

  try {
    publicDashboardRefreshing.value = true
    // 调用publicDashboard组件的refreshDataOnly方法（只刷新数据，不重新排列）
    await publicDashboardRef.value.refreshDataOnly()
  } catch (error) {
    console.error('刷新数据失败:', error)
  } finally {
    publicDashboardRefreshing.value = false
  }
}

// 处理通用指标重新排列
const handlePublicDashboardRearrange = async () => {
  if (!publicDashboardRef.value) {
    console.warn('publicDashboard组件引用未找到')
    return
  }

  try {
    publicDashboardRearranging.value = true
    // 调用publicDashboard组件的rearrangeChartsOnly方法（只重新排列，不刷新数据）
    await publicDashboardRef.value.rearrangeChartsOnly()
  } catch (error) {
    console.error('重新排列失败:', error)
  } finally {
    publicDashboardRearranging.value = false
  }
}

const getEntityConfig = (tableId: string) => {
  getPortalConfig(tableId, selectedRole.value).then((res) => {
    entityColumnDict.length = 0
    entityConfig.value = res.payload
    entityConfig.value.columns.forEach((column: { property: any; displayName: any }) => {
      entityColumnDict.push({
        value: column.property,
        label: column.displayName,
      } as ValueLabel)
    })
    if (
      selectedColumnId.value &&
      isEmpty(columnMap.get(selectedColumnId.value)?.entityField)
    ) {
      columnMap.get(selectedColumnId.value).entityField = entityConfig.value.idColumn
    }
  })
}

const tableConfig = ref({} as any)
const fieldRecords = ref([] as Array<any>)
const getTableConfigByName = (item: any) => {
  getPortalConfig(item, selectedRole.value).then(async (res) => {
    columnDict.length = 0
    columnMap.clear()
    selectedColumnId.value = ''
    entityCondition.condition = {} as ConditionType
    defaultCondition.columnArray = []
    tableConfig.value = res.payload
    const promiseList = [] as Array<Promise<any>>
    tableConfig.value.columns.forEach(
      (column: {
        property: any;
        displayName: any;
        id: any;
        fieldType: any;
        reference: string;
        filterAble: string;
      }) => {
        columnDict.push({
          value: column.property,
          label: strRemoveLF(column.displayName),
        } as ValueLabel)
        columnMap.set(column.id, column)
        if (column.fieldType === FIELD_TYPE.ENTITY) {
          getEntityConfig(column.reference)
        }
        if (column.filterAble === '1') {
          const columnConfig = {
            title: column.displayName,
            key: column.property,
            fieldType: column.fieldType,
            referenceDictOption: null,
          }
          if (
            column.fieldType === FIELD_TYPE.SELECT ||
            column.fieldType === FIELD_TYPE.TREE ||
            column.fieldType === FIELD_TYPE.SELECT_MULTI_IN_ONE ||
            column.fieldType === FIELD_TYPE.TREE_MULTI_IN_ONE
          ) {
            let promise = dict
              .getDict(column.reference)
              .then((option: any) => (columnConfig.referenceDictOption = option))
            promiseList.push(promise)
          }
          if (column.filterAble) {
            defaultCondition.columnArray.push(columnConfig)
          }
        }
      }
    )
    await Promise.all(promiseList)
    fieldRecords.value = [...tableConfig.value.columns]
    defaultCondition.condition = tableConfig.value.defaultCondition
    const defaultSort = JSON.parse(tableConfig.value.defaultSort)
    if (isNotEmpty(defaultSort)) {
      const sortConfig = defaultSort[0]
      tableConfig.value.sortType = sortConfig.type === 0
      tableConfig.value.sortColumn = sortConfig.property
    }
    console.debug(tableConfig.value)
  })
}

const deleteConfig = (id: any) => {
  deletePortalConfig(id || tableConfig.value.id).then(() => {
    columnDict.length = 0
    columnMap.clear()
    selectedColumnId.value = ''
    tableConfig.value = {}
    onSearch()
  })
}

const refreshConfig = (id: any) => {
  refreshPortalConfig(id || tableConfig.value.id, selectedRole.value).then(() => {
    columnDict.length = 0
    columnMap.clear()
    selectedColumnId.value = ''
    tableConfig.value = {}
    onSearch()
  })
}

const saveTableConfig = (silent = true) => {
  if (isNotEmpty(tableConfig.value.sortColumn)) {
    tableConfig.value.defaultSort = JSON.stringify([
      {
        property: tableConfig.value.sortColumn,
        type: tableConfig.value.sortType ? 0 : 1,
      },
    ])
  } else {
    tableConfig.value.defaultSort = '[]'
  }

  return updatePortalConfig(tableConfig.value, silent).then(() => onSearch())
}

const saveTableColumn = (silent = true) => {
  return updatePortalColumn(columnMap.get(selectedColumnId.value), silent).then(() =>
    getPortalConfig(tableConfig.value.name, selectedRole.value)
  )
}

const quickConfig = (column: any, type: string) => {
  if (type === 'displayNone') {
    column.show = '0'
    column.detailShow = '0'
    column.addShow = '0'
    column.editShow = '0'
    column.filterAble = '0'
    column.sortAble = '0'
  } else if (type === 'displaySearchSort') {
    column.show = '1'
    column.detailShow = '1'
    column.addShow = '0'
    column.editShow = '0'
    column.filterAble = '1'
    column.sortAble = '1'
  } else if (type === 'displaySearch') {
    column.show = '1'
    column.detailShow = '1'
    column.addShow = '0'
    column.editShow = '0'
    column.filterAble = '1'
    column.sortAble = '0'
  } else if (type === 'displayTableOnly') {
    column.show = '1'
    column.detailShow = '0'
    column.addShow = '0'
    column.editShow = '0'
  } else if (type === 'displayDetailOnly') {
    column.show = '1'
    column.detailShow = '0'
    column.addShow = '0'
    column.editShow = '0'
  } else if (type === 'displayTableAndDetail') {
    column.show = '1'
    column.detailShow = '1'
    column.addShow = '0'
    column.editShow = '0'
  }
  saveTableColumn()
}

const exportTableConfig = () => {
  exportPortalConfig(
    tableConfig.value.name,
    selectedRole.value,
    tableConfig.value.displayName +
    '-' +
    selectedRole.value +
    '-' +
    dayjs().format('YYYYMMDDHHmmss') +
    '.dat'
  )
}

const uploadTableConfigRef = ref()
const uploadTableConfig = () => {
  uploadTableConfigRef.value.showUploadDialogBox('.dat')
}
const importTableConfig = (file: any, onUploadProgress: any) => {
  return importPortalConfig(
    tableConfig.value.name,
    selectedRole.value,
    file,
    onUploadProgress
  )
}

const associateDialogBox = reactive({
  show: false,
})
const associateTableConfig = () => {
  associateDialogBox.show = true
}

const onSearch = () => {
  getPortalList(inputTableName.value, selectedRole.value).then((res) => {
    tableList.value = res.payload || []

    // 使用nextTick确保 DOM 更新后再处理文件夹展开状态
    nextTick(() => {
      // 如果有搜索词，自动展开包含匹配项的文件夹
      if (inputTableName.value.trim()) {
        autoExpandMatchedFolders()
      } else {
        // 如果没有搜索词，初始化所有文件夹为关闭状态
        // 递归初始化所有嵌套文件夹的关闭状态
        const initFolderExpanded = (children: any, parentPath = '') => {
          if (!children || typeof children !== 'object') return

          Object.keys(children).forEach((folderKey) => {
            const fullPath = parentPath ? `${parentPath}-${folderKey}` : folderKey
            expandedFolders[fullPath] = false

            // 递归处理子文件夹
            if (children[folderKey]?.children) {
              initFolderExpanded(children[folderKey].children, fullPath)
            }
          })
        }

        // 初始化所有文件夹
        if (folderStructure.value?.children) {
          initFolderExpanded(folderStructure.value.children)
        }
      }
    })
  })
}

// 实时搜索处理
const onSearchInput = _.debounce(() => {
  // 无需重新加载数据，只需更新文件夹展开状态和高亮显示
  nextTick(() => {
    if (inputTableName.value.trim()) {
      autoExpandMatchedFolders()
    } else {
      // 清空搜索时恢复所有文件夹展开状态
      Object.keys(expandedFolders).forEach((folderKey) => {
        expandedFolders[folderKey] = true
      })
    }
  })
}, 300) // 300ms 防抖

const handleColumnFilter = (
  selectedKey: any,
  confirm: any,
  dataIndex: any,
  hidePopup: any,
  column: any,
  clearFilters: any
) => {
  fieldRecords.value.length = 0
  if (selectedKey === '') {
    fieldRecords.value = [...tableConfig.value.columns]
    columnFiltered.value = false
    clearFilters()
  } else {
    fieldRecords.value = tableConfig.value.columns.filter(
      (record: { [x: string]: string; enable: string }) =>
        record.enable === '1' && record[`${selectedKey}`] === '1'
    )
    columnFiltered.value = true
    confirm()
  }
  hidePopup()
}

const setOrderToTop = (arg: any) => {
  fieldRecords.value.splice(arg.index, 1)
  fieldRecords.value.unshift(arg.record)
  handleColumnOrderChanged()
  arg.hidePopup()
}
const setOrderToBottom = (arg: any) => {
  fieldRecords.value.splice(arg.index, 1)
  fieldRecords.value.push(arg.record)
  handleColumnOrderChanged()
  arg.hidePopup()
}

const handleColumnOrderChanged = () => {
  const columnOrder = [] as any
  let index = 1
  setTimeout(() => {
    for (let column of fieldRecords.value) {
      const order = {
        id: column.id,
        title: column.displayName,
        showOrder: index++,
      }
      columnMap.get(column.id).displayOrder = order.showOrder
      columnOrder.push(order)
    }
    updatePortalColumnOrder(columnOrder).then(() => onSearch())
  })
}

const handleColumnSelected = (event: MouseEvent, params: CellRenderArgs) => {
  selectedColumnId.value = params.record.id
  if (params.record.fieldType === FIELD_TYPE.ENTITY) {
    if (isNotEmpty(params.record.reference)) {
      getEntityConfig(params.record.reference)
    }
  }
}

const entityConditionDrawOpen = async () => {
  entityCondition.columnArray = entityConfig.value.columns
    .filter(
      (item: { filterAble: string; show: string }) =>
        item.filterAble === '1' && item.show === '1'
    )
    .map((item: any) => ({
      title: item.displayName,
      key: item.property,
      referenceDict: item.reference,
      fieldType: item.fieldType,
    }))
  for (let item of entityCondition.columnArray) {
    if ((item.fieldType === FIELD_TYPE.SELECT || item.fieldType === FIELD_TYPE.SELECT_MULTI_IN_ONE) && isNotEmpty(item.referenceDict)) {
      item.referenceDictOption = (await dict.getDict(item.referenceDict)) || []
    }
  }
  if (isNotEmpty(columnMap.get(selectedColumnId.value).entityCondition)) {
    entityCondition.condition = JSON.parse(
      columnMap.get(selectedColumnId.value).entityCondition
    )
  } else {
    entityCondition.condition = {} as ConditionType
  }
  entityCondition.show = true
  // 强制更新高级查询组件
  entityCondition.key++
}
const saveEntityCondition = (condition: ConditionType) => {
  entityCondition.condition = condition
  columnMap.get(selectedColumnId.value).entityCondition = JSON.stringify(condition)
  saveTableColumn()
}

const saveDefaultCondition = () => {
  tableConfig.value.defaultCondition = JSON.stringify(defaultCondition.condition)
  saveTableConfig()
}
const cleanDefaultCondition = () => {
  defaultCondition.condition = undefined
  tableConfig.value.defaultCondition = null
  saveTableConfig(false)
}

const init = async () => {
  updateTableWidthAndHeight()
  tableConfig.value = []
  fieldRecords.value = []
  roleDictList.length = 0
  roleDictList.push({ value: '0', label: '默认配置' } as ValueLabel)
  return Promise.all([
    await dict.getDict('PORTAL_TABLE_SIZE_DICT').then((res) => {
      tableSizeDict = res || []
    }),
    await dict.getDict('PORTAL_FIELD_DICT').then((res) => {
      fieldTypeDict = res || []
    }),
    await dict.getDict('PORTAL_MOBILE_DISPLAY_TYPE_DICT').then((res) => {
      mobileDisplayTypeDict = res || []
    }),
    await dict.getDict('PORTAL_ALIGN_DICT').then((res) => {
      alignDict = res || []
    }),
    await dict.getAllDict('').then((res) => {
      sysDictList = res || []
    }),
    await treeDict.getAllDict().then((res) => {
      sysTreeDictList = res || []
    }),
    await getRoleList().then((res) => {
      if (res.payload && res.payload.records) {
        for (let role of res.payload.records) {
          roleDictList.push({ value: role.roleId, label: role.roleName } as ValueLabel)
        }
      }
    }),
    await getBindRole().then((res) => (bindRoleDictList = res.payload || [])),
  ])
}
const handleMenuClick: MenuProps['onClick'] = async (e) => {
  await bindRole(selectedRole.value, e.key)
  await init()
  onSearch()
}

const cleanPortalConfigByRole = async () => {
  await unbindRole(selectedRole.value)
  await init()
  onSearch()
}

// 文件夹相关方法
const toggleFolder = (folderKey: string) => {
  const isCurrentlyExpanded = expandedFolders[folderKey]

  if (!isCurrentlyExpanded) {
    // 如果要展开，先关闭同级其他文件夹
    closeSiblingFolders(folderKey)
  }

  // 切换当前文件夹状态
  expandedFolders[folderKey] = !isCurrentlyExpanded
}

// 关闭同级文件夹（保持上级文件夹展开）
const closeSiblingFolders = (currentFolderKey: string) => {
  // 获取当前文件夹的层级和路径
  const pathParts = currentFolderKey.split('-')
  const depth = pathParts.length

  // 关闭所有同级文件夹，但保持上级文件夹展开
  Object.keys(expandedFolders).forEach(folderKey => {
    if (folderKey !== currentFolderKey) {
      const keyParts = folderKey.split('-')

      // 只关闭真正的同级文件夹
      if (keyParts.length === depth) {
        if (depth === 1) {
          // 顶级文件夹，直接关闭其他顶级文件夹
          expandedFolders[folderKey] = false
        } else {
          // 非顶级文件夹，检查父级路径是否完全相同
          const currentParentPath = pathParts.slice(0, -1).join('-')
          const keyParentPath = keyParts.slice(0, -1).join('-')
          if (currentParentPath === keyParentPath) {
            expandedFolders[folderKey] = false
          }
        }
      }
      // 不关闭下级文件夹，只有在它们不是当前文件夹的子文件夹时才关闭
      else if (keyParts.length > depth) {
        // 检查是否为当前文件夹的子文件夹
        const keyPrefix = keyParts.slice(0, depth).join('-')
        if (keyPrefix !== currentFolderKey) {
          // 不是当前文件夹的子文件夹，且层级更深，可能需要关闭
          // 但为了保持上级文件夹展开，我们不在这里处理
        }
      }
    }
  })
}

// 获取排序后的文件夹
const getSortedFolders = (folders: Record<string, any>) => {
  const sortedEntries = Object.entries(folders).sort(([a], [b]) =>
    a.localeCompare(b, 'zh-CN')
  )
  return Object.fromEntries(sortedEntries)
}

// 获取文件夹总项目数
const getTotalItemCount = (folderData: any): number => {
  let count = folderData.items ? folderData.items.length : 0
  Object.values(folderData.children || {}).forEach((child: any) => {
    count += getTotalItemCount(child)
  })
  return count
}

// 高亮搜索文字
const highlightSearchText = (text: string) => {
  const searchTerm = inputTableName.value.trim()
  if (!searchTerm || !text) {
    return text
  }

  // 使用正则表达式全局匹配，不区分大小写
  const regex = new RegExp(
    `(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
    'gi'
  )

  return text.replace(regex, '<span class="highlight-text">$1</span>')
}

// 自动展开包含匹配项的文件夹
const autoExpandMatchedFolders = () => {
  const searchTerm = inputTableName.value.trim().toLowerCase()
  if (!searchTerm) return

  // 递归查找匹配的文件夹
  const expandMatchedPaths = (obj: any, currentPath = ''): boolean => {
    let hasMatch = false

    // 检查当前层级的项目（同时匹配 label 和 value）
    if (obj.items) {
      hasMatch = obj.items.some((item: any) => {
        const labelMatch = item.label.toLowerCase().includes(searchTerm)
        const valueMatch = String(item.value).toLowerCase().includes(searchTerm)
        return labelMatch || valueMatch
      })
    }

    // 检查子文件夹
    if (obj.children) {
      Object.entries(obj.children).forEach(([key, child]: [string, any]) => {
        const childPath = currentPath ? `${currentPath}-${key}` : key
        const childHasMatch = expandMatchedPaths(child, childPath)

        if (childHasMatch || key.toLowerCase().includes(searchTerm)) {
          expandedFolders[childPath] = true
          hasMatch = true
        }
      })
    }

    return hasMatch
  }

  // 先关闭所有文件夹
  Object.keys(expandedFolders).forEach(key => {
    expandedFolders[key] = false
  })

  // 展开匹配的文件夹
  expandMatchedPaths(folderStructure.value)
}

onMounted(() => {
  init().then(() => {
    onSearch()
  })
})
// region 调整表格大小
const root: Ref = ref()
let tableWidth: Ref<number> = ref(0)
let tableHeight: Ref<number> = ref(0)
const getTableHeight = () => {
  if (tableHeight.value == undefined) return AUTO
  return tableHeight.value
}
const updateTableWidthAndHeight = () => {
  updateTableSize(root, tableWidth, 40, tableHeight, 275)
}
let saving = false
window.addEventListener('resize', _.debounce(updateTableWidthAndHeight, 200))
window.addEventListener('keydown', function (event) {
  if (event.ctrlKey || event.metaKey) {
    // metaKey 用于 Mac 上的 Command 键
    if (event.key === 's' || event.keyCode === 83) {
      // 's' 键或键码 83
      event.preventDefault() // 阻止默认的保存行为
      if (!saving) {
        saving = true
        if (selectedColumnId.value) {
          saveTableColumn(false).then(() =>
            saveTableConfig(false).then(() => (saving = false))
          )
        } else {
          saveTableConfig(false).then(() => (saving = false))
        }
      }
    }
  }
})
const onSqlShow = () => {
  getSql(tableConfig.value.name).then((resp: any) => {
    sqlData.value = resp.payload
    showSql.value = true
  })
}
//endregion
</script>
<style lang="less" scoped src="./css/index.less"></style>
