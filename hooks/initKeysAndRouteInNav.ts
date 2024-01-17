import {message} from "ant-design-vue"
import {goBackTo} from "@/framework/router/utils"
import {HOME, MAIN_CONTENT} from "@/framework/utils/constant"
import { Key } from 'ant-design-vue/es/table/interface'
import {NavListType} from "@/framework/components/navigationFramework/navMenu/type"

// 根据左侧导航的展开项的key，找到其对应的title路径，从而用于组件CrumbSearch中面包屑的展示
const getTitlePathByKey = (tree: Array<any>, targetKey: Key) => {
    // 定义数组，用来保存路径节点title
    const nodeTitlePathArray:Array<string> = []
    const nodePathArray:Array<string> = []
    // tree为目标树，targetKey为目标节点key
    function getPath(tree: Array<any>, targetKey: Key) {
        for (const item of tree) {
            if (item.children) {
                const endRecursiveLoop = getPath(item.children, targetKey)
                if (endRecursiveLoop) {
                    nodeTitlePathArray.push(item.title)
                    nodePathArray.push(item.key)
                    return true
                }
            } // 对应的接口返回数据中，path是需要匹配的字段
            if (item.key === targetKey) {
                nodeTitlePathArray.push(item.title)
                nodePathArray.push(item.key)
                return true
            }
        }
    }
    getPath(tree, targetKey)
    return {titlePath: nodeTitlePathArray.reverse(), keyPath: nodePathArray}
}


// 模拟antd的menu的select事件，根据左侧导航列表，找到左侧导航第一个根节点，用于初始化T形屏的content部分
export const genAntdMenuFirstSelectObject = (node: NavListType, selectLeftNav: Function) => {
    if (!node) {
        message.error({content: () => '该路由尚未配置，请联系管理员! 3秒后将转跳到首页', style: {marginTop: '10vh'}})
        goBackTo(`/${MAIN_CONTENT}/${HOME}`, 3500, true)
        return
    }
    let defaultNode = {}
    while (node) {
        defaultNode = node
        if (node.children) node = node.children[0]
        else break
    }
    selectLeftNav({item:defaultNode})
}
export  {getTitlePathByKey}
