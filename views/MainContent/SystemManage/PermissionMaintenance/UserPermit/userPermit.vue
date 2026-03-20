<template>
  <div class="user-permit-container">
    <a-row
      :gutter="24"
      class="main-content"
    >
      <!-- 左侧：用户选择和菜单树 -->
      <a-col :span="8">
        <a-card
          class="selection-panel"
          title="权限分析"
        >
          <!-- 用户选择 -->
          <div class="user-selection">
            <div class="section-title">
              选择用户
            </div>
            <Staff
              v-model="selectedStaffValue"
              :width="300"
              placeholder="请搜索员工信息"
              :label-in-value="true"
              style="margin-bottom: 20px"
            />
          </div>

          <!-- 菜单权限树 -->
          <div class="menu-tree-section">
            <div class="section-title">
              选择菜单
            </div>
            <div class="tree-wrapper">
              <a-tree
                v-if="menuTreeData.length > 0"
                :key="menuTreeKey"
                :tree-data="menuTreeData"
                :field-names="{ children: 'children', title: 'title', key: 'menuId' }"
                :selected-keys="selectedMenuKeys"
                default-expand-all
                show-line
                @select="handleMenuSelect"
              >
                <template #title="{ title, icon }">
                  <span class="menu-item">
                    <Icon
                      v-if="icon"
                      :icon="icon"
                      style="margin-right: 8px"
                    />
                    {{ title }}
                  </span>
                </template>
              </a-tree>
              <a-empty
                v-else
                description="暂无菜单数据"
              />
            </div>
          </div>
        </a-card>
      </a-col>

      <!-- 右侧：权限管理面板 -->
      <a-col :span="16">
        <a-card class="result-panel">
          <template #title>
            <a-tabs
              v-model:active-key="activeTab"
              @change="handleTabChange"
            >
              <a-tab-pane
                key="explanation"
                tab="权限解释"
              />
              <a-tab-pane
                key="view"
                tab="查看权限树"
              />
              <a-tab-pane
                key="edit"
                tab="编辑权限树"
              />
            </a-tabs>
          </template>
          <template #extra>
            <a-button
              v-if="activeTab === 'explanation'"
              :disabled="!canRefresh"
              type="primary"
              @click="refreshPermitExplanation"
            >
              <template #icon>
                <ReloadOutlined />
              </template>
              刷新
            </a-button>
            <a-button
              v-else-if="activeTab === 'edit'"
              :disabled="!selectedStaffValue"
              type="primary"
              @click="saveUserPermissions"
            >
              <template #icon>
                <SaveOutlined />
              </template>
              保存
            </a-button>
          </template>

          <!-- 权限解释面板 -->
          <div v-show="activeTab === 'explanation'">
            <a-spin
              :spinning="loading"
              size="large"
            >
              <div
                v-if="permitExplanation.length === 0 && !loading"
                class="empty-state"
              >
                <a-empty description="请选择用户和菜单以查看权限解释">
                  <template #image>
                    <SolutionOutlined style="font-size: 48px; color: #1890ff" />
                  </template>
                </a-empty>
              </div>

              <!-- 权限解释时间线 -->
              <div
                v-else
                class="permit-explanation"
              >
                <a-timeline mode="left">
                  <a-timeline-item
                    v-for="(item, index) in permitExplanation"
                    :key="index"
                    :color="getSourceTypeColor(item.sourceType)"
                  >
                    <template #dot>
                      <div class="timeline-dot">
                        <span class="source-icon">{{ getSourceTypeIcon(item.sourceType) }}</span>
                      </div>
                    </template>
                    
                    <div class="permit-item">
                      <div class="permit-header">
                        <a-tag
                          :color="getSourceTypeColor(item.sourceType)"
                          class="source-tag"
                        >
                          {{ getSourceTypeLabel(item.sourceType) }}
                        </a-tag>
                        <span class="source-name">{{ item.sourceName }}</span>
                      </div>
                      <div class="permit-path">
                        {{ item.path }}
                      </div>
                    </div>
                  </a-timeline-item>
                </a-timeline>
              </div>
            </a-spin>
          </div>

          <!-- 查看权限树面板 -->
          <div v-show="activeTab === 'view'">
            <a-spin
              :spinning="viewLoading"
              size="large"
            >
              <div
                v-if="userPermissionTreeData.length === 0 && !viewLoading"
                class="empty-state"
              >
                <a-empty description="请选择用户以查看权限树">
                  <template #image>
                    <SolutionOutlined style="font-size: 48px; color: #1890ff" />
                  </template>
                </a-empty>
              </div>
              
              <a-tree
                v-else-if="userPermissionTreeData.length > 0"
                :default-expand-all="true"
                :show-line="true"
                :tree-data="userPermissionTreeData"
              >
                <template #title="{ dataRef }">
                  <Icon
                    v-if="dataRef.icon"
                    :icon="dataRef.icon"
                    style="margin-right: 8px"
                  />
                  {{ dataRef.title }}
                </template>
              </a-tree>
            </a-spin>
          </div>

          <!-- 编辑权限树面板 -->
          <div v-show="activeTab === 'edit'">
            <a-spin
              :spinning="editLoading"
              size="large"
            >
              <div
                v-if="!selectedStaffValue"
                class="empty-state"
              >
                <a-empty description="请选择用户以编辑权限">
                  <template #image>
                    <SolutionOutlined style="font-size: 48px; color: #1890ff" />
                  </template>
                </a-empty>
              </div>
              
              <div
                v-else-if="completePermissionTreeData.length === 0 && !editLoading"
                class="empty-state"
              >
                <a-empty description="暂无权限数据">
                  <template #image>
                    <SolutionOutlined style="font-size: 48px; color: #1890ff" />
                  </template>
                </a-empty>
              </div>
              
              <template v-else-if="completePermissionTreeData.length > 0">
                <div class="edit-tree-header">
                  <div class="header-row">
                    <a-checkbox v-model:checked="autoSelectParents" :disabled="!permissionCheckStrictly" style="margin-right: 15px;">自动带父节点</a-checkbox>
                    <span>独立选择</span>
                    <a-switch
                      v-model:checked="permissionCheckStrictly"
                      size="small"
                      style="margin-left: 8px;"
                    />
                  </div>
                </div>
                <a-tree
                  v-model:checked-keys="userTreeCheckedKeys"
                  :default-expand-all="true"
                  :show-line="true"
                  checkable
                  :check-strictly="permissionCheckStrictly"
                  :tree-data="completePermissionTreeData"
                  @check="checkUserTreeNode"
                >
                  <template #title="{ dataRef }">
                    <Icon
                      v-if="dataRef.icon"
                      :icon="dataRef.icon"
                      style="margin-right: 8px"
                    />
                    {{ dataRef.title }}
                  </template>
                </a-tree>
              </template>
            </a-spin>
          </div>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script lang="ts" setup>
import { ReloadOutlined, SolutionOutlined, SaveOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import type { Key } from 'ant-design-vue/es/_util/type'
import type { DataNode } from 'ant-design-vue/es/vc-tree/interface'
import { computed, onMounted, ref, watch } from 'vue'

import type { UserPermitRes, SourceTypeEnum } from './types'
import { 
  SOURCE_TYPE_LABELS, 
  SOURCE_TYPE_ICONS, 
  SOURCE_TYPE_COLORS 
} from './types'

import { getUserMenuTree, getUserPermitSource } from '@/framework/apis/admin/navEdit'
import { getCompletePermissionTree } from '@/framework/apis/admin/navEdit'
import { 
  getUserPermissionTree, 
  getUserPermissionListById, 
  bindUserPermission, 
  unbindUserPermission 
} from '@/framework/apis/admin/userPermission'
import Staff from '@/framework/components/common/staff/index.vue'


// 状态管理
const loading = ref(false)
const viewLoading = ref(false)
const editLoading = ref(false)
const activeTab = ref<Key>('explanation')
const menuTreeData = ref<DataNode[]>([])
const menuTreeKey = ref(0)
const selectedStaffValue = ref<{ value: string; label: string } | null>(null)
const selectedMenuKeys = ref<string[]>([])
const permitExplanation = ref<UserPermitRes[]>([])
const userPermissionTreeData = ref<DataNode[]>([])
const completePermissionTreeData = ref<DataNode[]>([])
const userTreeCheckedKeys = ref<string[] | { checked: string[]; halfChecked: string[] }>([])
// 独立选择：默认为否（false），此时父子节点联动
const permissionCheckStrictly = ref(false)
// 是否自动选中父节点：独立选择开启时可选且默认开启，独立选择关闭时禁用且关闭
const autoSelectParents = ref(false)
// 父子关系映射：childId -> parentId
const parentMap = ref<Map<string, string | null>>(new Map())
// 子节点映射：parentId -> childIds
const childrenMap = ref<Map<string, string[]>>(new Map())

// 计算属性
const canRefresh = computed(() => {
  return selectedStaffValue.value && selectedStaffValue.value.value && selectedMenuKeys.value.length > 0
})

// 构建父子关系映射
const buildParentChildMap = (nodes: DataNode[], parentId: string | null = null) => {
  nodes.forEach(node => {
    const nodeId = String(node.key)
    parentMap.value.set(nodeId, parentId)

    if (node.children && node.children.length > 0) {
      const childIds = node.children.map(child => String(child.key))
      childrenMap.value.set(nodeId, childIds)
      buildParentChildMap(node.children as DataNode[], nodeId)
    } else {
      childrenMap.value.set(nodeId, [])
    }
  })
}

// 获取所有父节点路径
const getAllParentIds = (nodeId: string): string[] => {
  const parents: string[] = []
  let currentId: string | null = nodeId

  while (currentId !== null) {
    const parentId = parentMap.value.get(currentId)
    if (parentId !== null && parentId !== undefined) {
      parents.push(parentId)
      currentId = parentId
    } else {
      break
    }
  }

  return parents
}

// 获取所有子节点（递归）
const getAllChildIds = (nodeId: string): string[] => {
  const children = childrenMap.value.get(nodeId) || []
  const result: string[] = []
  children.forEach(childId => {
    result.push(childId)
    result.push(...getAllChildIds(childId))
  })
  return result
}

// 方法定义
const getSourceTypeLabel = (type: SourceTypeEnum): string => {
  return SOURCE_TYPE_LABELS[type] || type
}

const getSourceTypeIcon = (type: SourceTypeEnum): string => {
  return SOURCE_TYPE_ICONS[type] || '❓'
}

const getSourceTypeColor = (type: SourceTypeEnum): string => {
  return SOURCE_TYPE_COLORS[type] || '#cccccc'
}

const handleMenuSelect = (selectedKeys: any[], info: any) => {
  if (selectedKeys.length > 0 && info.selected) {
    // 保持原始数据类型（数字），不转换为字符串
    const selectedKey = selectedKeys[0]  // 直接使用数字类型
    selectedMenuKeys.value = [selectedKey]
  } else if (selectedKeys.length === 0) {
    selectedMenuKeys.value = []
    permitExplanation.value = []
  }
}

const loadMenuTree = async (customerNumber?: string) => {
  try {
    // 如果没有提供用户编号，则清空菜单树
    if (!customerNumber) {
      menuTreeData.value = []
      menuTreeKey.value += 1
      return
    }
    
    const response = await getUserMenuTree(customerNumber)
    menuTreeData.value = response.payload || []
    menuTreeKey.value += 1
  } catch (error) {
    console.error('加载用户菜单树失败:', error)
    message.error('加载用户菜单树失败')
    menuTreeData.value = []
  }
}

const loadPermitExplanation = async () => {
  if (!canRefresh.value) return
  loading.value = true
  try {
    const menuId = selectedMenuKeys.value[0]
    const customerNumber = selectedStaffValue.value?.value ?? ''
    
    const result = await getUserPermitSource(menuId, customerNumber as string)
    
    // 正确处理API返回的数据结构，取payload字段
    permitExplanation.value = result.payload || []
  } catch (error) {
    console.error('获取权限解释失败:', error)
    message.error('获取权限解释失败')
    permitExplanation.value = []
  } finally {
    loading.value = false
  }
}

const refreshPermitExplanation = () => {
  loadPermitExplanation()
}

// 新增方法：处理tab切换
const handleTabChange = (key: Key) => {
  activeTab.value = key
  const keyStr = String(key)
  if (keyStr === 'view' && selectedStaffValue.value) {
    loadUserPermissionTree()
  } else if (keyStr === 'edit' && selectedStaffValue.value) {
    loadEditUserPermissionTree()
  }
}

// 新增方法：加载用户权限树（查看）
const loadUserPermissionTree = async () => {
  if (!selectedStaffValue.value) return
  
  viewLoading.value = true
  try {
    const customerNumber = selectedStaffValue.value.value
    const result = await getUserPermissionTree(customerNumber)
    userPermissionTreeData.value = result.payload || []
  } catch (error) {
    console.error('获取用户权限树失败:', error)
    message.error('获取用户权限树失败')
    userPermissionTreeData.value = []
  } finally {
    viewLoading.value = false
  }
}

// 新增方法：加载用户权限列表（编辑）
const loadEditUserPermissionTree = async () => {
  if (!selectedStaffValue.value) return
  
  editLoading.value = true
  try {
    const customerNumber = selectedStaffValue.value.value
    
    // 并行加载完整权限树和用户已有的权限
    const [completeTreeResult, userPermissionsResult] = await Promise.all([
      getCompletePermissionTree(),
      getUserPermissionListById(customerNumber)
    ])
    
    completePermissionTreeData.value = completeTreeResult.payload || []
    userTreeCheckedKeys.value = (userPermissionsResult.payload || []).map((item: any) => item.key)
  } catch (error) {
    console.error('加载编辑权限数据失败:', error)
    message.error('加载编辑权限数据失败')
    completePermissionTreeData.value = []
    userTreeCheckedKeys.value = []
  } finally {
    editLoading.value = false
  }
}

// 新增方法：处理用户权限树节点勾选
const checkUserTreeNode = (checked: any, e: { checked: boolean, node: DataNode }) => {
  const userId = selectedStaffValue.value?.value
  if (!userId) return
  
  const attachId = String(e.node.key)

  if (e.checked) {
    // 绑定权限
    // 获取所有父节点
    const parentIds = autoSelectParents.value ? getAllParentIds(attachId) : []

    // 非独立选择模式下，需要绑定所有子节点
    const childIds = permissionCheckStrictly.value ? [] : getAllChildIds(attachId)

    // 绑定权限（包括当前节点、所有父节点和子节点）
    const nodesToBind = [attachId, ...parentIds, ...childIds]

    nodesToBind.forEach(nodeId => {
      bindUserPermission(userId, nodeId)
    })
    // 注意：使用 v-model:checked-keys 后，Tree 组件会自动更新选中状态
  } else {
    // 解绑权限
    // 非独立选择模式下，需要解绑所有子节点
    const childIds = permissionCheckStrictly.value ? [] : getAllChildIds(attachId)

    // 解绑权限（包括当前节点和所有子节点）
    const nodesToUnbind = [attachId, ...childIds]

    nodesToUnbind.forEach(nodeId => {
      unbindUserPermission(userId, nodeId)
    })
    // 注意：使用 v-model:checked-keys 后，Tree 组件会自动更新选中状态
  }
}

// 新增方法：保存用户权限
const saveUserPermissions = async () => {
  message.success('权限保存成功')
}

// 监听选中菜单变化
watch(selectedMenuKeys, (newVal) => {
  if (newVal.length > 0) {
    loadPermitExplanation()
  }
}, { deep: true })

// 监听用户选择变化
watch(selectedStaffValue, (newVal, _oldVal) => {
  // 当用户变化时，重新加载该用户的菜单树
  const customerNumber = newVal?.value ?? ''
  loadMenuTree(customerNumber)
  
  // 清空之前的菜单选择和权限解释
  selectedMenuKeys.value = []
  permitExplanation.value = []
  
  // 清空权限树相关数据
  userPermissionTreeData.value = []
  completePermissionTreeData.value = []
  userTreeCheckedKeys.value = []
  
  // 如果当前是查看或编辑tab，重新加载对应数据
  if (activeTab.value === 'view' && newVal) {
    loadUserPermissionTree()
  } else if (activeTab.value === 'edit' && newVal) {
    loadEditUserPermissionTree()
  }
}, { deep: true })



// 生命周期
onMounted(() => {
  // 初始时不加载菜单树，等待用户选择
  // 预加载完整权限树用于编辑功能
  getCompletePermissionTree().then(res => {
    completePermissionTreeData.value = res.payload || []
    // 构建权限树的父子关系映射
    buildParentChildMap(completePermissionTreeData.value)
  }).catch(error => {
    console.error('预加载完整权限树失败:', error)
  })
})

// 监听独立选择变化
watch(permissionCheckStrictly, (newVal) => {
  if (newVal) {
    // 独立选择开启：自动带父节点可选，默认开启
    autoSelectParents.value = true
  } else {
    // 独立选择关闭：自动带父节点禁用且关闭
    autoSelectParents.value = false
  }
})
</script>

<style lang="less" scoped>
.user-permit-container {
  padding: 20px;
  height: 100%;
  background-color: #f5f5f5;

  .main-content {
    height: 100%;
  }

  .selection-panel,
  .result-panel {
    height: 100%;
    :deep(.ant-card-body) {
      height: calc(100% - 56px);
      overflow-y: auto;
    }
  }

  .section-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 12px;
    color: #1d1d1d;
    padding-bottom: 8px;
    border-bottom: 2px solid #1890ff;
  }

  .menu-tree-section {
    .tree-wrapper {
      border: 1px solid #d9d9d9;
      border-radius: 4px;
      padding: 12px;
      background-color: #fff;
      max-height: calc(100vh - 350px);
      overflow-y: auto;

      :deep(.ant-tree) {
        .ant-tree-treenode {
          padding: 4px 0;
        }
        
        .menu-item {
          display: flex;
          align-items: center;
          
          :deep(.anticon) {
            font-size: 14px;
          }
        }
      }
    }
  }

  .empty-state {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    min-height: 300px;
  }

  .permit-explanation {
    padding: 20px 0;

    :deep(.ant-timeline) {
      .ant-timeline-item {
        padding-bottom: 24px;

        .ant-timeline-item-head {
          width: 24px;
          height: 24px;
          border-width: 3px;
        }

        .ant-timeline-item-content {
          top: -4px;
        }
      }
    }

    .timeline-dot {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;

      .source-icon {
        font-size: 16px;
      }
    }

    .permit-item {
      background: #fff;
      border: 1px solid #e8e8e8;
      border-radius: 6px;
      padding: 16px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.09);
      transition: all 0.3s;

      &:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transform: translateY(-2px);
      }

      .permit-header {
        display: flex;
        align-items: center;
        margin-bottom: 12px;
        gap: 8px;

        .source-tag {
          font-weight: 500;
          border-radius: 4px;
        }

        .source-name {
          font-size: 16px;
          font-weight: 600;
          color: #1d1d1d;
        }
      }

      .permit-path {
        font-size: 14px;
        line-height: 1.6;
        color: #595959;
        padding: 8px 12px;
        background-color: #fafafa;
        border-radius: 4px;
        border-left: 3px solid #1890ff;
      }
    }
  }

  .edit-tree-header {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
    padding: 8px 12px;
    background: #fafafa;
    border-radius: 4px;
  }

  .header-row {
    display: flex;
    align-items: center;
  }
}

// 响应式设计
@media (max-width: 1200px) {
  .user-permit-container {
    padding: 12px;
    
    .main-content {
      :deep(.ant-col) {
        &:first-child {
          margin-bottom: 20px;
        }
      }
    }
  }
}
</style>