import { buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { request } from '@/framework/network/request'

const buildGetApi = (url: string) => buildGetApiByType(url)
const buildPostApi = (url: string) => buildPostApiByType(url)


export const getToken = () => request(buildGetApi('/token')) as Promise<any>
export const ssoLogin = (id_token: string) => request(buildPostApi('/auth/login'), { id_token }, {}, true, false) as Promise<any>

export const logoff = () => request(buildPostApi('/logoff'), {}, {}, false, false) as Promise<any>

export const verifyLogin = (token: string) => request(buildPostApi('/token'), {}, { token }, true, false) as Promise<any>
export const reLogin = (token: string) => request(buildPostApi('/login/refresh'), {}, { token }, true, false) as Promise<any>
export const getUserInfo = () => request(buildGetApi('/user/info'), {}, {}, false, false) as Promise<any>
export const updateUserInfo = (userInfo: any) => request(buildPostApi('/user/info'), {}, userInfo, true, false) as Promise<any>

export const login = (graphCode: string, loginId: string, password: string) => request(buildPostApi('/login'), { graphCode, loginId, password }, {}, true, false) as Promise<any>
export const passwordRegister = (graphCode: string, loginId: string, password: string) => request(buildPostApi('/login/register'), { graphCode, loginId, password }, {}, true, false) as Promise<any>
export const msgCodeLogin = (phoneNumber: string, msgCode: string) => request(buildPostApi('/login/msg'), { phoneNumber, msgCode }, {}, true, false) as Promise<any>
export const msgCodeRegister = (userInfo: any) => request(buildPostApi('/login/register/msg'), userInfo, {}, true, false) as Promise<any>
export const ghostLogin = (customerNumber: string) => request(buildPostApi('/admin/ghost/login'), { customerNumber }, {}, true, false) as Promise<any>
export const changePassword = (oldPassword: string, password: string, passwordConfirm: string) => request(buildPostApi('/password/change'), {},{ oldPassword, password, passwordConfirm }, true, false) as Promise<any>
export const getMsgCode = (msgCodeType: string, phoneNumber: string, graphCode: string) => request(buildGetApi('/sms'), { phoneNumber, msgCodeType, graphCode }, {}, true, false) as Promise<any>

export const initPasswordAndLogin = (loginId: string, password: string, passwordConfirm: string, graphCode: string) => request(buildPostApi('/login/password/init'), { loginId, password, passwordConfirm, graphCode }, {}, true, false) as Promise<any>
