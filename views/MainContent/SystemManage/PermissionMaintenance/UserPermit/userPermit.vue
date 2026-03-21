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
                tab="查看个人权限树"
              />
              <a-tab-pane
                key="edit"
                tab="编辑个人权限树"
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
                <BindTree
                  v-model:checked-keys="userTreeCheckedKeys"
                  :tree-data="completePermissionTreeData"
                  :entity-ids="selectedStaffValue ? [selectedStaffValue.value] : []"
                  :bind-api="bindUserPermission"
                  :unbind-api="unbindUserPermission"
                />
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
import { BindTree } from '@/framework/components/common/Panel'
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

// 计算属性
const canRefresh = computed(() => {
  return selectedStaffValue.value && selectedStaffValue.value.value && selectedMenuKeys.value.length > 0
})

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
  }).catch(error => {
    console.error('预加载完整权限树失败:', error)
  })
})
</script>

<style lang="less" scoped>
.user-permit-container {
  padding: 20px;
  height: calc(100vh - 104px); /* 顶部header 60px + history-tab 36px + padding 8px */
  background-color: #f5f5f5;
  overflow: hidden;

  .main-content {
    height: 100%;

    :deep(.ant-row) {
      height: 100%;
    }

    :deep(.ant-col) {
      height: 100%;
    }
  }

  .selection-panel,
  .result-panel {
    height: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    :deep(.ant-card) {
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    :deep(.ant-card-body) {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      min-height: 0;
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
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;

    .tree-wrapper {
      flex: 1;
      border: 1px solid #d9d9d9;
      border-radius: 4px;
      padding: 12px;
      background-color: #fff;
      overflow-y: auto;
      min-height: 0;

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
    flex: 1;
    min-height: 0;
  }

  // 右侧面板内容区域需要独立滚动
  .result-panel {
    :deep(.ant-card-head) {
      flex-shrink: 0;
    }

    // 每个 tab 内容区域
    > :deep(.ant-card-body) > div {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;

      > .ant-spin-nested-loading {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
        overflow: hidden;

        > .ant-spin-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
          overflow: hidden;
        }
      }

      > .ant-tree {
        flex: 1;
        overflow-y: auto;
        min-height: 0;
      }

      > .bind-tree-container {
        flex: 1;
        min-height: 0;
      }
    }
  }

  .permit-explanation {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
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
}

:deep(.ant-tabs) {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

:deep(.ant-tabs-content-holder) {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

:deep(.ant-tabs-tabpane) {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

:deep(.bind-tree-container) {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
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