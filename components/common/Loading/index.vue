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
  background-color: rgba(255, 255, 255, 0.8);
}
.load-box {
  width: 120px;
  height: 120px;
  color: #409eff;
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

</style>
