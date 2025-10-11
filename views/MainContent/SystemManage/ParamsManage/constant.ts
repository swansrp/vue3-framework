import { FILTER_COMPONENT_TYPE, FILTER_TYPE, SORT } from '@/framework/components/common/surelyTable/contant'

const surelyTableColumns = [
  { title: '序号', dataIndex: 'index', width: 80 },
  {
    title: '参数键名', dataIndex: 'configKey', width: 300,
    customFilterDropdown: true,
    filterType: FILTER_TYPE.LIKE,
    filterComponentType: FILTER_COMPONENT_TYPE.INPUT,
  },
  {
    title: '参数名称', dataIndex: 'configName', width: 250,
    customFilterDropdown: true,
    filterType: FILTER_TYPE.LIKE,
    filterComponentType: FILTER_COMPONENT_TYPE.INPUT,
    sorter: SORT
  },
  { title: '参数键值', dataIndex: 'configValue', minWidth: 220, autoHeight: true, sorter:SORT },
  { title: '操作', dataIndex: 'operation', fixed: 'right', width: 140 },
]

surelyTableColumns.forEach((item: any) => {
  item.align = 'center'
  item.resizable = true
})

export default surelyTableColumns
