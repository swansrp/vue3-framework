<template>
  <div class="wrapper">
    <a-layout style="height: 100%">
      <a-layout-sider class="user-group-category-list-wrapper" width="280">
        <a-list :data-source="userGroupCategory" bordered class="user-group-category-list" size="small">
          <template #renderItem="{ item, index }">
            <a-list-item
              :class="{'activate-item': activateDictItem === index}"
              @click="getCurrentUserGroupCategory(item.id, index)">{{ item.name }}
            </a-list-item>
          </template>
          <template #header>
            <a-input-search
              v-model:value="inputUserGroupCategoryName" enter-button
              placeholder="请输入用户组类别名称" @search="onSearchUserGroupCategory" />
          </template>
        </a-list>
      </a-layout-sider>
      <a-layout-sider v-if="hasSelectUserGroupCategory" class="user-group-list-wrapper" width="400">
        <div>
          <a-tree
            v-if="userGroupTreeData.length"
            :defaultExpandAll="true"
            :show-line="true"
            :tree-data="userGroupTreeData"
            draggable @drop="onDrop"
            @select="selectUserGroup">
            <template #title="{ dataRef }">
              <a-dropdown :trigger="['contextmenu']">
                <span>{{ dataRef.name }}</span>
                <template #overlay>
                  <a-menu @click="({ key: menuKey }) => onContextMenuClick(dataRef, menuKey)">
                    <a-menu-item key="1">增加子用户组</a-menu-item>
                    <a-menu-item key="2">修改用户组名称</a-menu-item>
                    <a-menu-item key="3">
                      <a-popconfirm
                        title="确定要删除当前用户组吗？"
                        v-model:visible="popConfirmVisible"
                        @confirm="handleDeleteCurrentUserGroup">
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
          <a-input
            v-model:value="inputUserGroupTreeRootNodeName" placeholder="请输出根节点名称"
            style="width: 285px" />
          <a-button type="primary" @click="addUserGroupTreeRootNode">添加根节点</a-button>
        </div>
      </a-layout-sider>
      <a-layout-content v-if="hasSelectUserGroup" class="user-name-wrapper">
        <department-and-staff-select
          v-model:staffListValue="staffListValue" :is-multiple="true" :width="300"
          layout-mode="vertical" />
        <a-button
          style="width: 200px;margin-bottom: 10px;margin-left: 70px;" type="primary"
          @click="handleAddUser">绑定
        </a-button>
        <a-card size="small" title="已绑定用户">
          <template #extra>
            <a-select v-model:value="selectPermission" style="width: 200px" placeholder="请选择权限">
              <a-select-option v-for="item in permissionList" :key="item.value" :value="item.value">
                {{ item.label }}
              </a-select-option>
            </a-select>
            <a-input-search
              v-model:value="searchUserName" enter-button placeholder="请输入职工名"
              style="width: 200px;margin-right: 10px;" @search="handleSearchUser" />
            <delete-pop-confirm
              btn-content="解绑所有用户" pop-content="确认解绑全部用户吗？该操作不可恢复！"
              size="middle" @delete-event="handleUnbindAllUser" />
          </template>
          <a-empty v-if="!userList.length" />
          <div v-else class="tag-box">
            <a-tag
              v-for="user in userList" :key="user.value"
              closable color="blue" style="margin-top: 5px; cursor: pointer;"
              @click="handleChangePermission(user)"
              @close="handleUnbindUser(user.value)">
              {{ user.label }}-{{ user.dataScopeDisplay }}
            </a-tag>
          </div>
        </a-card>
      </a-layout-content>
    </a-layout>
    <dialog-box v-model:visible="addUserGroupNodeVisible" title="新增用户组">
      <add-and-edit-user-group @callback="handleAddUserGroupTreeNode" />
    </dialog-box>
    <dialog-box v-model:visible="editUserGroupNodeVisible" title="编辑用户组">
      <add-and-edit-user-group :name="currentUserGroupInfo.name" @callback="handleEditUserGroupTreeNode" />
    </dialog-box>
    <dialog-box v-model:visible="editUserPermissionVisible" :title="`为${currentUserInfo.name}配置权限`">
      <EditUserPermission
        :data-scope="currentUserInfo.dataScope" :permission-list="permissionList"
        @callback="handleEditUserPermission" />
    </dialog-box>
  </div>
</template>

<script lang="ts" setup>
import '@/framework/assets/css/userGroup.css'
import {
  addUserGroupNode,
  bindUserGroupList,
  deleteUserGroupNode,
  editUserGroupNode,
  editUserPermission,
  getBindUser,
  getUserGroupById,
  getUserGroupType,
  unbindAllUserGroupList,
  unbindUserGroupList, updateUserGroupNodeOrder, updateUserGroupNodePId
} from "@/framework/apis/admin/userGroup"
import {IdName, IdNameArray, ValueLabel, ValueLabelArray} from "@/framework/utils/type"
import {Ref} from "vue"
import * as _ from "lodash"
import {QUERY_INTERVAL} from "@/framework/utils/constant"
import {DataNode} from "ant-design-vue/es/vc-tree/interface"
import {message} from "ant-design-vue"
import 'ant-design-vue/lib/message/style/index.css'
import {WarningFilled} from "@ant-design/icons-vue"
import AddAndEditUserGroup from './addAndEditUserGroup/index.vue'
import EditUserPermission from './editUserPermission/index.vue'
import {getDictList} from "@/framework/apis/common/common"
import {AntTreeNodeDropEvent} from "ant-design-vue/es/tree"
import {getDroppedData} from "@/framework/hooks/antTreeDropSort"
import {getAllParentNodes, getBrotherNodes} from "@/framework/utils/common"
import DeletePopConfirm from "@/framework/components/common/deletePopConfirm/DeletePopConfirm.vue";
import DialogBox from "@/framework/components/common/dialogBox/DialogBox.vue";
import DepartmentAndStaffSelect
  from "@/framework/components/common/departmentAndStaffSelect/DepartmentAndStaffSelect.vue";



let activateDictItem: Ref<number> = ref(-1)
let inputUserGroupCategoryName: Ref<string> = ref('')
let userGroupCategory: Ref<IdNameArray> = ref([])
let currentUserGroupCategoryId: Ref<string> = ref('')

let userGroupTreeData: Ref<Array<DataNode>> = ref([])
let inputUserGroupTreeRootNodeName: Ref<string> = ref('')

let addUserGroupNodeVisible: Ref<boolean> = ref(false)
let editUserGroupNodeVisible: Ref<boolean> = ref(false)

let currentUserGroupInfo: Ref<IdName> = ref({name: '', id: ''})

const staffListValue: Ref<ValueLabelArray> = ref([])

let popConfirmVisible:Ref<boolean> = ref(false)

interface UserDataType extends ValueLabel {
  dataScopeDisplay: string
  dataScope: string
}

const userList: Ref<UserDataType[]> = ref([])
let selectPermission: Ref<string | undefined> = ref(undefined)
let searchUserName: Ref<string> = ref('')

let hasSelectUserGroup: Ref<boolean> = ref(false)
let hasSelectUserGroupCategory: Ref<boolean> = ref(false)

let currentUserInfo: Ref<{ id: string, name: string, dataScope: string }> = ref({
  id: '',
  name: '',
  dataScope: ''
})

let editUserPermissionVisible: Ref<boolean> = ref(false)
let permissionList: Ref<ValueLabelArray> = ref([])

getDictList('DATA_PERMIT_SCOPE_DICT').then(res => permissionList.value = res.payload)

const renderUserGroupType = () => getUserGroupType(inputUserGroupCategoryName.value).then(res => userGroupCategory.value = res.payload)

const onSearchUserGroupCategory = renderUserGroupType

const onContextMenuClick = (data: IdName, menuKey: string) => {
  currentUserGroupInfo.value.name = data.name
  currentUserGroupInfo.value.id = data.id
  if (menuKey === '1') addUserGroupNodeVisible.value = true
  else if (menuKey === '2') editUserGroupNodeVisible.value = true
}

const addUserGroupTreeRootNode = () => {
  const name = inputUserGroupTreeRootNodeName.value
  if (!name) return message.error({content: () => '请输入根节点名称后再提交！', style: {marginTop: '10vh'}})
  const type = currentUserGroupCategoryId.value
  const node = {name, type, pid: null}
  addUserGroupNode(node).then(renderUserGroupTree)
}

const handleAddUserGroupTreeNode = (name: string) => {
  const node = {name, type: currentUserGroupCategoryId.value, pid: currentUserGroupInfo.value.id}
  addUserGroupNode(node).then(renderUserGroupTree).then(() => addUserGroupNodeVisible.value = false)
}

const handleEditUserGroupTreeNode = (name: string) => {
  const node = {name, type: currentUserGroupCategoryId.value, id: currentUserGroupInfo.value.id}
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

const selectUserGroup = (_: string, info: any) => {
  const {id, name} = info.node
  currentUserGroupInfo.value.name = name
  currentUserGroupInfo.value.id = id
  hasSelectUserGroup.value = true
  renderBindUser()
}

const renderBindUser = () =>
  getBindUser(currentUserGroupInfo.value.id, searchUserName.value, selectPermission.value)
    .then(res => userList.value = res.payload)

const handleAddUser = () => {
  if (staffListValue.value.length === 0) {
    message.error({content: () => '请选择用户后再执行添加操作', style: {marginTop: '10vh'}})
    return
  }
  const entityId = currentUserGroupInfo.value.id
  const userIdList = staffListValue.value.map(item => item.value)
  bindUserGroupList(entityId, userIdList).then(renderBindUser)
}

const handleSearchUser = () => userList.value = userList.value.filter(user => user.label.indexOf(searchUserName.value) > -1)

const handleUnbindUser = (attachId: string) => {
  const entityId = currentUserGroupInfo.value.id
  unbindUserGroupList(entityId, attachId).then(renderBindUser)
}

const handleUnbindAllUser = () => {
  const entityId = currentUserGroupInfo.value.id
  const userIdList = userList.value.map(user => user.value)
  unbindAllUserGroupList(entityId, userIdList).then(renderBindUser)
}

const renderUserGroupTree = () => getUserGroupById(currentUserGroupCategoryId.value).then(res => userGroupTreeData.value = res.payload)

const handleChangePermission = (user: any) => {
  currentUserInfo.value.id = user.value
  currentUserInfo.value.name = user.label
  currentUserInfo.value.dataScope = user.dataScope
  editUserPermissionVisible.value = true
}

const handleEditUserPermission = (dataScope: string) =>
  editUserPermission(dataScope, currentUserGroupInfo.value.id, currentUserInfo.value.id)
      .then(renderBindUser).then(() => editUserPermissionVisible.value =false)


const onDrop = (info: AntTreeNodeDropEvent) => {
  const dragKey = info.dragNode.key
  userGroupTreeData.value = getDroppedData(info, userGroupTreeData)
  const brotherNodes = getBrotherNodes(userGroupTreeData.value, dragKey, 'key')
  const parentNodes = getAllParentNodes(userGroupTreeData.value, dragKey, 'key')
  const pid = parentNodes.length ? parentNodes[0].key : null

  let updateOrderData: any = []
  brotherNodes.forEach((node: any, index: number) => {
    updateOrderData.push({id: node.key, showOrder: index})
  })

  let changeOrderPromise = updateUserGroupNodeOrder(updateOrderData)
  changeOrderPromise.then(() => updateUserGroupNodePId(String(dragKey), pid)).then(renderUserGroupTree)
}

onMounted(renderUserGroupType)

watch(searchUserName, renderBindUser)
watch(selectPermission, renderBindUser)
watch(inputUserGroupCategoryName, _.debounce(renderUserGroupType, QUERY_INTERVAL))

</script>

<style scoped>

</style>
