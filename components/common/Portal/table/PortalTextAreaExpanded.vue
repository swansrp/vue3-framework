<template>
  <a-tabs v-model:activeKey="activeKey">
    <a-tab-pane v-for="(item, index) of columns" :key="index" :tab="item.title" :disabled="isEmpty(record[item.dataIndex])">
      <div v-html="strLF2HtmlLF(record[item.dataIndex])"></div>
    </a-tab-pane>
  </a-tabs>
</template>

<script lang="ts" setup>
const props = withDefaults(
  defineProps<{
    record: any
    columns: any
  }>(),
  {}
)
const {record, columns} = toRefs(props)
const activeKey = ref(0)
import { isEmpty, strLF2HtmlLF } from '@/framework/utils/common'

onMounted(() => {
})
</script>

<style lang="less" scoped></style>