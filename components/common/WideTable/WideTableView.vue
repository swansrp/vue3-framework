<script setup lang="ts">
import { ArrowLeftOutlined, SwapOutlined } from '@ant-design/icons-vue'
import { computed, ref } from 'vue'

import { getWideTableConfigDetail, queryWideTableData } from './apis'
import type { FixedColumn, ProductOption } from './types'
import { generalQueryRequest } from '../../../apis'
import { dictStore } from '../../../store/common'
import { formSchemaAttributeGroupGeneralSelect } from '../../common/DynamicForm/apis/formSchemaAttributeGroupPortalController'
import { formSchemaAttributeGeneralSelect } from '../../common/DynamicForm/apis/formSchemaAttributePortalController'
import { formSchemaModuleGeneralSelect } from '../../common/DynamicForm/apis/formSchemaModulePortalController'
import { formSchemaSectionGeneralSelect } from '../../common/DynamicForm/apis/formSchemaSectionPortalController'
import { FILTER_TYPE } from '../../common/Portal/type'

const props = defineProps<{
  /** 产品数据加载函数（业务层注入） */
  productSelectFn: () => Promise<any>
  /** 固定列定义（业务层注入） */
  fixedColumns: FixedColumn[]
  /** 宽表 API 前缀，默认 /form/widetable */
  configApiPrefix?: string
  /** 嵌入模式（显示返回按钮） */
  isEmbedded?: boolean
  /** 配置入口 ID（自动锁定产品和方案） */
  configId?: number | null
}>()
const emit = defineEmits<{ back: [] }>()

const showBack = computed(() => props.isEmbedded === true)
const apiPrefix = computed(() => props.configApiPrefix || '/form/widetable')
const dict = dictStore()

// ==================== 产品列表 ====================
const productList = ref<ProductOption[]>([])
const selectedProductId = ref<number | null>(null)
const mode = ref<'product' | 'field'>('product')

const productTreeData = computed(() =>
  productList.value.map((p) => ({
    key: p.id,
    title: p.title || `产品${p.id}`,
    isLeaf: true,
  })),
)

const selectedProductName = computed(() => {
  const p = productList.value.find((p) => p.id === selectedProductId.value)
  return p?.title || ''
})

const loadProducts = async () => {
  try {
    const res: any = await props.productSelectFn()
    productList.value = (res?.payload || []).map((item: any) => ({
      id: item.id,
      title: item.title || item.name || `产品${item.id}`,
      formId: item.formId,
    }))
  } catch {
    productList.value = []
  }
}

// ==================== 配置列表 ====================
const allConfigs = ref<any[]>([])
const productConfigs = computed(() => {
  if (!selectedProductId.value) return []
  const product = productList.value.find((p) => p.id === selectedProductId.value)
  if (!product) return []
  return allConfigs.value.filter((c) => c.formId === product.formId)
})

const selectedConfigId = ref<number | null>(null)

const loadAllConfigs = async () => {
  try {
    const res: any = await generalQueryRequest(
      apiPrefix.value,
      new Map<string, any>(),
      [],
      [{ property: 'createAt', type: 0 }],
      200,
      1,
    )
    allConfigs.value = res?.payload?.records || []
  } catch {
    allConfigs.value = []
  }
}

// ==================== 表单层级结构 ====================
interface FormNode {
  id: string | number
  title: string
  type: string
  children?: FormNode[]
  attributes?: any[]
}

const formTree = ref<FormNode[]>([])
const loadingTree = ref(false)
const configAttrIds = ref<number[]>([])
const selectedAttrIds = ref<number[]>([])
const expandedModules = ref<(string | number)[]>([])
const expandedSectionsMap = ref<Record<string, (string | number)[]>>({})

const loadFormTree = async (formId: string) => {
  loadingTree.value = true
  formTree.value = []
  try {
    const moduleRes: any = await formSchemaModuleGeneralSelect({
      conditionList: [
        { property: 'formId', relation: FILTER_TYPE.EQUAL, value: [formId] },
        { property: 'valid', relation: FILTER_TYPE.EQUAL, value: ['1'] },
      ],
      sortList: [{ property: 'sort', type: 0 }],
    }, false, false)
    const modules = (moduleRes?.payload || []).sort((a: any, b: any) => (a.sort ?? 0) - (b.sort ?? 0))

    for (const mod of modules) {
      const moduleNode: FormNode = {
        id: mod.id,
        title: mod.title || '未命名模块',
        type: 'module',
        children: [],
      }

      const sectionRes: any = await formSchemaSectionGeneralSelect({
        conditionList: [
          { property: 'moduleId', relation: FILTER_TYPE.EQUAL, value: [mod.id] },
          { property: 'valid', relation: FILTER_TYPE.EQUAL, value: ['1'] },
        ],
        sortList: [{ property: 'sort', type: 0 }],
      }, false, false)
      const sections = sectionRes?.payload || []

      for (const sec of sections) {
        const sectionNode: FormNode = {
          id: sec.id,
          title: sec.title || '未命名区块',
          type: 'section',
          children: [],
        }

        const attrRes: any = await formSchemaAttributeGeneralSelect({
          conditionList: [
            { property: 'sectionId', relation: FILTER_TYPE.EQUAL, value: [sec.id] },
            { property: 'valid', relation: FILTER_TYPE.EQUAL, value: ['1'] },
          ],
        }, false, false)
        const allAttrs = (attrRes?.payload || [])
          .filter((a: any) => Number(a.fieldType) >= 0)
          .sort((a: any, b: any) => {
            const yA = a.positionY ?? 0
            const yB = b.positionY ?? 0
            if (yA !== yB) return yA - yB
            return (a.positionX ?? 0) - (b.positionX ?? 0)
          })

        const groupRes: any = await formSchemaAttributeGroupGeneralSelect({
          conditionList: [
            { property: 'sectionId', relation: FILTER_TYPE.EQUAL, value: [sec.id] },
            { property: 'valid', relation: FILTER_TYPE.EQUAL, value: ['1'] },
          ],
          sortList: [{ property: 'sort', type: 0 }],
        }, false, false)
        const groups = groupRes?.payload || []

        for (const grp of groups) {
          const groupAttrs = allAttrs.filter((a: any) => String(a.groupId) === String(grp.id))
          if (groupAttrs.length > 0) {
            sectionNode.children!.push({
              id: grp.id,
              title: grp.title || '默认分组',
              type: 'group',
              attributes: groupAttrs,
            })
          }
        }

        const ungrouped = allAttrs.filter(
          (a: any) => !a.groupId || String(a.groupId) === '0' || a.groupId === '',
        )
        if (ungrouped.length > 0) {
          sectionNode.children!.push({
            id: `default_${sec.id}`,
            title: '默认分组',
            type: 'group',
            attributes: ungrouped,
          })
        }

        if (sectionNode.children!.length > 0) {
          moduleNode.children!.push(sectionNode)
        }
      }

      if (moduleNode.children!.length > 0) {
        formTree.value.push(moduleNode)
      }
    }

    expandedModules.value = formTree.value.map((m) => m.id)
    formTree.value.forEach((m) => {
      expandedSectionsMap.value[String(m.id)] = m.children?.map((s) => s.id) || []
    })
  } catch {
    formTree.value = []
  } finally {
    loadingTree.value = false
  }
}

// ==================== 数据表格 ====================
const tableData = ref<any[]>([])
const loadingData = ref(false)
const configAttrs = ref<any[]>([])

const baseColumns = computed(() =>
  props.fixedColumns.map((col) => ({
    title: col.label,
    dataIndex: col.field,
    width: col.width || 150,
    ellipsis: true,
    type: col.type,
    dictId: col.dictId,
  })),
)

const dynamicColumns = computed(() => {
  return selectedAttrIds.value.map((attrId) => {
    const attr = configAttrs.value.find((a) => a.attributeId === attrId)
    const isDict = attr?.isDict === '1' && attr?.dictId
    return {
      title: attr?.columnLabel || `字段${attrId}`,
      dataIndex: attr?.columnName || `field_${attrId}`,
      width: 150,
      ellipsis: true,
      isDict: !!isDict,
      dictId: attr?.dictId || '',
    }
  })
})

const allColumns = computed(() => [...baseColumns.value, ...dynamicColumns.value])

const loadConfigData = async (configId: number) => {
  loadingData.value = true
  try {
    const detailRes: any = await getWideTableConfigDetail({ configId })
    const detail = detailRes?.payload
    if (detail) {
      configAttrs.value = detail.attrs || []
      configAttrIds.value = (detail.attrs || []).map((a: any) => a.attributeId)
      selectedAttrIds.value = [...configAttrIds.value]

      const dictIds = new Set<string>()
      ;(detail.attrs || []).forEach((a: any) => {
        if (a.isDict === '1' && a.dictId) dictIds.add(a.dictId)
      })
      dictIds.forEach((dictId) => dict.getDict(dictId))

      if (detail.config?.formId) {
        const matchedProduct = productList.value.find((p: any) => p.formId === detail.config.formId)
        if (matchedProduct) {
          selectedProductId.value = matchedProduct.id
        }
        await loadFormTree(detail.config.formId)
      }
    }

    const dataRes: any = await queryWideTableData({ configId })
    tableData.value = dataRes?.payload?.rows || []
  } catch {
    tableData.value = []
  } finally {
    loadingData.value = false
  }
}

// ==================== 交互逻辑 ====================
const handleProductSelect = (selectedKeys: any[]) => {
  if (selectedKeys.length === 0) return
  selectedProductId.value = selectedKeys[0]
  selectedConfigId.value = null
  formTree.value = []
  tableData.value = []
  configAttrs.value = []
  selectedAttrIds.value = []
  mode.value = 'field'
  if (productConfigs.value.length > 0) {
    handleConfigChange(productConfigs.value[0].id)
  }
}

const handleChangeProduct = () => {
  mode.value = 'product'
  selectedProductId.value = null
  formTree.value = []
  tableData.value = []
  configAttrs.value = []
  selectedAttrIds.value = []
  selectedConfigId.value = null
}

const handleConfigChange = (configId: any) => {
  const id = Number(configId)
  selectedConfigId.value = id
  if (id) {
    loadConfigData(id)
  } else {
    formTree.value = []
    tableData.value = []
    configAttrs.value = []
    selectedAttrIds.value = []
  }
}

const handleSelectAll = () => {
  selectedAttrIds.value = [...configAttrIds.value]
}
const handleInvertSelect = () => {
  const set = new Set(selectedAttrIds.value)
  selectedAttrIds.value = configAttrIds.value.filter((id) => !set.has(id))
}

const isAttrConfigured = (attrId: any) => configAttrIds.value.includes(attrId)

const handleAttrCheckChange = (groupAttrIds: any[], checkedVals: any[]) => {
  const otherIds = selectedAttrIds.value.filter((id) => !groupAttrIds.includes(id))
  selectedAttrIds.value = [...otherIds, ...checkedVals]
}

const cleanLabel = (label: string): string => {
  if (!label) return ''
  return label.replace(/\\n/g, ' ').replace(/\n/g, ' ').trim()
}

// 预加载固定列中的字典
props.fixedColumns.forEach((col) => {
  if (col.type === 'dict' && col.dictId) {
    dict.getDict(col.dictId)
  }
})

const formatDateTime = (val: any): string => {
  if (!val) return ''
  return String(val).replace('T', ' ').replace(/\..*$/, '')
}

const getDictLabel = (dictId: string, val: any): string => {
  if (!val) return ''
  return dict.getLabel(dictId, val) || val
}

// ==================== 初始化 ====================
;(async () => {
  await loadProducts()
  await loadAllConfigs()
  if (props.configId) {
    selectedConfigId.value = props.configId
    mode.value = 'field'
    await loadConfigData(props.configId)
  }
})()
</script>

<template>
  <div class="wide-table-view-page">
    <div
      v-if="showBack"
      class="view-header"
    >
      <a-button @click="emit('back')">
        <ArrowLeftOutlined />
        返回
      </a-button>
    </div>

    <div class="view-body">
      <div class="left-panel">
        <!-- 产品选择模式 -->
        <div
          v-if="mode === 'product'"
          class="product-section"
        >
          <div class="panel-header">
            <span>选择产品</span>
          </div>
          <a-tree
            :tree-data="productTreeData"
            :selected-keys="selectedProductId ? [selectedProductId] : []"
            :default-expand-all="true"
            @select="handleProductSelect"
          />
        </div>

        <!-- 字段选择模式 -->
        <template v-else>
          <div class="product-bar">
            <span class="product-bar-name">{{ selectedProductName }}</span>
            <a-button
              type="link"
              size="small"
              @click="handleChangeProduct"
            >
              <SwapOutlined />
              变更
            </a-button>
          </div>

          <div
            v-if="selectedConfigId"
            class="field-section"
          >
            <div class="panel-header">
              <span>收集字段</span>
              <a-tag
                color="blue"
                style="margin-left: auto; margin-right: 8px"
              >
                {{ selectedAttrIds.length }} / {{ configAttrIds.length }}
              </a-tag>
              <a-button
                type="link"
                size="small"
                style="padding: 0"
                @click="handleSelectAll"
              >
                全选
              </a-button>
              <a-button
                type="link"
                size="small"
                style="padding: 0; margin-left: 4px"
                @click="handleInvertSelect"
              >
                反选
              </a-button>
            </div>
            <a-spin :spinning="loadingTree">
              <a-alert
                v-if="formTree.length === 0"
                message="暂无字段数据"
                type="info"
                show-icon
                style="margin-bottom: 8px"
              />
              <a-collapse
                v-model:active-key="expandedModules"
                ghost
              >
                <a-collapse-panel
                  v-for="mod in formTree"
                  :key="mod.id"
                >
                  <template #header>
                    <span class="tree-node-title module-title">{{ mod.title }}</span>
                  </template>

                  <a-collapse
                    v-model:active-key="expandedSectionsMap[String(mod.id)]"
                    ghost
                  >
                    <a-collapse-panel
                      v-for="sec in mod.children"
                      :key="sec.id"
                    >
                      <template #header>
                        <span class="tree-node-title section-title">{{ sec.title }}</span>
                      </template>

                      <div
                        v-for="grp in sec.children"
                        :key="grp.id"
                        class="group-block"
                      >
                        <div class="group-header">
                          <span class="tree-node-title group-title">{{ grp.title }}</span>
                        </div>

                        <a-checkbox-group
                          :value="grp.attributes!.filter((a) => selectedAttrIds.includes(a.id)).map((a) => a.id)"
                          class="attr-checkbox-group"
                          @change="(checkedVals: any[]) => {
                            const groupIds = grp.attributes!.map((a) => a.id)
                            handleAttrCheckChange(groupIds, checkedVals)
                          }"
                        >
                          <a-checkbox
                            v-for="attr in grp.attributes"
                            :key="attr.id"
                            :value="attr.id"
                            :disabled="!isAttrConfigured(attr.id)"
                            class="attr-checkbox"
                          >
                            {{ cleanLabel(attr.label) }}
                            <span style="color: #999; font-size: 11px; margin-left: 2px">({{ attr.id }})</span>
                            <a-tag
                              v-if="attr.dict"
                              color="purple"
                              :bordered="false"
                              style="margin-left: 4px; font-size: 11px"
                            >
                              字典
                            </a-tag>
                          </a-checkbox>
                        </a-checkbox-group>
                      </div>
                    </a-collapse-panel>
                  </a-collapse>
                </a-collapse-panel>
              </a-collapse>
            </a-spin>
          </div>
        </template>
      </div>

      <div class="right-panel">
        <template v-if="!selectedProductId">
          <a-empty
            description="请选择产品"
            style="margin-top: 100px"
          />
        </template>

        <template v-else>
          <div class="scheme-section">
            <span class="scheme-label">方案：</span>
            <a-tabs
              v-if="productConfigs.length > 0"
              :active-key="String(selectedConfigId || productConfigs[0]?.id)"
              type="card"
              size="small"
              @change="handleConfigChange"
            >
              <a-tab-pane
                v-for="cfg in productConfigs"
                :key="String(cfg.id)"
                :tab="cfg.title"
              />
            </a-tabs>
            <span
              v-else
              style="color: #999; line-height: 32px"
            >该产品暂无宽表配置</span>
          </div>

          <div
            v-if="selectedConfigId"
            class="data-section"
          >
            <a-table
              :columns="allColumns"
              :data-source="tableData"
              :loading="loadingData"
              row-key="id"
              size="small"
              :pagination="{ pageSize: 20, showSizeChanger: true }"
              :scroll="{ x: 'max-content' }"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="(column as any).type === 'datetime'">
                  {{ formatDateTime(record[column.dataIndex as string]) }}
                </template>
                <template v-else-if="(column as any).type === 'dict' && (column as any).dictId">
                  {{ getDictLabel((column as any).dictId, record[column.dataIndex as string]) }}
                </template>
                <template v-else-if="(column as any).isDict">
                  {{ (column as any).dictId && dict.getLabel((column as any).dictId, record[column.dataIndex as string]) || record[column.dataIndex as string] || '-' }}
                </template>
              </template>
            </a-table>
          </div>

          <a-empty
            v-else
            description="请选择方案后查看数据"
            style="margin-top: 100px"
          />
        </template>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
export default { name: 'WideTableView' }
</script>

<style scoped>
.wide-table-view-page {
  padding: 16px;
}

.view-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.view-body {
  display: flex;
  gap: 12px;
  min-height: calc(100vh - 100px);
}

.left-panel {
  width: 340px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.product-section,
.field-section {
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 12px;
}

.product-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 10px 12px;
  flex-shrink: 0;
}

.product-bar-name {
  font-size: 15px;
  font-weight: 600;
  color: #1f1f1f;
}

.field-section {
  flex: 1;
  overflow-y: auto;
  max-height: calc(100vh - 240px);
}

.right-panel {
  flex: 1;
  min-width: 0;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 12px;
}

.scheme-section {
  display: flex;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 8px;
}

.scheme-label {
  font-weight: 600;
  white-space: nowrap;
  line-height: 32px;
}

.scheme-section :deep(.ant-tabs) {
  flex: 1;
}

.panel-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  font-weight: 600;
}

.tree-node-title {
  font-weight: 500;
}

.module-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f1f1f;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.group-title {
  font-size: 13px;
  color: #555;
}

.group-block {
  padding: 8px 0;
  border-bottom: 1px dashed #f0f0f0;
}

.group-block:last-child {
  border-bottom: none;
}

.group-header {
  margin-bottom: 8px;
}

.attr-checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 0;
  padding-left: 24px;
}

.attr-checkbox {
  width: 100%;
  margin-left: 0 !important;
}

:deep(.ant-collapse-ghost > .ant-collapse-item > .ant-collapse-header) {
  padding: 6px 0;
}

:deep(.ant-collapse-ghost > .ant-collapse-item > .ant-collapse-content > .ant-collapse-content-box) {
  padding: 0 0 0 16px;
}

:deep(.ant-tree) {
  font-size: 13px;
}
</style>
