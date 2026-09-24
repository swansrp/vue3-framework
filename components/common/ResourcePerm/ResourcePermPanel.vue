<template>
  <div class="perm-panel">
    <div class="perm-panel-target">
      正在配置：
      <b>{{ resourceName || resourceId }}</b>
      <a-typography-text type="secondary">
        未配置任何授权时，该对象对所有人可见
      </a-typography-text>
    </div>
    <ForwardConfig
      :key="resourceId"
      :resource-type="resourceType"
      :resource-id="resourceId"
      :extra-data-editor="extraDataEditor"
      :extra-data-editor-props="extraDataEditorProps"
      :extra-data-label="extraDataLabel"
      @saved="handleSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue'
import { onMounted, provide, type Component } from 'vue'

import ForwardConfig from './ForwardConfig.vue'
import { useSubjectData } from './useSubjectData'

/**
 * 单资源权限面板：面向「已经选中了某个对象」的场景（配置页的权限 tab）
 * 与 ResourcePermManager 弹窗的区别：不带资源列表树与「按主体配置」模式，只配当前对象的授权名单
 */
defineProps<{
  resourceType: string
  resourceId: string
  resourceName?: string
  // 主体扩展信息编辑器组件（透传给 ForwardConfig，由最外层使用方注入）
  extraDataEditor?: Component
  // 透传给编辑器的额外 props（如 { columns: [...] }）
  extraDataEditorProps?: Record<string, any>
  // 配置入口按钮文案
  extraDataLabel?: string
}>()

// ForwardConfig 通过 inject('subjectData') 取角色/用户组/部门数据，内嵌使用时须自行 provide 并加载
const subjectData = useSubjectData()
provide('subjectData', subjectData)

onMounted(() => {
  subjectData.loadAll()
})

const handleSaved = () => {
  message.success('保存成功')
}
</script>

<style scoped lang="less">
.perm-panel {
  height: 100%;
  overflow: auto;
  padding: 12px 16px;

  .perm-panel-target {
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
}
</style>
