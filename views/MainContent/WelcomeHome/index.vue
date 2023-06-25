<template>
  首页
  <welcome-home @get-content="getContent" />
  <a-button type="primary" @click="submitInfo">提交信息</a-button>
  <a-button type="primary" @click="getInfo">获取信息</a-button>
  <div v-html="content" style="height: 200px;width: 200px;background-color: pink"></div>
</template>

<script lang="ts" setup>
import WelcomeHome from '@/framework/components/common/tiny-mce/index.vue'
import {Ref} from "vue";
import axios from "axios";
let content = ref('')
let htmlContent:Ref<string> = ref('')
const submitInfo = () => {
  console.log(htmlContent.value);
  axios.post('http://10.3.18.44:8080/om-weekly-report/web/test', {id: htmlContent.value}).then(res => console.log(res))
}

const getInfo = () => {
  axios.get('http://10.3.18.44:8080/om-weekly-report/web/test').then(res => {
    content.value = res.data.payload
  })
}
const getContent = (html: string) => {
  htmlContent.value = html
}

</script>

<style scoped>

</style>
