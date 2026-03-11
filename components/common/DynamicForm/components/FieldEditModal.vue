<script setup lang="ts">
/**
 * 字段编辑模态框
 * 用于创建和编辑表单字段
 */
import { message } from 'ant-design-vue'
import { ref, watch, computed } from 'vue'

import {
  schemaAttributeGroupGeneralSelect
} from '@/apis/schemaAttributeGroupPortalController'
import {
  schemaAttributeAdd,
  schemaAttributeUpdate
} from '@/apis/schemaAttributePortalController'
import type { SchemaAttribute } from '@/apis/types/schemaAttributePortalControllerTypes'
import { FIELD_TYPE_NAMES } from '@/framework/components/common/DragGrid/index'
import { FILTER_TYPE } from '@/framework/components/common/Portal/type'

interface Props {
  visible: boolean
  field?: SchemaAttribute | null
  sectionId?: string
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  field: null,
  sectionId: undefined
})

const emit = defineEmits<{
  (e: 'update:visible', visible: boolean): void
  (e: 'saved'): void
}>()

// 表单数据
const formData = ref({
  id: '',
  sectionId: '',
  groupId: '',
  name: '',
  label: '',
  description: '',
  fieldType: '1',
  dict: '',
  unit: '',
  defaultValue: '',
  maxValue: '',
  minValue: '',
  isRequired: '1',
  readonly: '0',
  width: 30,
  height: 1,
  positionX: 0,
  positionY: 0,
  labelWidth: 120,
  validationRule: '',
  parentAttributeId: '',
  visibilityCondition: '',
  sort: 0
})

// 分组列表
const groups = ref<any[]>([])

// 加载状态
const loading = ref(false)

// 是否编辑模式
const isEdit = computed(() => !!props.field?.id)

// 字段类型选项
const fieldTypeOptions = computed(() => {
  return Object.entries(FIELD_TYPE_NAMES).map(([value, label]) => ({
    value,
    label
  }))
})

// 加载分组
const loadGroups = async () => {
  if (!props.sectionId) return
  
  try {
    const res = await schemaAttributeGroupGeneralSelect({
      conditionList: [
        { property: 'sectionId', relation: FILTER_TYPE.EQUAL, value: [props.sectionId] },
        { property: 'valid', relation: FILTER_TYPE.EQUAL, value: ['1'] }
      ],
      sortList: [{ property: 'sort', type: 0 }]
    }, false, false)
    
    if (res?.payload) {
      groups.value = res.payload
    }
  } catch (error) {
    console.error('加载分组失败', error)
  }
}

// 重置表单
const resetForm = () => {
  formData.value = {
    id: '',
    sectionId: props.sectionId || '',
    groupId: '',
    name: '',
    label: '',
    description: '',
    fieldType: '1',
    dict: '',
    unit: '',
    defaultValue: '',
    maxValue: '',
    minValue: '',
    isRequired: '1',
    readonly: '0',
    width: 30,
    height: 1,
    positionX: 0,
    positionY: 0,
    labelWidth: 120,
    validationRule: '',
    parentAttributeId: '',
    visibilityCondition: '',
    sort: 0
  }
}

// 监听 visible 变化
watch(() => props.visible, (val) => {
  if (val) {
    loadGroups()
    if (props.field) {
      // 编辑模式：填充数据
      formData.value = {
        id: props.field.id || '',
        sectionId: props.field.sectionId || props.sectionId || '',
        groupId: props.field.groupId || '',
        name: props.field.name || '',
        label: props.field.label || '',
        description: props.field.description || '',
        fieldType: String(props.field.fieldType || '1'),
        dict: props.field.dict || '',
        unit: props.field.unit || '',
        defaultValue: props.field.defaultValue || '',
        maxValue: props.field.maxValue || '',
        minValue: props.field.minValue || '',
        isRequired: props.field.isRequired || '1',
        readonly: props.field.readonly || '0',
        width: props.field.width || 30,
        height: props.field.height || 1,
        positionX: props.field.positionX || 0,
        positionY: props.field.positionY || 0,
        labelWidth: props.field.labelWidth || 120,
        validationRule: props.field.validationRule || '',
        parentAttributeId: props.field.parentAttributeId || '',
        visibilityCondition: props.field.visibilityCondition || '',
        sort: props.field.sort || 0
      }
    } else {
      // 新增模式：重置表单
      resetForm()
    }
  }
})

// 保存
const handleSave = async () => {
  if (!formData.value.name) {
    message.warning('请输入字段名')
    return
  }
  if (!formData.value.label) {
    message.warning('请输入字段标签')
    return
  }
  
  loading.value = true
  try {
    const data = {
      ...formData.value,
      sectionId: props.sectionId,
      fieldType: Number(formData.value.fieldType)
    }
    
    if (isEdit.value) {
      await schemaAttributeUpdate({}, data)
      message.success('更新成功')
    } else {
      await schemaAttributeAdd(data)
      message.success('创建成功')
    }
    
    emit('saved')
  } catch (error) {
    message.error(isEdit.value ? '更新失败' : '创建失败')
  } finally {
    loading.value = false
  }
}

// 关闭
const handleClose = () => {
  emit('update:visible', false)
}
</script>

<template>
  <a-modal
    :open="visible"
    :title="isEdit ? '编辑字段' : '新增字段'"
    :width="700"
    :confirm-loading="loading"
    @ok="handleSave"
    @cancel="handleClose"
  >
    <a-form
      :label-col="{ span: 6 }"
      :wrapper-col="{ span: 16 }"
    >
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item
            label="字段名"
            required
          >
            <a-input
              v-model:value="formData.name"
              placeholder="字段名（用于数据绑定）"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item
            label="字段标签"
            required
          >
            <a-input
              v-model:value="formData.label"
              placeholder="显示标签"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="字段类型">
            <a-select v-model:value="formData.fieldType">
              <a-select-option
                v-for="opt in fieldTypeOptions"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="分组">
            <a-select
              v-model:value="formData.groupId"
              allow-clear
              placeholder="选择分组"
            >
              <a-select-option
                v-for="group in groups"
                :key="group.id"
                :value="group.id"
              >
                {{ group.title }}
              </a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="是否必填">
            <a-radio-group v-model:value="formData.isRequired">
              <a-radio value="1">
                必填
              </a-radio>
              <a-radio value="0">
                选填
              </a-radio>
            </a-radio-group>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="是否只读">
            <a-radio-group v-model:value="formData.readonly">
              <a-radio value="0">
                否
              </a-radio>
              <a-radio value="1">
                是
              </a-radio>
            </a-radio-group>
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="字典编码">
            <a-input
              v-model:value="formData.dict"
              placeholder="字典编码"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="单位">
            <a-input
              v-model:value="formData.unit"
              placeholder="单位"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="默认值">
            <a-input
              v-model:value="formData.defaultValue"
              placeholder="默认值"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="排序">
            <a-input-number
              v-model:value="formData.sort"
              :min="0"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-divider>布局配置</a-divider>

      <a-row :gutter="16">
        <a-col :span="8">
          <a-form-item label="宽度">
            <a-input-number
              v-model:value="formData.width"
              :min="5"
              :max="100"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="高度">
            <a-input-number
              v-model:value="formData.height"
              :min="1"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="标签宽度">
            <a-input-number
              v-model:value="formData.labelWidth"
              :min="50"
              :max="300"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="X坐标">
            <a-input-number
              v-model:value="formData.positionX"
              :min="0"
              :max="100"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Y坐标">
            <a-input-number
              v-model:value="formData.positionY"
              :min="0"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-divider>验证规则</a-divider>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="最小值">
            <a-input
              v-model:value="formData.minValue"
              placeholder="最小值（数值类型）"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="最大值">
            <a-input
              v-model:value="formData.maxValue"
              placeholder="最大值（数值类型）"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item
        label="正则验证"
        :label-col="{ span: 3 }"
        :wrapper-col="{ span: 20 }"
      >
        <a-input
          v-model:value="formData.validationRule"
          placeholder="正则表达式"
        />
      </a-form-item>

      <a-form-item
        label="字段描述"
        :label-col="{ span: 3 }"
        :wrapper-col="{ span: 20 }"
      >
        <a-textarea
          v-model:value="formData.description"
          placeholder="字段描述（作为提示信息显示）"
          :rows="2"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<style scoped lang="less">
:deep(.ant-divider) {
  margin: 12px 0;
}
</style>
