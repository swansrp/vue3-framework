export interface GroupBindProperty {
    // vue key 用于刷新组件（自增数字）
    key?: number
    // tab标识
    tabKey: string
    // tab标题显示
    title: string
    // url前缀（老模式：各业务模块专用绑定接口，如 'group/hr/dept'）
    // 与 bindType 互斥：配置了 bindType 时走通用接口，baseUrl 被忽略
    baseUrl?: string
    // 绑定类型（新模式：走 auth 模块通用接口 /web/group/bind）
    // 配置后无需后端建专用表/接口，前端用本地字典补全 label
    bindType?: string
    // 不显示绑定功能 只显示绑定结果
    readOnly?: boolean
    // 树形结构
    treeMode?: boolean
    // 字典名称
    dict?: string
    // 待绑定树或者列表
    data?: any
    // 已绑定的内容
    bindData?: any
    // 已绑定的内容中用于回显选定的字段
    bindDataValueField: string
    // 已绑定的内容中用于显示的字段
    bindDataDisplayField: string
    // 回显绑定的数据列表
    checked?: Array<any>
    // 支持绑定信息扩展（如 readOnly 等额外属性）
    supportBindInfo?: boolean
    // 绑定信息 Map，key 为 attachId，value 为绑定信息对象
    bindInfoMap?: Map<any, any>
    // 绑定信息默认值（当获取失败或无数据时使用）
    defaultBindInfo?: any
}