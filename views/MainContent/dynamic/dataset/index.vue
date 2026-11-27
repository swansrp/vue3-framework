<template>
  <div class="dataset-container">
    <!-- 左侧：Dataset分组列表（Portal配置tab自动收起，把宽度让给配置区） -->
    <div
      class="left-panel"
      :class="{ collapsed: leftCollapsed }"
    >
      <DatasetList
        :list="datasetList"
        :selected-id="currentDataset?.id"
        :loading="listLoading"
        @select="handleSelect"
        @create="handleCreate"
        @delete="handleDelete"
        @export="handleExportDataset"
        @import="handleImportDataset"
      />
    </div>
    <div
      class="collapse-bar"
      :title="leftCollapsed ? '展开目录' : '收起目录'"
      @click="leftCollapsed = !leftCollapsed"
    >
      <DoubleRightOutlined v-if="leftCollapsed" />
      <DoubleLeftOutlined v-else />
    </div>

    <!-- 右侧：详情区 -->
    <div class="right-panel">
      <template v-if="currentDataset || createMode">
        <a-tabs
          v-model:active-key="activeTab"
          class="detail-tabs"
        >
          <a-tab-pane
            key="sql"
            tab="SQL编辑"
          >
            <DatasetSqlEditor
              :dataset="currentDataset"
              @saved="handleSaved"
            />
          </a-tab-pane>
          <a-tab-pane
            key="column"
            tab="列配置"
            :disabled="!currentDataset"
          >
            <div class="tab-scroll">
              <ColumnConfig
                v-if="currentDataset"
                :key="currentDataset.id"
                :dataset="currentDataset"
              />
            </div>
          </a-tab-pane>
          <a-tab-pane
            key="portal"
            tab="Portal配置"
            :disabled="!currentDataset"
          >
            <PortalConfig
              v-if="currentDataset && activeTab === 'portal'"
              :key="currentDataset.id"
              data-mode="DATASET"
              :reference-id="currentDataset.id"
              :custom-refresh-fn="handleRefreshPortal"
              :generate-portal-fn="handleGeneratePortal"
            />
          </a-tab-pane>
        </a-tabs>
      </template>
      <div
        v-else
        class="empty-panel"
      >
        <a-empty description="请在左侧选择一个Dataset，或新建">
          <a-button
            type="primary"
            @click="handleCreate"
          >
            <template #icon>
              <PlusOutlined />
            </template>
            新建Dataset
          </a-button>
        </a-empty>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DoubleLeftOutlined, DoubleRightOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'
import dayjs from 'dayjs'
import { h, onMounted, ref, watch } from 'vue'

import ColumnConfig from './components/ColumnConfig.vue'
import DatasetList from './components/DatasetList.vue'
import DatasetSqlEditor from './components/DatasetSqlEditor.vue'
import type { DatasetInfo } from './types'
import { getConfig, getSql, parseSqlAndSave } from '../apis/datasetConfigController'
import { refreshPortalForDataset, generatePortalForDataset } from '../apis/portalGenerateController'
import { sysDatasetGeneralSelect, sysDatasetDeleteItem } from '../apis/sysDatasetPortalController'

import PortalConfig from '@/framework/views/MainContent/PortalConfig/index.vue'

const datasetList = ref<DatasetInfo[]>([])
const listLoading = ref(false)
const currentDataset = ref<DatasetInfo | null>(null)
const createMode = ref(false)
const activeTab = ref('sql')
// 左侧目录折叠：Portal配置内容宽（按钮行+多列配置表），进入该tab自动收起目录让出宽度
const leftCollapsed = ref(false)

watch(activeTab, (tab) => {
  leftCollapsed.value = tab === 'portal'
  if (tab === 'portal') {
    // PortalConfig按.root实际尺寸算内部表格高宽，但只监听window resize；
    // 等目录收起动画(0.2s)结束后主动触发一次重算，避免高度按错误尺寸计算
    setTimeout(() => window.dispatchEvent(new Event('resize')), 300)
  }
})

const loadList = async () => {
  listLoading.value = true
  try {
    // 查询 sys_dataset 全量列表，按 remark 正序（搜索由左侧列表本地过滤）
    const res = await sysDatasetGeneralSelect({
      sortList: [{ property: 'remark', type: 0 }],
      conditionList: []
    }, false, false)

    if (res.status?.code === 0) {
      datasetList.value = (res.payload || []).map((ds: any) => ({
        id: ds.id,
        tableId: ds.datasetName || `dataset_${ds.id}`,
        datasetName: ds.datasetName,
        dataSource: ds.dataSource,
        remark: ds.remark,
      }))
    }
  } catch (error) {
    console.error('加载数据失败:', error)
    message.error('加载数据失败')
  } finally {
    listLoading.value = false
  }
}

const handleSelect = (dataset: DatasetInfo) => {
  createMode.value = false
  currentDataset.value = dataset
  // 新建态下列配置/Portal不可用，避免停留在禁用tab
  if (!dataset) activeTab.value = 'sql'
}

const handleCreate = () => {
  createMode.value = true
  currentDataset.value = null
  activeTab.value = 'sql'
}

const handleDelete = async (dataset: DatasetInfo) => {
  try {
    // 使用id删除dataset记录（会级联删除tables和columns）
    await sysDatasetDeleteItem({ id: String(dataset.id) }, false, false)
    message.success('删除成功')
    if (currentDataset.value?.id === dataset.id) {
      currentDataset.value = null
      createMode.value = false
      activeTab.value = 'sql'
    }
    loadList()
  } catch (error) {
    console.error('删除失败:', error)
    message.error('删除失败')
  }
}

// 保存成功后刷新列表并选中保存的dataset
const handleSaved = async (datasetId: number | undefined) => {
  await loadList()
  const saved = datasetId != null
    ? datasetList.value.find(item => item.id === datasetId)
    : datasetList.value.find(item => item.id === currentDataset.value?.id)
  if (saved) {
    createMode.value = false
    currentDataset.value = saved
  }
}

// Dataset专用刷新函数
const handleRefreshPortal = (portalName: string, datasetId: number) => {
  return refreshPortalForDataset({
    name: portalName,
    referenceId: datasetId,
    dataMode: 'DATASET'
  })
}

// Dataset专用生成Portal函数
const handleGeneratePortal = (params: { portalName: string, displayName: string, referenceId: number, dataMode: string }) => {
  // 自动添加Dataset后缀
  let finalPortalName = params.portalName
  if (!finalPortalName.endsWith('Dataset')) {
    finalPortalName = finalPortalName + 'Dataset'
  }

  return generatePortalForDataset({
    dataMode: params.dataMode,
    portalName: finalPortalName,
    displayName: params.displayName,
    datasetId: params.referenceId
  })
}

// ==================== 数据集导出/导入 ====================
// 导出＝选中树节点的基本信息 + 常驻条件(getConfig) + 反拼SQL含列注释(getSql)；
// ⚠ sql 为 buildFromSql 反拼的等价形式：仓侧文件头的大段头注注释不在其中（头注以仓侧正源为权威）
const handleExportDataset = async () => {
  const ds = currentDataset.value
  if (!ds?.id) return
  try {
    const [cfg, sq] = await Promise.all([
      getConfig({ datasetId: ds.id }, false, false, false),
      getSql({ datasetId: ds.id, includeRemarks: true }, false, false, false)
    ])
    const out = {
      type: 'dataset',
      version: 1,
      exportedAt: new Date().toISOString(),
      datasetName: ds.datasetName,
      dataSource: ds.dataSource,
      remark: ds.remark,
      baseFilter: cfg?.payload?.baseFilter || '',
      // 反拼版不含外层 WHERE（常驻条件单独放 baseFilter 字段）
      sql: sq?.payload?.sql || ''
    }
    if (!out.sql) {
      message.error('该数据集没有可导出的 SQL')
      return
    }
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${ds.datasetName}-dataset-${dayjs().format('YYYYMMDDHHmmss')}.json`
    a.click()
    URL.revokeObjectURL(url)
    message.success('已导出')
  } catch (error: any) {
    console.error('导出失败:', error)
    message.error(error?.message || '导出失败')
  }
}

// 导入＝按 datasetName 对账：存在则更新（datasetId），不存在则新建。
// SQL 拼回外层 WHERE、baseFilter 恒空提交——与 SQL 编辑器保存完全同语义（后端重新转存常驻条件）；
// 更新会重新解析 SQL 并重刷列配置（手改显示名/字段类型被覆盖），SQL 有变化时后端自动留版本快照
const handleImportDataset = async (payload: { fileName: string, text: string }) => {
  let data: any
  try {
    data = JSON.parse(payload.text)
  } catch {
    message.error(`文件不是有效 JSON：${payload.fileName}`)
    return
  }
  if (data?.type !== 'dataset' || !data.datasetName || !String(data.sql || '').trim()) {
    message.error('不是有效的数据集导出文件（缺 type=dataset / datasetName / sql）')
    return
  }
  const existing = datasetList.value.find(item => item.datasetName === data.datasetName)
  const sqlText = String(data.sql) + (data.baseFilter ? `\nWHERE ${data.baseFilter}` : '')
  Modal.confirm({
    title: '导入数据集',
    width: 560,
    content: () => h('div', [
      h('p', `名称：${data.datasetName}`),
      h('p', existing ? `环境中已存在（id=${existing.id}），将更新其 SQL 与基本信息` : '环境中不存在，将新建数据集'),
      h('p', `SQL：${sqlText.split('\n').length} 行`),
      data.remark ? h('p', `备注：${data.remark}`) : null,
      h('p', { style: 'color:#faad14;margin-top:8px' }, existing
        ? '更新会重新解析 SQL 并重刷列配置：手改的列显示名/字段类型会被覆盖；SQL 有变化时自动留版本快照'
        : '新建完成后可在「列配置 / Portal配置」页签继续配置')
    ]),
    okText: existing ? '确认更新' : '确认新建',
    cancelText: '取消',
    onOk: async () => {
      try {
        const res = await parseSqlAndSave({
          datasetId: existing?.id,
          datasetName: data.datasetName,
          sql: sqlText,
          dataSource: data.dataSource || 'master',
          remark: data.remark || '',
          baseFilter: ''
        } as any, false, false, false)
        message.success(existing ? '导入更新成功' : '导入新建成功')
        await handleSaved(res?.payload?.datasetId ?? existing?.id)
      } catch (error: any) {
        console.error('导入失败:', error)
        message.error(error?.message || '导入失败')
      }
    }
  })
}

onMounted(() => {
  loadList()
})
</script>

<style scoped lang="less">
.dataset-container {
  height: 100%;
  display: flex;
  gap: 8px;
  background: var(--bg-base);

  .left-panel {
    width: 300px;
    flex-shrink: 0;
    background: var(--bg-elevated);
    border-radius: 4px;
    overflow: hidden;
    transition: width 0.2s ease;

    &.collapsed {
      width: 0;
    }
  }

  .collapse-bar {
    width: 14px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    background: var(--bg-elevated);
    border-radius: 4px;
    color: var(--text-tertiary, #999);
    font-size: 10px;

    &:hover {
      color: var(--accent, #1677ff);
      background: var(--bg-hover);
    }
  }

  .right-panel {
    flex: 1;
    min-width: 0;
    background: var(--bg-elevated);
    border-radius: 4px;
    overflow: hidden;
  }

  .empty-panel {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .detail-tabs {
    height: 100%;

    :deep(.ant-tabs-nav) {
      margin-bottom: 0;
      padding: 0 12px;
    }

    // 压缩tab页签高度（默认上下padding 12px），给内容区多让出~8px
    :deep(.ant-tabs-tab) {
      padding-top: 8px;
      padding-bottom: 8px;
    }

    :deep(.ant-tabs-content-holder) {
      overflow: hidden;
    }

    :deep(.ant-tabs-content) {
      height: 100%;
    }

    :deep(.ant-tabs-tabpane) {
      height: 100%;
    }
  }

  .tab-scroll {
    height: 100%;
    overflow-y: auto;
    padding: 12px;
  }

  // PortalConfig组件样式覆盖 - 移除左侧间距让组件紧贴左侧
  // 高度不走100%链（tab嵌套下百分比链易断导致页面级溢出），
  // 直接按视口算：顶栏+面包屑+tab页签 ≈ 140px（与ColumnConfig的calc(100vh-300px)同套路）
  :deep(.root) {
    height: calc(100vh - 140px);
    overflow: auto;
  }

  :deep(.table-list) {
    margin: 4px 8px 4px 0;
    flex-shrink: 0;
    // 原样式85vh按整页高度算，这里跟随右侧面板高度
    height: calc(100% - 8px);
  }

  // 原样式宽度按整页视口算(100vw - 540px)，主从布局下左侧还有300px目录，算出来必然溢出
  // 改为flex自适应剩余宽度；配置区按钮行+11列描述表本身需要约1100px，
  // 用min-width兜底，面板不够宽时由.root出横向滚动条，保证按钮完整可见
  :deep(.table-config) {
    width: auto;
    flex: 1;
    min-width: 1100px;
    margin-top: 4px;
    margin-right: 4px;
  }

  // 压缩配置描述表单元格留白（antd默认16px水平/8px垂直，多行多列累计浪费明显）：
  // 水平压缩让全部列一屏展示；垂直压缩找回tab页签占掉的高度，免滚动条
  :deep(.table-config .ant-descriptions-bordered .ant-descriptions-item-label),
  :deep(.table-config .ant-descriptions-bordered .ant-descriptions-item-content) {
    padding: 4px 6px;
  }
}
</style>
