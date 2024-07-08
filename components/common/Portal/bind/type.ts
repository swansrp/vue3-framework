import { QuerySortType } from '@/framework/components/common/Portal/type'
import { ConditionListType } from '@/framework/components/common/AdvancedSearch/ConditionList/type'

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
   * @0 1对多
   * @1 多对1
   * @2 多对多
   */
  bindType?: string,
  /**
   * 默认查询条件
   */
  defaultAdvancedCondition?: ConditionListType,
  /**
   * 数据默认排序
   */
  defaultSortColumn?: Array<QuerySortType>,
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
  bindFieldProperty?: string,
  /**
   * 递归tab页
   */
  bindTabs?: Array<PortalBindType>
}
