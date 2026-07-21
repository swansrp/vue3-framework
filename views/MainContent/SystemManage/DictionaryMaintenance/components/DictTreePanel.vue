<template>
  <div class="dict-tree-panel">
    <!-- 左侧：树形字典列表 -->
    <a-list
      size="small"
      bordered
      :data-source="treeDictList"
      class="tree-dict-list"
    >
      <template #renderItem="{ item, index }">
        <a-list-item
          :class="{ 'activate-item': activeIndex === index }"
          @click="selectTreeDict(item, index)"
        >
          {{ item.label }}
        </a-list-item>
      </template>
      <template #header>
        <span class="list-header-title">树形字典列表</span>
      </template>
      <template #footer>
        <div class="list-footer-content">
          <a-button
            size="small"
            @click="loadTreeDictList"
          >
            刷新列表
          </a-button>
        </div>
      </template>
    </a-list>

    <!-- 右侧：树形结构展示 -->
    <div class="tree-content">
      <template v-if="currentDictCode">
        <div class="tree-toolbar">
          <span class="tree-title">{{ currentDictName }}</span>
          <a-space>
            <a-button
              size="small"
              type="primary"
              @click="handleRefreshCache"
            >
              刷新缓存
            </a-button>
            <a-button
              size="small"
              @click="expandAll"
            >
              全部展开
            </a-button>
            <a-button
              size="small"
              @click="collapseAll"
            >
              全部收起
            </a-button>
          </a-space>
        </div>

        <a-spin :spinning="treeLoading">
          <a-tree
            v-if="treeData.length > 0"
            v-model:expanded-keys="expandedKeys"
            :tree-data="treeData"
            :field-names="{ key: 'key', title: 'label', children: 'children' }"
            show-icon
            default-expand-all
            class="tree-display"
          >
            <template #title="{ label, value, isLeaf }">
              <span class="tree-node-title">
                <span class="node-label">{{ label }}</span>
                <span class="node-value">({{ value }})</span>
                <a-tag
                  v-if="isLeaf"
                  color="green"
                  class="node-tag"
                >
                  叶子
                </a-tag>
              </span>
            </template>
          </a-tree>
          <a-empty
            v-else
            description="暂无树形数据"
          />
        </a-spin>
      </template>
      <template v-else>
        <a-empty description="请从左侧选择一个树形字典" />
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { message } from 'ant-design-vue'
import { onMounted, ref } from 'vue'

import { getBizTreeDict, getBizTreeDictList, refreshBizTreeDict } from '@/framework/apis/dict/dict'

interface TreeDictItem {
  key: string
  value: string
  label: string
  isLeaf: boolean
  children?: TreeDictItem[]
}

interface DictListItem {
  value: string
  label: string
}

const treeDictList = ref<DictListItem[]>([])
const activeIndex = ref(-1)
const currentDictCode = ref('')
const currentDictName = ref('')
const treeData = ref<TreeDictItem[]>([])
const treeLoading = ref(false)
const expandedKeys = ref<string[]>([])

const loadTreeDictList = async () => {
  try {
    const res = await getBizTreeDictList()
    treeDictList.value = res.payload || []
  } catch (e) {
    console.error('加载树形字典列表失败:', e)
  }
}

const selectTreeDict = async (item: DictListItem, index: number) => {
  activeIndex.value = index
  currentDictCode.value = item.value
  currentDictName.value = item.label
  await loadTreeData()
}

const loadTreeData = async () => {
  if (!currentDictCode.value) return
  treeLoading.value = true
  try {
    const res = await getBizTreeDict({ dictCode: currentDictCode.value })
    treeData.value = res.payload || []
    // 默认展开所有节点
    expandedKeys.value = collectAllKeys(treeData.value)
  } catch (e) {
    console.error('加载树形字典数据失败:', e)
    treeData.value = []
  } finally {
    treeLoading.value = false
  }
}

const handleRefreshCache = async () => {
  if (!currentDictCode.value) return
  try {
    const res = await refreshBizTreeDict({ dictCode: currentDictCode.value })
    treeData.value = res.payload || []
    expandedKeys.value = collectAllKeys(treeData.value)
    message.success('缓存刷新成功')
  } catch (e) {
    console.error('刷新缓存失败:', e)
  }
}

const collectAllKeys = (nodes: TreeDictItem[]): string[] => {
  const keys: string[] = []
  const traverse = (list: TreeDictItem[]) => {
    for (const node of list) {
      keys.push(node.key)
      if (node.children?.length) {
        traverse(node.children)
      }
    }
  }
  traverse(nodes)
  return keys
}

const expandAll = () => {
  expandedKeys.value = collectAllKeys(treeData.value)
}

const collapseAll = () => {
  expandedKeys.value = []
}

onMounted(() => {
  loadTreeDictList()
})
</script>

<style scoped lang="less">
.dict-tree-panel {
  display: flex;
  height: 100%;
  gap: 16px;
}

.tree-dict-list {
  width: 250px;
  height: 100%;
  box-shadow: 0 4px 10px 0 rgba(69, 89, 120, 0.5);

  :deep(.ant-spin-container) {
    max-height: 680px;
    overflow: auto;
    cursor: pointer;

    li:hover {
      background-color: var(--accent-soft);
      border-right: 3px solid var(--accent);
    }
  }

  .list-header-title {
    font-weight: 600;
  }
}

.activate-item {
  background-color: var(--accent-soft);
  border-right: 3px solid var(--accent);
}

.list-footer-content {
  display: flex;
  justify-content: flex-end;
}

.tree-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  border: 1px solid var(--border-subtle, #f0f0f0);
  border-radius: 6px;
}

.tree-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;

  .tree-title {
    font-size: 16px;
    font-weight: 600;
  }
}

.tree-display {
  :deep(.ant-tree-treenode) {
    padding: 4px 0;
  }
}

.tree-node-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;

  .node-label {
    font-weight: 500;
  }

  .node-value {
    color: #8c8c8c;
    font-size: 12px;
  }

  .node-tag {
    font-size: 10px;
    line-height: 16px;
    padding: 0 4px;
  }
}
</style>
