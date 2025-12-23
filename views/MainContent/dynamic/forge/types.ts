/**
 * 动态矩阵配置相关类型定义
 */

// 矩阵信息
export interface MatrixInfo {
  id?: string
  tableName: string
  tableComment: string
  dataSource?: string
  primaryKey?: string
  engine?: string
  charset?: string
  status?: string
  sort?: number
  createAt?: string
  createName?: string
  updateAt?: string
  updateName?: string
}

// 字段信息
export interface ColumnInfo {
  id?: string
  matrixId: string
  columnName: string
  columnComment: string
  columnType: string
  fieldType: string
  columnLength?: number
  decimalPlaces?: number
  isNullable?: string
  isPrimaryKey?: string
  isIndex?: string
  isUnique?: string
  isVisible?: string // 是否显示
  defaultValue?: string
  showOrder?: number
  isDisplayNameField?: string // 名称字段
  isOrderField?: string // 顺序字段
  isPidField?: string // 父节点字段
  referenceMatrixId?: string // 关联矩阵
  referenceDict?: string // 关联字典
  sequence?: string // 引用序列
}

// 表单配置
export interface FormConfigInfo {
  id?: string
  matrixId: string
  columnId: string
  label: string
  description?: string
  fieldType: string
  isRequired?: string
  readonly?: string
  validationRule?: string
  minValue?: string
  maxValue?: string
  dict?: string
  unit?: string
  width?: number
  height?: number
  positionX?: number
  positionY?: number
  showOrder?: number
  sort?: number
}

// 联动配置
export interface LinkageInfo {
  id?: string
  formConfigId: string
  linkageName: string
  triggerEvent: string
  conditionScript?: string
  actionScript: string
  targetFields?: string
  priority?: number
  isEnabled?: string
  showOrder?: number
}

// 表结构变更历史
export interface MatrixChangeLog {
  id?: string
  matrixId: string
  version: number
  changeType: string
  changeDesc?: string
  ddlStatement?: string
  affectedColumn?: string
  executeStatus: string
  errorMsg?: string
  sort?: number
  createAt?: string
  createBy?: string
  updateAt?: string
  updateBy?: string
}

// 列类型选项
export const COLUMN_TYPES = [
  { label: 'VARCHAR - 短文本', value: 'VARCHAR', hasLength: true },
  { label: 'TEXT - 长文本', value: 'TEXT', hasLength: false },
  { label: 'INT - 整数', value: 'INT', hasLength: false },
  { label: 'BIGINT - 长整数', value: 'BIGINT', hasLength: false },
  { label: 'DECIMAL - 小数', value: 'DECIMAL', hasLength: true, hasDecimal: true },
  { label: 'DATE - 日期', value: 'DATE', hasLength: false },
  { label: 'DATETIME - 日期时间', value: 'DATETIME', hasLength: false },
]

// 字段类型选项
export const FIELD_TYPES = [
  { label: '单行文本', value: '1' },
  { label: '真值', value: '2' },
  { label: '数字', value: '3' },
  { label: '下拉选择', value: '4' },
  { label: '树形下拉', value: '5' },
  { label: '日期', value: '6' },
  { label: '日期时间', value: '7' },
  { label: '超链接', value: '8' },
  { label: 'HTML', value: '9' },
  { label: '多行文本', value: '10' },
  { label: '实体', value: '11' },
  { label: '图片', value: '12' },
  { label: '视频', value: '13' },
  { label: '音频', value: '14' },
  { label: '文件', value: '15' },
  { label: '货币', value: '16' },
  { label: '百分比', value: '17' },
  { label: '下拉多选', value: '18' },
  { label: '树形多选', value: '19' },
  { label: '实体条件', value: '20' },
]

// 触发事件类型
export const TRIGGER_EVENTS = [
  { label: '值改变', value: 'change' },
  { label: '失去焦点', value: 'blur' },
  { label: '获得焦点', value: 'focus' },
]

// 变更类型
export const CHANGE_TYPES = [
  { label: '创建表', value: '1', color: 'blue' },
  { label: '添加字段', value: '2', color: 'green' },
  { label: '调整字段顺序', value: '3', color: 'orange' },
  { label: '添加索引', value: '4', color: 'cyan' },
  { label: '删除索引', value: '5', color: 'red' },
  { label: '删除字段', value: '6', color: 'magenta' },
  { label: '修改表注释', value: '7', color: 'purple' },
]

// 执行状态
export const EXECUTE_STATUS = [
  { label: '失败', value: '0', color: 'red' },
  { label: '成功', value: '1', color: 'success' },
]
