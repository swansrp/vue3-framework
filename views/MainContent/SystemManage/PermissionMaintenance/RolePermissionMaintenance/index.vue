<template>
  <div style="height: calc(100% - 66px);">
    <a-layout class="role-permission-user-maintenance">
      <a-layout-sider class="role-list-wrap" width="400">
        <a-list :data-source="roleData" bordered class="role-list" style="height: 100%;">
          <template #header>
            <a-input
              v-model:value="inputRoleName" placeholder="请输入角色名称"
              style="width: 276px; margin-right: 10px;"
              @search="initAndUpdateRoleList" />
            <a-button type="primary" @click="addRoleBoxVisible=true">添加</a-button>
          </template>
          <template #renderItem="{ item, index }">
            <a-list-item :class="{'activate-item': activateItemIndex === index}" @click="queryRoleDetail(item, index)">
              <div class="a-list-item-content">
                {{ item.roleName }}
                <div>
                  <a-button size="small" type="primary" @click="onEditRole(item)">编辑</a-button>
                  <delete-pop-confirm v-if="item.status !== -1" @delete-event="handleDeleteRole(item.roleId)" />
                </div>
              </div>
            </a-list-item>
          </template>
        </a-list>
      </a-layout-sider>
      <a-layout-content style="min-width: 800px">
        <a-tabs v-if="showPermissionTreeTab" hideAdd style="height: 100%;" type="editable-card" @change="tabChange">
          <a-tab-pane :key="VIEW" :closable="false" tab="查看权限树">
            <a-tree
              v-if="rolePermissionTreeData.length"
              :defaultExpandAll="true"
              :show-line="true"
              :tree-data="rolePermissionTreeData">
              <template #title="{ dataRef }">
                <Icon :icon="dataRef.icon" />
                {{ dataRef.title }}
              </template>
            </a-tree>
            <a-empty v-else />
          </a-tab-pane>
          <a-tab-pane :key="EDIT" :closable="false" tab="编辑权限树">
            <a-tree
              v-if="completeRoleTreeData.length"
              v-model:checkedKeys="roleTreeCheckedKeys"
              :defaultExpandAll="true"
              :show-line="true"
              :tree-data="completeRoleTreeData"
              check-strictly
              checkable
              @check="checkRoleTreeNode">
              <template #title="{ dataRef }">
                <Icon :icon="dataRef.icon" />
                {{ dataRef.title }}
              </template>
            </a-tree>
          </a-tab-pane>
          <a-tab-pane :key="LINK" :closable="false" tab="关联用户">
            <department-and-staff-select
              v-model:departmentListValue="departmentListValue"
              v-model:staffListValue="staffListValue"
              :width="700"
              is-multiple
              layout-mode="vertical" />
            <div style="padding-top: 4px; margin-bottom: 8px">
              <a-button
                :disabled="staffListValue.length === 0" style="width: 200px;margin-left: 70px;" type="primary"
                @click="handleAddRoleUser">添加
              </a-button>
              <a-button
                :disabled="staffListValue.length === 0" danger style="width: 200px;margin-left: 70px;"
                type="primary"
                @click="handleDeleteRoleUser">解绑
              </a-button>
            </div>
            <a-card size="small" title="已绑定用户">
              <template #extra>
                <a-input-search
                  v-model:value="searchUserName" enter-button
                  style="width: 200px;margin-right: 10px;" @search="handleSearchUser" />
                <delete-pop-confirm
                  btn-content="解绑所有用户" pop-content="确认解绑全部用户吗？该操作不可恢复！"
                  size="middle" @delete-event="handleUnbindAllRoleUser" />
              </template>
              <a-empty v-if="!userList.length" />
              <div v-else class="tag-box">
                <a-tag
                  v-for="user in userList" :key="user.value" closable color="blue"
                  style="margin-top: 5px" @close="handleUnbindRoleUser(user.value)">{{ user.label }}
                </a-tag>
              </div>
            </a-card>
          </a-tab-pane>
        </a-tabs>
        <div v-else>
          <a-empty description="请点击任一角色以查看或编辑角色权限" />
        </div>
      </a-layout-content>
    </a-layout>
    <dialog-box v-model:visible="addRoleBoxVisible" :width="600" title="添加角色">
      <add-and-edit-role-form @callback="handleAddRole" />
    </dialog-box>
    <dialog-box v-model:visible="editRoleBoxVisible" :width="600" title="编辑角色">
      <add-and-edit-role-form :form-data="currentRoleDate" @callback="handleEditRole" />
    </dialog-box>
  </div>
</template>

<script lang="ts" setup>
import {
  addRole,
  bindRolePermission,
  deleteRole,
  editRole,
  getRoleList,
  getRolePermissionListById,
  getRolePermissionTree,
  unbindRolePermission
} from "@/framework/apis/admin/rolePermission"
import { Ref } from "vue"
import { initRoleData, RoleDataType } from "../type"
import * as _ from "lodash";
import { EDIT, LINK, QUERY_INTERVAL, VIEW } from "@/framework/utils/constant"
import AddAndEditRoleForm from './AddAndEditRoleForm/index.vue'
import { getCompletePermissionTree } from "@/framework/apis/admin/navEdit"
import { DataNode } from "ant-design-vue/es/vc-tree/interface"
import { bindRoleUserList, getRoleUserList, unbindRoleUser, unbindRoleUserList } from "@/framework/apis/admin/roleUser";
import { ValueLabelArray } from "@/framework/utils/type";
import DeletePopConfirm from "@/framework/components/common/deletePopConfirm/DeletePopConfirm.vue";

let inputRoleName: Ref<string> = ref('')
let activateItemIndex: Ref<number> = ref(-1)
let roleData: Ref<Array<RoleDataType>> = ref([])
let addRoleBoxVisible: Ref<boolean> = ref(false)
let editRoleBoxVisible: Ref<boolean> = ref(false)
let completeRoleTreeData: Ref<Array<DataNode>> = ref([])
let roleTreeCheckedKeys: Ref<Array<string>> = ref([])
let rolePermissionTreeData: Ref<Array<DataNode>> = ref([])
let currentRoleDate: Ref<RoleDataType> = ref(initRoleData)
let showPermissionTreeTab: Ref<boolean> = ref(false)
let searchUserName: Ref<string> = ref('')

// 角色-用户相关变量
const staffListValue: Ref<ValueLabelArray> = ref([])
const departmentListValue: Ref<string[]> = ref([])
const userList: Ref<ValueLabelArray> = ref([])
const userListBackUp: Ref<ValueLabelArray> = ref([])
const handleAddRoleUser = () => {
  const entityId = currentRoleDate.value.roleId
  const userIdList = staffListValue.value.map(item => item.value)
  bindRoleUserList(entityId, userIdList).then(renderRoleUserList).then(() => {
    staffListValue.value = []
    departmentListValue.value = []
  })
}
const handleDeleteRoleUser = () => {
  const entityId = currentRoleDate.value.roleId
  const userIdList = staffListValue.value.map(item => item.value)
  unbindRoleUserList(entityId, userIdList).then(renderRoleUserList).then(() => {
    staffListValue.value = []
    departmentListValue.value = []
  })
}

const handleUnbindRoleUser = (attachId: string) => {
  const entityId = currentRoleDate.value.roleId
  unbindRoleUser(entityId, attachId).then(renderRoleUserList)
}

const handleUnbindAllRoleUser = () => {
  const entityId = currentRoleDate.value.roleId
  const userIdList = userList.value.map(user => user.value)
  unbindRoleUserList(entityId, userIdList).then(renderRoleUserList)
}

const initAndUpdateRoleList = () => getRoleList(inputRoleName.value).then(res => roleData.value = res.payload.records)

const queryRoleDetail = (roleData: RoleDataType, index: number) => {
  activateItemIndex.value = index
  currentRoleDate.value = roleData
  showPermissionTreeTab.value = true
  renderRolePermissionTree().then(renderEditRolePermissionTree).then(renderRoleUserList)
}

const renderRolePermissionTree = () =>
  getRolePermissionTree(currentRoleDate.value.roleId).then(res => rolePermissionTreeData.value = res.payload)

const renderEditRolePermissionTree = () =>
  getRolePermissionListById(currentRoleDate.value.roleId)
    .then(res => roleTreeCheckedKeys.value = res.payload.map((record: DataNode) => record.key))

const renderRoleUserList = () =>
  getRoleUserList(currentRoleDate.value.roleId).then(res => {
    userList.value = res.payload
    userListBackUp.value = res.payload
  })


const checkRoleTreeNode = (_: string, e: { checked: boolean, node: DataNode }) => {
  const entityId = currentRoleDate.value.roleId
  const attachId = String(e.node.key)
  if (e.checked) bindRolePermission(entityId, attachId)
  else unbindRolePermission(entityId, attachId)
}

const handleDeleteRole = (id: string) => deleteRole(id).then(initAndUpdateRoleList)

const handleAddRole = (roleData: RoleDataType) => addRole(roleData.roleName)
  .then(() => addRoleBoxVisible.value = false).then(initAndUpdateRoleList).then(() => addRoleBoxVisible.value = false)

const onEditRole = (roleData: RoleDataType) => {
  currentRoleDate.value = roleData
  editRoleBoxVisible.value = true
}

const handleEditRole = (role: RoleDataType) => editRole(role).then(initAndUpdateRoleList).then(() => editRoleBoxVisible.value = false)

const tabChange = (key: string) => {
  if (key === VIEW) renderRolePermissionTree()
  else if (key === EDIT) renderEditRolePermissionTree()
  else if (key === LINK) renderRoleUserList()
}

const handleSearchUser = () => userList.value = userList.value.filter(user => user.label.indexOf(searchUserName.value) > -1)

watch(searchUserName, name => !name && (userList.value = userListBackUp.value))

watch(inputRoleName, _.debounce(initAndUpdateRoleList, QUERY_INTERVAL))

onBeforeMount(initAndUpdateRoleList)

onMounted(() => getCompletePermissionTree().then(res => completeRoleTreeData.value = res.payload))

</script>

<style scoped>
.role-list-wrap {
  background: #fff;
}

.role-list {
  width: 400px;
}

.role-permission-user-maintenance {
  height: 100%;
}

:deep(.role-permission-user-maintenance .ant-layout-content) {
  height: 100%;
  padding: 20px;
}

:deep(.role-list-wrap .ant-spin-container) {
  cursor: pointer;
}

:deep(.role-list-wrap .ant-spin-container li:hover) {
  color: #1989fa;
}

:deep(.role-list-wrap .ant-spin-container li .a-list-item-content div) {
  opacity: 0;
}

:deep(.role-list-wrap .ant-spin-container li:hover .a-list-item-content div) {
  opacity: 1;
}

.activate-item {
  font-weight: bold;
  color: #1989fa;
}

.a-list-item-content {
  width: 100%;
  display: flex;
  justify-content: space-between;
}

.a-list-item-content div button {
  margin-right: 10px;
}

.tag-box {
  height: 480px;
  overflow: auto;
}
</style>
