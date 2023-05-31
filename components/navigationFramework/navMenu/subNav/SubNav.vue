<template>
  <a-sub-menu :key="subNavList.path || subNavList.title">
    <template #icon>
      <Icon :icon="subNavList.icon" />
    </template>
    <template #title>{{ subNavList.title }}</template>
    <template v-for="item in subNavList.children">
      <template v-if="!item.children">
        <a-menu-item :key="item.path || item.title" :id="item.key.toString()" :title="item.title">
          <template #icon>
            <Icon :icon="item.icon" />
          </template>
          {{ item.title }}
        </a-menu-item>
      </template>
      <template v-else>
        <sub-nav :key="item.path || item.title" :id="item.key.toString()" :subNavList="item" />
      </template>
    </template>
  </a-sub-menu>
</template>

<script lang="ts" setup>
import {NavListType} from "../type"

const subNavList = ref<NavListType>()
const props = defineProps<{ subNavList: NavListType }>()

watch(() => props.subNavList, () => { subNavList.value= props.subNavList }, {immediate: true})

</script>

<style scoped>

</style>
