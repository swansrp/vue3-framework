<template>
  <a-modal
    v-model:open="visible"
    :footer="null"
    title="字典一键生成指标集"
    width="1200px"
    @cancel="handleClose"
  >
    <div class="dict-to-indicator-generator">
      <a-card :bordered="false">
        <div class="generator-content">
          <!-- 字典选择区域 -->
          <div class="dict-selection-section">
            <h4 class="section-title">
              <DatabaseOutlined />
              选择字典
            </h4>
            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item
                  :help="dictErrorMessage"
                  :label-col="{ span: 6 }"
                  :validate-status="dictValidateStatus"
                  :wrapper-col="{ span: 18 }"
                  label="字典名称"
                >
                  <a-select
                    v-model:value="selectedDict"
                    :options="dictList"
                    placeholder="请选择要生成指标的字典"
                    show-search
                    :filter-option="filterDict"
                    @change="onDictChange"
                    @select="(v: any) => console.log('[a-select @select] 字典选择:', v)"
                  />
                </a-form-item>
              </a-col>
            </a-row>
          </div>

          <!-- 字典项预览区域 -->
          <div
            v-if="hasDictData"
            class="dict-preview-section"
          >
            <div class="section-header">
              <h4 class="section-title">
                <EyeOutlined />
                字典项预览
                <a-tag
                  color="blue"
                  style="margin-left: 8px"
                >
                  共 {{ totalCount }} 项
                </a-tag>
                <a-tag
                  v-if="searchKeyword && !isTreeMode"
                  color="orange"
                  style="margin-left: 8px"
                >
                  筛选 {{ filteredDictItems.length }} 项
                </a-tag>
                <a-tag
                  v-if="isTreeMode"
                  color="cyan"
                  style="margin-left: 8px"
                >
                  树形字典
                </a-tag>
                <a-tag
                  color="green"
                  style="margin-left: 8px"
                >
                  已选 {{ selectedCount }} 项
                </a-tag>
              </h4>
              <a-space>
                <a-button
                  size="small"
                  @click="handleSelectAll"
                >
                  全选
                </a-button>
                <a-button
                  size="small"
                  @click="handleInvertSelection"
                >
                  反选
                </a-button>
                <a-button
                  size="small"
                  @click="handleDeselectAll"
                >
                  清空
                </a-button>
              </a-space>
            </div>
            
            <!-- 搜索框（仅平铺模式） -->
            <div
              v-if="!isTreeMode"
              class="search-section"
            >
              <a-input
                v-model:value="searchKeyword"
                placeholder="搜索字典项（值或名称）"
                allow-clear
                @change="onSearchChange"
              >
                <template #prefix>
                  <SearchOutlined />
                </template>
              </a-input>
            </div>
            
            <div class="dict-items-container">
              <!-- 平铺模式：卡片网格 -->
              <template v-if="!isTreeMode">
                <a-empty
                  v-if="filteredDictItems.length === 0"
                  description="没有符合条件的字典项"
                />
                <a-row
                  v-else
                  :gutter="[8, 8]"
                >
                  <a-col
                    v-for="item in filteredDictItems"
                    :key="item.dictId"
                    :span="6"
                  >
                    <a-card
                      :class="['dict-item-card', { 'selected': isSelected(item.dictId) }]"
                      size="small"
                      @click="toggleSelection(item.dictId)"
                    >
                      <div class="dict-item-content">
                        <div class="dict-item-value">
                          <strong>{{ item.dictValue }}</strong>
                        </div>
                        <div class="dict-item-label">
                          {{ item.dictLabel }}
                        </div>
                        <div class="dict-item-check">
                          <CheckOutlined v-if="isSelected(item.dictId)" />
                        </div>
                      </div>
                    </a-card>
                  </a-col>
                </a-row>
              </template>

              <!-- 树形模式：树形结构勾选 -->
              <template v-else>
                <div class="tree-toolbar">
                  <a-space :size="4">
                    <a-button
                      size="small"
                      @click="expandAllTree"
                    >
                      全部展开
                    </a-button>
                    <a-button
                      size="small"
                      @click="collapseAllTree"
                    >
                      全部收起
                    </a-button>
                  </a-space>
                  <span class="tree-hint">勾选父节点可批量选中其所有叶子节点，仅叶子节点会生成指标</span>
                </div>
                <a-tree
                  v-model:checked-keys="checkedTreeKeys"
                  v-model:expanded-keys="treeExpandedKeys"
                  :tree-data="treeData"
                  :field-names="{ key: 'key', title: 'label', children: 'children' }"
                  checkable
                  block-node
                  class="dict-tree"
                >
                  <template #title="nodeData">
                    <span class="tree-node-title">
                      <span class="node-label">{{ nodeData.label }}</span>
                      <span class="node-value">({{ nodeData.value }})</span>
                    </span>
                  </template>
                </a-tree>
                <a-empty
                  v-if="treeData.length === 0"
                  description="该树形字典暂无数据"
                />
                <div class="tree-unknown-option">
                  <a-checkbox v-model:checked="treeUnknownChecked">
                    额外生成「未知」（NULL 值）指标
                  </a-checkbox>
                </div>
              </template>
            </div>
          </div>

          <!-- 生成配置区域 -->
          <div
            v-if="hasDictData"
            v-show="false"
            class="generation-config-section"
          >
            <h4 class="section-title">
              <SettingOutlined />
              生成配置
            </h4>
            <a-row :gutter="16">
              <a-col :span="8">
                <a-form-item
                  :label-col="{ span: 8 }"
                  :wrapper-col="{ span: 16 }"
                  label="指标名称前缀"
                >
                  <a-input
                    v-model:value="namePrefix"
                    :maxlength="10"
                    placeholder="如：部门_"
                    show-count
                  />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item
                  :label-col="{ span: 8 }"
                  :wrapper-col="{ span: 16 }"
                  label="指标名称后缀"
                >
                  <a-input
                    v-model:value="nameSuffix"
                    :maxlength="10"
                    placeholder="如：_统计"
                    show-count
                  />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item
                  :label-col="{ span: 8 }"
                  :wrapper-col="{ span: 16 }"
                  label="指标值前缀"
                >
                  <a-input
                    v-model:value="valuePrefix"
                    :maxlength="10"
                    placeholder="如：DEPT_"
                    show-count
                  />
                </a-form-item>
              </a-col>
            </a-row>
            <a-form-item
              :label-col="{ span: 3 }"
              :wrapper-col="{ span: 21 }"
              label="通用备注"
            >
              <a-textarea
                v-model:value="commonComment"
                :maxlength="200"
                :rows="2"
                placeholder="为所有生成的指标添加统一备注"
                show-count
              />
            </a-form-item>
          </div>

          <!-- 生成预览区域 -->
          <div
            v-if="previewData.length > 0"
            class="preview-section"
          >
            <h4 class="section-title">
              <FolderViewOutlined />
              生成预览
              <a-tag
                color="green"
                style="margin-left: 8px"
              >
                将生成 {{ previewData.length }} 个指标
              </a-tag>
            </h4>
            <a-table
              :columns="previewColumns"
              :data-source="previewData"
              :pagination="{ pageSize: 10 }"
              bordered
              size="small"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'index'">
                  {{ record.index }}
                </template>
                <template v-else-if="column.key === 'itemValue'">
                  <a-tag color="blue">
                    {{ record.itemValue }}
                  </a-tag>
                </template>
                <template v-else-if="column.key === 'itemName'">
                  <strong>{{ record.itemName }}</strong>
                </template>
                <template v-else-if="column.key === 'comment'">
                  <span class="text-gray">{{ record.comment || '无' }}</span>
                </template>
              </template>
            </a-table>
          </div>

          <!-- 操作按钮区域 -->
          <div class="action-section">
            <a-space size="large">
              <a-button
                :disabled="!canGenerate"
                :loading="generating"
                size="large"
                type="primary"
                @click="handleGenerate"
              >
                <template #icon>
                  <ThunderboltOutlined />
                </template>
                {{ generating ? '生成中...' : '一键生成指标' }}
              </a-button>
              <a-button
                size="large"
                @click="handleClose"
              >
                <template #icon>
                  <CloseOutlined />
                </template>
                取消
              </a-button>
            </a-space>
          </div>
        </div>
      </a-card>
    </div>
  </a-modal>
</template>

<script lang="ts" setup>
import {
  CheckOutlined,
  CloseOutlined,
  DatabaseOutlined,
  EyeOutlined,
  FolderViewOutlined,
  SearchOutlined,
  SettingOutlined,
  ThunderboltOutlined
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, onMounted, ref, watch } from 'vue'

import { getTreeList } from '@/framework/apis/common/common'
import { getDictByDictName } from '@/framework/apis/dict/dict'
import { addEntityList } from '@/framework/apis/portal'
import { FIELD_TYPE, FILTER_TYPE } from '@/framework/components/common/Portal/type'
import { isNotEmpty } from '@/framework/utils/common'

// 组件 Props
const props = withDefaults(
  defineProps<{
    show: boolean
    config?: any
    selectedGroupId?: string | number
  }>(),
  {}
)
const { show, config, selectedGroupId } = toRefs(props)
// 组件 Emits
const emit = defineEmits<{
  (e: 'generated', data: any[]): void
  (e: 'close'): void
  (e: 'update:show', value: boolean): void
}>()

// 显示状态管理
const visible = ref(false)

watch(() => show.value, (newValue) => {
  visible.value = newValue
})

watch(visible, (newValue) => {
  emit('update:show', newValue)
})

const handleClose = () => {
  visible.value = false
  emit('close')
}

// 响应式数据
const dictList = ref<Array<{ label: string; value: string }>>([])
const selectedDict = ref<string>('')
const dictItems = ref<Array<any>>([])
const selectedDictItems = ref<Set<string | number>>(new Set())
const searchKeyword = ref<string>('')
const targetGroupId = ref<string | number>('')

// 树形字典模式状态
const treeData = ref<Array<any>>([])
const checkedTreeKeys = ref<Array<string | number>>([])
const treeExpandedKeys = ref<Array<string | number>>([])
const treeNodeMap = ref<Map<string, any>>(new Map())
const treeUnknownChecked = ref<boolean>(false)

// 生成配置
const namePrefix = ref<string>('')
const nameSuffix = ref<string>('')
const valuePrefix = ref<string>('')
const commonComment = ref<string>('')

// 状态管理
const generating = ref<boolean>(false)

// 验证状态
const dictValidateStatus = ref<'' | 'error'>('')
const dictErrorMessage = ref<string>('')
const groupValidateStatus = ref<'' | 'error'>('')
const groupErrorMessage = ref<string>('')

// 预览表格列定义
const previewColumns = [
  { title: '序号', key: 'index', width: 80, align: 'center' as const },
  { title: '指标值', key: 'itemValue', width: 150 },
  { title: '指标名称', key: 'itemName', width: 200 },
  { title: '备注', key: 'comment', ellipsis: true }
]

// 计算属性
const filteredDictItems = computed(() => {
  if (!searchKeyword.value) {
    return dictItems.value
  }
  
  const keyword = searchKeyword.value.toLowerCase()
  return dictItems.value.filter(item => {
    const valueMatch = item.dictValue?.toString().toLowerCase().includes(keyword)
    const labelMatch = item.dictLabel?.toString().toLowerCase().includes(keyword)
    return valueMatch || labelMatch
  })
})

// 是否为树形字典模式
const isTreeMode = computed(() => {
  if (!selectedDict.value) return false
  const fieldType = selectedDict.value.split('###')[2]
  return fieldType === FIELD_TYPE.TREE || fieldType === FIELD_TYPE.TREE_MULTI_IN_ONE
})

// 是否已加载字典数据（平铺或树形）
const hasDictData = computed(() => dictItems.value.length > 0 || treeData.value.length > 0)

// 树形模式下被勾选的叶子节点
const checkedLeafNodes = computed(() => {
  if (!isTreeMode.value) return [] as Array<any>
  const checkedSet = new Set(checkedTreeKeys.value.map(k => String(k)))
  const leaves: Array<any> = []
  treeNodeMap.value.forEach((node, key) => {
    if ((node.isLeaf || !node.children?.length) && checkedSet.has(key)) {
      leaves.push(node)
    }
  })
  return leaves
})

// 树形模式下所有叶子节点的 key
const allLeafKeys = computed(() => {
  const keys: Array<string | number> = []
  treeNodeMap.value.forEach((node) => {
    if (node.isLeaf || !node.children?.length) keys.push(node.key ?? node.value)
  })
  return keys
})

// 统一后的“已选字典项”（平铺模式为选中卡片，树形模式为勾选的叶子节点）
const effectiveSelectedItems = computed(() => {
  if (isTreeMode.value) {
    const items = checkedLeafNodes.value.map(node => ({
      dictId: node.key ?? node.value,
      dictValue: String(node.value),
      dictLabel: node.label
    }))
    if (treeUnknownChecked.value) {
      items.push({ dictId: 'UNKNOWN_AUTO_GENERATED', dictValue: 'UNKNOWN', dictLabel: '未知', isAutoGenerated: true } as any)
    }
    return items
  }
  return dictItems.value.filter(item => isSelected(item.dictId))
})

const totalCount = computed(() => {
  return isTreeMode.value ? treeNodeMap.value.size : dictItems.value.length
})

const selectedCount = computed(() => {
  return isTreeMode.value
    ? checkedLeafNodes.value.length + (treeUnknownChecked.value ? 1 : 0)
    : selectedDictItems.value.size
})

const canGenerate = computed(() => {
  return selectedDict.value && targetGroupId.value && effectiveSelectedItems.value.length > 0 && !generating.value
})

const previewData = computed(() => {
  return effectiveSelectedItems.value.map((item, index) => ({
    index: index + 1,
    itemValue: (valuePrefix.value || '') + item.dictValue,
    itemName: (namePrefix.value || '') + item.dictLabel + (nameSuffix.value || ''),
    comment: commonComment.value || `基于字典项 ${ item.dictLabel } 生成的指标`,
    originalDictItem: item
  }))
})

watch(
  () => config.value,
  () => {
    const columnArray = config.value.columns
      .filter(
        (item: { filterAble: string; show: string }) =>
          item.filterAble === '1' && item.show === '1'
      )
    dictList.value.length = 0
    for (let item of columnArray) {
      if ((item.fieldType === FIELD_TYPE.SELECT ||
        item.fieldType === FIELD_TYPE.SELECT_MULTI_IN_ONE ||
        item.fieldType === FIELD_TYPE.TREE ||
        item.fieldType === FIELD_TYPE.TREE_MULTI_IN_ONE) && isNotEmpty(item.reference)) {
        dictList.value.push({
          value: item.reference + '###' + item.property + '###' + item.fieldType,
          label: item.displayName
        })
      }
    }
  },
  { deep: true, immediate: true }
)

const loadDictItems = async (dictName: string) => {
  try {
    // 切换到平铺模式前清空树形模式状态
    resetTreeState()
    const response = await getDictByDictName({ dictName })
    if (response && response.payload) {
      dictItems.value = response.payload.map((item: any) => ({
        dictId: item.value,
        dictValue: item.value,
        dictLabel: item.label
      }))
      
      // 自动添加"未知"字典项
      const unknownItem = {
        dictId: 'UNKNOWN_AUTO_GENERATED',
        dictValue: 'UNKNOWN',
        dictLabel: '未知',
        isAutoGenerated: true // 标记为自动生成项
      }
      dictItems.value.push(unknownItem)
      
      // 默认全选(不包括"未知"项)
      handleSelectAll()
      // 取消选中"未知"项
      selectedDictItems.value.delete(unknownItem.dictId)
      selectedDictItems.value = new Set(selectedDictItems.value)
    }
  } catch (error) {
    console.error('加载字典项失败:', error)
    message.error('加载字典项失败')
    dictItems.value = []
    selectedDictItems.value.clear()
  }
}

// 重置树形模式状态
const resetTreeState = () => {
  treeData.value = []
  checkedTreeKeys.value = []
  treeExpandedKeys.value = []
  treeNodeMap.value = new Map()
  treeUnknownChecked.value = false
}

// 加载树形字典数据
const loadTreeDictItems = async (dictName: string) => {
  try {
    // 切换到树形模式前清空平铺模式状态
    dictItems.value = []
    selectedDictItems.value.clear()

    const response = await getTreeList(dictName)
    const tree = response?.payload || []
    treeData.value = tree

    // 构建 key -> 节点 映射
    const map = new Map<string, any>()
    const buildMap = (nodes: Array<any>) => {
      for (const node of nodes) {
        map.set(String(node.key ?? node.value), node)
        if (node.children?.length) buildMap(node.children)
      }
    }
    buildMap(tree)
    treeNodeMap.value = map

    // 默认勾选所有叶子节点并展开整棵树
    const leafKeys: Array<string | number> = []
    map.forEach((node) => {
      if (node.isLeaf || !node.children?.length) leafKeys.push(node.key ?? node.value)
    })
    checkedTreeKeys.value = leafKeys
    treeExpandedKeys.value = Array.from(map.keys())
    treeUnknownChecked.value = false
  } catch (error) {
    console.error('加载树形字典项失败:', error)
    message.error('加载树形字典项失败')
    resetTreeState()
  }
}

// 树形模式：全部展开 / 全部收起
const expandAllTree = () => {
  treeExpandedKeys.value = Array.from(treeNodeMap.value.keys())
}
const collapseAllTree = () => {
  treeExpandedKeys.value = []
}

const filterDict = (input: string, option: any) => {
  const label = option.label ?? option.children ?? ''
  return String(label).toLowerCase().indexOf(input.toLowerCase()) >= 0
}

// 搜索相关方法
const onSearchChange = () => {
  // 搜索时不需要额外处理，computed 会自动更新
}

const onDictChange = async (value: any) => {
  dictValidateStatus.value = ''
  dictErrorMessage.value = ''

  if (value) {
    const dictName = value.split('###')[0]
    const fieldType = value.split('###')[2]
    if (fieldType === FIELD_TYPE.TREE || fieldType === FIELD_TYPE.TREE_MULTI_IN_ONE) {
      await loadTreeDictItems(dictName)
      if (treeData.value.length === 0) {
        dictValidateStatus.value = 'error'
        dictErrorMessage.value = '所选树形字典没有字典项'
      }
    } else {
      await loadDictItems(dictName)
      if (dictItems.value.length === 0) {
        dictValidateStatus.value = 'error'
        dictErrorMessage.value = '所选字典没有字典项'
      }
    }
  } else {
    dictItems.value = []
    selectedDictItems.value.clear()
    resetTreeState()
  }
}

// 选中/排除相关方法
const isSelected = (dictId: string | number) => {
  return selectedDictItems.value.has(dictId)
}

const toggleSelection = (dictId: string | number) => {
  if (selectedDictItems.value.has(dictId)) {
    selectedDictItems.value.delete(dictId)
  } else {
    selectedDictItems.value.add(dictId)
  }
  // 触发响应式更新
  selectedDictItems.value = new Set(selectedDictItems.value)
}

// 全选：平铺模式针对筛选后的结果，树形模式勾选所有节点
const handleSelectAll = () => {
  if (isTreeMode.value) {
    checkedTreeKeys.value = Array.from(treeNodeMap.value.keys())
    return
  }
  filteredDictItems.value.forEach(item => {
    selectedDictItems.value.add(item.dictId)
  })
  selectedDictItems.value = new Set(selectedDictItems.value)
}

// 清空：平铺模式针对筛选后的结果，树形模式取消所有勾选
const handleDeselectAll = () => {
  if (isTreeMode.value) {
    checkedTreeKeys.value = []
    return
  }
  filteredDictItems.value.forEach(item => {
    selectedDictItems.value.delete(item.dictId)
  })
  selectedDictItems.value = new Set(selectedDictItems.value)
}

// 反选：平铺模式针对筛选后的结果，树形模式对叶子节点反选
const handleInvertSelection = () => {
  if (isTreeMode.value) {
    const checkedSet = new Set(checkedTreeKeys.value.map(k => String(k)))
    checkedTreeKeys.value = allLeafKeys.value.filter(k => !checkedSet.has(String(k)))
    return
  }
  filteredDictItems.value.forEach(item => {
    if (selectedDictItems.value.has(item.dictId)) {
      selectedDictItems.value.delete(item.dictId)
    } else {
      selectedDictItems.value.add(item.dictId)
    }
  })
  selectedDictItems.value = new Set(selectedDictItems.value)
}

const validateForm = () => {
  let isValid = true

  if (!selectedDict.value) {
    dictValidateStatus.value = 'error'
    dictErrorMessage.value = '请选择字典'
    isValid = false
  }

  if (effectiveSelectedItems.value.length === 0) {
    dictValidateStatus.value = 'error'
    dictErrorMessage.value = '请至少选择一个字典项'
    isValid = false
  }

  return isValid
}

const handleGenerate = async () => {
  if (!validateForm()) {
    return
  }

  generating.value = true

  try {
    // 只为选中的字典项生成指标（平铺模式为选中卡片，树形模式为勾选的叶子节点）
    const selectedItems = effectiveSelectedItems.value

    // 先构建所有指标数据
    const allIndicatorData = await Promise.all(
      selectedItems.map(item => {
        const indicatorData = {
          itemValue: (valuePrefix.value || '') + item.dictValue,
          itemName: (namePrefix.value || '') + item.dictLabel + (nameSuffix.value || ''),
          comment: commonComment.value || `基于字典项 ${ item.dictLabel } 生成的指标`,
          portalName: props.config?.name || '',
          groupId: targetGroupId.value,
          condition: null,
          dynamicColumn: JSON.stringify({})
        }
        return generateIndicatorData(item, indicatorData)
      })
    )

    // 批量插入，保证顺序，一次请求完成
    await addEntityList('portal/indicator', allIndicatorData, undefined, false, false)

    message.success(`成功生成 ${ allIndicatorData.length } 个指标！`)

    // 发出生成完成事件
    emit('generated', allIndicatorData)

    // 重置表单
    handleReset()

  } catch (error) {
    console.error('生成指标失败:', error)
    message.error('生成指标失败，请检查网络连接或联系管理员')
  } finally {
    generating.value = false
  }
}

// 您需要实现的生成方法接口
const generateIndicatorData = async (dictItem: any, baseData: any) => {
  const enhancedData = {
    ...baseData,
    condition: generateConditionByDictItem(dictItem),
    dynamicColumn: null
  }

  return enhancedData
}

// 根据字典项生成条件的示例方法
const generateConditionByDictItem = (dictItem: any) => {
  // 如果是自动生成的"未知"项,使用 NULL 条件
  if (dictItem.isAutoGenerated && dictItem.dictValue === 'UNKNOWN') {
    const condition = {
      conditionList: [
        {
          property: selectedDict.value.split('###')[1],
          relation: FILTER_TYPE.NULL,
          value: []
        }
      ],
      andOr: '0'
    }
    return JSON.stringify(condition)
  }
  
  // 普通字典项的条件（单选类字段用等于，多选类字段用包含）
  const fieldType = selectedDict.value.split('###')[2]
  const isSingleSelect = fieldType === FIELD_TYPE.SELECT || fieldType === FIELD_TYPE.TREE
  const condition = {
    conditionList: [
      {
        property: selectedDict.value.split('###')[1],
        relation: isSingleSelect ? FILTER_TYPE.EQUAL : FILTER_TYPE.CONTAIN,
        value: [dictItem.dictValue]
      }
    ],
    andOr: '0'
  }

  return JSON.stringify(condition)
}

const handleReset = () => {
  selectedDict.value = ''
  dictItems.value = []
  selectedDictItems.value.clear()
  resetTreeState()
  searchKeyword.value = ''
  targetGroupId.value = ''
  namePrefix.value = ''
  nameSuffix.value = ''
  valuePrefix.value = ''
  commonComment.value = ''
  dictValidateStatus.value = ''
  dictErrorMessage.value = ''
  groupValidateStatus.value = ''
  groupErrorMessage.value = ''
}

// 弹窗打开时快照锁定 groupId，避免切换左侧树导致 groupId 跟着变
watch(() => show.value, (visible) => {
  if (visible && selectedGroupId.value) {
    targetGroupId.value = selectedGroupId.value
  }
})

onMounted(() => {
})

// 暴露给父组件的方法
defineExpose({
  reset: handleReset,
  generateIndicatorData
})
</script>

<style lang="less" scoped>
.dict-to-indicator-generator {
  .generator-content {
    .section-title {
      display: flex;
      align-items: center;
      margin-bottom: 16px;
      font-size: 16px;
      font-weight: 600;
      color: #262626;

      .anticon {
        margin-right: 8px;
        color: #1890ff;
      }
    }

    .dict-selection-section,
    .dict-preview-section,
    .generation-config-section,
    .preview-section {
      margin-bottom: 32px;
      padding: 20px;
      background: var(--bg-hover);
      border-radius: 8px;
      border: 1px solid var(--border-subtle);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;

      .section-title {
        margin-bottom: 0;
      }
    }

    .search-section {
      margin-bottom: 16px;

      :deep(.ant-input-affix-wrapper) {
        transition: all 0.15s ease;

        &:focus,
        &:focus-within {
          border-color: #40a9ff;
          box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
        }
      }
    }

    .dict-items-container {
      max-height: 300px;
      overflow-y: auto;

      .dict-item-card {
        position: relative;
        transition: all 0.15s ease;
        cursor: pointer;
        border: 2px solid transparent;

        &:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transform: scale(0.98);
        }

        &:active {
          transform: scale(0.95);
        }

        &.selected {
          border-color: var(--accent);
          background: var(--accent-soft);

          .dict-item-value {
            color: var(--accent);
          }
        }

        .dict-item-content {
          .dict-item-value {
            color: #666;
            font-size: 14px;
            margin-bottom: 4px;
            transition: color 0.15s ease;
          }

          .dict-item-label {
            color: #666;
            font-size: 12px;
          }

          .dict-item-check {
            position: absolute;
            top: 4px;
            right: 4px;
            color: #1890ff;
            font-size: 16px;
            font-weight: bold;
          }
        }
      }
    }

    .tree-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px dashed var(--border-subtle);

      .tree-hint {
        font-size: 12px;
        color: #8c8c8c;
      }
    }

    .dict-tree {
      padding: 4px 0;

      :deep(.ant-tree-treenode) {
        padding: 3px 0;
      }

      :deep(.ant-tree-node-content-wrapper) {
        flex: 1;
      }
    }

    .tree-node-title {
      display: inline-flex;
      align-items: center;
      gap: 6px;

      .node-label {
        font-weight: 500;
      }

      .node-value {
        color: #8c8c8c;
        font-size: 12px;
      }
    }

    .tree-unknown-option {
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px dashed var(--border-subtle);
    }

    .action-section {
      display: flex;
      justify-content: center;
      padding: 24px 0;
      border-top: 1px solid #f0f0f0;
      margin-top: 24px;
    }
  }

  .text-gray {
    color: #999;
  }
}

// 表单项样式优化
:deep(.ant-form-item) {
  margin-bottom: 16px;
}

:deep(.ant-input),
:deep(.ant-select),
:deep(.ant-textarea) {
  &:focus {
    border-color: #40a9ff;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
  }
}

// 按钮样式
:deep(.ant-btn) {
  &:hover {
    transform: translateY(-1px);
    transition: all 0.2s ease;
  }
}

// 表格样式
:deep(.ant-table-small) {
  .ant-table-tbody > tr > td {
    padding: 8px 16px;
  }
}

// 滚动条样式
:deep(.dict-items-container::-webkit-scrollbar) {
  width: 6px;
}

:deep(.dict-items-container::-webkit-scrollbar-track) {
  background: #f1f1f1;
  border-radius: 3px;
}

:deep(.dict-items-container::-webkit-scrollbar-thumb) {
  background: #c1c1c1;
  border-radius: 3px;
}

:deep(.dict-items-container::-webkit-scrollbar-thumb:hover) {
  background: #a8a8a8;
}
</style>