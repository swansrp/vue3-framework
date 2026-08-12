<template>
  <!-- 浅色版 Portal 报表入口: 复用 table.vue 的配置加载/筛选/条件逻辑,
       以 theme="light" 渲染(无深色外壳, 菜单 component 指向本文件即可) -->
  <table-view theme="light" />
</template>

<script lang="ts" name="portalTableLight" setup>
import TableView from './table.vue'
</script>
