/**
 * SSO 出票口封装（后端 core 的 `SsoTicketController`，`POST /web/sso/ticket`）——随框架前端自带，
 * 出票方应用侧零改动（中转页见 `views/Sso/Authorize/index.vue`，framework router 静态注册）。
 *
 * <p>标量入参走 **query**（第 2 参）而不是 JSON body——同族先例＝
 * `apis/login/login.ts:9` 的 `ssoLogin(id_token)`，后端方法签名是 `ticket(String app_id,
 * String redirect_uri, ...)` 那种参数绑定形态，塞 body 反而取不到。</p>
 *
 * <p>🔴 判据＝`(app_id, redirect_uri)` 组合（白名单＝core 表 `ac_sso_redirect`），
 * 两个入参都必填；`app_id`＝子系统应用标识（`ac_partner.app_key`）。</p>
 *
 * <p>🔴 出票口**要登录态**（后端刻意不挂免登录豁免注解），未登录由后端业务拒绝、文案即根因；
 * 提示关到调用方（`showErr=false`）：错误照抛、不弹全局条，中转页要把拒因就地画出来并给出口。</p>
 */
import { buildPostApiByType } from '@/framework/apis'
import { request } from '@/framework/network/request'

/** 后端 SsoTicketRes：票 + 存活到期（epoch 秒）+ 服务端核过的回调地址回填 */
export interface SsoTicketVO {
  /** RS256 票（三段 base64url），claims 只 username+exp */
  idToken?: string
  /** 票到期时刻（epoch 秒） */
  expiresAt?: number
  /** 🔴 白名单核过的回调地址原串——回跳只用这个值，不信前端入参 */
  redirectUri?: string
}

/** 向本应用后端要一张 SSO 票（app_id 须登记在 ac_partner，redirect_uri 须登记在该应用所属 partner 名下，否则服务端直接拒） */
export const postSsoTicket = (appId: string, redirectUri: string) =>
  request(
    buildPostApiByType('/sso/ticket'),
    { app_id: appId, redirect_uri: redirectUri },
    {},
    false,
    false,
    false
  ) as Promise<{ payload: SsoTicketVO }>
