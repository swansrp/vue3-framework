# common/agent — 框架 AI 会话组件域（调用者指南）

> 本目录是 framework 的**气泡式 agent 会话组件正源**。双宿主（InkHub／epc_ai）共享同一份代码；
> 观感＝海洋蓝固化（#2563eb 系＋活动琥珀/完成绿三色语义），面板域内令牌自洽，不依赖宿主全局主题。
> 决策历史与两栈合并全记录：InkHub 仓 `docs/调研-framework双agent栈融合.md`。

## 一句话选型

| 你的场景 | 用什么 |
|---|---|
| 页面里挂**一个** agent 会话的工作台（发起→执行→结论→续跑） | **`<AgentPane>`**（本目录，开箱即用） |
| 页面里要跑**多轮独立会话**串成对话线（每轮换素材/技能/稿、历史分页、按轮修订回放） | 自建对话线壳（参照 `InkHubChat.vue`），**每轮复用本目录的展示零件**（§3） |
| 只要某个局部零件（过程组/结论卡/澄清卡/口径卡…） | 直接 import 对应组件（§3），全部可独立使用 |

> 🔴 为什么拆两个壳：AgentPane 是**单会话**面板（绑定一个 sessionId；会话内的多轮续跑它已支持）。
> 「跨会话对话线」（每个用户提问开一个新 sessionId，换素材/技能/续带稿、按轮独立修订）是**宿主业务编排**，
> 不是面板职责——InkHub 的聊天页就是这么干的（`view/src/views/inkhub/chat/InkHubChat.vue`）。
> 两壳共享同一套渲染零件，观感一致。除非业务改成单会话续跑模式，否则不要试图合并它们。

## 1. `<AgentPane>` — 单会话工作台（大多数场景用这个）

开箱即用：自带引擎（SSE 优先＋轮询兜底）、附件、过程折叠组、澄清卡、口径卡、计划胶囊 dock、
结论卡、终态评价、阶段条、全程秒表、续跑。

```vue
<AgentPane
  :session-id="sessionId"          <!-- string | null；变化即重置 -->
  :capabilities="caps"             <!-- 能力位声明，来自 /agents 清单条目（files.upload 等） -->
  :health="healthMap"              <!-- 可选：能力运行级健康（/agents 的 health 字段） -->
  :model="modelName"               <!-- 可选：输入条小字模型名 -->
  variant="workbench"              <!-- 'workbench'（宽面板）| 'sidebar'（窄侧栏密度） -->
  :tool-labels="toolLabels"        <!-- 可选：业务工具人话名注入（框架表之外的） -->
  :upload-attachment="uploadFile"  <!-- 可选：上传端口注入（宿主自持附件链路时传，见 §4） -->
  :read-only="isReplay"            <!-- 可选：只读回放态（隐藏输入条/评价） -->
  :initial-instruction="'帮我生成…'" <!-- 可选：乐观用户气泡（会话启动空窗期显示） -->
  @finished="onFinished"           <!-- 'finish' | 'error' | 'stopped' -->
  @restart="onRestart"             <!-- 「重新发起」点击 -->
  @followup="onFollowup"           <!-- 终态续跑失败兜底上抛（正常路径就地续跑） -->
  @confirmation-revised="onRevised" <!-- 改口径裁决上抛（业务触发重算） -->
/>
```

**宿主职责**：自己调 `sessionStart`（`@/framework/apis/agent`）拿到 sessionId 写入 props；
面板负责之后的一切（引擎/渲染/控制）。

### 内置能力清单（2026-11-20 起）
- 过程折叠组（§02 形态：组头相位/计数圈/单步耗时/log 灰点/等待折叠/深度思考行）
- 决策卡（单选/多选/跳过/自由输入/EXPIRED 置灰）
- **待确认口径卡**（confirmations pending 时出现；确认/改口径走 `sessionResolveConfirmation`，
  改口径向上抛 `confirmation-revised(item, note)` 供业务触发重算）
- **终态评价**（like/dislike → `sessionRate`；踩先弹反馈收集；同值再点=取消）
- **阶段条**（快照 `stages` 非空时渲染，复用 AgentStages）
- **全程时间**：终态结论卡「全程 X」＋运行中头部「· 已 X」秒表
- 计划胶囊 dock（`plan` 非空时底部居中，向上展开）
- 附件（能力位/上传端口驱动）、产物卡（点击自动**续签**预签名地址，过期不 403）、
  启动空窗卡、终态续写（FINISHED 就地继续＋附件）

## 2. 跨会话对话线 — 参照 InkHubChat 自建壳

多轮对话线的**会话编排**（每轮 `sessionStart`、turns 列表、历史分页、按轮找回）是宿主业务——
框架不提供现成壳（AgentPane 装不下它，见开头）。要做时照抄现成实现并复用 §3 零件：

- 业务正源：`InkHub 仓 view/src/views/inkhub/chat/InkHubChat.vue`（四壳共用主体，
  Turn 状态机/素材通道/打字机/来源卡/按稿找回都在业务层）
- 每轮渲染＝`用户气泡 → <AgentProcessGroup> → 逐轮正文 → 澄清卡 → 业务结论区`

## 3. 共享展示零件（全部可独立 import）

均从本目录 `@/framework/components/common/agent` 导入（`index.ts` 桶导出）：

| 组件 | props（摘要） | 用途 |
|---|---|---|
| **`AgentProcessGroup`** | `items: AgentViewItem[]`；`running? paused? current? live? startedAt? now?` | 过程折叠组（§02）：组头相位/计数/耗时/预览＋编号圈行＋单步耗时右对齐＋log 灰点＋等待折叠＋深度思考行（点行展开 pre）。`now` 缺省且 running 时自走 1s 心跳；喂法＝事件流经 `buildAgentViewItems` 归约后取该组条目 |
| **`AgentConclusionCard`** | `kind: 'finish'\|'error'\|'stopped'`、`title`、`text?`（markdown）、`totalText?`（标题右「全程 X」） | 终态结论卡（左 3px 状态标） |
| **`AskDecisionCard`** | `question: AgentQuestionT`；`mode?: 'single'\|'multi'`、`replay? optimistic? showSkip? busy? title?` | 决策/澄清卡：点选即答、自由输入（IME 守卫）、跳过（`{text:'',skipped:true}`）、已答/超时置灰回显；multi 点选聚合后一次 emit `{text, optionKeys?}` |
| **`AgentConfirmCard`** | `sessionId`、`items: AgentConfirmationT[]`、`terminal?` | 待确认口径列表卡（确认/改口径行内输入；自带 resolve API 调用；上抛 `confirmation-revised`） |
| **`PlanCapsule`** | `items?: AgentPlanItemT[]` | 计划胶囊＋向上展开卡（无计划自动隐藏；常驻 dock 用） |
| **`Composer`** | 见源码（capabilities/interjectable/terminalContinue/sendable/uploadAttachment 注入/bar-left·bar-right 槽/hideAttach/collectFiles…） | 输入条（附件/拖拽/粘贴/探活点/模型名）；单独用时配合 `AttachmentTray` |
| **`AgentStages`** | `stages` 等（在 `components/common/agentStages/`，被本域复用） | 阶段条（22px 圆图标＋实耗） |

配套引擎与纯函数：`useAgentConversation(sessionId, options)`（**唯一引擎**：SSE/轮询/附件/控制全套；
options 支持 `toolLabels`/`uploadAttachment` 注入）、`buildAgentViewItems(events, { toolLabels })`、
`markdownOf`、`fmt.ts`（fmtDuration/clipOneLine）、`parseChatOption`。

### items 归约速查（喂 AgentProcessGroup）

```ts
import { buildAgentViewItems } from '@/framework/components/common/agent'
const items = buildAgentViewItems(events, { toolLabels: { /* 业务工具名→人话名 */ } })
// 过程组取 kind∈{tool, log}；text/file/artifact/status 是正文/卡片/状态条层级，另行渲染
```

## 4. 两个注入端口（宿主定制，框架缺省行为不变）

- **`toolLabels`**：业务工具的人话名/摘要（如 `save_supervision_log: '保存监理日志'`）。
  框架标签表只含框架工具——业务名必须注入，否则显示原名。贯通链：AgentPane prop →
  useAgentConversation options → buildAgentViewItems → toolDigest（extra 优先）。
- **`uploadAttachment`**：宿主自持附件链路时传 `(file, onProgress?) => Promise<AgentFileRef|null>`。
  注入即视为附件能力在场（capabilities 无 `files.upload` 也会亮附件/拖拽）；缺省走框架
  `sessionUpload`（对象存储腿）。InkHub 素材通道（`/api/material/*`）未来接这里。
  进度 clamp 由引擎统一处理（0-99）。

## 5. 退役留守件（别再新接）

旧平铺栈在 `components/common/agentChat/`，**仅剩 framework Insight 页与 relay/askPoll 协议在用**，
新调用方一律不要接：`index.vue`（AgentChat 平铺壳，待 Insight 迁移后退役）、
`AgentProcessFlow/AgentProcessArchives`（平铺过程件，AgentChat 消费）、`useAgentSession`
（32 行薄适配，委托本目录引擎；AgentChat 消费）、`AgentChatPanel/askPoll`
（smartAgent/relay 另一协议，不属于 core 会话体系）。已退役：`agentEventsToView`（2026-11-20 删）。
旧 import 路径 `@/framework/agent` 的兼容 shim 已于 2026-11-20 退役（两宿主业务层均已直写新路径）。

## 6. 样式纪律

- 全部类走 `.bidr-agent-*` 前缀，统一定义在 `styles.css`（组件不写 scoped）
- 海洋蓝令牌固化在面板域（`.bidr-agent-pane/.bidr-agent-conclusion/.bidr-agent-ask` 三根），
  宿主全局主题不受影响；新组件挂进面板域自动吃同一色板
- 交互纪律已内置：hover 仅指针设备、按压 0.96、reduced-motion 闸、`overscroll-behavior: contain`、
  `currentColor` 图标

---
*维护者备忘：两壳共存定案、能力并集清单、退役时点见 `docs/调研-framework双agent栈融合.md` §七/§八
与 `.zcode/dev-logs/20261120-094215-P3面板合并本体-平铺壳退役/`。*
