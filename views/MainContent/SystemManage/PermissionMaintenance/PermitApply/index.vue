<template>
  <div class="permit-apply-container">
    <a-row
      :gutter="24"
      class="main-content"
    >
      <!-- 左侧：权限申请树 -->
      <a-col :span="8">
        <a-card
          class="selection-panel"
          title="权限申请树"
        >
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
              <template #title="{ title, waitApproveCount }">
                <span class="menu-item">
                  <span class="menu-title">{{ title }}</span>
                  <a-badge
                    v-if="waitApproveCount && waitApproveCount > 0"
                    :count="waitApproveCount"
                    :number-style="{ backgroundColor: '#ff4d4f' }"
                    class="approval-badge"
                  />
                </span>
              </template>
            </a-tree>
            <a-empty
              v-else
              description="暂无权限申请数据"
            />
          </div>
        </a-card>
      </a-col>

      <!-- 右侧：申请记录列表 -->
      <a-col :span="16">
        <a-card
          class="result-panel"
          title="申请记录"
        >
          <template #extra>
            <a-button
              :disabled="!selectedMenuKeys.length"
              type="primary"
              @click="refreshApplyRecords"
            >
              <template #icon>
                <ReloadOutlined />
              </template>
              刷新
            </a-button>
          </template>

          <Portal
            ref="portalRef"
            :advance-condition="advanceCondition"
            table-id="AcPermitApply"
            hide-add
            hide-export
            hide-refresh
            read-only
          >
            <template #action="{ record }">
              <div class="action-buttons">
                <a-button
                  v-if="record.status === '1'"
                  type="primary"
                  size="small"
                  @click="handlePass(record.id)"
                >
                  通过
                </a-button>
                <a-button
                  v-if="record.status === '1'"
                  type="primary"
                  danger
                  size="small"
                  @click="openRejectModal(record.id)"
                >
                  拒绝
                </a-button>
                <a-tag
                  v-if="record.status === '3'"
                  color="green"
                >
                  已通过
                </a-tag>
                <a-tag
                  v-else-if="record.status === '2'"
                  color="red"
                >
                  已拒绝
                </a-tag>
              </div>
            </template>
          </Portal>
        </a-card>
      </a-col>
    </a-row>

    <a-modal
      v-model:open="rejectModalVisible"
      title="填写拒绝理由"
      :confirm-loading="rejectLoading"
      @ok="confirmReject"
      @cancel="closeRejectModal"
    >
      <a-textarea
        v-model:value="rejectReason"
        :rows="4"
        placeholder="请填写拒绝原因"
        :maxlength="200"
        show-count
      />
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
import { ReloadOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import type { Key } from 'ant-design-vue/es/_util/type'
import type { DataNode } from 'ant-design-vue/es/vc-tree/interface'
import { computed, onMounted, ref } from 'vue'

import type { PermitApplyRecord } from './types'

import {
  getPermitApplyMenuTree,
  passApply,
  rejectApply
} from '@/framework/apis/admin/permitApply'
import type { ConditionListType } from '@/framework/components/common/AdvancedSearch/ConditionList/type'
import Portal from '@/framework/components/common/Portal/index.vue'
import { FILTER_TYPE } from '@/framework/components/common/Portal/type'
import { buildCondition } from '@/framework/components/common/Portal/utils'


// 状态管理
const menuTreeData = ref<DataNode[]>([])
const menuTreeKey = ref(0)
const selectedMenuKeys = ref<number[]>([])
const applyRecords = ref<PermitApplyRecord[]>([])
const rejectModalVisible = ref(false)
const rejectReason = ref('')
const rejectLoading = ref(false)
const rejectTargetId = ref<string | number | null>(null)

// Portal相关
const portalRef = ref()
const advanceCondition = computed(() => {
  const conditionList = selectedMenuKeys.value.length > 0 ? [
    buildCondition('menuId', FILTER_TYPE.EQUAL, selectedMenuKeys.value),
  ]:[
    buildCondition('status', FILTER_TYPE.EQUAL, ['1']),
  ]
  return { conditionList } as ConditionListType
})

// 方法定义
const handleMenuSelect = (selectedKeys: Key[], info: any) => {
  if (selectedKeys.length > 0 && info.selected) {
    selectedMenuKeys.value = [selectedKeys[0] as number]
  } else if (selectedKeys.length === 0) {
    selectedMenuKeys.value = []
    applyRecords.value = []
  }
}

const loadMenuTree = async () => {
  try {
    const response = await getPermitApplyMenuTree()
    menuTreeData.value = response.payload || []
    menuTreeKey.value += 1
  } catch (error) {
    console.error('加载权限申请树失败:', error)
    message.error('加载权限申请树失败')
    menuTreeData.value = []
  }
}

const refreshApplyRecords = () => {
  portalRef.value.queryData()
  loadMenuTree()
}

const handlePass = async (id: string | number) => {
  try {
    await passApply(id)
    message.success('审批通过成功')
    portalRef.value.queryData()
    await loadMenuTree()
  } catch (error) {
    console.error('审批通过失败:', error)
    message.error('审批通过失败')
  }
}

const openRejectModal = (id: string | number) => {
  rejectTargetId.value = id
  rejectReason.value = ''
  rejectModalVisible.value = true
}

const closeRejectModal = () => {
  rejectModalVisible.value = false
}

const confirmReject = async () => {
  const id = rejectTargetId.value
  const reason = rejectReason.value.trim()

  if (!id) return
  if (!reason) {
    message.warning('请填写拒绝理由')
    return
  }

  rejectLoading.value = true
  try {
    await rejectApply(id, reason)
    message.success('审批拒绝成功')
    rejectModalVisible.value = false
    portalRef.value.queryData()
    await loadMenuTree()
  } catch (error) {
    console.error('审批拒绝失败:', error)
    message.error('审批拒绝失败')
  } finally {
    rejectLoading.value = false
  }
}

// 生命周期
onMounted(() => {
  loadMenuTree()
})
</script>

<style lang="less" scoped>
.permit-apply-container {
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

  .tree-wrapper {
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    padding: 12px;
    background-color: #fff;
    max-height: calc(100vh - 200px);
    overflow-y: auto;

    :deep(.ant-tree) {
      .ant-tree-treenode {
        padding: 4px 0;
      }

      .menu-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;

        .menu-title {
          flex: 1;
          margin-right: 8px;
        }

        .approval-badge {
          flex-shrink: 0;
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

  .action-buttons {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: center;
    width: 100%;
  }
}

// 响应式设计
@media (max-width: 1200px) {
  .permit-apply-container {
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
