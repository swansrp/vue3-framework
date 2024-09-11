<template>
  <portal
    :bind-tabs="[{
      bindType: '0',
      title: '字典条目',
      tableId: 'SysDict',
      showBind: false,
      bindFieldProperty: 'dictName',
      defaultSortColumn: [{property: 'dictName', type: 0}, {property: 'dictSort', type: 0}]
    }]"
    list-mode
    table-id="SysDictType" />
</template>

<script lang="ts" setup>

</script>

<style scoped>

</style>
