/**
 * 系统级技能包写面（core/agent-console，M14 棒 4-E 的 `SystemSkillAdminController`）。
 *
 * 与业务侧 `@/apis/inkhub/skill` 的分工：那只管"这个包在业务台账里是什么档、哪些空间装了它"，
 * 这里只管"这个包在系统层面是什么状态"——系统半免绑定对所有空间可读，所以下面没有 bind/unbind 口。
 * 鉴权闸在服务层（平台管理员），前端不建权限表：被拒时 request 层把 `status.details` 弹成红条。
 */
import { buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { get, request, uploadParts } from '@/framework/network/request'

const skillApiType = '/api/agent/skill'

/**
 * 系统技能包台账行——读视图 {@code SkillAssetView} 的形态，<b>不等于 {@code sys_skill_asset} 实体</b>：
 * 存储对象键 packageKey 与恒为 1 的 valid 都不随台账下发（页面不消费，回一个不变量只会引人误读）。
 */
export interface SkillAsset {
  id: number
  skillName: string
  /** 展示名：NULL＝包 frontmatter 没给，展示层回落 skillName */
  title?: string
  description?: string
  category?: string
  /** NULL＝没取到版本，不是第 0 版 */
  version?: number
  /** UNPUBLISHED / PUBLISHED / OFFLINE / TOMBSTONE */
  status?: string
  /** BUILTIN 随 jar 发版（重启按内容指纹对账）／UPLOADED 页面上传（对账永不触碰） */
  origin?: string
  packageSha256?: string
  fileCount?: number
  /** 登记人工号（对账线程写的行没有登录人，为空） */
  createBy?: string
  /** 姓名派生列：读端点按工号查 ac_user.name 回填，查不到为空 ⇒ 页面回落到工号 */
  createByName?: string
  createAt?: string
  updateAt?: string
}

/**
 * 台账全档：不筛 status/origin，管理页要看全（含未发布、已下线、墓碑）。
 * showErr=true——非管理员被服务层闸拒时要把 `details` 那句弹出来，不能静默回空表
 * （"读不到"与"库里没有"是两件事，页面据此换空态文案）。
 */
export const listSkillAssets = () =>
  get(buildGetApiByType('/assets', skillApiType), {}, {}, false, false, true) as Promise<{
    payload: SkillAsset[]
  }>

/**
 * 上传（＝登记，不＝可见）：落 UNPUBLISHED 档，须再点「发布」才进所有空间的提示词。
 * 后端 `@RequestPart("file")`，走框架 uploadParts 具名分片通道；同名重传＝版本递增的新行，
 * 撞出厂包名（origin=BUILTIN）由服务端直接拒。
 */
export const uploadSkillAsset = async (file: File) => {
  const form = new FormData()
  form.append('file', file)
  const resp: any = await uploadParts(buildPostApiByType('/upload', skillApiType), form)
  if (resp?.status?.code !== 0) {
    throw new Error(resp?.status?.details || '上传失败')
  }
  return resp.payload as SkillAsset
}

/** 发布：UNPUBLISHED／OFFLINE → PUBLISHED（幂等）；TOMBSTONE 由服务端拒 */
export const publishSkillAsset = (id: number) =>
  request(buildPostApiByType(`/${id}/publish`, skillApiType), {}, {}, true, true)

/** 下线：读侧立即不再下发，行与包对象保留，可重新发布 */
export const offlineSkillAsset = (id: number) =>
  request(buildPostApiByType(`/${id}/offline`, skillApiType), {}, {}, true, true)

/** 注销（落 TOMBSTONE）：撤销出厂包的正确表达——重启不装回、该名字不可再发布，只留档不删对象 */
export const tombstoneSkillAsset = (id: number) =>
  request(buildPostApiByType(`/${id}/tombstone`, skillApiType), {}, {}, true, true)
