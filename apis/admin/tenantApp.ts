import { buildPostApiByType } from '@/framework/apis'
import { request } from '@/framework/network/request'

// 不新增 apis/index.ts 的 apiType 键（点名文件纪律）——type 段就地常量，
// 与 apiType 值同形态（'/admin/tenant-app' 拼进 buildApi 的 url 前缀），照 tenantManage.ts 的先例
const TENANT_APP_TYPE = '/admin/tenant-app'

const buildPostApi = (url: string) => buildPostApiByType(url, TENANT_APP_TYPE)

// 租户应用开通（ac_tenant_app 维护面，方案B 棒1 契约）：三端点全 @RequestBody
// （与 tenant portal 的 @RequestParam 不同）——载荷放 request 第 3 参 body 位（照 subsystem.ts 形态，
// 而非 tenantManage.ts 的 params 位）。bind/unbind 成功文案由后端 Resp.notice 出（"开通成功"/"已取消开通"），
// showSuccess=true 时 request 层直接 toast，调用方不必再弹。
// query 回包 payload.records 行含 appCode/appName/status('ENABLED'/'DISABLED')/expireAt/valid 等。
export const getTenantAppList = (tenantId: string | number) =>
  request(buildPostApi('/query'), {}, { tenantId, currentPage: 1, pageSize: 500 }, false, false) as Promise<any>

// expireAt 传 'yyyy-MM-dd HH:mm:ss' 串（全局 Jackson 双向口径）；null/undefined＝长期有效
export const bindTenantApp = (tenantId: string | number, appCode: string, expireAt?: string | null) =>
  request(buildPostApi('/bind'), {}, { tenantId, appCode, expireAt }, true) as Promise<any>

export const unbindTenantApp = (tenantId: string | number, appCode: string) =>
  request(buildPostApi('/unbind'), {}, { tenantId, appCode }, true) as Promise<any>
