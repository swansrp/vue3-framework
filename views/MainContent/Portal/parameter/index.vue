<template>
  <portal table-id="SysConfig">
    <template #right-btns>
      <a-button
        shape="circle"
        type="primary"
        @click="refreshParams()"
      >
        <template #icon>
          <cloud-sync-outlined />
        </template>
      </a-button>
    </template>
  </portal>
</template>

<script lang="ts" setup>
import { CloudSyncOutlined } from '@ant-design/icons-vue'

import { refreshParams } from '@/framework/apis/params'
</script>

<style scoped>

</style>
