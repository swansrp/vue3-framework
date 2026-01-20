<script setup lang="ts">
import { QuestionCircleOutlined } from '@ant-design/icons-vue'
import { computed, ref, watch } from 'vue'

import { FIELD_TYPE } from '@/framework/components/common/Portal/type'
import UploadFile from '@/framework/components/common/UploadFile/index.vue'
import { strRemoveLF } from '@/framework/utils/common'

interface Attribute {
  id: string;
  name: string;
  label: string;
  fieldType: string;
  isRequired: string;
  unit?: string;
  defaultValue?: string;
  description?: string;
  minValue?: string;
  maxValue?: string;
  labelWidth?: number; // 标签宽度（px）
  [key: string]: any;
}

interface Props {
  attribute: Attribute;
  modelValue?: any; // v-model 绑定值
  readonly?: boolean;
  showLabel?: boolean; // 是否显示标签
  dictTranslateFn?: (dictName: string, value: string) => Promise<string>; // 字典翻译函数
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  showLabel: true,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void;
}>()

// 计算当前值：优先使用 modelValue，如果为 undefined 则使用 defaultValue
const currentValue = computed({
  get() {
    return props.modelValue !== undefined
      ? props.modelValue
      : props.attribute.defaultValue
  },
  set(value) {
    emit('update:modelValue', value)
  },
})

// 开关类型的值计算（与 currentValue 同步）
const switchChecked = computed({
  get() {
    // Switch 类型默认值为 '0'（未选中）
    const value = props.modelValue !== undefined
      ? props.modelValue
      : (props.attribute.defaultValue || '0')
    return value
  },
  set(value) {
    emit('update:modelValue', value)
  },
})

// 字段类型映射
const fieldTypeMap: Record<string, string> = {
  [FIELD_TYPE.SECTION_TITLE]: '区域标题',
  [FIELD_TYPE.DIVIDER]: '分割线',
  [FIELD_TYPE.INPUT]: '文本输入',
  [FIELD_TYPE.SWITCH]: '开关',
  [FIELD_TYPE.NUMBER]: '数值',
  [FIELD_TYPE.SELECT]: '下拉选择',
  [FIELD_TYPE.TREE]: '树形选择',
  [FIELD_TYPE.DATE]: '日期',
  [FIELD_TYPE.DATETIME]: '日期时间',
  [FIELD_TYPE.HREF]: '超链接',
  [FIELD_TYPE.HTML]: 'HTML',
  [FIELD_TYPE.TEXT_AREA]: '文本域',
  [FIELD_TYPE.IMAGE]: '图片',
  [FIELD_TYPE.AUDIO]: '音频',
  [FIELD_TYPE.VIDEO]: '视频',
  [FIELD_TYPE.FILE]: '文件',
}

const getFieldTypeName = (fieldType: string) => {
  return fieldTypeMap[fieldType] || '文本输入'
}

// 判断是否为文本域类型
const isTextAreaType = (fieldType: string) => {
  return (
    fieldType === FIELD_TYPE.TEXT_AREA ||
    fieldType === FIELD_TYPE.HREF ||
    fieldType === FIELD_TYPE.HTML
  )
}

// 判断是否为分割线（兼容数字和字符串类型）
const isDivider = (fieldType: string) => {
  return String(fieldType) === String(FIELD_TYPE.DIVIDER)
}

// 判断是否为区域标题
const isSectionTitle = (fieldType: string) => {
  return String(fieldType) === String(FIELD_TYPE.SECTION_TITLE)
}

// 计算 label 宽度（默认 120px）
const labelWidthStyle = computed(() => {
  const width = props.attribute.labelWidth || 120
  return {
    minWidth: `${width}px`,
    maxWidth: `${width}px`,
    width: `${width}px`,
  }
})

// 格式化显示值
const formatDisplayValue = (value: any, fieldType: string) => {
  if (value === undefined || value === null || value === '') {
    return '-'
  }
  
  // 开关类型
  if (fieldType === FIELD_TYPE.SWITCH) {
    return value === '1' ? '是' : '否'
  }
  
  // 其他类型直接返回
  return value
}

// 翻译后的显示值（用于 readonly 模式）
const translatedDisplayValue = ref<string>('')

// 当 readonly 模式下，且是 SELECT 类型且有 dictTranslateFn 时，进行翻译
watch(
  () => [props.readonly, currentValue.value, props.attribute.dict, props.dictTranslateFn],
  async () => {
    // 检查 dict 是否有效（不为空字符串）
    const hasValidDict = props.attribute.dict && props.attribute.dict.trim() !== ''
    
    if (
      props.readonly &&
      (props.attribute.fieldType === FIELD_TYPE.SELECT || 
       props.attribute.fieldType === FIELD_TYPE.SELECT_MULTI_IN_ONE) &&
      hasValidDict &&
      currentValue.value &&
      props.dictTranslateFn
    ) {
      try {
        const label = await props.dictTranslateFn(props.attribute.dict, String(currentValue.value))
        translatedDisplayValue.value = label
      } catch (error) {
        console.error('翻译失败:', error)
        translatedDisplayValue.value = formatDisplayValue(currentValue.value, props.attribute.fieldType)
      }
    } else {
      translatedDisplayValue.value = formatDisplayValue(currentValue.value, props.attribute.fieldType)
    }
  },
  { immediate: true }
)

// 文件上传类型的“是否有文件”状态（仅非必填字段）
const fileExistenceChoice = ref<'yes' | 'no' | null>(null)
// 上传模态框引用
const uploadFileModalRef = ref()
// 上传后的 URL
const uploadUrl = ref('')

// 监听 currentValue 变化，同步 fileExistenceChoice
watch(
  () => currentValue.value,
  (newVal) => {
    // 如果是文件类型且非必填
    const isFileType = [
      FIELD_TYPE.IMAGE,
      FIELD_TYPE.AUDIO,
      FIELD_TYPE.VIDEO,
      FIELD_TYPE.FILE
    ].includes(props.attribute.fieldType as any)
    
    if (isFileType && props.attribute.isRequired !== '1') {
      if (newVal === 'NO_FILE') {
        fileExistenceChoice.value = 'no'
      } else if (newVal) {
        fileExistenceChoice.value = 'yes'
      } else {
        fileExistenceChoice.value = null
      }
    }
  },
  { immediate: true }
)

// 处理"是否有文件"选择
const handleFileExistenceChange = (choice: 'yes' | 'no') => {
  fileExistenceChoice.value = choice
  
  if (choice === 'no') {
    // 选择"没有"，设置特殊值
    currentValue.value = 'NO_FILE'
  } else {
    // 选择"有"，清空值，等待上传
    currentValue.value = ''
  }
}

// 监听 uploadUrl 变化，同步到 currentValue
watch(() => uploadUrl.value, (newUrl) => {
  if (newUrl) {
    currentValue.value = newUrl
  }
})

// 处理文件上传 - 打开上传模态框
const handleFileUpload = () => {
  uploadFileModalRef.value?.showUploadDialogBox(props.attribute.fieldType)
}
</script>

<template>
  <!-- 区域标题 -->
  <div
    v-if="isSectionTitle(attribute.fieldType)"
    class="form-section-title-card"
  >
    <div class="section-title-content">
      <span class="section-title-indicator"></span>
      <span class="section-title-text">{{ attribute.label }}</span>
    </div>
    
    <!-- 尾部操作插槽 -->
    <slot
      name="action"
      :attribute="attribute"
    ></slot>
  </div>

  <!-- 分割线 -->
  <div
    v-else-if="isDivider(attribute.fieldType)"
    class="form-divider-card"
  >
    <a-divider>
      <span
        v-if="attribute.label"
        class="divider-label"
      >
        {{ attribute.label }}
      </span>
    </a-divider>
    
    <!-- 尾部操作插槽（分割线也支持） -->
    <slot
      name="action"
      :attribute="attribute"
    ></slot>
  </div>

  <!-- 普通表单项 -->
  <div
    v-else
    class="form-item-card"
  >
    <!-- 水平布局：标签和控件 -->
    <div
      class="field-row"
      :class="{ 'is-textarea': isTextAreaType(attribute.fieldType) }"
    >
      <div
        v-if="showLabel"
        class="field-label-inline"
        :style="labelWidthStyle"
      >
        <!-- 必填星号 -->
        <span
          v-if="attribute.isRequired === '1'"
          class="required-star"
        >*</span>
        <!-- Label文本 -->
        <div
          class="label-text"
          :style="{
            color: '#262626',
            fontWeight: attribute.isRequired === '1' ? 600 : 500,
          }"
        >
          <template v-if="attribute.label">
            <div
              v-for="(line, index) in attribute.label.split('\\n')"
              :key="index"
            >
              {{ line }}
            </div>
          </template>
        </div>
        <!-- 描述信息 tooltip -->
        <a-tooltip
          v-if="attribute.description"
          :title="attribute.description"
        >
          <question-circle-outlined class="label-tooltip-icon" />
        </a-tooltip>
      </div>

      <div class="field-control-inline">
        <!-- readonly 模式：使用 span 显示值 -->
        <span
          v-if="readonly"
          class="readonly-value"
          :class="{ 'is-empty': !translatedDisplayValue || translatedDisplayValue === '-' }"
        >
          {{ translatedDisplayValue || '-' }}
          <span
            v-if="attribute.unit"
            class="field-unit"
          > {{ attribute.unit }}</span>
        </span>

        <!-- 编辑模式：显示表单组件 -->
        <template v-else>
          <!-- 文本输入 -->
          <div
            v-if="attribute.fieldType === FIELD_TYPE.INPUT"
            style="display: flex; align-items: center; gap: 4px;"
          >
            <a-input
              v-model:value="currentValue"
              :placeholder="`请输入${strRemoveLF(attribute.label)}`"
              :disabled="readonly"
              style="flex: 1;"
            />
            <span
              v-if="attribute.unit"
              class="field-unit-suffix"
            >{{ attribute.unit }}</span>
          </div>

          <!-- 开关 -->
          <div
            v-else-if="attribute.fieldType === FIELD_TYPE.SWITCH"
            style="height: 32px; display: flex; align-items: center"
          >
            <a-switch
              v-model:checked="switchChecked"
              :disabled="readonly"
              style="width: 40px"
              checked-value="1"
              un-checked-value="0"
              @change="(val) => emit('update:modelValue', val)"
            />
          </div>

          <!-- 数值输入 -->
          <div
            v-else-if="attribute.fieldType === FIELD_TYPE.NUMBER"
            style="display: flex; align-items: center; gap: 4px;"
          >
            <a-input-number
              v-model:value="currentValue"
              :placeholder="`请输入${strRemoveLF(attribute.label)}`"
              :max="attribute.maxValue ? Number(attribute.maxValue) : undefined"
              :min="attribute.minValue ? Number(attribute.minValue) : undefined"
              :disabled="readonly"
              string-mode
              style="flex: 1;"
            />
            <span
              v-if="attribute.unit"
              class="field-unit-suffix"
            >{{ attribute.unit }}</span>
          </div>

          <!-- 下拉选择 -->
          <slot
            v-else-if="
              attribute.fieldType === FIELD_TYPE.SELECT ||
                attribute.fieldType === FIELD_TYPE.SELECT_MULTI_IN_ONE
            "
            name="select"
            :attribute="attribute"
            :value="currentValue"
            :readonly="readonly"
            :update-value="(val: any) => emit('update:modelValue', val)"
          >
            <a-select
              v-model:value="currentValue"
              :placeholder="`请选择${strRemoveLF(attribute.label)}`"
              :disabled="readonly"
              style="width: 100%"
            />
          </slot>

          <!-- 树形选择 -->
          <slot
            v-else-if="
              attribute.fieldType === FIELD_TYPE.TREE ||
                attribute.fieldType === FIELD_TYPE.TREE_MULTI_IN_ONE
            "
            name="tree"
            :attribute="attribute"
            :value="currentValue"
            :readonly="readonly"
            :update-value="(val: any) => emit('update:modelValue', val)"
          >
            <a-tree-select
              v-model:value="currentValue"
              :placeholder="`请选择${strRemoveLF(attribute.label)}`"
              :disabled="readonly"
              allow-clear
              tree-default-expand-all
              tree-node-filter-prop="label"
              style="width: 100%"
            />
          </slot>

          <!-- 日期 -->
          <a-date-picker
            v-else-if="attribute.fieldType === FIELD_TYPE.DATE"
            v-model:value="currentValue"
            :placeholder="`请选择${attribute.label}`"
            :disabled="readonly"
            allow-clear
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />

          <!-- 日期时间 -->
          <a-date-picker
            v-else-if="attribute.fieldType === FIELD_TYPE.DATETIME"
            v-model:value="currentValue"
            :placeholder="`请选择${attribute.label}`"
            :disabled="readonly"
            allow-clear
            show-time
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />

          <!-- 文本域（超链接、HTML、文本域） -->
          <a-textarea
            v-else-if="isTextAreaType(attribute.fieldType)"
            v-model:value="currentValue"
            :placeholder="`请输入${attribute.label}`"
            :auto-size="{ minRows: 3 }"
            :disabled="readonly"
            style="width: 100%"
          />

          <!-- 多媒体类型（图片、音频、视频、文件） -->
          <div
            v-else-if="
              attribute.fieldType === FIELD_TYPE.IMAGE ||
                attribute.fieldType === FIELD_TYPE.AUDIO ||
                attribute.fieldType === FIELD_TYPE.VIDEO ||
                attribute.fieldType === FIELD_TYPE.FILE
            "
            style="display: flex; flex-direction: column; gap: 12px; width: 100%"
          >
            <!-- 非必填：先选择是否有文件 -->
            <template v-if="attribute.isRequired !== '1'">
              <!-- 选择 radio -->
              <a-radio-group
                v-if="!fileExistenceChoice"
                class="file-choice-radio"
                @change="(e) => handleFileExistenceChange(e.target.value)"
              >
                <a-radio value="yes">
                  上传{{ getFieldTypeName(attribute.fieldType) }}
                </a-radio>
                <a-radio value="no">
                  没有{{ getFieldTypeName(attribute.fieldType) }}
                </a-radio>
              </a-radio-group>
              
              <!-- 选择“有”：显示上传按钮 -->
              <div
                v-else-if="fileExistenceChoice === 'yes'"
                style="display: flex; align-items: center; gap: 8px;"
              >
                <a-button
                  type="dashed"
                  :disabled="readonly"
                  style="flex: 1;"
                  @click="handleFileUpload"
                >
                  {{ currentValue && currentValue !== 'NO_FILE' ? '已上传，点击重新上传' : '点击上传' + getFieldTypeName(attribute.fieldType) }}
                </a-button>
                <a-button
                  size="small"
                  @click="fileExistenceChoice = null; currentValue = ''"
                >
                  重新选择
                </a-button>
              </div>
              
              <!-- 选择“没有”：显示确认信息 -->
              <div
                v-else-if="fileExistenceChoice === 'no'"
                style="display: flex; align-items: center; gap: 8px;"
              >
                <a-tag
                  color="default"
                  style="flex: 1; text-align: center; padding: 6px 12px; margin: 0;"
                >
                  已确认没有{{ getFieldTypeName(attribute.fieldType) }}
                </a-tag>
                <a-button
                  size="small"
                  @click="fileExistenceChoice = null; currentValue = ''"
                >
                  重新选择
                </a-button>
              </div>
            </template>
            
            <!-- 必填：直接显示上传按钮 -->
            <a-button
              v-else
              type="dashed"
              :disabled="readonly"
              style="width: 100%;"
              @click="handleFileUpload"
            >
              {{ currentValue && currentValue !== 'NO_FILE' ? '已上传，点击重新上传' : '点击上传' + getFieldTypeName(attribute.fieldType) }}
            </a-button>
          </div>



          <!-- 默认：文本输入 -->
          <a-input
            v-else
            v-model:value="currentValue"
            :placeholder="`请输入${attribute.label}`"
            :disabled="readonly"
          />
        </template>
      </div>

      <!-- 尾部操作插槽 -->
      <slot
        name="action"
        :attribute="attribute"
      ></slot>
    </div>
  </div>
  <!-- 上传模态框 -->
  <upload-file
    ref="uploadFileModalRef"
    v-model:url="uploadUrl"
  />
</template>

<style scoped lang="less">
// 样式已在 GridDraggableLayout 中统一定义
// 这里不需要重复定义,通过 .form-item-card 类名自动应用样式

// 覆盖父组件的 field-label-inline 样式,确保标签宽度一致
.form-item-card {
  .field-row {
    .field-label-inline {
      flex-shrink: 0 !important;
      padding-right: 8px !important;
      text-align: right !important;
      display: flex !important;
      align-items: center !important;
      justify-content: flex-end !important;
      gap: 4px !important;

      .required-star {
        color: #ff4d4f;
        font-size: 14px;
        line-height: 1;
        flex-shrink: 0;
        order: 1;
      }

      .label-text {
        flex: 0 1 auto;
        line-height: 22px;
        word-break: break-word;
        text-align: right;
        order: 2;
      }
      
      .label-tooltip-icon {
        color: rgba(0, 0, 0, 0.45);
        font-size: 14px;
        cursor: help;
        order: 3;
        flex-shrink: 0;
        
        &:hover {
          color: rgba(0, 0, 0, 0.65);
        }
      }
    }

    .field-control-inline {
      flex: 1 !important;
      min-width: 0 !important;
    }
  }

  .field-unit {
    color: #8c8c8c;
    font-weight: 400;
  }
  
  .field-unit-suffix {
    color: #8c8c8c;
    font-size: 13px;
    font-weight: 400;
    white-space: nowrap;
    flex-shrink: 0;
  }
}

.readonly-value {
  display: inline-block;
  min-height: 32px;
  line-height: 32px;
  color: #262626;
  font-size: 14px;
  word-break: break-all;
  white-space: pre-wrap;
  
  &.is-empty {
    color: #bfbfbf;
    font-style: italic;
  }
}

.form-divider-card {
  position: relative;
  height: 100%;
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  gap: 8px;

  :deep(.ant-divider) {
    flex: 1;
    margin: 0;
    border-top-color: #d9d9d9;
    border-top-width: 1px;

    .ant-divider-inner-text {
      padding: 0 16px;
      background: transparent;
    }
  }

  .divider-label {
    font-size: 13px;
    font-weight: 500;
    color: #595959;
  }
  
  // 操作按钮区域（仅在 hover 时显示）
  :deep(.field-actions) {
    flex-shrink: 0;
    opacity: 0;
    transition: opacity 0.2s;
  }
  
  &:hover :deep(.field-actions) {
    opacity: 1;
  }
}

// 区域标题样式
.form-section-title-card {
  position: relative;
  height: 100%;
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
  
  .section-title-content {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .section-title-indicator {
    width: 4px;
    height: 16px;
    background: linear-gradient(180deg, #1890ff 0%, #096dd9 100%);
    border-radius: 2px;
    flex-shrink: 0;
  }
  
  .section-title-text {
    font-size: 14px;
    font-weight: 600;
    color: #262626;
    letter-spacing: 0.5px;
  }
  
  // 操作按钮区域（仅在 hover 时显示）
  :deep(.field-actions) {
    flex-shrink: 0;
    opacity: 0;
    transition: opacity 0.2s;
  }
  
  &:hover :deep(.field-actions) {
    opacity: 1;
  }
}

// 文件选择 radio 样式
.file-choice-radio {
  display: flex;
  justify-content: center;
  gap: 24px;
  padding: 8px 0;
}
</style>
