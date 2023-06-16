<template>
  <a-sub-menu :key="subNavList.path || subNavList.title">
    <template #icon>
      <Icon :icon="subNavList.icon" />
    </template>
    <template #title>{{ subNavList.title }}</template>
    <template v-for="item in subNavList.children">
      <template v-if="!item.children">
        <a-menu-item
          :id="item.key.toString()" :key="item.path || item.title" :path="item.path"
          :query="item.query" :title="item.title">
          <template #icon>
            <Icon :icon="item.icon" />
          </template>
          {{ item.title }}
        </a-menu-item>
      </template>
      <template v-else>
        <sub-nav :id="item.key.toString()" :key="item.path || item.title" :subNavList="item" />
      </template>
    </template>
  </a-sub-menu>
</template>

<script lang="ts" setup>
import {NavListType} from "../type"

const subNavList = ref<NavListType>()
const props = defineProps<{ subNavList: NavListType }>()

watch(() => props.subNavList, () => {
  subNavList.value = props.subNavList
}, {immediate: true})

</script>

<style scoped>

</style>
