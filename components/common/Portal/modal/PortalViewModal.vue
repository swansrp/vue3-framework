<template>
  <a-modal
    :cancel-button-props="{style:{display: 'none'}}"
    :open="config.modal.show"
    :width="config.detailWidth"
    :wrap-class-name="config.detailWidth==='100%' ? 'full-modal' : ''"
    ok-text="确定"
    title="查看详情"
    @cancel="() => emit('cancel')"
    @close="() => emit('close')"
    @ok="() => emit('confirm')"
  >
    <a-descriptions
      v-for="(value, index) in columnDisplayViewMap"
      :key="index"
      :column="config.descriptionCount"
      :size="config.size"
      :title="value[0] || ''"
      bordered
      style="margin-top: 20px"
    >
      <template
        v-for="column in value[1].filter(item => item.detailShow)"
        :key="column.dataIndex"
      >
        <a-descriptions-item
          :content-style="{width: (column.detailSize) / config.descriptionCount * 100 - 1 / config.descriptionCount * 30 + '%'}"
          :label="strRemoveLF(column.title)"
          :label-style="{width: 1 / config.descriptionCount * 30 + '%'}"
          :span="column.detailSize"
        >
          <template v-if="column.fieldType === FIELD_TYPE.SWITCH">
            <a-switch
              v-model:checked="config.modal.data[`${column.dataIndex}`]"
              checked-value="1"
              disabled
              un-checked-value="0"
            />
          </template>
          <template
            v-else-if="column.fieldType === FIELD_TYPE.SELECT||
              column.fieldType === FIELD_TYPE.SELECT_MULTI_IN_ONE"
          >
            {{ dict.getLabel(column.referenceDict, config.modal.data[`${column.dataIndex}`]) }}
          </template>
          <template
            v-else-if="column.fieldType === FIELD_TYPE.TREE||
              column.fieldType === FIELD_TYPE.TREE_MULTI_IN_ONE"
          >
            {{ treeDict.getLabel(column.referenceDict, config.modal.data[`${column.dataIndex}`]) }}
          </template>
          <template v-else-if="column.fieldType === FIELD_TYPE.DATE">
            {{
              isNotEmpty(config.modal.data[`${column.dataIndex}`]) ?
                dayjs(config.modal.data[`${column.dataIndex}`]).format('YYYY-MM-DD')
                :
                ''
            }}
          </template>
          <template v-else-if="column.fieldType === FIELD_TYPE.DATETIME">
            {{
              isNotEmpty(config.modal.data[`${column.dataIndex}`]) ?
                dayjs(config.modal.data[`${column.dataIndex}`]).format('YYYY-MM-DD HH:mm:ss')
                :
                ''
            }}
          </template>
          <template v-else-if="column.fieldType === FIELD_TYPE.MONEY">
            {{
              formatMoney(config.modal.data[column.dataIndex], column.referenceDict?.split(',')[0], column.referenceDict?.split(',')[1])
            }}
          </template>
          <template v-else-if="column.fieldType === FIELD_TYPE.PERCENT">
            {{
              formatPercent(config.modal.data[column.dataIndex], column.referenceDict?.split(',')[0], column.referenceDict?.split(',')[1])
            }}
          </template>
          <template
            v-else-if="column.fieldType === FIELD_TYPE.IMAGE || column.fieldType === FIELD_TYPE.AUDIO ||
              column.fieldType === FIELD_TYPE.VIDEO || column.fieldType === FIELD_TYPE.FILE"
          >
            <multimedia
              v-model="config.modal.data[column.dataIndex]"
              :height="column.fieldType === FIELD_TYPE.IMAGE ? 'auto' : 35"
              :type="column.fieldType"
              :width="column.fieldType === FIELD_TYPE.IMAGE ? 100 : 80"
            />
          </template>
          <template v-else>
            {{ config.modal.data[column.dataIndex] }}
          </template>
        </a-descriptions-item>
        <a-descriptions-item
          v-if="column.detailPadding !== 0"
          :span="column.detailPadding"
          label=""
        />
      </template>
    </a-descriptions>
  </a-modal>
</template>

<script lang="ts" setup>
import dayjs from 'dayjs'

import { ColumnType, FIELD_TYPE, TableConfigType } from '@/framework/components/common/Portal/type'
import { dictStore, useTreeStore } from '@/framework/store/common'
import { isNotEmpty, strRemoveLF } from '@/framework/utils/common'
import { formatMoney, formatPercent } from '@/framework/utils/formatter'

const prop = defineProps<{
  dataSource: Array<any>,
  config: TableConfigType,
  columnDisplayMap: Map<any, Array<ColumnType>>
}>()
const { config } = toRefs(prop)
const columnDisplayViewMap = computed(() => {
  const map = new Map()
  prop.columnDisplayMap.forEach((value, key) => {
    const columns = value.filter(item => item.detailShow)
    if (isNotEmpty(columns)) {
      map.set(key, columns)
    }
  })
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
}>()
const dict = dictStore()
const treeDict = useTreeStore()
</script>

<style lang="less" scoped>
.full-modal {
  .ant-modal {
    max-width: 100%;
    top: 0;
    padding-bottom: 0;
    margin: 0;
  }

  :deep(.ant-modal-content) {
    display: flex;
    flex-direction: column;
    height: auto !important;
  }

  .ant-modal-body {
    flex: 1;
  }
}
</style>
