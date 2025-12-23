<template>
  <div class="column-config">
    <a-alert
      v-if="!hasPrimaryKey"
      message="警告：请配置主键字段"
      :description="`当前矩阵没有配置主键字段，请添加并设置为主键。`"
      type="warning"
      show-icon
      style="margin-bottom: 16px"
    />
    <div class="toolbar">
      <a-button
        type="primary"
        @click="handleAdd"
      >
        <template #icon>
          <PlusOutlined />
        </template>
        添加字段
      </a-button>
    </div>

    <a-table
      :columns="columns"
      :data-source="dataSource"
      :loading="loading"
      row-key="id"
      :pagination="false"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'isNullable'">
          <a-tag :color="record.isNullable === '1' ? 'success' : 'default'">
            {{ record.isNullable === '1' ? '是' : '否' }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'isPrimaryKey'">
          <a-tag :color="record.isPrimaryKey === '1' ? 'blue' : 'default'">
            {{ record.isPrimaryKey === '1' ? '是' : '否' }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'isIndex'">
          <a-tag :color="record.isIndex === '1' ? 'orange' : 'default'">
            {{ record.isIndex === '1' ? '是' : '否' }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'isVisible'">
          <a-tag :color="record.isVisible === '1' ? 'green' : 'default'">
            {{ record.isVisible === '1' ? '是' : '否' }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'action'">
          <a-space>
            <a-button
              type="link"
              size="small"
              @click="handleEdit(record)"
            >
              编辑
            </a-button>
            <a-button
              type="link"
              size="small"
              @click="handleMoveUp(record)"
            >
              上移
            </a-button>
            <a-button
              type="link"
              size="small"
              @click="handleMoveDown(record)"
            >
              下移
            </a-button>
            <a-popconfirm
              title="确定删除该字段吗？"
              @confirm="handleDelete(record)"
            >
              <a-button
                type="link"
                danger
                size="small"
              >
                删除
              </a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>

    <!-- 字段编辑弹窗 -->
    <a-modal
      v-model:open="modalVisible"
      :title="modalTitle"
      width="700px"
      @ok="handleSubmit"
      @cancel="handleCancel"
    >
      <a-form
        ref="formRef"
        :model="formData"
        :label-col="{ span: 6 }"
        :wrapper-col="{ span: 16 }"
      >
        <a-form-item
          label="字段名"
          name="columnName"
          :rules="[
            { required: true, message: '请输入字段名' },
            { 
              pattern: /^[a-z][a-z0-9_]*$/, 
              message: '字段名只能包含小写字母、数字和下划线，且必须以小写字母开头' 
            }
          ]"
        >
          <a-input
            v-model:value="formData.columnName"
            placeholder="使用下划线连接，如: user_name"
            :disabled="!!formData.id"
          />
        </a-form-item>
        <a-form-item
          label="字段注释"
          name="columnComment"
          :rules="[{ required: true, message: '请输入字段注释' }]"
        >
          <a-input
            v-model:value="formData.columnComment"
            placeholder="如: 用户姓名"
            @blur="handleColumnCommentBlur"
          />
        </a-form-item>
        <a-form-item
          label="数据库类型"
          name="columnType"
          :rules="[{ required: true, message: '请选择数据库类型' }]"
        >
          <a-select
            v-model:value="formData.columnType"
            @change="handleColumnTypeChange"
          >
            <a-select-option
              v-for="item in COLUMN_TYPES"
              :key="item.value"
              :value="item.value"
            >
              {{ item.label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item
          v-if="currentColumnType?.hasLength"
          label="字段长度"
          name="columnLength"
        >
          <a-input-number
            v-model:value="formData.columnLength"
            :min="1"
            style="width: 100%"
            placeholder="如: VARCHAR(50)"
          />
        </a-form-item>
        <a-form-item
          v-if="currentColumnType?.hasDecimal"
          label="小数位数"
          name="decimalPlaces"
        >
          <a-input-number
            v-model:value="formData.decimalPlaces"
            :min="0"
            style="width: 100%"
            placeholder="如: DECIMAL(10,2)"
          />
        </a-form-item>
        <a-form-item
          label="表单类型"
          name="fieldType"
          :rules="[{ required: true, message: '请选择表单类型' }]"
        >
          <a-select v-model:value="formData.fieldType">
            <a-select-option
              v-for="item in FIELD_TYPES"
              :key="item.value"
              :value="item.value"
            >
              {{ item.label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item
          v-if="formData.isPrimaryKey !== '1'"
          label="默认值"
          name="defaultValue"
        >
          <a-input
            v-model:value="formData.defaultValue"
            placeholder="输入默认值"
            @change="handleDefaultValueChange"
          >
            <template #addonAfter>
              <a-button
                size="small"
                type="link"
                :disabled="formData.isNullable !== '1'"
                @click="handleSetNull"
              >
                设为NULL
              </a-button>
            </template>
          </a-input>
        </a-form-item>
        <a-form-item
          v-if="formData.isPrimaryKey === '1'"
          label="引用序列"
          name="sequence"
        >
          <a-input
            v-model:value="formData.sequence"
            placeholder="输入序列名称"
          >
            <template #addonAfter>
              <a-button
                size="small"
                type="link"
                @click="formData.sequence = 'AUTO_INCREMENT'"
              >
                设为自增
              </a-button>
            </template>
          </a-input>
        </a-form-item>
        <a-form-item
          v-else
          label="引用序列"
          name="sequence"
        >
          <a-input
            v-model:value="formData.sequence"
            placeholder="输入序列名称"
            @change="handleSequenceChange"
          />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item
              label="是否可空"
              name="isNullable"
              :label-col="{ span: 10 }"
              :wrapper-col="{ span: 14 }"
            >
              <a-checkbox
                :checked="formData.isNullable === '1'"
                @change="(e: any) => formData.isNullable = e.target.checked ? '1' : '0'"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item
              label="是否主键"
              name="isPrimaryKey"
              :label-col="{ span: 10 }"
              :wrapper-col="{ span: 14 }"
            >
              <a-checkbox
                :checked="formData.isPrimaryKey === '1'"
                @change="(e: any) => formData.isPrimaryKey = e.target.checked ? '1' : '0'"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item
              label="是否索引"
              name="isIndex"
              :label-col="{ span: 10 }"
              :wrapper-col="{ span: 14 }"
            >
              <a-checkbox
                :checked="formData.isIndex === '1'"
                @change="(e: any) => formData.isIndex = e.target.checked ? '1' : '0'"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item
              label="是否唯一"
              name="isUnique"
              :label-col="{ span: 10 }"
              :wrapper-col="{ span: 14 }"
            >
              <a-checkbox
                :checked="formData.isUnique === '1'"
                @change="(e: any) => formData.isUnique = e.target.checked ? '1' : '0'"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item
              label="是否显示"
              name="isVisible"
              :label-col="{ span: 10 }"
              :wrapper-col="{ span: 14 }"
            >
              <a-checkbox
                :checked="formData.isVisible === '1'"
                @change="(e: any) => formData.isVisible = e.target.checked ? '1' : '0'"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item
              label="名称字段"
              name="isDisplayNameField"
              :label-col="{ span: 15 }"
              :wrapper-col="{ span: 9 }"
            >
              <a-checkbox 
                :checked="formData.isDisplayNameField === '1'" 
                @change="(e: any) => handleSpecialFieldCheck('isDisplayNameField', e.target.checked)"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item
              label="顺序字段"
              name="isOrderField"
              :label-col="{ span: 15 }"
              :wrapper-col="{ span: 9 }"
            >
              <a-checkbox 
                :checked="formData.isOrderField === '1'" 
                @change="(e: any) => handleSpecialFieldCheck('isOrderField', e.target.checked)"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item
              label="父节点字段"
              name="isPidField"
              :label-col="{ span: 15 }"
              :wrapper-col="{ span: 9 }"
            >
              <a-checkbox 
                :checked="formData.isPidField === '1'" 
                @change="(e: any) => handleSpecialFieldCheck('isPidField', e.target.checked)"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item
          v-if="formData.fieldType === '11'"
          label="关联矩阵"
          name="referenceMatrixId"
        >
          <a-select
            v-model:value="formData.referenceMatrixId"
            placeholder="请选择关联矩阵"
            allow-clear
            @change="handleReferenceMatrixChange"
          >
            <a-select-option
              v-for="matrixItem in matrixList"
              :key="matrixItem.id"
              :value="matrixItem.id"
            >
              {{ matrixItem.tableComment }}（{{ matrixItem.tableName }}）
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item
          v-if="['4', '5', '18', '19'].includes(formData.fieldType)"
          label="关联字典"
          name="referenceDict"
        >
          <a-input
            v-model:value="formData.referenceDict"
            placeholder="请输入字典编码"
            allow-clear
            @change="handleReferenceDictChange"
          />
        </a-form-item>
        <a-form-item
          label="排序"
          name="showOrder"
        >
          <a-input-number
            v-model:value="formData.showOrder"
            :min="0"
            style="width: 100%"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { PlusOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { pinyin } from 'pinyin'
import { ref, reactive, onMounted, computed } from 'vue'

import type { ColumnInfo, MatrixInfo } from '../types'
import { COLUMN_TYPES, FIELD_TYPES } from '../types'

import {
  sysMatrixColumnGeneralSelect,
  sysMatrixColumnAdd,
  sysMatrixColumnUpdate,
  sysMatrixColumnDeleteItem,
  sysMatrixColumnUpdateOrder,
} from '@/framework/views/MainContent/dynamic/apis'
import { sysMatrixGeneralSelect } from '@/framework/views/MainContent/dynamic/apis'
import { ConditionVO } from '@/framework/views/MainContent/dynamic/apis/types'
import { FILTER_TYPE } from '@/framework/components/common/Portal/type'
import { buildCondition } from '@/framework/components/common/Portal/utils'

interface Props {
  matrix: MatrixInfo
}

const props = defineProps<Props>()

const columns = [
  { title: '排序', dataIndex: 'sort', key: 'sort', width: 80 },
  { title: '字段名', dataIndex: 'columnName', key: 'columnName', width: 150 },
  { title: '字段注释', dataIndex: 'columnComment', key: 'columnComment', width: 150 },
  { title: '数据库类型', dataIndex: 'columnType', key: 'columnType', width: 120 },
  { title: '长度', dataIndex: 'columnLength', key: 'columnLength', width: 80 },
  { title: '可空', dataIndex: 'isNullable', key: 'isNullable', width: 80 },
  { title: '主键', dataIndex: 'isPrimaryKey', key: 'isPrimaryKey', width: 80 },
  { title: '索引', dataIndex: 'isIndex', key: 'isIndex', width: 80 },
  { title: '是否显示', dataIndex: 'isVisible', key: 'isVisible', width: 100, align: 'center' },
  { title: '操作', key: 'action', width: 250, fixed: 'right' },
]

const dataSource = ref<ColumnInfo[]>([])
const loading = ref(false)
const isInitialized = ref(false) // 标记是否已初始化
const matrixList = ref<MatrixInfo[]>([])

const modalVisible = ref(false)
const modalTitle = ref('添加字段')
const formRef = ref()
const formData = reactive<ColumnInfo>({
  matrixId: props.matrix.id!,
  columnName: '',
  columnComment: '',
  columnType: 'VARCHAR',
  fieldType: '1',
  columnLength: 50,
  isNullable: '0',
  isPrimaryKey: '0',
  isIndex: '0',
  isUnique: '0',
  isVisible: '1',
  showOrder: 1,
  isDisplayNameField: '0',
  isOrderField: '0',
  isPidField: '0',
  referenceMatrixId: '',
  referenceDict: '',
  sequence: '',
})

const currentColumnType = computed(() => {
  return COLUMN_TYPES.find(item => item.value === formData.columnType)
})

// 检查是否有主键字段
const hasPrimaryKey = computed(() => {
  return dataSource.value.some(item => 
    item.isPrimaryKey === '1'
  )
})

const loadData = async () => {
  loading.value = true
  try {
    const conditionList = [buildCondition('matrixId', FILTER_TYPE.EQUAL, [props.matrix.id])] as ConditionVO[]
    const res = await sysMatrixColumnGeneralSelect(
      {
        conditionList,
        sortList: [{ property: 'sort', type: 0 }],
      },
      false,
      false
    )
    if (res.status?.code === 0) {
      const list = (res.payload || []).sort((a: any, b: any) => (a.showOrder || 0) - (b.showOrder || 0))
      dataSource.value = list
      isInitialized.value = true
    }
  } catch (error) {
    console.error('加载数据失败:', error)
  } finally {
    loading.value = false
  }
}

const loadMatrixList = async () => {
  try {
    const res = await sysMatrixGeneralSelect(
      {
        conditionList: [],
        sortList: [{ property: 'sort', type: 0 }],
      },
      false,
      false
    )
    if (res.status?.code === 0) {
      matrixList.value = res.payload || []
    }
  } catch (error) {
    console.error('加载矩阵列表失败:', error)
  }
}

const handleAdd = () => {
  modalTitle.value = '添加字段'
  Object.assign(formData, {
    matrixId: props.matrix.id!,
    columnName: '',
    columnComment: '',
    columnType: 'VARCHAR',
    fieldType: '1',
    columnLength: 50,
    isNullable: '0',
    isPrimaryKey: '0',
    isIndex: '0',
    isUnique: '0',
    isVisible: '1',
    showOrder: dataSource.value.length + 1,
    isDisplayNameField: '0',
    isOrderField: '0',
    isPidField: '0',
    referenceMatrixId: '',
    referenceDict: '',
    sequence: '',
  })
  delete formData.id
  modalVisible.value = true
}

const handleEdit = (record: ColumnInfo) => {
  modalTitle.value = '编辑字段'
  Object.assign(formData, record)
  modalVisible.value = true
}

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    let res
    if (formData.id) {
      res = await sysMatrixColumnUpdate({}, formData as any)
    } else {
      res = await sysMatrixColumnAdd(formData as any)
    }
    if (res.status?.code === 0) {
      message.success(formData.id ? '更新成功' : '添加成功')
      modalVisible.value = false
      loadData()
    }
  } catch (error) {
    console.error('提交失败:', error)
  }
}

const handleCancel = () => {
  modalVisible.value = false
  formRef.value?.resetFields()
}

const handleDelete = async (record: ColumnInfo) => {
  try {
    const res = await sysMatrixColumnDeleteItem({ id: record.id })
    if (res.status?.code === 0) {
      message.success('删除成功')
      loadData()
    }
  } catch (error) {
    console.error('删除失败:', error)
  }
}

const handleMoveUp = async (record: ColumnInfo) => {
  const index = dataSource.value.findIndex(item => item.id === record.id)
  if (index > 0) {
    // 使用splice确保响应式更新
    const item = dataSource.value.splice(index, 1)[0]
    dataSource.value.splice(index - 1, 0, item)
    // 重新分配排序号
    dataSource.value.forEach((item, idx) => {
      item.showOrder = idx + 1
    })
    await updateOrder()
  }
}

const handleMoveDown = async (record: ColumnInfo) => {
  const index = dataSource.value.findIndex(item => item.id === record.id)
  if (index < dataSource.value.length - 1) {
    // 使用splice确保响应式更新
    const item = dataSource.value.splice(index, 1)[0]
    dataSource.value.splice(index + 1, 0, item)
    // 重新分配排序号
    dataSource.value.forEach((item, idx) => {
      item.showOrder = idx + 1
    })
    await updateOrder()
  }
}

const updateOrder = async () => {
  try {
    const orders = dataSource.value.map(item => ({
      id: item.id,
      showOrder: item.showOrder,
    }))
    const res = await sysMatrixColumnUpdateOrder(orders)
    if (res.status?.code === 0) {
      message.success('排序更新成功')
      await loadData()
    }
  } catch (error) {
    console.error('更新排序失败:', error)
    // 失败时重新加载
    await loadData()
  }
}

const handleColumnTypeChange = () => {
  // 根据数据库类型自动设置默认长度
  const typeConfig = COLUMN_TYPES.find(item => item.value === formData.columnType)
  if (typeConfig?.hasLength && !formData.columnLength) {
    formData.columnLength = formData.columnType === 'VARCHAR' ? 50 : 10
  }
  if (typeConfig?.hasDecimal && !formData.decimalPlaces) {
    formData.decimalPlaces = 2
  }
}

const handleReferenceMatrixChange = (value: string) => {
  if (value) {
    // 选择了关联矩阵，清空关联字典
    formData.referenceDict = ''
  }
}

const handleReferenceDictChange = () => {
  if (formData.referenceDict) {
    // 输入了关联字典，清空关联矩阵
    formData.referenceMatrixId = ''
  }
}

const handleSpecialFieldCheck = (fieldName: string, checked: boolean) => {
  // 三选一逻辑：当勾选某个字段时，自动取消其他两个
  if (checked) {
    // 勾选当前字段，取消其他两个
    formData.isDisplayNameField = '0'
    formData.isOrderField = '0'
    formData.isPidField = '0'
    ;(formData as any)[fieldName] = '1'
  } else {
    // 取消勾选
    (formData as any)[fieldName] = '0'
  }
}

const handleColumnCommentBlur = () => {
  // 只在添加新字段且字段名为空时自动生成
  if (!formData.id && !formData.columnName && formData.columnComment) {
    try {
      // 将中文转换为拼音
      const pinyinResult = pinyin(formData.columnComment, {
        style: 'normal', // 普通风格，不带声调
        heteronym: false, // 不考虑多音字
        segment: true // 启用分词
      })
      
      // 将拼音数组转换为字符串，用下划线连接
      let fieldName = pinyinResult
        .map((item: string[]) => item[0]) // 取每个字的第一个拼音
        .join('_') // 用下划线连接
        .toLowerCase() // 转为小写
        .replace(/[^a-z0-9_]/g, '') // 移除非法字符
        .replace(/_+/g, '_') // 多个下划线合并为一个
        .replace(/^_|_$/g, '') // 去除首尾下划线
      
      // 确保以字母开头
      if (fieldName && !/^[a-z]/.test(fieldName)) {
        fieldName = 'f_' + fieldName
      }
      
      formData.columnName = fieldName
    } catch (error) {
      console.error('拼音转换失败:', error)
    }
  }
}

const handleDefaultValueChange = () => {
  // 非主键字段：填写默认值时，清空引用序列
  if (formData.defaultValue) {
    formData.sequence = ''
  }
}

const handleSequenceChange = () => {
  // 非主键字段：填写引用序列时，清空默认值
  if (formData.sequence) {
    formData.defaultValue = ''
  }
}

const handleSetNull = () => {
  // 设置默认值为NULL时，自动勾选“是否可空”
  formData.defaultValue = 'null'
  formData.isNullable = '1'
  // 清空引用序列
  formData.sequence = ''
}

onMounted(() => {
  loadData()
  loadMatrixList()
})
</script>

<style scoped lang="less">
.column-config {
  height: 100%;
  display: flex;
  flex-direction: column;

  .toolbar {
    margin-bottom: 16px;
  }
}
</style>
