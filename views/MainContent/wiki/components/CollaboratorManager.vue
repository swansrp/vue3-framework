<script setup lang="ts">
/**
 * 协作者管理组件
 */
import { CheckOutlined, CloseOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons-vue'

import type { WikiCollaborator } from '../types'

const props = withDefaults(
  defineProps<{
    /** 弹窗可见性 */
    visible: boolean
    /** 协作者列表 */
    collaborators: WikiCollaborator[]
    /** 待审批列表 */
    pendingRequests: WikiCollaborator[]
    /** 加载状态 */
    loading?: boolean
  }>(),
  {
    loading: false
  }
)

const emit = defineEmits<{
  (e: 'update:visible', visible: boolean): void
  (e: 'approve', userId: string, approved: boolean): void
  (e: 'remove', userId: string): void
  (e: 'updatePermission', userId: string, permission: string): void
}>()

const { visible, collaborators, pendingRequests, loading } = toRefs(props)

/** 关闭弹窗 */
const handleClose = () => {
  emit('update:visible', false)
}

/** 审批申请 */
const handleApprove = (userId: string, approved: boolean) => {
  emit('approve', userId, approved)
}

/** 移除协作者 */
const handleRemove = (userId: string) => {
  emit('remove', userId)
}

/** 更新权限 */
const handleUpdatePermission = (userId: string, permission: string) => {
  emit('updatePermission', userId, permission)
}

/** 获取权限标签 */
const getPermissionLabel = (permission: string) => {
  return permission === '2' ? '编辑' : '只读'
}

/** 获取权限颜色 */
const getPermissionColor = (permission: string) => {
  return permission === '2' ? 'blue' : 'default'
}

/** 权限选项 */
const permissionOptions = [
  { label: '只读', value: '1' },
  { label: '编辑', value: '2' },
]
</script>

<template>
  <a-modal
    :open="visible"
    title="协作者管理"
    :width="600"
    :footer="null"
    @cancel="handleClose"
  >
    <a-spin :spinning="loading">
      <!-- 待审批申请 -->
      <div
        v-if="pendingRequests.length > 0"
        class="section"
      >
        <h4 class="section-title">
          待审批申请 ({{ pendingRequests.length }})
        </h4>
        <div class="collaborator-list">
          <div
            v-for="item in pendingRequests"
            :key="item.userId"
            class="collaborator-item pending"
          >
            <div class="user-info">
              <a-avatar :size="32">
                <template #icon>
                  <user-outlined />
                </template>
              </a-avatar>
              <div class="user-detail">
                <span class="user-name">{{ item.userName }}</span>
                <span class="request-msg">{{ item.requestMsg || '申请协作权限' }}</span>
              </div>
            </div>
            <div class="actions">
              <a-tag :color="getPermissionColor(item.permission)">
                申请{{ getPermissionLabel(item.permission) }}权限
              </a-tag>
              <a-button
                type="primary"
                size="small"
                @click="handleApprove(item.userId, true)"
              >
                <template #icon>
                  <check-outlined />
                </template>
                通过
              </a-button>
              <a-button
                danger
                size="small"
                @click="handleApprove(item.userId, false)"
              >
                <template #icon>
                  <close-outlined />
                </template>
                拒绝
              </a-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 协作者列表 -->
      <div class="section">
        <h4 class="section-title">
          协作者 ({{ collaborators.filter(c => c.status === '1').length }})
        </h4>
        <div
          v-if="collaborators.filter(c => c.status === '1').length > 0"
          class="collaborator-list"
        >
          <div
            v-for="item in collaborators.filter(c => c.status === '1')"
            :key="item.userId"
            class="collaborator-item"
          >
            <div class="user-info">
              <a-avatar :size="32">
                <template #icon>
                  <user-outlined />
                </template>
              </a-avatar>
              <div class="user-detail">
                <span class="user-name">{{ item.userName }}</span>
                <span class="create-time">加入时间：{{ item.createAt }}</span>
              </div>
            </div>
            <div class="actions">
              <a-select
                :value="item.permission"
                size="small"
                style="width: 80px"
                :options="permissionOptions"
                @change="(val: any) => handleUpdatePermission(item.userId, val)"
              />
              <a-popconfirm
                title="确定要移除该协作者吗？"
                @confirm="handleRemove(item.userId)"
              >
                <a-button
                  danger
                  size="small"
                >
                  <template #icon>
                    <delete-outlined />
                  </template>
                </a-button>
              </a-popconfirm>
            </div>
          </div>
        </div>
        <a-empty
          v-else
          description="暂无协作者"
        />
      </div>
    </a-spin>
  </a-modal>
</template>

<style scoped lang="less">
.section {
  margin-bottom: 24px;

  &:last-child {
    margin-bottom: 0;
  }

  .section-title {
    margin-bottom: 12px;
    font-weight: 600;
    color: #262626;
    border-bottom: 1px solid #f0f0f0;
    padding-bottom: 8px;
  }
}

.collaborator-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.collaborator-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: #fafafa;
  border-radius: 6px;

  &.pending {
    background: #fff7e6;
    border: 1px solid #ffd591;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 12px;

    .user-detail {
      display: flex;
      flex-direction: column;

      .user-name {
        font-weight: 500;
        color: #262626;
      }

      .request-msg,
      .create-time {
        font-size: 12px;
        color: #8c8c8c;
      }
    }
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}
</style>
