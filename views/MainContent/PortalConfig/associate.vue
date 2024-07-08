<template>
  <portal
    :default-sort-column="[{property:'displayOrder', type:1}]"
    table-id="SysPortalAssociate" />
</template>

<script lang="ts" setup>
import Portal from '@/framework/components/common/Portal/index.vue'</script>

<style lang="less" scoped></style>