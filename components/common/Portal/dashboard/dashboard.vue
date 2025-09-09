<template>
  <div class="hr-indicator-dashboard">
    <!-- 左侧指标树面板 -->
    <IndicatorTreePanel
      :collapsed="leftPanelCollapsed"
      :indicator-tree-data="indicatorTreeData"
      @drag-start="onDragStart"
      @drag-end="onDragEnd"
    />

    <!-- 右侧配置面板 -->
    <ConfigPanel
      :left-panel-collapsed="leftPanelCollapsed"
      v-model:first-dimension="firstDimension"
      v-model:second-dimension="secondDimension"
      v-model:filter-dimension="filterDimension"
      v-model:selected-filter-items="selectedFilterItems"
      v-model:data-metrics="dataMetrics"
      :available-data-types="availableDataTypes"
      @toggle-left-panel="toggleLeftPanel"
      @generate-chart="generateChart"
    />

    <!-- 中间展示区域 -->
    <ChartDisplayArea />
  </div>
</template>

<script lang="ts" setup>
import {ref, provide, onMounted} from 'vue'
import {message} from 'ant-design-vue'
import { advancedSelect, getIndicatorConfig } from '@/framework/apis/portal'
import {FIELD_TYPE, QueryType} from '@/framework/components/common/Portal/type'
import {getGroup} from '@/apis/dashboard/hr/talentReview'
import { DimensionIndicatorsFilter, IndicatorGroup as TalentIndicatorGroup, DataMetric, ConditionGroup } from '../../../../../views/dashboard/hr/talentReview/DimensionIndicatorsFilter'
import { ConditionListType } from '@/framework/components/common/AdvancedSearch/ConditionList/type'

// 导入子组件
import IndicatorTreePanel from './components/IndicatorTreePanel.vue'
import ConfigPanel from './components/ConfigPanel.vue'
import ChartDisplayArea from './components/ChartDisplayArea.vue'
import {getPortalConfig} from "@/framework/apis/portal/config";
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

// 事件处理
const toggleLeftPanel = () => {
  leftPanelCollapsed.value = !leftPanelCollapsed.value
}

const onDragStart = (data: DragData) => {
  dragData.value = data
}

const onDragEnd = () => {
  dragData.value = null
}

// 转换函数：将IndicatorGroup转换为TalentIndicatorGroup
const convertToTalentIndicatorGroup = (group: IndicatorGroup | null): TalentIndicatorGroup | null => {
  if (!group) return null;
  
  return {
    groupName: group.title,
    groupValue: group.key,
    indicatorItems: group.items?.map(item => ({
      itemName: item.title,
      itemValue: item.key,
      queryConditions: {
        conditionList: [],
        andOr: '0'
      }
    })) || []
  };
};

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
    itemColors: metric.itemColors || {}
  };
};

// 转换函数：将selectedFilterItems转换为ConditionGroup
const convertToConditionGroup = (filterItems: string[]): ConditionGroup => {
  const conditionList: ConditionListType[] = filterItems.map(item => ({
    property: null,
    value: [item],
    relation: null,
    conditionList: [],
    andOr: '0'
  }));
  
  return {
    conditionList: conditionList,
    andOr: '0'
  };
};

const generateChart = (chartData?: {
  firstDimension: IndicatorGroup | null,
  secondDimension: IndicatorGroup | null,
  filterDimension: IndicatorGroup | null,
  selectedFilterItems: string[],
  dataMetrics: DataMetricUI[]
}) => {
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
    const pieChartMetrics = dataMetrics.value.filter(metric => metric.chartType === 'pie');
    if (pieChartMetrics.length > 0) {
      message.error('存在二级维度时，不能选择饼图');
      return;
    }
  }

  // 校验规则2: 当数据选择的堆叠组一致时，必须确保选择的坐标轴位置也一致
  const stackGroups = new Map<string, string>(); // stackGroup -> yAxisPosition
  for (const metric of dataMetrics.value) {
    if (metric.stackGroup && metric.stackGroup !== 'single') {
      if (stackGroups.has(metric.stackGroup)) {
        // 如果已经有这个堆叠组，检查坐标轴位置是否一致
        if (stackGroups.get(metric.stackGroup) !== metric.yAxisPosition) {
          message.error(`堆叠组 "${metric.stackGroup}" 的数据必须使用相同的坐标轴位置`);
          return;
        }
      } else {
        // 记录这个堆叠组的坐标轴位置
        stackGroups.set(metric.stackGroup, metric.yAxisPosition);
      }
    }
  }

  // 打印生成图表所需的数据信息
  console.log('生成图表数据:', {
    firstDimension: firstDimension.value,
    secondDimension: secondDimension.value,
    filterDimension: filterDimension.value,
    selectedFilterItems: selectedFilterItems.value,
    dataMetrics: dataMetrics.value
  })

  // 如果有传递的图表数据，使用传递的数据
  if (chartData) {
    console.log('接收到的图表数据:', chartData)
  }

  // 转换为DimensionIndicatorsFilter类型并输出
  const dimensionIndicatorsFilter: DimensionIndicatorsFilter = {
    firstDimension: convertToTalentIndicatorGroup(firstDimension.value)!,
    secondDimension: convertToTalentIndicatorGroup(secondDimension.value)!,
    filterConditions: convertToConditionGroup(selectedFilterItems.value),
    dataMetrics: dataMetrics.value.map(convertToDataMetric)
  };

  // 输出DimensionIndicatorsFilter类型的数据
  console.log('DimensionIndicatorsFilter数据:', dimensionIndicatorsFilter);

  // 生成图表配置逻辑
  console.log('生成图表配置成功')
  message.success('图表配置生成成功')
}

// 数据转换函数
const getDefaultCondition = (): QueryType => {
  return {
    selectColumnCondition: new Map<string, any>(),
    condition: {
      conditionList: [
        {
          conditionList: []
        }
      ],
      andOr: '0'
    },
    conditionList: [],
    sortList: [],
    pageSize: 10,
    currentPage: 1
  }
}

// 数据转换函数
const transformApiDataToTreeData = (groupData: any[], itemData: any[]): IndicatorGroup[] => {
  const groupMap = new Map<number, any>()
  groupData.forEach(group => {
    groupMap.set(group.id, {
      ...group,
      children: [],
      items: []
    })
  })

  const itemsByGroupId = new Map<number, any[]>()
  itemData.forEach(item => {
    if (!itemsByGroupId.has(item.groupId)) {
      itemsByGroupId.set(item.groupId, [])
    }
    itemsByGroupId.get(item.groupId)!.push({
      key: item.itemValue,
      title: item.itemName,
      condition: item.condition
    })
  })

  const rootGroups: IndicatorGroup[] = []

  groupData.forEach(group => {
    const groupNode: IndicatorGroup = {
      key: group.id.toString(),
      title: group.name,
      children: [],
      isLeaf: false
    }

    if (group.pid === null) {
      rootGroups.push(groupNode)
    } else {
      const indicatorNode: IndicatorGroup = {
        key: group.id.toString(),
        title: group.name,
        isLeaf: true,
        items: itemsByGroupId.get(group.id) || []
      }

      const parentGroup = rootGroups.find(root => root.key === group.pid.toString())
      if (parentGroup) {
        parentGroup.children = parentGroup.children || []
        parentGroup.children.push(indicatorNode)
      }
    }
  })

  return rootGroups
}
const { currentRoute } = useRouter();
const route = currentRoute.value;
const tableId = route.query ? route.query.tableId ? route.query.tableId : undefined : undefined
// 组件挂载时加载数据
onMounted(async () => {
  try {
    const condition = getDefaultCondition()

    const [itemResponse, groupResponse] = await Promise.all([
      advancedSelect("hr/indicator/item", condition, "/erp", true, false),
      getGroup()
    ])

    console.log("指标数据", itemResponse.payload)
    console.log("getGroup", groupResponse.payload)

    indicatorTreeData.value = transformApiDataToTreeData(
        groupResponse.payload || [],
        itemResponse.payload || []
    )

    await getIndicatorConfig('DimPubUserNo').then(resp => indicatorTreeData.value = resp.payload)

    console.log('转换后的数据:', indicatorTreeData.value)
    availableDataTypes.value.push({
      dataName: '分布统计',
      dataField: '',
    })
    const resp: any = await getPortalConfig('DimPubUserNo')
    resp.payload.columns.forEach((column: any) => {
      if (column.show === '0') return;
      if (column.fieldType === FIELD_TYPE.MONEY) {
        availableDataTypes.value.push({
          dataName: column.displayName,
          dataField: column.property,
          unit: column.reference.split(",")[1]
        })
      }
      if(column.fieldType === FIELD_TYPE.NUMBER){
        availableDataTypes.value.push({
          dataName: column.displayName,
          dataField: column.property,
        })
      }
    })


  } catch (error) {
    console.error('加载数据失败:', error)
    message.error('加载数据失败，请稍后重试')
  }

  window.addEventListener('dragend', () => {
    console.log('拖拽结束')
    dragData.value = null
  })
})
</script>

<style lang="less" src="./styles/dashboard.less"></style>