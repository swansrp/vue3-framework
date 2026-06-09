import { Component } from 'vue'

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
    // 自定义组件模式（非 list / tree，完全由子组件自行渲染）
    customComponent?: Component
    // 传递给自定义组件的额外 props
    customComponentProps?: Record<string, any>
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