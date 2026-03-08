<script setup lang="ts">
import { message } from 'ant-design-vue'
import type { Rule } from 'ant-design-vue/es/form'
import { ref, watch, computed } from 'vue'

interface SectionFormData {
  id: string
  moduleId: string
  title: string
  description?: string
  required?: string  // 格式: 'flag###min###max' 或 '0'(非必填) 或 '1'(必填)
  multi?: string     // 是否允许多实例：0=单实例，1=多实例
  minCount?: number  // 最少填写数量，0表示选填
  maxCount?: number  // 最多填写数量，0表示不限
  sort: number
}

interface Props {
  visible: boolean
  formData: SectionFormData
  isEdit: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'save', data: SectionFormData): void
}>()

const formRef = ref()
const localFormData = ref<SectionFormData>({ ...props.formData })

// 必填规则类型: 'none' | 'simple' | 'flag'
const requiredType = ref<'none' | 'simple' | 'flag'>('none')
// flag 规则的具体参数
const flagRule = ref({
  flag: '',
  min: 1,
  max: undefined as number | undefined
})

// 多实例配置
const instanceConfig = ref({
  multi: '0' as string,
  minCount: 0,
  maxCount: 0
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

// 解析实例配置
const parseInstanceConfig = (data: SectionFormData) => {
  instanceConfig.value = {
    multi: data.multi || '0',
    minCount: data.minCount || 0,
    maxCount: data.maxCount || 0
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

const formRules = computed<Record<string, Rule[]>>(() => ({
  title: [{ required: true, message: '请输入区块名称', trigger: 'blur' }]
}))

watch(() => props.formData, (newVal) => {
  localFormData.value = { ...newVal }
  parseRequired(newVal.required)
  parseInstanceConfig(newVal)
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
      required: buildRequired(),
      multi: instanceConfig.value.multi,
      minCount: instanceConfig.value.minCount,
      maxCount: instanceConfig.value.maxCount
    }
    console.log('保存区块数据:', saveData)
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
    :title="isEdit ? '编辑区块' : '新增区块'"
    :width="600"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <a-form
      ref="formRef"
      :model="localFormData"
      :rules="formRules"
      :label-col="{ span: 6 }"
      :wrapper-col="{ span: 16 }"
    >
      <a-form-item
        label="区块名称"
        name="title"
      >
        <a-input
          v-model:value="localFormData.title"
          placeholder="请输入区块名称"
        />
      </a-form-item>
      
      <a-form-item
        label="区块描述"
        name="description"
      >
        <a-textarea 
          v-model:value="localFormData.description" 
          placeholder="请输入区块描述"
          :rows="3"
        />
      </a-form-item>
      
      <a-form-item
        label="必填规则"
        name="required"
        tooltip="设置该区块的必填规则：非必填、必填、或基于规则组的条件必填"
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
      
      <a-divider>实例数量配置</a-divider>
      
      <a-form-item
        label="实例模式"
        tooltip="单实例模式只允许创建一个实例，多实例模式允许创建多个"
      >
        <a-radio-group v-model:value="instanceConfig.multi">
          <a-radio value="0">
            单实例
          </a-radio>
          <a-radio value="1">
            多实例
          </a-radio>
        </a-radio-group>
      </a-form-item>
      
      <template v-if="instanceConfig.multi === '1'">
        <a-form-item
          label="最少数量"
          tooltip="该区块至少需要创建几个实例，0表示选填"
        >
          <a-input-number
            v-model:value="instanceConfig.minCount"
            :min="0"
            style="width: 120px"
          />
          <span style="margin-left: 8px; color: #999;">个（0表示选填）</span>
        </a-form-item>
        
        <a-form-item
          label="最多数量"
          tooltip="该区块最多可创建几个实例，0表示不限"
        >
          <a-input-number
            v-model:value="instanceConfig.maxCount"
            :min="0"
            style="width: 120px"
          />
          <span style="margin-left: 8px; color: #999;">个（0表示不限）</span>
        </a-form-item>
      </template>
      
      <a-form-item
        label="排序"
        name="sort"
      >
        <a-input-number 
          v-model:value="localFormData.sort" 
          :min="1"
          style="width: 100%"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<style scoped lang="less">
:deep(.ant-form-item-label) {
  label {
    color: #1890ff;
    font-weight: 600;
  }
}
</style>
