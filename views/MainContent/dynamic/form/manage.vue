<script setup lang="ts">
/**
 * 表单模板配置页面（系统级）
 * 用于系统管理员创建和管理动态表单模板
 */
import { FolderOutlined, FileTextOutlined } from '@ant-design/icons-vue'
import { ref } from 'vue'

import { SchemaConfigPanel } from '../../../../components/common/DynamicForm/components'

import ContentLayout from '@/framework/components/common/Content/ContentLayout.vue'
import { TreePanel } from '@/framework/components/common/Panel'

// 当前选中的模板
const selectedTemplateId = ref<string | null>(null)
const selectedTemplateInfo = ref<any>(null)

// 树组件引用
const treeRef = ref<InstanceType<typeof TreePanel> | null>(null)

// 编辑表单数据 - 由 CommonTreePanel 通过插槽传入的 formData 管理
// 这里只需要定义额外的默认字段
const defaultFormFields = {
  code: '',
  description: '',
  status: 'draft',
  sort: 0
}

// 表单校验规则
const formRules = {
  code: [
    { required: true, message: '请输入模板编码', trigger: 'blur' },
    { pattern: /^[a-z][a-z_]*$/, message: '编码必须以字母开头，只能包含小写字母和下划线', trigger: 'blur' }
  ],
  title: [
    { required: true, message: '请输入模板名称', trigger: 'blur' }
  ]
}

// 格式化编码：大写转小写，中划线转下划线
const formatCode = (value: string): string => {
  return value.toLowerCase().replace(/-/g, '_')
}

// 处理编码输入
const handleCodeInput = (formData: any, value: string) => {
  formData.code = formatCode(value)
}

// 处理模板选择
// CommonTreePanel 配置了 detailApi="/id" 后，会自动获取节点详情
// templateInfo 已包含完整的节点数据（包括 code 字段）
const handleTemplateSelect = (templateId: string, templateInfo: any) => {
  selectedTemplateId.value = templateId
  // templateInfo 已包含详情数据（通过 detailApi 自动获取）
  selectedTemplateInfo.value = templateInfo.data || templateInfo
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
        <TreePanel
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
          <template #form="{ formData, formRef }">
            <a-form
              :ref="(el: any) => { if (el) formRef = el }"
              :model="formData"
              :rules="formRules"
              :label-col="{ span: 6 }"
              :wrapper-col="{ span: 16 }"
              layout="horizontal"
            >
              <a-form-item
                label="模板编码"
                name="code"
              >
                <a-input
                  :value="formData.code"
                  placeholder="请输入模板编码（如：form_code）"
                  @input="(e: InputEvent) => handleCodeInput(formData, (e.target as HTMLInputElement).value)"
                  @change="(e: any) => handleCodeInput(formData, e.target.value)"
                />
              </a-form-item>
              <a-form-item
                label="模板名称"
                name="title"
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
        </TreePanel>
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
  background: var(--bg-elevated);
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
