export interface MetricStatisticType {
  metricColumn: string
  metric: string,
  metricLabel: string,
  statistic: number,
  children: Array<MetricStatisticType>
}

export interface NameValue {
  parentName?: string
  name: string,
  value: number,
  itemStyle?: Object
}