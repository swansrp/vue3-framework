<script setup lang="ts">
/**
 * Wiki搜索结果预览组件
 * 功能：展示搜索结果列表，点击跳转到对应页面
 */
import { CloseOutlined, FileTextOutlined } from '@ant-design/icons-vue'

import type { WikiPage } from '../types'

const props = withDefaults(
  defineProps<{
    /** 搜索结果列表 */
    searchResults: WikiPage[]
    /** 搜索关键词 */
    keyword: string
    /** 加载状态 */
    loading?: boolean
    /** 是否显示 */
    visible?: boolean
  }>(),
  {
    loading: false,
    visible: false
  }
)

const emit = defineEmits<{
  /** 选中页面 */
  (e: 'select', page: WikiPage): void
  /** 关闭搜索结果 */
  (e: 'close'): void
}>()

const { searchResults, keyword, loading, visible } = toRefs(props)

/** 高亮关键词 */
const highlightKeyword = (text: string): string => {
  if (!keyword.value || !text) return text
  const regex = new RegExp(`(${keyword.value})`, 'gi')
  return text.replace(regex, '<span class="highlight">$1</span>')
}

/** 获取内容摘要 */
const getContentSummary = (content: string): string => {
  if (!content) return ''
  // 移除HTML标签
  const textContent = content.replace(/<[^>]+>/g, '')
  // 截取前200个字符
  const summary = textContent.substring(0, 200)
  return summary.length < textContent.length ? summary + '...' : summary
}

/** 选中页面 */
const handleSelect = (page: WikiPage) => {
  emit('select', page)
}

/** 关闭搜索结果 */
const handleClose = () => {
  emit('close')
}
</script>

<template>
  <div
    v-if="visible"
    class="wiki-search-results"
  >
    <div class="search-results-header">
      <span class="search-title">
        搜索结果
        <a-tag>{{ searchResults.length }}</a-tag>
      </span>
      <a-button
        type="text"
        size="small"
        @click="handleClose"
      >
        <close-outlined />
      </a-button>
    </div>
    <div class="search-results-content">
      <div class="spin-wrapper">
        <a-spin :spinning="loading">
          <div
            v-if="searchResults.length > 0"
            class="result-list"
          >
            <div
              v-for="page in searchResults"
              :key="page.id"
              class="result-item"
              @click="handleSelect(page)"
            >
              <div class="result-title">
                <file-text-outlined />
                <span v-html="highlightKeyword(page.title)"></span>
              </div>
              <div
                class="result-summary"
                v-html="highlightKeyword(getContentSummary(page.content))"
              ></div>
              <div class="result-meta">
                <span>更新于 {{ page.modifyAt }}</span>
                <span>{{ page.authorName }}</span>
              </div>
            </div>
          </div>
          <a-empty
            v-else
            description="未找到匹配的页面"
          />
        </a-spin>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.wiki-search-results {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  background: #fff;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .search-results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
    background: #fafafa;
    flex-shrink: 0;

    .search-title {
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }

  .search-results-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    position: relative;

    .spin-wrapper {
      width: 100%;
    }
  }

  .result-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .result-item {
    padding: 12px;
    border: 1px solid #f0f0f0;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
      border-color: #1890ff;
      box-shadow: 0 2px 8px rgba(24, 144, 255, 0.15);
    }

    .result-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 15px;
      font-weight: 500;
      color: #262626;
      margin-bottom: 8px;

      :deep(.highlight) {
        background: #fff3bf;
        padding: 0 2px;
        border-radius: 2px;
      }
    }

    .result-summary {
      font-size: 13px;
      color: #8c8c8c;
      line-height: 1.6;
      margin-bottom: 8px;

      :deep(.highlight) {
        background: #fff3bf;
        padding: 0 2px;
        border-radius: 2px;
      }
    }

    .result-meta {
      display: flex;
      gap: 16px;
      font-size: 12px;
      color: #bfbfbf;
    }
  }
}
</style>
