<template>
  <div id="my-loading">
    <div class="load-box">
      <a-spin size="large" />
      <span style="margin-top: 20px">正在加载，请稍候…</span>
    </div>
  </div>
</template>

<script setup lang="ts">

</script>

<style scoped>
#my-loading {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  display: none;
  z-index: 9999;
  background: transparent;
}
.load-box {
  width: 160px;
  height: 120px;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
:deep(.ant-spin-dot-item) {
  background-color: var(--accent);
}

</style>
