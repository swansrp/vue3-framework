/**
 * SkillWorkbench —— skill 管理平台通用工作台（framework 层基础组件）
 *
 * 一个 skillCode 索引出一套完整运维界面（新 skill 接入零前端开发，只需业务侧薄封装）：
 * 1. 链路画布——registry 结点 schema 驱动渲染（palette/属性表单/默认值全来自后端元数据）
 * 2. 执行轨迹——链路调试反馈回路：trace 列表 + 结点事件时间线（提示词/模型回答全文）
 * 3. 评价统计——运营回路：跨访问人聚合的赞/踩，通用筛选 + 业务维度插槽（api 可选注入，不传则隐藏）
 * 4. 业务资产 Tab——extraTabs + 动态具名插槽注入（如 ChatBI 的看板描述/敏感列配置）
 *
 * 业务侧注入面（见 config.vue 示例）：
 * - props.api：后端薄封装适配器（registry/flow/trace/rating 七个函数）
 * - props.flowMeta：链路职责富文案（registry 只给显示名，未维护的链降级显示显示名）
 * - props.typeColors：结点类型色板覆盖（默认色板未覆盖的类型用默认灰）
 * - slot:tab-{key}：业务资产 Tab 内容；slot:rating-filter-extra：业务筛选控件（作用域 reload）
 * - slot:rating-meta-extra：评价行业务维度展示（作用域 record）；slot:node-config-extra：属性面板字段附加说明
 */
<template>
  <div class="skill-workbench">
    <div class="page-header">
      <ApartmentOutlined class="header-icon" />
      <span class="header-title">{{ title }}</span>
      <span
        v-if="subtitle"
        class="header-sub"
      >{{ subtitle }}</span>
      <div class="header-actions">
        <div class="seg">
          <button
            v-for="f in flowList"
            :key="f.flowKey"
            class="seg-btn"
            :class="{ active: flowKey === f.flowKey }"
            @click="switchFlowKey(f.flowKey)"
          >
            {{ f.flowKey }} 链
          </button>
        </div>
        <span
          v-if="dirty"
          class="state-tag dirty"
        >未保存</span>
        <span
          class="state-tag"
          :class="builtin ? 'builtin' : 'custom'"
        >{{ builtin ? '内置默认链' : '自定义链' }}</span>
        <button
          class="btn primary"
          :disabled="saving"
          @click="saveFlow"
        >
          {{ saving ? '保存中…' : '保存' }}
        </button>
        <button
          class="btn ghost"
          :disabled="resetting"
          @click="resetFlow"
        >
          {{ resetting ? '重置中…' : '重置默认' }}
        </button>
      </div>
    </div>
    <div class="page-body">
      <div class="tab-bar">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'canvas' }"
          @click="activeTab = 'canvas'"
        >
          链路画布
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'trace' }"
          @click="activeTab = 'trace'"
        >
          执行轨迹
        </button>
        <button
          v-if="api.getRatingStat"
          class="tab-btn"
          :class="{ active: activeTab === 'rating' }"
          @click="activeTab = 'rating'"
        >
          评价统计
        </button>
        <button
          v-for="t in extraTabs"
          :key="t.key"
          class="tab-btn"
          :class="{ active: activeTab === t.key }"
          @click="activeTab = t.key"
        >
          {{ t.label }}
        </button>
      </div>

      <!-- Tab1 链路画布 -->
      <div
        v-show="activeTab === 'canvas'"
        class="flow-banner"
      >
        <span
          class="flow-banner-tag"
          :style="{ background: flowTagColor }"
        >{{ flowKey }} 链</span>
        <span class="flow-banner-text">{{ flowBanner.duty }}</span>
        <span class="flow-banner-io">触发：{{ flowBanner.trigger }}｜输出：{{ flowBanner.output }}</span>
      </div>
      <div
        v-show="activeTab === 'canvas'"
        class="canvas-wrap"
      >
        <div class="node-palette">
          <div class="palette-title">
            结点类型
          </div>
          <div
            v-for="meta in NODE_TYPES"
            :key="meta.type"
            class="palette-item"
            :title="meta.desc"
            @click="addNodeByType(meta.type)"
          >
            <span
              class="palette-dot"
              :style="{ background: meta.color }"
            ></span>
            <div class="palette-text">
              <div class="palette-name">
                {{ meta.label }}
              </div>
              <div class="palette-desc">
                {{ meta.desc }}
              </div>
            </div>
          </div>
          <div class="palette-tip">
            点击添加到画布；拖动连线；Delete 键删除选中元素
          </div>
        </div>
        <div class="canvas-main">
          <VueFlow
            v-model:nodes="flowNodes"
            v-model:edges="flowEdges"
            :delete-keycode="['Backspace', 'Delete']"
            :min-zoom="0.2"
            :max-zoom="2"
            fit-view-on-init
            @connect="onConnect"
            @node-click="onNodeClick"
            @edge-click="onEdgeClick"
            @pane-click="onPaneClick"
            @node-drag-stop="markDirty"
          />
        </div>
        <div class="props-panel">
          <template v-if="selectedNodeVM && nodeCfg">
            <div class="panel-title">
              <span
                class="panel-tag"
                :style="{ background: nodeColor(selectedNodeVM.data.type) }"
              >{{ selectedNodeVM.data.type }}</span>
              结点属性
            </div>
            <div class="panel-row">
              <label>结点 ID</label>
              <input
                class="ipt"
                :value="selectedNodeVM.id"
                disabled
              />
            </div>
            <div class="panel-row">
              <label>名称</label>
              <input
                v-model="selectedNodeVM.data.name"
                class="ipt"
                @input="markDirty"
              />
            </div>
            <div class="panel-row">
              <label>启用</label>
              <div class="row-inline">
                <input
                  v-model="selectedNodeVM.data.enabled"
                  type="checkbox"
                  @change="markDirty"
                />
                <span class="panel-hint">关闭=跳过执行，控制流直通</span>
              </div>
            </div>

            <!-- 类型专属配置：registry schema 驱动渲染（元数据即表单，新结点类型前端零改动） -->
            <template
              v-for="field in selectedFields"
              :key="field.key"
            >
              <template v-if="field.input === 'outputMap'">
                <div class="panel-row-title">
                  {{ field.label }}
                </div>
                <div
                  v-for="(row, i) in outputRows"
                  :key="i"
                  class="output-row"
                >
                  <input
                    class="ipt"
                    :value="row.field"
                    placeholder="响应字段"
                    @input="renameOutputKey(i, ($event.target as HTMLInputElement).value)"
                  />
                  <span class="output-arrow">→</span>
                  <input
                    class="ipt"
                    :value="row.variable"
                    placeholder="变量名"
                    @input="setOutputVar(i, ($event.target as HTMLInputElement).value)"
                  />
                  <button
                    class="btn mini danger"
                    @click="removeOutputRow(i)"
                  >
                    删
                  </button>
                </div>
                <button
                  class="btn mini"
                  @click="addOutputRow"
                >
                  + 添加映射
                </button>
              </template>
              <div
                v-else-if="field.input === 'textarea'"
                class="panel-row"
              >
                <label>{{ field.label }}</label>
                <textarea
                  v-model="nodeCfg[field.key]"
                  class="ipt area"
                  :rows="field.rows || 4"
                  :placeholder="field.placeholder"
                  @input="markDirty"
                ></textarea>
              </div>
              <div
                v-else-if="field.input === 'select'"
                class="panel-row"
              >
                <label>{{ field.label }}</label>
                <select
                  v-model="nodeCfg[field.key]"
                  class="ipt"
                  @change="markDirty"
                >
                  <option
                    v-for="opt in field.options || []"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label || opt.value }}
                  </option>
                </select>
              </div>
              <div
                v-else-if="field.input === 'switch'"
                class="panel-row"
              >
                <label>{{ field.label }}</label>
                <div class="row-inline">
                  <input
                    v-model="nodeCfg[field.key]"
                    type="checkbox"
                    @change="markDirty"
                  />
                  <span
                    v-if="field.hint"
                    class="panel-hint"
                  >{{ field.hint }}</span>
                </div>
              </div>
              <div
                v-else
                class="panel-row"
              >
                <label>{{ field.label }}</label>
                <input
                  v-model="nodeCfg[field.key]"
                  class="ipt"
                  :placeholder="field.placeholder"
                  @input="markDirty"
                />
              </div>
              <!-- 业务资产插槽：字段级附加说明（如 ChatBI 的 llm 模板占位符速查） -->
              <slot
                name="node-config-extra"
                :field="field"
                :type="selectedNodeVM.data.type"
              ></slot>
            </template>

            <div
              v-if="!selectedFields.length && selectedMeta"
              class="panel-hint-block"
            >
              {{ selectedMeta.desc || selectedMeta.type }}。该类型无需额外配置。
            </div>
            <div
              v-if="selectedMeta?.hint"
              class="panel-hint-block"
            >
              {{ selectedMeta.hint }}
            </div>

            <button
              class="btn danger block"
              @click="removeSelectedNode"
            >
              删除该结点
            </button>
          </template>

          <template v-else-if="selectedEdgeVM">
            <div class="panel-title">
              <span class="panel-tag edge">edge</span>
              连线属性
            </div>
            <div class="panel-row">
              <label>连线</label>
              <div class="edge-path">
                {{ selectedEdgeVM.source }} → {{ selectedEdgeVM.target }}
              </div>
            </div>
            <div class="panel-row">
              <label>条件表达式</label>
              <input
                v-model="edgeCondition"
                class="ipt"
                placeholder="空=恒真"
                @input="markDirty"
              />
            </div>
            <div class="panel-hint-block">
              支持：var == '值' / var != '值' / notEmpty(var)；留空恒真。
              引擎按边顺序取第一条成立的边；无法识别的表达式视为不成立。
            </div>
            <button
              class="btn danger block"
              @click="removeSelectedEdge"
            >
              删除该连线
            </button>
          </template>

          <template v-else>
            <div class="panel-empty">
              点击画布中的结点或连线编辑属性
            </div>
          </template>
        </div>
      </div>

      <!-- Tab2 执行轨迹 -->
      <div
        v-show="activeTab === 'trace'"
        class="trace-wrap"
      >
        <div class="trace-list">
          <div class="list-head">
            <span>{{ flowKey }} 链 · 最近执行（Redis 按访问人保留，天数见系统参数）</span>
            <button
              class="btn mini"
              :disabled="tracesLoading"
              @click="loadTraces"
            >
              {{ tracesLoading ? '加载中…' : '刷新' }}
            </button>
          </div>
          <div class="list-rows">
            <div
              v-for="t in traces"
              :key="t.traceId"
              class="trace-row"
              :class="[t.status, { active: currentTrace && currentTrace.traceId === t.traceId }]"
              @click="openTrace(t)"
            >
              <div class="trace-q">
                {{ t.question || '（无问题）' }}
              </div>
              <div class="trace-meta">
                <span class="trace-status">{{ traceStatusText(t.status) }}</span>
                <span v-if="t.operator">{{ t.operator }}</span>
                <span>{{ formatTime(t.startTime) }}</span>
                <span>{{ formatElapsed(t) }}ms</span>
                <span
                  v-if="t.builtin"
                  class="trace-builtin"
                >默认链</span>
              </div>
            </div>
            <div
              v-if="!tracesLoading && !traces.length"
              class="list-empty"
            >
              暂无执行记录{{ traceEmptyHint ? `——${traceEmptyHint}` : '' }}
            </div>
          </div>
        </div>
        <div class="trace-detail">
          <template v-if="currentTrace">
            <div class="detail-head">
              <div class="detail-q">
                {{ currentTrace.question || '（无问题）' }}
              </div>
              <div class="detail-meta">
                <span>{{ traceStatusText(currentTrace.status) }}</span>
                <span>访问人 {{ currentTrace.operator || '-' }}</span>
                <span>{{ formatTime(currentTrace.startTime) }} ~ {{ formatTime(currentTrace.endTime) }}</span>
                <span>耗时 {{ formatElapsed(currentTrace) }}ms</span>
                <span>{{ currentTrace.builtin ? '内置默认链' : '自定义链' }}</span>
              </div>
              <div
                v-if="currentTrace.error"
                class="detail-error"
              >
                {{ currentTrace.error }}
              </div>
            </div>
            <div class="detail-timeline">
              <div
                v-for="(ev, i) in currentTrace.nodes || []"
                :key="i"
                class="tl-item"
              >
                <span
                  class="tl-dot"
                  :class="ev.status"
                ></span>
                <div class="tl-body">
                  <div class="tl-head">
                    <span class="tl-name">{{ ev.name || ev.nodeId }}</span>
                    <span class="tl-type">{{ ev.type }}</span>
                    <span
                      class="tl-status"
                      :class="ev.status"
                    >{{ ev.status }}</span>
                    <span class="tl-ms">{{ ev.elapsedMs }}ms</span>
                  </div>
                  <div
                    v-if="ev.summary"
                    class="tl-summary"
                  >
                    {{ ev.summary }}
                  </div>
                  <template v-if="ev.detail">
                    <button
                      class="tl-toggle"
                      @click="toggleDetail(i)"
                    >
                      {{ expandedDetails.includes(i) ? '收起全文' : '展开全文' }}
                    </button>
                    <pre
                      v-if="expandedDetails.includes(i)"
                      class="tl-detail"
                    >{{ ev.detail }}</pre>
                  </template>
                </div>
              </div>
              <div
                v-if="!(currentTrace.nodes || []).length"
                class="list-empty"
              >
                该轨迹暂无结点事件
              </div>
            </div>
          </template>
          <div
            v-else
            class="list-empty"
          >
            点击左侧记录查看结点执行时间线（llm 提示词/模型回答全文可展开）
          </div>
        </div>
      </div>

      <!-- 业务资产 Tab：extraTabs 注册 + 动态具名插槽渲染（内容与懒加载由业务侧自治） -->
      <div
        v-for="t in extraTabs"
        v-show="activeTab === t.key"
        :key="t.key"
        class="extra-panel"
      >
        <slot :name="`tab-${t.key}`"></slot>
      </div>

      <!-- Tab 评价统计（运营回路：跨访问人聚合的赞/踩，筛选联动汇总；业务维度走插槽） -->
      <div
        v-if="api.getRatingStat"
        v-show="activeTab === 'rating'"
        class="rating-wrap"
      >
        <div class="rating-filter">
          <div class="seg">
            <button
              class="seg-btn"
              :class="{ active: ratingFilter.rating === 'all' }"
              @click="switchRatingType('all')"
            >
              全部
            </button>
            <button
              class="seg-btn"
              :class="{ active: ratingFilter.rating === 'like' }"
              @click="switchRatingType('like')"
            >
              点赞
            </button>
            <button
              class="seg-btn"
              :class="{ active: ratingFilter.rating === 'dislike' }"
              @click="switchRatingType('dislike')"
            >
              点踩
            </button>
          </div>
          <!-- 业务筛选插槽（如 ChatBI 的看板下拉；改值后调 reload 触发查询） -->
          <slot
            name="rating-filter-extra"
            :reload="loadRatings"
          ></slot>
          <input
            v-model="ratingFilter.operator"
            class="ipt rating-ipt"
            placeholder="评价人"
            @keyup.enter="loadRatings"
          />
          <input
            v-model="ratingFilter.startAt"
            class="ipt rating-date"
            type="datetime-local"
            title="评价时间起"
          />
          <span class="filter-sep">~</span>
          <input
            v-model="ratingFilter.endAt"
            class="ipt rating-date"
            type="datetime-local"
            title="评价时间止"
          />
          <input
            v-model="ratingFilter.keyword"
            class="ipt rating-ipt"
            placeholder="问题/回答关键词"
            @keyup.enter="loadRatings"
          />
          <button
            class="btn primary mini"
            :disabled="ratingLoading"
            @click="loadRatings"
          >
            {{ ratingLoading ? '查询中…' : '查询' }}
          </button>
          <button
            class="btn mini"
            :disabled="ratingLoading"
            @click="resetRatingFilter"
          >
            重置
          </button>
        </div>
        <div class="rating-summary">
          <div class="sum-item">
            <span class="sum-num">{{ ratingStat?.total ?? 0 }}</span>
            <span class="sum-label">评价总数</span>
          </div>
          <div class="sum-item like">
            <span class="sum-num">{{ ratingStat?.likeCount ?? 0 }}</span>
            <span class="sum-label">点赞</span>
          </div>
          <div class="sum-item dislike">
            <span class="sum-num">{{ ratingStat?.dislikeCount ?? 0 }}</span>
            <span class="sum-label">点踩</span>
          </div>
        </div>
        <div class="rating-list">
          <div
            v-for="r in ratingRecords"
            :key="r.ratingId"
            class="rating-row"
          >
            <div class="rating-head">
              <span
                class="rating-mark"
                :class="r.rating"
              >{{ r.rating === 'dislike' ? '点踩' : '点赞' }}</span>
              <span class="rating-q">{{ r.question || '（无问题）' }}</span>
            </div>
            <div
              v-if="r.answer"
              class="rating-answer"
              :title="r.answer"
            >
              {{ r.answer }}
            </div>
            <div class="rating-meta">
              <!-- 业务维度展示插槽（record 含通用字段 + 业务展平字段/ext） -->
              <slot
                name="rating-meta-extra"
                :record="r"
              ></slot>
              <span v-if="r.operator">{{ r.operator }}</span>
              <span v-if="r.messageTime">消息 {{ formatTime(r.messageTime) }}</span>
              <span v-if="r.ratingTime">评价 {{ formatTime(r.ratingTime) }}</span>
            </div>
          </div>
          <div
            v-if="!ratingLoading && !ratingRecords.length"
            class="list-empty"
          >
            暂无评价记录{{ ratingEmptyHint ? `——${ratingEmptyHint}` : '' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ApartmentOutlined } from '@ant-design/icons-vue'
import { VueFlow } from '@vue-flow/core'
import type { Connection, EdgeMouseEvent, NodeMouseEvent } from '@vue-flow/core'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

// ===== 组件契约类型（自包含：业务侧 api 适配器按结构兼容即可，无需 import 组件类型） =====

// 结点配置字段 schema（registry 下发，元数据即表单）
export interface SkillConfigField {
  key: string
  label?: string
  // 控件类型：text/textarea/select/switch/outputMap
  input?: string
  placeholder?: string
  hint?: string
  rows?: number
  options?: { value: string; label?: string }[]
  defaultValue?: unknown
}

export interface SkillNodeMeta {
  type: string
  label?: string
  desc?: string
  hint?: string
  fields?: SkillConfigField[]
}

export interface SkillRegistry {
  skillCode: string
  flows: { flowKey: string; displayName?: string }[]
  nodeTypes: SkillNodeMeta[]
}

export interface SkillGraph {
  nodes: {
    id: string
    type: string
    name?: string
    config?: Record<string, unknown>
    x?: number
    y?: number
    enabled?: boolean
  }[]
  edges: { source: string; target: string; condition?: string }[]
}

export interface SkillFlowDetail {
  flowKey: string
  builtin?: boolean
  graph?: SkillGraph
}

export interface SkillTraceNodeEvent {
  nodeId?: string
  name?: string
  type?: string
  status?: string
  summary?: string
  detail?: string
  elapsedMs?: number
}

export interface SkillTraceRecord {
  traceId: string
  flowKey?: string
  question?: string
  status?: string
  operator?: string
  error?: string
  builtin?: boolean
  startTime?: number | null
  endTime?: number | null
  nodes?: SkillTraceNodeEvent[]
}

// 评价记录：通用字段 + 业务展平字段（后端薄封装可能把 ext 展平到顶层，索引签名兜底）
export interface SkillRatingRecord {
  ratingId: string
  question?: string
  answer?: string
  rating?: string
  operator?: string
  messageTime?: number
  ratingTime?: number
  ext?: Record<string, string>
  [key: string]: unknown
}

export interface SkillRatingStatRes {
  total: number
  likeCount: number
  dislikeCount: number
  records: SkillRatingRecord[]
}

// 评价查询：通用维度 + 业务维度（extEquals 精确匹配，由业务侧插槽维护后经 props 传入）
export interface SkillRatingQuery {
  rating?: string
  operator?: string
  startTime?: number
  endTime?: number
  keyword?: string
  extEquals?: Record<string, string>
}

// 后端薄封装适配器（api 返回 {payload} 包装，组件统一 resp?.payload 取值）
export interface SkillWorkbenchApi {
  getRegistry: (skillCode: string) => Promise<unknown>
  getFlow: (flowKey: string) => Promise<unknown>
  saveFlow: (flowKey: string, graph: SkillGraph) => Promise<unknown>
  resetFlow: (flowKey: string) => Promise<unknown>
  getTraces: (flowKey: string) => Promise<unknown>
  getTraceDetail: (traceId: string) => Promise<unknown>
  // 可选：不传则评价 Tab 整体隐藏（skill 未接入评价时）
  getRatingStat?: (query: SkillRatingQuery) => Promise<unknown>
}

// 业务资产 Tab 注册（key 用于动态具名插槽 tab-{key}）
export interface SkillExtraTab {
  key: string
  label: string
}

// ===== props / emits =====

const props = withDefaults(
  defineProps<{
    /** skill 标识（registry 查询维度，一个 code 索引出一套工作台） */
    skillCode: string
    title: string
    subtitle?: string
    api: SkillWorkbenchApi
    /** 链路职责富文案（registry 只给显示名；未维护的链降级显示显示名） */
    flowMeta?: Record<string, { duty: string; trigger: string; output: string }>
    /** 结点类型色板覆盖（视觉资产，默认色板之外的业务类型可扩展；未覆盖类型用默认灰） */
    typeColors?: Record<string, string>
    /** 业务资产 Tab 清单（内容经 #tab-{key} 插槽注入） */
    extraTabs?: SkillExtraTab[]
    /** 评价业务筛选维度（extEquals 精确匹配；业务插槽维护值，组件查询时带上） */
    ratingExtEquals?: Record<string, string>
    /** 空态业务引导文案（如"去问答页提问后回来刷新"） */
    traceEmptyHint?: string
    ratingEmptyHint?: string
  }>(),
  {
    subtitle: '',
    flowMeta: () => ({}),
    typeColors: () => ({}),
    extraTabs: () => [],
    ratingExtEquals: undefined,
    traceEmptyHint: '',
    ratingEmptyHint: ''
  }
)

const emit = defineEmits<{ (e: 'tab-change', tab: string): void }>()

// ===== 常量 =====

interface NodeTypeMeta {
  type: string
  label: string
  desc: string
  color: string
}

// 结点类型默认色板（视觉资产前端维护，不在后端元数据内；props.typeColors 可覆盖/扩展）
const TYPE_COLORS: Record<string, string> = {
  start: '#52c41a',
  semantic: '#13c2c2',
  route_catalog: '#fa8c16',
  llm: '#722ed1',
  extract: '#eb2f96',
  output: '#1677ff'
}
const DEFAULT_COLOR = '#8c8c8c'

// 链路说明条标签色（按链在 flows 中的次序轮换取稳定色，任意链都有色）
const FLOW_TAG_PALETTE = ['#7c6fd0', '#3d8f5f', '#d46b9a', '#e8a33d', '#5a9bd4', '#66b3a6']

// 条件表达式与后端引擎 CONDITION_EQ/CONDITION_NOT_EMPTY 两个 Pattern 对齐
const CONDITION_PATTERN = /^(\w+\s*(==|!=)\s*'.*'|notEmpty\(\w+\))$/

// ===== Tab1 链路画布：状态 =====

// vue-flow 画布结点/连线（业务数据放 data；condition 挂在 edge VM 上，label 同步显示）
interface FlowNodeVM {
  id: string
  position: { x: number; y: number }
  data: { type: string; name: string; config: Record<string, any>; enabled: boolean }
  label?: string
}

interface FlowEdgeVM {
  id: string
  source: string
  target: string
  label?: string
  condition?: string
}

// skill 注册表（启动数据源：链清单 + 结点类型 schema；未就绪时 palette 为空、属性面板退化为基础三项）
const registry = ref<SkillRegistry | null>(null)
const flowList = computed(() => registry.value?.flows || [])

// palette 数据源：registry 结点元数据 + 色板（label/desc 来自执行器声明）
const NODE_TYPES = computed<NodeTypeMeta[]>(() =>
  (registry.value?.nodeTypes || []).map(m => ({
    type: m.type,
    label: m.label || m.type,
    desc: m.desc || '',
    color: mergedColors()[m.type] || DEFAULT_COLOR
  }))
)

const NODE_META = computed<Record<string, NodeTypeMeta>>(() =>
  Object.fromEntries(NODE_TYPES.value.map(m => [m.type, m])) as Record<string, NodeTypeMeta>
)

// 色板合并视图（默认色板 + props 覆盖；computed 依赖 props 响应式）
function mergedColors(): Record<string, string> {
  return { ...TYPE_COLORS, ...props.typeColors }
}

const activeTab = ref('canvas')
const flowKey = ref('')
const builtin = ref(true)
const dirty = ref(false)
const saving = ref(false)
const resetting = ref(false)
const flowNodes = ref<FlowNodeVM[]>([])
const flowEdges = ref<FlowEdgeVM[]>([])
const selection = ref<{ kind: 'node' | 'edge'; id: string } | null>(null)
let idSeq = 1

// 画布说明条：props.flowMeta 富文案优先，未维护的链降级显示 registry 显示名
const flowBanner = computed(() => {
  const meta = props.flowMeta[flowKey.value]
  if (meta) return meta
  const name = flowList.value.find(f => f.flowKey === flowKey.value)?.displayName || flowKey.value
  return { duty: name, trigger: '—', output: '—' }
})

// 说明条标签色：链次序轮换（不依赖链名硬编码）
const flowTagColor = computed(() => {
  const idx = flowList.value.findIndex(f => f.flowKey === flowKey.value)
  return FLOW_TAG_PALETTE[(idx < 0 ? 0 : idx) % FLOW_TAG_PALETTE.length]
})

const selectedNodeVM = computed(() => {
  if (!selection.value || selection.value.kind !== 'node') return null
  return flowNodes.value.find(n => n.id === selection.value.id) || null
})

const selectedEdgeVM = computed(() => {
  if (!selection.value || selection.value.kind !== 'edge') return null
  return flowEdges.value.find(e => e.id === selection.value.id) || null
})

// 选中结点的 config 引用（v-model 直写其属性，对象本身是响应式代理）
const nodeCfg = computed<Record<string, any> | null>(() => {
  const node = selectedNodeVM.value
  if (!node) return null
  if (!node.data.config) node.data.config = {}
  return node.data.config
})

// 选中结点的类型元数据与配置 schema（registry 驱动；未知类型降级为空 schema）
const selectedMeta = computed(() =>
  registry.value?.nodeTypes.find(m => m.type === selectedNodeVM.value?.data.type) || null
)

const selectedFields = computed<SkillConfigField[]>(() => selectedMeta.value?.fields || [])

// 结点类型色（palette 圆点/属性面板标签共用；色板未覆盖的类型用默认色）
const nodeColor = (type: string) => mergedColors()[type] || DEFAULT_COLOR

// output 结点的映射行（字段名→变量名；函数式更新写回 config.outputs）
const outputRows = computed(() => {
  const outputs = nodeCfg.value?.outputs
  if (!outputs || typeof outputs !== 'object') return []
  return Object.entries(outputs).map(([field, variable]) => ({ field, variable: String(variable) }))
})

const edgeCondition = computed({
  get: () => selectedEdgeVM.value?.condition || '',
  set: (v: string) => {
    const edge = selectedEdgeVM.value
    if (!edge) return
    edge.condition = v
    edge.label = v || ''
  }
})

// ===== Tab1：画布操作 =====

const markDirty = () => {
  dirty.value = true
}

function onConnect(params: Connection) {
  const { source, target } = params
  if (!source || !target || source === target) return
  if (flowEdges.value.some(e => e.source === source && e.target === target)) return
  flowEdges.value.push({
    id: `e_${source}_${target}_${Date.now().toString(36)}`,
    source,
    target,
    condition: '',
    label: ''
  })
  markDirty()
}

function onNodeClick({ node }: NodeMouseEvent) {
  selection.value = { kind: 'node', id: node.id }
}

function onEdgeClick({ edge }: EdgeMouseEvent) {
  selection.value = { kind: 'edge', id: edge.id }
}

function onPaneClick() {
  selection.value = null
}

// 画布新增结点的初始 config：元数据 defaultValue 合成（未声明默认值的键不预置）
function defaultConfig(type: string): Record<string, unknown> {
  const cfg: Record<string, unknown> = {}
  const meta = registry.value?.nodeTypes.find(m => m.type === type)
  meta?.fields?.forEach(f => {
    if (f.defaultValue !== null && f.defaultValue !== undefined) cfg[f.key] = f.defaultValue
  })
  return cfg
}

function addNodeByType(type: string) {
  const id = `${type}_${idSeq++}`
  // 纵向布局：新结点对齐默认链 x、追加到现有链尾下方（空画布时落 y=0）
  const maxY = flowNodes.value.reduce((m, n) => Math.max(m, n.position.y), -150)
  const label = NODE_META.value[type]?.label || type
  flowNodes.value.push({
    id,
    position: { x: 60, y: maxY + 150 },
    data: { type, name: label, config: defaultConfig(type) as Record<string, any>, enabled: true },
    label
  })
  selection.value = { kind: 'node', id }
  markDirty()
}

function removeSelectedNode() {
  const node = selectedNodeVM.value
  if (!node) return
  flowEdges.value = flowEdges.value.filter(e => e.source !== node.id && e.target !== node.id)
  flowNodes.value = flowNodes.value.filter(n => n.id !== node.id)
  selection.value = null
  markDirty()
}

function removeSelectedEdge() {
  const edge = selectedEdgeVM.value
  if (!edge) return
  flowEdges.value = flowEdges.value.filter(e => e.id !== edge.id)
  selection.value = null
  markDirty()
}

// ===== Tab1：output 映射行编辑 =====

function addOutputRow() {
  const cfg = nodeCfg.value
  if (!cfg) return
  if (!cfg.outputs || typeof cfg.outputs !== 'object') cfg.outputs = {}
  const outputs = cfg.outputs as Record<string, string>
  let i = 1
  while (outputs[`field${i}`]) i++
  outputs[`field${i}`] = ''
  markDirty()
}

function renameOutputKey(index: number, newKey: string) {
  const outputs = nodeCfg.value?.outputs as Record<string, string> | undefined
  if (!outputs || !outputRows.value[index]) return
  const oldKey = outputRows.value[index].field
  if (newKey === oldKey) return
  const entries = Object.entries(outputs)
  const rebuilt: Record<string, string> = {}
  entries.forEach(([k, v], i) => {
    rebuilt[i === index ? newKey : k] = v
  })
  nodeCfg.value!.outputs = rebuilt
  markDirty()
}

function setOutputVar(index: number, value: string) {
  const key = outputRows.value[index]?.field
  const outputs = nodeCfg.value?.outputs as Record<string, string> | undefined
  if (!key || !outputs) return
  outputs[key] = value
  markDirty()
}

function removeOutputRow(index: number) {
  const key = outputRows.value[index]?.field
  const outputs = nodeCfg.value?.outputs as Record<string, string> | undefined
  if (!key || !outputs) return
  delete outputs[key]
  markDirty()
}

// ===== Tab1：加载 / 校验 / 保存 / 重置 =====

// skill 注册表（链清单 + 结点类型 schema；启动时拉一次，是画布渲染的数据前提）
async function loadRegistry() {
  const resp = await props.api.getRegistry(props.skillCode)
  registry.value = (resp?.payload as SkillRegistry | undefined) || null
}

async function loadFlow() {
  const resp = await props.api.getFlow(flowKey.value)
  const detail = resp?.payload as SkillFlowDetail | undefined
  if (!detail?.graph) {
    flowNodes.value = []
    flowEdges.value = []
    return
  }
  builtin.value = !!detail.builtin
  flowNodes.value = (detail.graph.nodes || []).map(n => ({
    id: n.id,
    position: { x: n.x || 0, y: n.y || 0 },
    data: {
      type: n.type,
      name: n.name || n.type,
      config: { ...(n.config || {}) },
      enabled: n.enabled !== false
    },
    label: n.name || n.type
  }))
  flowEdges.value = (detail.graph.edges || []).map((e, i) => ({
    id: `e${i}_${e.source}_${e.target}`,
    source: e.source,
    target: e.target,
    condition: e.condition || '',
    label: e.condition || ''
  }))
  selection.value = null
}

// 画布态 → 后端 graph（结点带位置/启用态；边带条件表达式）
function buildGraph(): SkillGraph {
  return {
    nodes: flowNodes.value.map(n => ({
      id: n.id,
      type: n.data.type,
      name: n.data.name,
      config: { ...n.data.config },
      x: Math.round(n.position.x),
      y: Math.round(n.position.y),
      enabled: n.data.enabled
    })),
    edges: flowEdges.value.map(e => ({
      source: e.source,
      target: e.target,
      condition: (e.condition || '').trim() || undefined
    }))
  }
}

// 保存前预校验：必含且仅含一个 start、无孤立结点、start 有出边、条件表达式格式合法
function validateGraph(graph: SkillGraph): string[] {
  const errors: string[] = []
  if (!graph.nodes.length) {
    errors.push('画布为空，至少需要 start 结点')
    return errors
  }
  const starts = graph.nodes.filter(n => n.type === 'start')
  if (!starts.length) errors.push('缺少 start 结点')
  if (starts.length > 1) errors.push('start 结点只能有一个')
  const connected = new Set<string>()
  graph.edges.forEach(e => {
    connected.add(e.source)
    connected.add(e.target)
  })
  const isolated = graph.nodes.filter(n => !connected.has(n.id))
  if (isolated.length) {
    errors.push(`存在未连线的孤立结点：${isolated.map(n => n.name || n.id).join('、')}`)
  }
  if (starts.length === 1 && !graph.edges.some(e => e.source === starts[0].id)) {
    errors.push('start 结点没有出边，链路无法流转')
  }
  const badCond = graph.edges.filter(e => e.condition && !CONDITION_PATTERN.test(e.condition as string))
  if (badCond.length) {
    errors.push("存在无法识别的条件表达式（仅支持 var == '值' / var != '值' / notEmpty(var)）")
  }
  return errors
}

async function saveFlow() {
  const graph = buildGraph()
  const errors = validateGraph(graph)
  if (errors.length) {
    message.warning(errors[0])
    return
  }
  saving.value = true
  try {
    await props.api.saveFlow(flowKey.value, graph)
    message.success('链路已保存，即改即生效')
    dirty.value = false
    await loadFlow()
  } finally {
    saving.value = false
  }
}

async function resetFlow() {
  resetting.value = true
  try {
    await props.api.resetFlow(flowKey.value)
    message.success(`已重置 ${flowKey.value} 链为内置默认`)
    dirty.value = false
    await loadFlow()
  } finally {
    resetting.value = false
  }
}

function switchFlowKey(key: string) {
  if (flowKey.value === key) return
  flowKey.value = key
  dirty.value = false
  loadFlow()
  if (traceLoaded.value) loadTraces()
  currentTrace.value = null
}

// ===== Tab2 执行轨迹 =====

const traces = ref<SkillTraceRecord[]>([])
const currentTrace = ref<SkillTraceRecord | null>(null)
const tracesLoading = ref(false)
const traceLoaded = ref(false)
const expandedDetails = ref<number[]>([])

async function loadTraces() {
  tracesLoading.value = true
  try {
    const resp = await props.api.getTraces(flowKey.value)
    traces.value = (resp?.payload as SkillTraceRecord[] | undefined) || []
  } finally {
    tracesLoading.value = false
  }
}

async function openTrace(t: SkillTraceRecord) {
  const resp = await props.api.getTraceDetail(t.traceId)
  currentTrace.value = (resp?.payload as SkillTraceRecord | undefined) || t
  expandedDetails.value = []
}

function toggleDetail(index: number) {
  const list = expandedDetails.value
  const pos = list.indexOf(index)
  if (pos >= 0) list.splice(pos, 1)
  else list.push(index)
}

function traceStatusText(status: string): string {
  if (status === 'success') return '成功'
  if (status === 'error') return '失败'
  return '执行中'
}

function formatTime(ts?: number | null): string {
  if (!ts) return '-'
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function formatElapsed(t: SkillTraceRecord): number {
  return t.startTime && t.endTime ? t.endTime - t.startTime : 0
}

// ===== 评价统计（运营：跨访问人聚合的赞/踩） =====

// 筛选条件（startAt/endAt 为 datetime-local 原生值，查询时转毫秒时间戳）
const ratingFilter = reactive({
  rating: 'all' as 'all' | 'like' | 'dislike',
  operator: '',
  startAt: '',
  endAt: '',
  keyword: ''
})
const ratingStat = ref<SkillRatingStatRes | null>(null)
const ratingLoading = ref(false)
const ratingLoaded = ref(false)

const ratingRecords = computed<SkillRatingRecord[]>(() => ratingStat.value?.records || [])

async function loadRatings() {
  if (!props.api.getRatingStat) return
  ratingLoading.value = true
  try {
    const f = ratingFilter
    const resp = await props.api.getRatingStat({
      rating: f.rating === 'all' ? undefined : f.rating,
      operator: f.operator.trim() || undefined,
      startTime: f.startAt ? new Date(f.startAt).getTime() : undefined,
      endTime: f.endAt ? new Date(f.endAt).getTime() : undefined,
      keyword: f.keyword.trim() || undefined,
      extEquals: props.ratingExtEquals
    })
    ratingStat.value = (resp?.payload as SkillRatingStatRes | undefined) || null
  } finally {
    ratingLoading.value = false
  }
}

// 类型切换即查（其余条件走查询按钮/回车）
function switchRatingType(type: 'all' | 'like' | 'dislike') {
  if (ratingFilter.rating === type) return
  ratingFilter.rating = type
  loadRatings()
}

function resetRatingFilter() {
  ratingFilter.rating = 'all'
  ratingFilter.operator = ''
  ratingFilter.startAt = ''
  ratingFilter.endAt = ''
  ratingFilter.keyword = ''
  loadRatings()
}

// ===== 生命周期与 Tab 懒加载 =====

watch(activeTab, tab => {
  if (tab === 'trace' && !traceLoaded.value) {
    traceLoaded.value = true
    loadTraces()
  }
  if (tab === 'rating' && !ratingLoaded.value) {
    ratingLoaded.value = true
    loadRatings()
  }
  // 业务资产 Tab 的懒加载由业务侧监听 tab-change 自治
  emit('tab-change', tab)
})

// skill 注册表先行（链清单与结点 schema 是画布渲染前提），再加载当前链
onMounted(async () => {
  await loadRegistry()
  const keys = flowList.value.map(f => f.flowKey)
  if (keys.length && !keys.includes(flowKey.value)) flowKey.value = keys[0]
  loadFlow()
})
</script>

<style scoped lang="less">
.skill-workbench {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-base);
}

.page-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 24px;
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border-subtle);

  .header-icon {
    font-size: 22px;
    color: var(--accent);
  }

  .header-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .header-sub {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .header-actions {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 10px;
  }
}

.seg {
  display: inline-flex;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  overflow: hidden;

  .seg-btn {
    padding: 4px 14px;
    font-size: 12px;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;

    &.active {
      background: var(--accent);
      color: #fff;
    }
  }
}

.state-tag {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  white-space: nowrap;

  &.builtin {
    background: rgba(250, 140, 22, 0.12);
    color: #fa8c16;
  }

  &.custom {
    background: rgba(22, 119, 255, 0.12);
    color: #1677ff;
  }

  &.dirty {
    background: rgba(250, 82, 82, 0.12);
    color: #fa5252;
  }
}

.btn {
  padding: 5px 16px;
  font-size: 13px;
  border-radius: 6px;
  border: 1px solid var(--border-subtle);
  background: var(--bg-elevated);
  color: var(--text-primary);
  cursor: pointer;
  white-space: nowrap;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.primary {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }

  &.ghost {
    background: transparent;
  }

  &.danger {
    border-color: rgba(250, 82, 82, 0.5);
    color: #fa5252;
  }

  &.mini {
    padding: 2px 10px;
    font-size: 12px;
  }

  &.block {
    display: block;
    width: 100%;
    margin-top: 16px;
  }
}

.ipt {
  width: 100%;
  padding: 5px 8px;
  font-size: 13px;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  background: var(--bg-base);
  color: var(--text-primary);
  box-sizing: border-box;

  &:disabled {
    opacity: 0.6;
  }

  &.area {
    font-family: monospace;
    font-size: 12px;
    line-height: 1.6;
    resize: vertical;
  }
}

.page-body {
  flex: 1;
  min-height: 0;
  padding: 12px 24px 20px;
  display: flex;
  flex-direction: column;
}

.tab-bar {
  flex-shrink: 0;
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--border-subtle);
  margin-bottom: 12px;

  .tab-btn {
    padding: 8px 18px;
    font-size: 14px;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    border-bottom: 2px solid transparent;

    &.active {
      color: var(--accent);
      border-bottom-color: var(--accent);
      font-weight: 600;
    }
  }
}

// 内容面板容器组：三个通用 Tab + 业务资产插槽面板（业务面板内容自带布局）
.canvas-wrap,
.trace-wrap,
.extra-panel,
.rating-wrap {
  flex: 1;
  min-height: 0;
}

.list-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  font-size: 12px;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-subtle);
}

.list-empty {
  padding: 40px 16px;
  text-align: center;
  font-size: 12px;
  color: var(--text-secondary);
}

.flow-banner {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  padding: 8px 12px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  font-size: 12px;

  // 标签色由 flowTagColor 内联下发（按链次序轮换，不依赖链名硬编码）
  .flow-banner-tag {
    flex-shrink: 0;
    padding: 2px 10px;
    border-radius: 4px;
    font-weight: 600;
    font-family: monospace;
    color: #fff;
  }

  .flow-banner-text {
    color: var(--text-primary);
  }

  .flow-banner-io {
    margin-left: auto;
    flex-shrink: 0;
    color: var(--text-secondary);
    font-family: monospace;
  }
}

.canvas-wrap {
  display: flex;
  gap: 12px;

  .node-palette {
    flex-shrink: 0;
    width: 200px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px;
    background: var(--bg-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: 8px;
    overflow-y: auto;

    .palette-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      margin-bottom: 4px;
    }

    .palette-item {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      padding: 8px;
      border: 1px solid var(--border-subtle);
      border-radius: 6px;
      cursor: pointer;

      &:hover {
        border-color: var(--accent);
      }

      .palette-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        margin-top: 4px;
        flex-shrink: 0;
      }

      .palette-name {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary);
        font-family: monospace;
      }

      .palette-desc {
        font-size: 11px;
        color: var(--text-secondary);
        margin-top: 2px;
        line-height: 1.5;
      }
    }

    .palette-tip {
      font-size: 11px;
      color: var(--text-secondary);
      margin-top: 8px;
      line-height: 1.6;
    }
  }

  .canvas-main {
    flex: 1;
    min-width: 0;
    border: 1px solid var(--border-subtle);
    border-radius: 8px;
    background: var(--bg-elevated);
    overflow: hidden;

    // 纵向布局下放宽放大默认结点（vue-flow 原生小框在竖排时太迷你）
    :deep(.vue-flow__node-default) {
      min-width: 172px;
      padding: 13px 20px;
      font-size: 15px;
      font-weight: 600;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.14);
    }

    :deep(.vue-flow__handle) {
      width: 9px;
      height: 9px;
    }
  }

  .props-panel {
    flex-shrink: 0;
    width: 320px;
    padding: 14px;
    background: var(--bg-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: 8px;
    overflow-y: auto;

    .panel-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 12px;
    }

    .panel-tag {
      font-size: 11px;
      color: #fff;
      border-radius: 4px;
      padding: 1px 8px;
      font-family: monospace;

      &.edge {
        background: #868e96;
      }
    }

    .panel-row {
      margin-bottom: 10px;

      label {
        display: block;
        font-size: 12px;
        color: var(--text-secondary);
        margin-bottom: 4px;
      }
    }

    .row-inline {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
    }

    .panel-hint {
      font-size: 11px;
      color: var(--text-secondary);
    }

    .panel-hint-block {
      font-size: 12px;
      color: var(--text-secondary);
      background: var(--bg-base);
      border: 1px dashed var(--border-subtle);
      border-radius: 6px;
      padding: 8px 10px;
      margin-bottom: 10px;
      line-height: 1.6;
    }

    .panel-row-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      margin: 10px 0 6px;
    }

    .panel-empty {
      color: var(--text-secondary);
      font-size: 13px;
      text-align: center;
      margin-top: 60px;
    }

    .edge-path {
      font-size: 13px;
      color: var(--text-primary);
      font-family: monospace;
    }
  }
}

.output-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;

  .output-arrow {
    color: var(--text-secondary);
    flex-shrink: 0;
  }
}

.trace-wrap {
  display: flex;
  gap: 12px;

  .trace-list {
    flex-shrink: 0;
    width: 420px;
    display: flex;
    flex-direction: column;
    background: var(--bg-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: 8px;
    overflow: hidden;

    .list-rows {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
    }
  }

  .trace-row {
    padding: 10px 12px;
    cursor: pointer;
    border-bottom: 1px solid var(--border-subtle);

    &:hover {
      background: var(--bg-base);
    }

    &.active {
      background: rgba(22, 119, 255, 0.08);
    }

    .trace-q {
      font-size: 13px;
      color: var(--text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .trace-meta {
      display: flex;
      gap: 10px;
      font-size: 11px;
      color: var(--text-secondary);
      margin-top: 4px;
      align-items: center;
    }

    .trace-status {
      font-weight: 600;
    }

    &.success .trace-status {
      color: #52c41a;
    }

    &.error .trace-status {
      color: #fa5252;
    }

    &.running .trace-status {
      color: #fa8c16;
    }

    .trace-builtin {
      border: 1px solid var(--border-subtle);
      border-radius: 3px;
      padding: 0 4px;
    }
  }

  .trace-detail {
    flex: 1;
    min-width: 0;
    background: var(--bg-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: 8px;
    overflow-y: auto;
    padding: 14px 16px;

    .detail-head {
      margin-bottom: 12px;
    }

    .detail-q {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .detail-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 12px;
      color: var(--text-secondary);
      margin-top: 6px;
    }

    .detail-error {
      margin-top: 8px;
      padding: 6px 10px;
      border-radius: 6px;
      background: rgba(250, 82, 82, 0.1);
      color: #fa5252;
      font-size: 12px;
    }

    .tl-item {
      display: flex;
      gap: 10px;
      padding: 8px 0;
      border-bottom: 1px dashed var(--border-subtle);
    }

    .tl-dot {
      flex-shrink: 0;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      margin-top: 5px;

      &.ok {
        background: #52c41a;
      }

      &.skipped {
        background: #adb5bd;
      }

      &.error {
        background: #fa5252;
      }
    }

    .tl-body {
      flex: 1;
      min-width: 0;
    }

    .tl-head {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .tl-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .tl-type {
      font-size: 11px;
      font-family: monospace;
      color: var(--text-secondary);
      background: var(--bg-base);
      padding: 0 6px;
      border-radius: 3px;
    }

    .tl-status {
      font-size: 11px;
      font-weight: 600;

      &.ok {
        color: #52c41a;
      }

      &.skipped {
        color: #868e96;
      }

      &.error {
        color: #fa5252;
      }
    }

    .tl-ms {
      font-size: 11px;
      color: var(--text-secondary);
      margin-left: auto;
    }

    .tl-summary {
      font-size: 12px;
      color: var(--text-secondary);
      margin-top: 4px;
    }

    .tl-toggle {
      margin-top: 4px;
      font-size: 12px;
      color: var(--accent);
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
    }

    .tl-detail {
      margin-top: 6px;
      padding: 10px;
      background: var(--bg-base);
      border: 1px solid var(--border-subtle);
      border-radius: 6px;
      font-size: 12px;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 400px;
      overflow-y: auto;
    }
  }
}

// 评价统计（运营：筛选联动汇总 + 明细列表；业务筛选控件/行业务维度经插槽注入）
.rating-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;

  .rating-filter {
    flex-shrink: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    background: var(--bg-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: 8px;

    // .ipt 默认 width:100%，在筛选行内改为固定宽度
    .rating-ipt {
      width: 160px;
    }

    .rating-date {
      width: 195px;
      // 原生日历图标跟随明暗主题
      color-scheme: light dark;
    }

    .filter-sep {
      font-size: 12px;
      color: var(--text-secondary);
    }
  }

  .rating-summary {
    flex-shrink: 0;
    display: flex;
    gap: 12px;

    .sum-item {
      display: flex;
      align-items: baseline;
      gap: 8px;
      padding: 10px 18px;
      background: var(--bg-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: 8px;

      .sum-num {
        font-size: 22px;
        font-weight: 600;
        color: var(--text-primary);
      }

      .sum-label {
        font-size: 12px;
        color: var(--text-secondary);
      }

      &.like .sum-num {
        color: #52c41a;
      }

      &.dislike .sum-num {
        color: #fa5252;
      }
    }
  }

  .rating-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-right: 4px;
  }

  .rating-row {
    flex-shrink: 0;
    padding: 10px 14px;
    background: var(--bg-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: 8px;

    .rating-head {
      display: flex;
      align-items: center;
      gap: 8px;

      .rating-mark {
        flex-shrink: 0;
        font-size: 11px;
        padding: 1px 8px;
        border-radius: 10px;

        &.like {
          background: rgba(82, 196, 26, 0.12);
          color: #52c41a;
        }

        &.dislike {
          background: rgba(250, 82, 82, 0.12);
          color: #fa5252;
        }
      }

      .rating-q {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    .rating-answer {
      margin-top: 6px;
      font-size: 12px;
      line-height: 1.6;
      color: var(--text-secondary);
      // 回答正文可能很长（含 chart-spec 代码块），两行截断、悬停看全文
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .rating-meta {
      margin-top: 6px;
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 11px;
      color: var(--text-secondary);

      span {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 320px;
      }
    }
  }
}
</style>
