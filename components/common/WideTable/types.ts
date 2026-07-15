/** 固定列类型 */
export type FixedColumnType = 'string' | 'datetime' | 'dict'

/** 固定列定义（业务层注入） */
export interface FixedColumn {
  /** 物理列名（对应物理表列名） */
  field: string
  /** 显示名 */
  label: string
  /** 列宽 */
  width?: number
  /** 列类型 */
  type?: FixedColumnType
  /** 字典ID（type=dict 时必填） */
  dictId?: string
}

/** 产品选项（框架组件约定的数据结构） */
export interface ProductOption {
  id: number
  title: string
  formId: string
}
