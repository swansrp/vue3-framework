import { ValueLabel } from "@/framework/utils/type";
import { Ref } from "vue";

const getArrayLeafNode = (array: Array<any>, value: string, label: string): any => {
  if (!array || !Array.isArray(array)) return []
  const result = []
  for (let index = 0; index < array.length; index++) {
    const element = array[index]
    if (!element) continue
    if (element.children && typeof (element.children) == 'object' && element.children.length > 0)
      result.push(...getArrayLeafNode(element.children, value, label))
    else
      result.push({value: element[value], label: element[label]})
  }
  return result
}

const getCurrentNode = (nodeId: string, tree: any, value: string, label: string): any => {
  for (const node of tree) {
    if (nodeId === node[value]) return node
    if (node.children && Array.isArray(node.children) && node.children.length > 0) {
      const result = getCurrentNode(nodeId, node.children, value, label)
      if (result) return result
    }
  }
  return null
}

const getCascaderList = (areaSelectValue: Ref, areaListOption: Ref, value = 'value', label = 'label') => {
  if (!areaSelectValue.value.length) return []
  const isMultiArr = areaSelectValue.value.some((item: number | string | Array<number>) => Array.isArray(item))
  if (!isMultiArr) return [{value: areaSelectValue.value.slice(-1)}]
  const areas = areaSelectValue.value.map((arr: any) => arr.length === 1 ? arr[0] : arr[arr.length - 1])
  const nodes = areas.map((area: string) => getCurrentNode(area, areaListOption.value, value, label))
  const result: Array<ValueLabel> = []
  nodes.forEach((option: any) => result.push(...getArrayLeafNode([option], value, label)))
  return result
}

const filterOption = (input: string, option: any) => option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0

export { getCascaderList, filterOption }
