import { Key } from 'ant-design-vue/es/_util/type'

interface NavNodeType {
    id?: Key,
    pid?: Key,
    menuType?: number,
    title?: string,
    key?: string,
    icon?: string,
    path: string,
    query?: string,
    component?: any,
    name?: string,
    meta?: Record<string, any>
}

interface NavListType extends NavNodeType {
    children?: Array<NavListType>,
}

export type { NavNodeType, NavListType }