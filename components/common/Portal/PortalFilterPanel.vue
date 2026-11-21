<template>
  <div
    class="pfp"
    :class="'pfp-' + position"
  >
    <div
      v-show="expanded"
      class="pfp-body"
    >
      <div
        v-for="f in fields"
        :key="f.column"
        class="pfp-row"
      >
        <!-- 关系在添加/管理弹窗配置，使用态只在最左侧浅浅给个 ！（tooltip 标明匹配方式） -->
        <a-tooltip :title="relTitle(f)">
          <span class="pfp-rel-hint"><ExclamationCircleOutlined /></span>
        </a-tooltip>
        <span class="pfp-label">{{ f.label || f.column }}</span>
        <div class="pfp-ctl">
          <condition-value-component
            :type="f.fieldType"
            :relation="f.relation"
            :reference="f.reference"
            :width="0"
            :allow-variable="false"
            :condition-content-value="values[f.column] || []"
            @update:condition-content-value="(v) => onValue(f.column, v)"
          />
        </div>
        <a-tooltip
          v-if="customizable"
          title="从我自己的筛选项里移除"
        >
          <button
            class="pfp-del"
            @click="emit('remove-field', f.column)"
          >
            <CloseOutlined />
          </button>
        </a-tooltip>
      </div>
      <div
        v-if="customizable"
        class="pfp-add"
      >
        <!-- 添加/管理筛选项：复用配置端筛选面板编辑器（local 模式弹窗），字段+关系+默认值一体编辑 -->
        <button
          class="pfp-add-btn"
          :title="position === 'top' ? '添加筛选' : undefined"
          @click="emit('manage')"
        >
          <PlusOutlined />
          <span
            v-if="position !== 'top'"
          >添加筛选</span>
        </button>
      </div>
      <div
        v-if="fields.length === 0"
        class="pfp-empty"
      >
        还没有筛选项，点「添加筛选」挑几个常用字段
      </div>
    </div>

    <div class="pfp-foot">
      <span class="pfp-spacer"></span>
      <!-- 动作簇打包成原子：顶部模式换行时整簇一起挪，不拆散 -->
      <div class="pfp-actions">
        <a-button
          size="small"
          class="pfp-reset"
          @click="emit('reset')"
        >
          <template #icon>
            <ClearOutlined />
          </template>
          重置
        </a-button>
        <a-button
          size="small"
          type="primary"
          class="pfp-search"
          @click="emit('search')"
        >
          <template #icon>
            <SearchOutlined />
          </template>
          查询
        </a-button>
      </div>
      <!-- 默认筛选管理收进 ⋯ 菜单：低频操作不抢主操作；有本机默认时绿点提示。
           左栏模式 CSS order 提到最左（⋯ 居左、重置/查询居右）；顶部模式仍缀在动作簇尾 -->
      <a-dropdown
        :trigger="['click']"
        placement="topRight"
      >
        <button
          class="pfp-more"
          :class="{ 'has-default': hasUserDefault }"
          title="我的默认筛选"
        >
          <MoreOutlined />
        </button>
        <template #overlay>
          <a-menu @click="onDefaultMenu">
            <a-menu-item key="save">
              <template #icon>
                <BookOutlined />
              </template>
              存为我的默认
            </a-menu-item>
            <a-menu-item
              key="reset"
              :disabled="!hasUserDefault"
            >
              <template #icon>
                <RollbackOutlined />
              </template>
              恢复默认
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { BookOutlined, ClearOutlined, ExclamationCircleOutlined, MoreOutlined, PlusOutlined, RollbackOutlined, SearchOutlined } from '@ant-design/icons-vue'

import ConditionValueComponent from '@/framework/components/common/AdvancedSearch/ConditionValueComponent/index.vue'
import { FILTER_RELATION_LABELS } from '@/framework/components/common/Portal/type'

defineProps<{
  fields: Array<any>
  /** 展示副本：上层把可解析的 ${} 已换成真值，token 不进这里 */
  values: Record<string, any[]>
  expanded: boolean
  position: 'top' | 'left'
  activeCount?: number
  hasUserDefault?: boolean
  /** 允许用户自己增删筛选项（结果存本机默认） */
  customizable?: boolean
  /** 可添加的字段候选 [{value,label}] */
  availableOptions?: Array<{ value: string, label: string }>
}>()
const emit = defineEmits<{
  /** 单字段值编辑：只回传改动列，未动的列保持上层原值（token 不被展示副本冲掉） */
  'value-change': [column: string, v: any[]]
  'update:expanded': [v: boolean]
  'update:position': [v: 'top' | 'left']
  'search': []
  'reset': []
  'save-default': []
  'reset-default': []
  'add-field': [column: string, relation?: number, defaultValue?: any[]]
  'remove-field': [column: string]
  /** 打开「我的筛选项」管理弹窗（复用配置端筛选面板编辑器 local 模式） */
  'manage': []
}>()

const onValue = (column: string, v: any) => {
  emit('value-change', column, Array.isArray(v) ? v : (v === undefined || v === null || v === '' ? [] : [v]))
}
// 使用态 ！ 提示：tooltip 标明这枚筛选的匹配方式（关系在添加/管理弹窗里配置，运行态胶囊不可改）
const relTitle = (f: any) => `匹配方式：${FILTER_RELATION_LABELS[f.relation] || f.relation}`
// ⋯ 菜单：存为我的默认 / 恢复默认（无本机默认时恢复项置灰）
const onDefaultMenu = ({ key }: { key: string | number }) => {
  if (key === 'save') emit('save-default')
  if (key === 'reset') emit('reset-default')
}
</script>

<style lang="less" scoped>
.pfp {
  /* 紧凑筛选条：所有胶囊 + 操作按钮同排横铺，自动换行，不再是大空卡片 */
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
}

.pfp-spacer {
  flex: 1;
}


.pfp-body {
  /* 让胶囊直接参与外层 flex 排布 */
  display: contents;
}

.pfp-row {
  /* 单个筛选 = 一枚胶囊：标签 + 值 + hover 删除 */
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 6px 3px 10px;
  border: 1px solid var(--border, #e5e6eb);
  border-radius: 8px;
  background: var(--bg-elevated, #fff);

  .pfp-label {
    flex-shrink: 0;
    font-size: 12px;
    // 字段名加深加粗：用户反馈太浅不显眼
    color: var(--text-primary, #333);
    font-weight: 500;
    white-space: nowrap;
  }

  .pfp-ctl {
    min-width: 0;

    :deep(.cvc-root) {
      width: 150px !important;
      max-width: 220px;
      display: block !important;
    }
  }
}

.pfp-empty {
  color: var(--text-tertiary, #999);
  font-size: 12px;
}

/* 行尾删除：默认隐藏，行 hover 才浮现（触屏常显），不抢眼 */
.pfp-del {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--text-tertiary, #c0c4cc);
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s ease-out, color 0.15s ease-out, border-color 0.15s ease-out, background-color 0.15s ease-out;

  @media (hover: hover) {
    &:hover {
      color: var(--ant-error, #ff4d4f);
      border-color: var(--ant-error, #ff4d4f);
      background: var(--ant-error-bg, #fff1f0);
    }
  }

  @media (prefers-reduced-motion: no-preference) {
    &:active:not(:disabled) {
      transform: scale(0.96);
    }
  }
}

@media (hover: hover) {
  .pfp-row:hover .pfp-del {
    opacity: 1;
  }
}

@media (hover: none) {
  .pfp-del {
    opacity: 1;
  }
}

/* 添加筛选：虚线小胶囊，和真实筛选胶囊同排 */
.pfp-add {
  display: inline-flex;
  align-items: center;
}

.pfp-add-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 28px;
  padding: 0 10px;
  border: 1px dashed var(--border-strong, #d9d9d9);
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary, #666);
  font-size: 12px;
  cursor: pointer;
  transition: color 0.15s ease-out, border-color 0.15s ease-out, background-color 0.15s ease-out;

  @media (hover: hover) {
    &:hover {
      color: var(--accent);
      border-color: var(--accent);
      background: var(--accent-soft, rgba(22, 119, 255, 0.06));
    }
  }

  @media (prefers-reduced-motion: no-preference) {
    &:active:not(:disabled) {
      transform: scale(0.96);
    }
  }
}

.pfp-foot {
  /* 操作按钮并入同一筛选条 */
  display: contents;
}

/* 动作簇原子化：顶部模式 chip 换行时整簇一起挪行，不把重置/查询拆到两行 */
.pfp-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

/* 使用态关系提示：！ 圆圈放行首、浅浅显示（tooltip 标明匹配方式），hover 点亮 */
.pfp-rel-hint {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  color: var(--text-quaternary, #c0c4cc);
  opacity: 0.75;
  font-size: 12px;
  cursor: help;
  transition: color 0.15s ease-out, opacity 0.15s ease-out;

  &:hover {
    color: var(--accent);
    opacity: 1;
  }
}

/* ⋯ 默认筛选管理：低频操作收纳，有本机默认时右上绿点提示（与配置端「已配置」绿点同语言） */
.pfp-more {
  position: relative;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  padding: 0;
  border: 1px solid var(--border, #e5e6eb);
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary, #666);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s ease-out, border-color 0.15s ease-out, background-color 0.15s ease-out;

  @media (hover: hover) {
    &:hover {
      color: var(--accent);
      border-color: var(--accent);
      background: var(--accent-soft, rgba(22, 119, 255, 0.06));
    }
  }

  @media (prefers-reduced-motion: no-preference) {
    &:active:not(:disabled) {
      transform: scale(0.96);
    }
  }

  &.has-default::after {
    content: '';
    position: absolute;
    top: -3px;
    right: -3px;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--ant-success, #52c41a);
    border: 1.5px solid var(--bg-elevated, #fff);
  }
}

// 左侧模式：标准侧栏结构 —— 顶到头、胶囊区滚动、操作按钮钉底部；永不居中/出屏
.pfp-left {
  flex: 1;
  min-height: 0;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;

  .pfp-body {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  .pfp-row {
    width: 100%;
    // 左栏轻量化：胶囊透明底+淡边，聚焦时点亮（避免满屏白块压在渐变底上）
    background: transparent;
    border-color: var(--border-subtle, #f0f0f0);
    transition: border-color 0.15s ease-out, background-color 0.15s ease-out;

    @media (hover: hover) {
      &:hover {
        background: var(--bg-hover, #f7f8fa);
        border-color: var(--border-hover, #e0e0e0);
      }
    }

    &:focus-within {
      background: var(--bg-elevated, #fff);
      border-color: var(--accent);
    }

    .pfp-ctl {
      flex: 1;

      :deep(.cvc-root) {
        width: 100% !important;
        max-width: none;
      }
    }
  }

  // 左栏添加筛选：通栏虚线条（侧栏经典 add 供affordance），替代左上小胶囊
  .pfp-add {
    align-self: stretch;
    flex-shrink: 0;
  }

  .pfp-add-btn {
    width: 100%;
  }

  .pfp-foot {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    padding-top: 8px;
    border-top: 1px solid var(--border-subtle, #f0f0f0);
    // 左栏：⋯ 居左、重置/查询居右
    justify-content: space-between;
  }

  .pfp-more {
    order: -1;
  }

  // 左栏查询按钮不拉伸（用户否决 flex:1 长条），保持紧凑自然宽
  .pfp-spacer {
    display: none;
  }
}
</style>