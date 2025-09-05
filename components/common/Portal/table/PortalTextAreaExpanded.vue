<template>
  <a-tabs v-model:activeKey="activeKey">
    <a-tab-pane
      v-for="(item, index) of columns" :key="index" :disabled="isEmpty(record[item.dataIndex])"
      :tab="strRemoveLF(item.title)">
      <div v-html="strLF2HtmlLF(record[item.dataIndex])"></div>
    </a-tab-pane>
  </a-tabs>
</template>

<script lang="ts" setup>
import { isEmpty, isNotEmpty, strLF2HtmlLF, strRemoveLF } from '@/framework/utils/common'

const props = withDefaults(
  defineProps<{
    record: any
    columns: any
  }>(),
  {}
)
const { record, columns } = toRefs(props)

// 查找第一个不为空的tab页作为默认激活页
const getFirstNonEmptyTabIndex = () => {
  for (let i = 0; i < columns.value.length; i++) {
    if (isNotEmpty(record.value[columns.value[i].dataIndex])) {
      return i
    }
  }
  return 0 // 如果所有tab都为空，默认显示第一个
}

const activeKey = ref(getFirstNonEmptyTabIndex())

onMounted(() => {
})
</script>

<style lang="less" scoped></style>