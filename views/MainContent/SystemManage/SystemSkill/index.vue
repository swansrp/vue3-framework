<template>
  <div class="system-skill-page">
    <div class="page-header">
      <div class="header-text">
        <span class="title">系统级技能包</span>
        <a-tag color="purple">
          仅平台管理员
        </a-tag>
        <span class="count">{{ headerCount }}</span>
      </div>
      <div class="actions">
        <a-upload
          :custom-request="onUpload"
          :show-upload-list="false"
          accept=".zip"
        >
          <a-button
            type="primary"
            :loading="uploading"
          >
            上传技能包
          </a-button>
        </a-upload>
        <a-button
          :loading="loading"
          @click="load"
        >
          刷新
        </a-button>
      </div>
    </div>

    <a-alert
      class="hint"
      type="info"
      show-icon
      message="上传不等于可见，注销不等于删除"
      description="这一页管的是「这个包在系统层面是什么状态」：传上来先落未发布档，点发布才进所有空间的提示词（系统级包免绑定，空间那边不用装）；下线只是不再下发，包和本档都留着，随时能重新发布；注销是落墓碑——重启不会把它装回来，这个包名也再发布不了，要恢复只能重新上传，所以按钮上写的是注销而不是删除。随 jar 发版的那一档（出厂包）由启动对账器按内容指纹维护，包名是保留名，同名上传会被拒绝。各空间自己的技能安装与捐赠在「空间管理 → 技能包」，不在本页。"
    />

    <a-table
      :columns="columns"
      :data-source="rows"
      :loading="loading"
      :pagination="false"
      row-key="id"
      size="middle"
      :scroll="{ x: 1180 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'skill'">
          <div class="skill-name">
            {{ record.title || record.skillName }}
            <span class="skill-ver">{{ record.version == null ? '版本未取到' : `v${record.version}` }}</span>
          </div>
          <div class="skill-code">
            {{ record.skillName }}
          </div>
          <a-tooltip
            v-if="record.description"
            :title="record.description"
          >
            <div class="skill-desc">
              {{ record.description }}
            </div>
          </a-tooltip>
        </template>
        <template v-else-if="column.key === 'origin'">
          <a-tag :color="record.origin === 'BUILTIN' ? 'geekblue' : 'default'">
            {{ originLabel(record.origin) }}
          </a-tag>
          <div
            v-if="record.origin === 'BUILTIN'"
            class="muted"
          >
            重启按内容对账
          </div>
        </template>
        <template v-else-if="column.key === 'status'">
          <a-tag :color="statusColor(record.status)">
            {{ statusLabel(record.status) }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'sha'">
          <a-typography-text
            v-if="record.packageSha256"
            code
            class="sha"
            :copyable="{ text: record.packageSha256 }"
          >
            {{ record.packageSha256.slice(0, 12) }}
          </a-typography-text>
          <span
            v-else
            class="muted"
          >—</span>
          <div class="muted">
            {{ record.fileCount == null ? '文件数未取到' : `${record.fileCount} 个文件` }}
          </div>
        </template>
        <template v-else-if="column.key === 'owner'">
          <div>{{ record.createBy || '（对账线程无登录人）' }}</div>
          <div class="muted">
            {{ fmtTime(record.updateAt || record.createAt) }}
          </div>
        </template>
        <template v-else-if="column.key === 'action'">
          <a-space
            v-if="record.status !== 'TOMBSTONE'"
            :size="4"
          >
            <a-popconfirm
              v-if="record.status !== 'PUBLISHED'"
              title="发布后所有空间的 agent 提示词都会带上它（不用逐空间安装）。确认发布？"
              @confirm="run(publishSkillAsset, record.id)"
            >
              <a-button
                size="small"
                type="link"
              >
                发布
              </a-button>
            </a-popconfirm>
            <a-popconfirm
              v-else
              title="下线后各空间提示词立即不再注入，本档与包对象保留，可重新发布。确认下线？"
              @confirm="run(offlineSkillAsset, record.id)"
            >
              <a-button
                size="small"
                type="link"
                danger
              >
                下线
              </a-button>
            </a-popconfirm>
            <a-popconfirm
              title="注销＝落墓碑：重启不会把它装回来，这个包名也再发布不了，只能重新上传一份。确认注销？"
              @confirm="run(tombstoneSkillAsset, record.id)"
            >
              <a-button
                size="small"
                type="link"
                danger
              >
                注销
              </a-button>
            </a-popconfirm>
          </a-space>
          <a-tooltip
            v-else
            title="墓碑档只留名不留用：不可再发布，包对象仍在存储里留档"
          >
            <span class="muted">已注销</span>
          </a-tooltip>
        </template>
      </template>
    </a-table>

    <a-empty
      v-if="!loading && !rows.length"
      class="empty"
      :description="emptyText"
    />
  </div>
</template>

<script lang="ts" setup>
/**
 * 系统级技能包管理页（M14 棒 4-H，框架侧纯加法）：台账全档 + 上传 / 发布 / 下线 / 注销。
 *
 * 权限不在这里判：闸门在 core 的服务层（平台管理员），bean 取不到即按非管理员拒绝。
 * 本页因此不做"看不见"的处理——非管理员进来照样看得到按钮，点了由服务端拒并把
 * `status.details` 弹成红条。之所以不在前端藏按钮：藏了就得把管理员判定复制到前端，
 * 而那道闸的口径（反射取 permitService）服务端自己才是正源。
 */
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'

import {
  listSkillAssets,
  offlineSkillAsset,
  publishSkillAsset,
  tombstoneSkillAsset,
  uploadSkillAsset,
  type SkillAsset
} from '@/framework/apis/agent/skill'

const STATUS_LABELS: Record<string, string> = {
  UNPUBLISHED: '未发布',
  PUBLISHED: '已发布',
  OFFLINE: '已下线',
  TOMBSTONE: '已注销'
}

const STATUS_COLORS: Record<string, string> = {
  UNPUBLISHED: 'orange',
  PUBLISHED: 'green',
  OFFLINE: 'red',
  TOMBSTONE: 'default'
}

const columns = [
  { title: '技能包', key: 'skill', dataIndex: 'skillName', width: 320 },
  { title: '来源', key: 'origin', dataIndex: 'origin', width: 130 },
  { title: '状态', key: 'status', dataIndex: 'status', width: 90 },
  { title: '内容与包', key: 'sha', dataIndex: 'packageSha256', width: 180 },
  { title: '登记人／改动', key: 'owner', dataIndex: 'createBy', width: 170 },
  { title: '操作', key: 'action', width: 190 }
]

const rows = ref<SkillAsset[]>([])
const loading = ref(false)
const uploading = ref(false)
// 读台账失败（非管理员被拒／网络异常）与"库里真的没有包"是两件事：
// 提示条已由 request 层弹过，这里只留个旗标，免得空态文案把无权读说成没数据
const readFailed = ref(false)

const statusLabel = (status?: string) => (status && STATUS_LABELS[status]) || status || '—'
const statusColor = (status?: string) => (status && STATUS_COLORS[status]) || 'default'
const originLabel = (origin?: string) => (origin === 'BUILTIN' ? '随 jar 发版' : '页面上传')

const publishedCount = computed(() => rows.value.filter(r => r.status === 'PUBLISHED').length)
const headerCount = computed(() => `共 ${rows.value.length} 档 · 已发布 ${publishedCount.value} 个`)

const emptyText = computed(() =>
  readFailed.value
    ? '台账读不到（只有平台管理员可看；被拒的说明已在上方提示条里）'
    : '还没有系统级技能包：随 jar 发版的出厂包会由启动对账登记，数据包点右上「上传技能包」'
)

/** 后端时间是带时区的墙钟，字符串切片会差小时，一律经 dayjs 转本地 */
const fmtTime = (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '—')

const load = async () => {
  loading.value = true
  try {
    const resp = await listSkillAssets().catch(() => null)
    readFailed.value = resp === null
    rows.value = resp?.payload || []
  } finally {
    loading.value = false
  }
}

const onUpload = async (item: any) => {
  const file = item.file as File
  if (!file) {
    return
  }
  uploading.value = true
  try {
    const asset = await uploadSkillAsset(file)
    message.success(`已登记 ${asset.skillName} ${asset.version == null ? '' : `v${asset.version}`}（未发布，点发布才对所有空间生效）`)
    await load()
  } catch (e: any) {
    message.error(e?.message || '上传失败')
  } finally {
    uploading.value = false
  }
}

/** 三个状态动作同形：成功提示由服务端 notice 经 request 层弹出，这里只负责刷新台账 */
const run = async (action: (id: number) => Promise<any>, id: number) => {
  await action(id)
  load()
}

onMounted(load)
</script>

<style lang="less" scoped>
.system-skill-page {
  padding: 16px 20px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.header-text {
  display: flex;
  align-items: center;
  gap: 8px;

  .title {
    font-size: 16px;
    font-weight: 600;
  }

  .count {
    color: var(--text-secondary);
  }
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hint {
  margin-bottom: 12px;
}

.empty {
  margin: 16px 0;
}

.skill-name {
  font-weight: 600;
}

.skill-ver {
  margin-left: 6px;
  font-size: 11px;
  font-weight: 400;
  color: var(--text-secondary);
}

.skill-code {
  font-family: monospace;
  font-size: 12px;
  color: var(--text-secondary);
}

.skill-desc {
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: var(--text-secondary);
}

.sha {
  font-size: 12px;
}

.muted {
  color: var(--text-secondary);
  font-size: 12px;
}
</style>
