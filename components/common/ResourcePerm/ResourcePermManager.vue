<template>
  <a-modal
    v-model:open="_visible"
    :title="title"
    :width="1200"
    :destroy-on-close="true"
    :footer="null"
    :body-style="{ height: '70vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }"
    @cancel="handleClose"
  >
    <div class="perm-manager">
      <a-segmented
        v-model:value="mode"
        :options="modeOptions"
        style="margin-bottom: 16px"
      />

      <!-- 正向：按资源配置 -->
      <div
        v-if="mode === 'resource'"
        class="perm-manager-body"
      >
        <div class="perm-resource-tree">
          <div class="perm-section-title">
            资源列表
          </div>
          <div class="perm-resource-tree-content">
            <a-tree
              v-if="normalizedResources.length > 0"
              :selected-keys="selectedResourceKeys"
              :tree-data="normalizedResources as any"
              default-expand-all
              :field-names="{ title: 'name', key: 'id', children: 'children' }"
              @select="onResourceSelect"
            />
            <a-empty
              v-else
              description="暂无资源"
            />
          </div>
        </div>
        <div class="perm-resource-config">
          <template v-if="selectedResourceId">
            <ForwardConfig
              :key="selectedResourceId"
              :resource-type="resourceType"
              :resource-id="selectedResourceId"
              @saved="handleSaved"
            />
          </template>
          <a-empty
            v-else
            description="请在左侧选择资源"
          />
        </div>
      </div>

      <!-- 反向：按主体配置 -->
      <ReverseConfig
        v-else
        :resource-type="resourceType"
        :resources="normalizedResources"
        @saved="handleSaved"
      />
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue'
import { computed, provide, ref, watch } from 'vue'

import ForwardConfig from './ForwardConfig.vue'
import ReverseConfig from './ReverseConfig.vue'
import { DEFAULT_FIELD_NAMES, normalizeResources } from './types'
import type { PermFieldNames } from './types'
import { useSubjectData } from './useSubjectData'

const props = withDefaults(defineProps<{
  visible: boolean
  resourceType: string
  resources: any[]
  fieldNames?: PermFieldNames
  title?: string
}>(), {
  title: '权限配置',
  fieldNames: () => ({})
})

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
}>()

const _visible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

// 共享主体数据，注入给正向/反向面板
const subjectData = useSubjectData()
provide('subjectData', subjectData)

// 按 fieldNames 标准化 resources
const mergedFieldNames = computed(() => ({
  ...DEFAULT_FIELD_NAMES,
  ...props.fieldNames
}))
const normalizedResources = computed(() => normalizeResources(props.resources, mergedFieldNames.value))

const mode = ref<'resource' | 'subject'>('resource')
const modeOptions = [
  { label: '按资源配置', value: 'resource' },
  { label: '按主体配置', value: 'subject' }
]

const selectedResourceKeys = ref<string[]>([])
const selectedResourceId = computed(() => selectedResourceKeys.value[0] || '')

const onResourceSelect = (keys: any) => {
  selectedResourceKeys.value = (keys || []).map(String)
}

// 取树中第一个节点 id
const getFirstId = (nodes: any[]): string => {
  if (!nodes || nodes.length === 0) return ''
  return String(nodes[0].id)
}

const handleSaved = () => {
  message.success('保存成功')
}

const handleClose = () => {
  _visible.value = false
}

// 弹窗打开时加载主体数据并初始化
watch(() => props.visible, async (val) => {
  if (val) {
    mode.value = 'resource'
    const firstId = getFirstId(normalizedResources.value)
    selectedResourceKeys.value = firstId ? [firstId] : []
    await subjectData.loadAll()
  }
})
</script>

<style scoped lang="less">
.perm-manager {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.perm-manager-body {
  display: flex;
  gap: 16px;
  flex: 1;
  min-height: 0;
}

.perm-resource-tree {
  flex: 0 0 280px;
  border-right: 1px solid #f0f0f0;
  padding-right: 16px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.perm-resource-config {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
}

.perm-section-title {
  font-weight: 600;
  font-size: 13px;
  color: #333;
  margin-bottom: 10px;
  flex-shrink: 0;
}

.perm-resource-tree-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}
</style>
