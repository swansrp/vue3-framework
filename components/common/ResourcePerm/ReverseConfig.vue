<template>
  <div class="reverse-config">
    <a-alert
      type="info"
      show-icon
      message="反向配置：先选主体，再勾选该主体可访问的资源。勾选会为资源新增授权记录，使其从「所有人可见」变为「仅授权主体可见」。"
      style="margin-bottom: 12px"
    />
    <div class="reverse-body">
      <!-- 左：主体选择 -->
      <div class="reverse-left">
        <div class="reverse-section-title">
          选择主体
        </div>
        <a-tabs
          v-model:active-key="activeSubjectTab"
          size="small"
        >
          <!-- 角色 -->
          <a-tab-pane
            key="role"
            tab="角色"
          >
            <a-select
              v-model:value="selectedRole"
              :options="roleOptions"
              placeholder="请选择角色"
              show-search
              allow-clear
              :filter-option="filterOption"
              style="width: 100%"
            />
          </a-tab-pane>
          <!-- 用户 -->
          <a-tab-pane
            key="user"
            tab="用户"
          >
            <DepartmentAndStaffSelect
              v-model:staff-list-value="selectedStaffList"
              :is-multiple="true"
              :show-dept="true"
              :staff-max-tag-count="4"
            />
            <div class="reverse-hint">
              可选多个用户，将统一配置所选资源权限
            </div>
          </a-tab-pane>
          <!-- 用户组 -->
          <a-tab-pane
            key="group"
            tab="用户组"
          >
            <a-select
              v-model:value="selectedGroup"
              :options="groupOptions"
              placeholder="请选择用户组"
              show-search
              allow-clear
              :filter-option="filterOption"
              style="width: 100%"
            />
          </a-tab-pane>
          <!-- 部门 -->
          <a-tab-pane
            key="dept"
            tab="部门"
          >
            <a-tree-select
              v-model:value="selectedDept"
              :tree-data="subjectData.deptTree.value"
              placeholder="请选择部门"
              show-search
              allow-clear
              tree-default-expand-all
              :field-names="{ label: 'title', value: 'value', children: 'children' }"
              style="width: 100%"
            />
          </a-tab-pane>
        </a-tabs>
      </div>

      <!-- 右：资源勾选 -->
      <div class="reverse-right">
        <div class="reverse-section-title">
          可访问的资源
          <template v-if="currentSubjectIds.length > 0">
            <a-button
              size="small"
              style="margin-left: 8px"
              @click="toggleAllResources(true)"
            >
              全选
            </a-button>
            <a-button
              size="small"
              @click="toggleAllResources(false)"
            >
              清空
            </a-button>
          </template>
        </div>
        <a-spin :spinning="loadingResources">
          <div class="reverse-resource-tree">
            <template v-if="currentSubjectIds.length === 0">
              <a-empty description="请先在左侧选择主体" />
            </template>
            <a-tree
              v-else-if="resources.length > 0"
              v-model:checked-keys="checkedResourceKeys"
              v-model:expanded-keys="resourceExpandedKeys"
              :tree-data="resources as any"
              checkable
              :field-names="{ title: 'name', key: 'id', children: 'children' }"
            />
            <a-empty
              v-else
              description="暂无资源"
            />
          </div>
        </a-spin>
      </div>
    </div>

    <div class="perm-panel-footer">
      <span class="reverse-footer-tip">已勾选 {{ checkedResourceKeys.length }} 个资源</span>
      <a-button
        type="primary"
        :loading="saving"
        :disabled="currentSubjectIds.length === 0"
        @click="handleSave"
      >
        保存
      </a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue'

import type { PermResourceNode } from './types'
import type { SubjectData } from './useSubjectData'

import { getResourcePermBySubject, saveResourcePermBySubject } from '@/framework/apis/resourcePerm'
import DepartmentAndStaffSelect from '@/framework/components/common/departmentAndStaffSelect/DepartmentAndStaffSelect.vue'


const props = defineProps<{
  resourceType: string
  resources: PermResourceNode[]
}>()

const emit = defineEmits<{
  (e: 'saved'): void
}>()

const subjectData = inject<SubjectData>('subjectData')!

const activeSubjectTab = ref<'role' | 'user' | 'group' | 'dept'>('role')
const selectedRole = ref<string | undefined>(undefined)
const selectedStaffList = ref<any[]>([])
const selectedGroup = ref<string | undefined>(undefined)
const selectedDept = ref<string | undefined>(undefined)

const loadingResources = ref(false)
const saving = ref(false)
const checkedResourceKeys = ref<string[]>([])
const resourceExpandedKeys = ref<string[]>([])

// 主体类型映射
const SUBJECT_TYPE_MAP = { role: 0, user: 1, group: 2, dept: 3 } as const

// 当前生效的主体 id 列表
const currentSubjectIds = computed<string[]>(() => {
  switch (activeSubjectTab.value) {
    case 'role':
      return selectedRole.value ? [String(selectedRole.value)] : []
    case 'user':
      return (selectedStaffList.value || []).map((s: any) => String(s.value))
    case 'group':
      return selectedGroup.value ? [String(selectedGroup.value)] : []
    case 'dept':
      return selectedDept.value ? [String(selectedDept.value)] : []
    default:
      return []
  }
})

const currentSubjectType = computed(() => SUBJECT_TYPE_MAP[activeSubjectTab.value])

// 角色下拉选项
const roleOptions = computed(() =>
  subjectData.roleList.value.map((r: any) => ({ value: String(r.roleId), label: r.roleName }))
)

// 用户组下拉选项（扁平，带类型前缀）
const groupOptions = computed(() =>
  subjectData.groupList.value.map((g: any) => ({ value: String(g.id), label: g.name }))
)

const filterOption = (input: string, option: any) =>
  String(option.label ?? '').toLowerCase().includes(input.toLowerCase())

// 收集资源树所有 id
const collectResourceIds = (nodes: PermResourceNode[]): string[] => {
  const ids: string[] = []
  const walk = (list: PermResourceNode[]) => {
    for (const n of list) {
      ids.push(String(n.id))
      if (n.children) walk(n.children)
    }
  }
  walk(nodes || [])
  return ids
}

const toggleAllResources = (check: boolean) => {
  checkedResourceKeys.value = check ? collectResourceIds(props.resources) : []
}

// 回显：加载所选主体已授权的资源（多主体取交集）
const loadSubjectResources = async () => {
  const ids = currentSubjectIds.value
  if (ids.length === 0) {
    checkedResourceKeys.value = []
    return
  }
  loadingResources.value = true
  try {
    const results = await Promise.all(
      ids.map(id => getResourcePermBySubject(props.resourceType, currentSubjectType.value, id))
    )
    const sets = results.map(r => new Set((r.payload || []).map(String)))
    // 交集：所有所选主体都已授权的资源
    let intersection: string[] = []
    if (sets.length > 0) {
      intersection = [...sets[0]].filter(id => sets.every(s => s.has(id)))
    }
    checkedResourceKeys.value = intersection
  } catch (e) {
    console.error('加载主体授权资源失败', e)
  } finally {
    loadingResources.value = false
  }
}

// 保存：为每个所选主体全量设置授权资源
const handleSave = async () => {
  const ids = currentSubjectIds.value
  if (ids.length === 0) return
  saving.value = true
  try {
    await Promise.all(
      ids.map(id =>
        saveResourcePermBySubject({
          resourceType: props.resourceType,
          subjectType: currentSubjectType.value,
          subjectId: id,
          resourceIds: checkedResourceKeys.value.map(String)
        })
      )
    )
    emit('saved')
  } catch (e) {
    console.error('保存主体授权失败', e)
  } finally {
    saving.value = false
  }
}

// 主体变化 → 重新回显
watch(currentSubjectIds, () => {
  loadSubjectResources()
})

// 资源传入变化 → 默认展开全部
watch(() => props.resources, (val) => {
  resourceExpandedKeys.value = collectResourceIds(val || [])
}, { immediate: true })
</script>

<style scoped lang="less">
.reverse-config {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.reverse-body {
  display: flex;
  gap: 16px;
  flex: 1;
  min-height: 0;
}

.reverse-left {
  flex: 0 0 320px;
  border-right: 1px solid #f0f0f0;
  padding-right: 16px;
}

.reverse-right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;

  :deep(.ant-spin-nested-loading) {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  :deep(.ant-spin-container) {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
}

.reverse-section-title {
  font-weight: 600;
  font-size: 13px;
  color: #333;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.reverse-resource-tree {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;

  :deep(.ant-tree .ant-tree-treenode) {
    display: flex;
    align-items: center;
  }

  :deep(.ant-tree .ant-tree-checkbox) {
    top: 0;
    margin: 0;
    display: flex;
    align-items: center;
  }

  :deep(.ant-tree .ant-tree-node-content-wrapper) {
    line-height: 24px;
  }
}

.reverse-hint {
  margin-top: 6px;
  font-size: 12px;
  color: #999;
}

.perm-panel-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.reverse-footer-tip {
  font-size: 13px;
  color: #666;
}
</style>
