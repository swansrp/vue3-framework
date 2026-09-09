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
              @contextmenu="getTableConfigByName(item.value)"
            >
              <div
                class="item-content"
                style="padding-left: 25px;"
              >
                <!-- 与第一层级项目保持一致:25px -->
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
        <!-- 生成Portal配置按钮（仅Matrix/Dataset模式显示） -->
        <a-button
          v-if="props.dataMode && props.referenceId"
          type="primary"
          shape="round"
          style="margin-top: 5px; width: 160px"
          @click="showGenerateModal = true"
        >
          生成Portal配置
          <template #icon>
            <PlusOutlined />
          </template>
        </a-button>

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

        <!-- 添加配置按钮（按 Portal 粒度从模板角色复制，不影响已有副本） -->
        <a-button
          v-if="selectedRole !== '0' && bindRoleDictList.length > 0"
          shape="round"
          style="margin-top: 5px; width: 160px"
          @click="openAddPortalModal"
        >
          添加配置
          <template #icon>
            <PlusOutlined />
          </template>
        </a-button>
      </div>
    </div>
    <!-- endregion -->
    <!-- region 生成Portal配置弹窗 -->
    <a-modal
      v-model:open="showGenerateModal"
      title="生成Portal配置"
      centered
      @ok="handleGeneratePortal"
    >
      <a-form
        ref="generateFormRef"
        :model="generateForm"
        :label-col="{ span: 6 }"
        :wrapper-col="{ span: 18 }"
      >
        <a-form-item
          label="Portal名称"
          name="portalName"
          :rules="[{ required: true, message: '请输入Portal名称' }]"
        >
          <a-input
            v-model:value="generateForm.portalName"
            placeholder="请输入Portal名称（英文）"
          >
            <template #suffix>
              <span style="color: #999; font-size: 12px;">
                {{ props.dataMode === 'MATRIX' ? 'Matrix' : props.dataMode === 'DATASET' ? 'DATASET' : '' }}
              </span>
            </template>
          </a-input>
        </a-form-item>
        <a-form-item
          label="显示名称"
          name="displayName"
          :rules="[{ required: true, message: '请输入显示名称' }]"
        >
          <a-input
            v-model:value="generateForm.displayName"
            placeholder="请输入Portal显示名称（中文）"
          />
        </a-form-item>
      </a-form>
    </a-modal>
    <!-- endregion -->
    <!-- region 添加Portal配置弹窗（按Portal粒度复制） -->
    <a-modal
      v-model:open="showAddPortalModal"
      title="添加配置（勾选=保留副本，取消=删除副本）"
      centered
      :width="640"
      :confirm-loading="addPortalLoading"
      @ok="submitAddPortal"
    >
      <a-form layout="vertical">
        <a-form-item label="模板角色">
          <a-select
            v-model:value="addPortalTemplateRole"
            :options="bindRoleDictList"
            placeholder="请选择模板角色"
            @change="loadAddPortalOptions"
          />
        </a-form-item>
        <a-form-item label="勾选该角色需要的 Portal（取消勾选将删除对应副本）">
          <a-spin :spinning="addPortalLoading">
            <div style="max-height: 380px; overflow-y: auto; padding-right: 4px;">
              <a-tree
                v-if="addPortalTreeData.length > 0"
                v-model:checked-keys="addPortalChecked"
                checkable
                default-expand-all
                :tree-data="addPortalTreeData"
              />
            </div>
            <div
              v-if="addPortalTreeData.length === 0 && !addPortalLoading"
              style="color: #999; font-size: 12px;"
            >
              该模板角色下没有可添加的 Portal
            </div>
          </a-spin>
        </a-form-item>
      </a-form>
    </a-modal>
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
    <!-- region 数据预览弹窗 -->
    <a-modal
      v-model:open="showDataPreviewDrawer"
      :title="'预览 - ' + tableConfig.displayName"
      width="100%"
      :style="{ top: 0, maxWidth: '100%', paddingBottom: 0 }"
      :body-style="{ height: 'calc(100vh - 110px)', padding: '16px', overflow: 'auto' }"
      :footer="null"
      :z-index="999"
      wrap-class-name="fullscreen-modal"
    >
      <portal
        v-if="showDataPreviewDrawer && tableConfig.name"
        :table-id="tableConfig.name"
        :action-width="0"
      />
    </a-modal>
    <!-- endregion -->
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
            @click="showDataPreviewDrawer = true"
          >
            预览
          </a-button>
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
            @click="showPortalTableConfigModal = true"
          >
            报表配置
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
              title: '字段列表',
              align: 'center',
              dataIndex: 'displayName',
              tooltip: { placement: 'left', mouseEnterDelay: 1 },
              rowDrag: false,
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
            <control-outlined :class="filtered && 'filter-active'" />
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
                background-color: var(--bg-elevated);
                width: 240px;
                padding: 8px;
                border-radius: 8px;
                box-shadow: var(--shadow-md);
              "
            >
              <!-- 操作按钮 -->
              <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;">
                <a-button
                  block
                  size="middle"
                  style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    height: 36px;
                    border-radius: 6px;
                  "
                  @click="
                    () => {
                      showColumnOrderModal = true;
                      hidePopup();
                    }
                  "
                >
                  <SortAscendingOutlined />
                  <span>字段排序</span>
                </a-button>
                <a-button
                  block
                  size="middle"
                  style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    height: 36px;
                    border-radius: 6px;
                  "
                  @click="
                    () => {
                      openBatchConfigModal();
                      hidePopup();
                    }
                  "
                >
                  <SettingOutlined />
                  <span>批量配置</span>
                </a-button>
              </div>
              
              <a-divider style="margin: 8px 0;" />
              
              <!-- 筛选条件 -->
              <div>
                <div
                  style="
                  font-size: 12px;
                  color: #8c8c8c;
                  margin-bottom: 8px;
                  padding-left: 4px;
                "
                >
                  筛选条件
                </div>
                <a-select
                  :get-popup-container="(triggerNode) => triggerNode.parentNode"
                  :options="[
                    { label: '全部字段', value: '' },
                    { label: '有效字段', value: 'enable' },
                    { label: '表格显示', value: 'show' },
                    { label: '详情显示', value: 'detailShow' },
                    { label: '新增显示', value: 'addShow' },
                    { label: '编辑显示', value: 'editShow' },
                  ]"
                  :placeholder="`选择类型`"
                  :show-search="false"
                  :value="selectedKeysRef.value || ''"
                  size="middle"
                  style="width: 100%; margin-bottom: 8px; border-radius: 6px;"
                  @change="
                    (e) => {
                      const selectedKey = e || '';
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
                  v-if="selectedKeysRef.value"
                  block
                  size="middle"
                  style="border-radius: 6px; height: 32px;"
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
                  清除筛选
                </a-button>
              </div>
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
    
    <!-- 字段排序弹框 -->
    <ColumnOrderModal
      v-model="showColumnOrderModal"
      :columns="tableConfig.columns || []"
      @confirm="handleColumnOrderConfirm"
      @quick-config="handleQuickConfigInModal"
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
        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
          <span style="line-height: 1;">通用图表</span>
          <a-space
            :size="6"
            style="margin-right: 32px;"
          >
            <a-button
              size="small"
              :loading="chartExporting"
              @click="handleExportChartConfig"
            >
              <template #icon>
                <DownloadOutlined />
              </template>
              导出配置
            </a-button>
            <input
              ref="chartFileInputRef"
              type="file"
              accept=".json"
              style="display: none"
              @change="handleChartFileChange"
            />
            <a-button
              size="small"
              :loading="chartImporting"
              @click="chartFileInputRef?.click()"
            >
              <template #icon>
                <UploadOutlined />
              </template>
              导入配置
            </a-button>
          </a-space>
        </div>
      </template>
      <public-dashboard
        v-if="publicDashboardModalShow"
        ref="publicDashboardRef"
        :table-id="tableConfig.name"
        :show-personal-indicators="false"
        :use-common-dashboard="true"
        :common-indicator-permissions="{ edit: true, delete: true }"
        :personal-indicator-permissions="{ edit: false, delete: false }"
      />
    </a-modal>
    <!-- 批量字段配置弹窗 -->
    <a-modal
      v-model:open="showBatchConfigModal"
      title="批量字段配置"
      width="850px"
      centered
      :body-style="{ maxHeight: '72vh', overflow: 'auto' }"
    >
      <!-- 字段选择 - 卡片网格 -->
      <div style="margin-bottom: 16px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <span style="font-weight: 500;">
            选择目标字段（已选 {{ batchSelectedIds.length }} 个，支持 Shift 多选）
          </span>
          <a-space :size="8">
            <a-button
              size="small"
              type="link"
              @click="batchSelectAll"
            >
              全选
            </a-button>
            <a-button
              size="small"
              type="link"
              @click="batchClearAll"
            >
              清空
            </a-button>
          </a-space>
        </div>
        <div class="batch-field-grid">
          <div
            v-for="(column, index) in (tableConfig.columns || [])"
            :key="column.id"
            class="batch-field-card"
            :class="{ 'batch-field-selected': batchSelectedIds.includes(column.id) }"
            @click="batchToggleSelect(column.id, index, $event)"
          >
            <div class="batch-field-checkbox">
              <CheckOutlined v-if="batchSelectedIds.includes(column.id)" />
            </div>
            <div class="batch-field-info">
              <div class="batch-field-name">
                {{ strRemoveLF(column.displayName) }}
              </div>
              <div class="batch-field-property">
                {{ column.property }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <a-divider style="margin: 8px 0 16px" />

      <!-- 快速配置 -->
      <div style="margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <a-checkbox v-model:checked="batchForm.quickPreset.enabled" />
          <span style="width: 120px; flex-shrink: 0; font-weight: 500;">快速配置</span>
          <a-select
            v-model:value="batchForm.quickPreset.value"
            :options="batchQuickPresetOptions"
            :disabled="!batchForm.quickPreset.enabled"
            style="width: 200px"
            placeholder="选择常用配置方案"
          />
        </div>
      </div>

      <a-divider style="margin: 0 0 16px" />

      <!-- 配置项 -->
      <div style="margin-bottom: 8px; font-weight: 500;">
        细项配置（仅勾选的会被修改）
      </div>
      <div style="display: flex; gap: 24px;">
        <!-- 左列 -->
        <div style="flex: 1; display: flex; flex-direction: column; gap: 12px;">
          <!-- 字段类型 -->
          <div style="display: flex; align-items: center; gap: 8px;">
            <a-checkbox v-model:checked="batchForm.fieldType.enabled" />
            <span style="width: 120px; flex-shrink: 0;">字段类型</span>
            <a-select
              v-model:value="batchForm.fieldType.value"
              :options="fieldTypeDict"
              :disabled="!batchForm.fieldType.enabled"
              style="width: 200px"
              placeholder="选择字段类型"
            />
          </div>

          <!-- 显示格式（金额/百分比时显示） -->
          <div
            v-if="batchForm.fieldType.enabled && (batchForm.fieldType.value === FIELD_TYPE.MONEY || batchForm.fieldType.value === FIELD_TYPE.PERCENT)"
            style="display: flex; align-items: center; gap: 8px;"
          >
            <a-checkbox v-model:checked="batchForm.reference.enabled" />
            <span style="width: 120px; flex-shrink: 0;">显示格式(精度,单位)</span>
            <a-input
              v-model:value="batchForm.reference.value"
              :placeholder="batchForm.fieldType.value === FIELD_TYPE.MONEY ? '如: 2,10000' : '如: 2,100'"
              style="width: 200px"
            />
          </div>

          <!-- 分组名称 -->
          <div style="display: flex; align-items: center; gap: 8px;">
            <a-checkbox v-model:checked="batchForm.displayGroupName.enabled" />
            <span style="width: 120px; flex-shrink: 0;">分组名称</span>
            <a-input
              v-model:value="batchForm.displayGroupName.value"
              :disabled="!batchForm.displayGroupName.enabled"
              placeholder="输入分组名称"
              style="width: 200px"
            />
          </div>

          <!-- 对齐方式 -->
          <div style="display: flex; align-items: center; gap: 8px;">
            <a-checkbox v-model:checked="batchForm.align.enabled" />
            <span style="width: 120px; flex-shrink: 0;">对齐方式</span>
            <a-select
              v-model:value="batchForm.align.value"
              :options="alignDict"
              :disabled="!batchForm.align.enabled"
              style="width: 200px"
              placeholder="选择对齐方式"
            />
          </div>

          <!-- 移动端显示 -->
          <div style="display: flex; align-items: center; gap: 8px;">
            <a-checkbox v-model:checked="batchForm.mobileDisplayType.enabled" />
            <span style="width: 120px; flex-shrink: 0;">移动端显示</span>
            <a-select
              v-model:value="batchForm.mobileDisplayType.value"
              :options="mobileDisplayTypeDict"
              :disabled="!batchForm.mobileDisplayType.enabled"
              style="width: 200px"
              placeholder="选择移动端显示"
            />
          </div>
        </div>

        <!-- 右列 -->
        <div style="flex: 1; display: flex; flex-direction: column; gap: 12px;">
          <!-- 汇总 -->
          <div style="display: flex; align-items: center; gap: 8px;">
            <a-checkbox v-model:checked="batchForm.summaryAble.enabled" />
            <span style="width: 120px; flex-shrink: 0;">汇总</span>
            <a-switch
              v-model:checked="batchForm.summaryAble.value"
              :disabled="!batchForm.summaryAble.enabled"
              checked-value="1"
              un-checked-value="0"
            />
          </div>

          <!-- 筛选 -->
          <div style="display: flex; align-items: center; gap: 8px;">
            <a-checkbox v-model:checked="batchForm.filterAble.enabled" />
            <span style="width: 120px; flex-shrink: 0;">筛选</span>
            <a-switch
              v-model:checked="batchForm.filterAble.value"
              :disabled="!batchForm.filterAble.enabled"
              checked-value="1"
              un-checked-value="0"
            />
          </div>

          <!-- 排序 -->
          <div style="display: flex; align-items: center; gap: 8px;">
            <a-checkbox v-model:checked="batchForm.sortAble.enabled" />
            <span style="width: 120px; flex-shrink: 0;">排序</span>
            <a-switch
              v-model:checked="batchForm.sortAble.value"
              :disabled="!batchForm.sortAble.enabled"
              checked-value="1"
              un-checked-value="0"
            />
          </div>
        </div>
      </div>

      <template #footer>
        <a-button @click="showBatchConfigModal = false">
          取消
        </a-button>
        <a-button
          type="primary"
          :loading="batchApplying"
          :disabled="batchSelectedIds.length === 0"
          @click="applyBatchConfig"
        >
          应用到 {{ batchSelectedIds.length }} 个字段
        </a-button>
      </template>
    </a-modal>
    <!-- DarkTable配置弹窗 -->
    <PortalTableConfigModal
      v-model="showPortalTableConfigModal"
      :portal-name="tableConfig.name"
      :portal-config="tableConfig"
      :columns="tableConfig.columns"
    />
  </div>
</template>

<script lang="ts" setup>
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CheckOutlined,
  ConsoleSqlOutlined,
  ControlOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FileTextOutlined,
  ForkOutlined,
  MinusCircleOutlined,
  PlusOutlined,
  SettingOutlined,
  SortAscendingOutlined,
  UndoOutlined,
  UploadOutlined,
  UserOutlined,
  VerticalAlignBottomOutlined,
  VerticalAlignTopOutlined
} from '@ant-design/icons-vue'
import { CellRenderArgs } from '@surely-vue/table'
import { MenuProps, message, Modal } from 'ant-design-vue'
import dayjs from 'dayjs'
import * as _ from 'lodash'
import { nextTick, onMounted, Ref, watch } from 'vue'


import ColumnOrderModal from './components/ColumnOrderModal.vue'
import FolderComponent from './components/FolderComponent.vue'
import PortalTableConfigModal from './components/PortalTableConfigModal.vue'
import IndicatorModal from './indicatorModal.vue'
import SqlDraw from './sqlDraw.vue'

import { getRoleList } from '@/framework/apis/admin/rolePermission'
import { updateEntitySelective } from '@/framework/apis/portal'
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
import { getCommonDashboard, getCommonStatistic, addCommonDashboard, addCommonStatistic, updateCommonStatistic } from '@/framework/components/common/chartConfig/api'
import PublicDashboard from '@/framework/components/common/chartConfig/index.vue'
import { AUTO_UUID_ROW_KEY } from '@/framework/components/common/Portal/constant'
import Portal from '@/framework/components/common/Portal/index.vue'
import { ColumnType, FIELD_TYPE, FILTER_TYPE } from '@/framework/components/common/Portal/type'
import UploadFile from '@/framework/components/common/UploadFile/index.vue'
import { filterOption } from '@/framework/components/common/utils'
import { getUrlParam } from '@/framework/network/utils'
import { dictStore, useTreeStore } from '@/framework/store/common'
import { isEmpty, isNotEmpty, strLF2HtmlLF, strRemoveLF, updateTableSize } from '@/framework/utils/common'
import { downloadJsonConfig, readJsonFile } from '@/framework/utils/configTransfer'
import { AUTO } from '@/framework/utils/constant'
import { ValueLabel } from '@/framework/utils/type'

// 接收props
const props = withDefaults(
  defineProps<{
    // 数据模式: null=传统表格, MATRIX=矩阵, DATASET=数据集
    dataMode?: string | null
    // 关联ID: matrixId 或 datasetId
    referenceId?: number | null
    // 自定义刷新接口（可选）
    customRefreshFn?: (portalName: string, referenceId: number) => Promise<any>
    // 自定义生成Portal函数（必须）
    generatePortalFn?: (params: { portalName: string, displayName: string, referenceId: number, dataMode: string }) => Promise<any>
  }>(),
  {
    dataMode: null,
    referenceId: null,
    customRefreshFn: undefined,
    generatePortalFn: undefined
  }
)

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
const showPortalTableConfigModal: Ref<boolean> = ref(false)
const showDataPreviewDrawer: Ref<boolean> = ref(false)
const publicDashboardModalShow: Ref<boolean> = ref(false)
const publicDashboardRef = ref()
// 通用图表导出/导入状态
const chartExporting = ref(false)
const chartImporting = ref(false)
const chartFileInputRef = ref<HTMLInputElement>()
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
  getPortalConfig(item, selectedRole.value, props.dataMode || undefined, props.referenceId || undefined).then(async (res) => {
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

// 刷新Portal配置
const refreshConfig = (portalName: string) => {
  // 如果传入了自定义refresh函数，使用自定义函数
  if (props.customRefreshFn && props.referenceId) {
    props.customRefreshFn(portalName, props.referenceId).then(() => {
      getTableConfigByName(portalName)
    })
  } else {
    // 传统Portal配置：使用默认refresh接口
    refreshPortalConfig(portalName).then(() => {
      getTableConfigByName(portalName)
    })
  }
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

  return updatePortalConfig(tableConfig.value, silent).then(() => onSearch(true))
}

const saveTableColumn = (silent = true) => {
  return updatePortalColumn(columnMap.get(selectedColumnId.value), silent).then(() =>
    getPortalConfig(tableConfig.value.name, selectedRole.value)
  )
}

// ===== 批量字段配置 =====
const showBatchConfigModal = ref(false)
const batchSelectedIds = ref<string[]>([])
const batchApplying = ref(false)
// shift多选: 记录上次点击的索引
const batchLastClickedIndex = ref<number | null>(null)
const batchQuickPresetOptions = [
  { label: '不显示', value: 'displayNone' },
  { label: '显示/筛选/排序', value: 'displaySearchSort' },
  { label: '显示/筛选', value: 'displaySearch' },
  { label: '只显示', value: 'displayNoAction' },
  { label: '表格显示', value: 'displayTableOnly' },
  { label: '详情显示', value: 'displayDetailOnly' },
  { label: '不参与编辑', value: 'displayTableAndDetail' },
]
const batchForm = reactive({
  quickPreset: { enabled: false, value: undefined as any },
  fieldType: { enabled: false, value: undefined as any },
  reference: { enabled: false, value: '' as string },
  displayGroupName: { enabled: false, value: '' as string },
  align: { enabled: false, value: undefined as any },
  mobileDisplayType: { enabled: false, value: undefined as any },
  summaryAble: { enabled: false, value: '1' as string },
  filterAble: { enabled: false, value: '1' as string },
  sortAble: { enabled: false, value: '1' as string },
})

const batchToggleSelect = (id: string, index: number, e: MouseEvent) => {
  const columns = tableConfig.value.columns || []
  if (e.shiftKey && batchLastClickedIndex.value !== null) {
    // shift多选: 从上次点击到当前之间的所有项都选中
    const start = Math.min(batchLastClickedIndex.value, index)
    const end = Math.max(batchLastClickedIndex.value, index)
    const ids = columns.slice(start, end + 1).map((c: any) => c.id)
    const existing = new Set(batchSelectedIds.value)
    ids.forEach((id) => existing.add(id))
    batchSelectedIds.value = [...existing]
  } else {
    // 普通点击: 切换选中状态
    const idx = batchSelectedIds.value.indexOf(id)
    if (idx >= 0) {
      batchSelectedIds.value.splice(idx, 1)
    } else {
      batchSelectedIds.value.push(id)
    }
  }
  batchLastClickedIndex.value = index
}

const batchSelectAll = () => {
  batchSelectedIds.value = (tableConfig.value.columns || []).map((c: any) => c.id)
  batchLastClickedIndex.value = null
}

const batchClearAll = () => {
  batchSelectedIds.value = []
  batchLastClickedIndex.value = null
}

const openBatchConfigModal = () => {
  batchSelectedIds.value = []
  batchLastClickedIndex.value = null
  batchForm.quickPreset = { enabled: false, value: undefined }
  batchForm.fieldType = { enabled: false, value: undefined }
  batchForm.reference = { enabled: false, value: '' }
  batchForm.displayGroupName = { enabled: false, value: '' }
  batchForm.align = { enabled: false, value: undefined }
  batchForm.mobileDisplayType = { enabled: false, value: undefined }
  batchForm.summaryAble = { enabled: false, value: '1' }
  batchForm.filterAble = { enabled: false, value: '1' }
  batchForm.sortAble = { enabled: false, value: '1' }
  showBatchConfigModal.value = true
}

const applyBatchConfig = async () => {
  if (batchSelectedIds.value.length === 0) {
    message.warning('请至少选择一个字段')
    return
  }
  const hasEnabled = Object.values(batchForm).some((item: any) => item.enabled)
  if (!hasEnabled) {
    message.warning('请至少勾选一个要应用的配置项')
    return
  }

  batchApplying.value = true
  try {
    const targets = batchSelectedIds.value
      .map((id) => columnMap.get(id))
      .filter(Boolean) as any[]

    const promises: Promise<any>[] = []
    for (const column of targets) {
      // 快速配置预设
      if (batchForm.quickPreset.enabled && batchForm.quickPreset.value) {
        const preset = batchForm.quickPreset.value
        if (preset === 'displayNone') {
          column.show = '0'
          column.detailShow = '0'
          column.addShow = '0'
          column.editShow = '0'
          column.filterAble = '0'
          column.sortAble = '0'
        } else if (preset === 'displaySearchSort') {
          column.show = '1'
          column.detailShow = '1'
          column.addShow = '0'
          column.editShow = '0'
          column.filterAble = '1'
          column.sortAble = '1'
        } else if (preset === 'displaySearch') {
          column.show = '1'
          column.detailShow = '1'
          column.addShow = '0'
          column.editShow = '0'
          column.filterAble = '1'
          column.sortAble = '0'
        } else if (preset === 'displayTableOnly') {
          column.show = '1'
          column.detailShow = '0'
          column.addShow = '0'
          column.editShow = '0'
        } else if (preset === 'displayDetailOnly') {
          column.show = '0'
          column.detailShow = '1'
          column.addShow = '0'
          column.editShow = '0'
        } else if (preset === 'displayTableAndDetail') {
          column.show = '1'
          column.detailShow = '1'
          column.addShow = '0'
          column.editShow = '0'
        }
      }
      // 字段类型变更时同步处理关联字段
      if (batchForm.fieldType.enabled && batchForm.fieldType.value) {
        const oldType = column.fieldType
        column.fieldType = batchForm.fieldType.value
        if (oldType !== batchForm.fieldType.value) {
          if (batchForm.fieldType.value === FIELD_TYPE.MONEY) {
            column.reference =
              batchForm.reference.enabled && batchForm.reference.value
                ? batchForm.reference.value
                : '2,10000'
          } else {
            column.reference = null
          }
          column.dbField = null
        }
      }
      if (batchForm.reference.enabled && batchForm.reference.value) {
        column.reference = batchForm.reference.value
      }
      if (batchForm.displayGroupName.enabled) {
        column.displayGroupName = batchForm.displayGroupName.value
      }
      if (batchForm.align.enabled && batchForm.align.value !== undefined) {
        column.align = batchForm.align.value
      }
      if (
        batchForm.mobileDisplayType.enabled &&
        batchForm.mobileDisplayType.value !== undefined
      ) {
        column.mobileDisplayType = batchForm.mobileDisplayType.value
      }
      if (batchForm.summaryAble.enabled) {
        column.summaryAble = batchForm.summaryAble.value
      }
      if (batchForm.filterAble.enabled) {
        column.filterAble = batchForm.filterAble.value
      }
      if (batchForm.sortAble.enabled) {
        column.sortAble = batchForm.sortAble.value
      }
      promises.push(updatePortalColumn(column, true))
    }

    await Promise.all(promises)
    message.success(`已批量更新 ${targets.length} 个字段`)
    showBatchConfigModal.value = false
    getTableConfigByName(tableConfig.value.name)
  } catch (error: any) {
    message.error('批量更新失败: ' + (error?.message || '未知错误'))
  } finally {
    batchApplying.value = false
  }
}
// ===== 批量字段配置 END =====

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
  if (!uploadTableConfigRef.value || typeof uploadTableConfigRef.value.showUploadDialogBox !== 'function') {
    console.warn('uploadTableConfigRef not ready or missing showUploadDialogBox')
    return
  }
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

// 通用图表导出配置
const handleExportChartConfig = async () => {
  const tableId = tableConfig.value?.name
  if (!tableId) {
    message.warning('请先选择表格配置')
    return
  }
  chartExporting.value = true
  try {
    const [dashRes, statRes] = await Promise.all([
      getCommonDashboard(tableId),
      getCommonStatistic(tableId)
    ])
    const dashboards = dashRes.payload || []
    const statistics = statRes.payload || []
    // 调试：打印导出的指标树结构（验证是否带 pid 和 children 层级）
    const dumpTree = (nodes: any[], depth = 0): string => {
      return nodes.map(n => {
        const prefix = '  '.repeat(depth)
        const childCount = n.children?.length || 0
        const line = `${prefix}- [id=${n.id}, pid=${n.pid}] ${n.title} (children=${childCount})`
        return childCount > 0 ? `${line}\n${dumpTree(n.children, depth + 1)}` : line
      }).join('\n')
    }
    console.log('[ChartExport] 导出指标树结构:\n' + dumpTree(statistics))
    console.log('[ChartExport] 原始 statistics 数据:', JSON.parse(JSON.stringify(statistics)))
    if (!dashboards.length && !statistics.length) {
      message.warning('暂无可导出的图表配置')
      return
    }
    downloadJsonConfig(`${tableId}-通用图表配置`, {
      type: 'dashboard',
      portalName: tableId,
      exportTime: new Date().toISOString(),
      data: {
        dashboards,
        statistics
      }
    })
    message.success('导出成功')
  } catch (error: any) {
    message.error('导出失败: ' + (error?.message || '未知错误'))
  } finally {
    chartExporting.value = false
  }
}

// 通用图表导入配置
const handleChartFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  target.value = ''

  try {
    const parsed = await readJsonFile(file)
    const data = parsed.data || {}
    const dashboards = data.dashboards || []
    const statistics = data.statistics || []
    if (!dashboards.length && !statistics.length) {
      message.warning('文件中没有可导入的图表配置')
      return
    }
    const tableId = parsed.portalName || tableConfig.value?.name
    if (!tableId) {
      message.warning('无法确定目标表格名称')
      return
    }
    const parts = []
    if (dashboards.length) parts.push(`${dashboards.length} 个图表`)
    if (statistics.length) parts.push(`${statistics.length} 个指标树`)
    Modal.confirm({
      title: '确认导入',
      content: `将导入 ${parts.join(' + ')} 配置到「${tableId}」，确认继续？`,
      okText: '确认导入',
      cancelText: '取消',
      onOk: async () => {
        chartImporting.value = true
        try {
          const counters = { statAdded: 0, statUpdated: 0, dashAdded: 0, dashUpdated: 0 }
          // ID 映射表：oldId → newId（用于重映射 pid 和 commonStatistic）
          const idMap = new Map<string, string>()

          // 1. 导入指标树（查重覆盖 + ID 重映射）
          if (statistics.length) {
            // 获取已有指标树，构建查重映射: title → existing node
            const existingStatRes = await getCommonStatistic(tableId)
            const existingStats: any[] = existingStatRes.payload || []
            const existingStatMap = new Map<string, any>()
            const flattenStats = (nodes: any[]) => {
              for (const n of nodes) {
                if (n.title) existingStatMap.set(n.title, n)
                if (n.children?.length) flattenStats(n.children)
              }
            }
            flattenStats(existingStats)

            // 递归导入指标树节点
            // 跨环境迁移：层级关系完全由导出文件的 children 嵌套结构决定，
            // pid 使用递归传入的父节点新ID（parentNewId），忽略源环境的 pid 值
            const upsertStats = async (nodes: any[], parentNewId: string | null) => {
              for (const node of nodes) {
                const { id: oldId, children, ...statData } = node
                // pid 纯由树形嵌套关系决定（跨环境安全）
                statData.pid = parentNewId
                const existing = node.title ? existingStatMap.get(node.title) : null
                let newId: string
                if (existing?.id) {
                  // 已存在 → 更新
                  await updateCommonStatistic({ ...statData, id: existing.id, customerNumber: '0' })
                  newId = String(existing.id)
                  counters.statUpdated++
                  console.log('[ChartImport] 更新指标:', node.title, 'id=', newId, 'pid=', parentNewId)
                } else {
                  // 不存在 → 新增（payload 是完整实体对象，需提取 id）
                  const res = await addCommonStatistic({ ...statData, customerNumber: '0' })
                  newId = String(res.payload?.id ?? res.payload)
                  existingStatMap.set(node.title, { id: newId })
                  counters.statAdded++
                  console.log('[ChartImport] 新增指标:', node.title, 'newId=', newId, 'pid=', parentNewId)
                }
                // idMap 仅供后续 dashboard 重映射 commonStatistic 引用使用
                if (oldId) idMap.set(String(oldId), newId)
                // 递归处理子节点：子节点的 pid 即为当前节点的新ID
                if (children?.length) {
                  await upsertStats(children, newId)
                }
              }
            }
            await upsertStats(statistics, null)
          }

          // 2. 导入图表项（查重覆盖）
          if (dashboards.length) {
            // 获取已有图表，构建查重映射: title → existing item
            const existingDashRes = await getCommonDashboard(tableId)
            const existingDashes: any[] = existingDashRes.payload || []
            const existingDashMap = new Map<string, any>()
            existingDashes.forEach(d => {
              if (d.title) existingDashMap.set(d.title, d)
            })

            const newDashes: any[] = []
            for (const d of dashboards) {
              const { id: _id, ...dashData } = d
              // 重映射 commonStatistic（指标 ID）
              if (d.commonStatistic) {
                dashData.commonStatistic = idMap.get(String(d.commonStatistic)) || d.commonStatistic
              }
              const existing = d.title ? existingDashMap.get(d.title) : null
              if (existing?.id) {
                // 已存在 → 更新
                await updateEntitySelective('portal/dashboard', { ...dashData, id: existing.id }, undefined, false, false)
                counters.dashUpdated++
              } else {
                // 不存在 → 收集待批量新增
                newDashes.push(dashData)
              }
            }
            if (newDashes.length) {
              await addCommonDashboard(newDashes, tableId)
              counters.dashAdded += newDashes.length
            }
          }

          const parts = []
          if (counters.statAdded || counters.statUpdated) {
            parts.push(`指标树新增 ${counters.statAdded}、更新 ${counters.statUpdated}`)
          }
          if (counters.dashAdded || counters.dashUpdated) {
            parts.push(`图表新增 ${counters.dashAdded}、更新 ${counters.dashUpdated}`)
          }
          message.success(`导入完成：${parts.join('；')}`)
          // 刷新通用图表弹窗内的指标树 + 图表卡片
          if (publicDashboardRef.value && typeof publicDashboardRef.value.refreshAfterConfigChange === 'function') {
            await publicDashboardRef.value.refreshAfterConfigChange()
          }
        } catch (error: any) {
          message.error('导入失败: ' + (error?.message || '未知错误'))
        } finally {
          chartImporting.value = false
        }
      }
    })
  } catch (error: any) {
    message.error('文件解析失败，请确保是有效的JSON文件')
  }
}

const onSearch = (preserveFolderState = false) => {
  // 保存当前文件夹展开状态
  const savedFolderState = preserveFolderState ? { ...expandedFolders } : null
  
  return getPortalList(
    inputTableName.value, 
    selectedRole.value,
    props.dataMode || undefined,
    props.referenceId || undefined
  ).then((res) => {
    tableList.value = res.payload || []

    // 使用nextTick确保 DOM 更新后再处理文件夹展开状态
    nextTick(() => {
      // 如果有搜索词，自动展开包含匹配项的文件夹
      if (inputTableName.value.trim()) {
        autoExpandMatchedFolders()
      } else if (savedFolderState) {
        // 恢复之前保存的文件夹展开状态
        Object.keys(savedFolderState).forEach((key) => {
          expandedFolders[key] = savedFolderState[key]
        })
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

// 字段排序弹框
const showColumnOrderModal = ref(false)
const handleColumnOrderConfirm = (orderedColumns: any[]) => {
  // 更新fieldRecords和tableConfig.columns的顺序
  fieldRecords.value = orderedColumns
  tableConfig.value.columns = orderedColumns
  
  // 提交排序到后端
  const columnOrder = orderedColumns.map((column, index) => ({
    id: column.id,
    title: column.displayName,
    showOrder: index + 1
  }))
  
  updatePortalColumnOrder(columnOrder).then(() => {
    onSearch(true) // 保持文件夹展开状态
  })
}

// 处理弹窗内的快速配置
const handleQuickConfigInModal = (column: any) => {
  // 更新本地数据
  const localColumn = columnMap.get(column.id)
  if (localColumn) {
    Object.assign(localColumn, column)
  }
  
  // 保存到后端
  updatePortalColumn(column, true).then(() => {
    // 静默保存，不刷新整个列表
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

// 按 Portal 粒度添加角色配置（勾选=保留副本，取消=删除副本；与左侧列表同款前缀折叠）
const showAddPortalModal = ref(false)
const addPortalTemplateRole = ref('0')
const addPortalTreeData = ref([] as any[])
const addPortalLeafKeys = ref(new Set<string>())
const addPortalChecked = ref<string[]>([])
const addPortalLoading = ref(false)

const buildPortalTreeData = (items: Array<ValueLabel>) => {
  const root: any[] = []
  const folderMap = new Map<string, any>()
  for (const item of items) {
    const parts = String(item.label).split('-').map(s => s.trim()).filter(Boolean)
    let parentKey = ''
    let level = root
    if (parts.length > 1) {
      for (let i = 0; i < parts.length - 1; i++) {
        const folderName = parts[i]
        const key = parentKey ? `${parentKey}/${folderName}` : folderName
        let node = folderMap.get(key)
        if (!node) {
          node = { title: folderName, key, children: [] }
          folderMap.set(key, node)
          level.push(node)
        }
        level = node.children
        parentKey = key
      }
    }
    addPortalLeafKeys.value.add(String(item.value))
    level.push({ title: item.label, key: String(item.value), isLeaf: true })
  }
  return root
}

const loadAddPortalOptions = async () => {
  addPortalLoading.value = true
  try {
    // 并行取模板全集 + 该角色现有副本（初始勾选 = 现有副本，确定时同步语义）
    const [templateRes, currentRes] = await Promise.all([
      getPortalList(
        '',
        addPortalTemplateRole.value,
        props.dataMode || undefined,
        props.referenceId || undefined
      ),
      getPortalList(
        '',
        selectedRole.value,
        props.dataMode || undefined,
        props.referenceId || undefined
      )
    ])
    const templateItems: Array<ValueLabel> = templateRes.payload || []
    const checkedSet = new Set((currentRes.payload || []).map((item: ValueLabel) => String(item.value)))
    addPortalLeafKeys.value = new Set<string>()
    addPortalTreeData.value = buildPortalTreeData(templateItems)
    addPortalChecked.value = templateItems
      .map((item: ValueLabel) => String(item.value))
      .filter(name => checkedSet.has(name))
  } finally {
    addPortalLoading.value = false
  }
}

const openAddPortalModal = async () => {
  addPortalTemplateRole.value = '0'
  addPortalChecked.value = []
  addPortalTreeData.value = []
  showAddPortalModal.value = true
  await loadAddPortalOptions()
}

const submitAddPortal = async () => {
  // a-tree checkedKeys 含父节点（folder），过滤出 portal 叶子（key = portal name）
  const checked = Array.isArray(addPortalChecked.value) ? addPortalChecked.value : []
  const portalNames = checked.filter(key => addPortalLeafKeys.value.has(key))
  if (portalNames.length === 0) {
    // 全部取消 = 清空该角色全部副本
    await unbindRole(selectedRole.value)
  } else {
    await bindRole(selectedRole.value, addPortalTemplateRole.value, portalNames)
  }
  showAddPortalModal.value = false
  await init()
  onSearch()
}

// 生成Portal配置相关
const showGenerateModal = ref(false)
const generateFormRef = ref()
const generateForm = reactive({
  portalName: '',
  displayName: ''
})

const handleGeneratePortal = async () => {
  try {
    await generateFormRef.value?.validate()
    
    if (!props.generatePortalFn) {
      console.error('缺少generatePortalFn属性')
      return
    }
    
    // 调用父组件传入的生成函数
    await props.generatePortalFn({
      portalName: generateForm.portalName,
      displayName: generateForm.displayName,
      referenceId: props.referenceId!,
      dataMode: props.dataMode!
    })
    
    // 关闭弹窗并重置表单
    showGenerateModal.value = false
    generateForm.portalName = ''
    generateForm.displayName = ''
    
    // 刷新列表
    await onSearch()
  } catch (error) {
    console.error('生成Portal配置失败:', error)
  }
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
    // 从 URL 中识别 tableId 参数
    const urlTableId = getUrlParam<string>('tableId')
    onSearch().then(() => {
      if (urlTableId) {
        const found = tableList.value.find(item => item.value === urlTableId)
        if (found) {
          // 将表格名称填入搜索框，触发文件夹筛选定位
          inputTableName.value = found.label
          autoExpandMatchedFolders()
          // 选中并加载该表格配置
          getTableConfigByName(found.value)
        }
      }
    })
  })
})

// 当外部传入的 dataMode/referenceId 变化（forge/dataset 选择了不同的表）时，
// 需要重新拉取列表并清理当前选中配置，否则会显示上一次的 tableConfig。
watch(
  () => [props.dataMode, props.referenceId] as const,
  async ([newMode, newRef], [oldMode, oldRef]) => {
    // 初次 mounted 会走 onMounted，这里只处理后续变更
    if (newMode === oldMode && newRef === oldRef) return

    // 清理当前选中表配置，避免短暂显示旧数据
    columnDict.length = 0
    columnMap.clear()
    selectedColumnId.value = ''
    tableConfig.value = {}
    fieldRecords.value = []

    // 切换数据源后，角色下拉可能也会影响列表；这里保持当前 selectedRole 不变，仅重拉数据
    await init()
    onSearch()
  },
  { flush: 'post' }
)

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
