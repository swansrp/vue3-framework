<template>
  <department-and-staff-select
    v-model:staffListValue="staffListValue" :is-multiple="true" :width="350" :staff-max-tag-count="1"
    layout-mode="vertical" />
  <a-form-item label="用户权限" v-if="needDefaultPermissionSelect">
    <a-select v-model:value="currentPermission" placeholder="请选择权限">
      <a-select-option v-for="item in permissionList" :key="item.value" :value="item.value">
        {{ item.label }}
      </a-select-option>
    </a-select>
  </a-form-item>
  <a-button
    style="width: 200px;margin-bottom: 10px;margin-left: 70px;display: block;" type="primary"
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
        @close="handleUnbindUser(user.userId)">
        {{ user.label }}-{{ user.dataScopeDisplay }}
      </a-tag>
    </div>
  </a-card>

  <dialog-box v-model:visible="editUserPermissionVisible" :title="`为${currentUserInfo.name}配置权限`">
    <EditUserPermission
      :data-scope="currentUserInfo.dataScope" :permission-list="permissionList"
      @callback="handleEditUserPermission" />
  </dialog-box>
</template>

<script setup lang="ts">

import DepartmentAndStaffSelect
  from "@/framework/components/common/departmentAndStaffSelect/DepartmentAndStaffSelect.vue";
import DeletePopConfirm from "@/framework/components/common/deletePopConfirm/DeletePopConfirm.vue";
import {message} from "ant-design-vue";
import {
  bindUserGroupList,
  editUserPermission, getBindUser,
  unbindAllUserGroupList,
  unbindUserGroupList
} from "@/framework/apis/admin/userGroup";
import {Ref} from "vue";
import {IdName, ValueLabel, ValueLabelArray} from "@/framework/utils/type";
import DialogBox from "@/framework/components/common/dialogBox/DialogBox.vue";
import EditUserPermission
  from "@/framework/views/MainContent/SystemManage/UserGroupMaintenance/editUserPermission/index.vue";
import {getDictListByDictName} from "@/framework/apis/common/common";

const props = defineProps<{currentUserGroupInfo: IdName, renderBindUserFlag: number, needDefaultPermissionSelect?: boolean}>()
const {currentUserGroupInfo, renderBindUserFlag, needDefaultPermissionSelect} = toRefs(props)

let permissionList: Ref<ValueLabelArray> = ref([])
getDictListByDictName('DATA_PERMIT_SCOPE_DICT', permissionList).then(() => currentPermission.value = permissionList.value[0].value)

let searchUserName: Ref<string> = ref('')
const userList: Ref<UserDataType[]> = ref([])
const staffListValue: Ref<ValueLabelArray> = ref([])
let editUserPermissionVisible: Ref<boolean> = ref(false)
let selectPermission: Ref<string | undefined> = ref(undefined)
let currentPermission: Ref<string> = ref('')

interface UserDataType extends ValueLabel {
  dataScopeDisplay: string
  dataScope: string,
  userId: string
}

let currentUserInfo: Ref<{ id: string, name: string, dataScope: string }> = ref({
  id: '',
  name: '',
  dataScope: ''
})

const handleAddUser = () => {
  if (staffListValue.value.length === 0) {
    message.error({content: () => '请选择用户后再执行添加操作', style: {marginTop: '10vh'}})
    return
  }
  const entityId = currentUserGroupInfo.value.id
  const userIdList = staffListValue.value.map(item => item.value)
  bindUserGroupList(entityId, userIdList, currentPermission.value).then(renderBindUser)
}

const handleSearchUser = () => userList.value = userList.value.filter(user => user.label.indexOf(searchUserName.value) > -1)

const handleUnbindUser = (attachId: string) => {
  const entityId = currentUserGroupInfo.value.id
  unbindUserGroupList(entityId, attachId).then(renderBindUser)
}

const handleUnbindAllUser = () => {
  const entityId = currentUserGroupInfo.value.id
  const userIdList = userList.value.map(user => user.userId)
  unbindAllUserGroupList(entityId, userIdList).then(renderBindUser)
}

const handleChangePermission = (user: any) => {
  currentUserInfo.value.id = user.userId
  currentUserInfo.value.name = user.label
  currentUserInfo.value.dataScope = user.dataScope
  editUserPermissionVisible.value = true
}

const handleEditUserPermission = (dataScope: string) =>
  editUserPermission(dataScope, currentUserGroupInfo.value.id, currentUserInfo.value.id)
    .then(renderBindUser).then(() => editUserPermissionVisible.value =false)

const renderBindUser = () =>
  getBindUser(currentUserGroupInfo.value.id, searchUserName.value, selectPermission.value)
    .then(res => userList.value = res.payload)


watch(searchUserName, renderBindUser)
watch(selectPermission, renderBindUser)
watch(renderBindUserFlag, renderBindUser, {immediate: true})

</script>
