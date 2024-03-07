<template>
  <portal
    list-mode
    table-id="SysDictType"
    :bind-tabs="[{
      title: '字典条目',
      tableId: 'SysDict',
      showBind: false,
      bindFieldProperty: 'dictName'
    }]" />
</template>

<script lang="ts" setup>

</script>

<style scoped>

</style>
