<template>
  <a-modal
    :mask-closable="false"
    :ok-text="config.modal.type === 'add' ? '保存' : '更新'"
    :open="config.modal.show"
    :title="config.modal.type === 'add' ? '新增数据' : '编辑数据'"
    :width="config.modal.type === 'add' ? config.addWidth : config.editWidth"
    :wrap-class-name="(config.modal.type === 'add' ? config.addWidth==='100%' : config.editWidth==='100%') ? 'full-modal' : ''"
    :z-index="999"
    @cancel="() => emit('cancel')"
    @close="() => emit('close')"
    @ok="() => editModalRef.validate().then(() => emit('confirm')).catch(() => {})"
  >
    <a-form
      ref="editModalRef"
      :model="config.modal.data"
      layout="vertical"
    >
      <a-descriptions
        v-for="(value, index) in columnDisplayEditMap"
        :key="index"
        :column="config.descriptionCount"
        :size="config.size"
        :title="value[0] || ''"
        bordered
        style="margin-top: 20px"
      >
        <template
          v-for="column in value[1].filter(item => { return config.modal.type === 'add' ? item.addShow : item.editShow })"
          :key="column.dataIndex"
        >
          <a-descriptions-item
            :content-style="{width: (column.detailSize) / config.descriptionCount * 100 - 1 / config.descriptionCount * 30 + '%'}"
            :label-style="{width: 1 / config.descriptionCount * 30 + '%'}"
            :span="config.modal.type === 'add' ? column.addSize : column.editSize"
          >
            <template #label>
              <span
                v-if="column.required"
                style="color: var(--danger); margin-right: 4px;"
              >*</span>
              <span>{{ strRemoveLF(column.title) }}</span>
            </template>
            <a-form-item
              :name="column.dataIndex"
              :rules="column.required ? [{ required: true, message: '请输入' + strRemoveLF(column.title) }] : []"
            >
              <a-input
                v-if="column.fieldType === FIELD_TYPE.INPUT"
                :disabled="config.modal.type === 'add' ? column.addDisabled : column.editDisabled"
                :placeholder="column.defaultValue"
                :value="config.modal.data[column.dataIndex]"
                @update:value=" v => config.modal.data[column.dataIndex] = v"
              />
              <a-input-number
                v-else-if="column.fieldType === FIELD_TYPE.NUMBER"
                :disabled="config.modal.type === 'add' ? column.addDisabled : column.editDisabled"
                :max="column.max"
                :min="column.min"
                :value="config.modal.data[column.dataIndex]"
                string-mode
                style="width: 100%"
                @update:value=" v => config.modal.data[column.dataIndex] = v"
              />
              <a-radio-group
                v-else-if="column.fieldType === FIELD_TYPE.SWITCH"
                v-model:value="config.modal.data[column.dataIndex]"
                :disabled="config.modal.type === 'add' ? column.addDisabled : column.editDisabled"
                style="display: flex; align-items: center; gap: 8px;"
              >
                <a-radio value="1">
                  是
                </a-radio>
                <a-radio value="0">
                  否
                </a-radio>
              </a-radio-group>
              <a-select
                v-else-if="column.fieldType === FIELD_TYPE.SELECT"
                :bordered="false"
                :disabled="config.modal.type === 'add' ? column.addDisabled : column.editDisabled"
                :options="column.referenceDictOption || []"
                :value="config.modal.data[column.dataIndex]"
                @update:value=" v => config.modal.data[column.dataIndex] = v"
              />
              <a-select
                v-else-if="column.fieldType === FIELD_TYPE.SELECT_MULTI_IN_ONE"
                :bordered="false"
                :disabled="config.modal.type === 'add' ? column.addDisabled : column.editDisabled"
                :options="column.referenceDictOption || []"
                :value="getMultiSelectValue(config.modal.data[column.dataIndex])"
                mode="multiple"
                @update:value=" v => config.modal.data[column.dataIndex] = v.join(',')"
              />
              <a-tree-select
                v-else-if="column.fieldType === FIELD_TYPE.TREE"
                :bordered="false"
                :disabled="config.modal.type === 'add' ? column.addDisabled : column.editDisabled"
                :tree-data="column.referenceDictOption || []"
                :value="config.modal.data[column.dataIndex]"
                allow-clear
                tree-default-expand-all
                tree-node-filter-prop="label"
                @select="v => config.modal.data[column.dataIndex] = v"
              />
              <a-tree-select
                v-else-if="column.fieldType === FIELD_TYPE.TREE_MULTI_IN_ONE"
                :bordered="false"
                :disabled="config.modal.type === 'add' ? column.addDisabled : column.editDisabled"
                :tree-data="column.referenceDictOption || []"
                :value="getMultiSelectValue(config.modal.data[column.dataIndex])"
                allow-clear
                multiple
                tree-default-expand-all
                tree-node-filter-prop="label"
                @update:value=" v => config.modal.data[column.dataIndex] = v.join(',')"
              />
              <a-date-picker
                v-else-if="column.fieldType === FIELD_TYPE.DATE"
                :allow-clear="false"
                :bordered="false"
                :disabled="config.modal.type === 'add' ? column.addDisabled : column.editDisabled"
                :value="config.modal.data[column.dataIndex] ? dayjs(config.modal.data[column.dataIndex]) : null"
                @update:value=" v => config.modal.data[column.dataIndex] = v?.format('YYYY-MM-DD HH:mm:ss') ?? ''"
              />
              <a-date-picker
                v-else-if="column.fieldType === FIELD_TYPE.DATETIME"
                :allow-clear="false"
                :bordered="false"
                :disabled="config.modal.type === 'add' ? column.addDisabled : column.editDisabled"
                :value="config.modal.data[column.dataIndex] ? dayjs(config.modal.data[column.dataIndex]) : null"
                show-time
                @update:value=" v => config.modal.data[column.dataIndex] = v?.format('YYYY-MM-DD HH:mm:ss') ?? ''"
              />
              <a-textarea
                v-else-if="column.fieldType === FIELD_TYPE.HREF
                  || column.fieldType === FIELD_TYPE.HTML
                  || column.fieldType === FIELD_TYPE.TEXT_AREA"
                :auto-size="{ minRows: 3 }"
                :disabled="config.modal.type === 'add' ? column.addDisabled : column.editDisabled"
                :placeholder="column.defaultValue"
                :value="config.modal.data[column.dataIndex]"
                style="width: 100%; margin: 0px 3px"
                @update:value=" v => config.modal.data[column.dataIndex] = v"
              />
              <div
                v-else-if="column.fieldType === FIELD_TYPE.IMAGE || column.fieldType === FIELD_TYPE.AUDIO || 
                  column.fieldType === FIELD_TYPE.VIDEO || column.fieldType === FIELD_TYPE.FILE"
                style="display: flex; justify-content: center"
              >
                <div
                  v-if="config.modal.data[column.dataIndex] && isNotEmpty(config.modal.data[column.dataIndex])"
                >
                  <multimedia
                    v-model="config.modal.data[column.dataIndex]"
                    :delete-able="config.modal.type === 'add' ? !column.addDisabled : !column.editDisabled"
                    :height="column.fieldType === FIELD_TYPE.IMAGE ? 'auto' : 35"
                    :type="column.fieldType"
                    :upload-able="config.modal.type === 'add' ? !column.addDisabled : !column.editDisabled"
                    :width="column.fieldType === FIELD_TYPE.IMAGE ? 100 : 80"
                    use-original-file-name
                    @delete="cleanUpload(column)"
                  />
                </div>
                <a-button
                  v-else
                  :disabled="config.modal.type === 'add' ? column.addDisabled : column.editDisabled"
                  :type="'dashed'"
                  @click="showUploadDialogBox(column)"
                >
                  {{ '点击上传' + column.title }}
                </a-button>
              </div>
              <div v-else-if="column.fieldType === FIELD_TYPE.ENTITY_CONDITION">
                <delete-outlined
                  v-if="config.modal.data[column.dataIndex] !== null"
                  :disabled="config.modal.type === 'add' ? column.addDisabled : column.editDisabled"
                  @click="cleanEntityCondition(column)"
                />
                <a-button
                  :disabled="config.modal.type === 'add' ? column.addDisabled : column.editDisabled"
                  :type="config.modal.data[column.dataIndex] !== null ? 'link' : 'dashed'"
                  @click="showEntityConditionDialogBox(column, config.modal.data[column.dataIndex])"
                >
                  设置条件
                </a-button>
              </div>
              <div v-else-if="column.fieldType === FIELD_TYPE.ENTITY">
                <delete-outlined
                  v-if="config.modal.data[column.dataIndex] !== null"
                  :disabled="config.modal.type === 'add' ? column.addDisabled : column.editDisabled"
                  @click="cleanEntity(column)"
                />
                <a-button
                  :disabled="config.modal.type === 'add' ? column.addDisabled : column.editDisabled"
                  :type="config.modal.data[column.dataIndex] !== null ? 'link' : 'dashed'"
                  @click="showEntityDialogBox(column)"
                >
                  {{ strRemoveLF(getEntityDialogBoxLabel(column)) }}
                </a-button>
              </div>
            </a-form-item>
          </a-descriptions-item>
          <a-descriptions-item
            v-if="config.modal.type === 'add' ? column.addPadding !== 0 : column.editPadding !== 0"
            :content-style="{width: (column.detailSize) / config.descriptionCount * 100 - 1 / config.descriptionCount * 30 + '%'}"
            :label-style="{width: 1 / config.descriptionCount * 30 + '%'}"
            :span="config.modal.type === 'add' ? column.addPadding : column.editPadding"
            label=""
          />
        </template>
      </a-descriptions>
    </a-form>
  </a-modal>
  <dialog-box
    v-model:visible="entityDialogBox.show"
    :title="'配置 ' + strRemoveLF(entityDialogBox.column.title)"
    is-full
  >
    <portal
      :advance-condition="entityDialogBox.column.entityCondition"
      :table-id="entityDialogBox.column.referenceDict"
      read-only
    >
      <template #action="{ portalConfig, column, record }">
        <a-button
          type="link"
          @click="bind(portalConfig, column, record)"
        >
          确认
        </a-button>
      </template>
    </portal>
  </dialog-box>
  <upload-file
    ref="uploadFileModal"
    v-model:url="config.modal.data[uploadDialogBox.column.dataIndex]"
    :folder="config.tableId"
  />
  <portal-advanced-search-modal
    :advanced-condition="advancedCondition"
    @confirm="handleAdvanceSearchConfirm"
  />
</template>

<script lang="ts" setup>
import { DeleteOutlined } from '@ant-design/icons-vue'
import { FormInstance } from 'ant-design-vue'
import dayjs from 'dayjs'

import { getPortalConfig } from '@/framework/apis/portal/config'
import { ConditionType } from '@/framework/components/common/AdvancedSearch/type'
import { ColumnType, FIELD_TYPE, TableConfigType } from '@/framework/components/common/Portal/type'
import { dictStore } from '@/framework/store/common'
import { isNotEmpty, strRemoveLF } from '@/framework/utils/common'

const _ = getInstance()
const uploadFileModal = ref()
const prop = defineProps<{
  config: TableConfigType,
  columnDisplayMap: Map<any, Array<ColumnType>>
}>()
const { config } = toRefs(prop)
watch(config, (config) => {
  emit('update:config', config)
}, { deep: true })
const columnDisplayEditMap = computed(() => {
  const map = new Map()
  prop.columnDisplayMap.forEach((value, key) => {
    const columns = value.filter(item => config.value.modal.type === 'add' ? item.addShow : item.editShow)
    if (isNotEmpty(columns)) {
      map.set(key, columns)
    }
  })
  console.log('columnDisplayEditMap', map)
  return map
})
const emit = defineEmits<{
  /**
   * cancel: 取消弹框
   */
  (e: 'cancel'): void
  /**
   * close: 关闭弹框
   */
  (e: 'close'): void
  /**
   * confirm: 确定弹框
   */
  (e: 'confirm'): void
  /**
   *
   * @param e
   * @param config
   */
  (e: 'update:config', config: TableConfigType): void
  /**
   *
   * @param e
   * @param entityDialogBox
   */
  (e: 'update:entityDialogBox', entityDialogBox: { show: boolean, column: ColumnType }): void
}>()
const entityDialogBox: { show: boolean, column: ColumnType } = reactive({ show: false, column: {} as ColumnType })
const uploadDialogBox: { url: string, column: ColumnType } = reactive({ url: '', column: {} as ColumnType })
const editModalRef = ref<FormInstance>()
const getEntityDialogBoxLabel = (column: ColumnType) => {
  if (config.value.modal.data[column.dataIndex] == null) {
    return '点击配置' + column.title
  } else {
    return config.value.modal.data[column.dataIndex]
  }
}
const showEntityDialogBox = (column: ColumnType) => {
  entityDialogBox.column = column
  entityDialogBox.show = true
}
const cleanEntity = (column: ColumnType) => {
  config.value.modal.data[column.dataIndex] = null
  config.value.modal.data[column.dbField] = null
}
const advancedCondition = reactive({
  show: false,
  currentColumn: {} as ColumnType,
  columnArray: [] as Array<any>,
  condition: {} as ConditionType,
  okText: ''
})
const handleAdvanceSearchConfirm = () => {
  config.value.modal.data[advancedCondition.currentColumn.dataIndex] = JSON.stringify(advancedCondition.condition)
  advancedCondition.show = false
}
const dict = dictStore()

// 将逗号分隔的字符串转换为数组（用于多选组件）
const getMultiSelectValue = (value: string): string[] => {
  if (!value) return []
  return String(value).split(',').filter(v => v !== '')
}
const showEntityConditionDialogBox = (column: ColumnType, condition: string) => {
  advancedCondition.currentColumn = column
  return getPortalConfig(column.referenceDict).then(async res => {
    const columnArray = res.payload.columns || []
    advancedCondition.columnArray = [] as Array<ColumnType>
    const promiseList = [] as Array<Promise<any>>
    columnArray.forEach((column: any) => {
      if (column.filterAble) {
        const columnConfig = {
          title: column.displayName,
          key: column.property,
          fieldType: column.fieldType,
          referenceDictOption: null
        }
        if (column.fieldType === FIELD_TYPE.SELECT ||
          column.fieldType === FIELD_TYPE.TREE ||
          column.fieldType === FIELD_TYPE.SELECT_MULTI_IN_ONE ||
          column.fieldType === FIELD_TYPE.TREE_MULTI_IN_ONE) {
          let promise = dict.getDict(column.reference).then((option: any) => columnConfig.referenceDictOption = option)
          promiseList.push(promise)
        }
        if (column.filterAble) {
          advancedCondition.columnArray.push(columnConfig)
        }
      }
    })
    await Promise.all(promiseList)
    advancedCondition.condition = JSON.parse(condition)
    advancedCondition.okText = '确定'
    advancedCondition.show = true
  })
}
const cleanEntityCondition = (column: ColumnType) => {
  advancedCondition.columnArray = []
  advancedCondition.condition = {} as ConditionType
  config.value.modal.data[column.dataIndex] = null
}
const bind = (portalConfig: TableConfigType, column: ColumnType, record: { [key: string]: any }) => {
  const entityField = entityDialogBox.column.referenceEntityField || portalConfig.rowKey
  console.log('bind', entityField, record[`${entityField}`], portalConfig.nameKey, record[`${portalConfig.nameKey}`])
  config.value.modal.data[`${entityDialogBox.column.dbField}`] = record[`${entityField}`]
  config.value.modal.data[`${entityDialogBox.column.dataIndex}`] = record[`${portalConfig.nameKey}`]
  console.log(entityDialogBox.column.dbField, config.value.modal.data[`${entityDialogBox.column.dbField}`])
  console.log(entityDialogBox.column.dataIndex, config.value.modal.data[`${entityDialogBox.column.dataIndex}`])
  entityDialogBox.show = false
}
const showUploadDialogBox = (column: ColumnType) => {
  uploadDialogBox.column = column
  uploadFileModal.value.showUploadDialogBox(column.fieldType)
}
const cleanUpload = (column: ColumnType) => {
  config.value.modal.data[column.dataIndex] = null
}
</script>

<style lang="less" scoped>
:deep(.ant-form-item-label) {
  label {
    display: none;
  }
}

:deep(.ant-form-item) {
  margin-bottom: 6px;
}

.full-modal {
  .ant-modal {
    max-width: 100%;
    top: 0;
    padding-bottom: 0;
    margin: 0;
  }

  .ant-modal-content {
    display: flex;
    flex-direction: column;
    height: calc(100vh);
  }

  .ant-modal-body {
    flex: 1;
  }
}

</style>
