<template>
  <div class="permit-apply-container">
    <a-row :gutter="24" class="main-content">
      <!-- 左侧：权限申请树 -->
      <a-col :span="8">
        <a-card class="selection-panel" title="权限申请树">
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
            <a-empty v-else description="暂无权限申请数据" />
          </div>
        </a-card>
      </a-col>

      <!-- 右侧：申请记录列表 -->
      <a-col :span="16">
        <a-card class="result-panel" title="申请记录">
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

          <a-spin :spinning="loading" size="large">
            <div v-if="applyRecords.length === 0 && !loading" class="empty-state">
              <a-empty description="请选择菜单查看申请记录">
                <template #image>
                  <SolutionOutlined style="font-size: 48px; color: #1890ff" />
                </template>
              </a-empty>
            </div>

            <div v-else>
              <Portal
                ref="portalRef"
                :advance-condition="advanceCondition"
                table-id="permitApplyRecords"
              >
                <template #action="{ record }">
                  <div class="action-buttons">
                    <a-button
                      v-if="record.status === 'pending'"
                      type="primary"
                      size="small"
                      @click="handlePass(record.id)"
                    >
                      通过
                    </a-button>
                    <a-button
                      v-if="record.status === 'pending'"
                      type="primary"
                      danger
                      size="small"
                      @click="handleReject(record.id)"
                    >
                      拒绝
                    </a-button>
                    <a-tag v-if="record.status === 'approved'" color="green">
                      已通过
                    </a-tag>
                    <a-tag v-else-if="record.status === 'rejected'" color="red">
                      已拒绝
                    </a-tag>
                    <a-tag v-else color="orange"> 待审批 </a-tag>
                  </div>
                </template>
              </Portal>
            </div>
          </a-spin>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script lang="ts" setup>
import { ReloadOutlined, SolutionOutlined } from "@ant-design/icons-vue";
import { message } from "ant-design-vue";
import type { Key } from "ant-design-vue/es/_util/type";
import { computed, onMounted, ref } from "vue";
import type { DataNode } from "ant-design-vue/es/vc-tree/interface";

import {
  getPermitApplyMenuTree,
  passApply,
  rejectApply,
  getApplyRecordsByMenuId,
} from "@/framework/apis/admin/permitApply";
import Portal from "@/framework/components/common/Portal/index.vue";
import type { ConditionListType } from "@/framework/components/common/AdvancedSearch/ConditionList/type";
import { FILTER_TYPE } from "@/framework/components/common/Portal/type";
import { buildCondition } from "@/framework/components/common/Portal/utils";

import type { PermitApplyRecord } from "./types";

// 状态管理
const loading = ref(false);
const menuTreeData = ref<DataNode[]>([]);
const menuTreeKey = ref(0);
const selectedMenuKeys = ref<number[]>([]);
const applyRecords = ref<PermitApplyRecord[]>([]);

// Portal相关
const portalRef = ref();
const tableColumns = ref([
  {
    title: "申请人",
    dataIndex: "applicantName",
    key: "applicantName",
    width: 120,
  },
  {
    title: "申请理由",
    dataIndex: "applyReason",
    key: "applyReason",
    ellipsis: true,
  },
  {
    title: "申请时间",
    dataIndex: "applyTime",
    key: "applyTime",
    width: 180,
  },
  {
    title: "状态",
    dataIndex: "status",
    key: "status",
    width: 100,
    slots: { customRender: "status" },
  },
  {
    title: "操作",
    key: "action",
    width: 150,
    fixed: "right",
    slots: { customRender: "action" },
  },
]);

const advanceCondition = computed(() => {
  const conditionList = [
    buildCondition("applicantName", FILTER_TYPE.LIKE, [""]),
    buildCondition("applyTime", FILTER_TYPE.BETWEEN, []),
    buildCondition("status", FILTER_TYPE.EQUAL, [""]),
  ];
  return { conditionList } as ConditionListType;
});

// 计算属性
const canLoadRecords = computed(() => {
  return selectedMenuKeys.value.length > 0;
});

// 方法定义
const handleMenuSelect = (selectedKeys: Key[], info: any) => {
  if (selectedKeys.length > 0 && info.selected) {
    selectedMenuKeys.value = [selectedKeys[0] as number];
    loadApplyRecords();
  } else if (selectedKeys.length === 0) {
    selectedMenuKeys.value = [];
    applyRecords.value = [];
  }
};

const loadMenuTree = async () => {
  try {
    const response = await getPermitApplyMenuTree();
    menuTreeData.value = response.payload || [];
    menuTreeKey.value += 1;
  } catch (error) {
    console.error("加载权限申请树失败:", error);
    message.error("加载权限申请树失败");
    menuTreeData.value = [];
  }
};

const loadApplyRecords = async () => {
  if (!canLoadRecords.value) return;

  loading.value = true;
  try {
    const menuId = selectedMenuKeys.value[0];
    const response = await getApplyRecordsByMenuId(menuId);
    applyRecords.value = response.payload || [];
  } catch (error) {
    console.error("获取申请记录失败:", error);
    message.error("获取申请记录失败");
    applyRecords.value = [];
  } finally {
    loading.value = false;
  }
};

const refreshApplyRecords = () => {
  loadApplyRecords();
};

const handlePass = async (id: string | number) => {
  try {
    await passApply(id);
    message.success("审批通过成功");
    loadApplyRecords();
  } catch (error) {
    console.error("审批通过失败:", error);
    message.error("审批通过失败");
  }
};

const handleReject = async (id: string | number) => {
  try {
    await rejectApply(id);
    message.success("审批拒绝成功");
    loadApplyRecords();
  } catch (error) {
    console.error("审批拒绝失败:", error);
    message.error("审批拒绝失败");
  }
};

// 生命周期
onMounted(() => {
  loadMenuTree();
});
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
