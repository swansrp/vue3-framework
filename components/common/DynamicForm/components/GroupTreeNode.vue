<script setup lang="ts">
/**
 * 递归分组树节点组件
 * 用于 FormLayoutConfig 中展示分组的树形结构
 */
import { DownOutlined, RightOutlined, EditOutlined, CopyOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { PropType } from 'vue'

// 换行符转 HTML
const strLF2HtmlLF = (str: string) => {
  if (str && typeof str === 'string') {
    return str.replace(/\n|\\n/g, '<br/>')
  }
  return str
}

const props = defineProps({
  group: { type: Object as PropType<any>, required: true },
  level: { type: Number, default: 0 },
  expandedGroups: { type: Set as PropType<Set<string>>, required: true },
  fieldTypeNames: { type: Object as PropType<Record<string, string>>, required: true }
})

const emit = defineEmits<{
  (e: 'toggle', id: string): void
  (e: 'contextmenu', event: MouseEvent, item: any, type: string): void
  (e: 'editAttribute', attr: any): void
}>()

const getFieldTypeName = (type: string) => {
  return props.fieldTypeNames[type] || `类型${type}`
}

const handleToggle = () => {
  emit('toggle', String(props.group.id))
}

const handleContextMenu = (e: MouseEvent) => {
  e.preventDefault()
  emit('contextmenu', e, props.group, 'group')
}

const handleAttributeContextMenu = (e: MouseEvent, attr: any) => {
  e.preventDefault()
  e.stopPropagation()
  emit('contextmenu', e, attr, 'attribute')
}

const handleEditAttribute = (e: MouseEvent, attr: any) => {
  e.stopPropagation()
  emit('editAttribute', attr)
}

const handleCopyFieldName = async (e: MouseEvent, attr: any) => {
  e.stopPropagation()
  if (attr.name) {
    try {
      await navigator.clipboard.writeText(attr.name)
      message.success('字段名已复制')
    } catch (error) {
      console.error('复制失败:', error)
      message.error('复制失败')
    }
  }
}

const isExpanded = () => props.expandedGroups.has(String(props.group.id))
const hasChildren = () => props.group.children?.length > 0
const hasAttributes = () => props.group.attributes?.length > 0
</script>

<template>
  <div class="tree-group-wrapper">
    <!-- 分组头部 -->
    <div
      class="group-header"
      @click="handleToggle"
      @contextmenu="handleContextMenu"
    >
      <div class="header-left">
        <DownOutlined
          v-if="isExpanded()"
          class="expand-icon"
        />
        <RightOutlined
          v-else
          class="expand-icon"
        />
        <span class="group-icon">📁</span>
        <span class="group-title">{{ group.title }}</span>
        <a-tag
          v-if="group.multi === '1'"
          color="orange"
          size="small"
        >
          多行
        </a-tag>
        <span
          v-if="hasChildren()"
          class="child-count-badge"
        >
          {{ group.children.length }}
        </span>
      </div>
      <div class="header-right">
        <a-tag color="cyan">
          {{ group.attributes?.length || 0 }} 字段
        </a-tag>
      </div>
    </div>

    <!-- 分组内容 -->
    <div
      v-if="isExpanded()"
      class="group-content"
    >
      <!-- 属性列表 - 只有在没有子分组时才显示 -->
      <div
        v-if="hasAttributes() && !hasChildren()"
        class="attribute-grid"
      >
        <div
          v-for="attr in group.attributes"
          :key="attr.id"
          class="attribute-card"
          @contextmenu="handleAttributeContextMenu($event, attr)"
        >
          <div class="attr-header">
            <span class="attr-label">
              <span
                v-if="attr.isRequired === '1'"
                class="required"
              >*</span>
              <span v-html="strLF2HtmlLF(attr.label)"></span>
            </span>
            <span
              class="attr-tag"
              :class="attr.isRequired === '1' ? 'attr-tag-required' : 'attr-tag-optional'"
            >
              {{ attr.isRequired === '1' ? '必填' : '选填' }}
            </span>
          </div>
          <div class="attr-type-row">
            <span class="attr-tag attr-tag-type">
              {{ getFieldTypeName(attr.fieldType) }}
            </span>
            <div class="attr-action-icons">
              <span
                class="attr-action-icon"
                @click="handleEditAttribute($event, attr)"
              >
                <EditOutlined />
              </span>
              <span
                class="attr-action-icon"
                @click="handleCopyFieldName($event, attr)"
              >
                <CopyOutlined />
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 递归子分组 -->
      <div
        v-if="hasChildren()"
        class="child-groups"
      >
        <GroupTreeNode
          v-for="childGroup in group.children"
          :key="childGroup.id"
          :group="childGroup"
          :level="level + 1"
          :expanded-groups="expandedGroups"
          :field-type-names="fieldTypeNames"
          @toggle="(id) => emit('toggle', id)"
          @contextmenu="(e, item, type) => emit('contextmenu', e, item, type)"
          @edit-attribute="(attr) => emit('editAttribute', attr)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.tree-group-wrapper {
  margin-bottom: 8px;
  border: 1px solid #e8eaed;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  // 子分组样式
  .tree-group-wrapper {
    margin-left: 0;
    border: none;
    border-radius: 0;
    margin-bottom: 0;
    border-top: 1px solid #f0f0f0;
    box-shadow: none;

    &:first-child {
      border-top: none;
    }

    &:hover {
      box-shadow: none;
    }
  }

  .group-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: linear-gradient(135deg, #fff7e6 0%, #fffcf5 100%);
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: linear-gradient(135deg, #ffe6cc 0%, #fff7e6 100%);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;

      .expand-icon {
        color: #fa8c16;
        font-size: 12px;
        transition: transform 0.2s;
      }

      .group-icon {
        font-size: 15px;
      }

      .group-title {
        font-size: 14px;
        font-weight: 600;
        color: #d48806;
      }

      // 子分组数量徽标
      .child-count-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 18px;
        height: 18px;
        padding: 0 5px;
        font-size: 11px;
        font-weight: 600;
        color: #fff;
        background: linear-gradient(135deg, #fa8c16 0%, #faad14 100%);
        border-radius: 9px;
        margin-left: 4px;
      }
    }

    .header-right {
      display: flex;
      gap: 6px;
    }
  }

  .group-content {
    padding: 12px 16px;
    background: linear-gradient(180deg, #fffbf0 0%, #fff 100%);
  }

  .child-groups {
    display: flex;
    flex-direction: column;

    // 子分组头部样式
    > .tree-group-wrapper {
      .group-header {
        background: linear-gradient(135deg, #f0f7ff 0%, #f5f9ff 100%);
        padding: 10px 14px;

        &:hover {
          background: linear-gradient(135deg, #d6e8ff 0%, #e6f4ff 100%);
        }

        .header-left {
          .expand-icon {
            color: #1890ff;
          }

          .group-icon {
            font-size: 14px;
          }

          .group-title {
            color: #1890ff;
            font-size: 13px;
            font-weight: 500;
          }

          .child-count-badge {
            background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
          }
        }
      }

      .group-content {
        background: linear-gradient(180deg, #f0f7ff 0%, #fff 100%);
      }

      // 三级分组样式
      .tree-group-wrapper {
        .group-header {
          background: linear-gradient(135deg, #f6ffed 0%, #fcfff5 100%);
          padding: 8px 12px;

          &:hover {
            background: linear-gradient(135deg, #e6ffcc 0%, #f6ffed 100%);
          }

          .header-left {
            .expand-icon {
              color: #52c41a;
            }

            .group-icon {
              font-size: 13px;
            }

            .group-title {
              color: #52c41a;
              font-size: 13px;
              font-weight: 500;
            }

            .child-count-badge {
              background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
            }
          }
        }

        .group-content {
          background: linear-gradient(180deg, #f6ffed 0%, #fff 100%);
        }
      }
    }
  }
}

// 属性网格
.attribute-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
}

// 属性卡片
.attribute-card {
  padding: 14px 16px;
  background: #fff;
  border: 1px solid #e8eaed;
  border-radius: 8px;
  transition: all 0.2s;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  min-height: 80px;

  &:hover {
    background: #f0f7ff;
    border-color: #1890ff;
    box-shadow: 0 2px 12px rgba(24, 144, 255, 0.12);
  }

  .attr-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 6px;

    .attr-label {
      font-size: 14px;
      font-weight: 600;
      color: #262626;
      display: flex;
      align-items: flex-start;
      gap: 4px;
      flex: 1;
      min-width: 0;
      line-height: 1.4;

      .required {
        color: #ff4d4f;
        font-weight: 700;
        font-size: 16px;
        flex-shrink: 0;
      }

      // v-html 内容容器
      > span {
        min-width: 0;
        word-break: break-word;
      }
    }
  }

  // 类型标签行
  .attr-type-row {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 8px;
    min-height: 24px;
    margin-top: auto;
  }

  // 操作图标容器
  .attr-action-icons {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: auto;
  }

  // 操作图标
  .attr-action-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 4px;
    cursor: pointer;
    color: #8c8c8c;
    font-size: 12px;
    transition: all 0.2s;

    &:hover {
      color: #1890ff;
      background: #e6f4ff;
    }
  }

  // 统一标签样式
  .attr-tag {
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 500;
    display: inline-flex;
    align-items: center;

    // 类型标签 - 蓝色
    &.attr-tag-type {
      color: #1890ff;
      background: #e6f4ff;
      border: 1px solid #91caff;
    }

    // 必填标签 - 红色
    &.attr-tag-required {
      color: #ff4d4f;
      background: #fff1f0;
      border: 1px solid #ffa39e;
    }

    // 选填标签 - 灰色
    &.attr-tag-optional {
      color: #666;
      background: #f5f5f5;
      border: 1px solid #d9d9d9;
    }
  }
}
</style>
