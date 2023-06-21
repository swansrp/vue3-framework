import { ColumnsType } from "ant-design-vue/es/table/interface";

const surelyTableColumns = [
  {title: '序号', dataIndex: 'index', width: 100},
  {title: '应用标识', dataIndex: 'appKey', width: 150},
  {title: '应用密钥', dataIndex: 'appSecret', width: 350},
  {title: '所属平台', dataIndex: 'platform', width: 250},
  {title: '创建时间', dataIndex: 'createAt', width: 200},
  {title: '有效性', dataIndex: 'statusDisplay', minWidth: 200},
  {title: '操作', dataIndex: 'operation', fixed: 'right', width: 140}
] as unknown as ColumnsType[]
surelyTableColumns.forEach((item: any) => {item.align = 'center';item.resizable = true})
export default surelyTableColumns
