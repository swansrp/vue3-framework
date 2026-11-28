<template>
  <div class="history-tags">
    <div class="tab-scroll-wrap">
      <div class="tab-list">
        <div
          v-for="item in tabs"
          :key="getTabKey(item)"
          class="tab-item"
          :class="{ 'tab-active': getTabKey(item) === activeKey }"
          @click="changeActivateKey(getTabKey(item))"
        >
          <span class="tab-title">{{ item.title }}</span>
          <button
            v-if="tabs.length > 1"
            class="tab-remove"
            @click.stop="removeTab(getTabKey(item))"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import router from '@/framework/router'
import pinia from '@/framework/store'
import { useNavigationStore } from '@/framework/store/navigation'

const navigationStore = useNavigationStore(pinia)

// 响应式获取标签数据
const tabs = computed(() => navigationStore.historyTabs)

// activeKey 双向绑定
const activeKey = computed({
  get: () => navigationStore.activeTabKey,
  set: (value: string) => {
    if (value && value !== navigationStore.activeTabKey) {
      changeActivateKey(value)
    }
  }
})

// 安全获取tab唯一标识
const getTabKey = (item: { key?: any; id?: any }): string => {
  return String(item.key ?? item.id)
}

// 删除tab
const removeTab = (targetKey: string | number) => {
  const stringKey = String(targetKey)
  const nextKey = navigationStore.removeHistoryTab(stringKey)

  if (!nextKey) {
    router.push('/')
  } else if (activeKey.value === stringKey) {
    changeActivateKey(nextKey)
  }
}

// 切换标签
const changeActivateKey = (key: string | number) => {
  console.log('[HistoryTab] click key:', key, 'tabs:', tabs.value.length)
  const targetTab = navigationStore.historyTabs.find(tab => tab.key === String(key))
  if (!targetTab) return

  router.push({
    path: targetTab.fullPath,
    ...(targetTab.query ? { query: targetTab.query as any } : {})
  })
}
</script>

<style>
/* ---- 容器（U125：融入海蓝工作台——透明底＋细分隔线，页签从箭头异形改胶囊族，
     与统一侧栏条目/日历选中格同一「选中＝海蓝实底(渐变)」语言） ---- */
.history-tags {
  height: 34px;
  padding: 0 16px;
  box-sizing: border-box;
  background: transparent;
  border-bottom: 1px solid var(--border-subtle);
  user-select: none;
  display: flex;
  align-items: center;
  margin: 0;
  position: relative;
  z-index: 5;
}

/* ---- 滚动容器 ---- */
.tab-scroll-wrap {
  height: 100%;
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  display: flex;
  align-items: center;
}
.tab-scroll-wrap::-webkit-scrollbar {
  height: 0;
}

/* ---- Tab列表 ---- */
.tab-list {
  display: flex;
  align-items: center;
  height: 100%;
  gap: 6px;
}

/* ---- 单个页签（胶囊） ---- */
.tab-item {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  flex-shrink: 0;
  transition: background var(--transition-fast), box-shadow var(--transition-fast);
}

/* 悬停：海蓝薄纱（与侧栏条目 hover 同款） */
.tab-item:hover {
  background: var(--nav-bg-hover, rgba(26, 99, 168, 0.08));
}

/* 激活：海蓝渐变 pill（与侧栏选中同语言） */
.tab-item.tab-active {
  background: var(--nav-selected-bg, linear-gradient(112deg, #1e6cb4, #114d83));
  box-shadow: var(--nav-selected-shadow, 0 2px 8px rgba(26, 99, 168, 0.35));
}

/* ---- 标题 ---- */
.tab-title {
  color: var(--text-secondary);
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
  line-height: 1.3;
  transition: color var(--transition-fast);
}
.tab-item:hover .tab-title {
  color: var(--text-primary);
}
.tab-item.tab-active .tab-title {
  color: var(--nav-selected-color, #fff);
  font-weight: 550;
}

/* ---- 关闭按钮 ---- */
.tab-remove {
  margin-left: 4px;
  color: var(--text-tertiary);
  transition: all var(--transition-fast);
  border-radius: 50%;
  width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  line-height: 1;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  order: 1;
}
.tab-remove:hover {
  color: var(--danger);
  background: var(--danger-soft);
}
/* 激活页签上的关闭钮：白系 */
.tab-item.tab-active .tab-remove {
  color: rgba(255, 255, 255, 0.85);
}
.tab-item.tab-active .tab-remove:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.22);
}

/* ---- 响应式 ---- */
@media (max-width: 768px) {
  .history-tags {
    height: 32px;
    padding: 0 8px;
  }
  .tab-item {
    height: 22px;
  }
  .tab-title {
    font-size: 12px;
  }
}
</style>
