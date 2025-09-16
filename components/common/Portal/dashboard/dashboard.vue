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
      :left-panel-collapsed="leftPanelCollapsed" @toggle-left-panel="toggleLeftPanel" @generate-chart="generateChart"
      @clear-chart="clearChart" />

    <!-- 中间展示区域 -->
    <ChartDisplayArea
      ref="chartDisplayAreaRef" :config="config" :received-data="dimensionIndicatorsFilter"
      class="chart-display-area" />
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
  unitConfig?: string // 原始单位配置，如 "2,10000"
  itemColors?: Record<string, string>
}

interface DataTypeOption {
  dataName: string
  dataField: string
  unit?: string
  unitConfig?: string // 原始单位配置，如 "2,10000"
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
    stackGroup: 'noStack',
    unit: '个',
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

// 解析单位配置函数：解析格式如"2,10000"的配置
const parseUnitConfig = (unitConfig: string): { fix: number; unit: number; displayUnit: string } => {
  if (!unitConfig || typeof unitConfig !== 'string') {
    return { fix: 2, unit: 1, displayUnit: '元' };
  }

  const parts = unitConfig.split(',');
  if (parts.length !== 2) {
    return { fix: 2, unit: 1, displayUnit: '元' };
  }

  const fix = parseInt(parts[0], 10) || 2;
  const unit = parseInt(parts[1], 10) || 1;

  // 根据单位数值生成显示单位
  const unitMap: Record<number, string> = {
    1: '元',
    10: '十元',
    100: '百元',
    1000: '千元',
    10000: '万元'
  };

  const displayUnit = unitMap[unit] || `${unit}元`;

  return { fix, unit, displayUnit };
};

// 单位转换函数：将数字单位转换为中文单位（保持向后兼容）
const convertUnitToChineseUnit = (unitValue: string | number): string => {
  if (typeof unitValue === 'string' && unitValue.includes(',')) {
    const { displayUnit } = parseUnitConfig(unitValue);
    return displayUnit;
  }

  const numericUnit = typeof unitValue === 'string' ? parseInt(unitValue, 10) : unitValue;

  if (isNaN(numericUnit)) {
    return unitValue?.toString() || '';
  }

  const unitMap: Record<number, string> = {
    1: '元',
    10: '十元',
    100: '百元',
    1000: '千元',
    10000: '万元'
  };

  return unitMap[numericUnit] || `${numericUnit}元`;
};

// 转换函数：将DataMetricUI转换为DataMetric
const convertToDataMetric = (metric: DataMetricUI): DataMetric => {
  // 解析单位配置以获取格式化参数
  const unitConfig = metric.unitConfig; // 不设置默认值，只有金额字段才有值
  const { fix, unit: unitDivisor } = unitConfig ? parseUnitConfig(unitConfig) : { fix: 0, unit: 1 };

  return {
    dataName: metric.dataName,
    dataField: metric.dataField,
    chartType: metric.chartType,
    color: metric.color,
    yAxisPosition: metric.yAxisPosition,
    stackGroup: metric.stackGroup,
    unit: metric.unit,
    unitConfig: unitConfig, // 使用处理后的unitConfig（金额字段有值，其他字段为undefined）
    formatConfig: { fix, unitDivisor }, // 添加格式化配置
    itemColors: metric.itemColors || {} as Record<string, string>
  };
};

// 转换函数：将selectedFilterItems转换为ConditionGroup
const convertToConditionGroup = (filterItems: string[], filterDimension: IndicatorGroup | null): ConditionGroup => {

  // 如果没有筛选维度或没有选中的筛选项，返回空条件
  if (!filterDimension || !filterItems || filterItems.length === 0) {
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

// 清除图表方法
const clearChart = () => {
  if (chartDisplayAreaRef.value) {
    try {
      chartDisplayAreaRef.value.clearChart();
    } catch (error) {
      console.error('清除图表失败:', error);
    }
  }
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
    // 确保 config 中包含正确的 tableId
    config.value.tableId = tableId.value
    config.value.columns.forEach((column: any) => {
      if (column.show === '0') return
      if (column.fieldType === FIELD_TYPE.MONEY) {

        // 只要是金额字段且有 reference 配置，就设置格式化配置
        if (column.reference && column.reference.trim() !== '') {
          const rawUnitConfig = column.reference // 使用完整的reference，格式可能是 "2,10000"、"2,1000"、"2,100" 等

          const convertedUnit = convertUnitToChineseUnit(rawUnitConfig)

          availableDataTypes.value.push({
            dataName: column.displayName,
            dataField: column.property,
            unit: convertedUnit,
            unitConfig: rawUnitConfig // 保存原始单位配置用于格式化
          })
        } else {
          // 对于没有reference配置的金额字段，不设置 unitConfig，表示不需要特殊格式化
          availableDataTypes.value.push({
            dataName: column.displayName,
            dataField: column.property,
            unit: '元', // 默认单位
            unitConfig: undefined // 不设置 unitConfig，表示不需要特殊格式化
          })
        }
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