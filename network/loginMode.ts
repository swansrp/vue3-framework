// 登录形态单一判据：入口（navigation2Login）与回调（checkLoginState）同源分派。
// 显式配置 VITE_loginMode 后不再从 URL 子串推断协议（2026-11-05 飞书回调被劫持事故家族）。
// 未配置时按存量 env 推导，保证老项目行为逐字不变；新项目应显式配置。
export type LoginMode = 'local' | 'idaas' | 'idaas-core' | 'oauth2' | 'host'

const LOGIN_MODES: LoginMode[] = ['local', 'idaas', 'idaas-core', 'oauth2', 'host']
const configuredMode = String(import.meta.env.VITE_loginMode || '')

export const isLoginModeConfigured = LOGIN_MODES.includes(configuredMode as LoginMode)

export const ssoLoginUrl = String(import.meta.env.VITE_ssoLoginUrl || '')
// OAuth2 授权码兑换端点（宿主后端各自路径，随 env 注入，框架零业务常量）
export const oauth2ExchangeApi = String(import.meta.env.VITE_oauth2ExchangeApi || '')
// OAuth2 authorize 直链 URL 解析（畸形串＝null；非 authorize 形态/SSR＝null）。
const parsedAuthorizeUrl = (() => {
  if (!ssoLoginUrl || !ssoLoginUrl.includes('/oauth2/authorize') || typeof window === 'undefined') return null
  try {
    return new URL(ssoLoginUrl, window.location.origin)
  } catch (e) {
    return null
  }
})()
// OAuth2 authorize 的 redirect_uri 与「是否 env 内置」两值。RFC 6749 §4.1.3：authorize 带了
// redirect_uri，token 请求就必须原样回传（等值复核 MUST）——墨枢端等值闸在 code 消费之后，
// 不回传/回传错串＝code 被白白烧掉换 invalid_grant（2026-11-06 实证）。
// 取值规则：env（VITE_ssoLoginUrl）内置了 redirect_uri ⇒ 用内置串（生产/部署形态，白名单登记串
// 显式可控）；未内置 ⇒ 动态拼当前访问地址 origin+'/'（哪个地址访问回跳哪个地址；本地/内网由
// 墨枢回环豁免放行，公网地址会被白名单闸拒＝安全面未扩大）。发起跳转与兑换回传两处同源取本值
// ⇒ 等值闸恒过。非 authorize 形态（票内省/IdaaS）＝空串，调用方不传，存量零位移。
export const oauth2AuthorizeRedirectUri = parsedAuthorizeUrl
  ? (parsedAuthorizeUrl.searchParams.get('redirect_uri') || window.location.origin + '/')
  : ''
export const oauth2AuthorizeRedirectUriBuiltin =
  !!parsedAuthorizeUrl && parsedAuthorizeUrl.searchParams.has('redirect_uri')

const deriveLegacyMode = (): LoginMode => {
  // 仅为存量项目保留的兼容推导。VITE_ssoDomain='localhost' 是旧版“本地账号登录形态”
  // 的标记（core/doc/模块配置项归位与优先级.md），与新值 VITE_loginMode='local' 同义，
  // 这里归一到 local；显式配置 VITE_loginMode 时以 mode 为准、不再看旧标记。
  if (import.meta.env.VITE_ssoDomain === 'localhost') return 'local'
  // 旧逻辑就是嗅探 authorize 子串；新项目请配 VITE_loginMode
  if (ssoLoginUrl.includes('/oauth2/authorize')) return 'oauth2'
  if (ssoLoginUrl) return import.meta.env.VITE_ssoType ? 'idaas-core' : 'idaas'
  return 'local'
}

export const loginMode: LoginMode = isLoginModeConfigured ? (configuredMode as LoginMode) : deriveLegacyMode()

// id_token 换本地会话的签发口：idaas-core 走本系统 core /web/sso/login，idaas 走认证中心 /web/auth/login。
// 未配置 mode 时保留旧判据（VITE_ssoType 非空即 core），保证存量项目零位移。
export const ssoTicketApi = isLoginModeConfigured
  ? (loginMode === 'idaas-core' ? '/sso/login' : '/auth/login')
  : (import.meta.env.VITE_ssoType ? '/sso/login' : '/auth/login')

if (configuredMode && !isLoginModeConfigured) {
  console.warn(`[login] VITE_loginMode 取值非法（${configuredMode}），已按存量 env 推导为 ${loginMode}`)
}
if (isLoginModeConfigured && loginMode === 'oauth2' && !oauth2ExchangeApi) {
  console.warn('[login] VITE_loginMode=oauth2 但未配置 VITE_oauth2ExchangeApi：授权码回调将不被接管')
}
