interface NavListType {
    title: string,
    key: string,
    icon: string,
    path: string
    children: Array<NavListType>,
    component: any
}

export type {NavListType}
