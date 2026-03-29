<template>
  <div style="height: calc(100% - 66px)">
    <a-layout class="role-permission-user-maintenance">
      <a-layout-sider
        class="role-list-wrap"
        width="400"
      >
        <a-list
          :data-source="roleData"
          bordered
          class="role-list"
          style="height: 100%"
        >
          <template #header>
            <a-input
              v-model:value="inputRoleName"
              placeholder="请输入角色名称"
              style="width: 276px; margin-right: 10px"
              @search="initAndUpdateRoleList"
            />
            <a-button
              type="primary"
              @click="addRoleBoxVisible = true"
            >
              添加
            </a-button>
          </template>
          <template #renderItem="{ item, index }">
            <a-list-item
              :class="{ 'activate-item': activateItemIndex === index }"
              @click="queryRoleDetail(item, index)"
            >
              <div class="a-list-item-content">
                {{ item.roleName }}
                <div>
                  <a-button
                    size="small"
                    type="primary"
                    @click="onEditRole(item)"
                  >
                    编辑
                  </a-button>
                  <delete-pop-confirm
                    v-if="item.status !== -1"
                    @delete-event="handleDeleteRole(item.roleId)"
                  />
                </div>
              </div>
            </a-list-item>
          </template>
        </a-list>
      </a-layout-sider>
      <a-layout-content style="min-width: 710px">
        <a-tabs
          v-if="showPermissionTreeTab"
          type="editable-card"
          hide-add
          style="height: 100%"
          @change="tabChange"
        >
          <a-tab-pane
            :key="VIEW"
            tab="查看权限树"
            :closable="false"
          >
            <a-tree
              v-if="rolePermissionTreeData.length"
              :default-expand-all="true"
              :show-line="true"
              :tree-data="rolePermissionTreeData"
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
              v-if="completeRoleTreeData.length"
              v-model:checked-keys="roleTreeCheckedKeys"
              :tree-data="completeRoleTreeData"
              :entity-ids="[currentRoleDate.roleId]"
              :bind-api="bindRolePermission"
              :unbind-api="unbindRolePermission"
            />
          </a-tab-pane>
          <a-tab-pane
            :key="LINK"
            tab="关联用户"
            :closable="false"
          >
            <department-and-staff-select
              v-model:staff-list-value="staffListValue"
              layout-mode="vertical"
              :width="610"
              :is-multiple="true"
            />
            <div class="button-group">
              <a-button
                :disabled="staffListValue.length === 0"
                type="primary"
                class="action-button"
                @click="handleAddRoleUser"
              >
                添加
              </a-button>
              <a-button
                :disabled="staffListValue.length === 0"
                type="primary"
                danger
                class="action-button"
                @click="handleDeleteRoleUser"
              >
                解绑
              </a-button>
            </div>
            <a-card
              size="small"
              title="已绑定用户"
            >
              <template #extra>
                <a-input-search
                  v-model:value="searchUserName"
                  style="width: 200px; margin-right: 10px"
                  enter-button
                  @search="handleSearchUser"
                />
                <delete-pop-confirm
                  btn-content="解绑所有用户"
                  pop-content="确认解绑全部用户吗？该操作不可恢复！"
                  size="middle"
                  @delete-event="handleUnbindAllRoleUser"
                />
              </template>
              <a-empty v-if="!userList.length" />
              <div
                v-else
                class="tag-box"
              >
                <a-tag
                  v-for="user in userList"
                  :key="user.value"
                  color="blue"
                  closable
                  style="margin-top: 5px"
                  @close="handleUnbindRoleUser(user.value)"
                >
                  {{ user.label }}
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
    <dialog-box
      v-model:visible="addRoleBoxVisible"
      title="添加角色"
      :width="600"
    >
      <add-and-edit-role-form @callback="handleAddRole" />
    </dialog-box>
    <dialog-box
      v-model:visible="editRoleBoxVisible"
      title="编辑角色"
      :width="600"
    >
      <add-and-edit-role-form
        :form-data="currentRoleDate"
        @callback="handleEditRole"
      />
    </dialog-box>
  </div>
</template>

<script lang="ts" setup>
import { DataNode } from 'ant-design-vue/es/vc-tree/interface'
import * as _ from 'lodash'
import { Ref } from 'vue'

import { initRoleData, RoleDataType } from '../type'
import AddAndEditRoleForm from './AddAndEditRoleForm/index.vue'


import { getCompletePermissionTree } from '@/framework/apis/admin/navEdit'
import {
  addRole,
  bindRolePermission,
  deleteRole,
  editRole,
  getRoleList,
  getRolePermissionListById,
  getRolePermissionTree,
  unbindRolePermission,
} from '@/framework/apis/admin/rolePermission'
import {
  bindRoleUserList,
  getRoleUserList,
  unbindRoleUser,
  unbindRoleUserList,
} from '@/framework/apis/admin/roleUser'
import DeletePopConfirm from '@/framework/components/common/deletePopConfirm/DeletePopConfirm.vue'
import BindTree from '@/framework/components/common/Panel/BindTree.vue'
import { EDIT, LINK, QUERY_INTERVAL, VIEW } from '@/framework/utils/constant'
import { ValueLabelArray } from '@/framework/utils/type'

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
const userList: Ref<ValueLabelArray> = ref([])
const userListBackUp: Ref<ValueLabelArray> = ref([])
const handleAddRoleUser = () => {
  const entityId = currentRoleDate.value.roleId
  const userIdList = staffListValue.value.map((item) => item.value)
  bindRoleUserList(entityId, userIdList).then(renderRoleUserList)
}
const handleDeleteRoleUser = () => {
  const entityId = currentRoleDate.value.roleId
  const userIdList = staffListValue.value.map((item) => item.value)
  unbindRoleUserList(entityId, userIdList).then(renderRoleUserList)
}

const handleUnbindRoleUser = (attachId: string) => {
  const entityId = currentRoleDate.value.roleId
  unbindRoleUser(entityId, attachId).then(renderRoleUserList)
}

const handleUnbindAllRoleUser = () => {
  const entityId = currentRoleDate.value.roleId
  const userIdList = userList.value.map((user) => user.value)
  unbindRoleUserList(entityId, userIdList).then(renderRoleUserList)
}

const initAndUpdateRoleList = () =>
  getRoleList(inputRoleName.value).then((res) => (roleData.value = res.payload.records))

const queryRoleDetail = (roleData: RoleDataType, index: number) => {
  activateItemIndex.value = index
  currentRoleDate.value = roleData
  showPermissionTreeTab.value = true
  renderRolePermissionTree().then(renderEditRolePermissionTree).then(renderRoleUserList)
}

const renderRolePermissionTree = () =>
  getRolePermissionTree(currentRoleDate.value.roleId).then(
    (res) => (rolePermissionTreeData.value = res.payload)
  )

const renderEditRolePermissionTree = () =>
  getRolePermissionListById(currentRoleDate.value.roleId).then(
    (res) =>
      (roleTreeCheckedKeys.value = res.payload.map((record: DataNode) => record.key))
  )

const renderRoleUserList = () =>
  getRoleUserList(currentRoleDate.value.roleId).then((res) => {
    userList.value = res.payload
    userListBackUp.value = res.payload
  })

const handleDeleteRole = (id: string) => deleteRole(id).then(initAndUpdateRoleList)

const handleAddRole = (roleData: RoleDataType) =>
  addRole(roleData.roleName)
    .then(() => (addRoleBoxVisible.value = false))
    .then(initAndUpdateRoleList)
    .then(() => (addRoleBoxVisible.value = false))

const onEditRole = (roleData: RoleDataType) => {
  currentRoleDate.value = roleData
  editRoleBoxVisible.value = true
}

const handleEditRole = (role: RoleDataType) =>
  editRole(role)
    .then(initAndUpdateRoleList)
    .then(() => (editRoleBoxVisible.value = false))

const tabChange = (key: string) => {
  if (key === VIEW) renderRolePermissionTree()
  else if (key === EDIT) renderEditRolePermissionTree()
  else if (key === LINK) renderRoleUserList()
}

const handleSearchUser = () =>
  (userList.value = userList.value.filter(
    (user) => user.label.indexOf(searchUserName.value) > -1
  ))

watch(searchUserName, (name) => !name && (userList.value = userListBackUp.value))

watch(inputRoleName, _.debounce(initAndUpdateRoleList, QUERY_INTERVAL))

onBeforeMount(initAndUpdateRoleList)

onMounted(() =>
  getCompletePermissionTree().then((res) => (completeRoleTreeData.value = res.payload))
)
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

/* 按钮组响应式布局 */
.button-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding-bottom: 8px;
  margin-bottom: 8px;
  align-items: center;
}

.action-button {
  min-width: 120px;
  flex: 1;
  max-width: 200px;
}

/* 小屏幕适配 */
@media screen and (max-width: 768px) {
  .button-group {
    flex-direction: column;
    align-items: stretch;
  }

  .action-button {
    width: 100%;
    max-width: none;
  }
}

/* 确保有足够的垂直间距避免重叠 */
:deep(.ant-form-item) {
  margin-bottom: 16px;
}
</style>
