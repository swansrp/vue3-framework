import {request} from '@/framework/network/request'
import {buildPostApiByType} from '@/framework/apis'
import {LogBoardReq} from "./logBoardReq"

const buildPostApi = (url: string) => buildPostApiByType(url, '')

export const queryLog = (params: LogBoardReq) =>
    request(buildPostApi('/log/fetch'), {}, params, false, false) as Promise<any>
