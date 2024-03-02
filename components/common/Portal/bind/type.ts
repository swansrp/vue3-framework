
export type PortalBindType = {
    /**
     * TAB标题
     */
    title: string,
    /**
     * 对应实体ID
     */
    tableId: string,
    /**
     * 是否显示绑定按钮(是否是N:N关系)
     */
    showBind: boolean,
    /**
     * 是否以树的形式展示
     */
    treeMode?: boolean,
    /**
     * 树形结构显示是否严格节点显示
     */
    checkStrictly?: boolean,
    /**
     * 1:N 关联字段名
     */
    bindFieldProperty?: string
}
