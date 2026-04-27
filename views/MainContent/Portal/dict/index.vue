<template>
  <div class="dict-container">
    <a-tabs
      v-model:active-key="activeTab"
      type="card"
    >
      <a-tab-pane
        key="sysDict"
        tab="系统字典"
      >
        <portal
          :bind-tabs="dictBindTabs"
          list-mode
          single-select
          table-id="SysDictType"
        />
      </a-tab-pane>
      <a-tab-pane
        key="bizDict"
        tab="业务字典"
      >
        <BizDictManage />
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'

import BizDictManage from '@/framework/views/MainContent/SystemManage/BizDictionary/dict.vue'
import type { PortalBindType } from '@/framework/components/common/Portal/bind/type'

const activeTab = ref('sysDict')

const dictBindTabs = ref<Array<PortalBindType>>([
  {
    bindType: '0',
    title: '字典条目',
    tableId: 'SysDict',
    showBind: false,
    bindFieldProperty: 'dictName',
    defaultSortColumn: [{ property: 'dictName', type: 0 }, { property: 'dictSort', type: 0 }]
  }
])
</script>

<style scoped>
.dict-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.dict-container :deep(.ant-tabs) {
  height: 100%;
}

.dict-container :deep(.ant-tabs-content-holder) {
  flex: 1;
  overflow: auto;
}
</style>
