<template>
  <div class="history-tags">
    <div class="tab-scroll-wrap">
      <div class="tab-list">
        <div
          v-for="(item, index) in tabs"
          :key="getTabKey(item)"
          class="tab-item"
          :class="{ 'tab-active': getTabKey(item) === activeKey }"
          :style="getTabStyle(index)"
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

// 计算单个tab的内联样式
const getTabStyle = (index: number): Partial<CSSStyleDeclaration> => {
  const isFirst = index === 0
  const isLast = index === tabs.value.length - 1

  // 单tab：|--->
  if (tabs.value.length === 1) {
    return {
      clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%)'
    } as any
  }

  // 首tab：|--->  左平直 + 右箭头
  if (isFirst) {
    return {
      marginLeft: '0',
      paddingLeft: '12px',
      clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%)'
    } as any
  }

  // 末tab：>----|  左凹槽(右向) + 右平直
  if (isLast) {
    return {
      marginLeft: '-10px',
      paddingLeft: '22px',
      paddingRight: '12px',
      clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 10px 50%)'
    } as any
  }

  // 中间tab：>--->  左凹槽(右向) + 右箭头
  return {
    marginLeft: '-10px',
    paddingLeft: '22px',
    clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%, 10px 50%)'
  } as any
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
/* ---- 容器 ---- */
.history-tags {
  height: 30px;
  padding: 0 var(--space-xl);
  box-sizing: border-box;
  background: var(--history-tab-bg);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--border-subtle);
  user-select: none;
  display: flex;
  align-items: center;
  margin: 0;
  border-radius: 0;
  box-shadow: var(--shadow-tab);
  overflow: visible;
  position: relative;
  z-index: 5;
}

/* 分隔线 */
.history-tags::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--border-subtle);
  z-index: 0;
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
  gap: 0;
}

/* ---- 单个Tab（基础: 右箭头 |---> 或 >-->） ---- */
.tab-item {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  padding: 0 24px 0 12px;
  background: transparent;
  opacity: 0.55;
  cursor: pointer;
  flex-shrink: 0;
  position: relative;
  transition: opacity var(--transition-fast), background var(--transition-fast);
  clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%);
}

/* 非首个Tab: >---> 左凹槽(右向)+右箭头，左移10px */
.tab-item:not(:first-of-type) {
  margin-left: -10px;
  padding-left: 22px;
  clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%, 10px 50%);
}

/* 末位Tab: >----| 左凹槽(右向)+右平直 */
.tab-item:last-of-type {
  padding-right: 12px;
  clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%, 10px 50%);
}

/* 首个Tab: |---> 左平直+右箭头（放在最后，确保单tab时胜出） */
.tab-item:first-of-type {
  margin-left: 0;
  padding-left: 12px;
  clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%);
}

/* 悬停 */
.tab-item:hover {
  background: var(--bg-hover);
  opacity: 0.85;
}

/* 激活 */
.tab-item.tab-active {
  background: var(--accent-soft);
  opacity: 1;
  z-index: 10;
}

/* ---- 标题 ---- */
.tab-title {
  color: var(--text-secondary);
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
  padding: 0 2px;
  line-height: 1.3;
  transition: color var(--transition-fast);
}
.tab-item.tab-active .tab-title {
  color: var(--text-primary);
  font-weight: 500;
}
.tab-item:hover .tab-title {
  color: var(--text-primary);
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

/* ---- 响应式 ---- */
@media (max-width: 768px) {
  .history-tags {
    height: 28px;
    padding: 0 4px;
  }
  .tab-item {
    height: 22px;
  }
  .tab-title {
    font-size: 12px;
  }
}
</style>
