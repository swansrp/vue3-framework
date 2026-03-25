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
  <div class="button-group">
    <div class="left-buttons">
      <a-button
        :disabled="staffListValue.length === 0"
        type="primary"
        class="action-button"
        @click="handleAddUser"
      >
        添加
      </a-button>
      <a-button
        :disabled="staffListValue.length === 0"
        type="primary"
        danger
        class="action-button"
        @click="handleDeleteUser"
      >
        解绑
      </a-button>
    </div>
    <div class="right-buttons">
      <a-button
        size="small"
        :disabled="userList.length === 0"
        @click="handleExport"
      >
        导出
      </a-button>
      <a-button
        size="small"
        type="primary"
        ghost
        @click="handleImport"
      >
        导入
      </a-button>
    </div>
  </div>
  <a-card
    size="small"
    style="height: calc(100vh - 410px)"
    :title="`已绑定用户 (${userList.length})`"
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
import * as XLSX from 'xlsx-js-style'

import {
  bindUserDeptList as bindDeptUserList,
  editUserPermission as editDeptUserPermission,
  getBindUser as getBindDeptUser,
  unbindAllUserDeptList as unbindAllDeptUserList,
  unbindUserDeptList as unbindDeptUserList
} from '@/framework/apis/admin/deptUser'
import {
  bindUserGroupList,
  editUserPermission,
  getBindUser,
  unbindAllUserGroupList,
  unbindUserGroupList
} from '@/framework/apis/admin/userGroup'
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

const emit = defineEmits<{
  (e: 'import'): void
}>()

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
  userId: string,
  value: string
}

let currentUserInfo: Ref<{ id: string, customerNumber: string, name: string, dataScope: string }> = ref({
  id: '',
  customerNumber: '',
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
  currentUserInfo.value.customerNumber = user.value
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


const handleExport = () => {
  console.log('[UserPermission] 导出用户列表:', userList.value)
  
  // 构建Excel数据
  const excelData = [
    ['用户编码', '用户名', '权限'], // 表头
    ...userList.value.map(user => [user.value, user.label, user.dataScopeDisplay])
  ]
  
  // 创建工作簿和工作表
  const ws = XLSX.utils.aoa_to_sheet(excelData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '已绑定用户')
  
  // 设置列宽
  ws['!cols'] = [
    { wch: 20 }, // 用户编码
    { wch: 20 }, // 用户名
    { wch: 15 }  // 权限
  ]
  
  // 导出文件
  const fileName = `${currentUserGroupInfo.value.name}_已绑定用户_${new Date().toLocaleDateString()}.xlsx`
  XLSX.writeFile(wb, fileName)
}

const handleImport = () => {
  console.log('[UserPermission] 触发导入')
  emit('import')
}

watch(searchUserName, renderBindUser)
watch(selectPermission, renderBindUser)
watch(renderBindUserFlag, renderBindUser, { immediate: true })

</script>

<style scoped>
/* 按钮组响应式布局 */
.button-group {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    margin: 8px 0;
    align-items: center;
}

.left-buttons {
    display: flex;
    gap: 10px;
}

.right-buttons {
    display: flex;
    gap: 8px;
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

.tag-box {
    height: calc(100vh - 480px);
    overflow: auto;
}
</style>
