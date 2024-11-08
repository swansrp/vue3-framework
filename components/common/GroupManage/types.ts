export interface GroupBindProperty {
    // vue key 用于刷新组件
    key?: boolean
    // tab标识
    tabKey: string
    // tab标题显示
    title: string
    // url前缀
    baseUrl: string
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
}