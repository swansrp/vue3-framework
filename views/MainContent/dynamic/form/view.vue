<script setup lang="ts">
/**
 * 管理端 - 表单查看页面（只读模式）
 * 使用迁移后的 DynamicFormFill 组件展示只读表单数据
 */
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

// 从 URL 获取 historyId
const historyId = ref<string>('')

// 组件引用
const formRef = ref(null)

// 初始化完成回调
const handleInitComplete = (success: boolean) => {
  console.log('[FormView] 初始化完成:', success)
}

// 页面初始化
onMounted(() => {
  // 从 URL 参数获取 historyId
  historyId.value = route.query.historyId as string || ''
})
</script>

<template>
  <div class="form-view-container">
    <DynamicForm
      v-if="historyId"
      ref="formRef"
      :history-id="historyId"
      :readonly="true"
      :show-submit="false"
      :auto-init="true"
      @init:complete="handleInitComplete"
    />
    
    <div
      v-else
      class="empty-state"
    >
      <a-empty description="请通过 URL 参数传入 historyId" />
    </div>
  </div>
</template>

<style scoped lang="less">
.form-view-container {
  height: 100%;
  width: 100%;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 400px;
}
</style>
