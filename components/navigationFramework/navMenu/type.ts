import {Key} from "ant-design-vue/es/_util/type";

interface NavListType extends NavNodeType {
    children: Array<NavListType>,
}

interface NavNodeType {
    id: Key,
    pid: Key,
    menuType: number,
    title: string,
    key: string,
    icon: string,
    path: string,
    query: string,
    component: any
}

export type {NavNodeType, NavListType}
