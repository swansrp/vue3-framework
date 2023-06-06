import {ValueLabel} from "@/framework/utils/type";
import {Ref} from "vue";

const getArrayLeafNode = (array: Array<any>): (Array<ValueLabel>) => {
  if (!array || !Array.isArray(array)) return []
  const result = []
  for (let index = 0; index < array.length; index++) {
    const element = array[index]
    if (element.children && typeof (element.children) == 'object' && element.children.length > 0)
      result.push(...getArrayLeafNode(element.children))
    else
      result.push({value: element.value, label: element.label})
  }
  return result
}

const getCurrentNode = (nodeId: string, tree: any): any => {
  for (const node of tree){
    if (nodeId === node.value) return node
    if(node.children && Array.isArray(node.children) && node.children.length>0){
      const result = getCurrentNode(nodeId, node.children)
      if(result) return result
    }
  }
  return null
}

const getCascaderList = (areaSelectValue: Ref, areaListOption: Ref) => {
  const areas = areaSelectValue.value.map((arr:any) => arr.length === 1 ? arr[0] : arr[arr.length - 1])
  const nodes = areas.map((area: string) => getCurrentNode(area, areaListOption.value))
  const result: Array<ValueLabel> = []
  nodes.forEach((option: any) => result.push(...getArrayLeafNode([option])))
  return result
}

export {getCascaderList}
