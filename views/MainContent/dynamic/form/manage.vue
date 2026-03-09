<script setup lang="ts">
/**
 * 表单模板配置页面（系统级）
 * 用于系统管理员创建和管理动态表单模板
 */
import { FolderOutlined, FileTextOutlined } from '@ant-design/icons-vue'
import { ref } from 'vue'

import { SchemaConfigPanel } from '../../../../components/common/DynamicForm/components'

import ContentLayout from '@/framework/components/common/Content/ContentLayout.vue'
import { CommonTreePanel } from '@/framework/components/common/TreePannel'

// 当前选中的模板
const selectedTemplateId = ref<string | null>(null)
const selectedTemplateInfo = ref<any>(null)

// 树组件引用
const treeRef = ref<InstanceType<typeof CommonTreePanel> | null>(null)

// 编辑表单数据 - 由 CommonTreePanel 通过插槽传入的 formData 管理
// 这里只需要定义额外的默认字段
const defaultFormFields = {
  code: '',
  description: '',
  status: 'draft',
  sort: 0
}

// 处理模板选择
const handleTemplateSelect = (templateId: string, templateInfo: any) => {
  selectedTemplateId.value = templateId
  selectedTemplateInfo.value = templateInfo
}

// 获取状态标签文本
const getStatusText = (status: string) => {
  switch (status) {
    case 'published':
      return '已发布'
    case 'archived':
      return '已归档'
    default:
      return '草稿'
  }
}
</script>

<template>
  <div class="form-template-container">
    <ContentLayout
      :width="280"
      height="calc(100vh - 130px)"
    >
      <!-- 左侧：模板树 -->
      <template #side>
        <CommonTreePanel
          ref="treeRef"
          url-prefix="/form/schema"
          title="表单模板"
          :allow-select-parent="true"
          :default-form-data="defaultFormFields"
          @select="handleTemplateSelect"
        >
          <!-- 自定义节点图标 -->
          <template #icon="{ isLeaf }">
            <FolderOutlined v-if="!isLeaf" />
            <FileTextOutlined v-else />
          </template>

          <!-- 自定义节点标题显示 -->
          <template #title="{ node }">
            <div class="tree-node-title">
              <span>{{ node.title }}</span>
              <span
                v-if="node.data?.status || node.status"
                class="status-tag"
                :class="node.data?.status || node.status"
              >
                {{ getStatusText(node.data?.status || node.status) }}
              </span>
            </div>
          </template>

          <!-- 自定义表单 -->
          <template #form="{ formData, isEdit }">
            <a-form
              :model="formData"
              :label-col="{ span: 6 }"
              :wrapper-col="{ span: 16 }"
              layout="horizontal"
            >
              <a-form-item
                label="模板编码"
                name="code"
              >
                <a-input
                  v-model:value="formData.code"
                  placeholder="请输入模板编码（可选）"
                />
              </a-form-item>
              <a-form-item
                label="模板名称"
                name="title"
                required
              >
                <a-input
                  v-model:value="formData.title"
                  placeholder="请输入模板名称"
                />
              </a-form-item>
              <a-form-item
                label="模板描述"
                name="description"
              >
                <a-textarea
                  v-model:value="formData.description"
                  placeholder="请输入模板描述"
                  :rows="3"
                />
              </a-form-item>
              <a-form-item
                label="状态"
                name="status"
              >
                <a-select v-model:value="formData.status">
                  <a-select-option value="draft">
                    草稿
                  </a-select-option>
                  <a-select-option value="published">
                    已发布
                  </a-select-option>
                  <a-select-option value="archived">
                    已归档
                  </a-select-option>
                </a-select>
              </a-form-item>
              <a-form-item
                label="排序"
                name="sort"
              >
                <a-input-number
                  v-model:value="formData.sort"
                  :min="0"
                  style="width: 100%"
                />
              </a-form-item>
            </a-form>
          </template>
        </CommonTreePanel>
      </template>

      <!-- 右侧：模板配置面板 -->
      <template #content>
        <SchemaConfigPanel
          v-if="selectedTemplateId"
          :form-id="selectedTemplateId"
          :form-info="selectedTemplateInfo"
        />
        <div
          v-else
          class="empty-hint"
        >
          <a-empty description="请从左侧选择一个表单模板进行配置" />
        </div>
      </template>
    </ContentLayout>
  </div>
</template>

<style scoped lang="less">
.form-template-container {
  width: 100%;
  height: calc(100vh - 130px);
  padding: 10px;
  box-sizing: border-box;
}

.empty-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: #fff;
  border-radius: 8px;
}

.tree-node-title {
  display: flex;
  align-items: center;
  gap: 10px;

  > span:first-child {
    color: #262626;
    font-weight: 500;
  }

  .status-tag {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 10px;
    font-weight: 500;
    letter-spacing: 0.3px;

    &.draft {
      background: linear-gradient(135deg, #fff7e6 0%, #ffefd1 100%);
      color: #d48806;
      border: 1px solid rgba(212, 136, 6, 0.2);
    }

    &.published {
      background: linear-gradient(135deg, #f6ffed 0%, #e8f9e0 100%);
      color: #389e0d;
      border: 1px solid rgba(56, 158, 13, 0.2);
    }

    &.archived {
      background: linear-gradient(135deg, #f5f5f5 0%, #ebebeb 100%);
      color: #595959;
      border: 1px solid rgba(89, 89, 89, 0.15);
    }
  }
}
</style>
