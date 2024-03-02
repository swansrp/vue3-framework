import {request, upload} from '@/framework/network/request'
import {apiType, baseDomain, buildGetApiByType, buildPostApiByType} from '@/framework/apis'
import {Ref} from 'vue'
import {UPLOAD_FILE_TYPE} from '@/framework/components/common/portal/type'

const buildGetApi = (url: string, domain = baseDomain) => buildGetApiByType(url, apiType.common, domain)
const buildPostApi = (url: string, domain = baseDomain) => buildPostApiByType(url, apiType.common, domain)

export const getDictList = (dictName: string, domain = baseDomain) => request(buildGetApi('/dict', domain), {dictName}, {}, false, false) as Promise<any>
export const getTreeList = (dictName: string, domain = baseDomain) => request(buildGetApi('/tree', domain), {dictName}, {}, false, false) as Promise<any>
export const getDictListByDictName = (dictName: string, targetVar: Ref, domain = baseDomain) => getDictList(dictName, domain).then(res => targetVar.value = res.payload)
export const uploadFile = (file: object, onUploadProgress: Function, type?: UPLOAD_FILE_TYPE, folder?: string, fileName?: string) => upload(buildPostApi('/oss'), {
    folder, type, fileName
}, file, onUploadProgress) as Promise<any>
