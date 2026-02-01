<template>
  <department-and-staff-select
    v-model:department-list-value="departmentListValue"
    v-model:staff-list-value="staffListValue"
    :staff-max-tag-count="1"
    :width="500"
    is-multiple
    layout-mode="vertical"
  />
  <a-form-item
    v-if="needDefaultPermissionSelect"
    label="用户权限"
  >
    <a-select
      v-model:value="currentPermission"
      placeholder="请选择权限"
      style="width: 285px"
    >
      <a-select-option
        v-for="item in permissionList"
        :key="item.value"
        :value="item.value"
      >
        {{ item.label }}
      </a-select-option>
    </a-select>
  </a-form-item>
  <div style="padding-top: 4px; margin-bottom: 8px">
    <a-button
      :disabled="staffListValue.length === 0"
      style="width: 200px;margin-left: 70px;"
      type="primary"
      @click="handleAddUser"
    >
      添加
    </a-button>
    <a-button
      :disabled="staffListValue.length === 0"
      danger
      style="width: 200px;margin-left: 70px;"
      type="primary"
      @click="handleDeleteUser"
    >
      解绑
    </a-button>
  </div>
  <a-card
    size="small"
    style="height: calc(100vh - 410px)"
    title="已绑定用户"
  >
    <template #extra>
      <a-select
        v-model:value="selectPermission"
        placeholder="请选择权限"
        style="width: 200px"
      >
        <a-select-option
          v-for="item in permissionList"
          :key="item.value"
          :value="item.value"
        >
          {{ item.label }}
        </a-select-option>
      </a-select>
      <a-input-search
        v-model:value="searchUserName"
        enter-button
        placeholder="请输入职工名"
        style="width: 200px;margin-right: 10px;"
        @search="handleSearchUser"
      />
      <delete-pop-confirm
        btn-content="解绑所有用户"
        pop-content="确认解绑全部用户吗？该操作不可恢复！"
        size="middle"
        @delete-event="handleUnbindAllUser"
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
        closable
        color="blue"
        style="margin-top: 5px; cursor: pointer;"
        @click="handleChangePermission(user)"
        @close="handleUnbindUser(user.userId)"
      >
        {{ user.label }}-{{ user.dataScopeDisplay }}
      </a-tag>
    </div>
  </a-card>

  <dialog-box
    v-model:visible="editUserPermissionVisible"
    :title="`为${currentUserInfo.name}配置权限`"
  >
    <EditUserPermission
      :data-scope="currentUserInfo.dataScope"
      :permission-list="permissionList"
      @callback="handleEditUserPermission"
    />
  </dialog-box>
</template>

<script lang="ts" setup>

import { Ref } from 'vue'

import {
  bindUserGroupList,
  editUserPermission,
  getBindUser,
  unbindAllUserGroupList,
  unbindUserGroupList
} from '@/framework/apis/admin/userGroup'
import {
  bindUserDeptList as bindDeptUserList,
  editUserPermission as editDeptUserPermission,
  getBindUser as getBindDeptUser,
  unbindAllUserDeptList as unbindAllDeptUserList,
  unbindUserDeptList as unbindDeptUserList
} from '@/framework/apis/admin/deptUser'
import { getDictListByDictName } from '@/framework/apis/common/common'
import DeletePopConfirm from '@/framework/components/common/deletePopConfirm/DeletePopConfirm.vue'
import DepartmentAndStaffSelect
  from '@/framework/components/common/departmentAndStaffSelect/DepartmentAndStaffSelect.vue'
import DialogBox from '@/framework/components/common/dialogBox/DialogBox.vue'
import { IdName, ValueLabel, ValueLabelArray } from '@/framework/utils/type'
import EditUserPermission
  from '@/framework/views/MainContent/SystemManage/UserGroupMaintenance/editUserPermission/index.vue'

const props = withDefaults(defineProps<{
  currentUserGroupInfo: IdName,
  renderBindUserFlag: number,
  needDefaultPermissionSelect?: boolean,
  type?: 'group' | 'dept'
}>(), {
  needDefaultPermissionSelect: false,
  type: 'group'
})

const { currentUserGroupInfo, renderBindUserFlag, needDefaultPermissionSelect, type } = toRefs(props)

const api = computed(() => {
  if (type.value === 'dept') {
    return {
      bind: bindDeptUserList,
      edit: editDeptUserPermission,
      get: getBindDeptUser,
      unbindAll: unbindAllDeptUserList,
      unbind: unbindDeptUserList
    }
  }
  return {
    bind: bindUserGroupList,
    edit: editUserPermission,
    get: getBindUser,
    unbindAll: unbindAllUserGroupList,
    unbind: unbindUserGroupList
  }
})

let permissionList: Ref<ValueLabelArray> = ref([])
getDictListByDictName('DATA_PERMIT_SCOPE_DICT', permissionList).then(() => currentPermission.value = permissionList.value[0].value)

let searchUserName: Ref<string> = ref('')
const userList: Ref<UserDataType[]> = ref([])
const staffListValue: Ref<ValueLabelArray> = ref([])
const departmentListValue: Ref<string[]> = ref([])
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
  const entityId = currentUserGroupInfo.value.id
  const userIdList = staffListValue.value.map(item => item.value)
  api.value.bind(entityId, userIdList, currentPermission.value).then(renderBindUser)
    .then(() => {
      staffListValue.value = []
      departmentListValue.value = []
    })
}

const handleDeleteUser = () => {
  const entityId = currentUserGroupInfo.value.id
  const userIdList = staffListValue.value.map(item => item.value)
  api.value.unbindAll(entityId, userIdList).then(renderBindUser)
    .then(() => {
      staffListValue.value = []
      departmentListValue.value = []
    })
}

const handleSearchUser = () => userList.value = userList.value.filter(user => user.label.indexOf(searchUserName.value) > -1)

const handleUnbindUser = (attachId: string) => {
  const entityId = currentUserGroupInfo.value.id
  api.value.unbind(entityId, attachId).then(renderBindUser)
}

const handleUnbindAllUser = () => {
  const entityId = currentUserGroupInfo.value.id
  const userIdList = userList.value.map(user => user.userId)
  api.value.unbindAll(entityId, userIdList).then(renderBindUser)
}

const handleChangePermission = (user: any) => {
  currentUserInfo.value.id = user.userId
  currentUserInfo.value.name = user.label
  currentUserInfo.value.dataScope = user.dataScope
  editUserPermissionVisible.value = true
}

const handleEditUserPermission = (dataScope: string) =>
  api.value.edit(dataScope, currentUserGroupInfo.value.id, currentUserInfo.value.id)
    .then(renderBindUser).then(() => editUserPermissionVisible.value = false)

const renderBindUser = () =>
  api.value.get(currentUserGroupInfo.value.id, searchUserName.value, selectPermission.value)
    .then(res => userList.value = res.payload)


watch(searchUserName, renderBindUser)
watch(selectPermission, renderBindUser)
watch(renderBindUserFlag, renderBindUser, { immediate: true })

</script>
