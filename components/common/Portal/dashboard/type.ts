export interface NameValue {
  name: string,
  value: number,
  itemStyle?: Object
}

export interface Bar3dDataType {
  categoryId: Array<string>,
  category: Array<string>,
  number: Array<number>,
  amount: Array<number | string>
}