<template>
  <a-tabs v-model:activeKey="activeKey">
    <a-tab-pane :key="index" v-for="(item, index) of columns" :tab="item.title"><div v-html="strLF2HtmlLF(record[item.dataIndex])"></div></a-tab-pane>
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
import { strLF2HtmlLF } from '@/framework/utils/common'
onMounted(() => {
})
</script>

<style scoped lang="less"></style>