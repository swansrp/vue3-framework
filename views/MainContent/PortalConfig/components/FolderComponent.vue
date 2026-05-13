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
      ></span>
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
        @contextmenu.prevent="(e) => handleContextMenu(e, item)"
      >
        <div
          :style="getItemContentStyle()"
          class="item-content"
        >
          <FileTextOutlined
            :style="fileIconStyle"
            class="file-icon"
          />
          <span
            :style="itemLabelStyle"
            :title="item.shortLabel || item.label"
            class="item-label"
            v-html="highlightSearchText(item.shortLabel || item.label)"
          ></span>
        </div>
      </div>
      <!-- 右键菜单 -->
      <teleport to="body">
        <div
          v-if="contextMenuVisible && tableList.length !== 0 && selectedRole === '0'"
          class="context-menu-overlay"
          @click="contextMenuVisible = false"
          @contextmenu.prevent="contextMenuVisible = false"
        >
          <a-menu
            :style="{
              position: 'fixed',
              left: contextMenuPosition.x + 'px',
              top: contextMenuPosition.y + 'px',
              zIndex: 9999
            }"
            @click="handleMenuClick"
          >
            <a-menu-item key="0">
              <UndoOutlined />
              恢复
            </a-menu-item>
            <a-menu-item key="1">
              <CopyOutlined />
              复制
            </a-menu-item>
            <a-menu-divider />
            <a-menu-item
              key="2"
              danger
            >
              <DeleteOutlined />
              删除
            </a-menu-item>
          </a-menu>
        </div>
      </teleport>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { CaretDownOutlined, CaretRightOutlined, FileTextOutlined, FolderOutlined, UndoOutlined, CopyOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import { Modal } from 'ant-design-vue'
import { computed, ref } from 'vue'

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

// 定义 emits
const emit = defineEmits(['refresh-config', 'open-copy-modal', 'delete-config'])

// 右键菜单状态
const contextMenuVisible = ref(false)
const contextMenuItem = ref<any>(null)
const contextMenuPosition = ref({ x: 0, y: 0 })

// 菜单点击处理
const handleMenuClick = ({ key }: { key: string | number }) => {
  contextMenuVisible.value = false
  const menuKey = String(key)
  if (menuKey === '0') {
    Modal.confirm({
      title: '注意',
      content: '即将恢复该配置到默认状态',
      onOk: () => handleRefreshConfig()
    })
  } else if (menuKey === '1') {
    handleOpenCopyModal()
  } else if (menuKey === '2') {
    Modal.confirm({
      title: '注意',
      content: '即将删除该配置',
      okType: 'danger',
      onOk: () => handleDeleteConfig()
    })
  }
}

// 处理右键菜单
const handleContextMenu = (e: MouseEvent, item: any) => {
  if (props.tableList.length === 0 || props.selectedRole !== '0') {
    return
  }
  e.preventDefault()
  // 右键时同时执行选中操作,加载配置详情
  props.getTableConfigByName(item.value)
  contextMenuItem.value = item
  contextMenuPosition.value = { x: e.clientX, y: e.clientY }
  contextMenuVisible.value = true
}

// 菜单操作处理
const handleRefreshConfig = () => {
  if (contextMenuItem.value) {
    emit('refresh-config', contextMenuItem.value.value)
    contextMenuVisible.value = false
  }
}

const handleOpenCopyModal = () => {
  if (contextMenuItem.value) {
    emit('open-copy-modal', contextMenuItem.value)
    contextMenuVisible.value = false
  }
}

const handleDeleteConfig = () => {
  if (contextMenuItem.value) {
    emit('delete-config', contextMenuItem.value.value)
    contextMenuVisible.value = false
  }
}

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
  transition: 'all 0.15s'
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
  transition: 'all 0.15s',
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

// 事件处理 - 文件夹头部
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

.context-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9998;
  background: transparent;
}

.folder-header {
  transition: all 0.15s ease;
}

.folder-content {
  background: var(--bg-elevated);
  border-left: 2px solid var(--border-subtle);
}

.table-item {
  transition: background-color 0.15s ease, box-shadow 0.15s ease;
  position: relative;
  border-left: 4px solid transparent;
}

.table-item:hover:not(.activate-item) {
  background-color: var(--accent-soft) !important;
  border-left-color: var(--accent-mid) !important;
}

.activate-item {
  background-color: var(--accent-soft) !important;
  border-left-color: var(--accent) !important;
  box-shadow: inset 2px 0 4px rgba(79, 108, 247, 0.1) !important;
}

.file-icon {
  margin-right: 8px;
  font-size: 14px;
  color: var(--text-tertiary);
}

.item-label {
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.4;
}
</style>

<style lang="less" scoped>
.folder-group {
  border-bottom: 1px solid var(--border-subtle);
}

.folder-header {
  display: flex;
  align-items: center;
  padding: 12px 15px;
  cursor: pointer;
  background: var(--bg-hover) !important;
  border-bottom: 1px solid var(--border-subtle);
  font-weight: 600;
  color: var(--text-primary) !important;
  transition: all 0.15s;
  font-size: 14px !important;
}

.folder-header:hover {
  background: var(--bg-hover) !important;
  color: var(--text-primary) !important;  /* 悬停时使用更深的颜色 */
}

.folder-header.folder-expanded {
  background: var(--bg-active) !important;
  color: var(--text-primary) !important;  /* 展开时使用更深的颜色 */
}

/* 根据深度的样式类 */
.folder-depth-0 {
  background: var(--bg-hover) !important;
  font-weight: 600 !important;
  font-size: 14px !important;
  color: var(--text-primary) !important;  /* 优化第一层文件夹颜色 */
}

.folder-depth-0:hover {
  background: var(--bg-active) !important;
  color: var(--text-primary) !important;
}

.folder-depth-0.folder-expanded {
  background: var(--bg-active) !important;
  color: var(--text-primary) !important;
}

.folder-depth-1 {
  background: var(--bg-hover) !important;
  font-weight: 500 !important;
  font-size: 14px !important;
  color: var(--text-primary) !important;  /* 优化第二层文件夹颜色 */
}

.folder-depth-1:hover {
  background: var(--bg-hover) !important;
  color: var(--text-primary) !important;
}

.folder-depth-1.folder-expanded {
  background: var(--bg-active) !important;
  color: var(--text-primary) !important;
}

.folder-depth-2,
.folder-depth-3 {
  background: var(--bg-hover) !important;
  font-weight: 400 !important;
  font-size: 14px !important;
  color: var(--text-primary) !important;  /* 优化第三层及更深层文件夹颜色 */
}

.folder-depth-2:hover,
.folder-depth-3:hover {
  background: var(--bg-hover) !important;
  color: var(--text-primary) !important;
}

.folder-depth-2.folder-expanded,
.folder-depth-3.folder-expanded {
  background: var(--bg-active) !important;
  color: var(--text-primary) !important;
}

.folder-icon {
  margin-right: 8px;
  font-size: 14px !important;
  color: var(--text-secondary) !important;  /* 优化图标颜色 */
}

.folder-title {
  flex: 1;
  font-size: 14px !important;
}

.folder-count {
  font-size: 12px;
  color: var(--text-secondary);  /* 优化数量显示颜色 */
  margin-left: 4px;
}

.folder-content {
  background: var(--bg-elevated);
  border-left: 2px solid var(--border-subtle);
}

.table-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
  cursor: pointer;
  border-bottom: 1px solid var(--border-subtle);
  transition: background-color 0.15s ease, box-shadow 0.15s ease;
  background: var(--bg-elevated);
  position: relative;
  border-left: 4px solid transparent;
}

.table-item:hover:not(.activate-item) {
  background-color: var(--accent-soft);
  border-left-color: var(--accent-mid);
}

.table-item:last-child {
  border-bottom: 1px solid var(--border-subtle);
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
  color: var(--text-tertiary);
}

.item-label {
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.4;
}

.activate-item {
  background-color: var(--accent-soft);
  border-left-color: var(--accent);
  box-shadow: inset 2px 0 4px rgba(79, 108, 247, 0.1);
}
</style>