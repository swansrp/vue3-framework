<template>
  <template v-if="column.fieldType === FIELD_TYPE.INPUT">
    <a-input
      :ref="editorRef"
      :get-popup-container="getPopupContainer"
      :placeholder="column.defaultValue"
      :value="modelValue"
      @blur="doFunctions(save, closeEditor)"
      @keydown.esc="closeEditor"
      @update:value=" v => {
        cellUpdate(recordIndexs[0], column.dataIndex, v)
        modelValue = v
      }"
    />
  </template>
  <template v-if="column.fieldType === FIELD_TYPE.NUMBER">
    <a-input-number
      :ref="editorRef"
      :get-popup-container="getPopupContainer"
      :max="column.max"
      :min="column.min"
      :value="modelValue"
      string-mode="true"
      @blur="doFunctions(save, closeEditor)"
      @keydown.esc="closeEditor"
      @update:value=" v => {
        cellUpdate(recordIndexs[0], column.dataIndex, v)
        modelValue = v
      }"
    />
  </template>
  <template v-else-if="column.fieldType === FIELD_TYPE.SWITCH">
    <div style="width: 100%; display: flex; justify-content: center">
      <a-switch
        :ref="editorRef"
        :checked="modelValue"
        checkedValue="1"
        style="width: 40px;"
        unCheckedValue="0"
        @keydown.esc="closeEditor"
        @update:checked="
          v => {
            cellUpdate(recordIndexs[0], column.dataIndex, v)
            modelValue = v
            save();
            closeEditor()
          }"
      />
    </div>
  </template>
  <template
    v-else-if="column.fieldType === FIELD_TYPE.SELECT||
      column.fieldType === FIELD_TYPE.SELECT_MULTI_IN_ONE">
    <a-select
      :ref="editorRef"
      :bordered="false"
      :get-popup-container="getPopupContainer"
      :options="column.referenceDictOption || []"
      :value="modelValue"
      open
      style="width: 120px"
      @select="v => {
        cellUpdate(recordIndexs[0], column.dataIndex, v)
        modelValue = v;
        save();
        closeEditor()
      }"
      @keydown.esc="closeEditor"
      @click.stop="closeEditor"
    />
  </template>
  <template v-else-if="column.fieldType === FIELD_TYPE.DATE">
    <a-date-picker
      :ref="editorRef"
      :allow-clear="false"
      :bordered="false"
      :get-popup-container="getPopupContainer"
      :value="modelValue ? dayjs(modelValue) : null"
      open
      style="width: 100%"
      @blur="closeEditor"
      @update:value="
        v => {
          cellUpdate(recordIndexs[0], column.dataIndex, v)
          modelValue = v?.format('YYYY-MM-DD HH:mm:ss') ?? '';
          save();
        }
      "
      @keydown.esc="closeEditor"
      @click.stop="closeEditor"
    />
  </template>
  <template v-else-if="column.fieldType === FIELD_TYPE.DATETIME">
    <a-date-picker
      :ref="editorRef"
      :allow-clear="false"
      :bordered="false"
      :get-popup-container="getPopupContainer"
      :show-time="true"
      :value="modelValue ? dayjs(modelValue) : null"
      open
      style="width: 100%"
      @blur="closeEditor"
      @update:value="
        v => {
          cellUpdate(recordIndexs[0], column.dataIndex, v)
          modelValue = v?.format('YYYY-MM-DD HH:mm:ss') ?? '';
          save();
        }
      "
      @keydown.esc="closeEditor"
      @click.stop="closeEditor"
    />
  </template>
  <template
    v-else-if="column.fieldType === FIELD_TYPE.HREF
      || column.fieldType === FIELD_TYPE.HTML
      || column.fieldType === FIELD_TYPE.TEXT_AREA">
    <a-modal
      :title="'编辑 ' + column.title" open @cancel="closeEditor"
      @ok="doFunctions(save, closeEditor)">
      <a-textarea
        :ref="editorRef"
        :autoSize="{ minRows: 3 }"
        :placeholder="column.defaultValue"
        :value="modelValue"
        style="width: 100%; margin: 0px 3px"
        @update:value=" v => {
          cellUpdate(recordIndexs[0], column.dataIndex, v)
          modelValue = v
        }"
      />
    </a-modal>
  </template>
</template>

<script lang="ts" setup>

import dayjs from 'dayjs'
import { FIELD_TYPE, TableConfigType } from '@/framework/components/common/Portal/type'
import { doFunctions, log } from '@/framework/utils/common'

const prop = defineProps<{
  column: any,
  modelValue: any,
  save: any,
  closeEditor: any,
  editorRef: any,
  getPopupContainer: any,
  recordIndexs: any,
  config: TableConfigType
}>()
const emit = defineEmits<{
  (e: 'cellUpdate', index: number, dataIndex: string, v: any): void
  (e: 'update:modelValue', v: any): void
}>()
const {column, modelValue, save, closeEditor, editorRef, getPopupContainer, recordIndexs} = toRefs(prop)
watch(modelValue, (value) => {
  emit('update:modelValue', value)
}, {deep: true})
const cellUpdate = (index: number, dataIndex: string, v: any) => {
  emit('cellUpdate', index, dataIndex, v)
}
</script>

<style scoped>

</style>
