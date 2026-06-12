<script setup lang="ts">
/**
 * Tiptap编辑器工具栏组件
 */
import {
  AlignCenterOutlined,
  AlignLeftOutlined,
  AlignRightOutlined,
  BoldOutlined,
  CheckSquareOutlined,
  CodeOutlined,
  SplitCellsOutlined,
  FilePdfOutlined,
  FontColorsOutlined,
  HighlightOutlined,
  ItalicOutlined,
  LineOutlined,
  LinkOutlined,
  MenuOutlined,
  OrderedListOutlined,
  PictureOutlined,
  RedoOutlined,
  StrikethroughOutlined,
  TableOutlined,
  UnderlineOutlined,
  UndoOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons-vue'
import type { Editor } from '@tiptap/vue-3'
import { message } from 'ant-design-vue'

import { exportTiptapToPdf } from './export-pdf'
import { CODE_LANGUAGES } from './types'

import { FIELD_TYPE } from '@/framework/components/common/Portal/type'

const props = defineProps<{
  editor: Editor | undefined
  /** 是否显示导出PDF按钮 */
  exportPdf?: boolean
  /** 导出PDF文件名（不含扩展名） */
  exportPdfFileName?: string
}>()

const { editor, exportPdf, exportPdfFileName } = toRefs(props)

// 导出PDF
const exportPdfLoading = ref(false)
const handleExportPdf = async () => {
  if (!editor.value) return
  const html = editor.value.getHTML()
  if (!html || editor.value.isEmpty) {
    message.warning('编辑器内容为空，无法导出')
    return
  }
  exportPdfLoading.value = true
  try {
    const ok = await exportTiptapToPdf(html, { fileName: exportPdfFileName.value || 'document' })
    if (ok) {
      message.success('PDF导出成功')
    } else {
      message.error('PDF导出失败')
    }
  } catch {
    message.error('PDF导出失败')
  } finally {
    exportPdfLoading.value = false
  }
}

// 标题级别选项
const headingOptions = [
  { label: '正文', value: 0 },
  { label: '标题1', value: 1 },
  { label: '标题2', value: 2 },
  { label: '标题3', value: 3 },
  { label: '标题4', value: 4 },
  { label: '标题5', value: 5 },
  { label: '标题6', value: 6 },
]

// 当前标题级别
const currentHeading = computed(() => {
  if (!editor.value) return 0
  for (let i = 1; i <= 6; i++) {
    if (editor.value.isActive('heading', { level: i })) {
      return i
    }
  }
  return 0
})

// 设置标题
const setHeading = (level: number) => {
  if (!editor.value) return
  if (level === 0) {
    editor.value.chain().focus().setParagraph().run()
  } else {
    editor.value.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 }).run()
  }
}

// 颜色相关
const textColor = ref('#000000')
const bgColor = ref('#ffff00')

const setTextColor = (color: string) => {
  textColor.value = color
  editor.value?.chain().focus().setColor(color).run()
}

const setBgColor = (color: string) => {
  bgColor.value = color
  editor.value?.chain().focus().toggleHighlight({ color }).run()
}

// 链接相关
const linkModalVisible = ref(false)
const linkUrl = ref('')

const openLinkModal = () => {
  const previousUrl = editor.value?.getAttributes('link').href || ''
  linkUrl.value = previousUrl
  linkModalVisible.value = true
}

const setLink = () => {
  if (!linkUrl.value) {
    editor.value?.chain().focus().unsetLink().run()
  } else {
    editor.value?.chain().focus().extendMarkRange('link').setLink({ href: linkUrl.value }).run()
  }
  linkModalVisible.value = false
  linkUrl.value = ''
}

// 图片相关
const uploadFileRef = ref()

const openImageModal = () => {
  // 使用 upload-file 组件上传图片
  uploadFileRef.value?.showUploadDialogBox(FIELD_TYPE.IMAGE) // '2' 表示图片类型
}

const handleImageUpload = (url: string) => {
  if (url) {
    editor.value?.chain().focus().setImage({ src: url }).run()
  }
}

// 表格相关
const tableModalVisible = ref(false)
const tableRows = ref(3)
const tableCols = ref(3)

const openTableModal = () => {
  tableRows.value = 3
  tableCols.value = 3
  tableModalVisible.value = true
}

const insertTable = () => {
  editor.value?.chain()
    .focus()
    .insertTable({
      rows: tableRows.value,
      cols: tableCols.value,
      withHeaderRow: true
    })
    // 关键：表格后强制添加一个段落，防止光标跳转
    .insertContent({ type: 'paragraph' })
    .run()
  tableModalVisible.value = false
}

// 代码块语言
const codeLanguageVisible = ref(false)
const selectedLanguage = ref('plaintext')

const openCodeLanguageModal = () => {
  const node = editor.value?.getAttributes('codeBlock')
  selectedLanguage.value = node?.language || 'plaintext'
  codeLanguageVisible.value = true
}

const setCodeLanguage = () => {
  editor.value?.chain()
    .focus()
    .setCodeBlock({ language: selectedLanguage.value })
    // 关键：代码块后强制添加一个段落，防止光标跳转
    .insertContent({ type: 'paragraph' })
    .run()
  codeLanguageVisible.value = false
}

const toggleCodeBlock = () => {
  if (editor.value?.isActive('codeBlock')) {
    editor.value.chain().focus().toggleCodeBlock().run()
  } else {
    openCodeLanguageModal()
  }
}

// 分栏相关
const columnModalVisible = ref(false)
const columnCount = ref(2)

const openColumnModal = () => {
  columnCount.value = 2
  columnModalVisible.value = true
}

const insertColumns = () => {
  editor.value?.chain()
    .focus()
    .setColumns(columnCount.value)
    // 关键：分栏后强制添加一个段落，防止光标跳转
    .insertContent({ type: 'paragraph' })
    .run()
  columnModalVisible.value = false
}
</script>

<template>
  <div
    v-if="editor"
    class="tiptap-toolbar"
  >
    <!-- 撤销/重做 -->
    <div class="toolbar-group">
      <a-tooltip title="撤销">
        <a-button
          type="text"
          size="small"
          :disabled="!editor.can().undo()"
          @click="editor.chain().focus().undo().run()"
        >
          <template #icon>
            <undo-outlined />
          </template>
        </a-button>
      </a-tooltip>
      <a-tooltip title="重做">
        <a-button
          type="text"
          size="small"
          :disabled="!editor.can().redo()"
          @click="editor.chain().focus().redo().run()"
        >
          <template #icon>
            <redo-outlined />
          </template>
        </a-button>
      </a-tooltip>
    </div>

    <a-divider type="vertical" />

    <!-- 标题 -->
    <div class="toolbar-group">
      <a-select
        :value="currentHeading"
        size="small"
        style="width: 90px"
        :options="headingOptions"
        @change="(val: any) => setHeading(val as number)"
      />
    </div>

    <a-divider type="vertical" />

    <!-- 文字样式 -->
    <div class="toolbar-group">
      <a-tooltip title="粗体">
        <a-button
          type="text"
          size="small"
          :class="{ 'is-active': editor.isActive('bold') }"
          @click="editor.chain().focus().toggleBold().run()"
        >
          <template #icon>
            <bold-outlined />
          </template>
        </a-button>
      </a-tooltip>
      <a-tooltip title="斜体">
        <a-button
          type="text"
          size="small"
          :class="{ 'is-active': editor.isActive('italic') }"
          @click="editor.chain().focus().toggleItalic().run()"
        >
          <template #icon>
            <italic-outlined />
          </template>
        </a-button>
      </a-tooltip>
      <a-tooltip title="下划线">
        <a-button
          type="text"
          size="small"
          :class="{ 'is-active': editor.isActive('underline') }"
          @click="editor.chain().focus().toggleUnderline().run()"
        >
          <template #icon>
            <underline-outlined />
          </template>
        </a-button>
      </a-tooltip>
      <a-tooltip title="删除线">
        <a-button
          type="text"
          size="small"
          :class="{ 'is-active': editor.isActive('strike') }"
          @click="editor.chain().focus().toggleStrike().run()"
        >
          <template #icon>
            <strikethrough-outlined />
          </template>
        </a-button>
      </a-tooltip>
    </div>

    <a-divider type="vertical" />

    <!-- 颜色 -->
    <div class="toolbar-group">
      <a-popover
        trigger="click"
        placement="bottom"
      >
        <template #content>
          <div class="color-picker">
            <div class="color-presets">
              <span
                v-for="color in ['#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ff8000', '#8000ff', '#808080']"
                :key="color"
                class="color-item"
                :style="{ backgroundColor: color }"
                @click="setTextColor(color)"
              ></span>
            </div>
            <input
              type="color"
              :value="textColor"
              @input="(e: Event) => setTextColor((e.target as HTMLInputElement).value)"
            />
          </div>
        </template>
        <a-tooltip title="文字颜色">
          <a-button
            type="text"
            size="small"
          >
            <template #icon>
              <font-colors-outlined :style="{ color: textColor }" />
            </template>
          </a-button>
        </a-tooltip>
      </a-popover>

      <a-popover
        trigger="click"
        placement="bottom"
      >
        <template #content>
          <div class="color-picker">
            <div class="color-presets">
              <span
                v-for="color in ['#ffff00', '#00ff00', '#00ffff', '#ff00ff', '#ff0000', '#0000ff', '#ff8000', '#8000ff', '#ffc0cb', '#e0e0e0']"
                :key="color"
                class="color-item"
                :style="{ backgroundColor: color }"
                @click="setBgColor(color)"
              ></span>
            </div>
            <input
              type="color"
              :value="bgColor"
              @input="(e: Event) => setBgColor((e.target as HTMLInputElement).value)"
            />
          </div>
        </template>
        <a-tooltip title="背景颜色">
          <a-button
            type="text"
            size="small"
            :class="{ 'is-active': editor.isActive('highlight') }"
          >
            <template #icon>
              <highlight-outlined />
            </template>
          </a-button>
        </a-tooltip>
      </a-popover>
    </div>

    <a-divider type="vertical" />

    <!-- 对齐 -->
    <div class="toolbar-group">
      <a-tooltip title="左对齐">
        <a-button
          type="text"
          size="small"
          :class="{ 'is-active': editor.isActive({ textAlign: 'left' }) }"
          @click="editor.chain().focus().setTextAlign('left').run()"
        >
          <template #icon>
            <align-left-outlined />
          </template>
        </a-button>
      </a-tooltip>
      <a-tooltip title="居中对齐">
        <a-button
          type="text"
          size="small"
          :class="{ 'is-active': editor.isActive({ textAlign: 'center' }) }"
          @click="editor.chain().focus().setTextAlign('center').run()"
        >
          <template #icon>
            <align-center-outlined />
          </template>
        </a-button>
      </a-tooltip>
      <a-tooltip title="右对齐">
        <a-button
          type="text"
          size="small"
          :class="{ 'is-active': editor.isActive({ textAlign: 'right' }) }"
          @click="editor.chain().focus().setTextAlign('right').run()"
        >
          <template #icon>
            <align-right-outlined />
          </template>
        </a-button>
      </a-tooltip>
    </div>

    <a-divider type="vertical" />

    <!-- 列表 -->
    <div class="toolbar-group">
      <a-tooltip title="无序列表">
        <a-button
          type="text"
          size="small"
          :class="{ 'is-active': editor.isActive('bulletList') }"
          @click="editor.chain().focus().toggleBulletList().run()"
        >
          <template #icon>
            <unordered-list-outlined />
          </template>
        </a-button>
      </a-tooltip>
      <a-tooltip title="有序列表">
        <a-button
          type="text"
          size="small"
          :class="{ 'is-active': editor.isActive('orderedList') }"
          @click="editor.chain().focus().toggleOrderedList().run()"
        >
          <template #icon>
            <ordered-list-outlined />
          </template>
        </a-button>
      </a-tooltip>
      <a-tooltip title="任务列表">
        <a-button
          type="text"
          size="small"
          :class="{ 'is-active': editor.isActive('taskList') }"
          @click="editor.chain().focus().toggleTaskList().run()"
        >
          <template #icon>
            <check-square-outlined />
          </template>
        </a-button>
      </a-tooltip>
    </div>

    <a-divider type="vertical" />

    <!-- 插入 -->
    <div class="toolbar-group">
      <a-tooltip title="插入链接">
        <a-button
          type="text"
          size="small"
          :class="{ 'is-active': editor.isActive('link') }"
          @click="openLinkModal"
        >
          <template #icon>
            <link-outlined />
          </template>
        </a-button>
      </a-tooltip>
      <a-tooltip title="插入图片">
        <a-button
          type="text"
          size="small"
          @click="openImageModal"
        >
          <template #icon>
            <picture-outlined />
          </template>
        </a-button>
      </a-tooltip>
      <a-tooltip title="插入表格">
        <a-button
          type="text"
          size="small"
          @click="openTableModal"
        >
          <template #icon>
            <table-outlined />
          </template>
        </a-button>
      </a-tooltip>
      <a-tooltip title="代码块">
        <a-button
          type="text"
          size="small"
          :class="{ 'is-active': editor.isActive('codeBlock') }"
          @click="toggleCodeBlock"
        >
          <template #icon>
            <code-outlined />
          </template>
        </a-button>
      </a-tooltip>
      <a-tooltip title="引用">
        <a-button
          type="text"
          size="small"
          :class="{ 'is-active': editor.isActive('blockquote') }"
          @click="editor.chain().focus().toggleBlockquote().run()"
        >
          <template #icon>
            <menu-outlined />
          </template>
        </a-button>
      </a-tooltip>
      <a-tooltip title="水平分割线">
        <a-button
          type="text"
          size="small"
          @click="editor.chain().focus().setHorizontalRule().run()"
        >
          <template #icon>
            <line-outlined />
          </template>
        </a-button>
      </a-tooltip>
      <a-tooltip title="插入分栏">
        <a-button
          type="text"
          size="small"
          :class="{ 'is-active': editor.isActive('columnBlock') }"
          @click="openColumnModal"
        >
          <template #icon>
            <split-cells-outlined />
          </template>
        </a-button>
      </a-tooltip>
    </div>

    <!-- 导出PDF（最右侧） -->
    <div v-if="exportPdf" class="toolbar-group" style="margin-left: auto;">
      <a-divider type="vertical" />
      <a-tooltip title="导出PDF">
        <a-button
          type="text"
          size="small"
          :loading="exportPdfLoading"
          @click="handleExportPdf"
        >
          <template #icon>
            <file-pdf-outlined />
          </template>
        </a-button>
      </a-tooltip>
    </div>

    <!-- 链接弹窗 -->
    <a-modal
      v-model:open="linkModalVisible"
      title="插入链接"
      :width="400"
      @ok="setLink"
    >
      <a-input
        v-model:value="linkUrl"
        placeholder="请输入链接地址"
      />
    </a-modal>

    <!-- 图片上传组件 -->
    <upload-file
      ref="uploadFileRef"
      folder="wiki"
      use-original-file-name
      @update:url="handleImageUpload"
    />

    <!-- 表格弹窗 -->
    <a-modal
      v-model:open="tableModalVisible"
      title="插入表格"
      :width="300"
      @ok="insertTable"
    >
      <a-form layout="vertical">
        <a-form-item label="行数">
          <a-input-number
            v-model:value="tableRows"
            :min="1"
            :max="20"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="列数">
          <a-input-number
            v-model:value="tableCols"
            :min="1"
            :max="10"
            style="width: 100%"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 代码语言弹窗 -->
    <a-modal
      v-model:open="codeLanguageVisible"
      title="选择代码语言"
      :width="300"
      @ok="setCodeLanguage"
    >
      <a-select
        v-model:value="selectedLanguage"
        :options="CODE_LANGUAGES"
        style="width: 100%"
        show-search
        :filter-option="(input: string, option: any) => option.label.toLowerCase().includes(input.toLowerCase())"
      />
    </a-modal>

    <!-- 分栏弹窗 -->
    <a-modal
      v-model:open="columnModalVisible"
      title="插入分栏"
      :width="300"
      @ok="insertColumns"
    >
      <a-form layout="vertical">
        <a-form-item label="栏数">
          <a-input-number
            v-model:value="columnCount"
            :min="2"
            :max="4"
            style="width: 100%"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped lang="less">
.tiptap-toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px 12px;
  border-bottom: 1px solid #e8e8e8;
  background: #fafafa;

  .toolbar-group {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .ant-btn {
    &.is-active {
      background-color: #e6f7ff;
      color: #1890ff;
    }
  }

  .ant-divider {
    height: 20px;
    margin: 0 4px;
  }
}

.color-picker {
  .color-presets {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 8px;
    width: 140px;

    .color-item {
      width: 20px;
      height: 20px;
      border-radius: 2px;
      cursor: pointer;
      border: 1px solid #d9d9d9;

      &:hover {
        transform: scale(1.1);
      }
    }
  }

  input[type='color'] {
    width: 100%;
    height: 30px;
    border: none;
    cursor: pointer;
  }
}
</style>
