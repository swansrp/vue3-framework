<template>
  <a-modal
    :open="open"
    :title="title || '设置隐藏列'"
    :width="560"
    ok-text="确定"
    cancel-text="取消"
    @update:open="(v: boolean) => emit('update:open', v)"
    @ok="onConfirm"
    @cancel="emit('update:open', false)"
  >
    <a-typography-paragraph
      type="secondary"
      style="margin-bottom: 12px"
    >
      {{ tip || '默认全部显示（√）；点一下把某列切成不显示（×）即对该主体隐藏。' }}
    </a-typography-paragraph>
    <div class="column-perm-body">
      <template
        v-for="group in groups"
        :key="group.title || '__flat__'"
      >
        <div
          v-if="group.title"
          class="column-perm-group-title"
        >
          {{ group.title }}
        </div>
        <div class="column-perm-list">
          <div
            v-for="opt in group.options"
            :key="opt.token"
            class="column-perm-row"
            @click="toggle(opt.token)"
          >
            <span :class="['column-perm-mark', isHidden(opt.token) ? 'is-hidden' : 'is-visible']">
              <CloseOutlined v-if="isHidden(opt.token)" />
              <CheckOutlined v-else />
            </span>
            <span class="column-perm-label">{{ opt.label }}</span>
            <a-typography-text
              type="secondary"
              class="column-perm-token"
            >
              {{ opt.token }}
            </a-typography-text>
            <a-tag
              :color="isHidden(opt.token) ? 'red' : 'green'"
              style="margin-left: auto"
            >
              {{ isHidden(opt.token) ? '不显示' : '显示' }}
            </a-tag>
          </div>
        </div>
      </template>
      <a-empty
        v-if="flatOptions.length === 0"
        description="暂无可配置的列"
      />
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { CheckOutlined, CloseOutlined } from '@ant-design/icons-vue'
import { computed, ref, watch } from 'vue'

/**
 * Portal 列级权限的 extra_data 编辑器（业务侧适配器，显示权限 / 透视列权限共用）
 * <p>
 * ForwardConfig 只把每个主体的 extra_data 当作不透明字符串进出，「存什么、用什么编辑器改」由各业务域实现。
 * 本组件即列权限域的实现：不透明字符串 ↔ {@code {"columns":["c:prop",…]}} 互转，形态为分组多选勾选。
 * 候选列（含 token 前缀与分组）由父级通过 extraDataEditorProps 注入，本组件不关心 token 语义。
 * </p>
 * 与 ForwardConfig 约定的通用契约：
 * - props: open、extraData、其余由 extraDataEditorProps 透传（columnOptions / title / tip）
 * - emits: update:open、update:extraData
 */
interface ColumnOption {
  // 展示名
  label: string
  // 完整 token（含前缀，如 c:amount / p:已结算 / m:total）
  token: string
  // 可选分组标题（透视列权限用于区分「透视父列 / 度量」；不传则平铺）
  group?: string
}

const props = defineProps<{
  open: boolean
  extraData: string
  columnOptions?: ColumnOption[]
  title?: string
  tip?: string
}>()

const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'update:extraData', v: string): void
}>()

// 隐藏的 token 集合（UI 上打 × 的即在此；打 √ = 显示 = 不在集合内）
const hiddenTokens = ref<string[]>([])

// 某列当前是否隐藏（决定渲染 × 还是 √）
const isHidden = (token: string) => hiddenTokens.value.includes(token)

const flatOptions = computed(() => props.columnOptions || [])

// 按 group 分组：保留首次出现顺序；无 group 时归入单个匿名组（不渲染分组标题）
const groups = computed(() => {
  const list = flatOptions.value
  if (list.length === 0) { return [] }
  const hasGroup = list.some(o => o.group)
  if (!hasGroup) { return [{ title: '', options: list }] }
  const ordered: { title: string; options: ColumnOption[] }[] = []
  const index: Record<string, number> = {}
  for (const opt of list) {
    const g = opt.group || ''
    if (index[g] === undefined) {
      index[g] = ordered.length
      ordered.push({ title: g, options: [] })
    }
    ordered[index[g]].options.push(opt)
  }
  return ordered
})

const parseColumns = (raw: string): string[] => {
  if (!raw) { return [] }
  try {
    const arr = JSON.parse(raw).columns
    return Array.isArray(arr) ? arr.filter((t: any) => typeof t === 'string') : []
  } catch {
    return []
  }
}

// 父级置 open=true 时，用当前 extraData 反填勾选后打开
watch(
  () => props.open,
  (o) => {
    if (o) { hiddenTokens.value = parseColumns(props.extraData) }
  }
)

// 点一下在「显示(√)」与「不显示(×)」间切换；切换后按候选顺序重排，序列化稳定，避免同配置反复产生 diff
const toggle = (token: string) => {
  const set = new Set(hiddenTokens.value)
  if (set.has(token)) { set.delete(token) } else { set.add(token) }
  const order = flatOptions.value.map(o => o.token)
  hiddenTokens.value = order.filter(t => set.has(t))
}

const onConfirm = () => {
  emit('update:extraData', hiddenTokens.value.length > 0 ? JSON.stringify({ columns: hiddenTokens.value }) : '')
}
</script>

<style scoped lang="less">
.column-perm-body {
  max-height: calc(100vh - 320px);
  overflow: auto;
}

.column-perm-group-title {
  font-weight: 600;
  margin: 10px 0 6px;
  &:first-child {
    margin-top: 0;
  }
}

.column-perm-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-left: 4px;
}

.column-perm-token {
  margin-left: 6px;
  font-size: 12px;
}

.column-perm-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  user-select: none;

  &:hover {
    background: var(--bg-hover, #f5f5f5);
  }
}

.column-perm-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  font-size: 14px;

  &.is-visible {
    color: #52c41a;
  }

  &.is-hidden {
    color: #f5222d;
  }
}

.column-perm-label {
  font-size: 13px;
}
</style>
