import { ColumnsType } from 'ant-design-vue/es/table/interface'

// 应用管理（子系统注册表）列配置——行字段契约对齐 QuerySubsystemRes（含服务端带出的 partnerAppKey）
const surelyTableColumns = [
  { title: '序号', dataIndex: 'index', width: 70 },
  { title: '应用编码', dataIndex: 'appCode', width: 150 },
  { title: '名称', dataIndex: 'name', minWidth: 160 },
  { title: '渠道标识', dataIndex: 'partnerAppKey', width: 140 },
  { title: '入口类型', dataIndex: 'entryType', width: 100 },
  { title: '入口地址', dataIndex: 'entryUrl', minWidth: 200 },
  { title: '有效性', dataIndex: 'status', width: 90 },
  { title: '全租户可见', dataIndex: 'visibleToAllTenant', width: 110 },
  { title: '排序', dataIndex: 'orderNo', width: 80 },
  { title: '说明', dataIndex: 'description', minWidth: 160 },
  { title: '操作', dataIndex: 'operation', fixed: 'right', width: 260 }
] as unknown as ColumnsType[]
surelyTableColumns.forEach((item: any) => {item.align = 'center';item.resizable = true})
export default surelyTableColumns
