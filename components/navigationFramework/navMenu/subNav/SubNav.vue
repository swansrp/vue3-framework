<template>
  <a-sub-menu :key="subNavList.key">
    <template #icon>
      <Icon :icon="subNavList.icon" />
    </template>
    <template #title>{{ subNavList.title }}</template>
    <template v-for="item in subNavList.children">
      <template v-if="!item.children">
        <a-menu-item
          :id="item.key" :key="item.key" :path="item.name || item.path"
          :query="item.query" :title="item.title">
          <template #icon>
            <Icon :icon="item.icon" />
          </template>
          {{ item.title }}
        </a-menu-item>
      </template>
      <template v-else>
        <sub-nav :id="item.key" :key="item.key" :subNavList="item" />
      </template>
    </template>
  </a-sub-menu>
</template>

<script lang="ts" setup>
import {NavListType} from "../type"

const props = defineProps<{ subNavList: NavListType }>()
const { subNavList } = toRefs(props)



</script>

<style scoped>

</style>
