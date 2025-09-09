<template>
  <dialog-box
    v-model:visible="_show"
    :title="config.title"
    is-full>
    <content-layout :width="400" style="margin-top: 20px">
      <template #side>
        <portal
          :advance-condition="groupAdvanceCondition"
          :bind-default-value="defaultValue"
          table-id="SysPortalIndicatorGroup"
          tree-mode
          @selected-data="onSelectedData" />
      </template>
      <template #content>
        <portal
          v-if="isNotEmpty(selectedTreeData[0])"
          ref="indicatorRef"
          :action-width="0"
          :advance-condition="advanceCondition"
          :bind-default-value="{groupId: selectedTreeData[0]}"
          :hide-add="isEmpty(selectedTreeData[0])"
          style="margin-top: 10px"
          table-id="SysPortalIndicator"
        >
          <template #left-btns v-if="!indicatorData">
            <a-tooltip placement="top">
              <template #title>
                <span>字典指标</span>
              </template>
              <a-button
                shape="circle" size="middle" style="margin-left: 3px" type="primary"
                @click="showDictGenerator = true">
                <template #icon>
                  <ThunderboltOutlined />
                </template>
              </a-button>
            </a-tooltip>
          </template>
          <template #add="{ modal }">
            <!-- region 指标配置填表页面 -->
            <a-modal
              v-model:open="modal.show"
              :confirm-loading="addModal.loading"
              title="指标配置"
              width="800px"
              @cancel="handleAddCancel(modal)"
              @ok="handleAddSubmit(modal)"
            >
              <indicator-form
                ref="addFormRef"
                :config="config"
                @update:data="updateAddFormData"
              />
            </a-modal>
          </template>
          <template #modify="{modal}">
            <a-modal
              v-model:open="modal.show"
              :confirm-loading="modifyModal.loading"
              title="修改指标"
              width="800px"
              @cancel="handleModifyCancel(modal)"
              @ok="handleModifySubmit(modal)"
            >
              <indicator-form
                ref="modifyFormRef"
                :config="config"
                :initial-data="modal.data"
                @update:data="updateModifyFormData"
              />
            </a-modal>
          </template>
        </portal>
      </template>
    </content-layout>
    <!-- endregion -->
    
    <!-- 字典一键生成指标集组件 -->
    <dict-to-indicator-generator
      v-model:show="showDictGenerator"
      :config="config"
      :selected-group-id="selectedTreeData[0]"
      @generated="onIndicatorsGenerated"
      @close="showDictGenerator = false"
    />
  </dialog-box>
</template>

<script lang="ts" setup>

import { buildCondition } from '@/framework/components/common/Portal/utils'
import { FILTER_TYPE } from '@/framework/components/common/Portal/type'
import { ConditionListType } from '@/framework/components/common/AdvancedSearch/ConditionList/type'
import DialogBox from '@/framework/components/common/dialogBox/DialogBox.vue'
import { message } from 'ant-design-vue'
import { isEmpty, isNotEmpty } from '@/framework/utils/common'
import { addEntity, updateEntitySelective } from '@/framework/apis/portal'
import IndicatorForm from './components/IndicatorForm.vue'
import DictToIndicatorGenerator from './components/DictToIndicatorGenerator.vue'
import { ThunderboltOutlined } from '@ant-design/icons-vue'

const props = withDefaults(
  defineProps<{
    show: boolean
    config: any
  }>(),
  {}
)
const { config, show } = toRefs(props)
const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()

const defaultValue = reactive({ portalName: undefined })

const _show = ref(props.show)
watch(
  () => show.value,
  () => _show.value = show.value
)
watch(
  () => _show.value,
  () => emit('update:show', _show.value)
)

const selectedTreeData = ref<any>([])
const onSelectedData = (data: any) => {
  selectedTreeData.value = [...data]
}

const indicatorRef = ref()
const advanceCondition = computed(() => {
  const conditionList = isNotEmpty(selectedTreeData.value) ? [buildCondition('groupId', FILTER_TYPE.EQUAL, selectedTreeData.value)] : []
  return { conditionList } as ConditionListType
})
watch(
  () => config.value.name,
  () => defaultValue.portalName = config.value.name
)
const groupAdvanceCondition = computed(() => {
  const conditionList = [buildCondition('portalName', FILTER_TYPE.EQUAL, [config.value.name])]
  return { conditionList } as ConditionListType
})

const indicatorData = computed(() => {
  return indicatorRef.value?.getData().length > 0
})

// 指标配置表单相关状态
const addModal = reactive({
  loading: false
})

// 修改模态框相关状态
const modifyModal = reactive({
  loading: false
})

const addFormRef = ref()
const modifyFormRef = ref()

// 添加表单数据
const addFormData = ref({})

// 修改表单数据  
const modifyFormData = ref<any>({})

// 字典生成器显示状态
const showDictGenerator = ref(false)


// 新的添加和修改方法
const updateAddFormData = (data: any) => {
  addFormData.value = data
}

const updateModifyFormData = (data: any) => {
  modifyFormData.value = data
}

const handleAddSubmit = async (modal: any) => {
  try {
    addModal.loading = true
    await addFormRef.value?.validate()

    const submitData = {
      ...addFormRef.value.getSubmitData(),
      portalName: config.value.name,
      groupId: selectedTreeData.value[0] || null
    }

    await addEntity('portal/indicator', submitData)
    message.success('添加成功')

    modal.show = false
    addFormRef.value?.resetForm()
    indicatorRef.value.queryData()
  } catch (error) {
    message.error('添加失败')
  } finally {
    addModal.loading = false
  }
}

const handleAddCancel = (modal: any) => {
  modal.show = false
  addFormRef.value?.resetForm()
}

const handleModifySubmit = async (modal: any) => {
  try {
    modifyModal.loading = true
    await modifyFormRef.value?.validate()

    const updateData = {
      id: modal.data.id,
      ...modifyFormRef.value.getSubmitData()
    }

    await updateEntitySelective('portal/indicator', updateData)
    message.success('修改成功')

    modal.show = false
    modifyFormRef.value?.resetForm()
    indicatorRef.value.queryData()
  } catch (error) {
    message.error('修改失败')
  } finally {
    modifyModal.loading = false
  }
}

const handleModifyCancel = (modal: any) => {
  modal.show = false
  modifyFormRef.value?.resetForm()
}

// 字典生成指标集完成回调
const onIndicatorsGenerated = (data: any[]) => {
  message.success(`成功生成 ${data.length} 个指标！`)
  // 刷新指标列表
  if (indicatorRef.value) {
    indicatorRef.value.queryData()
  }
  // 关闭生成器
  showDictGenerator.value = false
}

onMounted(() => {
})
</script>

<style lang="less" scoped>
.indicator-content-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.indicator-actions {
  padding: 0 16px;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 16px;
}

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