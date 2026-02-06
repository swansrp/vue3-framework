/**
 * 权限来源类型枚举
 */
export enum SourceTypeEnum {
  USER = 'USER',
  ROLE = 'ROLE',
  DEPT = 'DEPT',
  DEPT_DATA_SCOPE = 'DEPT_DATA_SCOPE',
  GROUP = 'GROUP',
  GROUP_DATA_SCOPE = 'GROUP_DATA_SCOPE'
}

/**
 * 权限来源类型对应的中文描述
 */
export const SOURCE_TYPE_LABELS: Record<SourceTypeEnum, string> = {
  [SourceTypeEnum.USER]: '用户',
  [SourceTypeEnum.ROLE]: '角色',
  [SourceTypeEnum.DEPT]: '部门',
  [SourceTypeEnum.DEPT_DATA_SCOPE]: '部门数据范围',
  [SourceTypeEnum.GROUP]: '用户组',
  [SourceTypeEnum.GROUP_DATA_SCOPE]: '用户组数据范围'
}

/**
 * 权限来源类型对应的图标
 */
export const SOURCE_TYPE_ICONS: Record<SourceTypeEnum, string> = {
  [SourceTypeEnum.USER]: '👤',
  [SourceTypeEnum.ROLE]: '🎭',
  [SourceTypeEnum.DEPT]: '🏢',
  [SourceTypeEnum.DEPT_DATA_SCOPE]: '🔗',
  [SourceTypeEnum.GROUP]: '👥',
  [SourceTypeEnum.GROUP_DATA_SCOPE]: '🔗'
}

/**
 * 权限来源类型对应的颜色
 */
export const SOURCE_TYPE_COLORS: Record<SourceTypeEnum, string> = {
  [SourceTypeEnum.USER]: '#1890ff',
  [SourceTypeEnum.ROLE]: '#722ed1',
  [SourceTypeEnum.DEPT]: '#52c41a',
  [SourceTypeEnum.DEPT_DATA_SCOPE]: '#fa8c16',
  [SourceTypeEnum.GROUP]: '#eb2f96',
  [SourceTypeEnum.GROUP_DATA_SCOPE]: '#fa8c16'
}

/**
 * 用户权限解释响应数据结构
 */
export interface UserPermitRes {
  /** 权限来源类型 */
  sourceType: SourceTypeEnum
  /** 来源ID */
  sourceId: number
  /** 来源名称 */
  sourceName: string
  /** 权限路径描述（人类可读） */
  path: string
}

