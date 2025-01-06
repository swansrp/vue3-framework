import { buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { download, request, upload } from '@/framework/network/request'

export const uploadParse = (url: string) => {
  return (body: any, onUploadProgress: any, param: any) => upload(buildPostApiByType("/upload", url), param, body, onUploadProgress) as Promise<any>
}
export const downloadTemplate = (url: string) => {
  return (fileName: string) => download(buildGetApiByType("/template/export", url), fileName, {}, {}) as Promise<any>
}
export const getUploadParseProgress = (url: string) => {
  return request(buildGetApiByType("/upload/progress", url), {}, {}, false, false) as Promise<any>
}