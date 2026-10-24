<template>
  <!-- 站内信铃铛（框架纯展示件，M21）：数据与动作全部由宿主接线（props/emits）——
       各端路由不同（web/h5/小程序），路由解析归宿主业务；后端没有站内信的宿主
       由父级控制不挂载本件（探测逻辑在宿主 store，框架件零网络零报错） -->
  <div
    ref="bellWrapRef"
    class="ntf-bell"
  >
    <a-badge
      :count="unreadCount"
      :offset="[-2, 2]"
    >
      <button
        class="ntf-bell__btn"
        title="站内信"
        @click.stop="togglePanel"
      >
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M12 22a2.3 2.3 0 0 0 2.3-2.3H9.7A2.3 2.3 0 0 0 12 22Zm6.4-6V11c0-3.4-1.8-6.2-5-7v-.7a1.4 1.4 0 1 0-2.8 0V4c-3.2.8-5 3.6-5 7v5l-2 2v1h16.8v-1l-2-2Z"
          />
        </svg>
      </button>
    </a-badge>
    <div
      v-if="panelOpen"
      class="ntf-bell__panel"
    >
      <div class="ntf-bell__head">
        <span>站内信</span>
        <button
          class="ntf-bell__read-all"
          @click.stop="emit('markAllRead')"
        >
          全部已读
        </button>
      </div>
      <div class="ntf-bell__list">
        <div
          v-if="items.length === 0"
          class="ntf-bell__empty"
        >
          暂无消息
        </div>
        <button
          v-for="item in items"
          :key="item.id"
          class="ntf-bell__item"
          :class="{ 'ntf-bell__item--unread': item.readFlag === '0' }"
          @click.stop="onItemClick(item)"
        >
          <span class="ntf-bell__dot">{{ item.readFlag === '0' ? '●' : '' }}</span>
          <span class="ntf-bell__title">{{ item.title }}</span>
          <span
            v-if="item.summary"
            class="ntf-bell__summary"
          >{{ item.summary }}</span>
          <span class="ntf-bell__time">{{ formatTime(item.pushedAt) }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script
  lang="ts"
  setup
>
import { onBeforeUnmount, onMounted, ref } from 'vue'

import type { NotificationItem } from '@/apis/inkhub/notification'

/**
 * props：items＝收件箱首页；unreadCount＝徽标。宿主负责取数/探测/订阅/SSE。
 * emits：select(item)＝点行（宿主定夺跳转＋标已读）；markAllRead＝全部已读；refresh＝开面板拉列表。
 */
const props = defineProps<{
  items: NotificationItem[]
  unreadCount: number
}>()

const emit = defineEmits<{
  (e: 'select', item: NotificationItem): void
  (e: 'markAllRead'): void
  (e: 'refresh'): void
}>()

const panelOpen = ref(false)
const bellWrapRef = ref<HTMLElement | null>(null)

const onDocClick = (e: MouseEvent) => {
  if (panelOpen.value && bellWrapRef.value && !bellWrapRef.value.contains(e.target as Node)) {
    panelOpen.value = false
  }
}

const togglePanel = () => {
  panelOpen.value = !panelOpen.value
  if (panelOpen.value) {
    emit('refresh')
  }
}

const onItemClick = (item: NotificationItem) => {
  emit('select', item)
  panelOpen.value = false
}

const formatTime = (raw: string) => {
  if (!raw) {
    return ''
  }
  return raw.replace('T', ' ').slice(0, 16)
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
})
</script>

<style
  scoped
  lang="less"
>
.ntf-bell {
  position: relative;
  margin-right: 12px;
  display: inline-flex;
  align-items: center;
}

.ntf-bell__btn {
  border: 0;
  background: transparent;
  color: #fff;
  cursor: pointer;
  padding: 4px;
  display: inline-flex;
  align-items: center;

  &:hover {
    opacity: 0.85;
  }
}

.ntf-bell__panel {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  width: 360px;
  max-height: 420px;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.16);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ntf-bell__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid #f0f0f0;
  font-weight: 600;
  color: #1f2329;
}

.ntf-bell__read-all {
  border: 0;
  background: transparent;
  color: #1d6ceb;
  cursor: pointer;
  font-size: 12px;

  &:hover {
    text-decoration: underline;
  }
}

.ntf-bell__list {
  overflow-y: auto;
}

.ntf-bell__empty {
  padding: 28px 0;
  text-align: center;
  color: #8a8f99;
  font-size: 13px;
}

.ntf-bell__item {
  display: grid;
  grid-template-columns: 16px 1fr;
  grid-template-rows: auto auto auto;
  column-gap: 6px;
  width: 100%;
  border: 0;
  border-bottom: 1px solid #f5f6f7;
  background: #fff;
  text-align: left;
  padding: 10px 14px;
  cursor: pointer;

  &:hover {
    background: #f6f8fa;
  }

  &--unread .ntf-bell__title {
    font-weight: 600;
  }
}

.ntf-bell__dot {
  grid-row: span 3;
  color: #f54a45;
  font-size: 10px;
  line-height: 18px;
}

.ntf-bell__title {
  color: #1f2329;
  font-size: 13px;
  line-height: 18px;
}

.ntf-bell__summary {
  color: #646a73;
  font-size: 12px;
  line-height: 17px;
  word-break: break-all;
}

.ntf-bell__time {
  color: #8a8f99;
  font-size: 11px;
  line-height: 16px;
}
</style>
