<template>
  <a-dropdown
    :trigger="['click']"
    placement="bottomLeft"
  >
    <span
      class="vc-chip"
      :title="'点击切换变量：' + value"
    >
      <span class="vc-f">ƒ</span>
      <span class="vc-token">{{ value }}</span>
      <down-outlined class="vc-caret" />
    </span>
    <template #overlay>
      <a-menu
        class="vc-menu"
        @click="onPick"
      >
        <a-menu-item-group
          v-for="g in groups"
          :key="g.key"
          :title="g.title"
        >
          <a-menu-item
            v-for="o in g.options"
            :key="o.token"
          >
            <span class="vc-opt">
              <span class="tk">{{ o.token }}</span>
              <span class="lb">{{ o.label }}</span>
              <span
                v-if="o.subject"
                class="hh"
              >后端解析</span>
            </span>
          </a-menu-item>
        </a-menu-item-group>
      </a-menu>
    </template>
  </a-dropdown>
</template>

<script lang="ts" setup>
import { DownOutlined } from '@ant-design/icons-vue'

import {
  CONDITION_VARIABLE_GROUPS,
  loadConditionVariableGroups
} from '@/framework/utils/conditionVariableRegistry'

withDefaults(defineProps<{ value?: string }>(), { value: '' })
const emit = defineEmits<{ (e: 'update:value', v: string): void }>()

const groups = ref(CONDITION_VARIABLE_GROUPS)
onMounted(() => {
  loadConditionVariableGroups().then(g => { groups.value = g })
})

// 菜单项 key 在 antdv 里是 Key(string|number), 变量 token 恒为字符串 ⇒ 统一转字符串下发
const onPick = ({ key }: { key: string | number }) => emit('update:value', String(key))
</script>

<style lang="less" scoped>
.vc-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 8px;
  width: 100%;
  border: 1px solid var(--accent);
  border-radius: 6px;
  background: var(--accent-soft, rgba(79, 108, 247, 0.08));
  color: var(--accent);
  font-family: Consolas, monospace;
  font-size: 12px;
  cursor: pointer;
  overflow: hidden;

  .vc-f {
    font-family: Georgia, serif;
    font-style: italic;
    font-size: 11px;
    opacity: 0.75;
    flex-shrink: 0;
  }

  .vc-token {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .vc-caret {
    font-size: 10px;
    flex-shrink: 0;
  }
}

.vc-menu {
  max-height: 360px;
  overflow-y: auto;
  min-width: 320px;

  .vc-opt {
    display: flex;
    align-items: center;
    gap: 8px;

    .tk {
      font-family: Consolas, monospace;
      color: var(--accent);
    }

    .lb {
      color: var(--text-secondary, #666);
    }

    .hh {
      margin-left: auto;
      font-size: 11px;
      color: var(--text-tertiary, #999);
    }
  }
}
</style>