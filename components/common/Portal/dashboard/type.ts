export interface MetricStatisticType {
  metric: string,
  statistic: number,
  children: Array<MetricStatisticType>
}

export interface NameValue {
  name: string,
  value: number,
  itemStyle?: Object
}