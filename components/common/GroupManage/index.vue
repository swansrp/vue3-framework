<template>
  <div class="wrapper">
    <a-layout style="height: 100%;background-color: #fff">
      <a-layout-sider
        v-if="!hideCategoryList"
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
        v-if="hasSelectUserGroupCategory && !hideUserGroupTree"
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
          style="margin-left: 10px;"
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
            <!-- 自定义插槽模式：父组件提供 tab_${tabKey} 插槽时生效 -->
            <template v-if="slots['tab_' + bindTab.tabKey]">
              <a-tab-pane
                :key="bindTab.tabKey"
                :tab="bindTab.title"
              >
                <div class="tab-pane-content">
                  <slot
                    :name="'tab_' + bindTab.tabKey"
                    :bind-tab="bindTab"
                    :user-group-info="currentUserGroupInfo"
                  ></slot>
                </div>
              </a-tab-pane>
            </template>
            <template v-else-if="bindTab.readOnly">
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
import { message } from 'ant-design-vue'
import { Key } from 'ant-design-vue/es/table/interface'
import { DataNode } from 'ant-design-vue/es/vc-tree/interface'
import * as _ from 'lodash'


import { getUserGroupTree, getUserGroupType } from '@/framework/apis/admin/userGroup'
import {
  getGroupBindInfo,
  getGroupBindList,
  replaceGroupBind,
  updateGroupBindInfo
} from '@/framework/apis/groupBind'
import { bindReplaceBatchAttachByUrl, getAllBindListByUrl, getBindInfoByUrl, updateBindInfoByUrl } from '@/framework/apis/portal'
import { GroupBindProperty } from '@/framework/components/common/GroupManage/types'
import { dictStore, useTreeStore } from '@/framework/store/common'
import { isEmpty, isNotEmpty } from '@/framework/utils/common'
import { QUERY_INTERVAL, USER } from '@/framework/utils/constant'
import { IdName } from '@/framework/utils/type'

const slots = useSlots()
const userGroupCategory = ref<IdName[]>([])
const activateDictItem = ref(-1)
const inputUserGroupCategoryName = ref('')
const currentUserGroupCategoryId = ref('')
const userGroupTreeData = ref<DataNode[]>([])
const hasSelectUserGroupCategory = ref(false)
const hasSelectUserGroup = ref(false)
const currentUserGroupInfo = ref<IdName>({ name: '', id: '' })
const renderBindUserFlag = ref(0)
const renderUserGroupType = () => getUserGroupType(inputUserGroupCategoryName.value).then(res => {
  let list: IdName[] = res.payload || []
  // 指定了用户组类别时，只保留指定的类别
  if (props.userGroupTypes && props.userGroupTypes.length > 0) {
    list = list.filter((item: IdName) => props.userGroupTypes!.includes(item.id))
  }
  userGroupCategory.value = list
})
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

/**
 * 是否为通用绑定模式（配置了 bindType，走 auth 模块 /web/group/bind）
 */
const isGenericMode = (tab: any): boolean => !!tab.bindType

/**
 * 加载已绑定列表（兼容新老模式）
 * - 老模式（baseUrl）：后端已返回带 label 的字典项
 * - 新模式（bindType）：后端只返回 value + extraData，label 用本地 bindTab.data 字典匹配补全
 */
const fetchBindList = (tab: any, groupId: any): Promise<any[]> => {
  if (isGenericMode(tab)) {
    return getGroupBindList(groupId, tab.bindType!, true, true).then((resp: any) => {
      const list = resp.payload || []
      // 用本地已加载的字典数据补全 label
      const dictData = tab.data || []
      list.forEach((item: any) => {
        const dictItem = dictData.find((d: any) => d.value === item.value)
        if (dictItem) {
          item.label = dictItem.label
        }
      })
      return list
    })
  }
  return getAllBindListByUrl(tab.baseUrl!, groupId).then((resp: any) => resp.payload || [])
}

/**
 * 获取单条绑定信息（兼容新老模式）
 * 新模式下 list 接口已返回 extraData，但仍提供此方法保持调用一致性
 */
const fetchBindInfo = (tab: any, groupId: any, attachId: any): Promise<any> => {
  if (isGenericMode(tab)) {
    return getGroupBindInfo(groupId, attachId, tab.bindType!, false, false).then((resp: any) => resp.payload)
  }
  return getBindInfoByUrl(tab.baseUrl!, groupId, attachId).then((resp: any) => resp.payload)
}

const selectUserGroup = (_: Key[], info: any) => {
  const { id, name } = info.node
  currentUserGroupInfo.value = { id, name }
  hasSelectUserGroup.value = true
  if (isNotEmpty(bindTabs)) {
    for (let bindTab of bindTabs) {
      // 自定义插槽模式跳过数据加载，由父组件自行管理
      if (slots['tab_' + bindTab.tabKey]) continue
      fetchBindList(bindTab, currentUserGroupInfo.value.id).then((bindData: any[]) => {
        bindTab.bindData = bindData
        bindTab.checked = []
        
        // 如果支持绑定信息，获取每个绑定项的详细信息
        if (bindTab.supportBindInfo && bindTab.bindData.length > 0) {
          // 取局部变量捕获引用，供异步闭包使用（避免 TS “可能为 undefined”报错）
          const bindInfoMap = bindTab.bindInfoMap = new Map()
          
          // 获取每个已绑定项的绑定信息
          const promises = bindTab.bindData.map((item: any) => {
            const attachId = item[bindTab.bindDataValueField]
            return fetchBindInfo(bindTab, currentUserGroupInfo.value.id, attachId)
              .then((bindInfo: any) => {
                if (bindInfo) {
                  bindInfoMap.set(attachId, bindInfo)
                  // 合并绑定信息到显示数据中
                  Object.assign(item, bindInfo)
                } else {
                  // 如果没有绑定信息，使用父组件配置的默认值
                  const defaultInfo = bindTab.defaultBindInfo || {}
                  bindInfoMap.set(attachId, defaultInfo)
                  Object.assign(item, defaultInfo)
                }
              })
              .catch(() => {
                // 获取失败时使用父组件配置的默认值
                const defaultInfo = bindTab.defaultBindInfo || {}
                bindInfoMap.set(attachId, defaultInfo)
                Object.assign(item, defaultInfo)
              })
          })
          
          Promise.all(promises).then(() => {
            bindTab.bindData.forEach((item: any) => {
              bindTab.checked?.push(item[bindTab.bindDataValueField])
            })
            bindTab.key = (bindTab.key ?? 0) + 1
          })
        } else {
          bindTab.bindData.forEach((item: any) => {
            bindTab.checked?.push(item[bindTab.bindDataValueField])
          })
          bindTab.key = (bindTab.key ?? 0) + 1
        }
      }).catch(() => {
        message.error('加载绑定数据失败')
      })
    }
  }
  renderBindUserFlag.value += 1
}
/**
 * 直接加载指定用户组的绑定数据。
 * 用于外部通过 currentUserGroup 指定用户组时复用选中逻辑，避免重复实现。
 */
const loadUserGroupData = (userGroup: IdName) => {
  selectUserGroup([], { node: userGroup } as any)
}
const currentBindTab = computed(() => {
  if (!activeTabKey.value || activeTabKey.value === USER) {
    return null
  }
  for (let bindTab of bindTabs) {
    if (activeTabKey.value === bindTab.tabKey + '_bind') {
      // 自定义插槽模式不显示批量操作按钮
      if (slots['tab_' + bindTab.tabKey]) return null
      return bindTab
    }
  }
  return null
})
/** 递归获取树节点所有 key */
const getAllTreeKeys = (nodes: any[]): any[] => {
  let keys: any[] = []
  nodes.forEach(node => {
    keys.push(node.key)
    if (node.children?.length) {
      keys = keys.concat(getAllTreeKeys(node.children))
    }
  })
  return keys
}

const handleChecked = (checkedValue: any, tab: any) => {
  // a-tree 的 @check 返回 { checked, halfChecked }，a-checkbox-group 返回数组
  const values = Array.isArray(checkedValue) ? checkedValue : checkedValue?.checked || []
  // 兼容新老模式：通用模式走 replaceGroupBind，老模式走 bindReplaceBatchAttachByUrl
  const replacePromise = isGenericMode(tab)
    ? replaceGroupBind(currentUserGroupInfo.value.id, tab.bindType!, values)
    : bindReplaceBatchAttachByUrl(tab.baseUrl!, currentUserGroupInfo.value.id, values)
  replacePromise
    .then(() => {
      fetchBindList(tab, currentUserGroupInfo.value.id).then((bindData: any[]) => {
        tab.bindData = bindData
        tab.key = (tab.key ?? 0) + 1
      })
    })
    .catch(() => {
      message.error('操作失败，请重试')
    })
}
const selectAll = (tab: any) => {
  tab.checked = tab.data.map((item: any) => item.value)
  handleChecked(tab.checked, tab)
}
const invertSelect = (tab: any) => {
  const allValues = tab.data.map((item: any) => item.value)
  const currentChecked = tab.checked || []
  tab.checked = allValues.filter((val: any) => !currentChecked.includes(val))
  handleChecked(tab.checked, tab)
}
const clearAll = (tab: any) => {
  tab.checked = []
  handleChecked(tab.checked, tab)
}
const selectAllTree = (tab: any) => {
  tab.checked = getAllTreeKeys(tab.data)
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
  const allKeys = getAllTreeKeys(tab.data)
  return allKeys.length > 0 && allKeys.every((key: any) => tab.checked.includes(key))
}
const activeTabKey = ref<string>(USER)

const props = withDefaults(
    defineProps<{
      bindTabList?: Array<GroupBindProperty>
      /** 指定要显示的用户组类别 id 列表
       * - 不传/空数组：显示所有类别（默认行为）
       * - 传入 1 个：自动选中该类别，并隐藏左侧类别列表
       * - 传入多个：左侧类别列表只显示这些类别供选择
       */
      userGroupTypes?: string[]
      /** 直接指定的用户组（优先级高于 userGroupTypes）
       * - 传入后隐藏左侧类别列表与中间用户组树，直接显示右侧内容
       */
      currentUserGroup?: IdName
    }>(),
    {
      bindTabList: undefined,
      userGroupTypes: undefined,
      currentUserGroup: undefined
    }
)
// 是否隐藏左侧用户组类别列表：
// 1. 直接指定了用户组(currentUserGroup) 时隐藏
// 2. 仅指定了 1 个用户组类别(userGroupTypes.length === 1) 时隐藏
const hideCategoryList = computed(() => {
  if (props.currentUserGroup && props.currentUserGroup.id) return true
  if (props.userGroupTypes && props.userGroupTypes.length === 1) return true
  return false
})
// 是否隐藏中间用户组树：直接指定了用户组时隐藏
const hideUserGroupTree = computed(() => {
  return !!(props.currentUserGroup && props.currentUserGroup.id)
})
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
  
  // 兼容新老模式：通用模式走 updateGroupBindInfo，老模式走 updateBindInfoByUrl
  const updatePromise = isGenericMode(bindTab)
    ? updateGroupBindInfo(currentUserGroupInfo.value.id, attachId, bindTab.bindType!, data)
    : updateBindInfoByUrl(bindTab.baseUrl!, currentUserGroupInfo.value.id, attachId, data)
  return updatePromise
    .then((resp: any) => {
      // 重新获取绑定信息以确保数据同步
      return fetchBindInfo(bindTab, currentUserGroupInfo.value.id, attachId)
        .then((updatedInfo: any) => {
          updatedInfo = updatedInfo || data
          
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
          bindTab.key = (bindTab.key ?? 0) + 1
          
          return resp
        })
    })
}

provide('updateBindInfo', updateBindInfoData)

// 初始化各绑定 tab 的字典数据（与用户组选择无关）
const initBindTabsDict = () => {
  if (isNotEmpty(bindTabs)) {
    for (let bindTab of bindTabs) {
      // 自定义插槽模式跳过初始化，由父组件自行管理
      if (slots['tab_' + bindTab.tabKey]) continue
      bindTab.key = 0
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
}
// 当仅指定一个类别时自动选中（用于隐藏左侧列表后自动加载数据）
const autoSelectIfSingleType = () => {
  if (props.userGroupTypes && props.userGroupTypes.length === 1 && userGroupCategory.value.length > 0) {
    const target = userGroupCategory.value[0]
    getCurrentUserGroupCategory(target.id, 0)
  }
}
onMounted(() => {
  initBindTabsDict()
  // 直接指定了用户组：跳过类别列表与树选择，直接加载该用户组的数据
  if (props.currentUserGroup && props.currentUserGroup.id) {
    loadUserGroupData(props.currentUserGroup)
    return
  }
  // 加载用户组类别，若仅指定一个类别则自动选中
  renderUserGroupType().then(autoSelectIfSingleType)
})
// 支持外部动态切换 currentUserGroup
watch(() => props.currentUserGroup, (newVal) => {
  if (newVal && newVal.id) {
    loadUserGroupData(newVal)
  }
})
// 支持外部动态切换 userGroupTypes
watch(() => props.userGroupTypes, () => {
  // 已直接指定用户组时，忽略类别变化
  if (props.currentUserGroup && props.currentUserGroup.id) return
  renderUserGroupType().then(autoSelectIfSingleType)
}, { deep: true })
watch(inputUserGroupCategoryName, _.debounce(renderUserGroupType, QUERY_INTERVAL))
</script>

<style lang="less" scoped>
.wrapper {
  height: 100%;
  overflow: hidden;
}

.user-group-category-list-wrapper {
  height: calc(100vh - 155px);
  overflow-y: auto;
}

.user-group-category-list {
  width: 250px;
  height: calc(100vh - 155px);
  box-shadow: 0 4px 10px 0 rgba(69, 89, 120, 0.5);
  margin: 0 15px;
}

/* 确保列表内部容器填满高度 */
:deep(.user-group-category-list .ant-spin-container) {
  height: 100%;
  overflow: auto;
}

.user-group-list-wrapper {
  height: calc(100vh - 155px);
  overflow-y: auto;
  padding: 10px;
  box-sizing: border-box;
  border-radius: 10px;
  box-shadow: 0 4px 10px 0 rgba(69, 89, 120, 0.5);
}

.user-name-wrapper {
  height: calc(100vh - 165px);
  overflow-y: auto;
  margin: 10px 0 0 15px;
  border-radius: 8px;
  box-sizing: border-box;
  box-shadow: 0 4px 10px 0 rgba(69, 89, 120, 0.5);
}

/* 确保 ant-tabs 撑满高度并允许内容滚动 */
:deep(.ant-tabs) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.ant-tabs-content-holder) {
  flex: 1;
  overflow: hidden;
}

:deep(.ant-tabs-content) {
  height: 100%;
}

:deep(.ant-tabs-tabpane) {
  height: 100%;
  overflow-y: auto;
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