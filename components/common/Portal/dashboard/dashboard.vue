<template>
  <div class="hr-indicator-dashboard">
    <!-- 左侧指标树面板 -->
    <indicator-tree-panel
      :collapsed="leftPanelCollapsed" :indicator-tree-data="indicatorTreeData"
      @drag-start="onDragStart" @drag-end="onDragEnd" />

    <!-- 右侧配置面板 -->
    <config-panel
      v-model:data-metrics="dataMetrics" v-model:filter-dimension="filterDimension"
      v-model:first-dimension="firstDimension" v-model:second-dimension="secondDimension"
      v-model:selected-filter-items="selectedFilterItems" :available-data-types="availableDataTypes"
      :left-panel-collapsed="leftPanelCollapsed" @toggle-left-panel="toggleLeftPanel" @generate-chart="generateChart" />

    <!-- 中间展示区域 -->
    <ChartDisplayArea
      ref="chartDisplayAreaRef" :config="config" :received-data="dimensionIndicatorsFilter"
      class="chart-display-area" @chart-generated="onChartGenerated" />
  </div>
</template>

<script lang="ts" setup>
import { onMounted, provide, ref } from 'vue'
import { message } from 'ant-design-vue'
import { getIndicatorConfig } from '@/framework/apis/portal'
import { FIELD_TYPE } from '@/framework/components/common/Portal/type'
import {
  ConditionGroup,
  DataMetric,
  DimensionIndicatorsFilter,
  IndicatorGroup as TalentIndicatorGroup
} from '@/framework/components/common/Portal/dashboard/type/AdvancedStatisticReq'
import { ConditionListType } from '@/framework/components/common/AdvancedSearch/ConditionList/type'

// 导入子组件
import IndicatorTreePanel from './indicator/tree/IndicatorTreePanel.vue'
import ConfigPanel from './indicator/config/ConfigPanel.vue'
import ChartDisplayArea from './indicator/dashboard/ChartDisplayArea.vue'
import { getPortalConfig } from "@/framework/apis/portal/config"
import { useRouter } from 'vue-router'

// 接口定义
interface IndicatorItem {
  key: string
  title: string
  color?: string
  isLeaf?: boolean
  condition?: string
}

interface IndicatorGroup {
  key: string
  title: string
  children?: IndicatorGroup[]
  items?: IndicatorItem[]
  color?: string
  isLeaf?: boolean
}

interface DragData {
  key: string
  title: string
  isLeaf: boolean
  items?: IndicatorItem[]
}

interface DataMetricUI {
  id: string
  dataName: string
  dataField: string
  chartType: 'bar' | 'line' | 'pie'
  color: string
  yAxisPosition: 'left' | 'right'
  stackGroup?: string
  unit?: string
  itemColors?: Record<string, string>
}

interface DataTypeOption {
  dataName: string
  dataField: string
  unit?: string
}

const props = withDefaults(
  defineProps<{
    tableId?: any
  }>(),
  {}
)
const tableId = ref(props.tableId)

// 左侧面板控制
const leftPanelCollapsed = ref(false)

// 模拟人事指标数据
const indicatorTreeData = ref<IndicatorGroup[]>([])

// 维度配置
const firstDimension = ref<IndicatorGroup | null>(null)
const secondDimension = ref<IndicatorGroup | null>(null)
const filterDimension = ref<IndicatorGroup | null>(null)
const selectedFilterItems = ref<string[]>([])

// 数据配置
const dataMetrics = ref<DataMetricUI[]>([
  {
    id: 'default_001',
    dataName: '分布统计',
    dataField: '',
    chartType: 'bar',
    color: '#1890ff',
    yAxisPosition: 'left',
    stackGroup: 'stack1',
    unit: '',
    itemColors: {}
  }
])

// 可选数据类型
const availableDataTypes = ref<DataTypeOption[]>([])

// 全局拖拽数据
const dragData = ref<DragData | null>(null)

// 提供拖拽数据给子组件
provide('dragData', dragData)

// ChartDisplayArea 组件引用
const chartDisplayAreaRef = ref()

// 维度指标过滤器数据
const dimensionIndicatorsFilter = ref<DimensionIndicatorsFilter | undefined>(undefined)

// 事件处理
const toggleLeftPanel = (status?: boolean) => {
  if (status === undefined) {
    leftPanelCollapsed.value = !leftPanelCollapsed.value
  } else {
    leftPanelCollapsed.value = status
  }
}

const onDragStart = (data: DragData) => {
  dragData.value = data
}

const onDragEnd = () => {
  dragData.value = null
}

// 解析树节点上携带的条件为框架的 ConditionGroup
const parseConditionGroup = (raw: any): ConditionGroup => {
  if (!raw) return { conditionList: [], andOr: '0' }
  try {
    const obj = typeof raw === 'string' ? JSON.parse(raw) : raw
    const andOr = (obj.andOr === '1' ? '1' : '0') as '0' | '1'
    const conditionList = Array.isArray(obj.conditionList) ? obj.conditionList : []
    return { conditionList, andOr }
  } catch (e) {
    console.warn('解析条件失败，使用空条件', raw, e)
    return { conditionList: [], andOr: '0' }
  }
}

// 转换函数：将IndicatorGroup转换为TalentIndicatorGroup
const convertToTalentIndicatorGroup = (group: IndicatorGroup | null): TalentIndicatorGroup | null => {
  if (!group) return null

  return {
    groupName: group.title,
    groupValue: String(group.key), // 确保是字符串类型
    indicatorItems: group.items?.map(item => ({
      itemName: item.title,
      itemValue: String(item.key), // 确保是字符串类型
      // 来自指标树节点的原始条件（可能是字符串/对象），统一解析为 ConditionGroup
      queryConditions: parseConditionGroup(item.condition)
    })) || []
  }
}

// 转换函数：将DataMetricUI转换为DataMetric
const convertToDataMetric = (metric: DataMetricUI): DataMetric => {
  return {
    dataName: metric.dataName,
    dataField: metric.dataField,
    chartType: metric.chartType,
    color: metric.color,
    yAxisPosition: metric.yAxisPosition,
    stackGroup: metric.stackGroup,
    unit: metric.unit,
    itemColors: metric.itemColors || {} as Record<string, string>
  };
};

// 转换函数：将selectedFilterItems转换为ConditionGroup
const convertToConditionGroup = (filterItems: string[], filterDimension: IndicatorGroup | null): ConditionGroup => {
  console.log('转换前的全局筛选条件:', {
    filterItems,
    filterDimension
  })

  // 如果没有筛选维度或没有选中的筛选项，返回空条件
  if (!filterDimension || !filterItems || filterItems.length === 0) {
    console.log('转换后的全局筛选条件(空):', {
      conditionList: [],
      andOr: '0'
    })
    return {
      conditionList: [],
      andOr: '0'
    }
  }

  // 根据选中的筛选项，构建条件组
  const itemConditionGroups: ConditionListType[] = []

  filterItems.forEach(itemKey => {
    const filterItem = filterDimension.items?.find(item => item.key === itemKey)

    if (filterItem && filterItem.condition) {
      try {
        // 解析筛选项的条件
        const itemConditions = parseConditionGroup(filterItem.condition)

        // 将每个筛选项作为一个独立的条件组
        if (itemConditions.conditionList && itemConditions.conditionList.length > 0) {
          // 如果只有一个条件，直接使用
          if (itemConditions.conditionList.length === 1) {
            itemConditionGroups.push(itemConditions.conditionList[0])
          } else {
            // 如果有多个条件，作为一个子条件组
            const subConditionGroup: ConditionListType = {
              property: null,
              value: null,
              relation: null,
              conditionList: itemConditions.conditionList,
              andOr: itemConditions.andOr // 保持原有的逻辑关系
            }
            itemConditionGroups.push(subConditionGroup)
          }
        }
      } catch (error) {
        console.warn('解析筛选项条件失败:', {
          itemKey,
          condition: filterItem.condition,
          error
        })
      }
    } else {
      console.warn('未找到筛选项或筛选项无条件:', {
        itemKey,
        filterItem
      })
    }
  })

  const result = {
    conditionList: itemConditionGroups,
    andOr: '1' as '0' | '1' // 多个筛选项之间用OR连接（选择了司局级 OR 处级）
  }

  console.log('转换后的全局筛选条件:', result)

  return result
}

const generateChart = async () => {
  if (!firstDimension.value) {
    message.error('请先选择一级维度（横坐标）')
    return
  }

  if (dataMetrics.value.length === 0) {
    message.error('请至少添加一个数据配置')
    return
  }

  // 校验规则1: 存在二级维度时，不能选择饼图
  if (secondDimension.value) {
    // 有二级维度时，不能选择饼图
    const pieChartMetrics = dataMetrics.value.filter(metric => metric.chartType === 'pie')
    if (pieChartMetrics.length > 0) {
      message.error('存在二级维度时，不能选择饼图')
      return
    }
  }

  // 校验规则2: 当数据选择的堆叠组一致时，必须确保选择的坐标轴位置也一致
  const stackGroups = new Map<string, string>() // stackGroup -> yAxisPosition
  for (const metric of dataMetrics.value) {
    if (metric.stackGroup && metric.stackGroup !== 'single') {
      if (stackGroups.has(metric.stackGroup)) {
        // 如果已经有这个堆叠组，检查坐标轴位置是否一致
        if (stackGroups.get(metric.stackGroup) !== metric.yAxisPosition) {
          message.error(`堆叠组 "${metric.stackGroup}" 的数据必须使用相同的坐标轴位置`)
          return
        }
      } else {
        // 记录这个堆叠组的坐标轴位置
        stackGroups.set(metric.stackGroup, metric.yAxisPosition)
      }
    }
  }

  // 打印生成图表所需的数据信息
  console.log('========== 生成图表数据调试信息 ==========')
  console.log('原始配置数据:', {
    firstDimension: firstDimension.value,
    secondDimension: secondDimension.value,
    filterDimension: filterDimension.value,
    selectedFilterItems: selectedFilterItems.value,
    dataMetrics: dataMetrics.value
  })

  // 转换为DimensionIndicatorsFilter类型并输出
  const firstDimensionConverted = convertToTalentIndicatorGroup(firstDimension.value);
  const secondDimensionConverted = convertToTalentIndicatorGroup(secondDimension.value);

  if (!firstDimensionConverted) {
    message.error('一级维度转换失败，请检查数据格式');
    return;
  }

  const filterData: DimensionIndicatorsFilter = {
    firstDimension: firstDimensionConverted,
    secondDimension: secondDimensionConverted, // 二级维度可以为null
    filterConditions: convertToConditionGroup(selectedFilterItems.value, filterDimension.value),
    dataMetrics: dataMetrics.value.map(convertToDataMetric)
  }

  // 更新维度指标过滤器数据
  dimensionIndicatorsFilter.value = filterData;

  // 输出DimensionIndicatorsFilter类型的数据
  console.log('========== DimensionIndicatorsFilter转换结果 ==========')
  console.log('完整的DimensionIndicatorsFilter数据:', filterData);
  console.log('转换后的全局筛选条件:', filterData.filterConditions);
  console.log('========================================================')

  // 等待下一个tick，确保props已经传递给子组件
  await nextTick();

  // 调用子组件的生成图表方法
  if (chartDisplayAreaRef.value) {
    try {
      await chartDisplayAreaRef.value.generateChart();
      message.success('图表生成成功')
    } catch (error) {
      console.error('图表生成失败:', error);
      message.error('图表生成失败，请检查数据配置或网络连接');
    }
  } else {
    message.error('图表组件未找到')
  }
}

// 图表生成成功事件处理
const onChartGenerated = (data: any) => {
  console.log('图表生成成功，数据:', data)
}

const { currentRoute } = useRouter()
const route = currentRoute.value
const config = ref({} as any)
// 组件挂载时加载数据
onMounted(async () => {
  if (isEmpty(tableId.value)) {
    tableId.value = route.query ? (route.query.tableId ? route.query.tableId : undefined) : undefined
  }
  try {

    await getIndicatorConfig(tableId.value).then(resp => indicatorTreeData.value = resp.payload)
    availableDataTypes.value.push({
      dataName: '分布统计',
      dataField: ''
    })
    const resp: any = await getPortalConfig(tableId.value)
    config.value = resp.payload
    config.value.columns.forEach((column: any) => {
      if (column.show === '0') return
      if (column.fieldType === FIELD_TYPE.MONEY) {
        availableDataTypes.value.push({
          dataName: column.displayName,
          dataField: column.property,
          unit: column.reference.split(",")[1]
        })
      }
      if (column.fieldType === FIELD_TYPE.NUMBER) {
        availableDataTypes.value.push({
          dataName: column.displayName,
          dataField: column.property
        })
      }
    })


  } catch (error) {
    console.error('加载数据失败:', error)
    message.error('加载数据失败，请稍后重试')
  }

  window.addEventListener('dragend', () => {
    dragData.value = null
  })
})
</script>

<style lang="less" src="./styles/dashboard.less"></style>