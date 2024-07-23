<template>
  <div ref="root" class="root">
    <!-- region 左侧表格筛选栏 -->
    <a-list :data-source="tableList" bordered class="table-list" size="small">
      <template #renderItem="{ item }">
        <a-list-item
          :class="{'activate-item': tableConfig.name === item.value}"
          @click="getTableConfigByName(item.value)">
          <div style="display: flex; justify-content: flex-start">
            <a-dropdown v-if="tableList.length !== 0" :trigger="['contextmenu']">
              <span>{{ item.label }}</span>
              <template v-if="selectedRole === '0'" #overlay>
                <a-menu>
                  <a-menu-item key="1">
                    <a-button
                      shape="text"
                      size="small"
                      @click="openCopyConfigModal(item)"> 复制
                      <template #icon>
                        <CopyOutlined />
                      </template>
                    </a-button>
                  </a-menu-item>
                  <a-menu-item key="2">
                    <a-popconfirm title="注意 即将删除该配置" @confirm="deleteConfig(item.value)">
                      <a-button shape="text" size="small"> 删除
                        <template #icon>
                          <DeleteOutlined />
                        </template>
                      </a-button>
                    </a-popconfirm>
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </div>
        </a-list-item>
      </template>
      <template #header>
        <a-select
          v-model:value="selectedRole"
          :options="roleDictList || []"
          show-search
          style="width: 100%; margin-bottom: 5px"
          @change="init().then(() => onSearch())"
        />
        <a-input-search v-model:value="inputTableName" enter-button placeholder="请输入表格名称" @search="onSearch" />
      </template>
      <template #footer>
        <a-popconfirm title="注意清空该角色的所有配置, 该角色即将使用默认配置" @confirm="cleanPortalConfigByRole">
          <a-button
            v-if="selectedRole !== '0' && tableList.length !== 0"
            shape="round" style="margin-top: 5px; width: 160px"> 清空
            <template #icon>
              <MinusCircleOutlined />
            </template>
          </a-button>
        </a-popconfirm>
        <a-dropdown v-if="selectedRole !== '0' && tableList.length === 0">
          <template #overlay>
            <a-menu @click="handleMenuClick">
              <a-menu-item v-for="role in bindRoleDictList" :key="role.value">
                <UserOutlined />
                {{ role.label }}
              </a-menu-item>
            </a-menu>
          </template>
          <a-button
            shape="round" style="margin-top: 5px; width: 160px"> 初始化
            <template #icon>
              <ForkOutlined />
            </template>
          </a-button>
        </a-dropdown>
      </template>
    </a-list>
    <!-- endregion -->
    <upload-file
      ref="uploadTableConfigRef"
      :upload="importTableConfig"
      @after-confirm="getTableConfigByName(tableConfig.name)" />
    <dialog-box
      v-model:visible="associateDialogBox.show"
      :title="tableConfig.displayName + '关联配置'"
      is-full>
      <portal
        :action-width="0"
        :advance-condition="{
          andOr: '0',
          conditionList:[
            {
              property: 'portalId',
              relation: FILTER_TYPE.EQUAL,
              value: [tableConfig.id]
            },{
              property: 'roleId',
              relation: FILTER_TYPE.EQUAL,
              value: [selectedRole]
            }]
        }"
        :bind-default-value="{portalId: tableConfig.id, roleId: selectedRole}"
        :default-sort-column="[{property:'displayOrder', type:0}]"
        table-id="SysPortalAssociate" />
    </dialog-box>
    <!-- region 右侧编辑栏 -->
    <div v-if="isNotEmpty(tableConfig.name)" class="table-config">
      <!-- region 表格整体配置 -->
      <a-descriptions :column="10" :title="tableConfig.displayName" bordered layout="vertical" size="small">
        <template #extra>
          <a-button style="margin-right: 10px" type="primary" @click="exportTableConfig()">导出配置</a-button>
          <a-button style="margin-right: 10px" type="primary" @click="uploadTableConfig()">导入配置</a-button>
          <a-button style="margin-right: 10px" type="primary" @click="associateTableConfig()">关联配置</a-button>
          <a-button style="margin-right: 10px" type="primary" @click="saveTableConfig(false)">保存</a-button>
        </template>
        <a-descriptions-item
          :span="1"
          label="表格编码">
          <span style="width: 120px;">{{ tableConfig.name }}</span>
        </a-descriptions-item>
        <a-descriptions-item
          :span="1"
          label="表格名称">
          <a-input
            :value="tableConfig.displayName"
            placeholder="输入表格名称"
            @update:value=" v => tableConfig.displayName = v"
          />
        </a-descriptions-item>
        <a-descriptions-item
          :span="1"
          label="只读">
          <a-switch
            v-model:checked="tableConfig.readOnly"
            checkedValue="1"
            style="width: 40px;"
            unCheckedValue="0"
            @change="saveTableConfig"
          />
        </a-descriptions-item>
        <a-descriptions-item
          :span="1"
          label="编辑分栏个数">
          <a-input-number
            :disabled="tableConfig.readOnly === '1'"
            :value="tableConfig.descriptionCount"
            max="32"
            min="1"
            style="width:80px"
            @update:value=" v => {
              tableConfig.descriptionCount = v
              saveTableConfig()
            }"
          />
        </a-descriptions-item>
        <a-descriptions-item
          :span="1"
          label="详情弹框宽度">
          <a-input-number
            :disabled="tableConfig.readOnly === '1'"
            :value="tableConfig.detailWidth"
            max="100"
            min="1"
            style="width:80px"
            @update:value=" v => {
              tableConfig.detailWidth = v
              saveTableConfig()
            }"
          />
        </a-descriptions-item>
        <a-descriptions-item
          :span="1"
          label="新增弹框宽度">
          <a-input-number
            :disabled="tableConfig.readOnly === '1'"
            :value="tableConfig.addWidth"
            max="100"
            min="1"
            style="width:80px"
            @update:value=" v => {
              tableConfig.addWidth = v
              saveTableConfig()
            }"
          />
        </a-descriptions-item>
        <a-descriptions-item
          :span="1"
          label="编辑弹框宽度">
          <a-input-number
            :disabled="tableConfig.readOnly === '1'"
            :value="tableConfig.editWidth"
            max="100"
            min="1"
            style="width:80px"
            @update:value=" v => {
              tableConfig.editWidth = v
              saveTableConfig()
            }"
          />
        </a-descriptions-item>
        <a-descriptions-item
          :span="1"
          label="默认排序字段">
          <div style="display: flex;">
            <arrow-up-outlined
              v-if="tableConfig.sortType"
              @click="() => {
                tableConfig.sortType = !tableConfig.sortType
                saveTableConfig()
              }" />
            <arrow-down-outlined
              v-else
              @click="() => {
                tableConfig.sortType = !tableConfig.sortType
                saveTableConfig()
              }" />
            <a-select
              :bordered="false"
              :options="columnDict || []"
              :value="tableConfig.sortColumn"
              allow-clear
              style="width: 100px"
              @update:value=" v => {
                tableConfig.sortColumn = v
                saveTableConfig()
              }"
            />
          </div>
        </a-descriptions-item>
        <a-descriptions-item
          :span="1"
          label="支持导入">
          <a-switch
            v-model:checked="tableConfig.importAble"
            checkedValue="1"
            style="width: 40px;"
            unCheckedValue="0"
            @change="saveTableConfig"
          />
        </a-descriptions-item>
        <a-descriptions-item
          :span="1"
          label="支持导出">
          <a-switch
            v-model:checked="tableConfig.exportAble"
            checkedValue="1"
            style="width: 40px;"
            unCheckedValue="0"
            @change="saveTableConfig"
          />
        </a-descriptions-item>
        <a-descriptions-item
          :span="1"
          label="表格大小">
          <a-select
            :bordered="false"
            :options="tableSizeDict || []"
            :value="tableConfig.size"
            style="width: 120px"
            @update:value=" v => {
              tableConfig.size = v
              saveTableConfig()
            }"
          />
        </a-descriptions-item>
        <a-descriptions-item
          :span="1"
          label="接口地址">
          <a-input
            :value="tableConfig.url"
            placeholder="输入接口地址"
            @update:value=" v => tableConfig.url = v"
          />
        </a-descriptions-item>
        <a-descriptions-item
          :span="1"
          label="总结栏">
          <a-switch
            v-model:checked="tableConfig.summary"
            checkedValue="1"
            style="width: 40px;"
            unCheckedValue="0"
            @change="saveTableConfig"
          />
        </a-descriptions-item>
        <a-descriptions-item
          :span="1"
          label="id字段">
          <a-select
            :bordered="false"
            :options="[{value: AUTO_UUID_ROW_KEY, label: '自动生成ID'},
                       ...columnDict]"
            :value="tableConfig.idColumn"
            style="width: 100px"
            @update:value=" v => {
              tableConfig.idColumn = v
              saveTableConfig()
            }"
          />
        </a-descriptions-item>
        <a-descriptions-item
          :span="1"
          label="名称字段">
          <a-select
            :bordered="false"
            :options="columnDict || []"
            :value="tableConfig.nameColumn"
            style="width: 100px"
            @update:value=" v => {
              tableConfig.nameColumn = v
              saveTableConfig()
            }"
          />
        </a-descriptions-item>
        <a-descriptions-item
          :span="1"
          label="顺序字段">
          <a-select
            :bordered="false"
            :options="columnDict || []"
            :value="tableConfig.orderColumn"
            allow-clear
            style="width: 100px"
            @update:value=" v => {
              tableConfig.orderColumn = v
              saveTableConfig()
            }"
          />
        </a-descriptions-item>
        <a-descriptions-item
          :span="1"
          label="父id字段">
          <a-select
            :bordered="false"
            :options="columnDict || []"
            :value="tableConfig.pidColumn"
            allow-clear
            style="width: 100px"
            @update:value=" v => {
              tableConfig.pidColumn = v
              saveTableConfig()
            }"
          />
        </a-descriptions-item>
        <a-descriptions-item
          :span="1"
          label="默认查询条件">
          <delete-outlined
            v-if="tableConfig.defaultCondition !== null"
            @click="cleanDefaultCondition" />
          <a-button
            :type="tableConfig.defaultCondition !== null ? 'link' : 'dashed'"
            @click="defaultCondition.show = true">默认筛选条件
          </a-button>
        </a-descriptions-item>
        <a-descriptions-item
          :span="1"
          label="表格拖拽">
          <a-switch
            v-model:checked="tableConfig.tableDrag"
            :disabled="isEmpty(tableConfig.orderColumn)"
            checkedValue="1"
            style="width: 40px;"
            unCheckedValue="0"
            @change="saveTableConfig"
          />
        </a-descriptions-item>
        <a-descriptions-item
          :span="1"
          label="树形拖拽">
          <a-switch
            v-model:checked="tableConfig.treeDrag"
            :disabled="isEmpty(tableConfig.pidColumn)"
            checkedValue="1"
            style="width: 40px;"
            unCheckedValue="0"
            @change="saveTableConfig"
          />
        </a-descriptions-item>
      </a-descriptions>
      <!-- endregion 表格整体配置 -->
      <!-- region 表格字段 -->
      <div style="display: flex">
        <!-- region 表格字段筛选栏 -->
        <s-table
          :columns="[{
            title: '字段列表(拖动调整顺序)',
            align: 'center',
            dataIndex: 'displayName',
            tooltip: {placement: 'left', mouseEnterDelay: 1},
            rowDrag: !columnFiltered,
            showMenu: true
          }]"
          :data-source="fieldRecords"
          :pagination="false"
          :scroll="{y: getTableHeight()}"
          bordered
          deepWatchDataSource
          range-selection="single"
          rowKey="id"
          size="small"
          style="width: 220px;"
          @cell-click="handleColumnSelected"
          @row-drag-end="handleColumnOrderChanged"
        >
          <template #bodyCell="{ column, record}">
            <div
              :style="{textAlign: column.contentAlign || 'left',
                       textOverflow: 'ellipsis',
                       whiteSpace: 'nowrap',
                       overflow: 'hidden',
                       height: '100%'}">{{ strRemoveLF(record[`${column.dataIndex}`]) }}
            </div>
          </template>
          <template #tooltipTitle="{ value }">
            <div v-html="strLF2HtmlLF(value)"></div>
          </template>
          <template #menuIcon="{ filtered }">
            <filter-outlined :class="filtered && 'filter-active'" />
          </template>
          <template
            #menuPopup="{ column, hidePopup, filter: { setSelectedKeys, selectedKeysRef, confirm, clearFilters } }">
            <div style="background-color: white; height: 80px; width: fit-content; padding: 8px 16px 8px 16px;">
              <a-select
                :get-popup-container="(triggerNode) => triggerNode.parentNode"
                :options="[
                  { label: '有效', value: 'enable' },
                  { label: '表格显示', value: 'show' },
                  { label: '详情显示', value: 'detailShow' },
                  { label: '新增显示', value: 'addShow' },
                  { label: '编辑显示', value: 'editShow' }
                ]"
                :placeholder="`查看类型`"
                :showSearch="false"
                :value="selectedKeysRef.value"
                clearable
                style="width: 188px; margin-bottom: 8px; display: block"
                @select="e => {
                  const selectedKey = e ? e : ''
                  setSelectedKeys(selectedKey)
                  handleColumnFilter(selectedKey, confirm, column.key, hidePopup, column, clearFilters)
                }"
              />
              <a-button
                style="width: 100%"
                type="primary"
                @click="handleColumnFilter('', confirm, column.key, hidePopup, column, clearFilters)">
                显示全部
              </a-button>
            </div>
          </template>
          <template #contextmenuPopup="args">
            <ul class="popup">
              <li
                class="popup-item"
                @click="setOrderToTop(args)">
                <vertical-align-top-outlined />
                置顶
              </li>
              <li
                class="popup-item"
                @click="setOrderToBottom(args)">
                <vertical-align-bottom-outlined />
                置底
              </li>
            </ul>
          </template>
        </s-table>
        <!-- endregion -->
        <!-- region 表格字段编辑栏 -->
        <div v-if="selectedColumnId !== ''" style="width: 100%; margin-top: 5px; margin-left: 10px">
          <a-descriptions
            :column="8"
            :title="'基础信息: ' + strRemoveLF(columnMap.get(selectedColumnId).displayName) + '(' + columnMap.get(selectedColumnId).property + ')'"
            bordered
            layout="vertical"
            size="small">
            <template #extra>
              <a-button style="margin-right: 10px" type="primary" @click="saveTableColumn(false)">保存</a-button>
            </template>
            <!-- region 字段基础信息 -->
            <a-descriptions-item
              :span="1"
              label="是否有效">
              <a-switch
                v-model:checked="columnMap.get(selectedColumnId).enable"
                checkedValue="1"
                unCheckedValue="0"
                @change="saveTableColumn"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="字段名称">
              <a-input
                :value="columnMap.get(selectedColumnId).displayName"
                placeholder="输入字段名称"
                @update:value=" v => columnMap.get(selectedColumnId).displayName = v"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="字段类型">
              <a-select
                :bordered="false"
                :options="fieldTypeDict || []"
                :value="columnMap.get(selectedColumnId).fieldType"
                style="width: 120px"
                @update:value=" v => {

                  if(columnMap.get(selectedColumnId).fieldType !== v) {
                    if(v === FIELD_TYPE.MONEY) {
                      columnMap.get(selectedColumnId).reference = '2,10000'
                    } else {
                      columnMap.get(selectedColumnId).reference = null
                    }
                    columnMap.get(selectedColumnId).dbField = null
                  }
                  columnMap.get(selectedColumnId).fieldType = v
                  saveTableColumn()
                }"
              />
            </a-descriptions-item>
            <a-descriptions-item
              v-if="columnMap.get(selectedColumnId).fieldType === FIELD_TYPE.MONEY"
              :span="1"
              label="显示格式(精度,单位)">
              <a-input
                :value="columnMap.get(selectedColumnId).reference"
                placeholder="显示格式(精度,单位)"
                @update:value=" v => columnMap.get(selectedColumnId).reference = v"
              />
            </a-descriptions-item>
            <a-descriptions-item
              v-if="columnMap.get(selectedColumnId).fieldType === FIELD_TYPE.PERCENT"
              :span="1"
              label="显示格式(精度,单位)">
              <a-input
                :value="columnMap.get(selectedColumnId).reference"
                placeholder="显示格式(精度,单位)"
                @update:value=" v => columnMap.get(selectedColumnId).reference = v"
              />
            </a-descriptions-item>
            <a-descriptions-item
              v-if="columnMap.get(selectedColumnId).fieldType === FIELD_TYPE.SELECT ||
                columnMap.get(selectedColumnId).fieldType === FIELD_TYPE.ENTITY ||
                columnMap.get(selectedColumnId).fieldType === FIELD_TYPE.ENTITY_CONDITION ||
                columnMap.get(selectedColumnId).fieldType === FIELD_TYPE.TREE ||
                columnMap.get(selectedColumnId).fieldType === FIELD_TYPE.SELECT_MULTI_IN_ONE ||
                columnMap.get(selectedColumnId).fieldType === FIELD_TYPE.TREE_MULTI_IN_ONE"
              :span="1"
              label="相关引用">
              <a-select
                v-if="columnMap.get(selectedColumnId).fieldType === FIELD_TYPE.SELECT ||
                  columnMap.get(selectedColumnId).fieldType === FIELD_TYPE.TREE ||
                  columnMap.get(selectedColumnId).fieldType === FIELD_TYPE.SELECT_MULTI_IN_ONE ||
                  columnMap.get(selectedColumnId).fieldType === FIELD_TYPE.TREE_MULTI_IN_ONE"
                :filter-option="filterOption"
                :options="sysDictList"
                :value="columnMap.get(selectedColumnId).reference"
                placeholder="输入相关引用名称"
                show-search
                style="width: 150px"
                @update:value=" v => {
                  columnMap.get(selectedColumnId).reference = v
                  saveTableColumn()
                } "
              />
              <a-select
                v-else-if="columnMap.get(selectedColumnId).fieldType === FIELD_TYPE.ENTITY"
                :filter-option="filterOption"
                :options="tableList"
                :value="columnMap.get(selectedColumnId).reference"
                placeholder="输入相关引用名称"
                show-search
                style="width: 150px"
                @update:value="v => {
                  if(columnMap.get(selectedColumnId).reference !== v) {
                    columnMap.get(selectedColumnId).dbField = null
                    columnMap.get(selectedColumnId).entityField = null
                  }
                  getEntityConfig(v)
                  columnMap.get(selectedColumnId).reference = v
                  saveTableColumn()
                }"
              />
              <a-select
                v-else-if="columnMap.get(selectedColumnId).fieldType === FIELD_TYPE.ENTITY_CONDITION"
                :filter-option="filterOption"
                :options="log(columnDict) && columnDict"
                :value="columnMap.get(selectedColumnId).reference"
                placeholder="输入存放实体名称字段"
                show-search
                style="width: 150px"
                @update:value="v => {
                  if(columnMap.get(selectedColumnId).reference !== v) {
                    columnMap.get(selectedColumnId).dbField = null
                    columnMap.get(selectedColumnId).entityField = null
                  }
                  columnMap.get(selectedColumnId).reference = v
                  saveTableColumn()
                }"
              />
            </a-descriptions-item>
            <a-descriptions-item
              v-else
              :span="1"
              label="" />
            <template
              v-if="columnMap.get(selectedColumnId).fieldType === FIELD_TYPE.ENTITY">
              <a-descriptions-item
                v-if="columnMap.get(selectedColumnId).fieldType === FIELD_TYPE.ENTITY"
                :span="2"
                label="引用实体字段">
                <a-select
                  :options="entityColumnDict"
                  :value="columnMap.get(selectedColumnId).entityField"
                  style="width: 150px"
                  @update:value=" v => {
                    columnMap.get(selectedColumnId).entityField = v
                    saveTableColumn()
                  }"
                />
              </a-descriptions-item>
              <a-descriptions-item
                v-if="columnMap.get(selectedColumnId).fieldType === FIELD_TYPE.ENTITY"
                :span="1"
                label="本体操作字段">
                <a-select
                  :filter-option="filterOption"
                  :options="columnDict"
                  :value="columnMap.get(selectedColumnId).dbField"
                  show-search
                  style="width: 150px"
                  @update:value=" v => {
                    columnMap.get(selectedColumnId).dbField = v
                    saveTableColumn()
                  }"
                />
              </a-descriptions-item>
              <a-descriptions-item
                v-if="columnMap.get(selectedColumnId).fieldType === FIELD_TYPE.ENTITY"
                :span="1"
                label="关联参数">
                <a-button type="link" @click="entityConditionDrawOpen">设置条件</a-button>
              </a-descriptions-item>
            </template>
            <template
              v-if="columnMap.get(selectedColumnId).fieldType === FIELD_TYPE.SELECT &&
                columnMap.get(selectedColumnId).mobileDisplayType === '3'">
              <a-descriptions-item
                :span="2"
                label="徽标颜色">
                <a-input
                  :value="columnMap.get(selectedColumnId).entityField"
                  placeholder="按选项顺序(逗号隔开)"
                  @update:value=" v => columnMap.get(selectedColumnId).entityField = v"
                />
              </a-descriptions-item>
            </template>
            <template v-else>
              <a-descriptions-item
                :span="4"
                label="" />
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
            style="margin-top: 10px">
            <a-descriptions-item
              :span="1"
              label="是否显示">
              <a-switch
                v-model:checked="columnMap.get(selectedColumnId).show"
                :disabled="columnMap.get(selectedColumnId).enable !== '1'"
                checkedValue="1"
                unCheckedValue="0"
                @change="saveTableColumn"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="内容宽度（px）">
              <a-input-number
                :disabled="columnMap.get(selectedColumnId).enable !== '1'
                  || columnMap.get(selectedColumnId).show !== '1'"
                :value="columnMap.get(selectedColumnId).width"
                max="1000"
                min="0"
                placeholder="内容宽度 0为自动"
                style="width:100px"
                @update:value=" v => columnMap.get(selectedColumnId).width = v"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="移动端显示">
              <a-select
                :bordered="false"
                :disabled="columnMap.get(selectedColumnId).enable !== '1'
                  || columnMap.get(selectedColumnId).show !== '1'"
                :options="mobileDisplayTypeDict || []"
                :value="columnMap.get(selectedColumnId).mobileDisplayType"
                style="width: 100px"
                @update:value=" v => {
                  columnMap.get(selectedColumnId).mobileDisplayType = v
                  saveTableColumn()
                }"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="对齐方式">
              <a-select
                :bordered="false"
                :disabled="columnMap.get(selectedColumnId).enable !== '1'
                  || columnMap.get(selectedColumnId).show !== '1'"
                :options="alignDict || []"
                :value="columnMap.get(selectedColumnId).align"
                style="width: 100px"
                @update:value=" v => {
                  columnMap.get(selectedColumnId).align = v
                  saveTableColumn()
                }"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="表格冻结列">
              <a-switch
                v-model:checked="columnMap.get(selectedColumnId).fixed"
                :disabled="columnMap.get(selectedColumnId).enable !== '1'
                  || columnMap.get(selectedColumnId).show !== '1'"
                checkedValue="1"
                unCheckedValue="0"
                @change="saveTableColumn"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="是否显示提示">
              <a-switch
                v-model:checked="columnMap.get(selectedColumnId).tooltip"
                :disabled="columnMap.get(selectedColumnId).enable !== '1'
                  || columnMap.get(selectedColumnId).show !== '1'"
                checkedValue="1"
                unCheckedValue="0"
                @change="saveTableColumn"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="是否筛选">
              <a-switch
                v-model:checked="columnMap.get(selectedColumnId).filterAble"
                :disabled="columnMap.get(selectedColumnId).enable !== '1'
                  ||columnMap.get(selectedColumnId).show !== '1'"
                checkedValue="1"
                unCheckedValue="0"
                @change="saveTableColumn"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="是否排序">
              <a-switch
                v-model:checked="columnMap.get(selectedColumnId).sortAble"
                :disabled="columnMap.get(selectedColumnId).enable !== '1'
                  || columnMap.get(selectedColumnId).show !== '1'"
                checkedValue="1"
                unCheckedValue="0"
                @change="saveTableColumn"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="汇总">
              <a-switch
                v-model:checked="columnMap.get(selectedColumnId).summaryAble"
                :disabled="columnMap.get(selectedColumnId).enable !== '1'"
                checkedValue="1"
                unCheckedValue="0"
                @change="saveTableColumn"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="表格编辑">
              <a-switch
                v-model:checked="columnMap.get(selectedColumnId).editAble"
                :disabled="columnMap.get(selectedColumnId).enable !== '1'
                  || columnMap.get(selectedColumnId).show !== '1'"
                checkedValue="1"
                unCheckedValue="0"
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
            style="margin-top: 10px">
            <template #extra>
              <a-input
                :disabled="columnMap.get(selectedColumnId).enable !== '1'"
                :value="columnMap.get(selectedColumnId).displayGroupName"
                placeholder="输入分组名称"
                @update:value=" v => columnMap.get(selectedColumnId).displayGroupName = v"
              />
            </template>
            <a-descriptions-item
              :span="1"
              label="详情显示">
              <a-switch
                v-model:checked="columnMap.get(selectedColumnId).detailShow"
                :disabled="columnMap.get(selectedColumnId).enable !== '1'"
                checkedValue="1"
                unCheckedValue="0"
                @change="saveTableColumn"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="详情显示格数">
              <a-input-number
                :disabled="columnMap.get(selectedColumnId).enable !== '1' || columnMap.get(selectedColumnId).detailShow !== '1'"
                :value="columnMap.get(selectedColumnId).detailSize"
                max="32"
                min="1"
                placeholder="详情显示格数"
                style="width:80px"
                @update:value=" v => columnMap.get(selectedColumnId).detailSize = v"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="详情占位格数">
              <a-input-number
                :disabled="columnMap.get(selectedColumnId).enable !== '1' || columnMap.get(selectedColumnId).detailShow !== '1'"
                :max="tableConfig.descriptionCount"
                :value="columnMap.get(selectedColumnId).detailPadding"
                min="0"
                placeholder="详情占位宽度"
                style="width:80px"
                @update:value=" v => columnMap.get(selectedColumnId).detailPadding = v"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="是否必填">
              <a-switch
                v-model:checked="columnMap.get(selectedColumnId).required"
                :disabled="columnMap.get(selectedColumnId).enable !== '1'
                  || ( columnMap.get(selectedColumnId).editAble !== '1'
                    && columnMap.get(selectedColumnId).addShow !== '1')"
                checkedValue="1"
                unCheckedValue="0"
                @change="saveTableColumn"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="默认值">
              <a-input
                :disabled="columnMap.get(selectedColumnId).enable !== '1'"
                :value="columnMap.get(selectedColumnId).defaultValue"
                placeholder="默认值"
                @update:value=" v => columnMap.get(selectedColumnId).defaultValue = v"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="编辑显示">
              <a-switch
                v-model:checked="columnMap.get(selectedColumnId).editShow"
                :disabled="columnMap.get(selectedColumnId).enable !== '1'"
                checkedValue="1"
                unCheckedValue="0"
                @change="saveTableColumn"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="编辑显示格数">
              <a-input-number
                :disabled="columnMap.get(selectedColumnId).editShow !== '1' || columnMap.get(selectedColumnId).enable !== '1'"
                :max="tableConfig.descriptionCount"
                :value="columnMap.get(selectedColumnId).editSize"
                min="1"
                placeholder="编辑显示格数"
                style="width:80px"
                @update:value=" v => columnMap.get(selectedColumnId).editSize = v"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="编辑占位格数">
              <a-input-number
                :disabled="columnMap.get(selectedColumnId).editShow !== '1' || columnMap.get(selectedColumnId).enable !== '1'"
                :max="tableConfig.descriptionCount"
                :value="columnMap.get(selectedColumnId).editPadding"
                min="0"
                placeholder="编辑占位宽度"
                style="width:80px"
                @update:value=" v => columnMap.get(selectedColumnId).editPadding = v"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="编辑锁定">
              <a-switch
                v-model:checked="columnMap.get(selectedColumnId).editDisabled"
                :disabled="columnMap.get(selectedColumnId).editShow !== '1' || columnMap.get(selectedColumnId).enable !== '1'"
                checkedValue="1"
                unCheckedValue="0"
                @change="saveTableColumn"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="最小值(最小长度)">
              <a-input
                :disabled="columnMap.get(selectedColumnId).enable !== '1'"
                :value="columnMap.get(selectedColumnId).min"
                placeholder="输入最小值(最小长度)"
                @update:value=" v => columnMap.get(selectedColumnId).min = v"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="新增显示">
              <a-switch
                v-model:checked="columnMap.get(selectedColumnId).addShow"
                :disabled="columnMap.get(selectedColumnId).enable !== '1'"
                checkedValue="1"
                unCheckedValue="0"
                @change="saveTableColumn"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="新增显示格数">
              <a-input-number
                :disabled="columnMap.get(selectedColumnId).addShow !== '1' || columnMap.get(selectedColumnId).enable !== '1'"
                :max="tableConfig.descriptionCount"
                :value="columnMap.get(selectedColumnId).addSize"
                min="1"
                placeholder="新增显示格数"
                style="width:80px"
                @update:value=" v => columnMap.get(selectedColumnId).addSize = v"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="新增占位格数">
              <a-input-number
                :disabled="columnMap.get(selectedColumnId).addShow !== '1' || columnMap.get(selectedColumnId).enable !== '1'"
                :max="tableConfig.descriptionCount"
                :value="columnMap.get(selectedColumnId).addPadding"
                min="0"
                placeholder="新增占位宽度"
                style="width:80px"
                @update:value=" v => columnMap.get(selectedColumnId).addPadding = v"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="新增锁定">
              <a-switch
                v-model:checked="columnMap.get(selectedColumnId).addDisabled"
                :disabled="columnMap.get(selectedColumnId).addShow !== '1' || columnMap.get(selectedColumnId).enable !== '1'"
                checkedValue="1"
                unCheckedValue="0"
                @change="saveTableColumn"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="最大值(最大长度)">
              <a-input
                :disabled="columnMap.get(selectedColumnId).enable !== '1'"
                :value="columnMap.get(selectedColumnId).max"
                placeholder="输入最大值(最大长度)"
                @update:value=" v => columnMap.get(selectedColumnId).max = v"
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
      <a-form ref="copyConfigModalRef" :model="copyConfigModal">
        <a-form-item
          :rules="[
            { required: true, message: '请输入表格编号' },
            { validator: checkConfigIdExisted, trigger: 'blur' }]"
          has-feedback
          label="表格配置代码"
          name="configId">
          <a-input
            v-model:value="copyConfigModal.configId" autocomplete="off" placeholder="表格配置代码" />
        </a-form-item>
        <a-form-item
          :rules="[{ required: true, message: '请输入表格名称' }]"
          has-feedback
          label="表格配置名称"
          name="configDescription">
          <a-input
            v-model:value="copyConfigModal.configDescription" autocomplete="off" placeholder="表格配置名称" />
        </a-form-item>
      </a-form>
    </a-modal>
    <!-- endregion -->
    <!-- region 关联实体查询条件 -->
    <portal-advanced-search-modal
      :advanced-condition="entityCondition"
      @confirm="saveEntityCondition" />
    <!-- endregion 关联实体查询条件 -->
    <portal-advanced-search-modal
      :advanced-condition="defaultCondition"
      @confirm="saveDefaultCondition" />
  </div>
</template>
<script lang="ts" setup>
import { Ref } from 'vue'
import { isEmpty, isNotEmpty, log, strLF2HtmlLF, strRemoveLF, updateTableSize } from '@/framework/utils/common'
import { ColumnType, FIELD_TYPE, FILTER_TYPE } from "@/framework/components/common/Portal/type"
import {
  bindRole,
  copyPortalConfig,
  deletePortalConfig,
  existedPortalConfig,
  exportPortalConfig,
  getBindRole,
  getPortalConfig,
  getPortalList,
  importPortalConfig,
  unbindRole,
  updatePortalColumn,
  updatePortalColumnOrder,
  updatePortalConfig
} from '@/framework/apis/portal/config'
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CopyOutlined,
  DeleteOutlined,
  FilterOutlined,
  ForkOutlined,
  MinusCircleOutlined,
  UserOutlined,
  VerticalAlignBottomOutlined,
  VerticalAlignTopOutlined
} from '@ant-design/icons-vue'
import { ValueLabel } from '@/framework/utils/type'
import { dictStore } from '@/framework/store/common'
import { CellRenderArgs } from '@surely-vue/table'
import { ConditionType } from '@/framework/components/common/AdvancedSearch/type'
import { AUTO } from '@/framework/utils/constant'
import * as _ from 'lodash'
import { getRoleList } from '@/framework/apis/admin/rolePermission'
import { MenuProps } from 'ant-design-vue'
import dayjs from 'dayjs'
import UploadFile from '@/framework/components/common/UploadFile/index.vue'
import { AUTO_UUID_ROW_KEY } from '@/framework/components/common/Portal/constant'
import { filterOption } from '@/framework/components/common/utils'

const dict = dictStore()
let inputTableName: Ref<string> = ref('')
let tableList: Ref<Array<ValueLabel>> = ref([] as Array<ValueLabel>)
let sysDictList = reactive([] as Array<any>)
let tableSizeDict = reactive([] as Array<ValueLabel>)
let fieldTypeDict = reactive([] as Array<ValueLabel>)
let mobileDisplayTypeDict = reactive([] as Array<ValueLabel>)
let alignDict = reactive([] as Array<ValueLabel>)
let columnDict = reactive([] as Array<ValueLabel>)
let columnMap = reactive(new Map())
let selectedColumnId = ref('')
let columnFiltered: Ref<boolean> = ref(false)
let roleDictList = reactive([{value: '0', label: '默认配置'}] as Array<ValueLabel>)
let bindRoleDictList = reactive([] as Array<ValueLabel>)
let selectedRole = ref('0')
// 关联属性
const entityConfig = ref({} as any)
const entityCondition = reactive({
  show: false,
  columns: [] as Array<ColumnType>,
  title: '',
  condition: {} as ConditionType | undefined,
  key: 0,
  okText: '保存'
})
const entityColumnDict = reactive([] as Array<ValueLabel>)
// 默认查询条件
const defaultCondition = reactive({
  show: false,
  columnArray: [] as Array<any>,
  title: '',
  condition: {} as ConditionType | undefined,
  key: 0,
  okText: '保存'
})
let copyConfigModal = reactive({
  visible: false,
  configId: '',
  configDescription: '',
  title: ''
})
const checkConfigIdExisted = () => {
  return existedPortalConfig(copyConfigModal.configId, selectedRole.value)
}
const openCopyConfigModal = (item: any) => {
  copyConfigModal.visible = true
  copyConfigModal.title = item.label + '(' + item.value + ')'
}
const copyConfig = () => {
  copyPortalConfig(tableConfig.value.id, copyConfigModal.configId, copyConfigModal.configDescription).then(() => {
    copyConfigModal.visible = false
    onSearch()
  })

}

const getEntityConfig = (tableId: string) => {
  getPortalConfig(tableId, selectedRole.value).then(res => {
    entityColumnDict.length = 0
    entityConfig.value = res.payload
    entityConfig.value.columns.forEach((column: { property: any; displayName: any; }) => {
      entityColumnDict.push({value: column.property, label: column.displayName} as ValueLabel)
    })
    if (selectedColumnId.value && isEmpty(columnMap.get(selectedColumnId.value)?.entityField)) {
      columnMap.get(selectedColumnId.value).entityField = entityConfig.value.idColumn
    }
  })
}

const tableConfig = ref({} as any)
const fieldRecords = ref([] as Array<any>)
const getTableConfigByName = (item: any) => {
  getPortalConfig(item, selectedRole.value).then(async res => {
    columnDict.length = 0
    columnMap.clear()
    selectedColumnId.value = ''
    entityCondition.condition = {} as ConditionType
    defaultCondition.columnArray = []
    tableConfig.value = res.payload
    const promiseList = [] as Array<Promise<any>>
    tableConfig.value.columns.forEach((column: { property: any; displayName: any; id: any; fieldType: any; reference: string; filterAble: string }) => {
      columnDict.push({value: column.property, label: strRemoveLF(column.displayName)} as ValueLabel)
      columnMap.set(column.id, column)
      if (column.fieldType === FIELD_TYPE.ENTITY) {
        getEntityConfig(column.reference)
      }
      if (column.filterAble === '1') {
        const columnConfig = {
          title: column.displayName,
          key: column.property,
          fieldType: column.fieldType,
          referenceDictOption: null
        }
        if (column.fieldType === FIELD_TYPE.SELECT ||
          column.fieldType === FIELD_TYPE.TREE ||
          column.fieldType === FIELD_TYPE.SELECT_MULTI_IN_ONE ||
          column.fieldType === FIELD_TYPE.TREE_MULTI_IN_ONE) {
          let promise = dict.getDict(column.reference).then((option: any) => columnConfig.referenceDictOption = option)
          promiseList.push(promise)
        }
        if (column.filterAble) {
          defaultCondition.columnArray.push(columnConfig)
        }
      }
    })
    await Promise.all(promiseList)
    fieldRecords.value = [...tableConfig.value.columns]
    defaultCondition.condition = tableConfig.value.defaultCondition
    const sortConfig = JSON.parse(tableConfig.value.defaultSort)[0]
    tableConfig.value.sortType = sortConfig.type === 0
    tableConfig.value.sortColumn = sortConfig.property
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

const saveTableConfig = (silent = true) => {
  tableConfig.value.defaultSort = JSON.stringify([{
    property: tableConfig.value.sortColumn,
    type: tableConfig.value.sortType ? 0 : 1
  }])
  updatePortalConfig(tableConfig.value, silent).then(() => onSearch())
}

const saveTableColumn = (silent = true) => {
  updatePortalColumn(columnMap.get(selectedColumnId.value), silent).then(() => getPortalConfig(tableConfig.value.name, selectedRole.value))
}

const exportTableConfig = () => {
  exportPortalConfig(tableConfig.value.name, selectedRole.value,
    tableConfig.value.displayName + '-' + selectedRole.value + '-' + dayjs().format('YYYYMMDDHHmmss') + '.dat')
}

const uploadTableConfigRef = ref()
const uploadTableConfig = () => {
  uploadTableConfigRef.value.showUploadDialogBox('.dat')
}
const importTableConfig = (file: any, onUploadProgress: any) => {
  return importPortalConfig(file, onUploadProgress)
}

const associateDialogBox = reactive({
  show: false
})
const associateTableConfig = () => {
  associateDialogBox.show = true
}

const onSearch = () => {
  getPortalList(inputTableName.value, selectedRole.value).then((res) => {
    tableList.value = res.payload || []
  })
}

const handleColumnFilter = (selectedKey: any, confirm: any, dataIndex: any, hidePopup: any, column: any, clearFilters: any) => {
  fieldRecords.value.length = 0
  if (selectedKey === '') {
    fieldRecords.value = [...tableConfig.value.columns]
    columnFiltered.value = false
    clearFilters()
  } else {
    fieldRecords.value = tableConfig.value.columns.filter
    ((record: { [x: string]: string; enable: string; }) =>
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
        showOrder: index++
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
  entityCondition.columns = entityConfig.value.columns.filter(
    (item: {
      filterAble: string;
      show: string;
    }) => item.filterAble === '1' && item.show === '1')
    .map((item: any) => ({
      title: item.displayName,
      key: item.property,
      referenceDict: item.reference,
      fieldType: item.fieldType
    }))
  for (let item of entityCondition.columns) {
    if (item.fieldType === FIELD_TYPE.SELECT && isNotEmpty(item.referenceDict)) {
      item.referenceDictOption = await dict.getDict(item.referenceDict) || []
    }
  }
  if (isNotEmpty(columnMap.get(selectedColumnId.value).entityCondition)) {
    console.log('json parse', columnMap.get(selectedColumnId.value).entityCondition)
    entityCondition.condition = JSON.parse(columnMap.get(selectedColumnId.value).entityCondition)
  } else {
    entityCondition.condition = {} as ConditionType
  }
  entityCondition.show = true
  // 强制更新高级查询组件
  entityCondition.key++
  console.log('entityCondition', entityCondition)
}
const saveEntityCondition = (condition: ConditionType) => {
  entityCondition.condition = condition
  columnMap.get(selectedColumnId.value).entityCondition = JSON.stringify(condition)
  saveTableColumn()
}

const saveDefaultCondition = () => {
  console.log(defaultCondition)
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
  roleDictList.push({value: '0', label: '默认配置'} as ValueLabel)
  return Promise.all([
    await dict.getDict('PORTAL_TABLE_SIZE_DICT').then(res => {
      tableSizeDict = res || []
    }),
    await dict.getDict('PORTAL_FIELD_DICT').then(res => {
      fieldTypeDict = res || []
    }),
    await dict.getDict('PORTAL_MOBILE_DISPLAY_TYPE_DICT').then(res => {
      mobileDisplayTypeDict = res || []
    }),
    await dict.getDict('PORTAL_ALIGN_DICT').then(res => {
      alignDict = res || []
    }),
    await dict.getAllDict('').then(res => {
      sysDictList = res || []
    }),
    await getRoleList().then(res => {
      if (res.payload && res.payload.records) {
        for (let role of res.payload.records) {
          roleDictList.push({value: role.roleId, label: role.roleName} as ValueLabel)
        }
      }
    }),
    await getBindRole().then(res => bindRoleDictList = res.payload || [])
  ])
}
const handleMenuClick: MenuProps['onClick'] = async e => {
  await bindRole(selectedRole.value, e.key)
  await init()
  onSearch()
}

const cleanPortalConfigByRole = async () => {
  await unbindRole(selectedRole.value)
  await init()
  onSearch()
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
const _getTableWidth = () => {
  if (tableWidth.value == undefined) return AUTO
  return tableWidth.value - 20
}
const getTableHeight = () => {
  if (tableHeight.value == undefined) return AUTO
  return tableHeight.value
}
const updateTableWidthAndHeight = () => {
  updateTableSize(root, tableWidth, 40, tableHeight, 275)
}
window.addEventListener('resize', _.debounce(updateTableWidthAndHeight, 200))
//endregion

</script>
<style lang="less" scoped>
.root {
  display: flex;
  height: calc(100% - 80px);

  .list-footer-content {
    display: flex;
    justify-content: flex-end;
  }
}

.table-list {
  width: 200px;
  height: calc(100% - 15px);
  box-shadow: 0 4px 10px 0 rgba(69, 89, 120, 0.5);
  margin: 10px 15px;
}

:deep(.table-list .ant-spin-container) {
  max-height: 680px;
  overflow: auto;
  cursor: pointer;
}

:deep(.table-list .ant-spin-container li:hover) {
  background-color: #e6f7ff;
  border-right: 3px solid #1890ff;
}

.table-config {
  width: calc(100% - 250px);
  margin-top: 10px;
}

:deep(.ant-descriptions-header) {
  margin-bottom: 5px !important;
}

.activate-item {
  background-color: #e6f7ff;
  border-right: 3px solid #1890ff;
}

.column-list {
  width: 250px;
  height: calc(100% - 245px);
  margin: 10px 0;
}

:deep(.column-list .ant-spin-container) {
  max-height: 490px;
  overflow: auto;
  cursor: pointer;
}

:deep(.column-list .ant-spin-container li:hover) {
  background-color: #e6f7ff;
  border-right: 3px solid #1890ff;
}

:deep(.surely-table-popup-container-inner) {
  width: 260px;
  height: 400px;
}

:deep(.surely-table-popup-container) {
  background-color: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

.filter-active {
  color: var(--surely-table-primary-color) !important;
  opacity: 1 !important;
}

.popup {
  width: 100px;
  height: 20px;

  .popup-item {
    cursor: pointer;
    padding: 8px;

    &:hover {
      background-color: var(--surely-table-row-hover-bg);
    }

    &.disabled {
      color: var(--surely-table-disabled-color);
      cursor: not-allowed;
    }
  }
}
</style>
