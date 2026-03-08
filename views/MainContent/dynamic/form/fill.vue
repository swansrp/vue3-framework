<script setup lang="ts">
/**
 * 动态表单填写页面
 * 支持三种模式：
 * 1. 新增模式：只有 formId（从 URL 或 props 获取），需手动点击按钮创建记录
 * 2. 编辑模式：有 historyId（从 URL 或 props 获取），可编辑
 * 3. 查看模式：有 historyId + readonly 参数，只读
 * 
 * 参数来源：
 * - URL 参数：?formId=xxx 或 ?historyId=xxx&readonly=true
 * - Props 传入：作为组件使用时通过 props 传入
 */
import { message } from 'ant-design-vue'
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// 参数状态
const formId = ref<string>('')
const historyId = ref<string>('')
const modeValue = ref<'edit' | 'view'>('edit') // 使用字符串类型

// 计算是否只读
const isReadonly = computed(() => modeValue.value === 'view')

// 新增模式：是否已创建记录
const isRecordCreated = ref(false)
// 创建中状态
const isCreating = ref(false)

// 组件引用
const formRef = ref()

// 页面模式
const pageMode = computed(() => {
  // 新增模式下，只有点击创建按钮后才进入表单
  if (formId.value && !historyId.value) {
    return isRecordCreated.value ? 'create' : 'prepare'
  }
  if (historyId.value) {
    return isReadonly.value ? 'view' : 'edit'
  }
  return 'empty'
})

// 模式标题
const modeTitle = computed(() => {
  switch (pageMode.value) {
    case 'prepare':
      return '新增表单'
    case 'create':
      return '新增表单'
    case 'edit':
      return '编辑表单'
    case 'view':
      return '查看表单'
    default:
      return '表单填写'
  }
})

// 从 URL 解析参数
const parseUrlParams = () => {
  const query = route.query
  
  // 解析 formId
  if (query.formId) {
    formId.value = query.formId as string
  }
  
  // 解析 historyId
  if (query.historyId) {
    historyId.value = query.historyId as string
  }
  
  // 解析 readonly 参数
  if (query.readonly === 'true' || query.readonly === '1') {
    modeValue.value = 'view'
  }
}

// 创建新记录
const handleCreateRecord = async () => {
  if (!formId.value) {
    message.warning('请输入表单模板ID')
    return
  }
  
  isCreating.value = true
  try {
    // 标记已创建，触发 DynamicForm 组件渲染
    isRecordCreated.value = true
  } finally {
    isCreating.value = false
  }
}

// 初始化完成回调
const handleInitComplete = (success: boolean) => {
  console.log('[FormFill] 初始化完成:', success, '模式:', pageMode.value)
  if (success) {
    message.success(`${modeTitle.value}加载成功`)
  }
}

// 提交成功回调
const handleSubmitted = (submittedHistoryId: string) => {
  console.log('[FormFill] 提交成功:', submittedHistoryId)
  message.success('提交成功')
}

// 保存成功回调
const handleSaved = () => {
  console.log('[FormFill] 保存成功')
}

// 手动触发保存
const handleManualSave = async () => {
  if (formRef.value) {
    await formRef.value.handleSaveAll()
  }
}

// 手动触发提交
const handleManualSubmit = async () => {
  if (formRef.value) {
    await formRef.value.handleSubmit()
  }
}

// 应用参数设置
const applyParams = () => {
  // 重置创建状态
  isRecordCreated.value = false
  
  // 更新 URL（不刷新页面）
  const query: Record<string, string> = {}
  if (formId.value) query.formId = formId.value
  if (historyId.value) query.historyId = historyId.value
  if (modeValue.value === 'view') query.readonly = 'true'
  
  router.replace({ query })
}

// 监听 historyId 变化（新增模式创建成功后会设置 historyId）
watch(historyId, (newVal) => {
  if (newVal && pageMode.value === 'create') {
    // 新增成功后，更新 URL
    router.replace({ query: { historyId: newVal } })
  }
})

// 页面初始化
onMounted(() => {
  parseUrlParams()
})
</script>

<template>
  <div class="form-fill-container">
    <!-- 控制面板（调试/测试用，生产环境可隐藏） -->
    <div class="control-panel">
      <a-card
        :title="`${modeTitle} - 控制面板`"
        size="small"
      >
        <a-space
          direction="vertical"
          style="width: 100%;"
        >
          <!-- 参数输入 -->
          <a-row :gutter="16">
            <a-col :span="8">
              <a-form-item label="表单模板ID">
                <a-input
                  v-model:value="formId"
                  placeholder="输入 formId（新增模式）"
                  allow-clear
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="填报记录ID">
                <a-input
                  v-model:value="historyId"
                  placeholder="输入 historyId（编辑/查看）"
                  allow-clear
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="模式">
                <a-select v-model:value="modeValue">
                  <a-select-option value="edit">
                    编辑模式
                  </a-select-option>
                  <a-select-option value="view">
                    只读模式
                  </a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
          </a-row>

          <!-- 操作按钮 -->
          <a-row :gutter="16">
            <a-col :span="12">
              <a-space>
                <a-button
                  type="primary"
                  @click="applyParams"
                >
                  应用参数
                </a-button>
                <a-button @click="handleManualSave">
                  手动保存
                </a-button>
                <a-button @click="handleManualSubmit">
                  手动提交
                </a-button>
              </a-space>
            </a-col>
            <a-col :span="12">
              <a-tag :color="pageMode === 'prepare' ? 'cyan' : pageMode === 'create' ? 'green' : pageMode === 'edit' ? 'blue' : 'orange'">
                当前模式: {{ modeTitle }}
              </a-tag>
            </a-col>
          </a-row>

          <a-divider style="margin: 12px 0;" />

          <!-- 使用说明 -->
          <div class="usage-tips">
            <h4>使用说明：</h4>
            <ol>
              <li><strong>新增模式：</strong>输入 formId 后点击"应用参数"，再点击"开始填写"按钮创建记录</li>
              <li><strong>编辑模式：</strong>输入 historyId，可编辑已有记录</li>
              <li><strong>查看模式：</strong>输入 historyId + 选择只读模式，只能查看不能编辑</li>
              <li><strong>URL 参数：</strong>?formId=xxx 或 ?historyId=xxx&amp;readonly=true</li>
            </ol>
          </div>
        </a-space>
      </a-card>
    </div>

    <!-- 表单组件 -->
    <div class="form-content">
      <!-- 新增准备模式：显示创建按钮 -->
      <div
        v-if="pageMode === 'prepare'"
        class="prepare-state"
      >
        <a-card :style="{ maxWidth: '600px', margin: '0 auto' }">
          <a-result
            title="准备创建新表单"
            sub-title="点击下方按钮开始填写新表单，系统将自动创建填报记录"
          >
            <template #icon>
              <span style="font-size: 72px;">📋</span>
            </template>
            <template #extra>
              <a-space
                direction="vertical"
                :size="16"
              >
                <a-descriptions
                  :column="1"
                  bordered
                  size="small"
                >
                  <a-descriptions-item label="表单模板ID">
                    {{ formId }}
                  </a-descriptions-item>
                </a-descriptions>
                <a-button
                  type="primary"
                  size="large"
                  :loading="isCreating"
                  @click="handleCreateRecord"
                >
                  开始填写
                </a-button>
              </a-space>
            </template>
          </a-result>
        </a-card>
      </div>

      <!-- 新增模式 -->
      <DynamicForm
        v-else-if="pageMode === 'create'"
        ref="formRef"
        :form-id="formId"
        :readonly="false"
        :show-submit="true"
        :auto-init="true"
        @submitted="handleSubmitted"
        @saved="handleSaved"
        @init:complete="handleInitComplete"
      />

      <!-- 编辑模式 -->
      <DynamicForm
        v-else-if="pageMode === 'edit'"
        ref="formRef"
        :history-id="historyId"
        :readonly="false"
        :show-submit="true"
        :auto-init="true"
        @submitted="handleSubmitted"
        @saved="handleSaved"
        @init:complete="handleInitComplete"
      />

      <!-- 查看模式 -->
      <DynamicForm
        v-else-if="pageMode === 'view'"
        ref="formRef"
        :history-id="historyId"
        :readonly="true"
        :show-submit="false"
        :auto-init="true"
        @init:complete="handleInitComplete"
      />

      <!-- 空状态 -->
      <div
        v-else
        class="empty-state"
      >
        <a-empty description="请输入表单模板ID（formId）或填报记录ID（historyId）">
          <template #image>
            <span style="font-size: 64px;">📝</span>
          </template>
        </a-empty>
        <div class="quick-actions">
          <a-space>
            <a-button
              type="primary"
              @click="formId = 'test-form-id'"
            >
              测试新增
            </a-button>
            <a-button @click="historyId = 'test-history-id'">
              测试编辑
            </a-button>
            <a-button @click="historyId = 'test-history-id'; modeValue = 'view'">
              测试查看
            </a-button>
          </a-space>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.form-fill-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f0f2f5;
}

.control-panel {
  padding: 16px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  flex-shrink: 0;

  .usage-tips {
    h4 {
      margin: 0 0 8px 0;
      font-size: 14px;
      color: #262626;
    }

    ol {
      margin: 0;
      padding-left: 20px;
      font-size: 12px;
      color: #595959;

      li {
        margin-bottom: 4px;

        strong {
          color: #1890ff;
        }
      }
    }
  }
}

.form-content {
  flex: 1;
  overflow: hidden;
}

.prepare-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 400px;
  padding: 24px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 400px;

  .quick-actions {
    margin-top: 24px;
  }
}
</style>
