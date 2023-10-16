import {request} from "@/framework/network/request";
import {apiType, buildGetApiByType, buildPostApiByType} from "@/framework/apis";

const buildGetApi = (url: string) => buildGetApiByType(url, apiType.auth)
const buildPostApi = (url: string) => buildPostApiByType(url, apiType.auth)


export const checkServerLive = () => request(buildGetApi("/token")) as Promise<any>
export const login = (id_token: string) => request(buildPostApi("/auth/login"), {id_token}, {}, true, false) as Promise<any>

export const logoff = () => request(buildPostApi("/logoff"), {}, {}, false, false) as Promise<any>

export const verifyLogin = (token: string) => request(buildPostApi("/token"), {}, {token}, true, false) as Promise<any>
export const reLogin = (token: string) => request(buildPostApi("/login/refresh"), {}, {token}, true, false) as Promise<any>
export const getUserInfo = () => request(buildGetApi("/user/info"), {}, {}, false, false) as Promise<any>

export const reserveLogin = (graphCode: string, loginId: string, password: string) => request(buildPostApi("/login"), {graphCode, loginId, password}, {}, true, false) as Promise<any>
