<template>
  <div
    ref="dsSpace"
    class="ds-space"
  >
    <surely-table
      :columns="surelyTableColumns"
      :data-source="surelyTableData"
      :table-height="tableHeight"
      :table-width="tableWidth"
      table-id="dataSourceManageTable"
      @change="tableChange"
      @handle-search="handleSearch"
      @handle-reset="handleReset"
    >
      <template #right-btns>
        <a-space>
          <a-button
            type="primary"
            @click="handleAdd"
          >
            新增
          </a-button>
          <a-button
            @click="refresh"
          >
            刷新缓存
          </a-button>
        </a-space>
      </template>
      <template #bodyCell="{ column, record }">
        <template v-if="(column as any).dataIndex === 'isDefault'">
          <a-tag :color="record.isDefault === '1' ? 'green' : ''">
            {{ record.isDefault === '1' ? '默认' : '-' }}
          </a-tag>
        </template>
        <!-- 空备注占位，避免 autoHeight 列空内容坍缩导致行高不一 -->
        <template v-if="(column as any).dataIndex === 'remark'">
          {{ record.remark || '-' }}
        </template>
        <template v-if="(column as any).dataIndex === 'operation'">
          <div class="table-operation-btns">
            <a-button
              size="small"
              @click="handleTest(record)"
            >
              测试连接
            </a-button>
            <a-button
              size="small"
              type="primary"
              @click="handleEdit(record)"
            >
              编辑
            </a-button>
            <delete-pop-confirm @delete-event="handleDelete(record)" />
          </div>
        </template>
      </template>
      <template #customFilterIcon>
        <search-outlined />
      </template>
    </surely-table>
    <a-pagination
      v-model:current="currentPage"
      v-model:page-size="pageSize"
      :page-size-options="pageSizeOptions"
      :total="totalPageNumber"
      class="pagination"
      show-quick-jumper
      show-size-changer
      @change="paginationChange"
    />
    <dialog-box
      v-model:visible="dsBoxVisible"
      :title="isAdd ? '新增数据源' : '编辑数据源'"
      :width="560"
    >
      <a-form
        :model="dsForm"
        label-align="right"
        :label-col="{ span: 6 }"
        @finish="submitForm"
      >
        <a-form-item
          label="数据源名称"
          name="dsName"
          required
          :rules="[{required: true, message: '请输入数据源名称!'}]"
        >
          <a-input
            v-model:value="dsForm.dsName"
            :disabled="!isAdd"
            placeholder="作为缓存键，创建后不可修改"
          />
        </a-form-item>
        <a-form-item
          label="数据库类型"
          name="dsType"
          required
        >
          <a-select v-model:value="dsForm.dsType">
            <a-select-option value="mysql">
              mysql 语法系（MySQL/Doris/StarRocks）
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item
          label="主机 IP"
          name="host"
          required
          :rules="[{required: true, message: '请输入主机 IP!'}]"
        >
          <a-input
            v-model:value="dsForm.host"
            placeholder="如 192.168.1.10"
          />
        </a-form-item>
        <a-form-item
          label="端口"
          name="port"
          required
          :rules="[{required: true, message: '请输入端口!'}]"
        >
          <a-input-number
            v-model:value="dsForm.port"
            :min="1"
            :max="65535"
            :precision="0"
            style="width: 100%;"
            placeholder="MySQL 默认 3306，Doris/StarRocks 常见 9030"
          />
        </a-form-item>
        <a-form-item
          label="数据库名"
          name="dbName"
        >
          <a-input
            v-model:value="dsForm.dbName"
            placeholder="选填，为空则不限定库"
          />
        </a-form-item>
        <a-form-item label="连接地址">
          <a-input
            :value="previewUrl"
            disabled
            placeholder="按数据库类型与主机端口自动拼接"
          />
        </a-form-item>
        <a-form-item
          label="用户名"
          name="username"
        >
          <a-input
            v-model:value="dsForm.username"
            placeholder="建议使用只读账号"
          />
        </a-form-item>
        <a-form-item
          label="密码"
          name="password"
        >
          <a-input-password
            v-model:value="dsForm.password"
            :placeholder="isAdd ? '请输入密码' : '留空则不修改'"
          />
        </a-form-item>
        <a-form-item
          label="默认数据源"
          name="isDefault"
        >
          <a-switch
            v-model:checked="isDefaultChecked"
            checked-children="是"
            un-checked-children="否"
          />
        </a-form-item>
        <a-form-item
          label="备注"
          name="remark"
        >
          <a-textarea
            v-model:value="dsForm.remark"
            :rows="2"
          />
        </a-form-item>
        <a-form-item>
          <a-button
            html-type="submit"
            type="primary"
            style="float: right;width: 370px;"
          >
            提交
          </a-button>
        </a-form-item>
      </a-form>
    </dialog-box>
  </div>
</template>

<script lang="ts" setup>
import { SearchOutlined } from '@ant-design/icons-vue'
import * as _ from 'lodash'
import { Ref } from 'vue'
import { useRouter } from 'vue-router'

import surelyTableColumns from './constant'

import {
  addDataSource,
  deleteDataSource,
  queryDataSources,
  refreshDataSources,
  testDataSource,
  updateDataSource
} from '@/framework/apis/dataSource'
import DeletePopConfirm from '@/framework/components/common/deletePopConfirm/DeletePopConfirm.vue'
import DialogBox from '@/framework/components/common/dialogBox/DialogBox.vue'
import { QueryConditionType, SORT_TYPE, SortObjType } from '@/framework/components/common/surelyTable/contant'
import SurelyTable from '@/framework/components/common/surelyTable/SurelyTable.vue'
import { updateTableSize } from '@/framework/utils/common'
import { DEFAULT_PAGE_SIZE_OPTION } from '@/framework/utils/constant'

// 数据源管理（独立页面；后端挂在 forge 模块 /web/forge/datasource/admin；Agent 问数按各自绑定的数据源执行，可多 Agent 共用）
const { currentRoute } = useRouter()
const route = currentRoute.value

const baseDomain = route.query ? route.query.domain ? '/' + route.query.domain : undefined : undefined

let currentPage = ref(1)
let pageSize = ref(10)
let totalPageNumber = ref(0)
const surelyTableData: Ref<Array<any>> = ref([])
const pageSizeOptions = ref<string[]>(DEFAULT_PAGE_SIZE_OPTION)

let sortList: SortObjType[] = []
let myQueryCondition: QueryConditionType | {} = {}

let dsBoxVisible: Ref<boolean> = ref(false)
let isAdd: Ref<boolean> = ref(true)
let dsForm: any = reactive({
  dsId: null as string | null,
  dsName: '',
  dsType: 'mysql',
  host: '',
  port: 3306,
  dbName: '',
  username: '',
  password: '',
  remark: ''
})
const isDefaultChecked = ref(false)

// 数据库类型 -> JDBC 协议前缀（与后端 validate 的 mysql 语法系约束一致）
const JDBC_PREFIX: Record<string, string> = { mysql: 'jdbc:mysql' }

/** 按数据库类型 + 主机 + 端口（+ 可选库名）自动拼接 JDBC 地址 */
const buildJdbcUrl = () => {
  const prefix = JDBC_PREFIX[dsForm.dsType] || 'jdbc:mysql'
  const db = dsForm.dbName ? '/' + dsForm.dbName : ''
  return `${prefix}://${dsForm.host}:${dsForm.port}${db}`
}
const previewUrl = computed(() => dsForm.host ? buildJdbcUrl() : '')

/** 编辑回显：从存量 jdbcUrl 反解主机/端口/库名，避免重存丢失库名等信息 */
const parseJdbcUrl = (url: string) => {
  const m = /^jdbc:mysql:\/\/([^:/]+)(?::(\d+))?(?:\/([^?]*))?/i.exec(url || '')
  if (m) {
    return { host: m[1], port: m[2] ? Number(m[2]) : 3306, dbName: (m[3] || '').split('?')[0] }
  }
  return { host: '', port: 3306, dbName: '' }
}

const tableChange = (_pagination: any, _filters: any, sorter: any) => {
  if (!Array.isArray(sorter)) {
    const property = sorter.field
    const type = SORT_TYPE[sorter.order]
    sortList = [{ property, type }]
  } else {
    sortList = sorter.map(item => {
      const property = item.field
      const type = SORT_TYPE[item.order]
      return { property, type }
    })
  }
  getTableData()
}

const paginationChange = (page: number, size: number) => {
  currentPage.value = page
  pageSize.value = size
  getTableData()
}

const refresh = () => refreshDataSources(baseDomain).then(getTableData)

const resetForm = () => {
  dsForm.dsId = null
  dsForm.dsName = ''
  dsForm.dsType = 'mysql'
  dsForm.host = ''
  dsForm.port = 3306
  dsForm.dbName = ''
  dsForm.username = ''
  dsForm.password = ''
  dsForm.remark = ''
  isDefaultChecked.value = false
}

const handleAdd = () => {
  resetForm()
  isAdd.value = true
  dsBoxVisible.value = true
}

const handleEdit = (record: any) => {
  resetForm()
  isAdd.value = false
  dsForm.dsId = record.dsId
  dsForm.dsName = record.dsName
  dsForm.dsType = record.dsType || 'mysql'
  const parsed = parseJdbcUrl(record.jdbcUrl)
  dsForm.host = parsed.host
  dsForm.port = parsed.port
  dsForm.dbName = parsed.dbName
  dsForm.username = record.username
  dsForm.remark = record.remark
  isDefaultChecked.value = record.isDefault === '1'
  dsBoxVisible.value = true
}

const handleDelete = (record: any) =>
  deleteDataSource(record.dsId, baseDomain).then(getTableData)

const handleTest = (record: any) =>
  testDataSource(record, baseDomain)

const submitForm = () => {
  // 主机/端口/库名为表单交互字段，后端只存拼接后的 jdbcUrl
  const { host, port, dbName, ...rest } = dsForm
  const data: any = { ...rest, jdbcUrl: buildJdbcUrl(), isDefault: isDefaultChecked.value ? '1' : '0' }
  // 编辑时密码留空表示不修改，不提交空串覆盖
  if (!isAdd.value && !data.password) delete data.password
  const action = isAdd.value ? addDataSource(data, baseDomain) : updateDataSource(data, baseDomain)
  action.then(getTableData).then(() => dsBoxVisible.value = false)
}

const handleSearch = (queryCondition: QueryConditionType) => {
  myQueryCondition = queryCondition
  getTableData()
}

const handleReset = (queryCondition: QueryConditionType) => {
  myQueryCondition = queryCondition
  getTableData()
}

const getTableData = () => {
  const queryList = Object.values(myQueryCondition)
  queryDataSources(queryList, sortList, pageSize.value, currentPage.value, baseDomain).then((res: any) => {
    surelyTableData.value = res.payload.records
    totalPageNumber.value = res.payload.total
    surelyTableData.value.forEach((item: any, index: number) => {
      item['key'] = item.dsId
      item['index'] = (currentPage.value - 1) * pageSize.value + index + 1
    })
  })
}

// ---------------- 尺寸自适应 ----------------
const dsSpace: Ref = ref()
let tableWidth: Ref<number> = ref(0)
let tableHeight: Ref<number> = ref(0)

const updateTableWidthAndHeight = () => updateTableSize(dsSpace, tableWidth, 0, tableHeight, 100)
const resizeHandler = _.debounce(updateTableWidthAndHeight, 50)
window.addEventListener('resize', resizeHandler)
onMounted(() => {
  getTableData()
  updateTableWidthAndHeight()
})
onUnmounted(() => window.removeEventListener('resize', resizeHandler))
</script>

<style scoped>
.ds-space {
  position: relative;
  height: calc(100% - 70px);
}
.table-operation-btns {
  display: flex;
  justify-content: space-around;
}
.pagination {
  margin-top: 15px;
  margin-right: 0;
  display: flex;
  justify-content: flex-end;
}
</style>
