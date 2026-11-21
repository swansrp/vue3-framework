<template>
  <div class="cvi">
    <div
      class="cvi-row"
      :class="{ 'is-warn': preview?.warn }"
    >
      <a-input
        :value="value"
        :placeholder="placeholder"
        :size="size"
        :disabled="disabled"
        allow-clear
        class="cvi-input"
        :title="preview?.text || undefined"
        @change="onInput"
      />
      <a-dropdown :trigger="['click']">
        <a-button
          :size="size"
          :disabled="disabled"
          class="cvi-trigger"
          title="插入动态变量（只能选，不能手造）"
        >
          变量
          <down-outlined class="cvi-caret" />
        </a-button>
        <template #overlay>
          <a-menu
            class="cvi-menu"
            @click="onPick"
          >
            <a-menu-item-group
              v-for="group in groups"
              :key="group.key"
              :title="group.title"
            >
              <a-menu-item
                v-for="opt in group.options"
                :key="opt.token"
              >
                <div class="cvi-opt">
                  <span class="cvi-opt-label">{{ opt.label }}</span>
                  <span class="cvi-opt-token">{{ opt.token }}</span>
                  <span class="cvi-opt-hint">{{ opt.hint }}</span>
                </div>
              </a-menu-item>
            </a-menu-item-group>
          </a-menu>
        </template>
      </a-dropdown>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { DownOutlined } from '@ant-design/icons-vue'

import { resolveDynamicVariable } from '@/framework/utils/common'
import {
  CONDITION_VARIABLE_GROUPS,
  findVariable,
  isRegisteredVariable,
  loadConditionVariableGroups
} from '@/framework/utils/conditionVariableRegistry'

const props = withDefaults(
  defineProps<{
    value?: string
    placeholder?: string
    size?: 'small' | 'middle' | 'large'
    disabled?: boolean
  }>(),
  {
    value: '',
    placeholder: '输入值，或点右侧「变量」选择',
    size: 'middle',
    disabled: false
  }
)
const emit = defineEmits<{ (e: 'update:value', v: string): void }>()

// 选项唯一正源 = 后端清单：首屏用本地兜底表占位，挂载后拉后端覆盖（后端加 token 自动可见）
const groups = ref(CONDITION_VARIABLE_GROUPS)
onMounted(() => {
  loadConditionVariableGroups().then(g => { groups.value = g })
})

const onInput = (e: any) => emit('update:value', e?.target?.value ?? '')
const onPick = ({ key }: { key: string }) => emit('update:value', key)

// 回显提示：时间/now 变量给实时预览；主体变量标注后端解析；未登记的 ${} 给警告
const preview = computed(() => {
  const v = (props.value || '').trim()
  if (!v) return null
  const isForm = v.startsWith('${') && v.endsWith('}')
  if (!isForm) return null

  const registered = findVariable(v)
  if (registered?.subject) {
    return { text: `${registered.label}：由后端按当前登录人解析`, subject: true, warn: false }
  }
  if (isRegisteredVariable(v) || v.startsWith('${now:')) {
    const resolved = resolveDynamicVariable(v)
    if (resolved && resolved !== v) {
      return { text: `当前解析为：${resolved}`, subject: false, warn: false }
    }
    // now:pattern 非法时前端原样返回，提示交后端校验
    return { text: '格式变量，保存时由后端校验 pattern 合法性', subject: false, warn: false }
  }
  return { text: '未登记的变量，保存将被后端拦截，请从「变量」下拉选择', subject: false, warn: true }
})
</script>

<style lang="less" scoped>
.cvi {
  width: 100%;

  .cvi-row {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .cvi-input {
    flex: 1;
    min-width: 0;
  }

  .cvi-trigger {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .cvi-caret {
    font-size: 10px;
  }

  // 变量解析/警告文案不再占第二行（会撑高表单行）：悬停输入框 title 提示，
  // 未登记变量额外给橙色描边预警
  .cvi-row.is-warn .cvi-input {
    border-color: #d46b08;

    &:focus {
      border-color: #d46b08;
      box-shadow: 0 0 0 2px rgba(212, 107, 8, 0.1);
    }
  }
}

.cvi-menu {
  max-height: 360px;
  overflow-y: auto;
  min-width: 320px;

  .cvi-opt {
    display: flex;
    align-items: center;
    gap: 8px;

    .cvi-opt-label {
      font-weight: 500;
      flex-shrink: 0;
    }

    .cvi-opt-token {
      font-family: Consolas, monospace;
      font-size: 12px;
      color: var(--accent);
    }

    .cvi-opt-hint {
      margin-left: auto;
      font-size: 12px;
      color: var(--text-tertiary, #999);
    }
  }
}
</style>
