<template>
  <portal :table-id="tableId" />
</template>

<script lang="ts" setup>
import {useRouter} from 'vue-router'

const {currentRoute} = useRouter()
const route = currentRoute.value
const pathArray = route.path.split('/')
const tableId = ref(pathArray[pathArray.length - 1])
</script>

<style scoped>

</style>
