import { ConditionType } from '@/framework/components/common/AdvancedSearch/type'
import { ConditionListType } from '@/framework/components/common/AdvancedSearch/ConditionList/type'

export type TableConfigType = {
  // tableId 配合后端指明表格用途
  tableId: string,
  // 网络地址
  url: string,
  // vue-key 变更重新渲染
  key: number,
  // 表格中文名称
  title: string,
  // 表格大小
  size: string,
  // 表格中作为id的Column
  rowKey: string,
  // 表格中作为名字的Column
  nameKey: string,
  // 表格中作为父类id的column
  parentKey: string,
  // 表格加载样式
  loading: boolean,
  // 表格渲染图层
  getPopupContainer: Function
  // 分页当前页
  currentPage: number,
  // 分页每页大小
  pageSize: number,
  // 分页共多少页
  total: number,
  // 只读表格(屏蔽所有编辑操作)
  readOnly: boolean,
  // 总计栏
  summary: boolean,
  // 树形结构
  treeMode: boolean,
  // 树形结构支持拖拽
  treeDragAble: boolean,
  // 是否能够调整顺序
  orderMode: boolean,
  // 树形栏是否显示
  treeMenuShow: boolean,
  // 保存全部按钮是否显示,
  saveAllButtonShow: boolean,
  // 弹框
  modal: ModalType,
  // 详情每行显示个数
  descriptionCount: number,
  // 详情弹框宽度
  detailWidth: string,
  // 新增弹框宽度
  addWidth: string,
  // 编辑弹框宽度
  editWidth: string,
  // 支持弹框新增
  addModalAble: boolean,
  // 支持弹框编辑
  editModalAble: boolean,
  // 支持导入
  importAble: boolean,
  // 支持导出
  exportAble: boolean,
  // 默认筛选条件
  defaultCondition: ConditionListType
  // 默认排序
  defaultSort: Array<QuerySortType>
}

export type ModalType = {
  show: boolean,
  type: 'view' | 'add' | 'modify' | 'association' | undefined,
  data: { [key: string]: any },
  // 当前修改的rowId
  editRowIndex: any
}

export type UploadModalType = {
  show: boolean,
  type: 'INIT' | 'UPLOAD' | 'VALIDATE' | 'SAVE' | 'SUCCESS' | 'FAILED'
  step: Number,
  file: Array<any>,
  total: Number,
  loaded: Number,
  percent: Number,
  failedReason: Array<String>
}

export type ColumnType = {
  // region 基础显示样式
  // 标题
  title: string,
  // 字段名
  dataIndex: string,
  // key
  key: string,
  // dbField
  dbField: string,
  // 对齐方式
  align: string,
  // 内容对齐方式
  contentAlign: string,
  // 列宽
  width: number,
  // 最小列宽
  minWidth: number,
  // 最大列宽
  maxWidth: number,
  // 锁定列
  fixed: boolean | string,
  // 列宽调整
  resizable: boolean,
  // 弹出框
  tooltip: any,
  // 自动高度
  autoHeight: boolean,
  // endregion
  // region 列隐藏/显示
  // 是否不可选择是否显示
  disabled: boolean,
  // 是否选中(选择是否显示)
  checked: boolean
  // endregion

  // region 筛选查询
  // 能否查询
  filterAble: boolean,
  // 严格/模糊查询
  filterStrict: boolean,
  // 能否排序
  sorter: boolean,
  // 表头菜单显示方式
  showMenu: 'hover' | boolean
  // 下拉筛选器
  customFilterDropdown: boolean,
  // 筛选器状态响应
  onFilterDropdownOpenChange: any,
  // endregion


  // region 编辑内容
  // 拖动改变顺序手柄
  rowDrag: boolean, // 编辑单元格
  editable: 'cellEditorSlot' | boolean, // 编辑单元格格式响应
  // endregion

  // region 后端配置
  // 字段类型
  fieldType: string,
  // 相关字典
  referenceDict: string,
  // 字典选项
  referenceDictOption: Array<any>,
  // 相关实体字段
  referenceEntityField: string,
  // 相关实体关联条件
  entityCondition: ConditionType
  //endregion

  // region 内容约束
  required: boolean,
  // 最小值(长度)
  min: number, // 最大值(长度)
  max: number, // 默认值
  defaultValue: any,
  // endregion

  // region 详情显示
  // 字段显示组名称
  displayGroupName: string
  // 详情显示格数
  detailSize: number,
  // 详情弹框布局显示后占位填充
  detailPadding: number,
  // 新增显示格数
  addSize: number,
  // 新增弹框布局显示后占位填充
  addPadding: number,
  // 新增弹框布局disable显示
  addDisabled: boolean
  // 编辑显示格数
  editSize: number,
  // 编辑弹框布局显示后占位填充
  editPadding: number,
  // 编辑弹框布局disable显示
  editDisabled: boolean
  // 详情是否显示
  detailShow: boolean,
  // 新增是否显示
  addShow: boolean,
  // 编辑是否显示
  editShow: boolean
  // endregion

}

export type ModifyCellType = {
  // 是否更新
  needUpdated: boolean,
  // 当前值
  current: any,
  // 原始值
  original: any,
  // 行标
  rowIndex: number,
  // 字段名
  dataIndex: string,
  // 行id
  id: any
}

export enum FILTER_TYPE {
  EQUAL = 1,
  NOT_EQUAL,
  GREATER,
  GREATER_EQUAL,
  LESS,
  LESS_EQUAL,
  NULL,
  NOT_NULL,
  LIKE,
  NOT_LIKE,
  IN,
  NOT_IN,
  BETWEEN,
  NOT_BETWEEN,
  CONTAIN,
  CONTAIN_IN
}

export enum FIELD_TYPE {
  DEFAULT = '0',
  INPUT = '1',
  SWITCH = '2',
  NUMBER = '3',
  SELECT = '4',
  TREE = '5',
  DATE = '6',
  DATETIME = '7',
  HREF = '8',
  HTML = '9',
  TEXT_AREA = '10',
  ENTITY = '11',
  IMAGE = '12',
  VIDEO = '13',
  AUDIO = '14',
  FILE = '15',
  MONEY = '16',
  PERCENT = '17',
  SELECT_MULTI_IN_ONE = '18',
  TREE_MULTI_IN_ONE = '19',
  ENTITY_CONDITION = '20'
}

export enum UPLOAD_FILE_TYPE {
  DOC = '1',
  IMG = '2',
  VIDEO = '3',
  APK = '4',
  AUDIO = '5',
  TEXT = '6',
  FILE = '7',
  WORD = '8',
  EXCEL = '9',
  PPT = '10',
  PDF = '11',
  LOG = '12',
  OTHER = '13'
}

export type QuerySortType = {
  property: string
  type: 0 | 1
}

export type QueryType = {
  condition: ConditionType,
  sortList: Array<QuerySortType>
  currentPage: number,
  pageSize: number
}

export type UpdateOrderType = {
  id: string | number,
  showOrder: number
}

export type UpdatePidType = {
  id: string | number,
  pid: string | number | null
}





