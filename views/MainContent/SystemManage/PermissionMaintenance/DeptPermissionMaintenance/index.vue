<template>
  <div style="height: calc(100% - 66px);">
    <a-layout class="dept-permission-maintenance">
      <a-layout-sider
        class="dept-tree-wrap"
        width="400"
      >
        <div class="dept-tree-container">
          <div class="dept-tree-header">
            <div class="header-title-row">
              <h3 style="margin: 0;">
                组织结构树
              </h3>
              <a-button
                type="link"
                size="small"
                @click="refreshDeptTree"
              >
                <template #icon>
                  <ReloadOutlined />
                </template>
                刷新
              </a-button>
            </div>
            <div class="tree-options">
              <a-checkbox v-model:checked="deptMultiSelect">多选</a-checkbox>
              <span class="strictly-option">
                <span>独立选择</span>
                <a-switch
                  v-model:checked="deptCheckStrictly"
                  :disabled="!deptMultiSelect"
                  size="small"
                  style="margin-left: 8px;"
                />
              </span>
            </div>
            <a-input-search
              v-model:value="searchKeyword"
              placeholder="请输入部门名称进行筛选"
              style="margin-top: 12px;"
              allow-clear
              @search="filterDeptTree"
              @change="filterDeptTree"
            />
          </div>
          <a-tree
            v-if="filteredDeptTreeData.length"
            :key="deptTreeKey"
            :checked-keys="deptMultiSelect ? selectedDeptKeys : undefined"
            :tree-data="filteredDeptTreeData"
            :default-expand-all="true"
            :show-line="true"
            :checkable="deptMultiSelect"
            :check-strictly="deptCheckStrictly"
            @select="onSelectDeptNode"
            @check="onCheckDeptNode"
          >
            <template #title="{ dataRef }">
              <span :class="{'selected-dept': !deptMultiSelect && selectedDeptId === dataRef.key}">
                {{ dataRef.title }}
              </span>
            </template>
          </a-tree>
          <a-empty
            v-else
            description="暂无匹配的组织结构"
          />
        </div>
      </a-layout-sider>

      <a-layout-content style="min-width: 710px">
        <a-tabs
          v-if="showPermissionTreeTab"
          v-model:activeKey="activeTab"
          type="editable-card"
          hide-add
          style="height: 100%;"
          @change="tabChange"
        >
          <a-tab-pane
            :key="VIEW"
            tab="查看权限树"
            :closable="false"
          >
            <a-tree
              v-if="deptPermissionTreeData.length"
              :default-expand-all="true"
              :show-line="true"
              :tree-data="deptPermissionTreeData"
            >
              <template #title="{ dataRef }">
                <Icon :icon="dataRef.icon" />{{ dataRef.title }}
              </template>
            </a-tree>
            <a-empty v-else />
          </a-tab-pane>
          <a-tab-pane
            :key="EDIT"
            tab="编辑权限树"
            :closable="false"
          >
            <BindTree
              :tree-data="completePermissionTreeData"
              v-model:checked-keys="deptTreeCheckedKeys"
              v-model:half-checked-keys="halfCheckedKeys"
              multiple
              :entity-ids="selectedDeptIds"
              :bind-api="bindDeptPermission"
              :unbind-api="unbindDeptPermission"
            />
          </a-tab-pane>
          <a-tab-pane
            :key="LINK"
            tab="关联用户"
            :closable="false"
          >
            <UserPermission
              :current-user-group-info="{ id: selectedDeptId, name: selectedDeptName }"
              :render-bind-user-flag="renderBindUserFlag"
              :need-default-permission-select="true"
              type="dept"
              @import="handleImportUsers"
            />
          </a-tab-pane>
        </a-tabs>
        <div v-else>
          <a-empty description="请从组织结构树中选择部门以查看或编辑部门权限" />
        </div>
      </a-layout-content>
    </a-layout>

    <upload-file
      ref="uploadFileModal"
      :upload-param="uploadParam"
      excel-parse-url="/dept/user/excel"
      @after-confirm="handleAfterImportConfirm"
    />
  </div>
</template>

<script lang="ts" setup>
import { DataNode } from 'ant-design-vue/es/vc-tree/interface'
import { Ref } from 'vue'
import { ReloadOutlined } from '@ant-design/icons-vue'

import { bindDeptPermission, getDeptTree, getDeptPermissionListById, getDeptPermissionTree, unbindDeptPermission } from '@/framework/apis/admin/deptPermission'
import { getCompletePermissionTree } from '@/framework/apis/admin/navEdit'
import { BindTree } from '@/framework/components/common/Panel'
import UserPermission from '@/framework/components/common/userPermission/index.vue'
import { EDIT, LINK, VIEW } from '@/framework/utils/constant'

let deptTreeData: Ref<Array<DataNode>> = ref([])
let filteredDeptTreeData: Ref<Array<DataNode>> = ref([])
let searchKeyword: Ref<string> = ref('')
let selectedDeptId: Ref<string> = ref('')
let selectedDeptKeys: Ref<string[] | { checked: string[]; halfChecked: string[] }> = ref([])
// 多选模式：默认开启
let deptMultiSelect: Ref<boolean> = ref(true)

// 监听多选模式变化，清空选中状态
watch(deptMultiSelect, (newVal, oldVal) => {
  if (newVal !== oldVal) {
    // 清空选中状态
    selectedDeptKeys.value = []
    selectedDeptId.value = ''
    showPermissionTreeTab.value = false
    deptTreeCheckedKeys.value = []
    halfCheckedKeys.value = []
  }
})
// 左侧部门树独立选择：默认关闭（非独立选择，父子联动）
let deptCheckStrictly: Ref<boolean> = ref(false)
let deptTreeKey: Ref<number> = ref(0)
let completePermissionTreeData: Ref<Array<DataNode>> = ref([])
let deptTreeCheckedKeys: Ref<Array<number>> = ref([])
let halfCheckedKeys: Ref<Array<number>> = ref([])
let deptPermissionTreeData: Ref<Array<DataNode>> = ref([])
let showPermissionTreeTab: Ref<boolean> = ref(false)
let renderBindUserFlag: Ref<number> = ref(0)
let selectedDeptName: Ref<string> = ref('')
// 当前选中的 tab
let activeTab: Ref<string> = ref(VIEW)

// 存储每个部门的权限列表（多选模式用）
let deptPermissionMap: Ref<Map<string, string[]>> = ref(new Map())

// 计算属性：获取选中的部门ID数组
const selectedDeptIds = computed(() => {
  if (deptMultiSelect.value) {
    return Array.isArray(selectedDeptKeys.value)
      ? selectedDeptKeys.value
      : (selectedDeptKeys.value as { checked: string[] }).checked
  } else {
    return selectedDeptId.value ? [selectedDeptId.value] : []
  }
})

const uploadFileModal = ref()
const uploadParam = computed(() => ({
  deptId: selectedDeptId.value,
  deptName: selectedDeptName.value
}))

// 刷新部门树
const refreshDeptTree = () => {
  searchKeyword.value = ''
  selectedDeptKeys.value = []
  selectedDeptId.value = ''
  showPermissionTreeTab.value = false
  deptTreeCheckedKeys.value = []
  halfCheckedKeys.value = []
  deptTreeKey.value += 1
  loadDeptTree()
}

// 筛选部门树
const filterDeptTree = () => {
  if (!searchKeyword.value.trim()) {
    filteredDeptTreeData.value = [...deptTreeData.value]
    return
  }

  const keyword = searchKeyword.value.toLowerCase().trim()
  filteredDeptTreeData.value = filterTreeNodes(deptTreeData.value, keyword)
}

// 递归筛选树节点
const filterTreeNodes = (nodes: DataNode[], keyword: string): DataNode[] => {
  return nodes.filter(node => {
    // 检查当前节点是否匹配
    const isMatch = node.title?.toString().toLowerCase().includes(keyword)

    // 检查子节点是否有匹配的
    let hasMatchingChildren = false
    if (node.children && node.children.length > 0) {
      const filteredChildren = filterTreeNodes(node.children as DataNode[], keyword)
      if (filteredChildren.length > 0) {
        hasMatchingChildren = true
        // 更新当前节点的子节点为筛选后的结果
        node.children = filteredChildren
      }
    }

    // 返回当前节点匹配或者有匹配的子节点
    return isMatch || hasMatchingChildren
  })
}

const onSelectDeptNode = (selectedKeys: any[], _e: { node: DataNode }) => {
  if (selectedKeys.length === 0) return

  const deptId = String(selectedKeys[0])
  selectedDeptId.value = deptId
  selectedDeptName.value = String(_e.node.title || '')

  // 单选模式
  if (!deptMultiSelect.value) {
    showPermissionTreeTab.value = true
    // 根据当前 tab 加载对应数据，不切换 tab
    loadTabData(deptId)
  }
}

// 根据当前 tab 加载对应数据
const loadTabData = (deptId: string) => {
  const currentTab = activeTab.value
  if (currentTab === VIEW) {
    renderDeptPermissionTree(deptId)
  } else if (currentTab === EDIT) {
    renderEditDeptPermissionTree(deptId)
  } else if (currentTab === LINK) {
    renderBindUserFlag.value += 1
  }
}

// 多选模式下勾选部门节点
const onCheckDeptNode = (checked: string[] | { checked: string[]; halfChecked: string[] }, e: { checked: boolean, node: DataNode }) => {
  console.log('[DEBUG] onCheckDeptNode called:', { checked, e })

  // 根据 check-strictly 模式获取实际的 checked 数组
  const checkedArr = Array.isArray(checked) ? checked : checked.checked

  console.log('[DEBUG] checkedArr:', checkedArr)

  selectedDeptKeys.value = checked

  if (checkedArr.length === 0) {
    console.log('[DEBUG] No departments selected, hiding permission tree')
    showPermissionTreeTab.value = false
    deptTreeCheckedKeys.value = []
    halfCheckedKeys.value = []
    return
  }

  console.log('[DEBUG] Showing permission tree and loading permissions for depts:', checkedArr)
  showPermissionTreeTab.value = true
  // 加载所有选中部门的权限
  loadMultipleDeptPermissions(checkedArr)
}

// 加载多个部门的权限并计算选中/半选状态
const loadMultipleDeptPermissions = async (deptIds: string[]) => {
  console.log('[DEBUG] loadMultipleDeptPermissions called with deptIds:', deptIds)

  deptPermissionMap.value = new Map()

  // 并行加载所有部门的权限
  const promises = deptIds.map(deptId =>
    getDeptPermissionListById(deptId).then(res => {
      const keys = res.payload.map((record: DataNode) => Number(record.key))
      console.log(`[DEBUG] Dept ${deptId} permissions:`, keys)
      deptPermissionMap.value.set(deptId, keys)
      return keys
    })
  )

  await Promise.all(promises)

  // 计算选中状态：所有部门都有的权限
  // 计算半选状态：部分部门有的权限
  const allPermissionKeys = new Set<number>()
  deptPermissionMap.value.forEach(keys => {
    keys.forEach(key => allPermissionKeys.add(key))
  })

  const checkedKeys: number[] = []
  const halfKeys: number[] = []
  const deptCount = deptIds.length

  console.log('[DEBUG] Total unique permissions:', allPermissionKeys.size)
  console.log('[DEBUG] Dept count:', deptCount)

  allPermissionKeys.forEach(key => {
    let count = 0
    deptPermissionMap.value.forEach(keys => {
      if (keys.includes(key)) count++
    })
    console.log(`[DEBUG] Permission ${key}: found in ${count}/${deptCount} depts`)
    if (count === deptCount) {
      checkedKeys.push(key)
    } else if (count > 0) {
      halfKeys.push(key)
    }
  })

  deptTreeCheckedKeys.value = checkedKeys
  halfCheckedKeys.value = halfKeys

  console.log('[DEBUG] Final state:', {
    checkedKeys,
    halfCheckedKeys,
    deptPermissionMap: Object.fromEntries(deptPermissionMap.value)
  })
}

const renderDeptPermissionTree = (deptId: string) =>
  getDeptPermissionTree(deptId).then(res => deptPermissionTreeData.value = res.payload)

const renderEditDeptPermissionTree = (deptId: string) =>
  getDeptPermissionListById(deptId)
    .then(res => deptTreeCheckedKeys.value = res.payload.map((record: DataNode) => Number(record.key)))

const tabChange = (key: any) => {
  const keyStr = String(key)
  if (!selectedDeptId.value) return

  if (keyStr === VIEW) renderDeptPermissionTree(selectedDeptId.value)
  else if (keyStr === EDIT) renderEditDeptPermissionTree(selectedDeptId.value)
  else if (keyStr === LINK) renderBindUserFlag.value += 1
}

const handleImportUsers = () => {
  console.log('[DeptPermissionMaintenance] 触发导入, uploadParam:', uploadParam.value)
  uploadFileModal.value?.showUploadDialogBox('.xlsx')
}

const handleAfterImportConfirm = () => {
  console.log('[DeptPermissionMaintenance] 导入完成，刷新用户列表')
  renderBindUserFlag.value += 1
}

const loadDeptTree = () => {
  getDeptTree().then((res: any) => {
    deptTreeData.value = res.payload || []
    // 初始化筛选数据
    filteredDeptTreeData.value = [...deptTreeData.value]
  })
}

onMounted(() => {
  loadDeptTree()
  getCompletePermissionTree().then(res => {
    completePermissionTreeData.value = res.payload
  })
})

</script>

<style scoped>
.dept-tree-wrap {
  background: #fff;
  border-right: 1px solid #f0f0f0;
}

.dept-tree-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.dept-tree-header {
  background: white;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.header-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tree-options {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 12px;
}

.strictly-option {
  display: flex;
  align-items: center;
}

.dept-tree-wrap :deep(.ant-tree) {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}

.dept-permission-maintenance {
  height: 100%;
}

:deep(.dept-permission-maintenance .ant-layout-content){
  height: 100%;
  padding: 20px;
}

.selected-dept {
  font-weight: bold;
  color: #1890ff;
}

:deep(.ant-tree-node-selected) {
  background-color: #e6f7ff !important;
}

.tag-box {
  height: 480px;
  overflow: auto;
}
</style>
