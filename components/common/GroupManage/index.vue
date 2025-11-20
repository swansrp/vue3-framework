<template>
  <div class="wrapper">
    <a-layout style="height: 100%;background-color: #fff">
      <a-layout-sider
        class="user-group-category-list-wrapper"
        theme="light"
        width="280"
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
        theme="light"
        width="300"
      >
        <div>
          <a-tree
            v-if="userGroupTreeData.length"
            :default-expand-all="true"
            :show-line="true"
            :tree-data="userGroupTreeData"
            @select="selectUserGroup"
          >
            <template #title="{ dataRef }">
              {{ dataRef.name }}
            </template>
          </a-tree>
          <a-empty v-else />
        </div>
      </a-layout-sider>
      <a-layout-content
        v-if="hasSelectUserGroup"
        class="user-name-wrapper"
      >
        <a-tabs
          v-model:active-key="activeTabKey"
          style="margin-left: 10px; height: 100%; display: flex; flex-direction: column;"
          @change="changeTab"
        >
          <template #rightExtra>
            <div
              v-if="currentBindTab && isNotEmpty(currentBindTab.data)"
              class="batch-action-buttons"
            >
              <template v-if="currentBindTab.treeMode">
                <a-button 
                  type="primary" 
                  size="small" 
                  :disabled="isAllSelectedTree(currentBindTab)"
                  @click="selectAllTree(currentBindTab)"
                >
                  全选
                </a-button>
                <a-button 
                  size="small" 
                  style="margin-right: 5px" 
                  :disabled="isNoneSelected(currentBindTab)"
                  @click="clearAllTree(currentBindTab)"
                >
                  清空
                </a-button>
              </template>
              <template v-else>
                <a-button 
                  type="primary" 
                  size="small" 
                  :disabled="isAllSelected(currentBindTab)"
                  @click="selectAll(currentBindTab)"
                >
                  全选
                </a-button>
                <a-button
                  size="small"
                  @click="invertSelect(currentBindTab)"
                >
                  反选
                </a-button>
                <a-button 
                  size="small" 
                  style="margin-right: 5px" 
                  :disabled="isNoneSelected(currentBindTab)"
                  @click="clearAll(currentBindTab)"
                >
                  清空
                </a-button>
              </template>
            </div>
          </template>
          <a-tab-pane
            :key="USER"
            tab="用户组管理"
          >
            <div class="tab-pane-content">
              <UserPermission
                :current-user-group-info="currentUserGroupInfo"
                :render-bind-user-flag="renderBindUserFlag"
              />
            </div>
          </a-tab-pane>
          <template
            v-for="bindTab in bindTabs"
            :key="bindTab.tabKey"
          >
            <template v-if="bindTab.readOnly">
              <a-tab-pane
                :key="bindTab.tabKey"
                :tab="bindTab.title"
              >
                <template v-if="bindTab.treeMode">
                  <div class="tab-pane-content">
                    <a-tree
                      v-if="isNotEmpty(bindTab.data)"
                      :key="bindTab.key"
                      :default-expand-all="true"
                      :show-line="true"
                      :tree-data="bindTab.data"
                    >
                      <template #title="{ dataRef }">
                        <slot
                          :name="bindTab.tabKey"
                          :data="bindTab.data"
                        >
                          {{ dataRef.label }}
                        </slot>
                      </template>
                    </a-tree>
                    <a-empty v-else />
                  </div>
                </template>
                <template v-else>
                  <a-list
                    v-if="isNotEmpty(bindTab.data)"
                    :key="bindTab.key"
                    :data-source="bindTab.data"
                    bordered
                    size="small"
                  >
                    <template #renderItem="{ item }">
                      <a-list-item>
                        <slot
                          :name="bindTab.tabKey"
                          :data="bindTab.data"
                        >
                          {{ item[bindTab.bindDataDisplayField] }}
                        </slot>
                      </a-list-item>
                    </template>
                  </a-list>
                  <a-empty v-else />
                </template>
              </a-tab-pane>
            </template>
            <template v-else>
              <a-tab-pane
                :key="bindTab.tabKey + '_view'"
                :tab="'查看' + bindTab.title"
              >
                <div class="tab-pane-content">
                  <a-list
                    v-if="isNotEmpty(bindTab.bindData)"
                    :key="bindTab.key"
                    :data-source="bindTab.bindData"
                    bordered
                    size="small"
                  >
                    <template #renderItem="{ item }">
                      <a-list-item>
                        <slot
                          :name="'view_' + bindTab.tabKey"
                          :item="item"
                          :update-bind-info="updateBindInfoData"
                        >
                          {{ item[bindTab.bindDataDisplayField] }}
                        </slot>
                      </a-list-item>
                    </template>
                  </a-list>
                  <a-empty v-else />
                </div>
              </a-tab-pane>
              <a-tab-pane
                :key="bindTab.tabKey + '_bind'"
                :tab="'绑定'+ bindTab.title"
              >
                <template v-if="bindTab.treeMode">
                  <div class="tab-pane-content">
                    <a-tree
                      v-if="isNotEmpty(bindTab.data)"
                      :key="bindTab.key"
                      v-model:checked-keys="bindTab.checked"
                      :default-expand-all="true"
                      :show-line="true"
                      :tree-data="bindTab.data"
                      checkable
                      @check="handleChecked($event, bindTab)"
                    >
                      <template #title="{ dataRef }">
                        {{ dataRef.label }}
                      </template>
                    </a-tree>
                    <a-empty v-else />
                  </div>
                </template>
                <template v-else>
                  <div class="tab-pane-content">
                    <a-checkbox-group
                      v-if="isNotEmpty(bindTab.data)"
                      v-model:value="bindTab.checked"
                      style="display: grid;"
                      @change="handleChecked($event, bindTab)"
                    >
                      <a-checkbox
                        v-for="(item, index) in bindTab.data"
                        :key="index"
                        :value="item.value"
                        style="margin: 5px 0"
                      >
                        <span class="normal">{{ item.label }}</span>
                      </a-checkbox>
                    </a-checkbox-group>
                    <a-empty v-else />
                  </div>
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
import { Key } from 'ant-design-vue/es/table/interface'
import { DataNode } from 'ant-design-vue/es/vc-tree/interface'
import * as _ from 'lodash'
import { Ref } from 'vue'

import { getUserGroupTree, getUserGroupType } from '@/framework/apis/admin/userGroup'
import { bindReplaceBatchAttachByUrl, getAllBindListByUrl, getBindInfoByUrl, updateBindInfoByUrl } from '@/framework/apis/portal'
import { GroupBindProperty } from '@/framework/components/common/GroupManage/types'
import { dictStore, useTreeStore } from '@/framework/store/common'
import { isEmpty, isNotEmpty } from '@/framework/utils/common'
import { QUERY_INTERVAL, USER } from '@/framework/utils/constant'
import { IdName, IdNameArray } from '@/framework/utils/type'

let userGroupCategory: Ref<IdNameArray> = ref([])
let activateDictItem: Ref<number> = ref(-1)
let inputUserGroupCategoryName: Ref<string> = ref('')
let currentUserGroupCategoryId: Ref<string> = ref('')
let userGroupTreeData: Ref<Array<DataNode>> = ref([])
let hasSelectUserGroupCategory: Ref<boolean> = ref(false)
let hasSelectUserGroup: Ref<boolean> = ref(false)
let currentUserGroupInfo: Ref<IdName> = ref({ name: '', id: '' })
let renderBindUserFlag: Ref<number> = ref(0)
const renderUserGroupType = () => getUserGroupType(inputUserGroupCategoryName.value).then(res => userGroupCategory.value = res.payload)
const renderUserGroupTree = () => getUserGroupTree(currentUserGroupCategoryId.value).then(res => userGroupTreeData.value = res.payload)
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
  const { id, name } = info.node
  currentUserGroupInfo.value.name = name
  currentUserGroupInfo.value.id = id
  hasSelectUserGroup.value = true
  if (isNotEmpty(bindTabs)) {
    for (let bindTab of bindTabs) {
      getAllBindListByUrl(bindTab.baseUrl, currentUserGroupInfo.value.id).then((resp: any) => {
        bindTab.bindData = resp.payload || []
        bindTab.checked = []
        
        // 如果支持绑定信息，获取每个绑定项的详细信息
        if (bindTab.supportBindInfo && bindTab.bindData.length > 0) {
          bindTab.bindInfoMap = new Map()
          
          // 获取每个已绑定项的绑定信息
          const promises = bindTab.bindData.map((item: any) => {
            const attachId = item[bindTab.bindDataValueField]
            return getBindInfoByUrl(bindTab.baseUrl, currentUserGroupInfo.value.id, attachId)
              .then((bindInfoResp: any) => {
                if (bindInfoResp && bindInfoResp.payload) {
                  bindTab.bindInfoMap.set(attachId, bindInfoResp.payload)
                  // 合并绑定信息到显示数据中
                  Object.assign(item, bindInfoResp.payload)
                } else {
                  // 如果没有绑定信息，使用父组件配置的默认值
                  const defaultInfo = bindTab.defaultBindInfo || {}
                  bindTab.bindInfoMap.set(attachId, defaultInfo)
                  Object.assign(item, defaultInfo)
                }
              })
              .catch(() => {
                // 获取失败时使用父组件配置的默认值
                const defaultInfo = bindTab.defaultBindInfo || {}
                bindTab.bindInfoMap.set(attachId, defaultInfo)
                Object.assign(item, defaultInfo)
              })
          })
          
          Promise.all(promises).then(() => {
            bindTab.bindData.forEach((item: any) => {
              bindTab.checked?.push(item[bindTab.bindDataValueField])
            })
            bindTab.key = !bindTab.key
          })
        } else {
          bindTab.bindData.forEach((item: any) => {
            bindTab.checked?.push(item[bindTab.bindDataValueField])
          })
          bindTab.key = !bindTab.key
        }
      })
    }
  }
  renderBindUserFlag.value += 1
}
const changeTab = () => {

}
const currentBindTab = computed(() => {
  if (!activeTabKey.value || activeTabKey.value === USER) {
    return null
  }
  for (let bindTab of bindTabs) {
    if (activeTabKey.value === bindTab.tabKey + '_bind') {
      return bindTab
    }
  }
  return null
})
const handleChecked = (checkedValue: any, tab: any) => {
  bindReplaceBatchAttachByUrl(tab.baseUrl, currentUserGroupInfo.value.id, checkedValue || [])
      .then(() => {
        getAllBindListByUrl(tab.baseUrl, currentUserGroupInfo.value.id).then((resp: any) => {
          tab.bindData = resp.payload || []
          tab.key = !tab.key
        })
      })
}
const selectAll = (tab: any) => {
  tab.checked = tab.data.map((item: any) => item.value)
  handleChecked(tab.checked, tab)
}
const invertSelect = (tab: any) => {
  const allValues = tab.data.map((item: any) => item.value)
  tab.checked = allValues.filter((val: any) => !tab.checked.includes(val))
  handleChecked(tab.checked, tab)
}
const clearAll = (tab: any) => {
  tab.checked = []
  handleChecked(tab.checked, tab)
}
const selectAllTree = (tab: any) => {
  const getAllKeys = (nodes: any[]): any[] => {
    let keys: any[] = []
    nodes.forEach(node => {
      keys.push(node.key)
      if (node.children && node.children.length > 0) {
        keys = keys.concat(getAllKeys(node.children))
      }
    })
    return keys
  }
  tab.checked = getAllKeys(tab.data)
  handleChecked(tab.checked, tab)
}
const clearAllTree = (tab: any) => {
  tab.checked = []
  handleChecked(tab.checked, tab)
}
const isNoneSelected = (tab: any) => {
  return !tab.checked || tab.checked.length === 0
}
const isAllSelected = (tab: any) => {
  if (!tab.data || !tab.checked) return false
  const allValues = tab.data.map((item: any) => item.value)
  return allValues.length > 0 && allValues.every((val: any) => tab.checked.includes(val))
}
const isAllSelectedTree = (tab: any) => {
  if (!tab.data || !tab.checked) return false
  const getAllKeys = (nodes: any[]): any[] => {
    let keys: any[] = []
    nodes.forEach(node => {
      keys.push(node.key)
      if (node.children && node.children.length > 0) {
        keys = keys.concat(getAllKeys(node.children))
      }
    })
    return keys
  }
  const allKeys = getAllKeys(tab.data)
  return allKeys.length > 0 && allKeys.every((key: any) => tab.checked.includes(key))
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

// 导出当前用户组ID和绑定信息Map，供父组件使用
provide('currentUserGroupId', currentUserGroupInfo)
provide('bindTabs', bindTabs)

// 提供更新绑定信息的方法
const updateBindInfoData = (tabKey: string, attachId: any, data: any) => {
  const bindTab = bindTabs.find(tab => tab.tabKey === tabKey)
  if (!bindTab || !bindTab.supportBindInfo) {
    return Promise.reject('Tab not found or does not support bind info')
  }
  
  return updateBindInfoByUrl(bindTab.baseUrl, currentUserGroupInfo.value.id, attachId, data)
    .then((resp: any) => {
      // 重新获取绑定信息以确保数据同步
      return getBindInfoByUrl(bindTab.baseUrl, currentUserGroupInfo.value.id, attachId)
        .then((bindInfoResp: any) => {
          const updatedInfo = bindInfoResp?.payload || data
          
          // 更新本地缓存的绑定信息
          if (bindTab.bindInfoMap) {
            bindTab.bindInfoMap.set(attachId, updatedInfo)
          }
          
          // 更新 bindData 中的数据
          const item = bindTab.bindData?.find((i: any) => i[bindTab.bindDataValueField] === attachId)
          if (item) {
            Object.assign(item, updatedInfo)
          }
          
          // 刷新视图
          bindTab.key = !bindTab.key
          
          return resp
        })
    })
}

provide('updateBindInfo', updateBindInfoData)

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
.wrapper {
  height: 100%;
  overflow: hidden;
}

.user-group-category-list-wrapper {
  height: 100%;
  overflow-y: auto;
}

.user-group-list-wrapper {
  height: 100%;
  overflow-y: auto;
}

.user-name-wrapper {
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.tab-pane-content {
  flex: 1;
  padding-left: 10px;
  overflow: auto;
}

.batch-action-buttons {
  display: flex;
  gap: 8px;
}
</style>