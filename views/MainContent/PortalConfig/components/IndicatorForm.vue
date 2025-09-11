<template>
  <a-form
    ref="formRef"
    :label-col="{ span: 3 }"
    :model="formData"
    :rules="formRules"
    :wrapper-col="{ span: 21 }"
  >
    <a-row :gutter="16">
      <a-col :span="12">
        <a-form-item 
          label="指标值" 
          name="itemValue"
          :label-col="{ span: 6 }"
          :wrapper-col="{ span: 18 }"
        >
          <a-input
            v-model:value="formData.itemValue"
            :maxlength="5"
            placeholder="请输入指标值（最多10个字）"
            show-count
          />
        </a-form-item>
      </a-col>
      <a-col :span="12">
        <a-form-item 
          label="指标名称" 
          name="itemName"
          :label-col="{ span: 6 }"
          :wrapper-col="{ span: 18 }"
        >
          <a-input
            v-model:value="formData.itemName"
            :maxlength="10"
            placeholder="请输入指标名称（最多10个字）"
            show-count
          />
        </a-form-item>
      </a-col>
    </a-row>
    <a-form-item 
      label="指标条件" 
      name="condition"
      :label-col="{ span: 3 }"
      :wrapper-col="{ span: 21 }"
    >
      <div style="display: flex; gap: 8px; width: 100%;">
        <a-button
          style="flex: 1"
          type="dashed"
          @click="openConditionDraw"
        >
          <template #icon>
            <SearchOutlined />
          </template>
          {{ conditionText || '点击选择指标条件' }}
        </a-button>
        <a-button
          v-if="isNotEmpty(formData.condition)"
          danger
          type="text"
          @click="clearCondition"
        >
          <template #icon>
            <DeleteOutlined />
          </template>
        </a-button>
      </div>
    </a-form-item>
    <a-form-item 
      label="动态字段"
      :label-col="{ span: 3 }"
      :wrapper-col="{ span: 21 }"
    >
      <div class="dynamic-fields-container">
        <div
          v-for="(field, index) in formData.dynamicColumn"
          :key="index"
          class="dynamic-field-item"
        >
          <a-row :gutter="8" align="middle">
            <a-col :span="10">
              <a-form-item-rest>
                <a-input
                  v-model:value="field.key"
                  placeholder="字段名称"
                  @change="validateDynamicField(index)"
                />
              </a-form-item-rest>
            </a-col>
            <a-col :span="10">
              <a-form-item-rest>
                <a-input
                  v-model:value="field.value"
                  placeholder="字段值"
                  @change="validateDynamicField(index)"
                />
              </a-form-item-rest>
            </a-col>
            <a-col :span="4">
              <a-button
                :disabled="formData.dynamicColumn.length === 1"
                danger
                type="text"
                @click="removeDynamicField(index)"
              >
                <template #icon>
                  <DeleteOutlined />
                </template>
              </a-button>
            </a-col>
          </a-row>
        </div>
        <a-button
          style="width: 100%; margin-top: 8px"
          type="dashed"
          @click="addDynamicField"
        >
          <template #icon>
            <PlusOutlined />
          </template>
          添加动态字段
        </a-button>
      </div>
    </a-form-item>
    <a-form-item 
      label="备注" 
      name="comment"
      :label-col="{ span: 3 }"
      :wrapper-col="{ span: 21 }"
    >
      <a-textarea
        v-model:value="formData.comment"
        :maxlength="500"
        :rows="3"
        placeholder="请输入备注"
        show-count
      />
    </a-form-item>
  </a-form>
  
  <!-- 高级搜索抽屉 -->
  <portal-advanced-search-modal
    :advanced-condition="entityCondition"
    @confirm="saveEntityCondition"
  />
</template>

<script lang="ts" setup>
import { FormInstance } from 'ant-design-vue'
import type { Rule } from 'ant-design-vue/es/form'
import { DeleteOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { isNotEmpty } from '@/framework/utils/common'
import { dictStore } from '@/framework/store/common'
import { ColumnType, FIELD_TYPE } from '@/framework/components/common/Portal/type'
import { ConditionType } from '@/framework/components/common/AdvancedSearch/type'
import PortalAdvancedSearchModal from '@/framework/components/common/Portal/modal/PortalAdvancedSearchModal.vue'

// 动态字段类型定义
interface DynamicField {
  key: string
  value: string
}

// 表单数据类型定义
interface IndicatorFormData {
  itemValue: string
  itemName: string
  comment: string
  condition: any
  dynamicColumn: DynamicField[]
}

const props = withDefaults(
  defineProps<{
    initialData?: IndicatorFormData
    config: any
  }>(),
  {}
)

const emit = defineEmits<{
  (e: 'update:data', value: IndicatorFormData): void
}>()

const dict = dictStore()
const formRef = ref<FormInstance>()

// 表单数据
const formData = ref<IndicatorFormData>({
  itemValue: '',
  itemName: '',
  comment: '',
  condition: null,
  dynamicColumn: [{ key: '', value: '' }]
})

// 表单验证规则
const formRules: Record<string, Rule[]> = {
  itemValue: [
    { required: true, message: '请输入指标值', trigger: 'blur' },
    { max: 10, message: '指标值最多10个字符', trigger: 'blur' }
  ],
  itemName: [
    { required: true, message: '请输入指标名称', trigger: 'blur' },
    { max: 10, message: '指标名称最多10个字符', trigger: 'blur' }
  ],
  condition: [
    { 
      required: true, 
      message: '请选择指标条件', 
      trigger: 'change',
      validator: (_rule: any, value: any) => {
        if (!value) {
          return Promise.reject(new Error('请选择指标条件'))
        }
        return Promise.resolve()
      }
    }
  ]
}

// 实体条件
const entityCondition = reactive({
  show: false,
  columnArray: [] as Array<ColumnType>,
  title: "",
  condition: {} as ConditionType | undefined,
  key: 0,
  okText: "保存"
})

// 条件文本显示
const conditionText = computed(() => {
  if (isNotEmpty(formData.value.condition)) {
    try {
      const condition = JSON.parse(formData.value.condition)
      if (condition && condition.conditionList && condition.conditionList.length > 0) {
        const firstCondition = condition.conditionList[0]
        if (firstCondition.propertyDisplayName && firstCondition.value) {
          return `已选择: ${firstCondition.propertyDisplayName}`
        }
      }
      return '已设置条件'
    } catch (e) {
      return '条件格式错误'
    }
  }
  return ''
})

// 初始化表单数据
const initFormData = (data?: any) => {
  if (data) {
    formData.value = {
      itemValue: data.itemValue || '',
      itemName: data.itemName || '',
      comment: data.comment || '',
      condition: data.condition || null,
      dynamicColumn: data.dynamicColumn ? 
        (typeof data.dynamicColumn === 'string' ? 
          Object.entries(JSON.parse(data.dynamicColumn)).map(([key, value]) => ({ key, value: String(value) })) :
          Array.isArray(data.dynamicColumn) ? data.dynamicColumn :
          [{ key: '', value: '' }]
        ) : [{ key: '', value: '' }]
    }
    
    // 初始化条件
    if (data.condition) {
      try {
        entityCondition.condition = JSON.parse(data.condition)
      } catch (e) {
        entityCondition.condition = {} as ConditionType
      }
    }
  } else {
    resetForm()
  }
}

// 打开条件选择
const openConditionDraw = async () => {
  entityCondition.columnArray = props.config.columns
    .filter(
      (item: { filterAble: string; show: string }) =>
        item.filterAble === "1" && item.show === "1"
    )
    .map((item: any) => ({
      title: item.displayName,
      key: item.property,
      referenceDict: item.reference,
      fieldType: item.fieldType,
    }));
  
  for (let item of entityCondition.columnArray) {
    if (item.fieldType === FIELD_TYPE.SELECT && isNotEmpty(item.referenceDict)) {
      item.referenceDictOption = (await dict.getDict(item.referenceDict)) || [];
    }
  }
  
  if (isNotEmpty(formData.value.condition)) {
    try {
      entityCondition.condition = JSON.parse(formData.value.condition);
    } catch (e) {
      entityCondition.condition = {} as ConditionType;
    }
  } else {
    entityCondition.condition = {} as ConditionType;
  }
  
  entityCondition.show = true;
  entityCondition.key++;
}

// 保存条件
const saveEntityCondition = () => {
  formData.value.condition = JSON.stringify(entityCondition.condition)
  formRef.value?.validateFields(['condition'])
  emit('update:data', formData.value)
}

// 清除条件
const clearCondition = () => {
  formData.value.condition = null
  entityCondition.condition = {} as ConditionType
  formRef.value?.validateFields(['condition'])
  emit('update:data', formData.value)
}

// 动态字段操作
const addDynamicField = () => {
  formData.value.dynamicColumn.push({ key: '', value: '' })
  emit('update:data', formData.value)
}

const removeDynamicField = (index: number) => {
  if (formData.value.dynamicColumn.length > 1) {
    formData.value.dynamicColumn.splice(index, 1)
    emit('update:data', formData.value)
  }
}

const validateDynamicField = (index: number) => {
  const field = formData.value.dynamicColumn[index]
  if (field.key && field.value) {
    console.debug(`动态字段 ${index} 有效:`, field)
  }
  emit('update:data', formData.value)
}

// 表单验证
const validate = () => {
  return formRef.value?.validate()
}

// 重置表单
const resetForm = () => {
  formData.value = {
    itemValue: '',
    itemName: '',
    comment: '',
    condition: null,
    dynamicColumn: [{ key: '', value: '' }]
  }
  formRef.value?.resetFields()
}

// 获取提交数据
const getSubmitData = () => {
  // 过滤空的动态字段并转换为Map类型
  const validDynamicColumn = formData.value.dynamicColumn.filter(
    field => field.key.trim() !== '' && field.value.trim() !== ''
  )
  
  // 转换为Map对象
  const dynamicColumnMap = new Map()
  validDynamicColumn.forEach(field => {
    dynamicColumnMap.set(field.key, field.value)
  })

  return {
    ...formData.value,
    dynamicColumn: JSON.stringify(Object.fromEntries(dynamicColumnMap))
  }
}

// 监听配置变化
watch(() => props.config, () => {
  entityCondition.columnArray = props.config.columns
}, { deep: true, immediate: true })

// 监听初始数据变化
watch(
  () => props.initialData, (newData) => {
  if (newData) {
    initFormData(newData)
  }
}, { immediate: true, deep: true })

// 监听表单数据变化，向父组件发出事件
watch(formData, (newData) => {
  emit('update:data', newData)
}, { deep: true })

// 暴露方法给父组件
defineExpose({
  validate,
  resetForm,
  getSubmitData,
  initFormData
})
</script>

<style lang="less" scoped>
// 指标配置表单样式
.dynamic-fields-container {
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  padding: 12px;
  background-color: #fafafa;

  .dynamic-field-item {
    margin-bottom: 8px;
    padding: 8px;
    background-color: #ffffff;
    border: 1px solid #e8e8e8;
    border-radius: 4px;

    &:last-child {
      margin-bottom: 0;
    }

    &:hover {
      border-color: #40a9ff;
      box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
    }
  }
}

// 表单样式优化
.ant-form-item {
  margin-bottom: 24px;
}

.ant-input,
.ant-textarea {
  &:focus {
    border-color: #40a9ff;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
  }
}

// 按钮样式
.ant-btn {
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;
  }
}

// 指标分组选择按钮
.ant-btn-dashed {
  border-style: dashed;
  border-color: #d9d9d9;

  &:hover {
    border-color: #40a9ff;
    color: #40a9ff;
  }
}

// 删除按钮样式
.ant-btn-text.ant-btn-dangerous {
  &:hover {
    background-color: #fff2f0;
    border-color: #ff4d4f;
  }
}
</style>