<template>
  <div class="wrapper">
    <a-layout style="height: 100%;background-color: #fff">
      <a-layout-sider class="user-group-category-list-wrapper" theme="light" width="280">
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
      <a-layout-sider v-if="hasSelectUserGroupCategory" class="user-group-list-wrapper" theme="light" width="300">
        <div>
          <a-tree
            v-if="userGroupTreeData.length"
            :defaultExpandAll="true"
            :show-line="true"
            :tree-data="userGroupTreeData"
            @select="selectUserGroup">
            <template #title="{ dataRef }">{{ dataRef.name }}</template>
          </a-tree>
          <a-empty v-else />
        </div>
      </a-layout-sider>
      <a-layout-content v-if="hasSelectUserGroup" class="user-name-wrapper">
        <a-tabs v-model:activeKey="activeTabKey" style="margin-left: 10px" @change="changeTab">
          <a-tab-pane :key="USER" tab="用户组管理">
            <div class="tab-pane-content">
              <UserPermission :currentUserGroupInfo="currentUserGroupInfo" :render-bind-user-flag="renderBindUserFlag" />
            </div>
          </a-tab-pane>
          <template v-for="bindTab in bindTabs" :key="bindTab.tabKey">
            <template v-if="bindTab.readOnly">
              <a-tab-pane :key="bindTab.tabKey" :tab="bindTab.title">
                <template v-if="bindTab.treeMode">
                  <div class="tab-pane-content">
                    <a-tree
                      v-if="isNotEmpty(bindTab.data)"
                      :key="bindTab.key"
                      :defaultExpandAll="true"
                      :show-line="true"
                      :tree-data="bindTab.data">
                      <template #title="{ dataRef }">{{ dataRef.label }}</template>
                    </a-tree>
                    <a-empty v-else />
                  </div>
                </template>
                <template v-else>
                  <a-list
                    v-if="isNotEmpty(bindTab.data)" :key="bindTab.key" :data-source="bindTab.data" bordered
                    size="small">
                    <template #renderItem="{ item }">
                      <a-list-item>{{ item[bindTab.bindDataDisplayField] }}</a-list-item>
                    </template>
                  </a-list>
                  <a-empty v-else />
                </template>
              </a-tab-pane>
            </template>
            <template v-else>
              <a-tab-pane :key="bindTab.tabKey + '_view'" :tab="'查看' + bindTab.title">
                <div class="tab-pane-content">
                  <a-list
                    v-if="isNotEmpty(bindTab.bindData)" :key="bindTab.key" :data-source="bindTab.bindData"
                    bordered size="small">
                    <template #renderItem="{ item }">
                      <a-list-item>{{ item[bindTab.bindDataDisplayField] }}</a-list-item>
                    </template>
                  </a-list>
                  <a-empty v-else />
                </div>
              </a-tab-pane>
              <a-tab-pane :key="bindTab.tabKey + '_bind'" :tab="'绑定'+ bindTab.title">
                <template v-if="bindTab.treeMode">
                  <div class="tab-pane-content">
                    <a-tree
                      v-if="isNotEmpty(bindTab.data)"
                      :key="bindTab.key"
                      v-model:checkedKeys="bindTab.checked"
                      :defaultExpandAll="true"
                      :show-line="true"
                      :tree-data="bindTab.data"
                      checkable
                      @check="handleChecked($event, bindTab)">
                      <template #title="{ dataRef }">{{ dataRef.label }}</template>
                    </a-tree>
                    <a-empty v-else />
                  </div>
                </template>
                <template v-else>
                  <a-checkbox-group
                    v-if="isNotEmpty(bindTab.data)"
                    v-model:value="bindTab.checked"
                    style="display: grid;"
                    @change="handleChecked($event, bindTab)">
                    <a-checkbox
                      v-for="(item, index) in bindTab.data" :key="index"
                      :value="item.value"
                      style="margin: 5px 0">
                      <span class="normal">{{ item.label }}</span>
                    </a-checkbox>
                  </a-checkbox-group>
                  <a-empty v-else />
                </template>
              </a-tab-pane>
            </template>
          </template>
        </a-tabs>
      </a-layout-content>
    </a-layout>
  </div>
</template>

<script lang="ts" setup>
import '@/framework/assets/css/userGroup.css'
import { Ref } from 'vue/dist/vue'
import { IdName, IdNameArray } from '@/framework/utils/type'
import { getUserGroupType } from '@/framework/apis/admin/userGroup'
import { getUserGroupList } from '@/apis/manage/manage'
import { DataNode } from 'ant-design-vue/es/vc-tree/interface'
import { Key } from 'ant-design-vue/es/table/interface'
import { QUERY_INTERVAL, USER } from '@/framework/utils/constant'
import { GroupBindProperty } from '@/framework/components/common/GroupManage/types'
import { isEmpty, isNotEmpty } from '@/framework/utils/common'
import { dictStore, useTreeStore } from '@/framework/store/common'
import * as _ from 'lodash'
import { bindReplaceBatchAttachByUrl, getAllBindListByUrl } from '@/framework/apis/portal'

let userGroupCategory: Ref<IdNameArray> = ref([])
let activateDictItem: Ref<number> = ref(-1)
let inputUserGroupCategoryName: Ref<string> = ref('')
let currentUserGroupCategoryId: Ref<string> = ref('')
let userGroupTreeData: Ref<Array<DataNode>> = ref([])
let hasSelectUserGroupCategory: Ref<boolean> = ref(false)
let hasSelectUserGroup: Ref<boolean> = ref(false)
let currentUserGroupInfo: Ref<IdName> = ref({name: '', id: ''})
let renderBindUserFlag: Ref<number> = ref(0)
const renderUserGroupType = () => getUserGroupType(inputUserGroupCategoryName.value).then(res => userGroupCategory.value = res.payload)
const renderUserGroupTree = () => getUserGroupList(currentUserGroupCategoryId.value).then(res => userGroupTreeData.value = res.payload)
const getCurrentUserGroupCategory = (id: string, index: number) => {
  activateDictItem.value = index
  currentUserGroupCategoryId.value = id
  renderUserGroupTree().then(() => {
    hasSelectUserGroupCategory.value = true
    hasSelectUserGroup.value = false
  })
}
const onSearchUserGroupCategory = renderUserGroupType
const selectUserGroup = (_: Key[], info: any) => {
  const {id, name} = info.node
  currentUserGroupInfo.value.name = name
  currentUserGroupInfo.value.id = id
  hasSelectUserGroup.value = true
  if (isNotEmpty(bindTabs)) {
    for (let bindTab of bindTabs) {
      getAllBindListByUrl(bindTab.baseUrl, currentUserGroupInfo.value.id).then((resp: any) => {
        bindTab.bindData = resp.payload || []
        bindTab.checked = []
        bindTab.bindData.forEach((item: any) => {
          bindTab.checked?.push(item[bindTab.bindDataValueField])
        })
        bindTab.key = !bindTab.key
      })
    }
  }
  renderBindUserFlag.value += 1
}
const changeTab = () => {

}
const handleChecked = (checkedValue: any, tab: any) => {
  bindReplaceBatchAttachByUrl(tab.baseUrl, currentUserGroupInfo.value.id, checkedValue || [])
    .then(() => {
      getAllBindListByUrl(tab.baseUrl, currentUserGroupInfo.value.id).then((resp: any) => {
        tab.bindData = resp.payload || []
        tab.key = !tab.key
      })
    })
}
let activeTabKey: Ref<string> = ref(USER)

const props = withDefaults(
  defineProps<{
    bindTabList?: Array<GroupBindProperty>
  }>(),
  {
    bindTabList: undefined
  }
)
const dict = dictStore()
const treeDict = useTreeStore()
const bindTabs = reactive(props.bindTabList || [])
onMounted(() => {
  renderUserGroupType()
  if (isNotEmpty(bindTabs)) {
    for (let bindTab of bindTabs) {
      bindTab.key = true
      bindTab.checked = []
      if (isEmpty(bindTab.data)) {
        if (bindTab.dict) {
          if (bindTab.treeMode) {
            treeDict.getTree(bindTab.dict).then((resp: any) => bindTab.data = resp)
          } else {
            dict.getDict(bindTab.dict).then((resp: any) => bindTab.data = resp)
          }
        }
      }
    }
  }
})
watch(inputUserGroupCategoryName, _.debounce(renderUserGroupType, QUERY_INTERVAL))
</script>

<style lang="less" scoped>
.tab-pane-content {
  max-height: calc(100vh - 230px);
  padding-left: 10px;
  overflow: auto;
}
</style>