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
        <template v-if="rows.length">
          <template
            v-for="row in rows"
            :key="row.kind === 'group' ? `g-${row.node.pathKey}` : `i-${row.item.id}`"
          >
            <div
              v-if="row.kind === 'group'"
              class="group-header"
              :style="{ paddingLeft: `${12 + row.depth * 16}px` }"
              @click="toggleGroup(row.node.pathKey)"
            >
              <CaretRightOutlined
                class="group-arrow"
                :class="{ expanded: isExpanded(row.node.pathKey) }"
              />
              <span class="group-name">{{ row.node.name }}</span>
              <span class="group-count">{{ row.node.total }}</span>
            </div>
            <div
              v-else
              class="dataset-item"
              :class="{ active: row.item.id === selectedId }"
              :style="{ paddingLeft: `${12 + row.depth * 16}px` }"
              @click="emit('select', row.item)"
            >
              <div class="item-content">
                <div
                  class="item-title"
                  :title="row.item.remark"
                >
                  {{ itemTitle(row.item) }}
                </div>
                <div
                  class="item-name"
                  :title="row.item.datasetName"
                >
                  {{ row.item.datasetName }}
                </div>
              </div>
              <a-popconfirm
                title="确定删除该Dataset配置吗？"
                ok-text="确定"
                cancel-text="取消"
                placement="right"
                @confirm="emit('delete', row.item)"
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
// 默认全闭合，手动展开的目录记入白名单；搜索时强制全展开，命中条目才可见
const expanded = reactive<Record<string, boolean>>({})

const UNGROUPED = '未分类'

interface GroupNode {
  name: string
  pathKey: string
  children: GroupNode[]
  items: DatasetInfo[]
  total: number
}

type Row =
  | { kind: 'group'; node: GroupNode; depth: number }
  | { kind: 'item'; item: DatasetInfo; depth: number }

// 备注约定「多级-目录-描述」：每个分隔符都下钻一级目录；
// 分隔符不足一个（切不出两级）时归入"未分类"
const segmentsOf = (item: DatasetInfo): string[] =>
  (item.remark || '').trim().split(/[-－—:：]+/).map(s => s.trim()).filter(Boolean)

// 列表项标题：末级目录段，备注为空时回退到名称
const itemTitle = (item: DatasetInfo): string => {
  const segs = segmentsOf(item)
  if (!segs.length) return item.datasetName || (item.remark || '').trim()
  return segs[segs.length - 1]
}

const buildTree = (items: DatasetInfo[]): GroupNode[] => {
  const roots: GroupNode[] = []
  const ungrouped: DatasetInfo[] = []
  items.forEach(item => {
    const segs = segmentsOf(item)
    if (segs.length <= 1) {
      ungrouped.push(item)
      return
    }
    let siblings = roots
    let parentPath = ''
    let parent: GroupNode | null = null
    // 末段是条目标题，其余段逐级建目录
    for (const seg of segs.slice(0, -1)) {
      let node = siblings.find(c => c.name === seg)
      if (!node) {
        node = { name: seg, pathKey: parentPath ? `${parentPath}/${seg}` : seg, children: [], items: [], total: 0 }
        siblings.push(node)
      }
      parent = node
      parentPath = node.pathKey
      siblings = node.children
    }
    parent!.items.push(item)
  })
  const finalize = (node: GroupNode): number => {
    node.total = node.items.length + node.children.reduce((sum, c) => sum + finalize(c), 0)
    node.children.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
    return node.total
  }
  roots.forEach(finalize)
  if (ungrouped.length) {
    roots.push({ name: UNGROUPED, pathKey: '\u0000ungrouped', children: [], items: ungrouped, total: ungrouped.length })
  }
  roots.sort((a, b) => {
    if (a.name === UNGROUPED) return 1
    if (b.name === UNGROUPED) return -1
    return a.name.localeCompare(b.name, 'zh-CN')
  })
  return roots
}

const rows = computed<Row[]>(() => {
  const keyword = searchText.value.trim().toLowerCase()
  const filtered = keyword
    ? props.list.filter(item =>
      (item.datasetName || '').toLowerCase().includes(keyword)
      || (item.remark || '').toLowerCase().includes(keyword))
    : props.list

  const out: Row[] = []
  const walk = (nodes: GroupNode[], depth: number) => {
    nodes.forEach(node => {
      out.push({ kind: 'group', node, depth })
      if (!isExpanded(node.pathKey)) return
      walk(node.children, depth + 1)
      node.items.forEach(item => out.push({ kind: 'item', item, depth: depth + 1 }))
    })
  }
  walk(buildTree(filtered), 0)
  return out
})

const isExpanded = (pathKey: string) => !!expanded[pathKey] || !!searchText.value.trim()

const toggleGroup = (pathKey: string) => {
  expanded[pathKey] = !expanded[pathKey]
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
