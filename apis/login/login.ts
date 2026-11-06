import { buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { oauth2ExchangeApi, ssoTicketApi } from '@/framework/network/loginMode'
import { request } from '@/framework/network/request'

const buildGetApi = (url: string) => buildGetApiByType(url)
const buildPostApi = (url: string) => buildPostApiByType(url)


export const getToken = () => request(buildGetApi('/token')) as Promise<any>
// 🔴 签发口随登录形态：VITE_loginMode=idaas-core 打本系统 core /web/sso/login，
// idaas 打认证中心 /auth/login（出参同形）。未配置 mode 时按旧 VITE_ssoType 判据推导，
// 存量项目零位移；host/oauth2 形态不落本调用分支。
// 🔴 request 第二参＝params（query）：id_token 必须走 query——bidr 全族后端签发口
// （AuthController/SsoLoginController 的 login(String id_token)）都是裸参数绑定＝query/form，
// JSON body 里的 id_token 没人解析（2026-10-28 生产 iframe 联调时差点误改成 body， curled 回来）
export const ssoLogin = (id_token: string) =>
  request(
    buildPostApi(ssoTicketApi),
    { id_token },
    {},
    true,
    false
  ) as Promise<any>

// 🔴 OAuth2 授权码换本地会话：端点＝宿主后端兑换口，随 VITE_oauth2ExchangeApi 注入
// （框架零业务常量——曾写死 inkhub 示例项目路径 /epc-ai/oauth2/exchange 且裸判 ?code=，
// 2026-11-05 生产误劫持 pan 飞书回调 404 断链，已改 env 驱动）。code→IdP token→本地验签
// →租户镜像→宿主会话，出参与 /web/auth/login 同形（accessToken/refreshToken/name/customerNumber）。
// request 第二参＝params（query）：code 走 query，与后端 @RequestParam 对齐
// redirect_uri 可选＝authorize 时的原串回传（RFC 6749 §4.1.3 MUST，取自
// oauth2AuthorizeRedirectUri，与 VITE_ssoLoginUrl 里发起 authorize 的串天然同源）；
// 不传＝宿主后端按自己配置兜底（存量行为零位移）
export const exchangeLogin = (code: string, redirectUri?: string) =>
  request(
    buildPostApi(oauth2ExchangeApi),
    redirectUri ? { code, redirect_uri: redirectUri } : { code },
    {},
    true,
    false
  ) as Promise<any>

export const logoff = () => request(buildPostApi('/logoff'), {}, {}, false, false) as Promise<any>

export const verifyLogin = (token: string) => request(buildPostApi('/token'), {}, { token }, true, false) as Promise<any>
export const reLogin = (token: string) => request(buildPostApi('/login/refresh'), {}, { token }, true, false) as Promise<any>
export const getUserInfo = () => request(buildGetApi('/user/info'), {}, {}, false, false) as Promise<any>
export const updateUserInfo = (userInfo: any) => request(buildPostApi('/user/info'), {}, userInfo, true, false) as Promise<any>

// 生效的注册模式（open/tenant/closed）：只读 yml my.auth.register-mode（不配＝open，不入 sys_config），
// 与注册闸同一读取点。老核心无此端点时静默 404（suppressErrorToast），登录页保持 open 形态。
export const getRegisterMode = () =>
  request(buildGetApi('/login/register-mode'), {}, {}, false, false, false, undefined, { suppressErrorToast: true }) as Promise<any>

export const login = (graphCode: string, loginId: string, password: string) => request(buildPostApi('/login'), { graphCode, loginId, password }, {}, true, false) as Promise<any>
export const passwordRegister = (graphCode: string, loginId: string, password: string, tenantCode?: string) => request(buildPostApi('/login/register'), { graphCode, loginId, password, tenantCode }, {}, true, false) as Promise<any>
export const msgCodeLogin = (phoneNumber: string, msgCode: string) => request(buildPostApi('/login/msg'), { phoneNumber, msgCode }, {}, true, false) as Promise<any>
export const msgCodeRegister = (userInfo: any) => request(buildPostApi('/login/register/msg'), userInfo, {}, true, false) as Promise<any>
export const ghostLogin = (customerNumber: string) => request(buildPostApi('/admin/ghost/login'), { customerNumber }, {}, true, false) as Promise<any>
export const changePassword = (oldPassword: string, password: string, passwordConfirm: string) => request(buildPostApi('/password/change'), {},{ oldPassword, password, passwordConfirm }, true, false) as Promise<any>
export const getMsgCode = (msgCodeType: string, phoneNumber: string, graphCode: string) => request(buildGetApi('/sms'), { phoneNumber, msgCodeType, graphCode }, {}, true, false) as Promise<any>

export const initPasswordAndLogin = (loginId: string, password: string, passwordConfirm: string, graphCode: string) => request(buildPostApi('/login/password/init'), { loginId, password, passwordConfirm, graphCode }, {}, true, false) as Promise<any>
export const changePasswordAndLogin = (loginId: string, oldPassword: string, password: string, passwordConfirm: string, graphCode: string) => request(buildPostApi('/login/password/change'), { loginId, oldPassword, password, passwordConfirm, graphCode }, {}, true, false) as Promise<any>
