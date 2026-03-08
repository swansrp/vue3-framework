<script setup lang="ts">
import { onMounted } from 'vue'

import { CommonTreePanel } from '@/framework/components/common/TreePannel'


interface Props {
  /** 是否只读模式 */
  readonly?: boolean
}

withDefaults(defineProps<Props>(), {
  readonly: false
})

const emit = defineEmits<{
  (e: 'select', productId: string, productInfo: any): void
  (e: 'refresh'): void
}>()

// 处理选择
const handleSelect = (nodeId: string, nodeInfo: any) => {
  emit('select', nodeId, nodeInfo)
}

// 处理刷新
const handleRefresh = () => {
  emit('refresh')
}

// 初始化
onMounted(() => {
})
</script>

<template>
  <CommonTreePanel
    url-prefix="/schema/production"
    title="产品列表"
    :readonly="readonly"
    @select="handleSelect"
    @refresh="handleRefresh"
  >
    <!-- 自定义节点显示：显示产品名称 + 待审批数量徽章 -->
    <template #title="{ node, highlightText }">
      <div class="product-tree-node">
        <span
          class="product-title"
          v-html="highlightText(node.title)"
        ></span>
      </div>
    </template>
  </CommonTreePanel>
</template>

<style scoped lang="less">
.product-tree-node {
  display: inline-block;
  width: 100%;
  line-height: 22px;
  vertical-align: middle;

  .product-title {
    display: inline;
    line-height: 22px;
    vertical-align: baseline;
  }

  .review-badge {
    display: inline-block;
    vertical-align: baseline;
    margin-left: 8px;
    :deep(.ant-badge-count) {
      font-size: 12px;
      height: 18px;
      line-height: 18px;
      min-width: 18px;
      padding: 0 4px;
      box-shadow: 0 0 0 1px #fff;
    }
  }
}
</style>
