<script lang="ts" setup>
import {CheckOutlined, CloseOutlined, DatabaseOutlined, LinkOutlined, SyncOutlined} from '@ant-design/icons-vue'
import {message, Modal} from 'ant-design-vue'
import {computed, ref, watch} from 'vue'

import {formSchemaAttributeUpdate} from '../apis/formSchemaAttributePortalController'
import {formSchemaSectionUpdate} from '../apis/formSchemaSectionPortalController'
import {
  createPhysicalTable,
  syncTableStructure,
  sysMatrixAdd,
  sysMatrixGeneralSelect
} from '@/framework/views/MainContent/dynamic/apis/sysMatrixPortalController'
import {
  sysMatrixColumnAdd,
  sysMatrixColumnUpdate,
  sysMatrixColumnGeneralSelect
} from '@/framework/views/MainContent/dynamic/apis/sysMatrixColumnPortalController'
import {FILTER_TYPE} from '@/framework/components/common/Portal/type'

interface Attribute {
  id: number
  name: string
  label: string
  fieldType: string
  isRequired?: string
  dict?: string
  defaultValue?: string
  description?: string
  matrixColumnId?: number
  sort?: number
}

interface Props {
  visible: boolean
  sectionId: number | string
  sectionTitle: string
  tableName?: string  // 已关联的表名
  attributes: Attribute[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'synced'): void
}>()

// 矩阵相关状态
const loading = ref(false)
const currentMatrix = ref<any>(null)
const matrixColumns = ref<any[]>([])
const existingMatrices = ref<any[]>([])

// 字段名映射（属性id -> 矩阵字段名）
const columnNamesMap = ref<Record<number, string>>({})
// 字段类型映射（属性id -> 矩阵字段类型）
const columnTypesMap = ref<Record<number, string>>({})
// 字段长度映射（属性id -> 矩阵字段长度）
const columnLengthsMap = ref<Record<number, number | undefined>>({})
// 是否索引映射（属性id -> 是否索引）
const columnIsIndexMap = ref<Record<number, string>>({})
// 已映射字段的编辑状态（matrixColumnId -> 编辑数据）
const mappedColumnEdits = ref<Record<number, { columnName: string; columnType: string; columnLength: number | undefined; isIndex: string }>>({})
// 本地属性列表（用于实时更新映射状态）
const localAttributes = ref<Attribute[]>([])

// 表单状态
const mode = ref<'none' | 'create' | 'select'>('none')
const tableName = ref('')
const tableComment = ref('')
const primaryKeyType = ref<'auto_increment' | 'uuid'>('auto_increment')  // 主键类型

// 字段类型映射
const fieldTypeToColumnType = (fieldType: string): { type: string; length?: number; decimalPlaces?: number } => {
  const map: Record<string, { type: string; length?: number; decimalPlaces?: number }> = {
    '1': {type: 'VARCHAR', length: 255},    // 文本输入
    '2': {type: 'VARCHAR', length: 1},     // 开关
    '3': {type: 'DECIMAL', length: 19, decimalPlaces: 4},  // 数值
    '4': {type: 'VARCHAR', length: 50},     // 下拉选择
    '5': {type: 'VARCHAR', length: 50},     // 树形选择
    '6': {type: 'DATETIME'},                // 日期
    '7': {type: 'DATETIME'},                // 日期时间
    '8': {type: 'VARCHAR', length: 500},    // 超链接
    '9': {type: 'TEXT'},                    // HTML
    '10': {type: 'TEXT'},                   // 文本域
    '12': {type: 'VARCHAR', length: 255},   // 图片
    '13': {type: 'VARCHAR', length: 255},   // 视频
    '14': {type: 'VARCHAR', length: 255},   // 音频
    '15': {type: 'VARCHAR', length: 255},   // 文件
    '18': {type: 'VARCHAR', length: 500},   // 下拉多选
    '19': {type: 'VARCHAR', length: 500}    // 树形多选
  }
  return map[fieldType] || {type: 'VARCHAR', length: 255}
}

// 字段类型名称映射
const getFieldTypeName = (fieldType: string): string => {
  const map: Record<string, string> = {
    '-1': '显示文本',
    '-2': '分割线',
    '1': '文本输入',
    '2': '开关',
    '3': '数值',
    '4': '下拉选择',
    '5': '树形选择',
    '6': '日期',
    '7': '日期时间',
    '8': '超链接',
    '9': 'HTML',
    '10': '文本域',
    '12': '图片',
    '13': '视频',
    '14': '音频',
    '15': '文件',
    '18': '下拉多选',
    '19': '树形多选'
  }
  return map[fieldType] || '未知'
}

// 矩阵字段类型选项
const columnTypeOptions = [
  { label: 'VARCHAR', value: 'VARCHAR' },
  { label: 'TEXT', value: 'TEXT' },
  { label: 'DECIMAL', value: 'DECIMAL' },
  { label: 'DATETIME', value: 'DATETIME' },
  { label: 'BIGINT', value: 'BIGINT' },
  { label: 'INT', value: 'INT' }
]

// 计算映射状态（排除显示类型 -1 和 -2）
const mappingStatus = computed(() => {
  const filterableAttrs = localAttributes.value.filter(a => a.fieldType !== '-1' && a.fieldType !== '-2')
  const total = filterableAttrs.length
  const mapped = filterableAttrs.filter(a => a.matrixColumnId).length
  return {total, mapped, unmapped: total - mapped}
})

// 可映射的属性列表（排除显示类型 -1 和 -2）
const mappableAttributes = computed(() => {
  return localAttributes.value.filter(a => a.fieldType !== '-1' && a.fieldType !== '-2')
})

// 加载现有矩阵列表
const loadExistingMatrices = async () => {
  try {
    const res = await sysMatrixGeneralSelect({
      conditionList: []
    } as any, false, false)
    existingMatrices.value = res.payload || []
  } catch (error) {
    console.error('加载矩阵列表失败:', error)
  }
}

// 加载当前关联的矩阵信息
const loadCurrentMatrix = async () => {
  if (!props.tableName) {
    currentMatrix.value = null
    matrixColumns.value = []
    return
  }

  try {
    const res = await sysMatrixGeneralSelect({
      conditionList: [
        {property: 'tableName', relation: FILTER_TYPE.EQUAL, value: [props.tableName]}
      ]
    } as any, false, false)

    if (res.payload?.[0]) {
      currentMatrix.value = res.payload[0]
      await loadMatrixColumns(currentMatrix.value.id)
    }
  } catch (error) {
    console.error('加载矩阵信息失败:', error)
  }
}

// 加载矩阵字段
const loadMatrixColumns = async (matrixId: number) => {
  try {
    const res = await sysMatrixColumnGeneralSelect({
      conditionList: [
        {property: 'matrixId', relation: FILTER_TYPE.EQUAL, value: [matrixId]}
      ]
    } as any, false, false)
    matrixColumns.value = res.payload || []
    
    // 初始化已映射字段的编辑状态
    initMappedColumnEdits()
  } catch (error) {
    console.error('加载矩阵字段失败:', error)
  }
}

// 初始化已映射字段的编辑状态
const initMappedColumnEdits = () => {
  mappedColumnEdits.value = {}
  for (const attr of mappableAttributes.value) {
    if (attr.matrixColumnId) {
      const col = matrixColumns.value.find(c => c.id === attr.matrixColumnId)
      if (col) {
        mappedColumnEdits.value[attr.matrixColumnId] = {
          columnName: col.columnName,
          columnType: col.columnType,
          columnLength: col.columnLength,
          isIndex: col.isIndex || '0'
        }
      }
    }
  }
}

// 初始化
const initData = async () => {
  mode.value = props.tableName ? 'none' : 'none'
  tableName.value = props.tableName || ''
  tableComment.value = props.sectionTitle || ''
  
  // 初始化本地属性列表
  localAttributes.value = [...props.attributes]
  
  // 初始化字段名映射，默认使用属性名
  columnNamesMap.value = {}
  columnTypesMap.value = {}
  columnLengthsMap.value = {}
  columnIsIndexMap.value = {}
  props.attributes.forEach(attr => {
    columnNamesMap.value[attr.id] = attr.name
    const typeInfo = fieldTypeToColumnType(attr.fieldType)
    columnTypesMap.value[attr.id] = typeInfo.type
    columnLengthsMap.value[attr.id] = typeInfo.length
    columnIsIndexMap.value[attr.id] = '0'  // 默认不索引
  })

  await Promise.all([
    loadExistingMatrices(),
    loadCurrentMatrix()
  ])
}

// 创建新矩阵
const handleCreateMatrix = async () => {
  if (!tableName.value) {
    message.error('请输入表名')
    return
  }

  loading.value = true
  try {
    const finalTableName = tableName.value.startsWith('biz_') ? tableName.value : `biz_${tableName.value}`

    // 创建矩阵
    const resp = await sysMatrixAdd({
      tableName: finalTableName,
      tableComment: tableComment.value || props.sectionTitle,
      autoIncrement: primaryKeyType.value === 'auto_increment' ? '1' : '0'
    })

    const matrixInfo = resp.payload

    if (matrixInfo) {
      currentMatrix.value = matrixInfo
      matrixColumns.value = []
      mode.value = 'none'

      // 自动创建 historyId 字段
      const historyIdColumn = await sysMatrixColumnAdd({
        matrixId: matrixInfo.id,
        columnName: 'history_id',
        columnComment: '历史记录ID',
        columnType: 'VARCHAR',
        columnLength: 50,
        isIndex: '1',
        isNullable: '1',
        fieldType: '1',
        sort: 0
      }, false, false)

      if (historyIdColumn.payload) {
        matrixColumns.value.push(historyIdColumn.payload)
      }

      // 自动创建 sectionInstanceId 字段
      const sectionInstanceIdColumn = await sysMatrixColumnAdd({
        matrixId: matrixInfo.id,
        columnName: 'section_instance_id',
        columnComment: '填报区块实体id',
        columnType: 'VARCHAR',
        columnLength: 50,
        isIndex: '1',
        isNullable: '1',
        fieldType: '1',
        sort: 0
      }, false, false)

      if (sectionInstanceIdColumn.payload) {
        matrixColumns.value.push(sectionInstanceIdColumn.payload)
      }

      // 更新 section 的 tableName
      await formSchemaSectionUpdate({}, {
        id: Number(props.sectionId),
        tableName: finalTableName
      }, false, false)

      await loadExistingMatrices()

      message.success('创建矩阵成功')
      emit('synced')
    } else {
      message.error('创建矩阵成功，但查询矩阵信息失败')
    }
  } catch (error) {
    console.error('创建矩阵失败:', error)
  } finally {
    loading.value = false
  }
}

// 选择已有矩阵
const handleSelectMatrix = async (matrixId: number) => {
  const matrix = existingMatrices.value.find(m => m.id === matrixId)
  if (matrix) {
    currentMatrix.value = matrix
    await loadMatrixColumns(matrixId)
    mode.value = 'none'
    
    // 更新 section 的 tableName
    await formSchemaSectionUpdate({}, {
      id: Number(props.sectionId),
      tableName: matrix.tableName
    }, false, false)
    
    message.success('关联矩阵成功')
    emit('synced')
  }
}

// 同步属性到矩阵字段
const handleSyncAttributes = async () => {
  if (!currentMatrix.value) {
    message.error('请先创建或选择矩阵')
    return
  }

  loading.value = true
  try {
    const existingColumnNames = new Set(matrixColumns.value.map(c => c.columnName))
    const newColumns: any[] = []
    const updatedAttributes: any[] = []

    for (const attr of mappableAttributes.value) {
      // 如果已有映射，跳过
      if (attr.matrixColumnId) {
        const existingCol = matrixColumns.value.find(c => c.id === attr.matrixColumnId)
        if (existingCol) continue
      }

      // 使用用户自定义的字段名，默认为属性名
      const columnName = columnNamesMap.value[attr.id] || attr.name
      
      // 检查字段名是否已存在
      if (existingColumnNames.has(columnName)) {
        // 已存在，查找并关联
        const existingCol = matrixColumns.value.find(c => c.columnName === columnName)
        if (existingCol && !attr.matrixColumnId) {
          updatedAttributes.push({...attr, matrixColumnId: existingCol.id})
        }
        continue
      }

      // 创建新字段
      const columnType = columnTypesMap.value[attr.id] || 'VARCHAR'
      const columnLength = columnLengthsMap.value[attr.id]
      const isIndex = columnIsIndexMap.value[attr.id] || '0'
      const columnData = {
        matrixId: currentMatrix.value.id,
        columnName,
        columnComment: attr.label,
        columnType,
        columnLength,
        isIndex,
        fieldType: attr.fieldType,
        isNullable: '0',
        defaultValue: attr.defaultValue,
        referenceDict: attr.dict,
        sort: attr.sort || 0
      }

      newColumns.push({attr, columnData})
      existingColumnNames.add(columnName)
    }

    // 批量创建新字段
    for (const {attr, columnData} of newColumns) {
      const res = await sysMatrixColumnAdd(columnData, false, false)
      if (res.payload) {
        updatedAttributes.push({...attr, matrixColumnId: res.payload.id || res.payload})
      }
    }

    // 更新属性的 matrixColumnId
    for (const attr of updatedAttributes) {
      await formSchemaAttributeUpdate({}, {
        id: attr.id,
        matrixColumnId: attr.matrixColumnId
      }, false, false)
      
      // 更新本地属性列表
      const localAttr = localAttributes.value.find(a => a.id === attr.id)
      if (localAttr) {
        localAttr.matrixColumnId = attr.matrixColumnId
      }
    }

    // 刷新矩阵字段列表
    await loadMatrixColumns(currentMatrix.value.id)

    message.success(`同步完成：新增 ${newColumns.length} 个字段，关联 ${updatedAttributes.length} 个属性`)
    emit('synced')
  } catch (error) {
    console.error('同步失败:', error)
    message.error('同步失败')
  } finally {
    loading.value = false
  }
}

// 创建物理表
const handleCreatePhysicalTable = async () => {
  if (!currentMatrix.value) return

  Modal.confirm({
    title: '创建物理表',
    content: `确定要在数据库中创建表 "${currentMatrix.value.tableName}" 吗？`,
    okText: '确定',
    cancelText: '取消',
    async onOk() {
      loading.value = true
      try {
        await createPhysicalTable({
          id: Number(currentMatrix.value.id),
          autoIncrement: currentMatrix.value.autoIncrement || '1'
        })
        await loadCurrentMatrix()
        message.success('创建物理表成功')
      } catch (error) {
        console.error('创建物理表失败:', error)
        message.error('创建物理表失败')
      } finally {
        loading.value = false
      }
    }
  })
}

// 同步表结构
const handleSyncTableStructure = async () => {
  if (!currentMatrix.value) return

  loading.value = true
  try {
    await syncTableStructure({id: Number(currentMatrix.value.id)})
    await loadCurrentMatrix()
    message.success('同步表结构成功')
  } catch (error) {
    console.error('同步表结构失败:', error)
    message.error('同步表结构失败')
  } finally {
    loading.value = false
  }
}

// 保存已映射字段的修改
const handleSaveMappedColumnChanges = async () => {
  if (!currentMatrix.value) return

  loading.value = true
  try {
    let updateCount = 0
    for (const [columnId, edits] of Object.entries(mappedColumnEdits.value)) {
      const col = matrixColumns.value.find(c => c.id === Number(columnId))
      if (col) {
        // 检查是否有变化
        if (col.columnName !== edits.columnName || 
            col.columnType !== edits.columnType ||
            col.columnLength !== edits.columnLength ||
            (col.isIndex || '0') !== edits.isIndex) {
          await sysMatrixColumnUpdate({}, {
            id: Number(columnId),
            columnName: edits.columnName,
            columnType: edits.columnType,
            columnLength: edits.columnLength,
            isIndex: edits.isIndex
          }, false, false)
          updateCount++
        }
      }
    }

    // 刷新矩阵字段列表
    await loadMatrixColumns(currentMatrix.value.id)
    
    if (updateCount > 0) {
      message.success(`已更新 ${updateCount} 个字段`)
      emit('synced')
    } else {
      message.info('没有需要更新的字段')
    }
  } catch (error) {
    console.error('保存字段修改失败:', error)
    message.error('保存字段修改失败')
  } finally {
    loading.value = false
  }
}

// 获取矩阵状态显示
const getMatrixStatusText = (status?: string) => {
  const map: Record<string, { text: string; color: string }> = {
    '0': {text: '未创建', color: 'default'},
    '1': {text: '已创建', color: 'blue'},
    '2': {text: '已同步', color: 'green'},
    '3': {text: '待同步', color: 'orange'}
  }
  return map[status || '0'] || {text: '未知', color: 'default'}
}

// 关闭弹窗
const handleClose = () => {
  emit('update:visible', false)
}

// 监听 visible 变化
watch(() => props.visible, (val) => {
  if (val) {
    initData()
  }
})
</script>

<template>
  <a-modal
    :footer="null"
    :open="visible"
    :title="`实体表配置 - ${sectionTitle}`"
    :width="1200"
    @cancel="handleClose"
  >
    <a-spin :spinning="loading">
      <!-- 状态概览 -->
      <div class="status-overview">
        <a-row :gutter="16">
          <a-col :span="8">
            <a-statistic
              :value="mappingStatus.total"
              title="属性总数"
            />
          </a-col>
          <a-col :span="8">
            <a-statistic
              :value="mappingStatus.mapped"
              :value-style="{ color: '#3f8600' }"
              title="已映射"
            />
          </a-col>
          <a-col :span="8">
            <a-statistic
              :value="mappingStatus.unmapped"
              :value-style="{ color: mappingStatus.unmapped > 0 ? '#cf1322' : '#3f8600' }"
              title="未映射"
            />
          </a-col>
        </a-row>
      </div>

      <a-divider />

      <!-- 矩阵配置区域 -->
      <div class="matrix-config">
        <!-- 未关联矩阵时显示选择界面 -->
        <template v-if="!currentMatrix">
          <a-alert
            description="请选择创建新表或关联已有表"
            message="当前区块尚未关联实体表"
            show-icon
            style="margin-bottom: 16px;"
            type="info"
          />

          <a-radio-group v-model:value="mode" style="margin-bottom: 16px;">
            <a-radio value="create">
              <DatabaseOutlined />
              创建新表
            </a-radio>
            <a-radio value="select">
              <LinkOutlined />
              关联已有表
            </a-radio>
          </a-radio-group>

          <!-- 创建新表 -->
          <div v-if="mode === 'create'" class="create-form">
            <a-form :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
              <a-row :gutter="24">
                <a-col :span="12">
                  <a-form-item label="表名" required>
                    <a-input
                      v-model:value="tableName"
                      addon-before="biz_"
                      placeholder="如: section_101"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="表注释">
                    <a-input
                      v-model:value="tableComment"
                      :placeholder="sectionTitle"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="主键类型" required>
                    <a-radio-group v-model:value="primaryKeyType">
                      <a-radio value="auto_increment">
                        自增 (BIGINT)
                      </a-radio>
                      <a-radio value="uuid">
                        UUID (VARCHAR)
                      </a-radio>
                    </a-radio-group>
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item :wrapper-col="{ offset: 6, span: 18 }">
                    <a-button
                      type="primary"
                      @click="handleCreateMatrix"
                    >
                      创建矩阵
                    </a-button>
                  </a-form-item>
                </a-col>
              </a-row>
            </a-form>
          </div>

          <!-- 选择已有表 -->
          <div v-if="mode === 'select'" class="select-form">
            <a-table
              :columns="[
                { title: '表名', dataIndex: 'tableName', key: 'tableName' },
                { title: '表注释', dataIndex: 'tableComment', key: 'tableComment' },
                { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
                { title: '操作', key: 'action', width: 100 }
              ]"
              :data-source="existingMatrices"
              :pagination="{ pageSize: 5 }"
              row-key="id"
              size="small"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.dataIndex === 'status'">
                  <a-tag :color="getMatrixStatusText(record.status).color">
                    {{ getMatrixStatusText(record.status).text }}
                  </a-tag>
                </template>
                <template v-if="column.key === 'action'">
                  <a-button
                    size="small"
                    type="link"
                    @click="handleSelectMatrix(record.id)"
                  >
                    选择
                  </a-button>
                </template>
              </template>
            </a-table>
          </div>
        </template>

        <!-- 已关联矩阵时显示配置界面 -->
        <template v-else>
          <div class="matrix-info">
            <a-descriptions :column="3" bordered size="small">
              <a-descriptions-item label="表名">
                {{ currentMatrix.tableName }}
              </a-descriptions-item>
              <a-descriptions-item label="表注释">
                {{ currentMatrix.tableComment }}
              </a-descriptions-item>
              <a-descriptions-item label="状态">
                <a-tag :color="getMatrixStatusText(currentMatrix.status).color">
                  {{ getMatrixStatusText(currentMatrix.status).text }}
                </a-tag>
              </a-descriptions-item>
            </a-descriptions>

            <div class="matrix-actions" style="margin-top: 16px;">
              <a-space>
                <a-button
                  v-if="currentMatrix.status === '0'"
                  type="primary"
                  @click="handleCreatePhysicalTable"
                >
                  <DatabaseOutlined />
                  创建物理表
                </a-button>
                <a-button
                  v-if="currentMatrix.status === '3'"
                  danger
                  type="primary"
                  @click="handleSyncTableStructure"
                >
                  <SyncOutlined />
                  同步表结构
                </a-button>
                <a-button
                  type="default"
                  @click="handleSyncAttributes"
                >
                  <SyncOutlined />
                  同步字段映射
                </a-button>
                <a-button
                  v-if="mappingStatus.mapped > 0"
                  type="primary"
                  ghost
                  @click="handleSaveMappedColumnChanges"
                >
                  保存修改
                </a-button>
              </a-space>
            </div>
          </div>

          <a-divider>字段映射列表</a-divider>

          <!-- 字段映射表格 -->
          <a-table
            :columns="[
              { title: '属性名', dataIndex: 'name', key: 'name', width: 100 },
              { title: '标签', dataIndex: 'label', key: 'label', width: 100 },
              { title: '类型', key: 'fieldType', width: 80 },
              { title: '映射状态', key: 'mapping', width: 80 },
              { title: '矩阵字段', key: 'columnName', width: 110 },
              { title: '字段类型', key: 'columnType', width: 100 },
              { title: '长度', key: 'columnLength', width: 80 },
              { title: '索引', key: 'isIndex', width: 70 }
            ]"
            :data-source="mappableAttributes"
            :pagination="false"
            row-key="id"
            size="small"
            :scroll="{ x: 900 }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'fieldType'">
                {{ getFieldTypeName(record.fieldType) }}
              </template>
              <template v-if="column.key === 'mapping'">
                <a-tag v-if="record.matrixColumnId" color="green">
                  <CheckOutlined />
                  已映射
                </a-tag>
                <a-tag v-else color="orange">
                  <CloseOutlined />
                  未映射
                </a-tag>
              </template>
              <template v-if="column.key === 'columnName'">
                <template v-if="record.matrixColumnId && mappedColumnEdits[record.matrixColumnId]">
                  <a-input
                    v-model:value="mappedColumnEdits[record.matrixColumnId].columnName"
                    size="small"
                  />
                </template>
                <template v-else-if="record.matrixColumnId">
                  {{ matrixColumns.find(c => c.id === record.matrixColumnId)?.columnName || '-' }}
                </template>
                <template v-else>
                  <a-input
                    v-model:value="columnNamesMap[record.id]"
                    size="small"
                    :placeholder="record.name"
                  />
                </template>
              </template>
              <template v-if="column.key === 'columnType'">
                <template v-if="record.matrixColumnId && mappedColumnEdits[record.matrixColumnId]">
                  <a-select
                    v-model:value="mappedColumnEdits[record.matrixColumnId].columnType"
                    size="small"
                    :options="columnTypeOptions"
                    style="width: 100%;"
                  />
                </template>
                <template v-else-if="record.matrixColumnId">
                  {{ matrixColumns.find(c => c.id === record.matrixColumnId)?.columnType || '-' }}
                </template>
                <template v-else>
                  <a-select
                    v-model:value="columnTypesMap[record.id]"
                    size="small"
                    :options="columnTypeOptions"
                    style="width: 100%;"
                  />
                </template>
              </template>
              <template v-if="column.key === 'columnLength'">
                <template v-if="record.matrixColumnId && mappedColumnEdits[record.matrixColumnId]">
                  <a-input-number
                    v-model:value="mappedColumnEdits[record.matrixColumnId].columnLength"
                    size="small"
                    :min="1"
                    :max="65535"
                    style="width: 100%;"
                  />
                </template>
                <template v-else-if="record.matrixColumnId">
                  {{ matrixColumns.find(c => c.id === record.matrixColumnId)?.columnLength || '-' }}
                </template>
                <template v-else>
                  <a-input-number
                    v-model:value="columnLengthsMap[record.id]"
                    size="small"
                    :min="1"
                    :max="65535"
                    style="width: 100%;"
                  />
                </template>
              </template>
              <template v-if="column.key === 'isIndex'">
                <template v-if="record.matrixColumnId && mappedColumnEdits[record.matrixColumnId]">
                  <a-switch
                    v-model:checked="mappedColumnEdits[record.matrixColumnId].isIndex"
                    :checked-value="'1'"
                    :un-checked-value="'0'"
                    size="small"
                  />
                </template>
                <template v-else-if="record.matrixColumnId">
                  <a-tag :color="matrixColumns.find(c => c.id === record.matrixColumnId)?.isIndex === '1' ? 'blue' : 'default'">
                    {{ matrixColumns.find(c => c.id === record.matrixColumnId)?.isIndex === '1' ? '是' : '否' }}
                  </a-tag>
                </template>
                <template v-else>
                  <a-switch
                    v-model:checked="columnIsIndexMap[record.id]"
                    :checked-value="'1'"
                    :un-checked-value="'0'"
                    size="small"
                  />
                </template>
              </template>
            </template>
          </a-table>
        </template>
      </div>
    </a-spin>
  </a-modal>
</template>

<style lang="less" scoped>
.status-overview {
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
  margin-bottom: 16px;
}

.matrix-config {
  min-height: 200px;
}

.create-form,
.select-form {
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

.matrix-info {
  padding: 16px;
  background: #f6ffed;
  border-radius: 8px;
  border: 1px solid #b7eb8f;
}
</style>
