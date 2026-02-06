<template>
  <div style="height: calc(100% - 66px);">
    <a-layout class="dept-permission-maintenance">
      <a-layout-sider
        class="dept-tree-wrap"
        width="400"
      >
        <div class="dept-tree-container">
          <div class="dept-tree-header">
            <h3 style="margin: 0;">
              组织结构树
            </h3>
            <a-input-search
              v-model:value="searchKeyword"
              placeholder="请输入部门名称进行筛选"
              style="margin-top: 12px;"
              @search="filterDeptTree"
              @change="filterDeptTree"
            />
          </div>
          <a-tree
            v-if="filteredDeptTreeData.length"
            :tree-data="filteredDeptTreeData"
            :default-expand-all="true"
            :show-line="true"
            @select="onSelectDeptNode"
          >
            <template #title="{ dataRef }">
              <span :class="{'selected-dept': selectedDeptId === dataRef.key}">
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
            <a-tree
              v-if="completePermissionTreeData.length"
              v-model:checked-keys="deptTreeCheckedKeys"
              :default-expand-all="true"
              :show-line="true"
              checkable
              check-strictly
              :tree-data="completePermissionTreeData"
              @check="checkDeptTreeNode"
            >
              <template #title="{ dataRef }">
                <Icon :icon="dataRef.icon" />{{ dataRef.title }}
              </template>
            </a-tree>
          </a-tab-pane>
          <a-tab-pane
            :key="LINK"
            tab="关联用户"
            :closable="false"
          >
            <UserPermission
              :current-user-group-info="{ id: selectedDeptId, name: '' }"
              :render-bind-user-flag="renderBindUserFlag"
              :need-default-permission-select="true"
              type="dept"
            />
          </a-tab-pane>
        </a-tabs>
        <div v-else>
          <a-empty description="请从组织结构树中选择部门以查看或编辑部门权限" />
        </div>
      </a-layout-content>
    </a-layout>
  </div>
</template>

<script lang="ts" setup>
import { DataNode } from 'ant-design-vue/es/vc-tree/interface'
import { Ref } from 'vue'

import { bindDeptPermission, getDeptTree, getDeptPermissionListById, getDeptPermissionTree, unbindDeptPermission } from '@/framework/apis/admin/deptPermission'
import { getCompletePermissionTree } from '@/framework/apis/admin/navEdit'
import UserPermission from '@/framework/components/common/userPermission/index.vue'
import { EDIT, LINK, VIEW } from '@/framework/utils/constant'

let deptTreeData: Ref<Array<DataNode>> = ref([])
let filteredDeptTreeData: Ref<Array<DataNode>> = ref([])
let searchKeyword: Ref<string> = ref('')
let selectedDeptId: Ref<string> = ref('')
let completePermissionTreeData: Ref<Array<DataNode>> = ref([])
let deptTreeCheckedKeys: Ref<Array<string>> = ref([])
let deptPermissionTreeData: Ref<Array<DataNode>> = ref([])
let showPermissionTreeTab: Ref<boolean> = ref(false)
let renderBindUserFlag: Ref<number> = ref(0)

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

// 重置筛选
const resetFilter = () => {
  searchKeyword.value = ''
  filteredDeptTreeData.value = [...deptTreeData.value]
}
const onSelectDeptNode = (selectedKeys: any[], _e: { node: DataNode }) => {
  if (selectedKeys.length === 0) return
  
  const deptId = String(selectedKeys[0])
  selectedDeptId.value = deptId
  
  // 加载部门权限和用户
  showPermissionTreeTab.value = true
  renderDeptPermissionTree(deptId).then(() => {
    renderEditDeptPermissionTree(deptId)
    renderBindUserFlag.value += 1
  })
}

const renderDeptPermissionTree = (deptId: string) =>
  getDeptPermissionTree(deptId).then(res => deptPermissionTreeData.value = res.payload)

const renderEditDeptPermissionTree = (deptId: string) =>
  getDeptPermissionListById(deptId)
    .then(res => deptTreeCheckedKeys.value = res.payload.map((record: DataNode) => record.key))

const checkDeptTreeNode = (checked: any, e: { checked: boolean, node: DataNode }) => {
  const entityId = selectedDeptId.value
  const attachId = String(e.node.key)
  if (e.checked) bindDeptPermission(entityId, attachId)
  else unbindDeptPermission(entityId, attachId)
}

const tabChange = (key: any) => {
  const keyStr = String(key)
  if (!selectedDeptId.value) return
  
  if (keyStr === VIEW) renderDeptPermissionTree(selectedDeptId.value)
  else if (keyStr === EDIT) renderEditDeptPermissionTree(selectedDeptId.value)
  else if (keyStr === LINK) renderBindUserFlag.value += 1
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
  getCompletePermissionTree().then(res => completePermissionTreeData.value = res.payload)
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
    padding: 16px;
    border-bottom: 1px solid #f0f0f0;
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
