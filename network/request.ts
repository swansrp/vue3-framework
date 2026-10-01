import { message } from 'ant-design-vue'
import axios, { AxiosProgressEvent, AxiosRequestConfig, AxiosResponse } from 'axios'
import qs from 'qs'

import { name } from '@/../package.json'
import { load } from '@/framework/components/common/Loading'
import { navigation2Login } from '@/framework/network/login'
import { isEmpty, localStorageMethods } from '@/framework/utils/common'
import { AUTHORIZATION_TOKEN } from '@/framework/utils/constant'
export const domain = '/' + name
message.config({ maxCount: 1 })

/**
 * 生成 UUID v4 (兼容旧版浏览器)
 */
const generateUUID = (): string => {
  // 检查是否支持 crypto.randomUUID
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  
  // 降级方案：使用数学方法生成 UUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * 生成唯一请求ID
 * 格式: 年月日时分秒毫秒_UUID
 */
const generateRequestId = (): string => `${new Date().toISOString().replace(/[-:T.Z]/g, '')}_${generateUUID().replace(/-/g, '')}`

/**
 * 自定义JSON解析器，将大整数转换为字符串以避免精度丢失
 * JavaScript的Number类型安全整数范围是 -(2^53-1) 到 (2^53-1)
 */
function parseBigInt(text: string): any {
  // 匹配所有的 "id": 数字 的模式，将大整数转换为字符串
  // 这里匹配 "id" 或以 "Id" 结尾的字段
  const converted = text.replace(
    /"(\w*[Ii]d)"\s*:\s*(\d{15,})/g,
    '"$1":"$2"'
  )
  return JSON.parse(converted)
}


const web = '/web'
const baseURL = import.meta.env.VITE_baseURL + domain + web

// 延迟显示时间（避免快闪）
const showDelay = 500
// 最小展示时长（避免刚显示就消失）
const minDuration = 500
const loadMap = new WeakMap()
// 存储所有活跃的 timer,用于极端情况的清理
const activeTimers = new Set<NodeJS.Timeout>()

const errCode = {
  SUCCESS: 0,
  SESSION_TIME_OUT: 401
}
const axiosInstance = axios.create({
  // 使用自定义的transformResponse来处理大整数
  transformResponse: [(data) => {
    if (typeof data === 'string') {
      try {
        return parseBigInt(data)
      } catch (e) {
        console.error('JSON解析失败:', e)
        return data
      }
    }
    return data
  }]
})

/**
 * 业务扩展请求头提供者（如项目空间隔离头 X-Space-Id）。
 * 由业务在启动时经 setRequestHeaderProvider 注入（通常读 pinia store / localStorage），
 * 每次请求时调用；返回空值（null/undefined/空串）的键会被跳过。
 */
export type RequestHeaderProvider = () => Record<string, string | number | undefined | null> | undefined

let requestHeaderProvider: RequestHeaderProvider | null = null

/**
 * 注册业务扩展请求头提供者（main.ts 注入；传 null 可注销）。
 * 框架只做合并与空值剔除，不解释任何业务头语义。
 */
export function setRequestHeaderProvider(provider: RequestHeaderProvider | null) {
  requestHeaderProvider = provider
}

/**
 * 业务侧按次请求头控制用的 axios 配置扩展：
 * explicitHeaderKeys＝本次经 request() 第 7 参显式传入的头键（provider 对它们让位）；
 * omitHeaderKeys 列出本次请求要抑制（删除）的头键（如跨空间只读不带 X-Space-Id）；
 * suppressErrorToast＝HTTP 层错误不弹全局错误条（fetchBlob 这类"取不到字节由调用方自己画占位"的
 * 展示腿用；401 会话超时仍照常跳登录，不受该开关影响）。
 * 不传即维持既往行为，向后兼容。
 */
type SpaceAwareConfig = AxiosRequestConfig & { omitHeaderKeys?: string[], explicitHeaderKeys?: string[], suppressErrorToast?: boolean }

axiosInstance.interceptors.request.use(
  (config) => {
    const { data, showLoading } = config.data as configDataType
    config.data = data
    const token = localStorageMethods.getLocalStorage(AUTHORIZATION_TOKEN)
    if (token) config.headers['Authorization'] = 'Bearer ' + localStorageMethods.getLocalStorage(AUTHORIZATION_TOKEN)

    if (requestHeaderProvider) {
      const extraHeaders = requestHeaderProvider()
      if (extraHeaders) {
        // 本次调用显式传入（request() 第 7 参）的键集合——provider 只对"非显式"键做全局覆盖。
        // 注意不能用 config.headers[key] !== undefined 判"是否显式"：拦截器时点 headers 恒含
        // axios 默认与 request() 预置的 Content-Type/api-version/client-type/X-Request-Id/Authorization，
        // 那会把 provider 对这些键的值静默丢弃。
        const explicitKeys = (((config as unknown as SpaceAwareConfig).explicitHeaderKeys) || [])
          .map(k => k.toLowerCase())
        Object.keys(extraHeaders).forEach((key) => {
          // 按次覆盖：仅当本次请求显式带了该头（大小写不敏感）时 provider 让位，
          // 供跨空间运营页等「同页既要带指定空间头、又要抑制全局头」的场景使用；
          // 不传 headers 的既有页面 explicitHeaderKeys 为空，行为与既往一致。
          if (explicitKeys.includes(key.toLowerCase())) return
          const value = extraHeaders[key]
          if (value !== undefined && value !== null && value !== '') {
            config.headers[key] = value
          }
        })
      }
    }

    // 按次抑制：request() 传入 omitHeaderKeys 的键，即便全局 provider 加了也要删除
    // （跨空间只读端点不带 X-Space-Id——后端 cross 声明＋服务层显式关隔离做跨空间读）
    const omitHeaderKeys = (config as unknown as SpaceAwareConfig).omitHeaderKeys
    if (omitHeaderKeys) {
      omitHeaderKeys.forEach(key => {
        // axios 1.x 进拦截器时 headers 已是 AxiosHeaders：delete(key) 大小写不敏感；
        // 纯对象形态（防御异常路径）回退裸 delete。删除不存在的键均为无害 no-op。
        if (typeof (config.headers as { delete?: unknown }).delete === 'function') {
          (config.headers as unknown as { delete: (k: string) => void }).delete(key)
        } else {
          delete (config.headers as Record<string, unknown>)[key]
        }
      })
    }

    if (showLoading) {
      const record: any = { startAt: Date.now(), shownAt: null }
      // 延迟展示 loading
      record.timer = setTimeout(() => {
        load.show()
        record.shownAt = Date.now()
        activeTimers.delete(record.timer)
      }, showDelay)
      activeTimers.add(record.timer)
      loadMap.set(config, record)
    }

    return config
  }, err => {
    console.log(err)
    load.close()
    return message.error('请求超时，请检查网络设置!')
  }
)

const closeLoading = (config: any) => {
  const record = loadMap.get(config)
  if (!record) return

  clearTimeout(record.timer)
  activeTimers.delete(record.timer)

  // 若未显示 → 直接不显示
  if (!record.shownAt) {
    loadMap.delete(config)
    return
  }

  // 若已显示 → 确保显示满最小时长
  const visibleTime = Date.now() - record.shownAt
  const remain = Math.max(0, minDuration - visibleTime)
  setTimeout(() => {
    load.close()
    loadMap.delete(config)
  }, remain)
}

// 清理所有活跃的 timer(用于极端情况)
const clearAllTimers = () => {
  activeTimers.forEach(timer => clearTimeout(timer))
  activeTimers.clear()
  load.close()
}

axiosInstance.interceptors.response.use(
  (resp) => {
    closeLoading(resp.config)
    _handleTimeOut(resp.data, resp.config)
    return Promise.resolve(resp)
  }, err => {
    if (err.config) {
      closeLoading(err.config)
    } else {
      // 极端情况:清理所有可能的 timer
      clearAllTimers()
    }
    if(err.response) {
      _handleTimeOut(err.response.data, err.config)
      // 按次静默：展示腿（取字节渲染）失败由调用方自己呈现占位，不弹全局错误条；
      // 上面的 _handleTimeOut 照常执行，会话超时该跳登录仍跳登录
      const silent = !!(err.config as SpaceAwareConfig | undefined)?.suppressErrorToast
      if (silent)
        console.log(err)
      else if (err.response.status === 404)
        message.error('抱歉,尚未支持该服务!')
      else if (err.response.status === 504)
        message.error('服务开小差了,请稍后再试...')
      else if (err.response.status === 403)
        message.error('权限不足,请联系管理员!')
      else if (err.response.status === 500)
        message.error('系统错误,联系管理员!')
      else if (err.response.status === 502)
        message.error('服务正在快马加鞭,请稍等!')
      else
        console.log(err)
    } else if (!(err.config as SpaceAwareConfig | undefined)?.suppressErrorToast) {
      message.error('网络异常')
    } else {
      console.log(err)
    }

    throw new Error(err)
  }
)

const _handleTimeOut = function (data: ResponseDataType, config?: any) {
  if (data.status != null) {
    if (data.status.code === errCode.SESSION_TIME_OUT) {
      // 如果是 logoff 请求，则不添加 redirect_uri
      const isLogoffRequest = config?.url?.includes('/logoff')
      navigation2Login(!isLogoffRequest)?.then()
    }
  }
}

function get(apiType: ApiType,
  params: object = {},
  data: object = {},
  showSuccess = false,
  showLoading = true,
  showErr = true) {
  return request(apiType, params, data, showSuccess, showLoading, showErr)
}

function post(apiType: ApiType,
  params: object = {},
  data: object = {},
  showSuccess = true,
  showLoading = true,
  showErr = true) {
  return request(apiType, params, data, showSuccess, showLoading, showErr)
}

// apiType method/url/version
// params url的参数
// data 请求体的数据
// showErr 是否显示操作成功提示信息
// showLoading 是否需要在等待期间显示转菊花
// showErr 是否显示错误提示信息
// headers 按次请求头覆盖：值为空（null/undefined/''）＝抑制该头（含全局 provider 注入的键，如跨空间读不带 X-Space-Id）；
//         值为非空字符串＝显式设置该头（provider 不再覆盖）。仅跨空间运营页等需要精确控制 X-Space-Id 的调用使用。
function request(apiType: ApiType,
  params: object = {},
  body: object = {},
  showSuccess = false,
  showLoading = true,
  showErr = true,
  headers?: Record<string, string | null>) {
  // 拆分显式覆盖头（非空值进 config.headers，空值键进 omitHeaderKeys 供拦截器删除）；
  // explicitHeaderKeys 把"本次显式带了哪些键"告知拦截器——provider 只对显式键让位，
  // 其余键（含 Content-Type 等预置头）照常全局覆盖
  const explicitHeaders: Record<string, string> = {}
  const omitHeaderKeys: string[] = []
  if (headers) {
    Object.keys(headers).forEach((key) => {
      const value = headers[key]
      if (value === null || value === undefined || value === '') omitHeaderKeys.push(key)
      else explicitHeaders[key] = value
    })
  }
  const config: SpaceAwareConfig = {
    baseURL: import.meta.env.VITE_baseURL + apiType.baseDomain + web,
    method: apiType.method,
    url: apiType.url + '?' + qs.stringify(params, { arrayFormat: 'repeat' }),
    data: {
      data: body,
      showLoading
    },
    params: null,
    headers: {
      'Content-Type': 'application/json',
      'api-version': apiType.version,
      'client-type': 0,
      'X-Request-Id': generateRequestId(),
      ...explicitHeaders
    },
    omitHeaderKeys,
    explicitHeaderKeys: Object.keys(explicitHeaders)
  }
  return axiosInstance(config).then(resp => {
    if (resp.data.status?.code !== errCode.SUCCESS) {
      if (resp.data.status?.msg) {
        const errTypeMapList = ['info', 'info', 'info', 'warning', 'error', 'error']
        const errLevel = +resp.data.payload.errLevel
        const errType = errTypeMapList[errLevel] || 'error'
        if (showErr) {
          const msg = resp.data.payload.errMsg
          if (errType === 'info') message.info(msg)
          else if (errType === 'warning') message.warning(msg)
          else if (errType === 'error') message.error(msg)
          // 抛错信息给人话；末尾不兜 status.msg——那是错误码枚举名（INK_PARAM 一类），
          // 给用户看就是漏码；真取不到消息时给带码的人话
          throw new Error(resp.data.payload.errMsg || resp.data.status.details || `请求失败（${resp.data.status.code}）`)
        } else {
          // showErr=false（调用方自接管提示，如列表页静默取数）：错误照抛，只是不弹全局条。
          // 框架侧非 SUCCESS 封套的 payload 必在（只由 Response(ServiceException) 产出并填 errMsg），
          // 但网关/第三方回的同形封套可能没有 payload ⇒ 可选读，免得 TypeError 顶掉该抛给业务层的文案。
          throw new Error(resp.data.payload?.errMsg || resp.data.status.details || `请求失败（${resp.data.status.code}）`)
        }
      }
    } else if (showSuccess) {
      const msg = resp.data.status.details
      if (msg) message.success(msg)
    }
    return {
      status: resp.data.status,
      payload: resp.data.payload,
      response: resp
    }
  }, err => {
    load.close()
    const statusCode = err.message.split('status code ')[1]
    if (statusCode === 404)
      message.error('抱歉,尚未支持该服务!')
    else if (statusCode === 504)
      message.error('服务开小差了,请稍后再试...')
    else if (statusCode === 403)
      message.error('权限不足,请联系管理员!')
    else if (statusCode === 500)
      message.error('系统错误,联系管理员!')
    else if (statusCode === 502)
      message.error('服务正在快马加鞭,请稍等!')
    else
      console.log(err)
    throw new Error(err)
  })
}

function download(
  apiType: ApiType,
  fileName: string | undefined,
  params: object,
  body: object) {
  message.success('开始下载……')
  const headers = {
    'Content-Type': 'application/json',
    'api-version': apiType.version,
    'client-type': 0
  }
  const config: SpaceAwareConfig = {
    baseURL: import.meta.env.VITE_baseURL + apiType.baseDomain + web,
    method: apiType.method,
    url: apiType.url + '?' + qs.stringify(params, { arrayFormat: 'repeat' }),
    data: { data: body },
    params: null,
    headers,
    explicitHeaderKeys: Object.keys(headers),
    responseType: 'blob'
  }
  return axiosInstance(config).then(resp => {
    _download(resp, fileName)
    return {
      status: resp.data.status,
      payload: resp.data.payload,
      response: resp
    }
  }, err => {
    message.error('下载失败，请检查网络后重试，或联系系统管理员！')
    console.log(err)
    throw new Error(err)
  })
}

/**
 * 取二进制到内存（展示腿：图片/附件要喂给 <img>、createObjectURL 或解析，而不是落盘保存）。
 * 与 download() 的分工：download 读 content-disposition 触发浏览器下载，本函数只回 Blob；
 * 头注入与其他请求同源（Authorization＋业务 provider 的 X-Space-Id 由拦截器统一带），
 * 调用方不必再手工拼鉴权头。
 * 默认按次静默（suppressErrorToast）：取不到字节属"这页没图"级别的常态，
 * 由调用方自己画占位，不该弹全局错误条；401 会话超时仍照常跳登录。
 */
function fetchBlob(
  apiType: ApiType,
  params: object = {},
  headers?: Record<string, string | null>): Promise<Blob | null> {
  const explicitHeaders: Record<string, string> = {}
  const omitHeaderKeys: string[] = []
  if (headers) {
    Object.keys(headers).forEach((key) => {
      const value = headers[key]
      if (value === null || value === undefined || value === '') omitHeaderKeys.push(key)
      else explicitHeaders[key] = value
    })
  }
  const presetHeaders = {
    'api-version': apiType.version,
    'client-type': 0,
    'X-Request-Id': generateRequestId(),
    ...explicitHeaders
  }
  const config: SpaceAwareConfig = {
    baseURL: import.meta.env.VITE_baseURL + apiType.baseDomain + web,
    method: apiType.method,
    url: apiType.url + '?' + qs.stringify(params, { arrayFormat: 'repeat' }),
    // showLoading 缺省关转菊花：一页多图逐张取字节，不该反复弹全局遮罩
    data: { data: {} },
    params: null,
    headers: presetHeaders,
    explicitHeaderKeys: [...Object.keys(presetHeaders), ...omitHeaderKeys],
    omitHeaderKeys,
    suppressErrorToast: true,
    responseType: 'blob'
  }
  return axiosInstance(config).then(resp => {
    const blob = resp.data as Blob
    // 空体（含 0 字节）当"没有可展示的字节"，交调用方回占位
    return blob && blob.size > 0 ? blob : null
  }, err => {
    console.log(err)
    return null
  })
}

/**
 * 具名分片上传（后端 `@RequestPart("file")` 这类按 part 名取件的形态）。
 * 与 upload() 的分工：upload() 按框架约定把 body 裹成 {data: body} 并写死 Content-Type，
 * 具名 part 与 boundary 都到不了后端；本函数把调用方拼好的 FormData 原样交出，
 * 且**不设 Content-Type**——boundary 只能由浏览器生成，写死 multipart/form-data 后端解不开。
 * 业务侧因此不必再自己拼 fetch＋鉴权头。
 * 大文件要进度条：onUploadProgress 原样透给 axios（loaded/total）；params 序列化进查询串。
 */
function uploadParts(
  apiType: ApiType,
  formData: FormData,
  params: object = {},
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void) {
  const presetHeaders = {
    'api-version': apiType.version,
    'client-type': 0,
    'X-Request-Id': generateRequestId()
  }
  const config: SpaceAwareConfig = {
    baseURL: import.meta.env.VITE_baseURL + apiType.baseDomain + web,
    method: apiType.method,
    url: apiType.url + (Object.keys(params).length ? '?' + qs.stringify(params, { arrayFormat: 'repeat' }) : ''),
    // 拦截器按 config.data.data 取载荷，FormData 从这里原样交给 axios
    data: { data: formData },
    params: null,
    headers: presetHeaders,
    explicitHeaderKeys: Object.keys(presetHeaders),
    onUploadProgress
  }
  return axiosInstance(config).then(resp => {
    return {
      status: resp.data.status,
      payload: resp.data.payload,
      response: resp
    }
  })
}

function upload(
  apiType: ApiType,
  params: object,
  body: object,
  onUploadProgress: Function) {
  const headers = { 'Content-Type': 'multipart/form-data' }
  const config: SpaceAwareConfig = {
    baseURL: import.meta.env.VITE_baseURL + apiType.baseDomain + web,
    method: apiType.method,
    url: apiType.url + '?' + qs.stringify(params, { arrayFormat: 'repeat' }),
    data: { data: body },
    params: null,
    headers,
    explicitHeaderKeys: Object.keys(headers),
    onUploadProgress: (progressEvent: AxiosProgressEvent) => {
      onUploadProgress(progressEvent)
    }
  }
  return axiosInstance(config).then(resp => {
    return {
      status: resp.data.status,
      payload: resp.data.payload,
      response: resp
    }
  }).catch(err => {
    message.error('上传失败，请检查网络后重试，或联系系统管理员！')
    console.log(err)
    throw new Error(err)
  })
}


// download 函数部分

function _download(res: AxiosResponse, fileName: string | undefined) {
  if (isEmpty(fileName)) {
    const str = res.headers['content-disposition'].split('filename=')[1]
    fileName = decodeURI(str.substring(1, str.length - 1))
  }
  const content = res.data
  // 构造一个blob对象来处理数据
  const blob = new Blob([content])
  downloadBlob(blob, fileName)
}

const downloadBlob = (blob: Blob, fileName: string | undefined) => {
  // 对于<a>标签，只有 Firefox 和 Chrome（内核） 支持 download 属性
  // IE10以上支持blob但是依然不支持download
  if ('download' in document.createElement('a')) { // 支持a标签download的浏览器
    const link = document.createElement('a') // 创建a标签
    link.download = fileName || generateUUID() // a 标签添加属性
    link.style.display = 'none'
    link.href = URL.createObjectURL(blob)
    document.body.appendChild(link)
    link.click() // 执行下载
    URL.revokeObjectURL(link.href) // 释放url
    document.body.removeChild(link) // 释放标签
  } else { // 其他浏览器
    navigator.msSaveBlob && navigator.msSaveBlob(blob, fileName)
  }
}

const downloadUrl = (fileURL: string, fileName: string) => {
  const link = document.createElement('a') // 创建a标签
  fileName && (link.download = fileName) // a 标签添加属性
  link.style.display = 'none'
  link.href = fileURL
  link.target = '_blank'
  link.click() // 执行下载
}


export { baseURL, get, post, request, upload, uploadParts, download, fetchBlob, downloadBlob, downloadUrl }

