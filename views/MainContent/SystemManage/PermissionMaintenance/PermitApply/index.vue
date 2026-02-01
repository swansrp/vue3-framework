<template>
  <div class="permit-apply-container">
    <a-tabs v-model:active-key="activeTab">
      <a-tab-pane
        key="apply"
        tab="申请权限"
      >
        <user-apply-view />
      </a-tab-pane>
      <a-tab-pane
        key="audit"
        tab="审核管理"
      >
        <admin-audit-view />
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'

import AdminAuditView from './AdminAuditView.vue'
import UserApplyView from './UserApplyView.vue'

const activeTab = ref('apply')
</script>

<style scoped>
.permit-apply-container {
  height: 100%;
  padding: 20px;
}
</style>
