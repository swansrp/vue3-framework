<template>
  <div style="height: calc(100% - 66px);">
    <a-layout class="role-permission-user-maintenance">
      <a-layout-sider class="role-list-wrap" width="400">
        <a-list :data-source="roleData" bordered class="role-list" style="height: 100%;">
          <template #header>
            <a-input v-model:value="inputRoleName" placeholder="请输入角色名称" @search="initAndUpdateRoleList" style="width: 276px; margin-right: 10px;" />
            <a-button type="primary" @click="addRoleBoxVisible=true">添加</a-button>
          </template>
          <template #renderItem="{ item, index }">
            <a-list-item @click="queryRoleDetail(item, index)" :class="{'activate-item': activateItemIndex === index}">
              <div class="a-list-item-content">
                {{ item.roleName }}
                <div>
                  <a-button size="small" type="primary" @click="onEditRole(item)">编辑</a-button>
                  <delete-pop-confirm @delete-event="handleDeleteRole(item.roleId)" v-if="item.status !== -1" />
                </div>
              </div>
            </a-list-item>
          </template>
        </a-list>
      </a-layout-sider>
      <a-layout-content style="min-width: 800px">
        <a-tabs v-if="showPermissionTreeTab" type="editable-card" hideAdd @change="tabChange" style="height: 100%;">
          <a-tab-pane :key="VIEW" tab="查看权限树" :closable="false">
            <a-tree
              :defaultExpandAll="true"
              :show-line="true"
              :tree-data="rolePermissionTreeData"
              v-if="rolePermissionTreeData.length">
              <template #title="{ dataRef }"><Icon :icon="dataRef.icon" />{{ dataRef.title }}</template>
            </a-tree>
            <a-empty v-else />
          </a-tab-pane>
          <a-tab-pane :key="EDIT" tab="编辑权限树" :closable="false">
            <a-tree
              :defaultExpandAll="true"
              :show-line="true"
              checkable
              check-strictly
              :tree-data="completeRoleTreeData"
              @check="checkRoleTreeNode"
              v-if="completeRoleTreeData.length"
              v-model:checkedKeys="roleTreeCheckedKeys">
              <template #title="{ dataRef }"><Icon :icon="dataRef.icon" />{{ dataRef.title }}</template>
            </a-tree>
          </a-tab-pane>
          <a-tab-pane :key="LINK" tab="关联用户" :closable="false">
            <department-and-staff-select layout-mode="vertical" :width="700" v-model:staffListValue="staffListValue" :is-multiple="true" />
            <a-button :disabled="staffListValue.length === 0" @click="handleAddRoleUser" type="primary" style="width: 200px;margin-bottom: 10px;margin-left: 70px;">添加</a-button>
            <a-button :disabled="staffListValue.length === 0" @click="handleDeleteRoleUser" type="primary" danger style="width: 200px;margin-bottom: 10px;margin-left: 70px;">解绑</a-button>
            <a-card size="small" title="已绑定用户">
              <template #extra>
                <a-input-search v-model:value="searchUserName" @search="handleSearchUser" style="width: 200px;margin-right: 10px;" enter-button />
                <delete-pop-confirm btn-content="解绑所有用户" pop-content="确认解绑全部用户吗？该操作不可恢复！" @delete-event="handleUnbindAllRoleUser" size="middle" />
              </template>
              <a-empty v-if="!userList.length" />
              <div v-else class="tag-box">
                <a-tag v-for="user in userList" :key="user.value" color="blue" closable @close="handleUnbindRoleUser(user.value)" style="margin-top: 5px">{{ user.label }}</a-tag>
              </div>
            </a-card>
          </a-tab-pane>
        </a-tabs>
        <div v-else>
          <a-empty description="请点击任一角色以查看或编辑角色权限" />
        </div>
      </a-layout-content>
    </a-layout>
    <dialog-box title="添加角色" v-model:visible="addRoleBoxVisible" :width="600">
      <add-and-edit-role-form @callback="handleAddRole" />
    </dialog-box>
    <dialog-box title="编辑角色" v-model:visible="editRoleBoxVisible" :width="600">
      <add-and-edit-role-form @callback="handleEditRole" :form-data="currentRoleDate" />
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
import {Ref} from "vue"
import {initRoleData, RoleDataType} from "../type"
import * as _ from "lodash";
import {EDIT, LINK, QUERY_INTERVAL, VIEW} from "@/framework/utils/constant"
import AddAndEditRoleForm from './AddAndEditRoleForm/index.vue'
import {getCompletePermissionTree} from "@/framework/apis/admin/navEdit"
import {DataNode} from "ant-design-vue/es/vc-tree/interface"
import {bindRoleUserList, getRoleUserList, unbindRoleUser, unbindRoleUserList} from "@/framework/apis/admin/roleUser";
import {ValueLabelArray} from "@/framework/utils/type";
import DeletePopConfirm from "@/framework/components/common/deletePopConfirm/DeletePopConfirm.vue";

let inputRoleName: Ref<string> = ref('')
let activateItemIndex:Ref<number> = ref(-1)
let roleData: Ref<Array<RoleDataType>> = ref([])
let addRoleBoxVisible:Ref<boolean> = ref(false)
let editRoleBoxVisible:Ref<boolean> = ref(false)
let completeRoleTreeData: Ref<Array<DataNode>> = ref([])
let roleTreeCheckedKeys: Ref<Array<string>> = ref([])
let rolePermissionTreeData: Ref<Array<DataNode>> = ref([])
let currentRoleDate: Ref<RoleDataType> = ref(initRoleData)
let showPermissionTreeTab:Ref<boolean> = ref(false)
let searchUserName:Ref<string> = ref('')

// 角色-用户相关变量
const staffListValue: Ref<ValueLabelArray> = ref([])
const userList: Ref<ValueLabelArray> = ref([])
const userListBackUp: Ref<ValueLabelArray> = ref([])
const handleAddRoleUser = () => {
  const entityId = currentRoleDate.value.roleId
  const userIdList = staffListValue.value.map(item => item.value)
  bindRoleUserList(entityId, userIdList).then(renderRoleUserList)
}
const handleDeleteRoleUser = () => {
  const entityId = currentRoleDate.value.roleId
  const userIdList = staffListValue.value.map(item => item.value)
  unbindRoleUserList(entityId, userIdList).then(renderRoleUserList)
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


const checkRoleTreeNode = (_: string, e:{checked: boolean, node: DataNode}) => {
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

const tabChange = (key:string) => {
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
:deep(.role-permission-user-maintenance .ant-layout-content){
    height: 100%;
    padding: 20px;
}

:deep(.role-list-wrap .ant-spin-container){
    cursor: pointer;
}

:deep(.role-list-wrap .ant-spin-container li:hover){
    color: #1989fa;
}
:deep(.role-list-wrap .ant-spin-container li .a-list-item-content div){
    opacity: 0;
}
:deep(.role-list-wrap .ant-spin-container li:hover .a-list-item-content div){
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
