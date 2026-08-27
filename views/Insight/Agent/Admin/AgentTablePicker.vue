<template>
  <div class="table-picker">
    <div class="section-title">
      <span>选表（来自绑定数据源）</span>
      <span>
        <a-button
          :loading="tablesLoading"
          @click="loadTables"
        >
          重载表清单
        </a-button>
        <a-button
          type="primary"
          style="margin-left: 10px;"
          @click="saveTables"
        >
          保存选表
        </a-button>
      </span>
    </div>
    <div class="table-picker-body">
      <!-- 左侧数据库列表 -->
      <div class="db-side">
        <div class="db-side-title">
          数据库 <span class="table-search-summary">共选 {{ selectedKeys.length }} 张</span>
        </div>
        <a-menu
          v-model:selected-keys="activeDb"
          mode="inline"
          size="small"
          class="db-menu"
        >
          <a-menu-item
            v-for="g in groupedTables"
            :key="g.db"
            :title="g.db"
          >
            <span class="db-menu-name">{{ g.db }}</span>
            <span class="db-menu-count">
              {{ tableKeyword.trim() ? `命中 ${matchedInDb(g.db)} / 已选 ${selectedInDb(g.db)}` : `${selectedInDb(g.db)}/${g.tables.length}` }}
            </span>
          </a-menu-item>
        </a-menu>
      </div>
      <!-- 右侧当前库的表清单：标题行 = 分组计数 + 搜索框 -->
      <div
        ref="dbTableArea"
        class="db-table-area"
      >
        <div
          v-if="currentGroup"
          class="db-table-title"
        >
          <span>
            {{ currentGroup.db }}：已选 {{ selectedInDb(currentGroup.db) }} /
            {{ tableKeyword.trim() ? `命中 ${matchedInDb(currentGroup.db)}` : currentGroup.tables.length }}
          </span>
          <a-input-search
            v-model:value="tableKeyword"
            placeholder="按表名或表注释搜索"
            allow-clear
            class="db-table-search"
          />
        </div>
        <a-table
          v-if="currentGroup && currentTables.length"
          :columns="tableColumns"
          :data-source="currentTables"
          :row-selection="{ selectedRowKeys: selectedKeys, onChange: onTableSelectChange }"
          row-key="tableName"
          size="small"
          :pagination="false"
          :scroll="{ y: tableScrollY }"
        />
        <a-empty
          v-else-if="!tablesLoading"
          :description="tableKeyword.trim() ? '无匹配的表（本库已选表不受影响）' : '无表'"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { Ref, computed } from 'vue'
import { useRouter } from 'vue-router'

import {
  listAgentTables,
  saveAgentTables,
  selectedAgentTables
} from '@/framework/apis/smartAgent'

// 选表组件：左侧数据库列表 + 右侧表清单（面板高度撑满配置页），支持表名/表注释搜索
const props = defineProps<{
  agentCode: string,
  dsName: string
}>()

const { currentRoute } = useRouter()
const baseDomain = currentRoute.value.query
  ? currentRoute.value.query.domain ? '/' + currentRoute.value.query.domain : undefined
  : undefined

// 行内展示全名 db.tbl（同时作为勾选 row-key）
const tableColumns = [
  { title: '表名', dataIndex: 'tableName', width: 380 },
  { title: '表注释', dataIndex: 'tableComment' }
]
const tableList: Ref<Array<any>> = ref([])
const selectedKeys: Ref<Array<string>> = ref([])
const tablesLoading = ref(false)

// 按表名/表注释搜索（不区分大小写）；搜索只影响展示，不清空/不隐藏已选
const tableKeyword = ref('')
const matchesKeyword = (t: any, kw: string) =>
  (t.tableName || '').toLowerCase().includes(kw)
  || (t.tableComment || '').toLowerCase().includes(kw)

// 按数据库分组（db.tbl 取 db 部分，无点号的归入 default）；左侧库列表永远用全量分组，搜索不丢库
const groupedTables = computed(() => {
  const map = new Map<string, Array<any>>()
  tableList.value.forEach((t: any) => {
    const idx = (t.tableName || '').indexOf('.')
    const db = idx > 0 ? t.tableName.slice(0, idx) : 'default'
    let arr = map.get(db)
    if (!arr) {
      arr = []
      map.set(db, arr)
    }
    arr.push(t)
  })
  return Array.from(map.entries())
    .map(([db, tables]) => ({ db, tables }))
    .sort((a, b) => a.db.localeCompare(b.db))
})

// 某库在当前搜索下的命中数（左侧计数展示）
const matchedInDb = (db: string) => {
  const kw = tableKeyword.value.trim().toLowerCase()
  if (!kw) return 0
  const prefix = db + '.'
  return tableList.value.filter((t: any) => (t.tableName || '').startsWith(prefix) && matchesKeyword(t, kw)).length
}

// 右侧表清单：无搜索=当前库全量；有搜索=命中行 + 本库未命中的已选行（勾选保持可见，切筛选不丢选）
const visibleTables = computed(() => {
  const g = groupedTables.value.find(x => x.db === activeDb.value[0])
  if (!g) return []
  const kw = tableKeyword.value.trim().toLowerCase()
  return kw
    ? g.tables.filter((t: any) => matchesKeyword(t, kw) || selectedKeys.value.includes(t.tableName))
    : g.tables
})

// 排序采用「冻结式置顶」：只在切库/改搜索/重载清单时把已选表排到最上，
// 勾选/取消时行顺序保持不动，避免勾一行就跳顶导致找不到刚选的表
const frozenRows: Ref<Array<any>> = ref([])
const frozenBasis: Ref<Array<any>> = ref([])
const resortFrozen = () => {
  const visible = visibleTables.value
  if (visible.length === frozenBasis.value.length
    && visible.every((t: any, i: number) => t === frozenBasis.value[i])) {
    return
  }
  frozenBasis.value = visible.slice()
  frozenRows.value = [
    ...visible.filter((t: any) => selectedKeys.value.includes(t.tableName)),
    ...visible.filter((t: any) => !selectedKeys.value.includes(t.tableName))
  ]
}
// sync 保证先于渲染更新；visibleTables 变化只源于切库/搜索/重载，勾选不会触发它；immediate 覆盖初始加载首帧
watch(visibleTables, resortFrozen, { flush: 'sync', immediate: true })
const currentTables = computed(() => frozenRows.value)

// 当前选中的数据库：默认选已选表数最多的库；搜索有命中时自动切首个命中库，无命中保持当前库，清空后恢复原库
const activeDb: Ref<Array<string>> = ref([])
const currentGroup = computed(() => groupedTables.value.find(g => g.db === activeDb.value[0]))
let prevDb = ''
watch(tableKeyword, (kw, oldKw) => {
  const nk = kw.trim().toLowerCase()
  if (nk) {
    if (!oldKw || !oldKw.trim()) prevDb = activeDb.value[0] || ''
    const firstHit = groupedTables.value.find(g => g.tables.some((t: any) => matchesKeyword(t, nk)))
    if (firstHit) activeDb.value = [firstHit.db]
  } else if (prevDb) {
    activeDb.value = [prevDb]
    prevDb = ''
  }
})

const selectedInDb = (db: string) => selectedKeys.value.filter(k => k.startsWith(db + '.')).length

const loadTables = () => {
  if (!props.dsName) return
  tablesLoading.value = true
  listAgentTables({ dsName: props.dsName }, baseDomain)
    .then((res: any) => {
      tableList.value = res.payload || []
      return selectedAgentTables({ agentCode: props.agentCode }, baseDomain)
    })
    .then((res: any) => {
      selectedKeys.value = (res.payload || []).map((t: any) => t.tableName)
      if (!activeDb.value.length) {
        // 默认选中已选表数最多的库（无已选则首个库）
        const sorted = [...groupedTables.value].sort((a, b) => selectedInDb(b.db) - selectedInDb(a.db))
        activeDb.value = sorted.slice(0, 1).map(g => g.db)
      }
    })
    .finally(() => tablesLoading.value = false)
}

// 分组勾选：本组 keys 替换，其余组的已选保持不变（避免跨组勾选丢失）
const onSelectChange = (keys: Array<string>, db: string) => {
  const prefix = db + '.'
  const others = selectedKeys.value.filter(k => !k.startsWith(prefix))
  selectedKeys.value = [...others, ...keys]
}
// 模板 row-selection.onChange 入口：Key[] 实际为表名字符串，当前库由 activeDb 决定
const onTableSelectChange = (keys: any) => onSelectChange(keys, activeDb.value[0] || '')

const saveTables = () => {
  const tables = selectedKeys.value.map(key => {
    const found = tableList.value.find((t: any) => t.tableName === key)
    return { tableName: key, tableComment: found ? found.tableComment : '' }
  })
  saveAgentTables({ agentCode: props.agentCode, tables }, baseDomain)
}

// ---------------- 表体高度自适应：右侧表清单沾满剩余屏幕 ----------------
const dbTableArea: Ref = ref()
const tableScrollY = ref(320)

const updateScrollY = () => {
  // 容器高 - 标题行(~40) - 表头(~40)，留 8px 余量
  tableScrollY.value = Math.max(160, dbTableArea.value.clientHeight - 88)
}
let resizeObserver: any = null
onMounted(() => {
  loadTables()
  updateScrollY()
  if (typeof ResizeObserver !== 'undefined' && dbTableArea.value) {
    resizeObserver = new ResizeObserver(updateScrollY)
    resizeObserver.observe(dbTableArea.value)
  }
})
onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect()
})
</script>

<style scoped>
.table-picker {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  margin-bottom: 10px;
  flex-shrink: 0;
}
.table-search-summary {
  color: #888;
  font-size: 12px;
  font-weight: 400;
}
.table-picker-body {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 12px;
}
.db-side {
  width: 220px;
  flex-shrink: 0;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.db-side-title {
  padding: 8px 12px;
  font-weight: 600;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.db-menu {
  flex: 1;
  overflow-y: auto;
  border-inline-end: none !important;
}
/* 菜单项单行 flex：库名超长省略号、计数右对齐不换行，避免 float 换行与下一项重叠 */
.db-menu :deep(.ant-menu-item) {
  display: flex;
  align-items: center;
}
.db-menu-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.db-menu-count {
  flex-shrink: 0;
  margin-left: 6px;
  color: #999;
  font-size: 12px;
}
.db-table-area {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.db-table-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  margin-bottom: 8px;
  flex-shrink: 0;
}
.db-table-search {
  width: 280px;
}
</style>
