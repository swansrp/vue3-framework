<template>
  <a-tabs v-model:activeKey="activeKey">
    <a-tab-pane
      v-for="(item, index) of columns" :key="index" :disabled="isEmpty(record[item.dataIndex])"
      :tab="item.title">
      <div v-html="strLF2HtmlLF(record[item.dataIndex])"></div>
    </a-tab-pane>
  </a-tabs>
</template>

<script lang="ts" setup>
import { isEmpty, isNotEmpty, strLF2HtmlLF, log } from '@/framework/utils/common'

const props = withDefaults(
  defineProps<{
    record: any
    columns: any
  }>(),
  {}
)
const {record, columns} = toRefs(props)
const activeKey = ref(isNotEmpty(record.value[columns.value[0].dataIndex]) ? 0 : -1)

onMounted(() => {
})
</script>

<style lang="less" scoped></style>