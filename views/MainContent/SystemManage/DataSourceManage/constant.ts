import { FILTER_COMPONENT_TYPE, FILTER_TYPE, SORT } from '@/framework/components/common/surelyTable/contant'

// 数据源管理列定义
const surelyTableColumns = [
  { title: '序号', dataIndex: 'index', width: 80 },
  {
    title: '数据源名称', dataIndex: 'dsName', width: 180,
    customFilterDropdown: true,
    filterType: FILTER_TYPE.LIKE,
    filterComponentType: FILTER_COMPONENT_TYPE.INPUT,
    sorter: SORT
  },
  { title: '数据库类型', dataIndex: 'dsType', width: 120 },
  { title: 'JDBC 连接地址', dataIndex: 'jdbcUrl', minWidth: 300, autoHeight: true },
  { title: '用户名', dataIndex: 'username', width: 150 },
  { title: '默认', dataIndex: 'isDefault', width: 80 },
  { title: '备注', dataIndex: 'remark', width: 200, autoHeight: true },
  { title: '操作', dataIndex: 'operation', fixed: 'right', width: 220 },
]

surelyTableColumns.forEach((item: any) => {
  item.align = 'center'
  item.resizable = true
})

export default surelyTableColumns
