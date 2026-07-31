<template>
  <div class="dataset-list">
    <div class="list-toolbar">
      <a-input
        v-model:value="searchText"
        placeholder="搜索名称或备注"
        allow-clear
      >
        <template #prefix>
          <SearchOutlined style="color: var(--text-secondary)" />
        </template>
      </a-input>
      <a-tooltip title="新建Dataset">
        <a-button
          type="primary"
          @click="emit('create')"
        >
          <template #icon>
            <PlusOutlined />
          </template>
        </a-button>
      </a-tooltip>
    </div>

    <a-spin
      :spinning="loading"
      wrapper-class-name="list-spin"
    >
      <div class="group-container">
        <template v-if="groupedList.length">
          <div
            v-for="group in groupedList"
            :key="group.name"
            class="group"
          >
            <div
              class="group-header"
              @click="toggleGroup(group.name)"
            >
              <CaretRightOutlined
                class="group-arrow"
                :class="{ expanded: !collapsed[group.name] }"
              />
              <span class="group-name">{{ group.name }}</span>
              <span class="group-count">{{ group.items.length }}</span>
            </div>
            <template v-if="!collapsed[group.name]">
              <div
                v-for="item in group.items"
                :key="item.id"
                class="dataset-item"
                :class="{ active: item.id === selectedId }"
                @click="emit('select', item)"
              >
                <div class="item-content">
                  <div
                    class="item-title"
                    :title="item.remark"
                  >
                    {{ itemTitle(group.name, item) }}
                  </div>
                  <div
                    class="item-name"
                    :title="item.datasetName"
                  >
                    {{ item.datasetName }}
                  </div>
                </div>
                <a-popconfirm
                  title="确定删除该Dataset配置吗？"
                  ok-text="确定"
                  cancel-text="取消"
                  placement="right"
                  @confirm="emit('delete', item)"
                >
                  <a-button
                    class="item-delete"
                    type="text"
                    size="small"
                    danger
                    @click.stop
                  >
                    <template #icon>
                      <DeleteOutlined />
                    </template>
                  </a-button>
                </a-popconfirm>
              </div>
            </template>
          </div>
        </template>
        <a-empty
          v-else-if="!loading"
          :image="Empty.PRESENTED_IMAGE_SIMPLE"
          :description="searchText ? '无匹配结果' : '暂无Dataset'"
        />
      </div>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { CaretRightOutlined, DeleteOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { Empty } from 'ant-design-vue'
import { computed, reactive, ref } from 'vue'

import type { DatasetInfo } from '../types'

const props = defineProps<{
  list: DatasetInfo[]
  selectedId?: number | null
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', dataset: DatasetInfo): void
  (e: 'create'): void
  (e: 'delete', dataset: DatasetInfo): void
}>()

const searchText = ref('')
const collapsed = reactive<Record<string, boolean>>({})

const UNGROUPED = '未分类'

// 备注约定「分类-描述」，按分隔符前缀分组；无前缀归入"未分类"
const groupKeyOf = (item: DatasetInfo): string => {
  const remark = (item.remark || '').trim()
  const match = remark.match(/^(.+?)[-－—:：]/)
  const key = match?.[1]?.trim()
  return key || UNGROUPED
}

// 列表项标题：去掉分组前缀后的备注，备注为空时回退到名称
const itemTitle = (groupName: string, item: DatasetInfo): string => {
  const remark = (item.remark || '').trim()
  if (!remark) return item.datasetName || ''
  if (groupName === UNGROUPED) return remark
  return remark.slice(groupName.length).replace(/^[-－—:：\s]+/, '') || remark
}

const groupedList = computed(() => {
  const keyword = searchText.value.trim().toLowerCase()
  const filtered = keyword
    ? props.list.filter(item =>
      (item.datasetName || '').toLowerCase().includes(keyword)
      || (item.remark || '').toLowerCase().includes(keyword))
    : props.list

  const groupMap = new Map<string, DatasetInfo[]>()
  filtered.forEach(item => {
    const key = groupKeyOf(item)
    if (!groupMap.has(key)) groupMap.set(key, [])
    groupMap.get(key)!.push(item)
  })

  // 分组按名称排序，"未分类"始终垫底
  return Array.from(groupMap.entries())
    .sort((a, b) => {
      if (a[0] === UNGROUPED) return 1
      if (b[0] === UNGROUPED) return -1
      return a[0].localeCompare(b[0], 'zh-CN')
    })
    .map(([name, items]) => ({ name, items }))
})

const toggleGroup = (name: string) => {
  collapsed[name] = !collapsed[name]
}
</script>

<style scoped lang="less">
.dataset-list {
  height: 100%;
  display: flex;
  flex-direction: column;
  // 显式指定正文色，避免继承到主题无关的暗淡颜色
  color: var(--text-primary, rgba(0, 0, 0, 0.85));

  .list-toolbar {
    display: flex;
    gap: 8px;
    padding: 12px;
    border-bottom: 1px solid var(--border-subtle, #f0f0f0);
  }

  :deep(.list-spin) {
    flex: 1;
    min-height: 0;

    .ant-spin-container {
      height: 100%;
    }
  }

  .group-container {
    height: 100%;
    overflow-y: auto;
    padding: 4px 0;
  }

  .group-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    cursor: pointer;
    user-select: none;
    font-weight: 600;
    font-size: 13px;
    color: var(--text-primary, rgba(0, 0, 0, 0.85));

    &:hover {
      background: var(--bg-hover, rgba(0, 0, 0, 0.04));
    }

    .group-arrow {
      font-size: 10px;
      color: var(--text-secondary, #999);
      transition: transform 0.2s;

      &.expanded {
        transform: rotate(90deg);
      }
    }

    .group-count {
      margin-left: auto;
      font-weight: normal;
      font-size: 12px;
      color: var(--text-secondary, #999);
    }
  }

  .dataset-item {
    display: flex;
    align-items: center;
    padding: 6px 8px 6px 28px;
    cursor: pointer;
    border-left: 2px solid transparent;

    &:hover {
      background: var(--bg-hover, rgba(0, 0, 0, 0.04));

      .item-delete {
        opacity: 1;
      }
    }

    &.active {
      background: var(--accent-soft, #e6f4ff);
      border-left-color: var(--accent, #1890ff);

      .item-title {
        color: var(--accent, #1890ff);
      }
    }

    .item-content {
      flex: 1;
      min-width: 0;
    }

    .item-title {
      font-size: 13px;
      color: var(--text-primary, rgba(0, 0, 0, 0.85));
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-name {
      font-size: 12px;
      color: var(--text-secondary, #999);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-delete {
      opacity: 0;
      flex-shrink: 0;
      transition: opacity 0.2s;
    }
  }
}
</style>
