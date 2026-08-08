<template>
  <dialog-box
    v-model:visible="_show"
    :title="config.title"
    is-full
  >
    <content-layout
      :width="400"
      style="margin-top: 20px"
    >
      <template #side>
        <portal
          ref="groupTreeRef"
          :advance-condition="groupAdvanceCondition"
          :bind-default-value="defaultValue"
          table-id="SysPortalIndicatorGroup"
          tree-mode
          @selected-data="onSelectedData"
        />
        <!-- 一键初始化：放在左侧指标组树下方，无指标组时也可用 -->
        <a-tooltip
          placement="top"
        >
          <template #title>
            <span>一键初始化字典指标：每个字典类字段生成一个独立指标组，选中组时作为其子组</span>
          </template>
          <a-button
            style="width: 100%; margin-top: 10px"
            type="primary"
            @click="handleOpenBatchInit"
          >
            <template #icon>
              <RocketOutlined />
            </template>
            一键初始化字典指标
          </a-button>
        </a-tooltip>
      </template>
      <template #content>
        <portal
          v-if="isNotEmpty(selectedTreeData[0])"
          ref="indicatorRef"
          :action-width="0"
          :advance-condition="advanceCondition"
          :bind-default-value="{groupId: selectedTreeData[0]}"
          :hide-add="isEmpty(selectedTreeData[0])"
          style="margin-top: 10px"
          table-id="SysPortalIndicator"
        >
          <template #left-btns>
            <a-tooltip
              v-if="!indicatorData"
              placement="top"
            >
              <template #title>
                <span>字典指标</span>
              </template>
              <a-button
                shape="circle"
                size="middle"
                style="margin-left: 3px"
                type="primary"
                @click="showDictGenerator = true"
              >
                <template #icon>
                  <ThunderboltOutlined />
                </template>
              </a-button>
            </a-tooltip>
            <a-tooltip
              v-if="indicatorData"
              placement="top"
            >
              <template #title>
                <span>恢复默认颜色：当前组全部指标按名称哈希重算颜色</span>
              </template>
              <a-button
                :loading="resettingColors"
                shape="circle"
                size="middle"
                style="margin-left: 3px"
                @click="handleResetGroupColors"
              >
                <template #icon>
                  <BgColorsOutlined />
                </template>
              </a-button>
            </a-tooltip>
          </template>
          <template #bodyCell_color="{ record }">
            <div
              v-if="record.color"
              class="table-color-cell"
            >
              <span
                :style="{ backgroundColor: record.color }"
                :title="record.color"
                class="table-color-swatch"
              ></span>
              <span class="table-color-value">{{ record.color }}</span>
            </div>
            <span v-else>-</span>
          </template>
          <template #add="{ modal }">
            <!-- region 指标配置填表页面 -->
            <a-modal
              v-model:open="modal.show"
              :confirm-loading="addModal.loading"
              title="指标配置"
              width="800px"
              @cancel="handleAddCancel(modal)"
              @ok="handleAddSubmit(modal)"
            >
              <indicator-form
                ref="addFormRef"
                :config="config"
                :initial-data="modal.data"
                @update:data="updateAddFormData"
              />
            </a-modal>
          </template>
          <template #modify="{modal}">
            <a-modal
              v-model:open="modal.show"
              :confirm-loading="modifyModal.loading"
              title="修改指标"
              width="800px"
              @cancel="handleModifyCancel(modal)"
              @ok="handleModifySubmit(modal)"
            >
              <indicator-form
                ref="modifyFormRef"
                :config="config"
                :initial-data="modal.data"
                @update:data="updateModifyFormData"
              />
            </a-modal>
          </template>
        </portal>
      </template>
    </content-layout>
    <!-- endregion -->
    
    <!-- 字典一键生成指标集组件 -->
    <dict-to-indicator-generator
      v-model:show="showDictGenerator"
      :config="config"
      :selected-group-id="selectedTreeData[0]"
      @generated="onIndicatorsGenerated"
      @close="showDictGenerator = false"
    />

    <!-- 字典指标一键初始化组件 -->
    <dict-batch-init-modal
      v-model:show="showBatchInit"
      :config="config"
      :selected-group-id="selectedTreeData[0]"
      @generated="onBatchInitGenerated"
      @close="showBatchInit = false"
    />

    <!-- 同步图表配置 + 导出/导入按钮 -->
    <div
      v-if="config?.name"
      style="display: flex; justify-content: flex-end; gap: 8px; padding: 12px 24px; border-top: 1px solid #f0f0f0;"
    >
      <a-button
        :loading="exporting"
        @click="handleExportIndicator"
      >
        <template #icon>
          <DownloadOutlined />
        </template>
        导出配置
      </a-button>
      <input
        ref="indicatorFileInputRef"
        type="file"
        accept=".json"
        style="display: none"
        @change="handleIndicatorFileChange"
      />
      <a-button
        :loading="importing"
        @click="triggerIndicatorFileInput"
      >
        <template #icon>
          <UploadOutlined />
        </template>
        导入配置
      </a-button>
      <a-button
        :loading="syncing"
        type="primary"
        @click="handleSyncCharts"
      >
        <template #icon>
          <SyncOutlined />
        </template>
        同步图表配置
      </a-button>
    </div>
  </dialog-box>

  <!-- 同步审查弹窗 -->
  <chart-sync-review-modal
    v-model:visible="showSyncReview"
    :scan-result="scanResult"
    :tree-data="indicatorTreeData"
    @applied="onSyncApplied"
  />
</template>

<script lang="ts" setup>

import { BgColorsOutlined, DownloadOutlined, RocketOutlined, SyncOutlined, ThunderboltOutlined, UploadOutlined } from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'

import ChartSyncReviewModal from './components/ChartSyncReviewModal.vue'
import DictBatchInitModal from './components/DictBatchInitModal.vue'
import DictToIndicatorGenerator from './components/DictToIndicatorGenerator.vue'
import IndicatorForm from './components/IndicatorForm.vue'
import type { ScanResult } from './utils/syncAllChartIndicators'
import { scanAllCharts } from './utils/syncAllChartIndicators'

import { getIndicatorConfig } from '@/framework/apis/portal'
import { addEntity, addEntityList, generalSelect, updateEntityListSelective, updateEntitySelective } from '@/framework/apis/portal'
import { ConditionListType } from '@/framework/components/common/AdvancedSearch/ConditionList/type'
import DialogBox from '@/framework/components/common/dialogBox/DialogBox.vue'
import { FILTER_TYPE } from '@/framework/components/common/Portal/type'
import type { QueryType } from '@/framework/components/common/Portal/type'
import { buildCondition } from '@/framework/components/common/Portal/utils'
import { getNameHashColor } from '@/framework/utils/colorUtils'
import { isEmpty, isNotEmpty } from '@/framework/utils/common'
import { downloadJsonConfig, readJsonFile } from '@/framework/utils/configTransfer'



const props = withDefaults(
  defineProps<{
    show: boolean
    config: any
    dict?: any
  }>(),
  {}
)
const { config, show } = toRefs(props)
const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()

const defaultValue = reactive({ portalName: undefined })

const _show = ref(props.show)
watch(
  () => show.value,
  () => _show.value = show.value
)
watch(
  () => _show.value,
  () => emit('update:show', _show.value)
)

const selectedTreeData = ref<any>([])
const onSelectedData = (data: any) => {
  selectedTreeData.value = [...data]
}

const indicatorRef = ref()
const groupTreeRef = ref()
const advanceCondition = computed(() => {
  const conditionList = isNotEmpty(selectedTreeData.value) ? [buildCondition('groupId', FILTER_TYPE.EQUAL, selectedTreeData.value)] : []
  return { conditionList } as ConditionListType
})
watch(
  () => config.value.name,
  () => defaultValue.portalName = config.value.name
)
const groupAdvanceCondition = computed(() => {
  const conditionList = [buildCondition('portalName', FILTER_TYPE.EQUAL, [config.value.name])] as ConditionListType[]
  return { conditionList } as ConditionListType
})

const indicatorData = computed(() => {
  return indicatorRef.value?.getData().length > 0
})

// 指标配置表单相关状态
const addModal = reactive({
  loading: false
})

// 修改模态框相关状态
const modifyModal = reactive({
  loading: false
})

const addFormRef = ref()
const modifyFormRef = ref()

// 添加表单数据
const addFormData = ref({})

// 修改表单数据  
const modifyFormData = ref<any>({})

// 字典生成器显示状态
const showDictGenerator = ref(false)

// 一键初始化弹窗显示状态
const showBatchInit = ref(false)

// 打开一键初始化（不强制选组，弹窗内支持自动建组）
const handleOpenBatchInit = () => {
  showBatchInit.value = true
}

// 一键初始化完成回调（成功提示由弹窗内部发出，此处只负责刷新）
const onBatchInitGenerated = (_data: any[], _groupId: string | number) => {
  // 可能新建了指标组，刷新左侧指标组树
  if (groupTreeRef.value) {
    groupTreeRef.value.queryData()
  }
  // 刷新右侧指标列表（未选组时右侧未渲染，判空保护）
  if (indicatorRef.value) {
    indicatorRef.value.queryData()
  }
  // 关闭弹窗
  showBatchInit.value = false
}

// 恢复默认颜色状态
const resettingColors = ref(false)

// 一键将当前选中指标组下所有指标的颜色恢复为名称哈希默认色
const handleResetGroupColors = () => {
  const rawGroupId = selectedTreeData.value[0]
  const groupId = rawGroupId && typeof rawGroupId === 'object' ? (rawGroupId.id ?? rawGroupId.key ?? null) : (rawGroupId || null)
  if (isEmpty(groupId)) {
    message.warning('请先选择左侧指标组')
    return
  }
  Modal.confirm({
    title: '确认恢复默认颜色',
    content: '将把当前指标组下所有指标的颜色恢复为按名称哈希生成的默认色（手动配置的颜色也会被覆盖），是否继续？',
    okText: '确定',
    cancelText: '取消',
    onOk: async () => {
      resettingColors.value = true
      try {
        // 拉取当前组下全部指标（不受列表分页影响）
        const query = {
          conditionList: [buildCondition('groupId', FILTER_TYPE.EQUAL, [groupId])]
        } as QueryType
        const resp = await generalSelect('portal/indicator', query, undefined, false, true)
        const rows = resp?.payload || []
        if (rows.length === 0) {
          message.info('当前指标组下暂无指标')
          return
        }
        const updates = rows.map((row: any) => ({
          id: row.id,
          color: getNameHashColor(row.itemName)
        }))
        await updateEntityListSelective('portal/indicator', updates, undefined, false, false)
        message.success(`已恢复 ${updates.length} 个指标的默认颜色`)
        indicatorRef.value?.queryData()
      } catch (error: any) {
        message.error('恢复默认颜色失败：' + (error?.message || '未知错误'))
      } finally {
        resettingColors.value = false
      }
    }
  })
}

// 同步图表配置相关状态
const syncing = ref(false)
// 导出/导入相关状态
const exporting = ref(false)
const importing = ref(false)
const indicatorFileInputRef = ref<HTMLInputElement>()
const showSyncReview = ref(false)
const scanResult = ref<ScanResult | null>(null)
const indicatorTreeData = ref<any[]>([])

const handleSyncCharts = async () => {
  const tableId = config.value?.name
  if (!tableId) {
    message.warning('未找到 tableId，无法同步')
    return
  }
  syncing.value = true
  scanResult.value = null
  console.log('[SyncDebug] handleSyncCharts - tableId:', tableId,
    'selectedGroupValue:', selectedTreeData.value[0])
  try {
    // 加载指标树 + 扫描所有图表
    const [result, treeResp] = await Promise.all([
      scanAllCharts(tableId, selectedTreeData.value[0]),
      getIndicatorConfig(tableId)
    ])
    scanResult.value = result
    indicatorTreeData.value = treeResp.payload || []
    showSyncReview.value = true
  } catch (e: any) {
    message.error('扫描图表配置失败：' + (e?.message || '未知错误'))
  } finally {
    syncing.value = false
  }
}

const onSyncApplied = async (updatedCount: number) => {
  if (updatedCount > 0) {
    message.success(`已更新 ${updatedCount} 个图表配置`)
  }
  // 应用完成后重新扫描，刷新 diff 状态
  const tableId = config.value?.name
  if (!tableId) return
  try {
    const [result, treeResp] = await Promise.all([
      scanAllCharts(tableId, selectedTreeData.value[0]),
      getIndicatorConfig(tableId)
    ])
    scanResult.value = result
    indicatorTreeData.value = treeResp.payload || []
  } catch {
    // 刷新失败不影响已有结果
  }
}

// 导出指标配置
const handleExportIndicator = async () => {
  const tableId = config.value?.name
  if (!tableId) {
    message.warning('未找到表格名称')
    return
  }
  exporting.value = true
  try {
    const res = await getIndicatorConfig(tableId)
    const treeData = res.payload || []
    if (!treeData.length) {
      message.warning('暂无可导出的指标配置')
      return
    }
    downloadJsonConfig(`${tableId}-指标配置`, {
      type: 'indicator',
      portalName: tableId,
      exportTime: new Date().toISOString(),
      data: treeData
    })
    message.success('导出成功')
  } catch (error: any) {
    message.error('导出失败: ' + (error?.message || '未知错误'))
  } finally {
    exporting.value = false
  }
}

// 触发文件选择
const triggerIndicatorFileInput = () => {
  indicatorFileInputRef.value?.click()
}

// 展平已有指标树，构建查重映射
const buildExistingMaps = (tree: any[]): {
  groupMap: Map<string, any>
  itemMap: Map<string, boolean>
} => {
  const groupMap = new Map<string, any>()
  const itemMap = new Map<string, boolean>()
  const traverse = (nodes: any[], _parentGroupId: string | null) => {
    for (const node of nodes) {
      const groupId = String(node.id || '')
      if (node.title) groupMap.set(node.title, node)
      if (node.items) {
        for (const item of node.items) {
          if (item.key) itemMap.set(`${groupId}_${item.key}`, true)
        }
      }
      if (node.children?.length) traverse(node.children, groupId)
    }
  }
  traverse(tree, null)
  return { groupMap, itemMap }
}

// 递归导入指标组（查重覆盖）和指标项（查重跳过）
const upsertIndicatorTree = async (
  nodes: any[],
  portalName: string,
  parentId: any,
  groupMap: Map<string, any>,
  itemMap: Map<string, boolean>,
  counters: { added: number; updated: number; skipped: number }
): Promise<void> => {
  for (const node of nodes) {
    const groupName = node.title
    const existingGroup = groupMap.get(groupName)
    let groupId: any
    if (existingGroup?.id) {
      // 已存在 → 更新组
      await updateEntitySelective('portal/indicator/group', {
        id: existingGroup.id,
        portalName,
        name: groupName,
        displayOrder: node.displayOrder,
        pid: parentId
      }, undefined, false, false)
      groupId = existingGroup.id
      counters.updated++
    } else {
      // 不存在 → 新增组
      const res = await addEntity('portal/indicator/group', {
        portalName,
        name: groupName,
        displayOrder: node.displayOrder,
        pid: parentId
      }, undefined, false, false)
      groupId = res.payload?.id ?? res.payload
      // 将新组加入映射，供子组查重
      groupMap.set(groupName, { id: groupId, items: [] })
      counters.added++
    }
    // 处理该组下的指标项（批量插入）
    if (node.items && node.items.length > 0) {
      const newItems: any[] = []
      for (const item of node.items) {
        const itemKey = `${groupId}_${item.key}`
        if (itemMap.has(itemKey)) {
          counters.skipped++
        } else {
          newItems.push({
            portalName,
            groupId,
            itemValue: item.key,
            itemName: item.title,
            // 导出文件自带颜色优先，否则按名称哈希生成默认色
            color: item.color || getNameHashColor(item.title),
            condition: item.condition,
            dynamicColumn: item.dynamicColumns
          })
          itemMap.set(itemKey, true)
        }
      }
      if (newItems.length > 0) {
        await addEntityList('portal/indicator', newItems, undefined, false, false)
      }
    }
    // 递归处理子组
    if (node.children && node.children.length > 0) {
      await upsertIndicatorTree(node.children, portalName, groupId, groupMap, itemMap, counters)
    }
  }
}

// 导入指标配置
const handleIndicatorFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  target.value = ''

  try {
    const parsed = await readJsonFile(file)
    const treeData = parsed.data || parsed
    if (!Array.isArray(treeData) || treeData.length === 0) {
      message.warning('文件中没有可导入的指标配置')
      return
    }
    const portalName = parsed.portalName || config.value?.name
    if (!portalName) {
      message.warning('无法确定目标表格名称')
      return
    }
    Modal.confirm({
      title: '确认导入',
      content: `将导入 ${treeData.length} 个指标组配置到「${portalName}」，确认继续？`,
      okText: '确认导入',
      cancelText: '取消',
      onOk: async () => {
        importing.value = true
        try {
          // 获取已有指标树，构建查重映射
          const existingRes = await getIndicatorConfig(portalName)
          const existingTree = existingRes.payload || []
          const { groupMap, itemMap } = buildExistingMaps(existingTree)
          const counters = { added: 0, updated: 0, skipped: 0 }
          await upsertIndicatorTree(treeData, portalName, null, groupMap, itemMap, counters)
          message.success(`导入完成：新增 ${counters.added} 组，更新 ${counters.updated} 组，跳过 ${counters.skipped} 项`)
          // 刷新左侧指标组树 + 右侧指标列表
          if (groupTreeRef.value) {
            groupTreeRef.value.queryData()
          }
          if (indicatorRef.value) {
            indicatorRef.value.queryData()
          }
        } catch (error: any) {
          message.error('导入失败: ' + (error?.message || '未知错误'))
        } finally {
          importing.value = false
        }
      }
    })
  } catch (error: any) {
    message.error('文件解析失败，请确保是有效的JSON文件')
  }
}

// 新的添加和修改方法
const updateAddFormData = (data: any) => {
  addFormData.value = data
}

const updateModifyFormData = (data: any) => {
  modifyFormData.value = data
}

const handleAddSubmit = async (modal: any) => {
  try {
    addModal.loading = true
    await addFormRef.value?.validate()

    const rawGroupId = selectedTreeData.value[0]
    const submitData = {
      ...addFormRef.value.getSubmitData(),
      portalName: config.value.name,
      groupId: rawGroupId && typeof rawGroupId === 'object' ? (rawGroupId.id ?? rawGroupId.key ?? null) : (rawGroupId || null)
    }

    await addEntity('portal/indicator', submitData)
    message.success('添加成功')

    modal.show = false
    addFormRef.value?.resetForm()
    indicatorRef.value.queryData()
  } catch (error) {
    message.error('添加失败')
  } finally {
    addModal.loading = false
  }
}

const handleAddCancel = (modal: any) => {
  modal.show = false
  addFormRef.value?.resetForm()
}

const handleModifySubmit = async (modal: any) => {
  try {
    modifyModal.loading = true
    await modifyFormRef.value?.validate()

    const updateData = {
      id: modal.data.id,
      ...modifyFormRef.value.getSubmitData()
    }

    await updateEntitySelective('portal/indicator', updateData)
    message.success('修改成功')

    modal.show = false
    modifyFormRef.value?.resetForm()
    indicatorRef.value.queryData()
  } catch (error) {
    message.error('修改失败')
  } finally {
    modifyModal.loading = false
  }
}

const handleModifyCancel = (modal: any) => {
  modal.show = false
  modifyFormRef.value?.resetForm()
}

// 字典生成指标集完成回调
const onIndicatorsGenerated = (data: any[]) => {
  message.success(`成功生成 ${data.length} 个指标！`)
  // 刷新指标列表
  if (indicatorRef.value) {
    indicatorRef.value.queryData()
  }
  // 关闭生成器
  showDictGenerator.value = false
}

onMounted(() => {
})
</script>

<style lang="less" scoped>
.indicator-content-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.indicator-actions {
  padding: 0 16px;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 16px;
}

// 指标配置表单样式
.dynamic-fields-container {
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  padding: 12px;
  background-color: var(--bg-hover);

  .dynamic-field-item {
    margin-bottom: 8px;
    padding: 8px;
    background-color: var(--bg-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: 4px;

    &:last-child {
      margin-bottom: 0;
    }

    &:hover {
      border-color: var(--accent);
      box-shadow: 0 0 0 2px var(--accent-soft);
    }
  }
}

// 表单样式优化
.ant-form-item {
  margin-bottom: 24px;
}

.ant-input,
.ant-textarea {
  &:focus {
    border-color: #40a9ff;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
  }
}

// 按钮样式
.ant-btn {
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;
  }
}

// 指标分组选择按钮
.ant-btn-dashed {
  border-style: dashed;
  border-color: #d9d9d9;

  &:hover {
    border-color: #40a9ff;
    color: #40a9ff;
  }
}

// 删除按钮样式
.ant-btn-text.ant-btn-dangerous {
  &:hover {
    background-color: var(--danger-soft);
    border-color: var(--danger);
  }
}

// 表格图表颜色列色块
.table-color-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.table-color-swatch {
  display: inline-block;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
}

.table-color-value {
  font-family: monospace;
  font-size: 12px;
  color: var(--text-color-secondary, #999);
}
</style>