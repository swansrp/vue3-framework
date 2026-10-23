import { buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { request } from '@/framework/network/request'

// 框架内置「我的租户」（2026-10-21）：core 的 TenantMyController（/web/tenant/my，登录档）。
// type 段就地常量，与 apiType 值同形态（拼进 buildApi 的 url 前缀），照 tenantManage.ts 先例
const TENANT_MY_TYPE = '/tenant/my'

export interface TenantMyVO {
  tenantId: number
  name: string
  code?: string
  /** 是否本租户管理员（现查关系行；无关系行 false） */
  isAdmin?: boolean
  /** 是否当前租户（token TENANT_ID 命中） */
  current?: boolean
}

/** 我的租户清单：平台档/系统管理级＝全部有效租户；普通成员＝成员关系 ∩ 有效租户（停用不展示） */
// 探测性调用：后端 core 早于本前端版本时该接口 404，属预期的“能力缺省”，故抑制传输层错误条
// （store 侧 catch 只保证逻辑不炸，全局 message.error 归拦截器管）
export const listMyTenants = () =>
  request(buildGetApiByType('/list', TENANT_MY_TYPE), {}, {}, false, false, true, undefined, { suppressErrorToast: true }) as Promise<any>

/** 切换当前租户（后端改写 token TENANT_ID，提权档连 TENANT_IDS 一并改写；免重登录） */
export const switchMyTenant = (tenantId: number | string) => request(buildPostApiByType('/switch', TENANT_MY_TYPE), { tenantId }, {}, false, false) as Promise<any>
