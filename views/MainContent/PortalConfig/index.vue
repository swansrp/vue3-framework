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
          <a-button shape="round" @click="openCopyConfigModal" :disabled="isEmpty(tableConfig.id)"> 复制
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
            <a-button shape="round" :disabled="isEmpty(tableConfig.id)"> 删除
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
      <a-descriptions :column="8" :title="tableConfig.displayName" bordered layout="vertical" size="small">
        <template #extra>
          <a-button style="margin-right: 10px" type="primary" @click="saveTableConfig(false)">保存</a-button>
        </template>
        <a-descriptions-item
          :span="1"
          label="表格编码">
          <span style="width: 200px;">{{ tableConfig.name }}</span>
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
          label="编辑分栏个数">
          <a-input-number
            :disabled="tableConfig.readOnly === '1'"
            :value="tableConfig.descriptionCount"
            max="16"
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
          label="顺序调整">
          <a-switch
            v-model:checked="tableConfig.orderMode"
            checkedValue="1"
            style="width: 40px;"
            unCheckedValue="0"
            @change="saveTableConfig"
          />
        </a-descriptions-item>
        <a-descriptions-item
          :span="1"
          label="顺序字段">
          <a-select
            :bordered="false"
            :disabled="tableConfig.orderMode !== '1'"
            :options="columnDict || []"
            :value="tableConfig.orderColumn"
            style="width: 150px"
            @update:value=" v => {
              tableConfig.orderColumn = v
              saveTableConfig()
            }"
          />
        </a-descriptions-item>
        <a-descriptions-item
          :span="1"
          label="树形结构">
          <a-switch
            v-model:checked="tableConfig.treeMode"
            checkedValue="1"
            style="width: 40px;"
            unCheckedValue="0"
            @change="saveTableConfig"
          />
        </a-descriptions-item>
        <a-descriptions-item
          :span="1"
          label="父id字段">
          <a-select
            :bordered="false"
            :disabled="tableConfig.treeMode !== '1'"
            :options="columnDict || []"
            :value="tableConfig.pidColumn"
            style="width: 150px"
            @update:value=" v => {
              tableConfig.pidColumn = v
              saveTableConfig()
            }"
          />
        </a-descriptions-item>
      </a-descriptions>
      <!-- endregion 表格整体配置 -->
      <!-- region 表格字段 -->
      <div style="display: flex">
        <!-- region 表格字段筛选栏 -->
        <s-table
          :columns="[{
            title: '字段列表(拖动调整字段顺序)',
            align: 'center',
            dataIndex: 'displayName',
            tooltip: {placement: 'topLeft', mouseEnterDelay: 0.5},
            rowDrag: true
          }]"
          :data-source="tableConfig.columns"
          :pagination="false"
          :scroll="{y: 600}"
          bordered
          range-selection="single"
          rowKey="id"
          size="small"
          style="width: 250px;"
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
              :label="'字段基础信息(' + columnMap.get(selectedColumnId).property + ')'"
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
              :span="2"
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
              :span="2"
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
                style="width: 200px"
                @update:value=" v => {
                  if(columnMap.get(selectedColumnId).reference !== v) {
                    columnMap.get(selectedColumnId).dbField = null
                  }
                  columnMap.get(selectedColumnId).reference = v
                  saveTableColumn()
                }"
              />
            </a-descriptions-item>
            <a-descriptions-item
              v-if="columnMap.get(selectedColumnId).fieldType === FIELD_TYPE.ENTITY"
              :span="2"
              label="操作字段">
              <a-select
                :options="columnDict"
                :value="columnMap.get(selectedColumnId).dbField"
                style="width: 200px"
                @update:value=" v => {
                  columnMap.get(selectedColumnId).dbField = v
                  columnMap.get(selectedColumnId).editAble = '1'
                  saveTableColumn()
                }"
              />
            </a-descriptions-item>
            <a-descriptions-item
              v-else
              :span="2"
              label="" />
            <a-descriptions-item
              :span="8"
              label="" />
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
              label="是否可以筛选">
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
              label="是否可以排序">
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
              label="" />
            <a-descriptions-item
              :span="8"
              label="" />
            <!-- endregion -->
            <!-- region 弹框显示 -->
            <a-descriptions-item
              :span="8"
              label="弹框显示" />
            <a-descriptions-item
              :span="1"
              label="详情是否显示">
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
              label="显示宽度">
              <a-input-number
                :disabled="columnMap.get(selectedColumnId).enable !== '1'"
                :value="columnMap.get(selectedColumnId).descriptionSize"
                max="16"
                min="0"
                placeholder="详情显示宽度"
                @update:value=" v => columnMap.get(selectedColumnId).descriptionSize = v"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="2"
              label="" />
            <a-descriptions-item
              :span="1"
              label="编辑是否显示">
              <a-switch
                v-model:checked="columnMap.get(selectedColumnId).editAble"
                :disabled="columnMap.get(selectedColumnId).enable !== '1' || isNotEmpty(columnMap.get(selectedColumnId).dbField)"
                checkedValue="1"
                unCheckedValue="0"
                @change="saveTableColumn"
              />
            </a-descriptions-item>
            <a-descriptions-item
              :span="3"
              label="" />
            <a-descriptions-item
              :span="1"
              label="新增是否显示">
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
                placeholder="输入最小值(最小长度)"
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
            <!-- endregion -->
          </a-descriptions>
        </div>
        <!-- endregion -->
      </div>
      <!-- endregion -->
    </div>
    <!-- endregion 右侧编辑栏 -->

  </div>
</template>
<script lang="ts" setup>
import {Ref} from 'vue'
import {isNotEmpty, isEmpty} from '@/framework/utils/common'
import {FIELD_TYPE} from '@/framework/components/common/portal/type'
import {
  copyPortalConfig,
  deletePortalConfig, existedPortalConfig,
  getPortalConfig,
  getPortalList,
  updatePortalColumn,
  updatePortalColumnOrder,
  updatePortalConfig
} from '@/framework/apis/portal/config'
import {MinusCircleOutlined, CopyOutlined} from '@ant-design/icons-vue'
import {ValueLabel} from '@/framework/utils/type'
import {dictStore} from '@/framework/store/common'
import {CellRenderArgs} from '@surely-vue/table'

const dict = dictStore()
let inputTableName: Ref<string> = ref('')
let tableList: Ref<Array<ValueLabel>> = ref([] as Array<ValueLabel>)
let tableSizeDict = reactive([] as Array<ValueLabel>)
let fieldTypeDict = reactive([] as Array<ValueLabel>)
let alignDict = reactive([] as Array<ValueLabel>)
let columnDict = reactive([] as Array<ValueLabel>)
let columnMap = reactive(new Map())
let selectedColumnId = ref('')

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


const tableConfig = ref({} as any)
const getTableConfigByName = (item: any) => {
  getPortalConfig(item.value).then(res => {
    columnDict.length = 0
    columnMap.clear()
    selectedColumnId.value = ''
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
}

const init = async () => {
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
  width: 250px;
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
