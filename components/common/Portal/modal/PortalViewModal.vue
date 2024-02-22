<template>
  <a-modal
    :cancel-button-props="{style:{display: 'none'}}"
    :visible="config.modal.show"
    :width="config.detailWidth"
    okText="确定"
    title="查看详情"
    @cancel="() => emit('cancel')"
    @close="() => emit('close')"
    @ok="() => emit('confirm')">
    <a-descriptions
      :key="config.key"
      :column="config.descriptionCount" :size="config.size" :title="config.title" bordered>
      <a-descriptions-item
        v-for="column in columnArray.filter(item => item.detailShow)"
        :key="column.dataIndex"
        :label="column.title"
        :span="column.detailSize">
        <template v-if="column.fieldType === FIELD_TYPE.SWITCH">
          <a-switch
            v-model:checked="dataSource[config.modal.editRowIndex][`${column.dataIndex}`]"
            checkedValue="1"
            disabled
            unCheckedValue="0" />
        </template>
        <template v-else-if="column.fieldType === FIELD_TYPE.SELECT">
          {{ dict.getLabel(column.referenceDict, dataSource[config.modal.editRowIndex][`${column.dataIndex}`]) }}
        </template>
        <template v-else-if="column.fieldType === FIELD_TYPE.DATE">
          {{
            isNotEmpty(dataSource[config.modal.editRowIndex][`${column.dataIndex}`]) ?
              dayjs(dataSource[config.modal.editRowIndex][`${column.dataIndex}`]).format('YYYY-MM-DD')
              :
              ''
          }}
        </template>
        <template v-else-if="column.fieldType === FIELD_TYPE.DATETIME">
          {{
            isNotEmpty(dataSource[config.modal.editRowIndex][`${column.dataIndex}`]) ?
              dayjs(dataSource[config.modal.editRowIndex][`${column.dataIndex}`]).format('YYYY-MM-DD HH:mm:ss')
              :
              ''
          }}
        </template>
        <template v-else>
          {{ dataSource[config.modal.editRowIndex][column.dataIndex] }}
        </template>
      </a-descriptions-item>
    </a-descriptions>
  </a-modal>
</template>

<script lang="ts" setup>
import {dictStore} from '@/framework/store/common'
import {ColumnType, FIELD_TYPE, TableConfigType} from '@/framework/components/common/Portal/type'
import {isNotEmpty} from '@/framework/utils/common'
import dayjs from 'dayjs'

const prop = defineProps<{
  dataSource: Array<any>,
  config: TableConfigType,
  columnArray: Array<ColumnType>
}>()
const {dataSource, config, columnArray} = toRefs(prop)
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
}>()
const dict = dictStore()
</script>

<style scoped>

</style>
