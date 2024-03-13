<template>
  <a-modal
    :okText="config.modal.type === 'add' ? '保存' : '更新'"
    :title="config.modal.type === 'add' ? '新增数据' : '编辑数据'"
    :visible="config.modal.show"
    :width="config.modal.type === 'add' ? config.addWidth : config.editWidth"
    :wrap-class-name="(config.modal.type === 'add' ? config.addWidth==='100%' : config.editWidth==='100%') ? 'full-modal' : ''"
    @cancel="() => emit('cancel')"
    @close="() => emit('close')"
    @ok="() => editModalRef.validate().then(emit('confirm'))">
    <a-form ref="editModalRef" :model="config.modal.data" layout="vertical">
      <a-descriptions
        v-for="(value, index) in columnDisplayMap"
        :key="index"
        :column="config.descriptionCount"
        :size="config.size"
        :title="value[0] || ''"
        bordered
        style="margin-top: 20px"
      >
        <template
          v-for="column in value[1].filter(item => { return config.modal.type === 'add' ? item.addShow : item.editShow })"
          :key="column.dataIndex">
          <a-descriptions-item
            :label="strRemoveLF(column.title) + (column.required ? '(*)' : '')"
            :span="config.modal.type === 'add' ? column.addSize : column.editSize">
            <a-form-item
              :label="strRemoveLF(column.title)"
              :name="column.dataIndex"
              :required="column.required">
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
                @update:value=" v => config.modal.data[column.dataIndex] = v"
              />
              <a-switch
                v-else-if="column.fieldType === FIELD_TYPE.SWITCH"
                v-model:checked="config.modal.data[column.dataIndex]"
                :disabled="config.modal.type === 'add' ? column.addDisabled : column.editDisabled"
                checkedValue="1"
                style="width: 40px;"
                unCheckedValue="0"
              />
              <a-select
                v-else-if="column.fieldType === FIELD_TYPE.SELECT"
                :bordered="false"
                :disabled="config.modal.type === 'add' ? column.addDisabled : column.editDisabled"
                :options="column.referenceDictOption || []"
                :value="config.modal.data[column.dataIndex]"
                @update:value=" v => config.modal.data[column.dataIndex] = v"
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
                :autoSize="{ minRows: 3 }"
                :disabled="config.modal.type === 'add' ? column.addDisabled : column.editDisabled"
                :placeholder="column.defaultValue"
                :value="config.modal.data[column.dataIndex]"
                style="width: 100%; margin: 0px 3px"
                @update:value=" v => config.modal.data[column.dataIndex] = v"
              />
              <div
                v-else-if="column.fieldType === FIELD_TYPE.IMAGE">
                <div
                  v-if="log(column.dataIndex, config.modal.data, config.modal.data[column.dataIndex] && isNotEmpty(config.modal.data[column.dataIndex]))"
                  style="display: flex">
                  <a-image :src="config.modal.data[column.dataIndex]" :width="100" />
                  <close-circle-outlined
                    :disabled="config.modal.type === 'add' ? column.addDisabled : column.editDisabled"
                    style="color: lightslategray; margin-left: -20px; margin-top: 5px; z-index: 999"
                    @click="cleanUpload(column)" />
                </div>
                <a-button
                  v-else
                  :disabled="config.modal.type === 'add' ? column.addDisabled : column.editDisabled"
                  :type="'dashed'"
                  @click="showUploadDialogBox(column)">{{ '点击上传' + column.title }}
                </a-button>
              </div>
              <div v-else-if="column.fieldType === FIELD_TYPE.ENTITY">
                <delete-outlined
                  v-if="config.modal.data[column.dataIndex] !== null"
                  :disabled="config.modal.type === 'add' ? column.addDisabled : column.editDisabled"
                  @click="cleanEntity(column)" />
                <a-button
                  :disabled="config.modal.type === 'add' ? column.addDisabled : column.editDisabled"
                  :type="config.modal.data[column.dataIndex] !== null ? 'link' : 'dashed'"
                  @click="showEntityDialogBox(column)">{{ strRemoveLF(getEntityDialogBoxLabel(column)) }}
                </a-button>
              </div>
            </a-form-item>
          </a-descriptions-item>
          <a-descriptions-item
            v-if="config.modal.type === 'add' ? column.addPadding !== 0 : column.editPadding !== 0"
            :span="config.modal.type === 'add' ? column.addPadding : column.editPadding"
            label="" />
        </template>
      </a-descriptions>
    </a-form>
  </a-modal>
  <dialog-box
    v-model:visible="entityDialogBox.show"
    :title="'配置 ' + strRemoveLF(entityDialogBox.column.title)"
    is-full>
    <Portal
      :advance-condition="entityDialogBox.column.entityCondition" :table-id="entityDialogBox.column.referenceDict"
      read-only>
      <template #action="{ portalConfig, column, record }">
        <a-button type="text" @click="bind(portalConfig, column, record)">确认</a-button>
      </template>
    </Portal>
  </dialog-box>
  <upload-file
    ref="uploadFileModal"
    v-model:url="config.modal.data[uploadDialogBox.column.dataIndex]"
    :folder="config.tableId" />
</template>

<script lang="ts" setup>
import {ColumnType, FIELD_TYPE, TableConfigType} from '@/framework/components/common/portal/type'
import {isNotEmpty, log, strRemoveLF} from '@/framework/utils/common'
import dayjs from 'dayjs'
import {FormInstance} from 'ant-design-vue'
import {CloseCircleOutlined, DeleteOutlined} from '@ant-design/icons-vue'

const uploadFileModal = ref()
const prop = defineProps<{
  config: TableConfigType,
  columnDisplayMap: Map<any, Array<ColumnType>>
}>()
const {config} = toRefs(prop)
watch(config, (config) => {
  emit('update:config', config)
}, {deep: true})
const columnDisplayMap = computed(() => {
  return prop.columnDisplayMap
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
const entityDialogBox: { show: boolean, column: ColumnType } = reactive({show: false, column: {} as ColumnType})
const uploadDialogBox: { url: string, column: ColumnType } = reactive({url: '', column: {} as ColumnType})
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
const bind = (portalConfig: TableConfigType, column: ColumnType, record: Array<any>) => {
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
