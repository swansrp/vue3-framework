import { reactive } from 'vue'

import { genEmptyCondition } from '@/framework/components/common/AdvancedSearch/ConditionList/funs'
import { ConditionType } from '@/framework/components/common/AdvancedSearch/type'
import { FIELD_TYPE } from '@/framework/components/common/Portal/type'
import { dictStore } from '@/framework/store/common'

// 归一化条件为后端要求的 JSON 对象格式 {andOr, conditionList}
// 指标条件历史数据可能为数组/单条件对象等格式，统一包装避免后端校验失败
export const normalizePivotCondition = (raw: any): string | null => {
  let parsed: any = raw
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw)
    } catch (e) {
      return null
    }
  }
  if (Array.isArray(parsed)) {
    return JSON.stringify({ andOr: '0', conditionList: parsed })
  }
  if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.conditionList)) {
      return JSON.stringify({ andOr: parsed.andOr || '0', conditionList: parsed.conditionList })
    }
    if (parsed.property) {
      return JSON.stringify({ andOr: '0', conditionList: [parsed] })
    }
  }
  return null
}

/**
 * 剔除未填写的条件行（含起步用的空行与清空后的空条件组），递归条件组
 * 叶子行自带 conditionList:[]，故"是不是条件组"只能看有没有 property，不能看有没有子数组
 */
export const pruneBlankConditions = (list: any[]): any[] => list
  .map((cond: any) => (
    !cond?.property && Array.isArray(cond?.conditionList) && cond.conditionList.length > 0
      ? { ...cond, conditionList: pruneBlankConditions(cond.conditionList) }
      : cond
  ))
  .filter((cond: any) => !!cond?.property || (cond?.conditionList?.length ?? 0) > 0)

/**
 * 条件配置弹窗(复用 PortalAdvancedSearchModal)状态与打开逻辑
 * FilterPane 与 PivotColumnPane 各自调用本 composable 拥有独立实例，
 * 保存回调由各面板自行提供(saveFilterCondition 拆分后各自保留)
 */
export function useConditionModal(
  getColumns: () => any[] | undefined,
  onSave: (condition: ConditionType) => void
) {
  const dict = dictStore()

  // 筛选条件配置弹窗
  const filterConditionConfig = reactive({
    show: false,
    columnArray: [] as Array<any>,
    condition: {} as ConditionType,
    okText: '保存条件',
  })

  // 构建字段列表（通用方法）；下拉/树形字段按 reference 加载字典选项(条件值下拉依赖 referenceDictOption)
  const buildColumnArray = async () => {
    filterConditionConfig.columnArray = []
    const columns = getColumns()
    if (columns && columns.length > 0) {
      filterConditionConfig.columnArray = columns.map((col: any) => ({
        key: col.property,
        title: col.displayName,
        fieldType: col.fieldType,
        reference: col.reference,
        referenceDictOption: col.referenceDictOption,
      }))
      await Promise.all(
        filterConditionConfig.columnArray.map(async (item: any) => {
          if (
            item.reference &&
            !item.referenceDictOption &&
            (item.fieldType === FIELD_TYPE.SELECT ||
              item.fieldType === FIELD_TYPE.TREE ||
              item.fieldType === FIELD_TYPE.SELECT_MULTI_IN_ONE ||
              item.fieldType === FIELD_TYPE.TREE_MULTI_IN_ONE)
          ) {
            item.referenceDictOption = (await dict.getDict(item.reference)) || []
          }
        })
      )
    }
  }

  // 打开条件配置弹窗(字典选项必须在打开前加载完：弹窗按 show/列/条件三份引用变化递增 key 强制重建)
  // andOr 回传上次保存的条件间关系（'0'=与 '1'=或），不传则默认与
  const openConditionModal = async (conditionList: any[], andOr: '0' | '1' = '0') => {
    await buildColumnArray()
    filterConditionConfig.condition = {
      andOr,
      // 无已存条件时给一行空条件起步：条件对象恒有 andOr/conditionList 两个键，
      // 弹窗的 isNotEmpty 只看键数 ⇒ 空列表会被当成"有内容"，抽屉开出来 0 行没法填
      conditionList: conditionList.length > 0 ? conditionList : [genEmptyCondition()]
    }
    filterConditionConfig.show = true
  }

  const closeConditionModal = () => {
    filterConditionConfig.show = false
  }

  return {
    filterConditionConfig,
    buildColumnArray,
    openConditionModal,
    closeConditionModal,
    handleConditionConfirm: onSave,
  }
}
