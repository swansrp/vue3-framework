<script lang="ts" setup>
import { ExclamationCircleOutlined, LockOutlined, PlusOutlined, ReloadOutlined, UnlockOutlined } from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'
import type { Key } from 'ant-design-vue/es/_util/type'
import { h, onMounted, ref, watch } from 'vue'

import { buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { request } from '@/framework/network/request'

interface ListItem {
  id: string | number
  key: string | number
  title: string
  [key: string]: any
}

interface Props {
  /** API URL前缀，如 '/enterprise/evalProduct' */
  urlPrefix: string
  /** 列表的标题 */
  title?: string
  /** 模式：normal(单体) | bind(绑定关系) */
  mode?: 'normal' | 'bind'
  /** 是否只读模式 */
  readonly?: boolean
  /** 是否显示刷新按钮 */
  showRefresh?: boolean
  /** 是否启用搜索功能 */
  searchable?: boolean
  /** 是否启用拖拽排序 */
  draggable?: boolean
  /** 是否允许多选 */
  multiSelect?: boolean
  /** 实体ID（bind模式必填） */
  entityId?: string | number
  /** 标题字段名 */
  titleField?: string
  /** 值字段名 */
  valueField?: string
  /** 每页条数 */
  pageSize?: number
  /** 列表数据接口路径后缀，默认 '/advanced/query' */
  queryApi?: string
  /** 新增接口路径后缀，默认 '/insert' */
  insertApi?: string
  /** 更新接口路径后缀，默认 '/update' */
  updateApi?: string
  /** 删除接口路径后缀，默认 '/delete' */
  deleteApi?: string
  /** 详情接口路径后缀，如 '/id'，设置后点击节点会自动获取详情 */
  detailApi?: string
  /** 排序更新接口路径后缀，默认 '/order/update' */
  orderUpdateApi?: string
  /** 新增时的默认表单数据 */
  defaultFormData?: Record<string, any>
  /** 自定义查询请求构造函数 */
  customQueryBuilder?: (params: {
    keyword?: string
    entityId?: string | number
    pagination?: { current: number; pageSize: number }
    strict?: boolean
  }) => any
}

const props = withDefaults(defineProps<Props>(), {
  title: '列表数据',
  mode: 'normal',
  readonly: false,
  showRefresh: true,
  searchable: true,
  draggable: false,
  multiSelect: false,
  titleField: 'title',
  valueField: 'id',
  pageSize: 50,
  queryApi: '/advanced/query',
  insertApi: '/insert',
  updateApi: '/update',
  deleteApi: '/delete',
  detailApi: '/id',
  orderUpdateApi: '/order/update',
  defaultFormData: () => ({})
})

const emit = defineEmits<{
  (e: 'select', itemId: string | number, itemInfo: any): void
  (e: 'selectChange', selectedKeys: (string | number)[]): void
  (e: 'refresh'): void
  (e: 'loaded', listData: ListItem[], total: number): void
}>()

// 列表数据
const listData = ref<ListItem[]>([])
const loading = ref(false)
const selectedKeys = ref<Key[]>([])
const currentSelectedKey = ref<Key | null>(null)

// 分页
const currentPage = ref(1)
const total = ref(0)

// 搜索
const searchValue = ref('')
const searchStrict = ref(false)

// 编辑对话框
const editModalVisible = ref(false)
const editingItem = ref<ListItem | null>(null)
const formData = ref<Record<string, any>>({
  id: '',
  title: ''
})

// 表单引用（用于校验）
const formRef = ref<any>(null)

// 根据 key 查找项
const findItemByKey = (items: ListItem[], key: string | number): ListItem | null => {
  return items.find((item) => item.key === key || item.id === key) || null
}

// 构建查询请求
const buildQueryRequest = () => {
  if (props.customQueryBuilder) {
    return props.customQueryBuilder({
      keyword: searchValue.value,
      entityId: props.entityId,
      pagination: { current: currentPage.value, pageSize: props.pageSize },
      strict: searchStrict.value
    })
  }

  // 默认请求结构
  const request: any = {
    currentPage: currentPage.value,
    pageSize: props.pageSize
  }

  // 添加搜索条件
  if (searchValue.value) {
    request.conditionList = [
      {
        property: props.titleField,
        relation: searchStrict.value ? 1 : 3, // 1: EQUAL, 3: LIKE
        value: [searchValue.value]
      }
    ]
  }

  // bind 模式添加 entityId
  if (props.mode === 'bind' && props.entityId) {
    request.entityId = props.entityId
  }

  return request
}

// 加载列表数据
const loadListData = async () => {
  loading.value = true
  try {
    const api = buildPostApiByType(`${props.urlPrefix}${props.queryApi}`, '')
    const requestData = buildQueryRequest()
    const res = await request(api, {}, requestData, false, false)

    if (res?.payload) {
      // 处理分页数据
      const records = res.payload.records || res.payload || []
      total.value = res.payload.total || records.length

      // 转换数据格式
      listData.value = records.map((item: any) => ({
        ...item,
        key: item[props.valueField] || item.id,
        title: item[props.titleField] || item.title || item.name || ''
      }))

      emit('loaded', listData.value, total.value)
    }
  } catch (error) {
    message.error('加载列表数据失败')
  } finally {
    loading.value = false
  }
}

// 暴露方法给父组件
defineExpose({
  loadListData,
  getSelectedItem: () => {
    const key = currentSelectedKey.value
    return key ? findItemByKey(listData.value, key) : null
  },
  getSelectedItems: () => {
    return selectedKeys.value
      .map((key) => findItemByKey(listData.value, key))
      .filter(Boolean) as ListItem[]
  },
  refresh: loadListData,
  clearSelection: () => {
    selectedKeys.value = []
    currentSelectedKey.value = null
  }
})

// 处理列表项选择
const handleSelect = async (record: ListItem, selected: boolean) => {
  if (props.multiSelect) {
    // 多选模式
    if (selected) {
      if (!selectedKeys.value.includes(record.key)) {
        selectedKeys.value.push(record.key)
      }
    } else {
      selectedKeys.value = selectedKeys.value.filter((k) => k !== record.key)
    }
    emit('selectChange', selectedKeys.value as (string | number)[])
  } else {
    // 单选模式
    if (selected) {
      selectedKeys.value = [record.key]
      currentSelectedKey.value = record.key

      // 如果配置了 detailApi，则获取详情
      if (props.detailApi) {
        try {
          const api = buildGetApiByType(`${props.urlPrefix}${props.detailApi}`, '')
          const res = await request(api, { id: record.key }, {}, false, false)

          if (res?.payload) {
            emit('select', record.key, { ...record, ...res.payload, data: res.payload })
          } else {
            emit('select', record.key, record)
          }
        } catch (error) {
          console.error('获取详情失败:', error)
          emit('select', record.key, record)
        }
      } else {
        emit('select', record.key, record)
      }
    } else {
      selectedKeys.value = []
      currentSelectedKey.value = null
    }
  }
}

// 刷新列表
const handleRefresh = () => {
  loadListData()
  emit('refresh')
}

// 搜索
const handleSearch = () => {
  currentPage.value = 1
  loadListData()
}

// 切换搜索模式（精确/模糊）
const toggleSearchStrict = () => {
  searchStrict.value = !searchStrict.value
}

// 分页变化
const handlePageChange = (page: number) => {
  currentPage.value = page
  loadListData()
}

// 新增项
const handleAdd = () => {
  editingItem.value = null
  formData.value = {
    id: '',
    title: '',
    ...props.defaultFormData
  }
  editModalVisible.value = true
}

// 编辑项
const handleEdit = (item: ListItem) => {
  editingItem.value = item
  formData.value = {
    ...props.defaultFormData,
    id: item.key || item.id,
    title: item.title,
    ...item
  }
  editModalVisible.value = true
}

// 复制项
const handleCopy = (item: ListItem) => {
  editingItem.value = null
  formData.value = {
    ...props.defaultFormData,
    title: `${item.title} (副本)`,
    ...item,
    id: '' // 清空ID，作为新增
  }
  editModalVisible.value = true
}

// 保存项
const handleSave = async () => {
  // 先尝试表单校验（如果插槽中使用了表单）
  if (formRef.value?.validate) {
    try {
      await formRef.value.validate()
    } catch {
      return
    }
  } else {
    if (!formData.value.title && !formData.value[props.titleField]) {
      message.error('请输入名称')
      return
    }
  }

  try {
    const submitData = {
      ...formData.value,
      [props.titleField]: formData.value.title || formData.value[props.titleField]
    }

    if (editingItem.value) {
      // 更新
      const api = buildPostApiByType(`${props.urlPrefix}${props.updateApi}`, '')
      await request(api, {}, submitData, true, true)
    } else {
      // 新增
      const api = buildPostApiByType(`${props.urlPrefix}${props.insertApi}`, '')
      await request(api, {}, submitData, true, true)
    }

    editModalVisible.value = false
    await loadListData()
  } catch (error) {
    console.error('保存失败:', error)
  }
}

// 删除项
const handleDelete = (item: ListItem) => {
  Modal.confirm({
    title: '确认删除',
    icon: () => h(ExclamationCircleOutlined),
    content: `确定要删除"${item.title}"吗？`,
    okText: '确定',
    cancelText: '取消',
    okType: 'danger',
    async onOk() {
      try {
        const api = buildPostApiByType(`${props.urlPrefix}${props.deleteApi}`, '')
        const itemId = item.key || item.id
        await request(api, { id: itemId }, { id: itemId }, true, true)
        await loadListData()
      } catch (error) {
        message.error('删除失败')
      }
    }
  })
}

// 右键菜单处理
const handleContextMenu = (item: ListItem, menuKey: string) => {
  switch (menuKey) {
    case 'view':
      // 查看详情
      emit('select', item.key, item)
      break
    case 'add':
      handleAdd()
      break
    case 'edit':
      handleEdit(item)
      break
    case 'copy':
      handleCopy(item)
      break
    case 'delete':
      handleDelete(item)
      break
    default:
      break
  }
}

// 初始化
onMounted(() => {
  loadListData()
})

// 监听 urlPrefix 或 entityId 变化
watch(
  () => [props.urlPrefix, props.entityId],
  () => {
    currentPage.value = 1
    selectedKeys.value = []
    currentSelectedKey.value = null
    loadListData()
  }
)
</script>

<template>
  <div class="common-list-panel">
    <div class="list-header">
      <!-- 标题插槽 -->
      <slot name="headerTitle">
        <h3 class="list-title">
          {{ title }}
        </h3>
      </slot>
      <div class="list-actions">
        <!-- 操作按钮插槽 -->
        <slot
          name="headerActions"
          :loading="loading"
          :handle-add="handleAdd"
          :handle-refresh="handleRefresh"
        >
          <a-button
            v-if="!readonly"
            size="small"
            type="primary"
            @click="handleAdd"
          >
            <template #icon>
              <PlusOutlined />
            </template>
            新增
          </a-button>
          <a-button
            v-if="showRefresh"
            :loading="loading"
            size="small"
            type="text"
            @click="handleRefresh"
          >
            <template #icon>
              <ReloadOutlined />
            </template>
          </a-button>
        </slot>
      </div>
    </div>

    <!-- 搜索框 -->
    <div
      v-if="searchable"
      class="list-search"
    >
      <a-input-search
        v-model:value="searchValue"
        :placeholder="(searchStrict ? '精确' : '模糊') + '搜索'"
        enter-button
        @search="handleSearch"
      >
        <template #prefix>
          <a-tooltip :title="searchStrict ? '当前: 精确搜索' : '当前: 模糊搜索'">
            <lock-outlined
              v-if="searchStrict"
              style="cursor: pointer; margin-right: 4px"
              @click="toggleSearchStrict"
            />
            <unlock-outlined
              v-else
              style="cursor: pointer; margin-right: 4px"
              @click="toggleSearchStrict"
            />
          </a-tooltip>
        </template>
      </a-input-search>
    </div>

    <div class="list-content">
      <a-spin :spinning="loading">
        <div
          v-if="listData.length === 0 && !loading"
          class="empty-list"
        >
          <a-empty description="暂无数据" />
        </div>
        <div
          v-else
          class="list-items"
        >
          <a-dropdown
            v-for="item in listData"
            :key="item.key"
            :trigger="['contextmenu']"
          >
            <div
              class="list-item"
              :class="{
                'list-item-selected': selectedKeys.includes(item.key),
                'list-item-disabled': item.disabled
              }"
              @click="handleSelect(item, !selectedKeys.includes(item.key))"
            >
              <slot
                name="item"
                :item="item"
                :selected="selectedKeys.includes(item.key)"
              >
                <span class="item-title">{{ item.title }}</span>
              </slot>
            </div>

            <!-- 右键菜单 -->
            <template #overlay>
              <a-menu @click="({ key: menuKey }) => handleContextMenu(item, menuKey)">
                <slot
                  name="contextMenu"
                  :item="item"
                  :handle-edit="handleEdit"
                  :handle-delete="handleDelete"
                  :handle-copy="handleCopy"
                >
                  <a-menu-item key="view">
                    查看详情
                  </a-menu-item>
                  <template v-if="!readonly">
                    <a-menu-item key="add">
                      新增记录
                    </a-menu-item>
                    <a-menu-item key="edit">
                      编辑记录
                    </a-menu-item>
                    <a-menu-item key="copy">
                      复制记录
                    </a-menu-item>
                    <a-menu-item
                      key="delete"
                      style="color: #ff4d4f"
                    >
                      删除记录
                    </a-menu-item>
                  </template>
                </slot>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
      </a-spin>
    </div>

    <!-- 分页 -->
    <div
      v-if="total > pageSize"
      class="list-footer"
    >
      <a-pagination
        v-model:current="currentPage"
        :page-size="pageSize"
        :total="total"
        size="small"
        simple
        @change="handlePageChange"
      />
      <div class="list-footer-extra">
        <slot name="footerExtra"></slot>
      </div>
    </div>

    <!-- 编辑对话框 -->
    <a-modal
      v-model:open="editModalVisible"
      :title="editingItem ? '编辑' : '新增'"
      @ok="handleSave"
    >
      <!-- 插槽：供父组件自定义表单内容 -->
      <slot
        name="form"
        :editing-item="editingItem"
        :form-data="formData"
        :is-edit="!!editingItem"
        :form-ref="formRef"
      >
        <!-- 默认表单 -->
        <a-form
          :model="formData"
          layout="vertical"
        >
          <a-form-item
            label="名称"
            required
          >
            <a-input
              v-model:value="formData.title"
              placeholder="请输入名称"
            />
          </a-form-item>
        </a-form>
      </slot>
    </a-modal>
  </div>
</template>

<style lang="less" scoped>
.common-list-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f5f9ff 0%, #ffffff 100%);
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: linear-gradient(135deg, #e6f4ff 0%, #f0f5ff 100%);
  border-radius: 6px;
  margin-bottom: 12px;
  box-shadow: 0 1px 4px rgba(24, 144, 255, 0.15);

  .list-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #1890ff;
    letter-spacing: 0.5px;
    padding: 0;
  }

  .list-actions {
    display: flex;
    gap: 8px;
    align-items: center;
    margin: 0;
    padding: 0;
  }
}

.list-search {
  padding: 0 0 12px 0;
  margin-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.list-content {
  flex: 1;
  overflow: auto;
  background: #ffffff;
  border-radius: 6px;
  padding: 4px;

  .empty-list {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
  }

  .list-items {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .list-item {
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    border-left: 3px solid transparent;

    &:hover {
      background: linear-gradient(135deg, #e6f7ff 0%, #f0f9ff 100%);
      transform: translateX(2px);
      box-shadow: 0 2px 6px rgba(24, 144, 255, 0.12);
      border-left-color: #1890ff;

      .item-title {
        color: #1890ff;
      }
    }

    &.list-item-selected {
      background: linear-gradient(135deg, #bae7ff 0%, #d6f0ff 100%);
      box-shadow: 0 3px 8px rgba(24, 144, 255, 0.2);
      border-left-color: #0050b3;

      .item-title {
        color: #0050b3;
        font-weight: 600;
      }
    }

    &.list-item-disabled {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }

    .item-title {
      font-size: 14px;
      color: #262626;
      font-weight: 500;
      transition: all 0.3s ease;
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

.list-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0 0 0;
  margin-top: 12px;
  border-top: 1px solid #f0f0f0;

  .list-footer-extra {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}
</style>
