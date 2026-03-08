<script setup lang="ts">
import { message } from 'ant-design-vue'
import type { Rule } from 'ant-design-vue/es/form'
import { ref, watch, computed } from 'vue'

interface AttributeGroupFormData {
  id: string
  sectionId: string
  pid?: number | null  // 父分组ID，null表示顶级分组
  title: string
  description?: string
  multi: string
  required?: string  // 格式: 'flag###min###max' 或 '0'(非必填) 或 '1'(必填)
  sort: number
}

interface Props {
  visible: boolean
  formData: AttributeGroupFormData
  isEdit: boolean
  availableGroups?: any[]  // 可选的父分组列表
}

const props = withDefaults(defineProps<Props>(), {
  availableGroups: () => []
})

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'save', data: AttributeGroupFormData): void
}>()

const formRef = ref()
const localFormData = ref<AttributeGroupFormData>({ ...props.formData })

// 必填规则类型: 'none' | 'simple' | 'flag'
const requiredType = ref<'none' | 'simple' | 'flag'>('none')
// flag 规则的具体参数
const flagRule = ref({
  flag: '',
  min: 1,
  max: undefined as number | undefined
})

// 解析 required 字段
const parseRequired = (required?: string) => {
  if (!required || required === '0') {
    requiredType.value = 'none'
    flagRule.value = { flag: '', min: 1, max: undefined }
  } else if (required === '1') {
    requiredType.value = 'simple'
    flagRule.value = { flag: '', min: 1, max: undefined }
  } else if (required.includes('###')) {
    requiredType.value = 'flag'
    const parts = required.split('###')
    flagRule.value = {
      flag: parts[0] || '',
      min: parseInt(parts[1]) || 1,
      max: parts[2] ? parseInt(parts[2]) : undefined
    }
  } else {
    requiredType.value = 'none'
    flagRule.value = { flag: '', min: 1, max: undefined }
  }
}

// 组装 required 字段值
const buildRequired = (): string => {
  if (requiredType.value === 'none') {
    return '0'
  } else if (requiredType.value === 'simple') {
    return '1'
  } else {
    // flag 模式
    const parts = [flagRule.value.flag, String(flagRule.value.min)]
    if (flagRule.value.max !== undefined && flagRule.value.max !== null) {
      parts.push(String(flagRule.value.max))
    }
    return parts.join('###')
  }
}

// 动态表单验证规则
const formRules = computed<Record<string, Rule[]>>(() => ({
  title: localFormData.value.multi === '1' 
    ? [{ required: true, message: '多组模式下请输入分组标题', trigger: 'blur' }]
    : []
}))

// 构建父分组选项（排除自己和自己的子孙节点）
const parentGroupOptions = computed(() => {
  if (!props.isEdit) {
    // 新增模式：显示所有分组
    return props.availableGroups || []
  }
  
  // 编辑模式：排除自己和自己的子孙节点
  const excludeIds = new Set<string>()
  excludeIds.add(localFormData.value.id)
  
  // 递归查找所有子孙节点
  const findChildren = (pid: string) => {
    (props.availableGroups || []).forEach(group => {
      if (String(group.pid) === pid) {
        excludeIds.add(String(group.id))
        findChildren(String(group.id))
      }
    })
  }
  findChildren(localFormData.value.id)
  
  return (props.availableGroups || []).filter(g => !excludeIds.has(String(g.id)))
})

// 监听 formData 变化
watch(() => props.formData, (newVal) => {
  localFormData.value = { ...newVal }
  parseRequired(newVal.required)
  // 新增分组时，默认必填
  if (!props.isEdit && (!newVal.required || newVal.required === '0')) {
    requiredType.value = 'simple'
  }
}, { deep: true, immediate: true })

const handleOk = async () => {
  try {
    // 如果是条件必填模式，手动验证规则标识
    if (requiredType.value === 'flag' && !flagRule.value.flag) {
      message.error('请输入规则标识')
      return
    }
    
    await formRef.value.validate()
    // 组装 required 字段
    const saveData = {
      ...localFormData.value,
      required: buildRequired()
    }
    console.log('保存分组数据:', saveData)
    emit('save', saveData)
  } catch (error) {
    console.error('表单验证失败:', error)
  }
}

const handleCancel = () => {
  emit('update:visible', false)
}
</script>

<template>
  <a-modal
    :open="visible"
    :title="isEdit ? '编辑分组' : '新增分组'"
    :width="600"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <a-form
      ref="formRef"
      :model="localFormData"
      :rules="formRules"
      :label-col="{ span: 5 }"
      :wrapper-col="{ span: 18 }"
    >
      <a-form-item
        label="父分组"
        name="pid"
        tooltip="选择父分组后，当前分组将作为其子分组；不选则为顶级分组"
      >
        <a-select
          v-model:value="localFormData.pid"
          placeholder="请选择父分组（不选则为顶级分组）"
          allow-clear
          style="width: 100%"
        >
          <a-select-option :value="null">
            无（顶级分组）
          </a-select-option>
          <a-select-option
            v-for="group in parentGroupOptions"
            :key="group.id"
            :value="group.id"
          >
            {{ group.title }}
          </a-select-option>
        </a-select>
      </a-form-item>

      <a-form-item
        label="分组标题"
        name="title"
      >
        <a-input
          v-model:value="localFormData.title"
          placeholder="请输入分组标题"
        />
      </a-form-item>

      <a-form-item
        label="分组描述"
        name="description"
      >
        <a-textarea
          v-model:value="localFormData.description"
          :rows="3"
          placeholder="请输入分组描述"
        />
      </a-form-item>

      <a-form-item
        label="是否多行"
        name="multi"
        tooltip="多行模式支持用户动态添加多行数据，如工作经历、教育经历等"
      >
        <a-radio-group v-model:value="localFormData.multi">
          <a-radio value="0">
            单组（普通分组）
          </a-radio>
          <a-radio value="1">
            多组（子表模式）
          </a-radio>
        </a-radio-group>
      </a-form-item>

      <a-form-item
        label="必填规则"
        name="required"
        tooltip="设置该分组的必填规则：非必填、必填、或基于规则组的条件必填"
      >
        <a-radio-group v-model:value="requiredType">
          <a-radio value="none">
            非必填
          </a-radio>
          <a-radio value="simple">
            必填
          </a-radio>
          <a-radio value="flag">
            条件必填
          </a-radio>
        </a-radio-group>
      </a-form-item>
      
      <!-- 条件必填参数 -->
      <template v-if="requiredType === 'flag'">
        <a-form-item
          label="规则标识"
          tooltip="相同标识的区块/分组将作为一个规则组进行校验"
        >
          <a-input
            v-model:value="flagRule.flag"
            placeholder="如: production_type"
          />
        </a-form-item>
        
        <a-form-item
          label="最少填写"
          tooltip="该规则组中至少需要填写几个"
        >
          <a-input-number
            v-model:value="flagRule.min"
            :min="1"
            style="width: 120px"
          />
          <span style="margin-left: 8px; color: #999;">个</span>
        </a-form-item>
        
        <a-form-item
          label="最多填写"
          tooltip="该规则组中最多可填写几个（留空表示不限制）"
        >
          <a-input-number
            v-model:value="flagRule.max"
            :min="flagRule.min"
            placeholder="不限制"
            style="width: 120px"
          />
          <span style="margin-left: 8px; color: #999;">个（留空不限）</span>
        </a-form-item>
      </template>

      <a-form-item
        label="排序"
        name="sort"
      >
        <a-input-number
          v-model:value="localFormData.sort"
          :min="0"
          style="width: 200px"
        />
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
</style>
