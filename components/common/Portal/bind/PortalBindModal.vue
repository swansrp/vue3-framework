<template>
  <!-- 树形模式：使用抽屉 -->
  <a-drawer
    v-if="isTreeMode"
    v-model:open="bindDialogBox.show"
    :title="title + actionText"
    :width="600"
    placement="right"
  >
    <div style="height: calc(100vh - 120px);">
      <div style="margin-bottom: 16px;">
        <a-input-search
          v-model:value="searchKeyword"
          placeholder="搜索..."
          allow-clear
        />
      </div>
      <a-spin :spinning="treeLoading">
        <a-tree
          v-if="treeData.length > 0"
          v-model:checked-keys="checkedKeys"
          v-model:expanded-keys="expandedKeys"
          :tree-data="filteredTreeData"
          checkable
          :check-strictly="false"
          show-line
          default-expand-all
          @check="handleTreeCheck"
        >
          <template #title="{ dataRef }">
            <span v-html="highlightKeyword(dataRef.title)"></span>
          </template>
        </a-tree>
        <a-empty v-else description="暂无数据" />
      </a-spin>
    </div>
  </a-drawer>

  <!-- 非树形模式：使用全屏弹框 -->
  <dialog-box
    v-else
    v-model:visible="bindDialogBox.show"
    :title="title + actionText"
    is-full
  >
    <a-tabs
      v-model:active-key="bindDialogBox.tab"
      destroy-inactive-tab-pane
      type="card"
      @change="handleTabChanged"
    >
      <a-tab-pane
        key="0"
        :tab="'已' + actionText + title"
      >
        <div style="height: calc(100vh - 200px);">
          <Portal
            ref="bindPortal"
            :query="queryBindListFunc"
            :row-drag-end="handleRowDragEnd"
            :table-id="attachEntity"
            read-only
          >
            <!-- :advance-condition="entityDialogBox.column.entityCondition"-->
            <template #action="{ portalConfig, column, record }">
              <a-button
                type="text"
                @click="unbind(portalConfig, column, record)"
              >
                取消
              </a-button>
              <slot
                :column="column"
                :portal-config="portalConfig"
                :record="record"
                name="action"
              ></slot>
            </template>
            <template #right-btns>
              <slot name="bind-right-btns"></slot>
            </template>
          </Portal>
        </div>
      </a-tab-pane>
      <a-tab-pane
        key="1"
        :tab="'未' + actionText + title"
      >
        <div style="height: calc(100vh - 200px);">
          <Portal
            ref="unbindPortal"
            :advance-condition="attachCondition"
            :query="queryUnbindListFunc"
            :table-id="attachEntity"
            read-only
          >
            <!-- :advance-condition="entityDialogBox.column.entityCondition"-->
            <template #action="{ portalConfig, column, record }">
              <a-button
                type="text"
                @click="bind(portalConfig, column, record)"
              >
                {{ actionText }}
              </a-button>
            </template>
          </Portal>
        </div>
      </a-tab-pane>
      <a-tab-pane
        key="2"
        :tab="'全部' + title"
      >
        <div style="height: calc(100vh - 200px);">
          <Portal
            ref="allPortal"
            :action-width="0"
            :advance-condition="attachCondition"
            :query="queryAttachListFunc"
            :table-id="attachEntity"
            read-only
          />
        </div>
      </a-tab-pane>
      <template #rightExtra>
        <template v-if="bindDialogBox.tab === '0'">
          <a-button
            :disabled="isEmpty(bindPortal?.getRowSelection())"
            style="margin-right: 5px;"
            type="primary"
            @click="unbindSelected"
          >
            清除选中
          </a-button>
          <a-button
            type="primary"
            @click="unbindAll"
          >
            清除全部
          </a-button>
        </template>
        <template v-if="bindDialogBox.tab === '1'">
          <a-button
            :disabled="isEmpty(unbindPortal?.getRowSelection())"
            style="margin-right: 5px;"
            type="primary"
            @click="bindSelected"
          >
            {{ actionText + '选中' }}
          </a-button>
          <a-button
            type="primary"
            @click="bindAll"
          >
            {{ actionText + '全部' }}
          </a-button>
        </template>
        <template v-if="bindDialogBox.tab === '2'">
          <a-button
            type="primary"
            @click="bindReplace"
          >
            {{ '选中替换' + actionText }}
          </a-button>
        </template>
      </template>
    </a-tabs>
  </dialog-box>
</template>

<script lang="ts" setup>
import { ExclamationCircleOutlined } from '@ant-design/icons-vue'
import { Modal } from 'ant-design-vue'
import { createVNode } from 'vue'

import {
  bindAllAttach,
  bindAttach,
  bindBatchAttach,
  bindReplaceAllAttach,
  bindReplaceBatchAttach,
  getAllBindList,
  getTreeData,
  queryAttachList,
  queryBindList,
  queryUnbindList,
  unbindAllAttach,
  unbindAttach,
  unbindBatchAttach
} from '@/framework/apis/portal'
import { getPortalConfig } from '@/framework/apis/portal/config'
import { ConditionListType } from '@/framework/components/common/AdvancedSearch/ConditionList/type'
import { ColumnType, QueryType, TableConfigType } from '@/framework/components/common/Portal/type'
import { isEmpty, isNotEmpty } from '@/framework/utils/common'



const prop = withDefaults(defineProps<{
  baseDomain?: string
  entity: string
  attachEntity: string,
  title: string,
  actionText?: string
  rowDragEnd?: (data: Array<any>, currentPage: number, pageSize: number, entityRecord: any) => Promise<any>
  attachCondition?: ConditionListType
  treeMode?: boolean
}>(), {
  actionText: '授权',
  treeMode: false
})
const { entity, attachEntity, title, treeMode } = toRefs(prop)
const emit = defineEmits<{
  (e: 'close'): void
}>()
const bindPortal = ref()
const unbindPortal = ref()
const allPortal = ref()
const bindDialogBox: { show: boolean, entityName: string, entityId: any, tab: string, attachName: string, entityRecord: any } = reactive({
  show: false,
  entityName: entity.value,
  entityId: null,
  tab: '0',
  attachName: attachEntity.value,
  entityRecord: null
})

// 树形模式相关状态
const isTreeMode = computed(() => prop.treeMode)
const treeLoading = ref(false)
const treeData = ref<any[]>([])
const checkedKeys = ref<any[]>([])
const originalCheckedKeys = ref<any[]>([])
const expandedKeys = ref<any[]>([])
const searchKeyword = ref('')
const attachUrl = ref('')

// 搜索过滤后的树数据
const filteredTreeData = computed(() => {
  if (!searchKeyword.value) return treeData.value
  
  const filterTree = (nodes: any[]): any[] => {
    return nodes.reduce((acc, node) => {
      const title = node.title || ''
      const matches = title.toLowerCase().includes(searchKeyword.value.toLowerCase())
      const children = node.children ? filterTree(node.children) : []
      
      if (matches || children.length > 0) {
        acc.push({
          ...node,
          children
        })
      }
      return acc
    }, [] as any[])
  }
  
  return filterTree(treeData.value)
})

// 高亮关键字
const highlightKeyword = (text: string) => {
  if (!searchKeyword.value || !text) return text
  const keyword = searchKeyword.value
  const regex = new RegExp(`(${keyword})`, 'gi')
  return text.replace(regex, '<span style="color: #1890ff; font-weight: 700;">$1</span>')
}
const showBindDialogBox = async (entityId: any, record: any) => {
  bindDialogBox.tab = '0'
  bindDialogBox.entityId = entityId
  bindDialogBox.show = true
  bindDialogBox.entityRecord = record
  
  // 如果是树形模式，加载树数据和已绑定数据
  if (prop.treeMode) {
    await loadTreeData()
  }
}

// 加载树形数据
const loadTreeData = async () => {
  treeLoading.value = true
  try {
    // 先获取 Portal 配置以获得正确的 URL
    if (!attachUrl.value) {
      const configRes = await getPortalConfig(bindDialogBox.attachName)
      attachUrl.value = configRes.payload?.url || ''
      if (!attachUrl.value) {
        console.error('无法获取 attachEntity 的 URL 配置')
        return
      }
    }
    
    // 加载所有树形数据
    const treeRes = await getTreeData(
      attachUrl.value,
      {} as QueryType,
      prop.baseDomain,
      false,
      false
    )
    treeData.value = treeRes.payload || []
    
    // 加载已绑定的数据
    const bindRes = await getAllBindList(
      bindDialogBox.entityName,
      bindDialogBox.attachName,
      bindDialogBox.entityId,
      prop.baseDomain,
      false,
      false
    )
    
    // 提取已绑定的key
    const bindList = bindRes.payload || []
    checkedKeys.value = bindList.map((item: any) => item.id || item.key)
    originalCheckedKeys.value = [...checkedKeys.value]
    
    // 自动展开所有节点
    const getAllKeys = (nodes: any[]): any[] => {
      let keys: any[] = []
      nodes.forEach(node => {
        keys.push(node.key || node.id)
        if (node.children && node.children.length > 0) {
          keys = keys.concat(getAllKeys(node.children))
        }
      })
      return keys
    }
    expandedKeys.value = getAllKeys(treeData.value)
  } catch (error) {
    console.error('加载树形数据失败:', error)
  } finally {
    treeLoading.value = false
  }
}

// 处理树形勾选变化 - 实时绑定/解绑
const handleTreeCheck = async (checkedKeysValue: any, e: any) => {
  const { checked, node } = e
  const nodeKey = node.key
  
  // 获取当前操作影响的所有节点（包括子节点）
  const getAllChildKeys = (nodeData: any): any[] => {
    let keys = [nodeData.key]
    if (nodeData.children && nodeData.children.length > 0) {
      nodeData.children.forEach((child: any) => {
        keys = keys.concat(getAllChildKeys(child))
      })
    }
    return keys
  }
  
  const affectedKeys = getAllChildKeys(node.dataRef)
  
  try {
    if (checked) {
      // 勾选 - 批量绑定
      await bindBatchAttach(
        bindDialogBox.entityName,
        bindDialogBox.attachName,
        bindDialogBox.entityId,
        affectedKeys,
        prop.baseDomain,
        false,
        false
      )
    } else {
      // 取消勾选 - 批量解绑
      await unbindBatchAttach(
        bindDialogBox.entityName,
        bindDialogBox.attachName,
        bindDialogBox.entityId,
        affectedKeys,
        prop.baseDomain,
        false,
        false
      )
    }
    // 更新原始勾选状态
    originalCheckedKeys.value = [...checkedKeys.value]
  } catch (error) {
    console.error('绑定操作失败:', error)
    // 失败时恢复原状态
    checkedKeys.value = [...originalCheckedKeys.value]
  }
}
const bind = (portalConfig: TableConfigType, column: ColumnType, record: any) => {
  bindAttach(bindDialogBox.entityName, bindDialogBox.attachName, bindDialogBox.entityId, record[portalConfig.rowKey], prop.baseDomain)
    .then(unbindPortal.value.queryData)
}
const unbind = (portalConfig: TableConfigType, column: ColumnType, record: any) => {
  unbindAttach(bindDialogBox.entityName, bindDialogBox.attachName, bindDialogBox.entityId, record[portalConfig.rowKey], prop.baseDomain)
    .then(bindPortal.value.queryData)
}
const bindSelected = () => {
  bindBatchAttach(bindDialogBox.entityName, bindDialogBox.attachName, bindDialogBox.entityId, unbindPortal.value.getRowSelection(), prop.baseDomain)
    .then(unbindPortal.value.queryData)
}
const unbindSelected = () => {
  unbindBatchAttach(bindDialogBox.entityName, bindDialogBox.attachName, bindDialogBox.entityId, bindPortal.value.getRowSelection(), prop.baseDomain)
    .then(bindPortal.value.queryData)
}
const bindAll = () => {
  Modal.confirm({
    title: '将所有' + title.value + '进行' + prop.actionText,
    icon: createVNode(ExclamationCircleOutlined),
    content: createVNode('div', { style: 'color:red;' }, '注意: 单次' + prop.actionText + '数量大于60000条可能会失败'),
    onOk() {
      bindAllAttach(bindDialogBox.entityName, bindDialogBox.attachName, bindDialogBox.entityId, unbindPortal.value.queryCondition(), prop.baseDomain)
        .then(unbindPortal.value.queryData)
    },
    onCancel() {

    }
  })

}
const unbindAll = () => {
  Modal.confirm({
    title: '将所有' + title.value + prop.actionText + '取消',
    icon: createVNode(ExclamationCircleOutlined),
    content: createVNode('div', { style: 'color:red;' }, '注意: 所有' + prop.actionText + '信息将被清除'),
    onOk() {
      unbindAllAttach(bindDialogBox.entityName, bindDialogBox.attachName, bindDialogBox.entityId, prop.baseDomain)
        .then(bindPortal.value.queryData)
    },
    onCancel() {

    }
  })
}
const bindReplace = () => {
  if (isNotEmpty(allPortal.value.getRowSelection())) {
    Modal.confirm({
      title: '将选中' + title.value + '进行' + prop.actionText + '的',
      icon: createVNode(ExclamationCircleOutlined),
      content: createVNode('div', { style: 'color:red;' }, '注意: 原有' + prop.actionText + '信息将被清除'),
      onOk() {
        bindReplaceBatchAttach(bindDialogBox.entityName, bindDialogBox.attachName, bindDialogBox.entityId, allPortal.value.getRowSelection(), prop.baseDomain)
          .then(allPortal.value.queryData)
      },
      onCancel() {

      }
    })
  } else {
    Modal.confirm({
      title: '将' + prop.actionText + '全部符合当前条件的' + title.value,
      icon: createVNode(ExclamationCircleOutlined),
      content: createVNode('div', { style: 'color:red;' }, '注意: 原有' + prop.actionText + '信息将被清除,单次' + prop.actionText + '数量大于60000条可能会失败'),
      onOk() {
        bindReplaceAllAttach(bindDialogBox.entityName, bindDialogBox.attachName, bindDialogBox.entityId, allPortal.value.queryCondition(), prop.baseDomain)
          .then(allPortal.value.queryData)
      },
      onCancel() {

      }
    })
  }
}
const queryBindListFunc = async (url: string, query: QueryType) => {
  return queryBindList(bindDialogBox.entityName, bindDialogBox.attachName, bindDialogBox.entityId, query, prop.baseDomain)
}
const queryUnbindListFunc = async (url: string, query: QueryType) => {
  return queryUnbindList(bindDialogBox.entityName, bindDialogBox.attachName, bindDialogBox.entityId, query, prop.baseDomain)
}
const queryAttachListFunc = async (url: string, query: QueryType) => {
  return queryAttachList(bindDialogBox.entityName, bindDialogBox.attachName, bindDialogBox.entityId, query, prop.baseDomain)
}
const handleTabChanged = (activeKey: string | number) => {
  bindDialogBox.tab = String(activeKey)
  if (activeKey === '0' || activeKey === 0) {
    bindPortal.value?.queryData()
  } else if (activeKey === '1' || activeKey === 1) {
    unbindPortal.value?.queryData()
  } else if (activeKey === '2' || activeKey === 2) {
    allPortal.value?.queryData()
  }
}
const handleRowDragEnd = (dataSource: any, currentPage: number, pageSize: number) => {
  nextTick(() => {
    prop.rowDragEnd && prop.rowDragEnd(dataSource, currentPage, pageSize, bindDialogBox.entityRecord)
      .then(() => bindPortal.value.queryData())
  })
}
const queryBindData = () => {
  bindPortal.value.queryData()
}

watch(
  () => bindDialogBox.show,
  () => {
    if (!bindDialogBox.show) {
      emit('close')
    }
  })
defineExpose({ showBindDialogBox, queryBindData })
</script>

<style scoped>

</style>
