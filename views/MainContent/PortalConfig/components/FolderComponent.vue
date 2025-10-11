<template>
  <div class="folder-group">
    <!-- 文件夹头部 -->
    <div
      :class="getHeaderClass()"
      :style="getHeaderStyle()"
      @click="toggleFolder(folderPath)"
      @mouseenter="onMouseEnter"
      @mouseleave="onMouseLeave"
    >
      <component
        :is="expandedFolders[folderPath] ? CaretDownOutlined : CaretRightOutlined"
        :style="iconStyle"
        class="folder-icon"
      />
      <FolderOutlined
        :style="iconStyle"
        class="folder-icon"
      />
      <span
        :style="titleStyle"
        class="folder-title"
        v-html="highlightSearchText(folderKey || '')"
      />
      <span
        :style="countStyle"
        class="folder-count"
      >
        ({{ getTotalItemCount(folderData) }})
      </span>
    </div>

    <!-- 文件夹内容 -->
    <div
      v-if="expandedFolders[folderPath]"
      :style="contentStyle"
      class="folder-content"
    >
      <!-- 渲染子文件夹 -->
      <FolderComponent
        v-for="[subKey, subData] in sortedSubFolders"
        :key="`${folderPath}-${subKey}`"
        :depth="(depth || 0) + 1"
        :parent-path="folderPath"
        :expanded-folders="expandedFolders"
        :folder-data="subData"
        :folder-key="subKey"
        :get-sorted-folders="getSortedFolders"
        :get-table-config-by-name="getTableConfigByName"
        :selected-role="selectedRole"
        :get-total-item-count="getTotalItemCount"
        :highlight-search-text="highlightSearchText"
        :table-config="tableConfig"
        :table-list="tableList"
        :toggle-folder="toggleFolder"
        @refresh-config="$emit('refresh-config', $event)"
        @open-copy-modal="$emit('open-copy-modal', $event)"
        @delete-config="$emit('delete-config', $event)"
      />

      <!-- 渲染项目 -->
      <div
        v-for="item in folderData?.items || []"
        :key="item.value"
        :class="['table-item', { 'activate-item': tableConfig.name === item.value }]"
        :style="getItemStyle()"
        @click="getTableConfigByName(item.value)"
        @mouseenter="onItemMouseEnter"
        @mouseleave="onItemMouseLeave"
      >
        <div
          :style="getItemContentStyle()"
          class="item-content"
        >
          <FileTextOutlined
            :style="fileIconStyle"
            class="file-icon"
          />
          <a-dropdown
            v-if="tableList.length !== 0"
            :trigger="['contextmenu']"
          >
            <span
              :style="itemLabelStyle"
              :title="item.shortLabel || item.label"
              class="item-label"
              v-html="highlightSearchText(item.shortLabel || item.label)"
            />
            <template
              v-if="selectedRole === '0'"
              #overlay
            >
              <a-menu>
                <a-menu-item key="0">
                  <a-popconfirm
                    title="注意 即将恢复该配置到默认状态"
                    @confirm="$emit('refresh-config', item.value)"
                  >
                    <a-button
                      type="text"
                      size="small"
                    >
                      恢复
                      <template #icon>
                        <UndoOutlined />
                      </template>
                    </a-button>
                  </a-popconfirm>
                </a-menu-item>
                <a-menu-item key="1">
                  <a-button
                    type="text"
                    size="small"
                    @click="$emit('open-copy-modal', item)"
                  >
                    复制
                    <template #icon>
                      <CopyOutlined />
                    </template>
                  </a-button>
                </a-menu-item>
                <a-menu-item key="2">
                  <a-popconfirm
                    title="注意 即将删除该配置"
                    @confirm="$emit('delete-config', item.value)"
                  >
                    <a-button
                      type="text"
                      size="small"
                    >
                      删除
                      <template #icon>
                        <DeleteOutlined />
                      </template>
                    </a-button>
                  </a-popconfirm>
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
          <!-- 如果没有右键菜单权限，直接显示标签 -->
          <span
            v-else
            :style="itemLabelStyle"
            :title="item.shortLabel || item.label"
            class="item-label"
            v-html="highlightSearchText(item.shortLabel || item.label)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { CaretDownOutlined, CaretRightOutlined, FileTextOutlined, FolderOutlined, UndoOutlined, CopyOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import { computed } from 'vue'

// 定义Props接口
interface FolderComponentProps {
  folderKey?: string
  folderData?: any
  depth?: number
  parentPath?: string  // 新增：父级路径
  expandedFolders: Record<string, boolean>
  highlightSearchText: (text: string) => string
  getTotalItemCount: (folderData: any) => number
  getSortedFolders: (folders: Record<string, any>) => Record<string, any>
  toggleFolder: (folderKey: string) => void
  tableConfig: any
  tableList: any[]
  getTableConfigByName: (value: string) => void
  selectedRole?: string|number  // 新增：当前选中的角色
}

// 定义Props
const props = withDefaults(defineProps<FolderComponentProps>(), {
  depth: 0,
  parentPath: '',
  selectedRole: '0'
})

// 定义emit
const emit = defineEmits<{
  'refresh-config': [value: string]
  'open-copy-modal': [item: any]
  'delete-config': [value: string]
}>()

// 计算属性
const baseIndent = 10  // 基础缩进
const indentStep = 15  // 缩进步长
// 文件夹头部缩进：与上一层级的项目缩进相同
const folderPaddingLeft = computed(() => {
  if (props.depth === 0) {
    return baseIndent  // 第一层文件夹：10px
  }
  // 第二层及以上文件夹：与上一层级项目缩进相同
  return baseIndent + (props.depth * indentStep)  // 第二层：25px，第三层：40px
})
// 项目缩进：比同层级文件夹多一个步长
const itemPaddingLeft = computed(() => folderPaddingLeft.value + indentStep)
// 构建完整的文件夹路径
const folderPath = computed(() => {
  if (props.parentPath) {
    return `${props.parentPath}-${props.folderKey}`
  }
  return props.folderKey || ''
})

const sortedSubFolders = computed(() =>
    Object.entries(props.getSortedFolders(props.folderData?.children || {}))
)

// 样式计算
const getHeaderClass = () => {
  const baseClass = 'folder-header'
  const expandedClass = props.expandedFolders[folderPath.value] ? 'folder-expanded' : ''
  const depthClass = `folder-depth-${ Math.min(props.depth || 0, 3) }`
  return [baseClass, expandedClass, depthClass].filter(Boolean)
}

const getHeaderStyle = () => ({
  background: getBackgroundColor(),
  fontSize: '14px',
  fontWeight: getFontWeight(),
  display: 'flex',
  alignItems: 'center',
  paddingLeft: `${folderPaddingLeft.value}px`,  // 使用文件夹缩进
  paddingRight: '15px',  // 统一右侧间距
  paddingTop: '12px',
  paddingBottom: '12px',
  cursor: 'pointer',
  borderBottom: '1px solid #e9ecef',
  color: '#262626',  // 更深的颜色，提升锐利度
  transition: 'all 0.2s'
})

const getBackgroundColor = () => {
  const depth = props.depth || 0
  const isExpanded = props.expandedFolders[folderPath.value]

  if (depth === 0) {
    return isExpanded ? '#dee2e6' : '#f8f9fa'
  } else if (depth === 1) {
    return isExpanded ? '#e8e8e8' : '#fafafa'
  } else {
    return isExpanded ? '#e0e0e0' : '#f5f5f5'
  }
}

const getFontWeight = () => {
  const depth = props.depth || 0
  if (depth === 0) return '600'
  if (depth === 1) return '500'
  return '400'
}

const getItemStyle = () => ({
  display: 'flex',
  alignItems: 'center',
  padding: '12px 0',
  cursor: 'pointer',
  borderBottom: '1px solid #f0f0f0',
  transition: 'all 0.2s',
  background: 'white'
})

const getItemContentStyle = () => ({
  paddingLeft: `${itemPaddingLeft.value}px`,  // 使用项目缩进
  display: 'flex',
  justifyContent: 'flex-start',
  alignItems: 'center',
  width: '100%',
  minHeight: '20px'
})

// 静态样式
const iconStyle = {
  marginRight: '8px',
  fontSize: '14px',
  color: '#595959'  // 优化图标颜色，提升可见度
}

const titleStyle = {
  flex: '1',
  fontSize: '14px'
}

const countStyle = {
  fontSize: '12px',
  color: '#595959',  // 优化数量显示颜色
  marginLeft: '4px'
}

const contentStyle = {
  background: 'white',
  borderLeft: '2px solid #f0f0f0'
}

const fileIconStyle = {
  marginRight: '8px',
  fontSize: '14px',
  color: '#434343'  // 优化文件图标颜色，提升锐利度
}

const itemLabelStyle = {
  fontSize: '14px',
  color: '#262626',  // 优化项目标签颜色，提升锐利度
  lineHeight: '1.4'
}

// 事件处理
const onMouseEnter = (e: Event) => {
  const target = e.target as HTMLElement
  const depth = props.depth || 0
  if (!props.expandedFolders[folderPath.value]) {
    target.style.background = depth === 0 ? '#e9ecef' :
        depth === 1 ? '#f0f0f0' : '#ebebeb'
  }
  target.style.color = '#000000'  // 悬停时使用更深的颜色
}

const onMouseLeave = (e: Event) => {
  const target = e.target as HTMLElement
  const depth = props.depth || 0
  target.style.background = props.expandedFolders[folderPath.value] ?
      (depth === 0 ? '#dee2e6' : depth === 1 ? '#e8e8e8' : '#e0e0e0') :
      (depth === 0 ? '#f8f9fa' : depth === 1 ? '#fafafa' : '#f5f5f5')
  target.style.color = '#262626'  // 恢复为默认的锐利颜色
}

const onItemMouseEnter = (e: Event) => {
  const target = e.target as HTMLElement
  target.style.backgroundColor = '#e6f7ff'
  target.style.borderRight = '3px solid #1890ff'
}

const onItemMouseLeave = (e: Event) => {
  const target = e.target as HTMLElement
  if (props.tableConfig.name !== (e.target as any).closest('.table-item')?.querySelector('.item-label')?.title) {
    target.style.backgroundColor = 'white'
    target.style.borderRight = 'none'
  }
}
</script>

<style lang="less" scoped>
/* 高亮搜索文字样式 */
.highlight-text {
  background-color: #ff4d4f !important;
  color: #fff !important;
  font-weight: bold !important;
  padding: 1px 3px;
  border-radius: 3px;
  box-shadow: 0 1px 2px rgba(255, 77, 79, 0.3);
}

/* 确保 v-html渲染的高亮样式正确显示 */
:deep(.highlight-text) {
  background-color: #ff4d4f !important;
  color: #fff !important;
  font-weight: bold !important;
  padding: 1px 3px !important;
  border-radius: 3px !important;
  box-shadow: 0 1px 2px rgba(255, 77, 79, 0.3) !important;
}

.folder-group {
  margin: 0;
}

.folder-header {
  transition: all 0.2s ease;
}

.folder-content {
  background: white;
  border-left: 2px solid #f0f0f0;
}

.table-item {
  transition: all 0.2s ease;
}

.table-item:hover {
  background-color: #e6f7ff !important;
  border-right: 3px solid #1890ff !important;
}

.activate-item {
  background-color: #e6f7ff !important;
  border-right: 3px solid #1890ff !important;
}

.file-icon {
  margin-right: 8px;
  font-size: 14px;
  color: #8c8c8c;
}

.item-label {
  font-size: 14px;
  color: #262626;
  line-height: 1.4;
}
</style>

<style lang="less" scoped>
.folder-group {
  border-bottom: 1px solid #f0f0f0;
}

.folder-header {
  display: flex;
  align-items: center;
  padding: 12px 15px;
  cursor: pointer;
  background: #f8f9fa !important;
  border-bottom: 1px solid #e9ecef;
  font-weight: 600;
  color: #262626 !important;  /* 优化文件夹标题颜色 */
  transition: all 0.2s;
  font-size: 14px !important;
}

.folder-header:hover {
  background: #e9ecef !important;
  color: #000000 !important;  /* 悬停时使用更深的颜色 */
}

.folder-header.folder-expanded {
  background: #dee2e6 !important;
  color: #000000 !important;  /* 展开时使用更深的颜色 */
}

/* 根据深度的样式类 */
.folder-depth-0 {
  background: #f8f9fa !important;
  font-weight: 600 !important;
  font-size: 14px !important;
  color: #262626 !important;  /* 优化第一层文件夹颜色 */
}

.folder-depth-0:hover {
  background: #e9ecef !important;
  color: #000000 !important;
}

.folder-depth-0.folder-expanded {
  background: #dee2e6 !important;
  color: #000000 !important;
}

.folder-depth-1 {
  background: #fafafa !important;
  font-weight: 500 !important;
  font-size: 14px !important;
  color: #262626 !important;  /* 优化第二层文件夹颜色 */
}

.folder-depth-1:hover {
  background: #f0f0f0 !important;
  color: #000000 !important;
}

.folder-depth-1.folder-expanded {
  background: #e8e8e8 !important;
  color: #000000 !important;
}

.folder-depth-2,
.folder-depth-3 {
  background: #f5f5f5 !important;
  font-weight: 400 !important;
  font-size: 14px !important;
  color: #262626 !important;  /* 优化第三层及更深层文件夹颜色 */
}

.folder-depth-2:hover,
.folder-depth-3:hover {
  background: #ebebeb !important;
  color: #000000 !important;
}

.folder-depth-2.folder-expanded,
.folder-depth-3.folder-expanded {
  background: #e0e0e0 !important;
  color: #000000 !important;
}

.folder-icon {
  margin-right: 8px;
  font-size: 14px !important;
  color: #595959 !important;  /* 优化图标颜色 */
}

.folder-title {
  flex: 1;
  font-size: 14px !important;
}

.folder-count {
  font-size: 12px;
  color: #595959;  /* 优化数量显示颜色 */
  margin-left: 4px;
}

.folder-content {
  background: white;
  border-left: 2px solid #f0f0f0;
}

.table-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: all 0.2s;
  background: white;
}

.table-item:hover {
  background-color: #e6f7ff;
  border-right: 3px solid #1890ff;
}

.table-item:last-child {
  border-bottom: 1px solid #f0f0f0;
}

.table-item .item-content {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  width: 100%;
  min-height: 20px;
}

.file-icon {
  margin-right: 8px;
  font-size: 14px;
  color: #8c8c8c;
}

.item-label {
  font-size: 14px;
  color: #262626;
  line-height: 1.4;
}

.activate-item {
  background-color: #e6f7ff;
  border-right: 3px solid #1890ff;
}
</style>