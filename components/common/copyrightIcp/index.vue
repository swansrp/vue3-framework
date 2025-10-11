<template>
  <div class="icp">
    {{ `© ${year} ${author} ` }}<a
      href="http://beian.miit.gov.cn/"
      target="_blank"
    >{{ icp }}</a>
  </div>
</template>

<script lang="ts" setup>
import { useCopyrightStore } from '@/framework/store/copyright/copyright'

const copyrightStore = useCopyrightStore()
const year = new Date().getFullYear()        // 一般都是最新的一年
const author = copyrightStore.getAuthor					// 作者名
const icp = copyrightStore.getIcp			// 备案号
</script>

<style>
.icp {
  position: absolute;
  bottom: 0;
  right: 0;
  margin: 10px 0;
  width: 100%;
  height: 36px;
  white-space: pre;
  text-align: center;
  color: gray;
  z-index: 1000;
}
.icp > a {
  color: gray;
  text-decoration: none;
}
.icp > a:hover {
  color: aqua;
  text-decoration: none;
}
</style>