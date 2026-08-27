<template>
  <div
    ref="pageRef"
    class="agent-config-page"
  >
    <!-- region 页头 -->
    <div class="config-header">
      <span class="config-header-left">
        <a-button
          @click="emit('back')"
        >
          ← 返回列表
        </a-button>
        <span class="config-title">Agent 配置：{{ agentCode }}</span>
        <a-tag v-if="dsName">绑定数据源：{{ dsName }}</a-tag>
        <!-- 两个并列视图（选表 / 资产编辑）自由往返；实心按钮组选中态蓝底白字，阶段编号 + 高亮让两阶段一眼可辨 -->
        <a-radio-group
          v-model:value="step"
          class="config-view-switch"
          button-style="solid"
          size="large"
        >
          <a-radio-button :value="0">
            1. 选表
          </a-radio-button>
          <a-radio-button :value="1">
            2. 资产编辑与发布
          </a-radio-button>
        </a-radio-group>
      </span>
      <a-button
        type="primary"
        :loading="publishLoading"
        @click="publish"
      >
        发布并刷新生效
      </a-button>
    </div>
    <!-- endregion -->
    <!-- 选表视图高度撑满不滚动；编辑视图内容长允许滚动 -->
    <div
      class="step-content"
      :class="{ 'step-content-scroll': step !== 0 }"
    >
      <agent-table-picker
        v-if="step === 0"
        :agent-code="agentCode"
        :ds-name="dsName"
      />
      <agent-asset-edit
        v-else
        :agent-code="agentCode"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useRouter } from 'vue-router'

import AgentAssetEdit from './AgentAssetEdit.vue'
import AgentTablePicker from './AgentTablePicker.vue'
import { validateAndPublish } from './publishValidate'

// Agent 配置整页视图（编排层）：页头发布 + 分段切换器驱动两视图（选表 / 资产编辑与发布）
const props = defineProps<{
  agentCode: string,
  dsName: string
}>()

const emit = defineEmits(['back'])

const { currentRoute } = useRouter()
const baseDomain = currentRoute.value.query
  ? currentRoute.value.query.domain ? '/' + currentRoute.value.query.domain : undefined
  : undefined

// 当前视图：0 选表 / 1 资产编辑与发布（实心按钮组切换，自由往返）
const step = ref(0)

const publishLoading = ref(false)

const publish = () => {
  publishLoading.value = true
  // 发布前预检：错误弹清单阻断、提醒确认后继续（后端 publish 同样会拦，这里是提前给管理员看清单）
  validateAndPublish(props.agentCode, baseDomain)
    .finally(() => publishLoading.value = false)
}

// ---------------- 高度链：配置页铺满视口剩余高度（父链 #app overflow visible，height:100% 不生效） ----------------
const pageRef: Ref = ref()

const updateHeight = () => {
  if (!pageRef.value) return
  const top = pageRef.value.getBoundingClientRect().top
  pageRef.value.style.height = Math.max(320, window.innerHeight - top - 8) + 'px'
}

onMounted(() => {
  updateHeight()
  window.addEventListener('resize', updateHeight)
})
onUnmounted(() => window.removeEventListener('resize', updateHeight))
</script>

<style scoped>
.agent-config-page {
  padding: 10px 24px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}
.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-shrink: 0;
}
.config-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.config-title {
  font-size: 15px;
  font-weight: 600;
}
.config-view-switch {
  margin-left: 12px;
}
.step-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.step-content-scroll {
  overflow-y: auto;
}
</style>
