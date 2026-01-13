<template>
  <router-view />
</template>

<script lang="ts" setup>
import axios from 'axios'
import { onMounted } from 'vue'

import { title } from '../package.json'

import { COMPILE_TIME_FILE_PATH } from '@/framework/utils/constant'

onMounted(() => {
  const { MODE } = import.meta.env
  let env = ''
  if (MODE === 'development') env = '测试--'
  else if (MODE === 'pre') env = '预生产--'
  document.title = env + title
  axios.get(COMPILE_TIME_FILE_PATH)
    .then(res => console.log(res.data.time))
    .catch(() => console.log('尚未在项目路径中找到"compileTime.json"找到文件，无法打印编译时间'))
})

</script>
