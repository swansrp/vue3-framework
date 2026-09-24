// Portal 列级权限运行态：解析「当前用户命中的隐藏列 token」
//
// 后端已对无权列做权威数据剥离（table 的 buildAliasMap / pivot 的 applyPivotColumnPolicy），
// 无权列的值根本不入响应。这里仅负责前端「体验层」隐藏：拉取本人生效的隐藏 token 集，
// 把对应列从表头 / 透视父列 / 度量 / 行维度中过滤掉（否则后端剔了数据、表头仍会留一个空列）。
//
// 数据源：通用资源权限的只读接口 GET /resource-perm/my-matched-extra（返回当前用户命中授权行的
// extra_data 原始串，authorization 层不解释内容）。列语义（{"columns":["c:prop",…]}）在此解析。

import { getMyMatchedExtra } from '@/framework/apis/resourcePerm'

/** 原表列（table 显示列 + pivot 行维度 group by 共用）资源类型 */
export const RESOURCE_TYPE_PORTAL_COLUMN = 'sys_portal_column'
/** 透视列（透视父列 p: + 度量 m:）资源类型 */
export const RESOURCE_TYPE_PORTAL_PIVOT = 'sys_portal_pivot'

/** 原表列 token：c:${property} */
export const columnToken = (property: string) => `c:${property}`
/** 透视父列 token：p:${itemValue} */
export const pivotToken = (itemValue: string) => `p:${itemValue}`
/** 度量 token：m:${field} */
export const measureToken = (field: string) => `m:${field}`

/**
 * 求当前用户在某资源（resourceType + portalName）上命中的隐藏 token 集合（多主体并集）。
 * 未指定 portalName / 未登录 / 无配置 / 脏数据 → 空集（不隐藏任何列）。
 */
export async function resolveMyHiddenTokens(resourceType: string, portalName?: string): Promise<Set<string>> {
  const empty = new Set<string>()
  if (!portalName) {
    return empty
  }
  try {
    const res = await getMyMatchedExtra(resourceType, portalName)
    const rawList = res?.payload || []
    const set = new Set<string>()
    for (const raw of rawList) {
      try {
        const cols = JSON.parse(raw)?.columns
        if (Array.isArray(cols)) {
          cols.forEach((t: any) => {
            if (typeof t === 'string' && t) { set.add(t) }
          })
        }
      } catch {
        // 单条脏数据跳过，不连坐整页（与其它命中行独立）
      }
    }
    return set
  } catch {
    return empty
  }
}
