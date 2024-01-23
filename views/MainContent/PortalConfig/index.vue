<template>
  <div ref="root" class="root">
    <!-- region 左侧表格筛选栏 -->
    <a-list :data-source="tableList" bordered class="table-list" size="small">
      <template #renderItem="{ item }">
        <a-list-item :class="{'activate-item': tableConfig.name === item.value}" @click="getTableConfigByName(item)">
          <div style="display: flex; justify-content: flex-start">
            {{ item.label }}
          </div>
        </a-list-item>
      </template>
      <template #header>
        <a-input-search v-model:value="inputTableName" enter-button placeholder="请输入表格名称" @search="onSearch" />
      </template>
      <template #footer>
        <div style="display: flex; justify-content: space-between">
          <a-button :disabled="isEmpty(tableConfig.id)" shape="round" @click="openCopyConfigModal"> 复制
            <template #icon>
              <CopyOutlined />
            </template>
          </a-button>
          <a-modal
            v-model:visible="copyConfigModal.visible"
            :title="tableConfig.displayName + '(' + tableConfig.name + ')'"
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
          <a-popconfirm title="注意 即将删除该配置" @confirm="deleteConfig()">
            <a-button :disabled="isEmpty(tableConfig.id)" shape="round"> 删除
              <template #icon>
                <MinusCircleOutlined />
              </template>
            </a-button>
          </a-popconfirm>
        </div>
      </template>
    </a-list>
    <!-- endregion -->
    <!-- region 右侧编辑栏 -->
    <div v-if="isNotEmpty(tableConfig.name)" class="table-config">
      <!-- region 表格整体配置 -->
      <a-descriptions :column="10" :title="tableConfig.displayName" bordered layout="vertical" size="small">
        <template #extra>
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
          label="不可编辑">
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
          label="" />
        <a-descriptions-item
          :span="1"
          label="表格大小">
          <a-select
            :bordered="false"
            :options="tableSizeDict || []"
            :value="tableConfig.size"
            style="width: 150px"
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
            :options="columnDict || []"
            :value="tableConfig.idColumn"
            style="width: 150px"
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
            style="width: 150px"
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
            style="width: 150px"
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
            style="width: 120px"
            @update:value=" v => {
              tableConfig.pidColumn = v
              saveTableConfig()
            }"
          />
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
            tooltip: {placement: 'topLeft', mouseEnterDelay: 0.5},
            rowDrag: true,
            filters: [
              { text: '表格显示', value: 'show' },
              { text: '详情显示', value: 'detailShow' },
              { text: '新增显示', value: 'addShow' },
              { text: '编辑显示', value: 'editShow' }
            ],
            onFilter: (value: string, record: any) => record.enable === '1' && record[`${value}`] === '1'
          }]"
          :data-source="tableConfig.columns"
          :pagination="false"
          :scroll="{y: getTableHeight()}"
          bordered
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
                       height: '100%'}">{{ record[`${column.dataIndex}`] }}
            </div>
          </template>
          <template #tooltipTitle="{ value }">
            {{ value }}
          </template>
        </s-table>
        <!-- endregion -->
        <!-- region 表格字段编辑栏 -->
        <div v-if="selectedColumnId !== ''" style="width: 100%; margin-top: 10px; margin-left: 10px">
          <a-descriptions :column="8" :title="tableConfig.displayName" bordered layout="vertical" size="small">
            <template #extra>
              <a-button style="margin-right: 10px" type="primary" @click="saveTableColumn(false)">保存</a-button>
            </template>
            <!-- region 字段基础信息 -->
            <a-descriptions-item
              :label="'基础信息: ' + columnMap.get(selectedColumnId).displayName + '(' + columnMap.get(selectedColumnId).property + ')'"
              :span="8" />
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
                    columnMap.get(selectedColumnId).reference = null
                    columnMap.get(selectedColumnId).dbField = null
                  }
                  columnMap.get(selectedColumnId).fieldType = v
                  saveTableColumn()
                }"
              />
            </a-descriptions-item>
            <a-descriptions-item
              v-if="columnMap.get(selectedColumnId).fieldType === FIELD_TYPE.SELECT ||
                columnMap.get(selectedColumnId).fieldType === FIELD_TYPE.ENTITY"
              :span="1"
              label="相关引用">
              <a-input
                v-if="columnMap.get(selectedColumnId).fieldType === FIELD_TYPE.SELECT"
                :value="columnMap.get(selectedColumnId).reference"
                placeholder="输入相关引用名称"
                @update:value=" v => columnMap.get(selectedColumnId).reference = v "
              />
              <a-select
                v-else-if="columnMap.get(selectedColumnId).fieldType === FIELD_TYPE.ENTITY"
                :options="tableList"
                :value="columnMap.get(selectedColumnId).reference"
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
            </a-descriptions-item>
            <a-descriptions-item
              v-else
              :span="1"
              label="" />
            <template v-if="columnMap.get(selectedColumnId).fieldType === FIELD_TYPE.ENTITY">
              <a-descriptions-item
                v-if="columnMap.get(selectedColumnId).fieldType === FIELD_TYPE.ENTITY"
                :span="2"
                label="实体字段">
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
                label="操作字段">
                <a-select
                  :options="columnDict"
                  :value="columnMap.get(selectedColumnId).dbField"
                  style="width: 150px"
                  @update:value=" v => {
                    columnMap.get(selectedColumnId).dbField = v
                    columnMap.get(selectedColumnId).editAble = '1'
                    saveTableColumn()
                  }"
                />
              </a-descriptions-item>
              <a-descriptions-item
                v-if="columnMap.get(selectedColumnId).fieldType === FIELD_TYPE.ENTITY"
                :span="1"
                label="关联参数">
                <a-button type="link" @click="entityConditionDrawOpen()">设置条件</a-button>
              </a-descriptions-item>
            </template>
            <template v-else>
              <a-descriptions-item
                :span="4"
                label="" />
            </template>
            <a-descriptions-item
              :span="8" />
            <!-- endregion -->
            <!-- region 表格显示 -->
            <a-descriptions-item
              :span="8"
              label="表格显示" />
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
                style="width:120px"
                @update:value=" v => columnMap.get(selectedColumnId).width = v"
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
                style="width: 120px"
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
              label="是否显示tooltip">
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
            <a-descriptions-item
              :span="8" />
            <!-- endregion -->
            <!-- region 弹框显示 -->
            <a-descriptions-item
              :span="8"
              label="弹框显示" />
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
                :disabled="columnMap.get(selectedColumnId).enable !== '1'"
                :value="columnMap.get(selectedColumnId).detailSize"
                max="32"
                min="1"
                placeholder="详情显示格数"
                style="width:120px"
                @update:value=" v => columnMap.get(selectedColumnId).detailSize = v"
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
                :disabled="columnMap.get(selectedColumnId).enable !== '1'"
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
                :disabled="columnMap.get(selectedColumnId).enable !== '1'"
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
                :disabled="columnMap.get(selectedColumnId).enable !== '1'"
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
                :disabled="columnMap.get(selectedColumnId).enable !== '1'"
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
              label="是否必填">
              <a-switch
                v-model:checked="columnMap.get(selectedColumnId).required"
                :disabled="columnMap.get(selectedColumnId).enable !== '1'
                  ||( columnMap.get(selectedColumnId).editAble !== '1'
                    && columnMap.get(selectedColumnId).addShow !== '1')"
                checkedValue="1"
                unCheckedValue="0"
                @change="saveTableColumn"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="2"
              label="默认值">
              <a-input
                :disabled="columnMap.get(selectedColumnId).enable !== '1'"
                :value="columnMap.get(selectedColumnId).defaultValue"
                placeholder="默认值"
                @update:value=" v => columnMap.get(selectedColumnId).defaultValue = v"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="2"
              label="最小值(最小长度)">
              <a-input
                :disabled="columnMap.get(selectedColumnId).enable !== '1'"
                :value="columnMap.get(selectedColumnId).min"
                placeholder="输入最小值(最小长度)"
                @update:value=" v => columnMap.get(selectedColumnId).min = v"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="2"
              label="最大值(最大长度)">
              <a-input
                :disabled="columnMap.get(selectedColumnId).enable !== '1'"
                :value="columnMap.get(selectedColumnId).max"
                placeholder="输入最大值(最大长度)"
                @update:value=" v => columnMap.get(selectedColumnId).min = v"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="1"
              label="" />
            <!-- endregion -->
          </a-descriptions>
        </div>
        <!-- endregion -->
      </div>
      <!-- endregion -->
    </div>
    <!-- endregion 右侧编辑栏 -->
    <!-- region 关联实体查询条件 -->
    <a-drawer
      :title="'配置' + entityCondition.title + '查询条件'"
      :visible="entityCondition.show"
      :width="1050"
      placement="right"
      @close="entityConditionDrawClose"
    >
      <template #extra>
        <div></div>
      </template>
      <AdvancedSearch
        :key="entityCondition.key"
        :columns="entityCondition.columns"
        :condition="entityCondition.condition"
        okText="保存"
        @get-condition="saveEntityCondition" />
    </a-drawer>
    <!-- endregion 关联实体查询条件 -->
  </div>
</template>
<script lang="ts" setup>
import {Ref} from 'vue'
import {isEmpty, isNotEmpty, updateTableSize} from '@/framework/utils/common'
import {FIELD_TYPE} from '@/framework/components/common/Portal/type'
import {
  copyPortalConfig,
  deletePortalConfig,
  existedPortalConfig,
  getPortalConfig,
  getPortalList,
  updatePortalColumn,
  updatePortalColumnOrder,
  updatePortalConfig
} from '@/framework/apis/portal/config'
import {CopyOutlined, MinusCircleOutlined} from '@ant-design/icons-vue'
import {ValueLabel} from '@/framework/utils/type'
import {dictStore} from '@/framework/store/common'
import {CellRenderArgs} from '@surely-vue/table'
import {ConditionType} from '@/framework/components/common/AdvancedSearch/type'
import {AUTO} from '@/framework/utils/constant'
import * as _ from 'lodash'

const dict = dictStore()
let inputTableName: Ref<string> = ref('')
let tableList: Ref<Array<ValueLabel>> = ref([] as Array<ValueLabel>)
let tableSizeDict = reactive([] as Array<ValueLabel>)
let fieldTypeDict = reactive([] as Array<ValueLabel>)
let alignDict = reactive([] as Array<ValueLabel>)
let columnDict = reactive([] as Array<ValueLabel>)
let columnMap = reactive(new Map())
let selectedColumnId = ref('')
// 关联属性
const entityConfig = ref({} as any)
const entityCondition = reactive({
  show: false,
  columns: [],
  title: '',
  condition: {} as ConditionType | undefined,
  key: 0
})
const entityColumnDict = reactive([] as Array<ValueLabel>)

let copyConfigModal = reactive({
  visible: false,
  configId: '',
  configDescription: ''
})
const checkConfigIdExisted = () => {
  return existedPortalConfig(copyConfigModal.configId)
}
const openCopyConfigModal = () => {
  copyConfigModal.visible = true
}
const copyConfig = () => {
  copyPortalConfig(tableConfig.value.id, copyConfigModal.configId, copyConfigModal.configDescription).then(() => {
    copyConfigModal.visible = false
    onSearch()
  })

}

const getEntityConfig = (tableId: string) => {
  getPortalConfig(tableId).then(res => {
    entityColumnDict.length = 0
    entityConfig.value = res.payload
    entityConfig.value.columns.forEach(column => {
      entityColumnDict.push({value: column.property, label: column.displayName} as ValueLabel)
    })
    if (isEmpty(columnMap.get(selectedColumnId.value).entityField)) {
      columnMap.get(selectedColumnId.value).entityField = entityConfig.value.idColumn
    }
  })
}

const tableConfig = ref({} as any)
const getTableConfigByName = (item: any) => {
  getPortalConfig(item.value).then(res => {
    columnDict.length = 0
    columnMap.clear()
    selectedColumnId.value = ''
    entityCondition.condition = {} as ConditionType
    tableConfig.value = res.payload
    tableConfig.value.columns.forEach(column => {
      columnDict.push({value: column.property, label: column.displayName} as ValueLabel)
      columnMap.set(column.id, column)
    })

    console.debug(tableConfig.value)
  })
}

const deleteConfig = () => {
  deletePortalConfig(tableConfig.value.id).then(() => {
    columnDict.length = 0
    columnMap.clear()
    selectedColumnId.value = ''
    tableConfig.value = {}
    onSearch()
  })
}

const saveTableConfig = (silent = true) => {
  updatePortalConfig(tableConfig.value, silent).then(() => onSearch())
}

const saveTableColumn = (silent = true) => {
  updatePortalColumn(columnMap.get(selectedColumnId.value), silent).then(() => getPortalConfig(tableConfig.value.name))
}

const onSearch = () => {
  getPortalList(inputTableName.value).then((res) => {
    tableList.value = res.payload || []
  })
}

const handleColumnOrderChanged = () => {
  const columnOrder = [] as any
  let index = 1
  setTimeout(() => {
    for (let column of tableConfig.value.columns) {
      const order = {
        id: column.id,
        title: column.displayName,
        showOrder: index++
      }
      columnMap.get(column.id)[`${tableConfig.value.orderColumn}`] = order.showOrder
      columnOrder.push(order)
    }
    updatePortalColumnOrder(columnOrder).then(() => onSearch())
  })
}

const handleColumnSelected = (event: MouseEvent, params: CellRenderArgs) => {
  selectedColumnId.value = params.record.id
  if (params.record.fieldType === FIELD_TYPE.ENTITY) {
    getEntityConfig(params.record.reference)
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
const entityConditionDrawClose = () => {
  console.log('entityConditionDrawClose')
  entityCondition.show = false
}
const saveEntityCondition = (condition: ConditionType) => {
  entityCondition.condition = condition
  columnMap.get(selectedColumnId.value).entityCondition = JSON.stringify(condition)
  saveTableColumn()
  entityConditionDrawClose()
}

const init = async () => {
  updateTableWidthAndHeight()
  return Promise.all([
    await dict.getDict('PORTAL_TABLE_SIZE_DICT').then(res => {
      tableSizeDict = res || []
    }),
    await dict.getDict('PORTAL_FIELD_DICT').then(res => {
      fieldTypeDict = res || []
    }),
    await dict.getDict('PORTAL_ALIGN_DICT').then(res => {
      alignDict = res || []
    })
  ])
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
  updateTableSize(root, tableWidth, 40, tableHeight, 270)
  console.log(getTableWidth(), getTableHeight())
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
</style>
