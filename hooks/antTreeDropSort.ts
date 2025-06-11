import {TreeProps} from "ant-design-vue"
import {AntTreeNodeDropEvent} from "ant-design-vue/es/tree"
import {Ref} from "vue"

// 这个函数来源于antd 官网 可以理解为直接搬运过来的, 获得拖拽后的tree数据
const getDroppedData = (info: AntTreeNodeDropEvent, treeData: Ref) => {
    // @ts-ignore
    type TreeDataItem = (TreeProps['treeData'])[number]
    const dropKey = info.node.key
    const dragKey = info.dragNode.key
    const dropPos = info.node.pos!.split('-')
    const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1])
    const loop = (data: TreeProps['treeData'], key: string | number, callback: any) => {
        data!.forEach((item, index) => {
          if (item.key === key) return callback(item, index, data)
          if (item.children) return loop(item.children, key, callback)
        })
    }
    const data = [...treeData!.value]
    let dragObj: TreeDataItem

    loop(data, dragKey, (item: TreeDataItem, index: number, arr: TreeProps['treeData']) => {
        arr!.splice(index, 1)
        dragObj = item
    })

    if (!info.dropToGap) {
      loop(data, dropKey, (item: TreeDataItem) => {
        item.children = item.children || []
        item.children.unshift(dragObj)
      })
    } else if ((info.node.children || []).length > 0 && info.node.expanded && dropPosition === 1) {
      loop(data, dropKey, (item: TreeDataItem) => {
        item.children = item.children || []
        item.children.unshift(dragObj)
      })
    } else {
      let ar: TreeProps['treeData'] = [];
      let i = 0
      loop(data, dropKey, (_item: TreeDataItem, index: number, arr: TreeProps['treeData']) => {
        ar = arr
        i = index
      })
      if (dropPosition === -1) ar.splice(i, 0, dragObj)
      else ar.splice(i + 1, 0, dragObj)
    }
    return data
}

export {getDroppedData}
