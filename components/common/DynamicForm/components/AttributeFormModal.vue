<script setup lang="ts">
import type { Rule } from 'ant-design-vue/es/form'
import { computed, ref, watch, onMounted } from 'vue'

import { AND, genEmptyCondition } from '@/framework/components/common/AdvancedSearch/ConditionList/funs'
import Entity from '@/framework/components/common/AdvancedSearch/Entity/index.vue'
import { ConditionType } from '@/framework/components/common/AdvancedSearch/type'
import DictCodeSelector from '@/framework/components/common/dict/DictCodeSelector.vue'
import DynamicFormItem from '@/framework/components/common/DragGrid/DynamicFormItem.vue'
import pinia from '@/framework/store'
import { useAdvancedSearch } from '@/framework/store/AdvancedSearch'
import { dictStore } from '@/framework/store/common'
import { convertToPinyin } from '@/framework/utils/pinyin'
import { ValueLabel } from '@/framework/utils/type'


const useAdvancedSearchStore = useAdvancedSearch(pinia)
const dict = dictStore()

interface AttributeFormData {
  id: string
  sectionId: string
  groupId?: string  // 所属分组ID
  name: string
  label: string
  group?: string
  description?: string
  fieldType: string
  dict?: string
  unit?: string
  defaultValue?: string
  maxValue?: string
  minValue?: string
  isRequired: string
  readonly?: string
  width?: number
  height?: number
  positionX?: number  // X 坐标
  positionY?: number  // Y 坐标
  labelWidth?: number  // 标签宽度（px）
  validationRule?: string
  parentAttributeId?: string  // 父属性ID（级联字典用）
  visibilityCondition?: string  // 显示条件（JSON字符串）
  sort: number
}

interface Props {
  visible: boolean
  formData: AttributeFormData
  isEdit: boolean
  // 当前分组内所有属性列表（用于父属性选择和显示条件）
  availableAttributes?: Array<{ 
    id: string; 
    name: string; 
    label: string; 
    dict?: string;
    fieldType?: string;
    dictOptions?: any[];
  }>
}

const props = withDefaults(defineProps<Props>(), {
  availableAttributes: () => []
})
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'save', data: AttributeFormData): void
}>()

const formRef = ref()
const localFormData = ref<AttributeFormData>({ ...props.formData })

// 字段类型选项（与 FIELD_TYPE 枚举保持一致）
const fieldTypeOptions = [
  { label: '区域标题', value: '-2' },
  { label: '分割线', value: '-1' },
  { label: '文本输入', value: '1' },
  { label: '开关', value: '2' },
  { label: '数值', value: '3' },
  { label: '下拉选择', value: '4' },
  { label: '下拉选择(多选)', value: '18' },
  { label: '树形选择', value: '5' },
  { label: '树形选择(多选)', value: '19' },
  { label: '日期', value: '6' },
  { label: '日期时间', value: '7' },
  { label: '超链接', value: '8' },
  { label: 'HTML', value: '9' },
  { label: '文本域', value: '10' },
  { label: '图片', value: '12' },
  { label: '音频', value: '14' },
  { label: '视频', value: '13' },
  { label: '文件', value: '15' }
]

// 表单验证规则
const formRules: Record<string, Rule[]> = {
  name: [
    { required: true, message: '请输入字段名', trigger: 'blur' },
    { pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/, message: '字段名必须以字母开头，只能包含字母、数字和下划线', trigger: 'blur' }
  ],
  label: [{ required: true, message: '请输入显示名称', trigger: 'blur' }],
  fieldType: [{ required: true, message: '请选择字段类型', trigger: 'change' }]
}

// 监听 formData 变化
watch(() => props.formData, (newVal) => {
  localFormData.value = { ...newVal }
}, { deep: true })

// 监听显示名称变化，自动生成字段名
watch(() => localFormData.value.label, (newLabel) => {
  // 始终自动同步拼音到字段名
  if (newLabel) {
    const fieldName = convertToPinyin(newLabel, false)
    if (fieldName) {
      localFormData.value.name = fieldName
    }
  }
})

// 监听字段类型变化，区域标题和分割线自动设置宽度和X坐标
watch(() => localFormData.value.fieldType, (newType) => {
  if (newType === '-1' || newType === '-2') {
    localFormData.value.width = 100
    localFormData.value.positionX = 0
  }
})

// 用于 DynamicFormItem 的模拟 attribute 对象
const defaultAttribute = computed(() => ({
  id: 'default-value-preview',
  name: 'defaultValue',
  label: '默认值',
  fieldType: localFormData.value.fieldType || '1', // 默认文本输入
  isRequired: '0', // 默认值本身不必填
  dict: localFormData.value.dict,
  unit: localFormData.value.unit,
  minValue: localFormData.value.minValue,
  maxValue: localFormData.value.maxValue,
}))

const handleOk = async () => {
  try {
    await formRef.value.validate()
    emit('save', localFormData.value)
  } catch (error) {
    console.error('表单验证失败:', error)
  }
}

const handleCancel = () => {
  emit('update:visible', false)
}

// 过滤可选的父属性（排除当前属性自身，只显示有字典的属性）
const filteredParentAttributes = computed(() => {
  return props.availableAttributes
    .filter(attr => {
      // 排除当前属性自身
      if (attr.id === localFormData.value.id) return false
      // 只显示有字典的属性
      return !!attr.dict
    })
})

// ========== 显示条件相关 ==========
// 是否启用条件显示
const enableVisibilityCondition = ref(false)

// 条件数据
const visibilityConditionData = ref<ConditionType>({
  conditionList: [genEmptyCondition()],
  andOr: AND
})

// 过滤可选的属性（排除当前属性自身，用于显示条件）
const filteredAttributesForCondition = computed(() => {
  return props.availableAttributes.filter(attr => {
    // 排除当前属性自身
    if (attr.id === localFormData.value.id) return false
    // 排除分割线和区域标题
    if (attr.fieldType === '-1' || attr.fieldType === '-2') return false
    return true
  })
})

// 初始化 AdvancedSearch Store 的属性选项
const initConditionOptions = async () => {
  // 设置属性选项（用于条件编辑器的属性下拉）
  const filterColumns = filteredAttributesForCondition.value.map((item: any) => ({
    label: item.label,
    value: String(item.id),  // 使用属性ID作为value
    fieldType: item.fieldType,
    referenceDictOption: item.dictOptions || []  // 字典选项
  })) as any
  useAdvancedSearchStore.setConditionLabelValueTypeOption(filterColumns)

  // 加载操作符字典
  const conditionDict = await dict.getDict('PORTAL_CONDITION_DICT')
  conditionDict.forEach((item: ValueLabel) => useAdvancedSearchStore.setSelectConditionMap(String(item.value), item))
}

// 监听条件数据变化，同步到 localFormData（序列化为 JSON 字符串）
watch(visibilityConditionData, (newCondition) => {
  if (enableVisibilityCondition.value && newCondition.conditionList.length > 0) {
    // 检查是否有有效条件（property不为空）
    const hasValidCondition = newCondition.conditionList.some(c => c.property)
    if (hasValidCondition) {
      // 序列化为 JSON 字符串存储
      localFormData.value.visibilityCondition = JSON.stringify(newCondition)
    } else {
      localFormData.value.visibilityCondition = undefined
    }
  } else {
    localFormData.value.visibilityCondition = undefined
  }
}, { deep: true })

// 监听启用状态变化
watch(enableVisibilityCondition, (enabled) => {
  if (enabled) {
    // 启用条件显示时，自动设置为非必填
    localFormData.value.isRequired = '0'
  } else {
    localFormData.value.visibilityCondition = undefined
    visibilityConditionData.value = {
      conditionList: [genEmptyCondition()],
      andOr: AND
    }
  }
})

// 监听 formData 变化，初始化条件数据
watch(() => props.formData, (newVal) => {
  if (newVal.visibilityCondition) {
    enableVisibilityCondition.value = true
    // 后端存储的是 JSON 字符串，需要解析
    try {
      if (typeof newVal.visibilityCondition === 'string') {
        visibilityConditionData.value = JSON.parse(newVal.visibilityCondition)
      } else {
        visibilityConditionData.value = newVal.visibilityCondition as any
      }
    } catch (e) {
      console.error('解析显示条件失败:', e)
      visibilityConditionData.value = {
        conditionList: [genEmptyCondition()],
        andOr: AND
      }
    }
  } else {
    enableVisibilityCondition.value = false
    visibilityConditionData.value = {
      conditionList: [genEmptyCondition()],
      andOr: AND
    }
  }
}, { immediate: true })

// 组件挂载时初始化
onMounted(() => {
  initConditionOptions()
})

// 监听可用属性变化，重新初始化选项
watch(() => props.availableAttributes, () => {
  initConditionOptions()
}, { deep: true })
</script>

<template>
  <a-modal
    :open="visible"
    :title="isEdit ? '编辑字段' : '新增字段'"
    :width="900"
    :style="{ top: '20px' }"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <a-form
      ref="formRef"
      :model="localFormData"
      :rules="formRules"
      :label-col="{ span: 6 }"
      :wrapper-col="{ span: 18 }"
    >
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item
            label="显示名称"
            name="label"
            tooltip="表单项的显示标签"
          >
            <a-input
              v-model:value="localFormData.label"
              placeholder="如: 条目名称"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item
            label="字段名"
            name="name"
            tooltip="英文标识符，如：fieldName"
          >
            <a-input
              v-model:value="localFormData.name"
              placeholder="如: fieldName"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item
            label="是否必填"
            name="isRequired"
            tooltip="是否必填字段"
          >
            <a-radio-group v-model:value="localFormData.isRequired">
              <a-radio value="0">
                否
              </a-radio>
              <a-radio value="1">
                是
              </a-radio>
            </a-radio-group>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item
            label="是否只读"
            name="readonly"
            tooltip="只读字段不可编辑，仅展示"
          >
            <a-radio-group v-model:value="localFormData.readonly">
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
          <a-form-item
            label="字段类型"
            name="fieldType"
            tooltip="决定使用哪种表单控件"
          >
            <a-select
              v-model:value="localFormData.fieldType"
              :options="fieldTypeOptions"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item
            label="字典"
            name="dict"
            tooltip="下拉选择/树形选择时使用"
          >
            <DictCodeSelector
              v-model="localFormData.dict"
              is-manage-mode
              placeholder="请搜索或添加字典"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item
            label="排序"
            name="sort"
            tooltip="字段排列顺序"
          >
            <a-input-number
              v-model:value="localFormData.sort"
              :min="1"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item
            label="单位"
            name="unit"
            tooltip="显示在标签后面"
          >
            <a-input
              v-model:value="localFormData.unit"
              placeholder="如: mm, kg, ℃"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item
            label="最小值"
            name="minValue"
            tooltip="数值类型时的最小值限制"
          >
            <a-input
              v-model:value="localFormData.minValue"
              placeholder="如: 0"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item
            label="最大值"
            name="maxValue"
            tooltip="数值类型时的最大值限制"
          >
            <a-input
              v-model:value="localFormData.maxValue"
              placeholder="如: 9999"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <!-- 默认值和关联属性 -->
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item
            label="默认值"
            name="defaultValue"
            tooltip="新建表单时的默认填充值"
          >
            <!-- 区域标题和分割线不需要默认值 -->
            <span
              v-if="localFormData.fieldType === '-2' || localFormData.fieldType === '-1'"
              class="default-value-hint"
            >
              该字段类型无需配置默认值
            </span>
            <!-- 文件类型不支持默认值 -->
            <span
              v-else-if="['12', '13', '14', '15'].includes(localFormData.fieldType)"
              class="default-value-hint"
            >
              文件类型不支持预设默认值
            </span>
            <!-- 其他类型使用 DynamicFormItem 渲染 -->
            <DynamicFormItem
              v-else
              v-model="localFormData.defaultValue"
              :attribute="{
                ...defaultAttribute,
                id: String(defaultAttribute.id),
                isRequired: defaultAttribute.isRequired || '0'
              }"
              :show-label="false"
            >
              <!-- 传递 select 插槽 -->
              <template
                v-if="$slots['select']"
                #select="slotProps"
              >
                <slot
                  name="select"
                  v-bind="slotProps"
                ></slot>
              </template>

              <!-- 传递 selectMulti 插槽 -->
              <template
                v-if="$slots['selectMulti']"
                #selectMulti="slotProps"
              >
                <slot
                  name="selectMulti"
                  v-bind="slotProps"
                ></slot>
              </template>

              <!-- 传递 tree 插槽 -->
              <template
                v-if="$slots['tree']"
                #tree="slotProps"
              >
                <slot
                  name="tree"
                  v-bind="slotProps"
                ></slot>
              </template>

              <!-- 传递 treeMulti 插槽 -->
              <template
                v-if="$slots['treeMulti']"
                #treeMulti="slotProps"
              >
                <slot
                  name="treeMulti"
                  v-bind="slotProps"
                ></slot>
              </template>
            </DynamicFormItem>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item
            label="关联属性"
            name="parentAttributeId"
            tooltip="选择关联属性后，本属性的字典选项会根据关联属性的值进行级联过滤"
          >
            <a-select
              v-model:value="localFormData.parentAttributeId"
              placeholder="选择关联属性"
              allow-clear
              :disabled="!localFormData.dict || filteredParentAttributes.length === 0"
            >
              <a-select-option
                v-for="attr in filteredParentAttributes"
                :key="attr.id"
                :value="attr.id"
              >
                {{ attr.label }}
              </a-select-option>
            </a-select>
            <template #extra>
              <span style="color: #8c8c8c; font-size: 12px;">
                <template v-if="!localFormData.dict">
                  请先选择字典
                </template>
                <template v-else-if="filteredParentAttributes.length === 0">
                  当前分组没有可关联的属性
                </template>
                <template v-else>
                  根据关联属性的值过滤字典选项
                </template>
              </span>
            </template>
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item
            label="控件宽度"
            name="width"
            tooltip="网格单位，每格约60px"
          >
            <a-input-number 
              v-model:value="localFormData.width" 
              :min="1" 
              :max="100"
              placeholder="默认30%"
              style="width: 100%"
            />
            <template #extra>
              <span style="color: #8c8c8c; font-size: 12px;">
                1格=60px，建议：文本2格，日期3格，文本域5-10格
              </span>
            </template>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item
            label="控件高度"
            name="height"
            tooltip="网格单位，每格约60px"
          >
            <a-input-number 
              v-model:value="localFormData.height" 
              :min="1" 
              :max="50"
              placeholder="默认1格"
              style="width: 100%"
            />
            <template #extra>
              <span style="color: #8c8c8c; font-size: 12px;">
                1格=60px，建议：普通控件1格，文本域2-3格
              </span>
            </template>
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item
            label="标签宽度"
            name="labelWidth"
            tooltip="标签显示宽度（px），默认120px"
          >
            <a-input-number 
              v-model:value="localFormData.labelWidth" 
              :min="60" 
              :max="500"
              placeholder="默认120px"
              addon-after="px"
              style="width: 100%"
            />
            <template #extra>
              <span style="color: #8c8c8c; font-size: 12px;">
                当标签文字较长时，可增大宽度，如：150px、180px
              </span>
            </template>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item
            label="分组名称"
            name="group"
            tooltip="可选，用于字段分组"
          >
            <a-input
              v-model:value="localFormData.group"
              placeholder="如: 基本信息"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item
        label="正则校验"
        name="validationRule"
        :label-col="{ span: 3 }"
        :wrapper-col="{ span: 21 }"
      >
        <a-input
          v-model:value="localFormData.validationRule"
          placeholder="如: ^[0-9]{6}$"
        />
        <template #extra>
          <span style="color: #8c8c8c; font-size: 12px;">
            用于自定义字段校验规则，如：手机号、邮箱等格式校验
          </span>
        </template>
      </a-form-item>

      <a-form-item
        label="字段说明"
        name="description"
        :label-col="{ span: 3 }"
        :wrapper-col="{ span: 21 }"
      >
        <a-textarea 
          v-model:value="localFormData.description" 
          :rows="3" 
          placeholder="字段的详细说明，将显示在表单项下方"
        />
      </a-form-item>

      <!-- 显示条件配置 -->
      <a-divider>
        显示条件
      </a-divider>
      
      <a-form-item
        label="条件显示"
        :label-col="{ span: 3 }"
        :wrapper-col="{ span: 21 }"
      >
        <a-checkbox v-model:checked="enableVisibilityCondition">
          启用条件显示
        </a-checkbox>
        <template #extra>
          <span style="color: #8c8c8c; font-size: 12px;">
            启用后，本字段仅在满足条件时显示
          </span>
        </template>
      </a-form-item>

      <a-form-item
        v-if="enableVisibilityCondition"
        label="显示条件"
        :label-col="{ span: 3 }"
        :wrapper-col="{ span: 21 }"
      >
        <div
          v-if="filteredAttributesForCondition.length === 0"
          style="color: #8c8c8c; font-size: 13px;"
        >
          当前分组没有可用的属性作为条件依据
        </div>
        <div
          v-else
          class="visibility-condition-editor"
        >
          <Entity
            v-model:condition="visibilityConditionData"
            :advanced="false"
          />
        </div>
        <template #extra>
          <span style="color: #8c8c8c; font-size: 12px;">
            设置本字段显示的条件，当满足条件时字段才会显示
          </span>
        </template>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<style scoped lang="less">
:deep(.ant-form-item) {
  margin-bottom: 16px;
}

:deep(.ant-form-item-label) {
  label {
    color: #1890ff;
    font-weight: 600;
  }
}

.default-value-hint {
  color: #8c8c8c;
  font-size: 13px;
  font-style: italic;
}

.visibility-condition-editor {
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  background-color: #fafafa;
  padding: 12px;
  max-height: 300px;
  overflow-y: auto;

  :deep(.entity-wrapper) {
    margin: 0;
    padding: 0;
    border: none;
    background: transparent;
  }
}
</style>
