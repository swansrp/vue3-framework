<template>
  <div class="forward-config">
    <a-spin :spinning="loading">
      <a-tabs v-model:active-key="activeTab">
        <!-- 已配置 Tab -->
        <a-tab-pane
          key="configured"
          :tab="`已配置(${permSummaryList.length})`"
        >
          <div class="perm-tab-content">
            <template v-if="permSummaryList.length === 0">
              <a-empty description="未配置权限（所有人可见）" />
            </template>
            <div
              v-else
              class="perm-configured-list"
            >
              <div
                v-for="(item, idx) in permSummaryList"
                :key="idx"
                class="perm-configured-item"
              >
                <a-tag :color="item.color">
                  {{ item.typeName }}
                </a-tag>
                <span class="perm-configured-name">{{ item.name }}</span>
              </div>
            </div>
          </div>
        </a-tab-pane>

        <!-- 角色 Tab -->
        <a-tab-pane
          key="role"
          tab="角色"
        >
          <div class="perm-tab-content">
            <a-input-search
              v-model:value="roleSearch"
              placeholder="搜索角色"
              style="margin-bottom: 12px"
              allow-clear
            />
            <div class="perm-check-list">
              <a-checkbox
                v-for="item in filteredRoles"
                :key="item.roleId"
                :checked="isSubjectSelected(0, String(item.roleId))"
                @change="(e: any) => toggleSubject(0, String(item.roleId), e.target.checked)"
              >
                {{ item.roleName }}
              </a-checkbox>
              <a-empty
                v-if="filteredRoles.length === 0"
                description="暂无角色"
              />
            </div>
          </div>
        </a-tab-pane>

        <!-- 用户 Tab -->
        <a-tab-pane
          key="user"
          tab="用户"
        >
          <div class="perm-tab-content">
            <DepartmentAndStaffSelect
              v-model:staff-list-value="permStaffList"
              v-model:department-list-value="permDeptList"
              :is-multiple="true"
              :show-dept="true"
              :staff-max-tag-count="6"
            />
          </div>
        </a-tab-pane>

        <!-- 用户组 Tab -->
        <a-tab-pane
          key="group"
          tab="用户组"
        >
          <div class="perm-tab-content">
            <template v-if="subjectData.groupTypeList.value.length > 0">
              <div class="perm-group-toolbar">
                <a-button
                  size="small"
                  @click="toggleAllGroupTrees(true)"
                >
                  一键展开
                </a-button>
                <a-button
                  size="small"
                  @click="toggleAllGroupTrees(false)"
                >
                  一键收起
                </a-button>
              </div>
              <a-collapse
                v-model:active-key="groupActiveTypes"
                :bordered="false"
                expand-icon-position="end"
              >
                <a-collapse-panel
                  v-for="typeItem in subjectData.groupTypeList.value"
                  :key="typeItem.id"
                  :header="typeItem.name"
                >
                  <a-tree
                    v-if="(subjectData.groupTreeMap[typeItem.id] || []).length > 0"
                    :checked-keys="groupCheckedMap[typeItem.id] || []"
                    :expanded-keys="groupExpandedMap[typeItem.id] || []"
                    :tree-data="subjectData.groupTreeMap[typeItem.id]"
                    checkable
                    :field-names="{ title: 'name', key: 'id', children: 'children' }"
                    @check="(keys: any) => onGroupCheck(keys, typeItem.id)"
                    @expand="(keys: any) => onGroupExpand(keys, typeItem.id)"
                  />
                  <a-empty
                    v-else
                    description="该类型下暂无用户组"
                  />
                </a-collapse-panel>
              </a-collapse>
            </template>
            <a-empty
              v-else
              description="暂无用户组类型"
            />
          </div>
        </a-tab-pane>

        <!-- 部门 Tab -->
        <a-tab-pane
          key="dept"
          tab="部门"
        >
          <div class="perm-tab-content">
            <a-tree
              v-if="subjectData.deptTree.value.length > 0"
              v-model:checked-keys="selectedDeptKeys"
              :tree-data="subjectData.deptTree.value"
              checkable
              :field-names="{ title: 'title', key: 'value', children: 'children' }"
              default-expand-all
              @check="onDeptCheck"
            />
            <a-empty
              v-else
              description="暂无部门"
            />
          </div>
        </a-tab-pane>
      </a-tabs>
    </a-spin>

    <div class="perm-panel-footer">
      <a-popconfirm
        title="确定清除该资源的全部权限配置？清除后所有人可见。"
        @confirm="handleClear"
      >
        <a-button danger>
          清除权限
        </a-button>
      </a-popconfirm>
      <a-button
        type="primary"
        :loading="saving"
        @click="handleSave"
      >
        保存
      </a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, reactive, ref, watch } from 'vue'

import type { SubjectData } from './useSubjectData'

import type { PermItem } from '@/framework/apis/resourcePerm'
import { clearResourcePerm, getResourcePermList, saveResourcePerm } from '@/framework/apis/resourcePerm'
import { getAccountInfo } from '@/framework/components/common/departmentAndStaffSelect/api'
import DepartmentAndStaffSelect from '@/framework/components/common/departmentAndStaffSelect/DepartmentAndStaffSelect.vue'


const props = defineProps<{
  resourceType: string
  resourceId: string
}>()

const emit = defineEmits<{
  (e: 'saved'): void
}>()

// 注入共享主体数据（角色/用户组/部门）
const subjectData = inject<SubjectData>('subjectData')!

const loading = ref(false)
const saving = ref(false)
const activeTab = ref('configured')

// 已选择的授权列表
const selectedPerms = ref<PermItem[]>([])

// ================== 角色 ==================
const roleSearch = ref('')
const filteredRoles = computed(() => {
  if (!roleSearch.value) return subjectData.roleList.value
  return subjectData.roleList.value.filter((r: any) => r.roleName?.includes(roleSearch.value))
})

// ================== 用户（搜索选择） ==================
const permStaffList = ref<any[]>([])
const permDeptList = ref<string[]>([])

// ================== 用户组（UI 状态） ==================
const groupCheckedMap = reactive<Record<string, any[]>>({})
const groupExpandedMap = reactive<Record<string, any[]>>({})
const groupActiveTypes = ref<string[]>([])

// ================== 部门 ==================
const selectedDeptKeys = ref<string[]>([])

// ================== 权限摘要 ==================
const permSummaryList = computed(() => {
  const list: { typeName: string; name: string; color: string }[] = []
  for (const perm of selectedPerms.value) {
    if (perm.subjectType === 0) {
      const role = subjectData.roleList.value.find((r: any) => String(r.roleId) === perm.subjectId)
      list.push({ typeName: '角色', name: role?.roleName || perm.subjectId, color: '#722ed1' })
    } else if (perm.subjectType === 1) {
      const staff = permStaffList.value.find((s: any) => String(s.value) === perm.subjectId)
      list.push({ typeName: '用户', name: staff?.label || perm.subjectId, color: '#1890ff' })
    } else if (perm.subjectType === 2) {
      const group = subjectData.groupList.value.find((g: any) => String(g.id) === perm.subjectId)
      list.push({ typeName: '用户组', name: group?.name || perm.subjectId, color: '#eb2f96' })
    } else if (perm.subjectType === 3) {
      list.push({ typeName: '部门', name: perm.subjectId, color: '#52c41a' })
    }
  }
  return list
})

// ================== 工具方法 ==================
const isSubjectSelected = (subjectType: number, subjectId: string) =>
  selectedPerms.value.some(p => p.subjectType === subjectType && p.subjectId === subjectId)

const toggleSubject = (subjectType: number, subjectId: string, checked: boolean) => {
  if (checked) {
    if (!isSubjectSelected(subjectType, subjectId)) {
      selectedPerms.value.push({ subjectType, subjectId })
    }
  } else {
    selectedPerms.value = selectedPerms.value.filter(
      p => !(p.subjectType === subjectType && p.subjectId === subjectId)
    )
  }
}

const toggleAllGroupTrees = (expand: boolean) => {
  for (const t of subjectData.groupTypeList.value) {
    groupExpandedMap[t.id] = expand ? subjectData.collectAllIds(subjectData.groupTreeMap[t.id] || []) : []
  }
}

const onGroupExpand = (expandedKeys: any, typeId: string) => {
  groupExpandedMap[typeId] = expandedKeys
}

const onGroupCheck = (checkedKeys: any, typeId: string) => {
  const keys: any[] = Array.isArray(checkedKeys) ? checkedKeys : checkedKeys.checked
  groupCheckedMap[typeId] = keys
  selectedPerms.value = selectedPerms.value.filter(p => p.subjectType !== 2)
  for (const tid of Object.keys(groupCheckedMap)) {
    for (const key of (groupCheckedMap[tid] || [])) {
      selectedPerms.value.push({ subjectType: 2, subjectId: String(key) })
    }
  }
}

// 将已配置的用户组权限分发到对应类型的树勾选状态
const syncGroupChecked = () => {
  const groupIds = selectedPerms.value.filter(p => p.subjectType === 2).map(p => p.subjectId)
  for (const t of subjectData.groupTypeList.value) {
    const idsInTree = new Set<string>()
    const walkTree = (nodes: any[]) => {
      for (const n of nodes) {
        idsInTree.add(String(n.id))
        if (n.children) walkTree(n.children)
      }
    }
    walkTree(subjectData.groupTreeMap[t.id] || [])
    groupCheckedMap[t.id] = groupIds.filter(id => idsInTree.has(id))
  }
}

// 初始化用户组树展开状态（节点全展开，面板全收起）
const initGroupExpand = () => {
  groupActiveTypes.value = []
  for (const t of subjectData.groupTypeList.value) {
    groupExpandedMap[t.id] = subjectData.collectAllIds(subjectData.groupTreeMap[t.id] || [])
  }
}

const onDeptCheck = (checkedKeys: any) => {
  const keys: string[] = Array.isArray(checkedKeys) ? checkedKeys : checkedKeys.checked
  selectedDeptKeys.value = keys
  selectedPerms.value = selectedPerms.value.filter(p => p.subjectType !== 3)
  keys.forEach((deptId: string) => {
    selectedPerms.value.push({ subjectType: 3, subjectId: String(deptId) })
  })
}

// 用户选择变化 → 同步 selectedPerms（subjectType=1）
watch(permStaffList, (newVal) => {
  selectedPerms.value = selectedPerms.value.filter(p => p.subjectType !== 1)
  ;(newVal || []).forEach((item: any) => {
    selectedPerms.value.push({ subjectType: 1, subjectId: String(item.value) })
  })
})

// ================== 数据加载 ==================
const loadExistingPerms = async () => {
  loading.value = true
  try {
    const res = await getResourcePermList(props.resourceType, props.resourceId)
    const records = res.payload || []
    selectedPerms.value = records.map(r => ({ subjectType: r.subjectType, subjectId: r.subjectId }))
    selectedDeptKeys.value = records.filter(r => r.subjectType === 3).map(r => r.subjectId)
    syncGroupChecked()
    const userIds = records.filter(r => r.subjectType === 1).map(r => r.subjectId)
    if (userIds.length > 0) {
      const userRes = await getAccountInfo(userIds)
      const accounts = userRes.payload || []
      permStaffList.value = accounts.map((a: any) => ({
        value: a.customerNumber,
        label: a.label || a.customerNumber
      }))
    } else {
      permStaffList.value = []
    }
  } catch (e) {
    console.error('加载已有权限失败', e)
  } finally {
    loading.value = false
  }
}

// ================== 操作 ==================
const handleSave = async () => {
  saving.value = true
  try {
    await saveResourcePerm({
      resourceType: props.resourceType,
      resourceId: props.resourceId,
      perms: selectedPerms.value
    })
    emit('saved')
  } catch (e) {
    console.error('保存权限失败', e)
  } finally {
    saving.value = false
  }
}

const handleClear = async () => {
  saving.value = true
  try {
    await clearResourcePerm(props.resourceType, props.resourceId)
    selectedPerms.value = []
    selectedDeptKeys.value = []
    permStaffList.value = []
    emit('saved')
  } catch (e) {
    console.error('清除权限失败', e)
  } finally {
    saving.value = false
  }
}

// 资源切换时重新加载该资源的授权
watch(() => props.resourceId, (val) => {
  if (val) {
    activeTab.value = 'configured'
    roleSearch.value = ''
    permDeptList.value = []
    initGroupExpand()
    loadExistingPerms()
  }
}, { immediate: true })

// 主体数据（用户组树）异步加载完成后，重新同步展开与勾选状态
watch(() => subjectData.groupTypeList.value.length, (len) => {
  if (len > 0) {
    initGroupExpand()
    syncGroupChecked()
  }
})
</script>

<style scoped lang="less">
.perm-tab-content {
  overflow-y: auto;
  overflow-x: hidden;
}

.perm-check-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.perm-panel-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.perm-configured-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.perm-configured-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.perm-configured-name {
  font-size: 13px;
}

.perm-group-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}
</style>
