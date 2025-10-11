<template>
  <div class="content-wrap">
    <a-row
      type="flex"
      class="content-wrap-row"
    >
      <a-col :span="8">
        <a-card title="人员选择">
          <department-and-staff-select
            v-model:staff-list-value="staffListValue"
            layout-mode="vertical"
            :is-multiple="false"
          />
        </a-card>
        <a-card :title="staffListTitle">
          <a-list
            size="small"
            bordered
            :data-source="staffRoleList"
            :locale="{emptyText: hasSelectUser ? '请选择用户后再查看其所拥有的角色' :'暂无角色'}"
          >
            <template #renderItem="{ item, index }">
              <a-list-item>{{ index+1 }}.{{ item }}</a-list-item>
            </template>
          </a-list>
        </a-card>
      </a-col>
      <a-col
        :span="16"
        class="content-wrap-col"
      >
        <div
          ref="permissionTreeWrapperRef"
          class="content-wrap-card-wrap"
        >
          <a-card
            title="用户权限"
            class="content-wrap-card"
          >
            <div
              ref="permissionTreeRef"
              class="content-wrap-tree"
            >
              <a-tree
                v-if="userPermissionTreeData.length"
                :default-expand-all="true"
                :show-line="true"
                :tree-data="userPermissionTreeData"
              >
                <template #title="{ dataRef }">
                  <Icon :icon="dataRef.icon" />{{ dataRef.title }}
                </template>
              </a-tree>
              <a-empty
                v-else
                :description="hasSelectUser ? '请选择用户后再查看其所拥有的权限' : '暂无权限'"
              />
            </div>
          </a-card>
        </div>
      </a-col>
    </a-row>
  </div>
</template>
<script setup lang="ts">
import { DataNode } from 'ant-design-vue/es/vc-tree/interface'
import * as _ from 'lodash'
import { Ref } from 'vue'

import { RoleDataType } from '../type'

import { getRoleList } from '@/framework/apis/admin/rolePermission'
import { getUserPermissionTree, getUserRoleList } from '@/framework/apis/admin/userRole'
import { ValueLabelArray } from '@/framework/utils/type'

let roleData: Ref<Array<RoleDataType>> = ref([])
const staffListValue: Ref<ValueLabelArray> = ref([])
const staffRoleList: Ref<Array<string>> = ref([])
const staffListTitle = '当前职工所拥有角色'
const userPermissionTreeData: Ref<Array<DataNode>> = ref([])
let hasSelectUser: Ref<boolean> = ref(true)
let permissionTreeWrapperRef = ref()
let permissionTreeRef = ref()

watch(staffListValue, (user) => {
  if(!user.length) {
    hasSelectUser.value = true
    staffRoleList.value = []
    userPermissionTreeData.value = []
  }
  else {
    hasSelectUser.value = false
    const userId = user[0].value
    getUserRoleList(userId)
      .then(res => staffRoleList.value = res.payload.map((role: {roleId: string, roleName: string}) => role.roleName))
    getUserPermissionTree(userId)
      .then(res => userPermissionTreeData.value = res.payload)
        .then(updateTreeHeight)
  }
}, { immediate: true })


const initAndUpdateRoleList = () => getRoleList().then(res => roleData.value = res.payload.records)

const updateTreeHeight = () => {
  if (permissionTreeWrapperRef.value && permissionTreeRef.value) {
    const height = permissionTreeWrapperRef.value.offsetHeight
    permissionTreeRef.value.style.height = (height - 100) + 'px'
  }
}
window.addEventListener('resize', _.debounce(updateTreeHeight, 50))

onBeforeMount(initAndUpdateRoleList)

</script>
<style scoped>
.content-wrap {
    width: 100%;
    height: calc(100% - 66px);
    padding: 20px;
    box-sizing: border-box;
}
.content-wrap-row, .content-wrap-col, .content-wrap-card-wrap, .content-wrap-card {
    height: 100%;
}

.content-wrap-tree {
    position: absolute;
    overflow: auto;
    width: 95%;
}

:deep(.role-list .ant-spin-container li:hover){
    color: #1989fa;
}
:deep(.role-list .ant-spin-container){
    cursor: pointer;
}

</style>
