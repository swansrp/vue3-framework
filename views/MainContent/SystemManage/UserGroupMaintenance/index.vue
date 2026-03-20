<template>
  <div class="wrapper">
    <a-layout style="height: 100%;background-color: #fff">
      <a-layout-sider
        class="user-group-category-list-wrapper"
        width="280"
        theme="light"
      >
        <a-list
          :data-source="userGroupCategory"
          bordered
          class="user-group-category-list"
          size="small"
        >
          <template #renderItem="{ item, index }">
            <a-list-item
              :class="{'activate-item': activateDictItem === index}"
              @click="getCurrentUserGroupCategory(item.id, index)"
            >
              {{ item.name }}
            </a-list-item>
          </template>
          <template #header>
            <a-input-search
              v-model:value="inputUserGroupCategoryName"
              enter-button
              placeholder="请输入用户组类别名称"
              @search="onSearchUserGroupCategory"
            />
          </template>
        </a-list>
      </a-layout-sider>
      <a-layout-sider
        v-if="hasSelectUserGroupCategory"
        class="user-group-list-wrapper"
        width="400"
        theme="light"
      >
        <div style="padding: 10px 0">
          <a-input
            v-model:value="inputUserGroupTreeRootNodeName"
            placeholder="请输入根节点名称"
            style="width: 250px;margin-right: 10px"
          />
          <a-button
            type="primary"
            @click="addUserGroupTreeRootNode"
          >
            添加根节点
          </a-button>
          <a-tree
            v-if="userGroupTreeData.length"
            style="margin-top: 20px"
            :default-expand-all="true"
            :show-line="true"
            :tree-data="userGroupTreeData"
            draggable
            @drop="onDrop"
            @select="selectUserGroup"
          >
            <template #title="{ dataRef }">
              <a-dropdown :trigger="['contextmenu']">
                <span>{{ dataRef.name }}</span>
                <template #overlay>
                  <a-menu @click="({ key: menuKey }) => onContextMenuClick(dataRef, menuKey)">
                    <a-menu-item key="1">
                      增加子用户组
                    </a-menu-item>
                    <a-menu-item key="2">
                      修改用户组名称
                    </a-menu-item>
                    <a-menu-item key="3">
                      <a-popconfirm
                        v-model:visible="popConfirmVisible"
                        title="确定要删除当前用户组吗？"
                        @confirm="handleDeleteCurrentUserGroup"
                      >
                        <template #icon>
                          <WarningFilled style="color: red;font-size: 21px;" />
                        </template>
                        <span style="color: red">删除当前用户组</span>
                      </a-popconfirm>
                    </a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </template>
          </a-tree>
          <a-empty v-else />
        </div>
      </a-layout-sider>
      <a-layout-content
        v-if="hasSelectUserGroup"
        class="user-name-wrapper"
        style="padding: 20px;min-width: 720px"
      >
        <a-tabs
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
              v-if="groupPermissionTreeData.length"
              :default-expand-all="true"
              :show-line="true"
              :tree-data="groupPermissionTreeData"
            >
              <template #title="{ dataRef }">
                <Icon :icon="dataRef.icon" />{{ dataRef.title }}
              </template>
            </a-tree>
            <a-empty
              v-else
              description="该用户组暂无权限"
            />
          </a-tab-pane>
          <a-tab-pane
            :key="EDIT"
            tab="编辑权限树"
            :closable="false"
          >
            <BindTree
              v-model:checked-keys="groupTreeCheckedKeys"
              :tree-data="completePermissionTreeData"
              :entity-ids="currentUserGroupInfo.id ? [String(currentUserGroupInfo.id)] : []"
              :bind-api="bindGroupPermission"
              :unbind-api="unbindGroupPermission"
            />
          </a-tab-pane>
          <a-tab-pane
            :key="LINK"
            tab="关联用户"
            :closable="false"
          >
            <UserPermission
              :current-user-group-info="currentUserGroupInfo"
              :render-bind-user-flag="renderBindUserFlag"
              :need-default-permission-select="true"
              @import="handleImportUsers"
            />
          </a-tab-pane>
        </a-tabs>
      </a-layout-content>
    </a-layout>
    <dialog-box
      v-model:visible="addUserGroupNodeVisible"
      title="新增用户组"
    >
      <add-and-edit-user-group @callback="handleAddUserGroupTreeNode" />
    </dialog-box>
    <dialog-box
      v-model:visible="editUserGroupNodeVisible"
      width="600px"
      title="编辑用户组"
    >
      <add-and-edit-user-group
        :name="currentUserGroupInfo.name"
        @callback="handleEditUserGroupTreeNode"
      />
    </dialog-box>

    <upload-file
      ref="uploadFileModal"
      :upload-param="uploadParam"
      excel-parse-url="/group/user/excel"
      @after-confirm="handleAfterImportConfirm"
    />
  </div>
</template>

<script lang="ts" setup>
import '@/framework/assets/css/userGroup.css'
import { WarningFilled } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { Key } from 'ant-design-vue/es/table/interface'
import { AntTreeNodeDropEvent } from 'ant-design-vue/es/tree'
import { DataNode } from 'ant-design-vue/es/vc-tree/interface'
import * as _ from 'lodash'
import { Ref } from 'vue'



import AddAndEditUserGroup from './addAndEditUserGroup/index.vue'

import {
  bindGroupPermission,
  getGroupPermissionListById,
  getGroupPermissionTree,
  unbindGroupPermission
} from '@/framework/apis/admin/groupPermission'
import { getCompletePermissionTree } from '@/framework/apis/admin/navEdit'
import {
  addUserGroupNode,
  deleteUserGroupNode,
  editUserGroupNode,
  getUserGroupById,
  getUserGroupType,
  updateUserGroupNodeOrder,
  updateUserGroupNodePId
} from '@/framework/apis/admin/userGroup'
import DialogBox from '@/framework/components/common/dialogBox/DialogBox.vue'
import { BindTree } from '@/framework/components/common/Panel'
import UserPermission from '@/framework/components/common/userPermission/index.vue'
import { getDroppedData } from '@/framework/hooks/antTreeDropSort'
import { getAllParentNodes, getBrotherNodes } from '@/framework/utils/common'
import { EDIT, LINK, QUERY_INTERVAL, VIEW } from '@/framework/utils/constant'
import { IdName, IdNameArray } from '@/framework/utils/type'



let activateDictItem: Ref<number> = ref(-1)
let inputUserGroupCategoryName: Ref<string> = ref('')
let userGroupCategory: Ref<IdNameArray> = ref([])
let currentUserGroupCategoryId: Ref<string> = ref('')

let userGroupTreeData: Ref<Array<DataNode>> = ref([])
let inputUserGroupTreeRootNodeName: Ref<string> = ref('')

let addUserGroupNodeVisible: Ref<boolean> = ref(false)
let editUserGroupNodeVisible: Ref<boolean> = ref(false)

let currentUserGroupInfo: Ref<IdName> = ref({ name: '', id: '' })

let popConfirmVisible:Ref<boolean> = ref(false)

let hasSelectUserGroup: Ref<boolean> = ref(false)
let hasSelectUserGroupCategory: Ref<boolean> = ref(false)

let renderBindUserFlag: Ref<number> = ref(0)

const uploadFileModal = ref()
const uploadParam = computed(() => ({
  groupType: currentUserGroupCategoryId.value,
  groupName: currentUserGroupInfo.value.name
}))

// 权限树相关变量
let completePermissionTreeData: Ref<Array<DataNode>> = ref([])
let groupTreeCheckedKeys: Ref<string[] | { checked: string[]; halfChecked: string[] }> = ref([])
let groupPermissionTreeData: Ref<Array<DataNode>> = ref([])


const renderUserGroupType = () => getUserGroupType(inputUserGroupCategoryName.value).then(res => userGroupCategory.value = res.payload)

const onSearchUserGroupCategory = renderUserGroupType

const onContextMenuClick = (data: IdName, menuKey: string | number) => {
  currentUserGroupInfo.value.name = data.name
  currentUserGroupInfo.value.id = data.id
  if (+menuKey === 1) addUserGroupNodeVisible.value = true
  else if (+menuKey === 2) editUserGroupNodeVisible.value = true
}

const addUserGroupTreeRootNode = () => {
  const name = inputUserGroupTreeRootNodeName.value
  if (!name) return message.error({ content: () => '请输入根节点名称后再提交！', style: { marginTop: '10vh' } })
  const type = currentUserGroupCategoryId.value
  const node = { name, type, pid: null }
  addUserGroupNode(node).then(renderUserGroupTree)
}

const handleAddUserGroupTreeNode = (name: string) => {
  const node = { name, type: currentUserGroupCategoryId.value, pid: currentUserGroupInfo.value.id }
  addUserGroupNode(node).then(renderUserGroupTree).then(() => addUserGroupNodeVisible.value = false)
}

const handleEditUserGroupTreeNode = (name: string) => {
  const node = { name, type: currentUserGroupCategoryId.value, id: currentUserGroupInfo.value.id }
  editUserGroupNode(node).then(renderUserGroupTree).then(() => editUserGroupNodeVisible.value = false)
}

const handleDeleteCurrentUserGroup = () =>
  deleteUserGroupNode(currentUserGroupInfo.value.id)
      .then(renderUserGroupTree).then(() => popConfirmVisible.value = false)
      .catch(() => popConfirmVisible.value = false)

const getCurrentUserGroupCategory = (id: string, index: number) => {
  activateDictItem.value = index
  currentUserGroupCategoryId.value = id
  renderUserGroupTree().then(() => hasSelectUserGroupCategory.value = true)
}

const selectUserGroup = (_: Key[], info: any) => {
  const { id, name } = info.node
  currentUserGroupInfo.value.name = name
  currentUserGroupInfo.value.id = id
  hasSelectUserGroup.value = true
  renderBindUserFlag.value += 1
  // 加载用户组权限
  renderGroupPermissionTree()
  renderEditGroupPermissionTree()
}

// 渲染用户组权限树
const renderGroupPermissionTree = () =>
  getGroupPermissionTree(String(currentUserGroupInfo.value.id)).then(res => groupPermissionTreeData.value = res.payload)

const renderEditGroupPermissionTree = () =>
  getGroupPermissionListById(String(currentUserGroupInfo.value.id))
    .then(res => groupTreeCheckedKeys.value = res.payload.map((record: DataNode) => String(record.key)))

const tabChange = (key: any) => {
  const keyStr = String(key)
  if (keyStr === VIEW) renderGroupPermissionTree()
  else if (keyStr === EDIT) renderEditGroupPermissionTree()
  else if (keyStr === LINK) renderBindUserFlag.value += 1
}

const handleImportUsers = () => {
  console.log('[UserGroupMaintenance] 触发导入, uploadParam:', uploadParam.value)
  uploadFileModal.value?.showUploadDialogBox('.xlsx')
}

const handleAfterImportConfirm = () => {
  console.log('[UserGroupMaintenance] 导入完成，刷新用户列表')
  renderBindUserFlag.value += 1
}

const renderUserGroupTree = () => getUserGroupById(currentUserGroupCategoryId.value).then(res => userGroupTreeData.value = res.payload)

const onDrop = (info: AntTreeNodeDropEvent) => {
  const dragKey = info.dragNode.key
  userGroupTreeData.value = getDroppedData(info, userGroupTreeData)
  const brotherNodes = getBrotherNodes(userGroupTreeData.value, dragKey, 'key')
  const parentNodes = getAllParentNodes(userGroupTreeData.value, dragKey, 'key')
  const pid = parentNodes.length ? parentNodes[0].key : null

  let updateOrderData: any = []
  brotherNodes.forEach((node: any, index: number) => {
    updateOrderData.push({ id: node.key, showOrder: index })
  })

  let changeOrderPromise = updateUserGroupNodeOrder(updateOrderData)
  changeOrderPromise.then(() => updateUserGroupNodePId(String(dragKey), pid)).then(renderUserGroupTree)
}

onMounted(() => {
  renderUserGroupType()
  getCompletePermissionTree().then(res => {
    completePermissionTreeData.value = res.payload
  })
})

watch(inputUserGroupCategoryName, _.debounce(renderUserGroupType, QUERY_INTERVAL))

</script>
