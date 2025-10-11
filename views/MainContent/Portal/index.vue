<template>
  <portal
    :action-width="0"
    :table-id="tableId"
  />
</template>

<script lang="ts" name="portal" setup>
import { Ref } from 'vue'
import { useRouter } from 'vue-router'

const { currentRoute } = useRouter()
const route = currentRoute.value
const pathArray = route.path.split('/')
const tableId: Ref<string> = ref(pathArray[pathArray.length - 1] as string)
</script>

<style scoped>

</style>
