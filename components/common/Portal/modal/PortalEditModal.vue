<template>
  <a-modal
    :okText="config.modal.type === 'add' ? '保存' : '更新'"
    :title="config.modal.type === 'add' ? '新增数据' : '编辑数据'"
    :visible="config.modal.show"
    :width="config.modal.type === 'add' ? config.addWidth : config.editWidth"
    @cancel="() => emit('cancel')"
    @close="() => emit('close')"
    @ok="() => editModalRef.validate().then(emit('confirm'))">
    <a-form ref="editModalRef" :model="config.modal.data" layout="vertical">
      <a-descriptions
        :column="config.descriptionCount" :size="config.size" :title="config.title" bordered
      >
        <template
          v-for="column in columnArray.filter(item => config.modal.type === 'add' ? item.addShow : item.editShow)"
          :key="column.dataIndex">
          <a-descriptions-item
            :span="config.modal.type === 'add' ? column.addSize : column.editSize"
            :label="strRemoveLF(column.title) + (column.required ? '(*)' : '')">
            <a-form-item
              :label="strRemoveLF(column.title)"
              :name="column.dataIndex"
              :required="column.required">
              <a-input
                v-if="column.fieldType === FIELD_TYPE.INPUT"
                :placeholder="column.defaultValue"
                :value="config.modal.data[column.dataIndex]"
                @update:value=" v => config.modal.data[column.dataIndex] = v"
              />
              <a-input-number
                v-else-if="column.fieldType === FIELD_TYPE.NUMBER"
                :max="column.max"
                :min="column.min"
                :value="config.modal.data[column.dataIndex]"
                string-mode
                @update:value=" v => config.modal.data[column.dataIndex] = v"
              />
              <a-switch
                v-else-if="column.fieldType === FIELD_TYPE.SWITCH"
                v-model:checked="config.modal.data[column.dataIndex]"
                checkedValue="1"
                style="width: 40px;"
                unCheckedValue="0"
              />
              <a-select
                v-else-if="column.fieldType === FIELD_TYPE.SELECT"
                :bordered="false"
                :options="column.referenceDictOption || []"
                :value="config.modal.data[column.dataIndex]"
                @update:value=" v => config.modal.data[column.dataIndex] = v"
              />
              <a-date-picker
                v-else-if="column.fieldType === FIELD_TYPE.DATE"
                :allow-clear="false"
                :bordered="false"
                :value="config.modal.data[column.dataIndex] ? dayjs(config.modal.data[column.dataIndex]) : null"
                @update:value=" v => config.modal.data[column.dataIndex] = v?.format('YYYY-MM-DD HH:mm:ss') ?? ''"
              />
              <a-date-picker
                v-else-if="column.fieldType === FIELD_TYPE.DATETIME"
                :allow-clear="false"
                :bordered="false"
                :value="config.modal.data[column.dataIndex] ? dayjs(config.modal.data[column.dataIndex]) : null"
                show-time
                @update:value=" v => config.modal.data[column.dataIndex] = v?.format('YYYY-MM-DD HH:mm:ss') ?? ''"
              />
              <a-textarea
                v-else-if="column.fieldType === FIELD_TYPE.HREF
                  || column.fieldType === FIELD_TYPE.HTML
                  || column.fieldType === FIELD_TYPE.TEXT_AREA"
                :autoSize="{ minRows: 3 }"
                :placeholder="column.defaultValue"
                :value="config.modal.data[column.dataIndex]"
                style="width: 100%; margin: 0px 3px"
                @update:value=" v => config.modal.data[column.dataIndex] = v"
              />
              <div v-else-if="column.fieldType === FIELD_TYPE.ENTITY">
                <delete-outlined v-if="config.modal.data[column.dataIndex] !== null" @click="cleanEntity(column)" />
                <a-button
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
</template>

<script lang="ts" setup>
import {ColumnType, FIELD_TYPE, TableConfigType} from '@/framework/components/common/Portal/type'
import {strRemoveLF} from '@/framework/utils/common'
import dayjs from 'dayjs'
import {FormInstance} from 'ant-design-vue'
import {DeleteOutlined} from '@ant-design/icons-vue'

const prop = defineProps<{
  config: TableConfigType,
  columnArray: Array<ColumnType>
  entityDialogBox: { show: boolean, column: ColumnType }
}>()
const {config, columnArray, entityDialogBox} = toRefs(prop)
watch(config, (config) => {
  emit('update:config', config)
}, {deep: true})
watch(entityDialogBox, (entityDialogBox) => {
  emit('update:entityDialogBox', entityDialogBox)
}, {deep: true})
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
const editModalRef = ref<FormInstance>()
const getEntityDialogBoxLabel = (column: ColumnType) => {
  if (config.value.modal.data[column.dataIndex] == null) {
    return '点击配置' + column.title
  } else {
    return config.value.modal.data[column.dataIndex]
  }
}
const showEntityDialogBox = (column: ColumnType) => {
  entityDialogBox.value.column = column
  entityDialogBox.value.show = true
}
const cleanEntity = (column: ColumnType) => {
  config.value.modal.data[column.dataIndex] = null
  config.value.modal.data[column.dbField] = null
}
const bind = (portalConfig: TableConfigType, column: ColumnType, record: Array<any>) => {
  const entityField = entityDialogBox.value.column.referenceEntityField || portalConfig.rowKey
  console.log('bind', entityField, record[`${entityField}`], portalConfig.nameKey, record[`${portalConfig.nameKey}`])
  config.value.modal.data[`${entityDialogBox.value.column.dbField}`] = record[`${entityField}`]
  config.value.modal.data[`${entityDialogBox.value.column.dataIndex}`] = record[`${portalConfig.nameKey}`]
  console.log(entityDialogBox.value.column.dbField, config.value.modal.data[`${entityDialogBox.value.column.dbField}`])
  console.log(entityDialogBox.value.column.dataIndex, config.value.modal.data[`${entityDialogBox.value.column.dataIndex}`])
  entityDialogBox.value.show = false
}
</script>

<style lang="less" scoped>
:deep(.ant-form-item-label) {
  label{
    display: none;
  }
}
:deep(.ant-form-item) {
  margin-bottom: 6px;
}

</style>
