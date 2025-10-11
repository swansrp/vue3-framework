import { LogBoardReq } from './logBoardReq'

import { buildPostApiByType } from '@/framework/apis'
import { request } from '@/framework/network/request'

const buildPostApi = (url: string) => buildPostApiByType(url, '')

export const queryLog = (params: LogBoardReq) =>
    request(buildPostApi('/log/fetch'), {}, params, false, false) as Promise<any>
