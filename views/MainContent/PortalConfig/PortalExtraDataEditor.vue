<template>
  <PortalAdvancedSearchModal
    :advanced-condition="state"
    @confirm="onConfirm"
  />
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'

import PortalAdvancedSearchModal from '@/framework/components/common/Portal/modal/PortalAdvancedSearchModal.vue'

/**
 * Portal 场景的 extra_data 编辑器（业务侧适配器）
 * <p>
 * ForwardConfig 是通用组件，只把每个主体的 extra_data 当作不透明字符串进出；
 * 「extra_data 里到底存什么、用什么编辑器改」由各业务域自己实现。本组件即 Portal 域的实现：
 * 把不透明字符串 ↔ 高级筛选的 { condition } 结构互转，并驱动 PortalAdvancedSearchModal。
 * </p>
 * 与 ForwardConfig 约定的通用契约：
 * - props: open（是否打开）、extraData（当前不透明值）、其余由 extraDataEditorProps 透传（此处为 columns）
 * - emits: update:open、update:extraData
 */
const props = defineProps<{
  open: boolean
  extraData: string
  columns?: any[]
}>()

const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'update:extraData', v: string): void
}>()

const state = reactive<{ show: boolean; columnArray: any[]; condition: any; okText: string }>({
  show: false,
  columnArray: [],
  condition: undefined,
  // 权限条件配置场景：把高级筛选的「查询」按钮复写为「确定」
  okText: '确定'
})

const parseCondition = (raw: string) => {
  if (!raw) return undefined
  try {
    return JSON.parse(raw).condition ?? undefined
  } catch {
    return undefined
  }
}

// 父级置 open=true 时，用当前 extraData 反填编辑器后打开
watch(
  () => props.open,
  (o) => {
    if (o) {
      state.columnArray = props.columns || []
      state.condition = parseCondition(props.extraData)
      state.show = true
    } else {
      state.show = false
    }
  }
)

// 弹窗内部（取消/关闭抽屉）会把 show 置 false，这里同步回父级，避免 ForwardConfig 的 open 卡在 true
watch(
  () => state.show,
  (s) => {
    if (!s) emit('update:open', false)
  }
)

const onConfirm = (condition: any) => {
  emit('update:extraData', condition ? JSON.stringify({ condition }) : '')
  state.show = false
}
</script>
