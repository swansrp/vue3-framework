<template>
  <portal table-id="user">
    <template #action="{ portalConfig, column, data }">
      <a-button type="text" @click="bind(portalConfig, column, data)">重置密码</a-button>
    </template>
  </portal>
</template>

<script lang="ts" setup>

</script>

<style scoped>

</style>
