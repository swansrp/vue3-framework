import dayjs from 'dayjs'

import { ConditionListType } from '@/framework/components/common/AdvancedSearch/ConditionList/type'
import { MetricStatisticType } from '@/framework/components/common/Portal/dashboard/type'
import { ColumnType, FIELD_TYPE, FILTER_TYPE, TableConfigType } from '@/framework/components/common/Portal/type'
import { dictStore, useTreeStore } from '@/framework/store/common'
import { isNotEmpty } from '@/framework/utils/common'
import { formatMoney, formatPercent } from '@/framework/utils/formatter'

const dict = dictStore()
const treeDict = useTreeStore()
export const parse = (record: any, index: number, column: ColumnType, config: TableConfigType) => {
  record.index = (index + 1) + config.pageSize * (config.currentPage - 1)
  if (column.fieldType === FIELD_TYPE.SELECT || column.fieldType === FIELD_TYPE.SELECT_MULTI_IN_ONE) {
    record[column.dataIndex] = dict.getLabel(column.referenceDict, record[column.dataIndex])
  } else if (column.fieldType === FIELD_TYPE.TREE || column.fieldType === FIELD_TYPE.TREE_MULTI_IN_ONE) {
    record[column.dataIndex] = treeDict.getLabel(column.referenceDict, record[column.dataIndex])
  } else if (column.fieldType === FIELD_TYPE.DATE) {
    record[column.dataIndex] = isNotEmpty(record[column.dataIndex]) ? dayjs(record[column.dataIndex]).format('YYYY-MM-DD') : ''
  } else if (column.fieldType === FIELD_TYPE.DATETIME) {
    record[column.dataIndex] = isNotEmpty(record[column.dataIndex]) ? dayjs(record[column.dataIndex]).format('YYYY-MM-DD HH:mm:ss') : ''
  } else if (column.fieldType === FIELD_TYPE.MONEY) {
    record[column.dataIndex] = formatMoney(record[column.dataIndex], Number(column.referenceDict?.split(',')[0]), Number(column.referenceDict?.split(',')[1]))
  } else if (column.fieldType === FIELD_TYPE.PERCENT) {
    record[column.dataIndex] = formatPercent(record[column.dataIndex], Number(column.referenceDict?.split(',')[0]), Number(column.referenceDict?.split(',')[1]))
  }
  if (column.fieldType !== FIELD_TYPE.TEXT_AREA && column.width !== undefined) {
    column.width = column.width > getTextWidth(record[column.dataIndex]) ? column.width : getTextWidth(record[column.dataIndex])
  }
}

export const getTextWidth = (text: string) => {
  const textArray = text?.toString().split(/\n|\\n/g) || []
  let maxWidth = 0
  textArray.forEach((item) => {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d') as any
    let width
    if (item.length > 25) {
      width = context.measureText(item.substring(0, 14)).width * 1.6
    } else {
      width = context.measureText(item.substring(0, 25)).width * 1.6
    }
    maxWidth = maxWidth > width ? maxWidth : width
  })
  return maxWidth
}

export const buildCondition = (dtField?: string | null, relation?: FILTER_TYPE | null, data?: Array<any>) => {
  return {
    property: dtField && dtField,
    relation: relation && relation,
    value: data && [...data]
  } as ConditionListType
}

export const parseCustomerConditionStatistic = (statisticResList: Array<MetricStatisticType>): any => {
  const result = {} as any
  statisticResList.forEach(item => {
    if(isNotEmpty(item.children)) {
      result[item.metric] = {} as any
      item.children.forEach(child => {
        result[item.metric][child.metric] = child.statistic
      })
    } else {
      result[item.metric] = item.statistic
    }
  })
  return result
}

// ==================== Statistic Drill Condition ====================

/**
 * 从 statistic 请求体 + drillMetric 自动构建 Portal 穿透查询条件
 *
 * 在仪表盘/统计图中，用户点击某个指标（饼图扇区、柱图柱子、卡片等）时需要
 * 查看该指标的明细数据。传统做法是手动从 statistic body 中提取全局条件，
 * 再追加点击项的维度条件，拼装成 Portal Table 的 advanceCondition。
 *
 * 此函数将其通用化：只需传入原始 statistic 请求体 + 点击项标识（drillMetric），
 * 即可自动完成条件合并，无需各统计模块重复实现条件拼装逻辑。
 *
 * 支持三种 drillMetric 场景：
 * | 场景 | drillMetric 字段 | 自动追加的条件 |
 * |------|------------------|---------------|
 * | 纯条件穿透（点击卡片/列表项） | `{ conditionLabel: '正式客户' }` | 从 body.metricCondition 中匹配 label，提取其 condition |
 * | 纯分组穿透（点击饼图扇区/柱图柱子） | `{ metricColumn: 'province', metric: '北京' }` | 构建 `WHERE province = '北京'` |
 * | 分组 + 条件穿透（点击趋势子项） | 三者都传 | 同时追加，AND 合并 |
 * | NULL 值分组 | `metric = 'NULL'` | 构建 `WHERE column IS NULL` |
 *
 * 条件合并规则：
 *   最终 condition = body.condition.conditionList (全局条件) + drillConditionList (从 drillMetric 解析) AND 合并
 *
 * @param body 原始 statistic 请求体 (buildXxxBody 返回值)
 * @param drillMetric 穿透指标信息
 * @returns ConditionListType 格式的查询条件，可直接用作 Portal 的 advanceCondition prop
 *
 * @example
 * // 生命周期卡片：点击"正式客户"
 * buildDrillConditionFromStatistic(body, { conditionLabel: '正式客户' })
 * // 全局条件(area/plate/dy) AND customerStatus = '4'
 *
 * @example
 * // 客户类型饼图：点击"设计施工"
 * buildDrillConditionFromStatistic(body, { metricColumn: 'customerCategory', metric: '01' })
 * // 全局条件 AND customerCategory = '01'
 *
 * @example
 * // 趋势图：点击"2024年·北京"
 * buildDrillConditionFromStatistic(body, {
 *   metricColumn: 'province',
 *   metric: '北京',
 *   conditionLabel: '2024&&北京'
 * })
 * // 全局条件 AND dy = '2024' AND province = '北京'
 */
export function buildDrillConditionFromStatistic(
  body: any,
  drillMetric: {
    metricColumn?: string
    metric?: string
    conditionLabel?: string
  }
): ConditionListType {
  // 1. 提取全局筛选条件（来自 body.condition.conditionList）
  const globalConditionList: any[] = body?.condition?.conditionList ?? []

  // 2. 构建穿透维度条件
  const drillConditionList: any[] = []

  // 2a. conditionLabel → 从 metricCondition 中查找匹配的 condition
  if (drillMetric.conditionLabel && Array.isArray(body?.metricCondition)) {
    const matched = body.metricCondition.find(
      (mc: any) => mc.label === drillMetric.conditionLabel
    )
    const mcCondition = matched?.condition
    if (mcCondition) {
      if (Array.isArray(mcCondition.conditionList)) {
        // ConditionListType 格式: { conditionList: [...] }
        drillConditionList.push(...mcCondition.conditionList)
      } else if (mcCondition.property) {
        // 单条件对象格式: { property, relation, value }
        drillConditionList.push(mcCondition)
      }
    }
  }

  // 2b. metricColumn + metric → 构建等值条件
  if (drillMetric.metricColumn && drillMetric.metric !== undefined && drillMetric.metric !== null) {
    const rawMetric = String(drillMetric.metric)
    // NULL 值处理
    if (rawMetric === 'NULL' || rawMetric === '__NULL__') {
      drillConditionList.push({
        property: drillMetric.metricColumn,
        relation: 10, // IS NULL
        value: [],
      })
    } else {
      // 尝试从 dictMap 反查编码值（兼容传入 label 场景）
      let resolvedMetric = rawMetric
      const metricColumnConfig = Array.isArray(body?.metricColumn)
        ? body.metricColumn.find((mc: any) => mc.column === drillMetric.metricColumn)
        : null
      const dictMap = metricColumnConfig?.dictMap
      if (dictMap && typeof dictMap === 'object') {
        const entry = Object.entries(dictMap).find(([, v]) => v === rawMetric)
        if (entry) {
          resolvedMetric = entry[0]
        }
      }
      drillConditionList.push({
        property: drillMetric.metricColumn,
        relation: 1, // EQUAL
        value: [resolvedMetric],
      })
    }
  }

  // 3. 合并全局条件 + 穿透条件
  return {
    conditionList: [...globalConditionList, ...drillConditionList],
    andOr: '0',
  } as ConditionListType
}