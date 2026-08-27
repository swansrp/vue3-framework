import { FILTER_COMPONENT_TYPE, FILTER_TYPE, SORT } from '@/framework/components/common/surelyTable/contant'

const surelyTableColumns = [
  { title: '序号', dataIndex: 'index', width: 80 },
  {
    title: 'Agent 编码', dataIndex: 'agentCode', width: 160,
    customFilterDropdown: true,
    filterType: FILTER_TYPE.LIKE,
    filterComponentType: FILTER_COMPONENT_TYPE.INPUT,
    sorter: SORT
  },
  {
    title: 'Agent 名称', dataIndex: 'agentName', width: 180,
    customFilterDropdown: true,
    filterType: FILTER_TYPE.LIKE,
    filterComponentType: FILTER_COMPONENT_TYPE.INPUT,
    sorter: SORT
  },
  { title: '绑定数据源', dataIndex: 'dsName', width: 150 },
  { title: '状态', dataIndex: 'status', width: 80 },
  { title: '思考强度(问数)', dataIndex: 'thinkingBudget', width: 120 },
  { title: '备注', dataIndex: 'remark', minWidth: 200, autoHeight: true },
  { title: '操作', dataIndex: 'operation', fixed: 'right', width: 400 },
]

surelyTableColumns.forEach((item: any) => {
  item.align = 'center'
  item.resizable = true
})

export default surelyTableColumns
