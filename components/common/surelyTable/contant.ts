export const FILTER_TYPE = {
  EQUAL: 1,
  NOT_EQUAL: 2,
  GREATER: 3,
  GREATER_EQUAL: 4,
  LESS: 5,
  LESS_EQUAL: 6,
  NULL: 7,
  NOT_NULL: 8,
  LIKE: 9,
  NOT_LIKE: 10,
  IN: 11,
  NOT_IN: 12,
  BETWEEN: 13,
  NOT_BETWEEN: 14,
}

export const FILTER_COMPONENT_TYPE = {
  DEFAULT: 0,
  INPUT: 1,
  SWITCH: 2,
  NUMBER: 3,
  SELECT: 4,
  TREE: 5,
  DATE: 6,
  DATETIME: 7,
  HREF: 8,
  HTML: 9,
  TEXT_AREA: 10
}

export interface SortObjType {
  property: string
  type: number
}

export const SORT_TYPE : {[key: string ]: number} = {
  'ascend': 0,
  'descend': 1
}

export const SORT = {
  compare: () => {},
  multiple: 1
}

export const DATA_FORMAT = {
  YYYY: 'YYYY',
  YYYY_MM: 'YYYY-MM',
  YYYY_MM_DD: 'YYYY-MM-DD',
  YYYY_MM_DD_HH_MM_SS: 'YYYY-MM-DD HH:mm:ss'
}

export interface QueryConditionType {
  [key: string]: {
    value: Array<string>
    relation: number
    property: string
    dataFormat?: string
  }
}
