<template>
  <div class="form-config">
    <a-tabs v-model:active-key="activeTab">
      <a-tab-pane
        key="layout"
        tab="表单配置"
      >
        <FormLayoutDesigner
          v-if="currentMatrix"
          :matrix="currentMatrix"
          :form-configs="dataSource"
          :column-list="columnList"
          @update="loadData"
          @add="handleAdd"
          @edit="handleEdit"
          @delete="handleDelete"
        />

        <!-- 表单配置弹窗 -->
        <a-modal
          v-model:open="modalVisible"
          :title="modalTitle"
          width="800px"
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
              label="关联字段"
              name="columnId"
              :rules="[{ required: true, message: '请选择关联字段' }]"
            >
              <a-select
                v-model:value="formData.columnId"
                placeholder="请选择字段"
                :disabled="!!formData.id"
                @change="handleColumnChange"
              >
                <a-select-option
                  v-for="col in columnList.filter(c => c.isPrimaryKey !== '1')"
                  :key="col.id"
                  :value="col.id"
                >
                  {{ col.columnComment }}（{{ col.columnName }}）
                </a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item
              label="显示标签"
              name="label"
              :rules="[{ required: true, message: '请输入显示标签' }]"
            >
              <a-input
                v-model:value="formData.label"
                placeholder="如: 用户姓名"
              />
            </a-form-item>
            <a-form-item
              label="描述信息"
              name="description"
            >
              <a-textarea
                v-model:value="formData.description"
                placeholder="提示用户如何填写"
                :rows="2"
              />
            </a-form-item>
            <a-form-item
              label="字段类型"
              name="fieldType"
              :rules="[{ required: true, message: '请选择字段类型' }]"
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
              label="是否必填"
              name="isRequired"
            >
              <a-radio-group v-model:value="formData.isRequired">
                <a-radio value="1">
                  是
                </a-radio>
                <a-radio value="0">
                  否
                </a-radio>
              </a-radio-group>
            </a-form-item>
            <a-form-item
              label="是否只读"
              name="readonly"
            >
              <a-radio-group v-model:value="formData.readonly">
                <a-radio value="1">
                  是
                </a-radio>
                <a-radio value="0">
                  否
                </a-radio>
              </a-radio-group>
            </a-form-item>
            <a-form-item
              label="验证规则"
              name="validationRule"
            >
              <a-input
                v-model:value="formData.validationRule"
                placeholder="正则表达式"
              />
            </a-form-item>
            <a-form-item
              label="最小值"
              name="minValue"
            >
              <a-input v-model:value="formData.minValue" />
            </a-form-item>
            <a-form-item
              label="最大值"
              name="maxValue"
            >
              <a-input v-model:value="formData.maxValue" />
            </a-form-item>
            <a-form-item
              label="字典编码"
              name="dict"
            >
              <a-input
                v-model:value="formData.dict"
                placeholder="用于下拉选择等类型"
              />
            </a-form-item>
            <a-form-item
              label="单位"
              name="unit"
            >
              <a-input
                v-model:value="formData.unit"
                placeholder="如: 元、%"
              />
            </a-form-item>
            <a-form-item
              label="宽度"
              name="width"
            >
              <a-input-number
                v-model:value="formData.width"
                :min="0"
                style="width: 100%"
              />
            </a-form-item>
            <a-form-item
              label="高度"
              name="height"
            >
              <a-input-number
                v-model:value="formData.height"
                :min="0"
                style="width: 100%"
              />
            </a-form-item>
            <a-form-item
              label="排序"
              name="sort"
            >
              <a-input-number
                v-model:value="formData.sort"
                :min="0"
                style="width: 100%"
              />
            </a-form-item>
          </a-form>
        </a-modal>
      </a-tab-pane>

      <a-tab-pane
        key="linkage"
        tab="联动配置"
      >
        <LinkageConfig
          v-if="currentMatrix"
          :matrix="currentMatrix"
          :form-configs="dataSource"
        />
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue'
import { ref, reactive, onMounted } from 'vue'

import type { FormConfigInfo, MatrixInfo, ColumnInfo } from '../types'
import { FIELD_TYPES } from '../types'
import FormLayoutDesigner from './FormLayoutDesigner.vue'
import LinkageConfig from './LinkageConfig.vue'

import { FILTER_TYPE } from '@/framework/components/common/Portal/type'
import { buildCondition } from '@/framework/components/common/Portal/utils'
import {
  sysFormConfigGeneralSelect,
  sysFormConfigAdd,
  sysFormConfigUpdate,
  sysFormConfigDeleteItem,
} from '@/framework/views/MainContent/dynamic/apis/sysFormConfigPortalController'
import { sysMatrixColumnGeneralSelect } from '@/framework/views/MainContent/dynamic/apis/sysMatrixColumnPortalController'
import { ConditionVO } from '@/framework/views/MainContent/dynamic/apis/types'

interface Props {
  matrix: MatrixInfo
}

const props = defineProps<Props>()

const activeTab = ref('layout')

const dataSource = ref<FormConfigInfo[]>([])
const loading = ref(false)
const columnList = ref<ColumnInfo[]>([])

const modalVisible = ref(false)
const modalTitle = ref('添加表单字段')
const formRef = ref()
const formData = reactive<FormConfigInfo>({
  matrixId: props.matrix.id!,
  columnId: '',
  label: '',
  description: '',
  fieldType: '1',
  isRequired: '0',
  readonly: '0',
  width: 2,
  height: 1,
  positionX: undefined,
  positionY: undefined,
  sort: 1,
})

const currentMatrix = ref(props.matrix)

const loadData = async () => {
  loading.value = true
  try {
    const conditionList = [buildCondition('matrixId', FILTER_TYPE.EQUAL, [props.matrix.id])] as ConditionVO[]
    const res = await sysFormConfigGeneralSelect(
      {
        conditionList,
        sortList: [{ property: 'sort', type: 0 }],
      },
      false,
      false
    )
    if (res.status?.code === 0) {
      dataSource.value = res.payload || []
    }
  } catch (error) {
    console.error('加载数据失败:', error)
  } finally {
    loading.value = false
  }
}

const loadColumns = async () => {
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
      columnList.value = res.payload || []
    }
  } catch (error) {
    console.error('加载字段列表失败:', error)
  }
}

const handleAdd = () => {
  modalTitle.value = '添加表单字段'
  Object.assign(formData, {
    matrixId: props.matrix.id!,
    columnId: '',
    label: '',
    description: '',
    fieldType: '1',
    isRequired: '0',
    readonly: '0',
    width: 2,
    height: 1,
    positionX: undefined,
    positionY: undefined,
    sort: dataSource.value.length + 1,
  })
  delete formData.id
  modalVisible.value = true
}

const handleEdit = (record: FormConfigInfo) => {
  modalTitle.value = '编辑表单字段'
  Object.assign(formData, record)
  modalVisible.value = true
}

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    let res
    if (formData.id) {
      res = await sysFormConfigUpdate({}, formData as any)
    } else {
      res = await sysFormConfigAdd(formData as any)
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

const handleColumnChange = (columnId: string) => {
  const selectedColumn = columnList.value.find(col => col.id === columnId)
  if (selectedColumn && !formData.id) {
    // 只在新增时自动填充标签
    formData.label = selectedColumn.columnComment || selectedColumn.columnName || ''
  }
}

const handleDelete = async (record: FormConfigInfo) => {
  try {
    const res = await sysFormConfigDeleteItem({ id: record.id })
    if (res.status?.code === 0) {
      message.success('删除成功')
      loadData()
    }
  } catch (error) {
    console.error('删除失败:', error)
  }
}

onMounted(() => {
  loadData()
  loadColumns()
})
</script>

<style scoped lang="less">
.form-config {
  height: 100%;

  .toolbar {
    margin-bottom: 16px;
  }

  :deep(.ant-tabs-content) {
    height: 100%;
  }
}
</style>
