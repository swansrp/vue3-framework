import { ColumnsType } from 'ant-design-vue/es/table/interface'

const surelyTableColumns = [
  { title: '序号', dataIndex: 'index', width: 80 },
  { title: '渠道名称', dataIndex: 'remark', minWidth: 200 },
  { title: '应用标识', dataIndex: 'appKey', width: 160 },
  { title: '应用密钥', dataIndex: 'appSecret', width: 260 },
  { title: '创建时间', dataIndex: 'createAt', width: 200 },
  { title: '有效性', dataIndex: 'statusDisplay', width: 120 },
  { title: '操作', dataIndex: 'operation', fixed: 'right', width: 240 }
] as unknown as ColumnsType[]
surelyTableColumns.forEach((item: any) => {item.align = 'center';item.resizable = true})
export default surelyTableColumns
