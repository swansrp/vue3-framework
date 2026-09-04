<template>
  <div class="config-section">
    <div class="section-title">
      <span>资产编辑与发布（生成/改稿后须发布才进运行期，页头「发布并刷新生效」）</span>
      <span class="section-actions">
        <a-dropdown-button
          type="primary"
          :loading="genRunning"
          :disabled="lockConfig"
          @click="generate('autonomous')"
          @visible-change="() => {}"
        >
          AI 自主生成
          <template #overlay>
            <a-menu @click="({ key }: any) => generate(String(key))">
              <a-menu-item key="pipeline">
                固定流水线（骨架 + 按固定顺序逐类 LLM 生成，进度走流程节点抽屉）
              </a-menu-item>
              <a-menu-item key="skeleton">
                仅生成骨架（不调 LLM，指标/关系/概念出空稿，敏感字段出空声明表）
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown-button>
        <a-button
          v-if="genRunning || stopping"
          :loading="stopping"
          :disabled="lockConfig || stopping"
          @click="stopGenerate"
        >
          {{ stopping ? '正在停止…' : '停止生成' }}
        </a-button>
        <!-- 抽屉关了但会话还在跑：页内原地重开入口（进页重连只覆盖刷新/离页场景） -->
        <a-button
          v-if="genRunning && !autonomousOpen && autonomousSessionId && !autonomousTerminal"
          type="link"
          @click="autonomousOpen = true"
        >
          查看进度
        </a-button>
        <a-button
          :loading="downloadLoading"
          :disabled="lockConfig"
          @click="downloadAssets"
        >
          下载资产包（供 skill 使用）
        </a-button>
        <a-button
          :loading="uploadLoading"
          :disabled="lockConfig"
          @click="triggerUpload"
        >
          上传资产包（skill 调试产物）
        </a-button>
        <input
          ref="fileInputRef"
          type="file"
          accept=".zip"
          style="display: none"
          @change="handleUploadFile"
        />
        <a-button
          :disabled="lockConfig"
          @click="openPrompts"
        >
          提示词调优
        </a-button>
      </span>
    </div>
    <div class="gen-tip">
      配置顺序：先在「实体」完成列配置确认（维度/码值域随实体确定性生成），再完成「敏感字段」「行权限」两条红线（纯人工，不走 LLM），最后生成——AI 只产出业务概念/关系/指标三类。AI 自主生成（主按钮）：大模型持探索与落库工具自主决定顺序与拆分，可停止后续作；固定流水线（下拉菜单）：按固定顺序逐类生成；仅骨架：确定性元数据读取。生成中可点「停止生成」，已完成部分保留草稿，再次生成可继续（自主模式自动补齐缺失资产）。
    </div>
    <div class="asset-tabs-bar">
      <a-tabs
        v-model:active-key="assetTab"
        size="small"
        class="asset-tabs"
        @change="onTabChange"
      >
        <a-tab-pane
          v-for="p in assetPanes"
          :key="p.key"
          :disabled="lockConfig && p.tone === 'semantic'"
        >
          <template #tab>
            <!-- 每组首个 tab 前挂分隔线 + 组语义标签（三组：事实层 / 红线 / AI 语义；首组前不挂分隔线） -->
            <span
              v-if="p.groupFirst && p.key !== 'entities'"
              class="grp-sep"
            ></span>
            <span
              v-if="p.groupFirst"
              class="grp-tag"
              :class="`grp-${p.tone}`"
            >{{ p.tag }}</span>
            {{ p.label }}
          </template>
        </a-tab-pane>
      </a-tabs>
      <!-- 仅语义三类支持 LLM 单独重生成（骨架三类确定性生成不提供入口；敏感字段人工声明不走 LLM） -->
      <a-button
        v-if="llmTypes.includes(assetTab)"
        size="small"
        class="regen-btn"
        @click="regenVisible = true"
      >
        AI 重生成
      </a-button>
    </div>
    <!-- 敏感字段 tab：逐表治理面板（每表或标记敏感列+可选替换列，或声明无敏感字段）；
         其他资产沿用 AssetEditor -->
    <div
      v-if="assetTab === 'sensitive-fields'"
      class="gov-panel"
    >
      <div
        class="gov-summary"
        :class="governed ? 'gov-summary-ok' : 'gov-summary-warn'"
      >
        <template v-if="entityList.length === 0">
          尚未选择数据表：请先到「1. 选表」勾选表，选表后本页直接按选表逐表声明敏感字段（实时读表结构，无需先生成骨架）
        </template>
        <template v-else-if="governed">
          敏感治理就绪（{{ coveredCount }}/{{ entityList.length }} 张表已处理）：LLM 生成与问数对话已放行
        </template>
        <template v-else>
          敏感治理未完成（{{ coveredCount }}/{{ entityList.length }} 张表已处理）：全部表声明前，AI 生成（业务概念/关系/指标）与问数对话将被拦截
        </template>
      </div>
      <a-table
        :columns="govColumns"
        :data-source="entityList"
        row-key="name"
        size="small"
        bordered
        :pagination="{ pageSize: 10, size: 'small', showSizeChanger: false }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === '__entity'">
            <span class="gov-entity">{{ record.display_name || record.name }}</span>
            <span class="gov-table">{{ record.table }}</span>
          </template>
          <template v-else-if="column.key === '__status'">
            <a-tag
              v-if="statusOf(record.name) === 'none'"
              color="green"
            >
              已声明无敏感字段
            </a-tag>
            <a-tag
              v-else-if="statusOf(record.name) === 'marked'"
              color="blue"
            >
              {{ (findEntry(record.name)?.fields || []).length }} 个敏感列
            </a-tag>
            <a-tag
              v-else
              color="red"
            >
              待处理
            </a-tag>
          </template>
          <template v-else-if="column.key === '__fields'">
            <span
              v-for="f in findEntry(record.name)?.fields || []"
              :key="f.field"
              class="gov-field-chip"
            >{{ f.field }}<span
              v-if="f.replace_field"
              class="gov-replace"
            > → {{ f.replace_field }}</span></span>
            <span
              v-if="!(findEntry(record.name)?.fields || []).length"
              class="gov-empty"
            >—</span>
          </template>
          <template v-else-if="column.key === '__op'">
            <a-button
              type="link"
              size="small"
              @click="openGovern(record)"
            >
              配置
            </a-button>
          </template>
        </template>
      </a-table>
    </div>
    <!-- 实体 tab：列配置确认面板（每列角色/单位/粒度 + 业务键/分区采信）；
         草稿来自骨架前置（选表保存即构建），键/分区预选行源 /govern/keys（索引实时读） -->
    <div
      v-else-if="assetTab === 'entities'"
      class="ent-panel"
    >
      <div
        class="gov-summary"
        :class="entAllConfirmed ? 'gov-summary-ok' : 'gov-summary-warn'"
      >
        <template v-if="entDrafts.length === 0">
          暂无实体草稿：请先到「1. 选表」勾选表并保存——选表保存后即构建实体草稿（无需等生成任务）
        </template>
        <template v-else>
          列配置确认（{{ entConfirmedCount }}/{{ entDrafts.length }} 张表已确认）：每表过目列角色/单位后点「确认本表」，全部确认后可进红线配置与 AI 生成
          <a-button
            type="link"
            size="small"
            :disabled="entAllConfirmed"
            @click="adoptAllPreselect"
          >
            一键采用全部预选
          </a-button>
        </template>
      </div>
      <!-- 配置自查疑点清单：确定性检测（无 LLM）探人工配置疑似错误；逐条裁决（采纳建议/维持原值），
           无一键确认——裁决即经验（单位已核/忽略码），同表重建与模板复用免再检 -->
      <div
        v-if="conflicts.length"
        class="conflict-panel"
      >
        <div class="conflict-head">
          配置自查：探出 {{ conflicts.length }} 个疑点，请逐条裁决（裁决结论固化为经验，下次同表免检）
          <a-button
            type="link"
            size="small"
            :loading="conflictBusy"
            @click="loadConflicts"
          >
            重新检测
          </a-button>
        </div>
        <div
          v-for="(f, i) in conflicts"
          :key="i"
          class="conflict-row"
        >
          <div class="conflict-info">
            <a-tag
              :color="conflictTagColor(f.type)"
              size="small"
            >
              {{ conflictTagText(f.type) }}
            </a-tag>
            <span class="conflict-loc">{{ f.table || f.entity }}<template v-if="f.field"> · {{ f.field }}</template><template v-if="f.domain_key"> · {{ f.domain_key }}</template></span>
            <span class="conflict-desc">现状「{{ f.current }}」→ 建议「{{ f.suggestion }}」</span>
            <div
              v-if="f.evidence"
              class="conflict-evidence"
            >
              证据：{{ f.evidence }}
            </div>
          </div>
          <div class="conflict-ops">
            <a-button
              type="primary"
              ghost
              size="small"
              :loading="conflictBusy"
              @click="resolveFinding(f, 'adopt')"
            >
              采纳建议
            </a-button>
            <a-button
              size="small"
              :loading="conflictBusy"
              @click="resolveFinding(f, 'keep')"
            >
              维持原值
            </a-button>
          </div>
        </div>
      </div>
      <!-- 主从布局：左侧表目录（确认状态一眼扫完），右侧当前表详情（键/分区 + 全部列） -->
      <div
        v-if="entDrafts.length"
        class="ent-layout"
      >
        <div class="ent-menu">
          <div
            v-for="ent in entDrafts"
            :key="ent.name"
            class="ent-menu-item"
            :class="{ 'ent-menu-active': ent.name === entActiveKey }"
            @click="entActiveKey = ent.name"
          >
            <div class="ent-menu-line">
              <span class="ent-menu-name">{{ ent.display_name || ent.name }}</span>
              <a-tag
                v-if="ent.certified"
                color="green"
              >
                已认证
              </a-tag>
              <a-tag
                v-else-if="ent.confirmed"
                color="blue"
              >
                待认证
              </a-tag>
              <a-tag
                v-else
                color="orange"
              >
                待确认
              </a-tag>
            </div>
            <div class="ent-menu-table">
              {{ ent.table }}
            </div>
          </div>
        </div>
        <div
          v-if="entActive"
          class="ent-detail"
        >
          <!-- 功能按钮置顶：确认/认证/模板/评审与本表操作集中在表头，免滚到底找按钮 -->
          <div class="ent-actions">
            <a-button
              type="primary"
              size="small"
              @click="confirmEntity(entActive)"
            >
              确认本表并下一表
            </a-button>
            <a-button
              v-if="!entActive.certified"
              type="primary"
              ghost
              size="small"
              @click="certifyEntity(entActive)"
            >
              认证本表
            </a-button>
            <a-button
              size="small"
              @click="saveToTemplate"
            >
              保存到模板
            </a-button>
            <a-button
              size="small"
              @click="importFromTemplate"
            >
              从模板导入
            </a-button>
            <a-button
              size="small"
              :loading="reviewStarting"
              @click="startReview"
            >
              AI 评审（只读复核）
            </a-button>
            <a-button
              size="small"
              @click="openReviewReport"
            >
              评审报告<template v-if="openQuestionable > 0">
                （{{ openQuestionable }} 条商榷待处理）
              </template>
            </a-button>
            <span
              v-if="entActive.certified"
              class="ent-tip"
            >已认证（可沉淀模板）；改动后认证自动失效需重新认证</span>
            <span
              v-else-if="entActive.confirmed"
              class="ent-tip"
            >已确认；点「认证本表」后才可沉淀模板</span>
          </div>
          <div class="ent-keyrow">
            <span class="ent-keylabel">业务键：</span>
            <a-select
              v-model:value="entActive.primary_key"
              mode="multiple"
              size="small"
              class="ent-keyselect"
              :options="fieldOptions(entActive)"
              placeholder="选择业务键列（复合键可多选）"
              @change="invalidateEntCert"
            />
            <span class="ent-basis">预选依据：{{ keyInfoOf(entActive)?.key_basis || '无（无索引且无 *id 列）' }}</span>
          </div>
          <div class="ent-keyrow">
            <span class="ent-keylabel">分区列：</span>
            <a-select
              v-model:value="entActive.partition_column"
              size="small"
              allow-clear
              class="ent-partselect"
              :options="fieldOptions(entActive)"
              placeholder="无"
              @change="invalidateEntCert"
            />
            <span class="ent-basis">{{ keyInfoOf(entActive)?.partition_basis || '未自动识别，可手动指定' }}</span>
          </div>
          <div class="ent-keyrow">
            <span class="ent-keylabel">列表约束：</span>
            <a-switch
              v-model:checked="entActive.listable"
              size="small"
              checked-children="可列表"
              un-checked-children="禁列表"
              @change="saveListConstraint"
            />
            <span class="ent-basis">禁列表后问数拒绝该表明细查询（超大日志/敏感主数据表用，缺省可列表）</span>
          </div>
          <div
            v-if="entActive.listable !== false"
            class="ent-keyrow"
          >
            <span class="ent-keylabel">时间窗字段：</span>
            <a-select
              v-model:value="entActive.time_field"
              size="small"
              allow-clear
              class="ent-partselect"
              :options="fieldOptions(entActive)"
              placeholder="无"
              @change="saveListConstraint"
            />
            <span class="ent-basis">配了后 list 查询必须携带该字段时间窗（防超大表全量扫）</span>
          </div>
          <div
            v-if="entActive.listable !== false"
            class="ent-keyrow"
          >
            <span class="ent-keylabel">缺省输出列：</span>
            <a-select
              v-model:value="entActive.display_fields"
              mode="multiple"
              size="small"
              class="ent-keyselect"
              :options="fieldOptions(entActive)"
              placeholder="不指定则明细查询需显式报列名"
              @change="saveListConstraint"
            />
            <span class="ent-basis">list 查询未指定输出列时的缺省 SELECT 列</span>
          </div>
          <div
            v-if="indexSummary(entActive)"
            class="ent-indexes"
          >
            参考索引：{{ indexSummary(entActive) }}
          </div>
          <div class="ent-rules">
            <a @click="rulesOpen = !rulesOpen">
              <span class="ent-rules-caret">{{ rulesOpen ? '▾' : '▸' }}</span>
              {{ rulesOpen ? '收起角色说明与判定规则' : '角色说明与判定规则（何时选维度、何时选度量）' }}
            </a>
            <template v-if="rulesOpen">
              <p class="ent-rolelegend">
                角色说明：忽略=不参与问数的技术列（AI 看不到）；维度=分组/筛选用的业务属性（地区/状态/时间，可顺手选归类）；度量=聚合计算的数值（金额/数量，务必填单位）；名称=该表实体的代表名列（如项目表的项目名称，每表一般只有一个，用于输出展示与检索，不参与分组）
              </p>
              <ul>
                <li><b>维度 vs 度量</b>：维度回答“怎么看”（GROUP BY/WHERE 的切面：地区/状态/年份）；度量回答“算多少”（SUM/COUNT 的对象：金额/数量）。判别：拿来做求和/均值有意义的列是度量，只能等值筛选或分组的列是维度</li>
                <li><b>时间分区列是维度</b>：dy/dm/dd 存的是年/月/日值（如 2025），后端已预选为维度并钉死粒度（年/月/日），不要改成忽略或度量；查“2025 年”即 dy=2025 过滤</li>
                <li><b>快照表业务键</b>：快照表一行数据的唯一身份是“分区列+业务主体列”（如 dy+project_code），业务键须两个都选，否则不带年份查列表会按年重复出行；选择顺序把业务主体列放第一（表画像探测只取第一列去重计数，dy 放第一会让统计无意义）</li>
                <li><b>时间粒度</b>：给时间维度声明“以什么尺度看”（年/月/日）。日期列（Date）选“年”后引擎自动包 YEAR() 翻译“按年看”；dy 类存年份值的列粒度预选“年”，列值直用不包函数</li>
                <li><b>年份口径</b>：问数要“按年分组/近五年”时优先复用已有年份粒度维度（名称常以 _year 结尾），无需新建</li>
                <li><b>名称列</b>：表实体的代表名（如项目表的项目名称）选“名称”——用于输出展示与等值/模糊检索，不建维度不分组，每表一般只有一个；注意区分：引用编码的配套名（如部门编码配的部门名称）不是本表名称，维持编码侧维度即可</li>
                <li><b>编码列</b>：编码↔名称配套列（X_code/X_no，或无后缀裸词干 X 配 X_name/X_label）：编码侧建维度（挂码值域自动翻译），名称侧自动忽略（不重复建维度）</li>
              </ul>
            </template>
          </div>
          <a-table
            :columns="entFieldColumns"
            :data-source="entActive.fields || []"
            row-key="name"
            size="small"
            bordered
            :row-class-name="entRowClass"
            :pagination="false"
            :scroll="{ y: 420 }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === '__col'">
                <span class="ent-colname">{{ record.name }}</span>
                <span class="ent-coltype">{{ record.type }}</span>
              </template>
              <!-- 显示名人工可修正：落字段 display_name（维度显示名派生单源），改后打 edited 防重建覆盖 -->
              <template v-else-if="column.key === '__disp'">
                <a-input
                  v-model:value="record.display_name"
                  size="small"
                  placeholder="（沿用列备注）"
                  @change="markFieldEdited(record)"
                />
              </template>
              <template v-else-if="column.key === '__role'">
                <a-select
                  :value="record.role === 'dimension' && record.multi_value ? 'multi_dimension' : record.role"
                  size="small"
                  class="ent-role"
                  :options="ROLE_OPTIONS"
                  @change="(v: any) => onRoleChange(record, v)"
                />
              </template>
              <template v-else-if="column.key === '__unit'">
                <a-input
                  v-model:value="record.unit"
                  size="small"
                  :disabled="record.role !== 'metric'"
                  placeholder="元/万元/%/个…"
                  @change="markFieldEdited(record)"
                />
              </template>
              <template v-else-if="column.key === '__gran'">
                <a-select
                  v-model:value="record.granularity"
                  size="small"
                  allow-clear
                  class="ent-gran"
                  :disabled="!isTimeCol(record)"
                  :options="GRAN_OPTIONS"
                  placeholder="—"
                  @change="markFieldEdited(record)"
                />
              </template>
              <template v-else-if="column.key === '__group'">
                <a-select
                  v-model:value="record.dim_group"
                  size="small"
                  allow-clear
                  class="ent-dimgroup"
                  :disabled="record.role !== 'dimension'"
                  :options="groupOptions"
                  placeholder="选分组"
                  @change="markFieldEdited(record)"
                />
              </template>
              <!-- 禁用列：不参与 LLM 输入（提示词剔除）且不派生维度；勾后走 edited 防重建覆盖 -->
              <template v-else-if="column.key === '__disabled'">
                <a-checkbox
                  v-model:checked="record.disabled"
                  title="禁用列：不参与 AI 生成/评审输入，也不派生维度（问数不可见）"
                  @change="markFieldEdited(record)"
                />
              </template>
            </template>
          </a-table>
        </div>
      </div>
    </div>
    <asset-editor
      v-else
      :asset-type="assetTab"
      :content="assetContent"
      :asset-options="siblingOptions"
      :ai-complete="aiCompleter"
      :groups="editorGroups"
      :row-group="editorRowGroup"
      :group-default="editorGroupDefault"
      @save="saveAsset"
    />
    <!-- 业务概念 tab：维度分组目录面板（hierarchy 只读派生视图）——归类单源：dim_group 存实体字段，
         实体保存时后端从实体派生目录（编辑入口在实体确认页「归类」列）；此处仅展示不编辑 -->
    <div
      v-if="assetTab === 'concepts'"
      class="hierarchy-panel"
    >
      <div class="hierarchy-head">
        <span class="hierarchy-title">维度分组目录（hierarchy）</span>
        <span class="hierarchy-tip">派生视图：归类在实体确认页「归类（维度）」列维护，保存实体时自动派生本目录；某指标支持维度过多时问数目录按分组两级导航</span>
      </div>
      <div
        v-for="(g, i) in hierarchyRows"
        :key="i"
        class="hierarchy-row"
      >
        <span class="hierarchy-name">{{ g.name }}</span>
        <span class="hierarchy-members">{{ g.members.join('、') || '（空）' }}</span>
      </div>
      <div
        v-if="hierarchyRows.length === 0"
        class="hierarchy-empty"
      >
        暂无分组：请到实体确认页为维度列选「归类」，保存实体后自动派生目录（未入组维度问数时归「其他」桶）
      </div>
    </div>
    <!-- 进度抽屉口径（两类型外壳不合并，共用同一阶段语言）：
         自主会话（AI 自主型）→ AgentChat；确定 flow / 单资产重生成 → AgentStages；
         两侧阶段数据均归一为 AgentStageItem（flowAdapter/会话 status 映射） -->
    <!-- 自主模式会话抽屉：AgentChat（阶段条边执行边跳动 + 思考过程/暂停补语/停止 + 结论评价）
         后端 /admin/generate(mode=autonomous) 返回 sessionId，过程事件流 2s 轮询 -->
    <a-drawer
      :open="autonomousOpen"
      title="AI 自主生成（会话）"
      width="720"
      placement="right"
      :mask-closable="false"
      :body-style="{ padding: '0', display: 'flex', flexDirection: 'column' }"
      @close="onAutonomousClose"
    >
      <div class="autonomous-chat-wrap">
        <AgentChat
          v-if="autonomousOpen && autonomousSessionId"
          :session-id="autonomousSessionId"
          title="AI 自主生成"
          @finished="onGenerateDone"
          @restart="generate('autonomous')"
          @confirmation-revised="onConfirmationRevised"
        />
      </div>
    </a-drawer>
    <!-- AI 评审会话抽屉（与自主生成同模式）：只读复核实体认证结论，报告由 submit_review 工具落盘；
         后端无写工具注册，评审不改配置；终态后拉评审报告逐条消化 -->
    <a-drawer
      :open="reviewOpen"
      title="AI 评审（会话）"
      width="720"
      placement="right"
      :mask-closable="false"
      :body-style="{ padding: '0', display: 'flex', flexDirection: 'column' }"
      @close="onReviewClose"
    >
      <div class="autonomous-chat-wrap">
        <AgentChat
          v-if="reviewOpen && reviewSessionId"
          :session-id="reviewSessionId"
          title="AI 评审"
          @finished="onReviewDone"
          @restart="startReview"
        />
      </div>
    </a-drawer>
    <!-- 评审报告面板：逐条 ✅合理 / ⚠️值得商榷（疑点/证据/建议口径）；
         商榷项「去修正」跳实体确认 tab 定位对应表（改动后认证自动失效→重认证→重沉淀） -->
    <a-drawer
      v-model:open="reviewReportOpen"
      title="AI 评审报告（只读）"
      width="640"
      placement="right"
    >
      <template v-if="reviewReport">
        <div class="review-summary">
          评审于 {{ reviewReport.reviewed_at }} · 共 {{ reviewReport.total }} 条 ·
          <span :class="openQuestionable > 0 ? 'review-warn-text' : ''">待处理商榷 {{ openQuestionable }} 条</span>
          · 已处理 {{ resolvedCount }} 条
          <a-radio-group
            v-model:value="reviewFilter"
            size="small"
            button-style="solid"
            class="review-filter"
          >
            <a-radio-button value="all">
              全部
            </a-radio-button>
            <a-radio-button value="open">
              待处理商榷
            </a-radio-button>
            <a-radio-button value="done">
              已处理
            </a-radio-button>
          </a-radio-group>
        </div>
        <div class="review-summary-tip">
          商榷项请逐条「去修正」→ 改后重认证再重新沉淀模板 → 回报告点「标记已处理」消除待办
        </div>
        <div
          v-for="item in filteredReviewItems"
          :key="item.__idx"
          class="review-item"
          :class="{ warn: item.verdict === 'questionable' && !item.resolved, done: item.resolved }"
        >
          <div class="review-item-head">
            <a-tag :color="item.verdict === 'questionable' ? 'warning' : 'success'">
              {{ item.verdict === 'questionable' ? '值得商榷' : '合理' }}
            </a-tag>
            <a-tag
              v-if="item.resolved"
              color="green"
            >
              已处理
            </a-tag>
            <span class="review-item-table">{{ item.table }}</span>
            <a-tag
              v-if="item.column"
              color="orange"
            >
              {{ item.column }}
            </a-tag>
            <a-button
              v-if="item.verdict === 'questionable' && !item.resolved"
              type="link"
              size="small"
              @click="gotoEntityForReview(item)"
            >
              去修正
            </a-button>
            <a-button
              v-if="item.verdict === 'questionable'"
              type="link"
              size="small"
              @click="toggleResolved(item)"
            >
              {{ item.resolved ? '撤销标记' : '标记已处理' }}
            </a-button>
          </div>
          <div
            v-if="item.issue"
            class="review-item-line"
          >
            疑点：{{ item.issue }}
          </div>
          <div
            v-if="item.evidence"
            class="review-item-line"
          >
            证据：{{ item.evidence }}
          </div>
          <div
            v-if="item.suggestion"
            class="review-item-line"
          >
            建议：{{ item.suggestion }}
          </div>
        </div>
      </template>
      <a-empty
        v-else
        description="暂无评审报告：点实体区「AI 评审」发起只读评审"
      />
    </a-drawer>
    <!-- pipeline/skeleton 流程节点阶段抽屉：AgentStages（flow trace 节点状态 2s 轮询，
         预估剩余/实耗随节点 config estimatedSecs；停止走页头「停止生成」同一链路） -->
    <a-drawer
      v-model:open="flowStagesOpen"
      title="生成进度（流程节点）"
      width="460"
      placement="right"
    >
      <a-empty
        v-if="flowStages.length === 0"
        description="正在启动生成链路…"
      />
      <template v-else>
        <AgentStages
          :stages="flowStages"
          :logs="flowLogs"
          show-stop
          :stopping="stopping"
          @stop="stopGenerate"
        />
        <a-alert
          v-if="flowTraceTerminal"
          class="flow-done-tip"
          type="success"
          show-icon
          message="生成已收口：草稿已落盘，可关闭抽屉查看与编辑"
        />
      </template>
    </a-drawer>
    <!-- 单资产重生成进度抽屉：AgentStages 单段 + 过程日志（替代 AsyncProcess 弹窗；与全体生成共用同一进度键，
         重生成不经 flow 引擎无轨迹，阶段由进度记录映射；停止走页头「停止生成」同一链路） -->
    <a-drawer
      v-model:open="regenStagesOpen"
      :title="`AI 重生成（${regenAssetLabel}）`"
      width="460"
      placement="right"
    >
      <AgentStages
        :stages="regenStages"
        :logs="regenLogs"
        show-stop
        :stopping="stopping"
        @stop="stopGenerate"
      />
      <a-alert
        v-if="regenTerminal === 'success'"
        class="flow-done-tip"
        type="success"
        show-icon
        message="重生成已收口：草稿已更新，可关闭抽屉查看与编辑"
      />
      <a-alert
        v-else-if="regenTerminal === 'failed'"
        class="flow-done-tip"
        type="error"
        show-icon
        message="重生成失败"
        :description="regenFailText"
      />
      <a-alert
        v-else-if="regenTerminal === 'stopped'"
        class="flow-done-tip"
        type="warning"
        show-icon
        message="重生成已停止：已完成部分保留在草稿，可再次发起"
      />
    </a-drawer>
    <!-- 单资产 AI 重生成弹窗：指导语可空，确认覆盖该类草稿 -->
    <a-modal
      v-model:open="regenVisible"
      title="AI 重生成（覆盖当前草稿）"
      :confirm-loading="regenLoading"
      @ok="confirmRegen"
    >
      <p class="regen-tip">
        将以骨架 + 现有草稿为上下文重新生成「{{ assetLabel }}」；指导语可空，填写后优先遵循。
      </p>
      <a-textarea
        v-model:value="regenGuidance"
        placeholder="如：指标侧重合同额/到款口径；只保留项目维度的关系；敏感字段补充手机号列…"
        :auto-size="{ minRows: 4, maxRows: 8 }"
      />
    </a-modal>
    <!-- 进场引导弹框：敏感治理未就绪时进页即弹，说明新配置顺序（实体先行→红线） -->
    <a-modal
      v-model:open="guideVisible"
      title="敏感治理未就绪"
      ok-text="知道了"
      :cancel-text="null"
      :closable="false"
      :mask-closable="false"
      @ok="guideVisible = false"
    >
      <p>
        检测到 {{ entityList.length - coveredCount }} / {{ entityList.length }} 张表尚未声明敏感字段。
      </p>
      <p class="guide-text">
        配置顺序：先在「实体」tab 完成列配置确认（维度/码值域随实体确定性生成），再到「敏感字段」逐表声明
        （每张表选择「标记敏感字段」可配替换列，或确认「该表无敏感字段」）。
        全部表声明完成前，AI 生成（业务概念/关系/指标）与问数对话不可用。
      </p>
    </a-modal>
    <!-- 单表敏感声明弹窗：二选一（标记敏感列 / 声明无敏感）；左侧全字段勾选，右侧逐列选替换字段 -->
    <a-modal
      v-model:open="govVisible"
      :title="govTitle"
      :width="1200"
      :confirm-loading="govSaving"
      @ok="saveGovern"
    >
      <a-radio-group
        v-model:value="govMode"
        class="gov-mode"
      >
        <a-radio value="sensitive">
          该表包含敏感字段
        </a-radio>
        <a-radio value="none">
          该表无敏感字段（明确声明）
        </a-radio>
      </a-radio-group>
      <template v-if="govMode === 'sensitive'">
        <div class="gov-split">
          <div class="gov-split-left">
            <p class="gov-split-title">
              表字段（勾选敏感字段）
            </p>
            <div class="gov-field-list">
              <a-checkbox
                v-for="opt in govFieldOptions"
                :key="opt.value"
                :checked="govCheckedKeys.includes(opt.value)"
                class="gov-field-item"
                @change="(e: any) => toggleGovField(opt.value, e.target.checked)"
              >
                {{ opt.label }}
              </a-checkbox>
            </div>
          </div>
          <div class="gov-split-right">
            <p class="gov-split-title">
              替换字段（可不填，支持筛选）
            </p>
            <p
              v-if="!govCheckedKeys.length"
              class="gov-empty"
            >
              先在左侧勾选敏感字段
            </p>
            <div
              v-for="name in govCheckedKeys"
              :key="name"
              class="gov-row"
            >
              <span
                class="gov-row-label"
                :title="name"
              >{{ name }}</span>
              <a-select
                v-model:value="govReplace[name]"
                :options="replaceOptionsFor(name)"
                show-search
                allow-clear
                :filter-option="filterOpt"
                placeholder="替换字段"
                class="gov-row-select"
              />
            </div>
          </div>
        </div>
        <p class="gov-tip">
          替换字段：条件查询时以该列代替敏感列参与过滤/输出（参照 chat bi 配对替换列）；不填则仅做值域保护。
        </p>
      </template>
      <p
        v-else
        class="gov-tip"
      >
        声明后该表视为已处理；如后续发现敏感列可随时改回「包含敏感字段」。
      </p>
    </a-modal>
    <!-- LLM 提示词调优抽屉：每个提示词独立 tab，保存即生效（存 llm-prompts 草稿），免去改后端重启 -->
    <a-drawer
      v-model:open="promptsVisible"
      title="LLM 提示词调优（保存即生效，无需重启）"
      width="800"
      placement="right"
    >
      <p class="prompts-tip">
        占位符由后端生成时实时替换；人工指导语在「AI 重生成」弹窗输入，无需写入模板；
        骨架三类（实体/维度/码值域）为确定性生成，无提示词；未保存过时显示内置默认。
      </p>
      <a-tabs
        v-model:active-key="promptTab"
        size="small"
        class="prompts-tabs"
      >
        <a-tab-pane
          v-for="p in PROMPT_TABS"
          :key="p.key"
          :tab="p.label"
        >
          <p class="prompts-tip">
            {{ p.tip }}
          </p>
          <a-textarea
            v-model:value="promptValues[p.key]"
            :auto-size="{ minRows: 16, maxRows: 26 }"
          />
        </a-tab-pane>
      </a-tabs>
      <template #footer>
        <div class="prompts-footer">
          <a-button
            @click="loadDefaultPrompts"
          >
            恢复默认
          </a-button>
          <a-button
            type="primary"
            :loading="promptsSaving"
            @click="savePrompts"
          >
            保存
          </a-button>
        </div>
      </template>
    </a-drawer>
  </div>
</template>

<script lang="ts" setup>
import { message, Modal, notification } from 'ant-design-vue'
import JSZip from 'jszip'
import { Ref } from 'vue'
import { useRouter } from 'vue-router'

import AssetEditor from './AssetEditor.vue'
import { PROMPT_TABS } from './promptDefaults'

import { getFlowDetail, getFlowTraces, sessionActive, sessionStart } from '@/framework/apis/agent'
import {
  aiCompleteAgentAssetStream,
  detectAgentConflicts,
  generateAgentAssets,
  generateAgentProgress,
  generateAgentStop,
  getAgentAsset,
  getAgentPrompts,
  getDefaultPrompts,
  getGovernEntities,
  getGovernKeys,
  getReviewReport,
  importAgentAssets,
  importAgentTemplates,
  listAgentTemplates,
  regenAgentAsset,
  resolveAgentConflict,
  resolveReviewItem,
  saveAgentAsset,
  saveAgentPrompts,
  saveAgentTemplates
} from '@/framework/apis/smartAgent'
import AgentChat from '@/framework/components/common/agentChat/index.vue'
import type { AgentConfirmationT } from '@/framework/components/common/agentChat/types'
import { flowTraceToStages, type AgentStageItem } from '@/framework/components/common/agentStages/flowAdapter'
import type { FlowGraphLike, FlowTraceLike } from '@/framework/components/common/agentStages/flowAdapter'
import AgentStages from '@/framework/components/common/agentStages/index.vue'
import { downloadBlob } from '@/framework/network/request'
import { dictStore } from '@/framework/store/common'

// 资产编辑步骤：七类资产 tab 编辑（AssetEditor 承载表单/JSON 双模式）
const props = defineProps<{
  agentCode: string
}>()

const { currentRoute } = useRouter()
const baseDomain = currentRoute.value.query
  ? currentRoute.value.query.domain ? '/' + currentRoute.value.query.domain : undefined
  : undefined

// 默认落首组（新序：实体先行——先确认列配置，再走敏感/行权限红线闸；闸门只锁 AI 三类）
const assetTab = ref('entities')
const assetContent = ref('')

// AI 补全能力注入：仅有专属提示词模板的语义三类（指标/关系/概念）提供，其余 tab 不显示按钮；
// 走 SSE 流式（onEvent 收 tick 心跳/delta 增量转给弹窗做活性展示），补全结果由用户检查确认后
// 经「保存草稿」盖章认证（stampManualCertified），LLM 重生不覆盖
const aiCompleter = computed<((form: any, guidance: string, onEvent?: (event: string, text: string) => void) => Promise<any>) | undefined>(() => {
  if (!['metrics', 'relations', 'concepts'].includes(assetTab.value)) return undefined
  return (form: any, guidance: string, onEvent?: (event: string, text: string) => void) =>
    aiCompleteAgentAssetStream(
      { agentCode: props.agentCode, assetType: assetTab.value, form, guidance }, onEvent, baseDomain)
})

// 资产 tab 分组（顺序即配置顺序：事实层先行 → 红线人工闸 → AI 语义产出；标签样式区分口径）：
// - skeleton：骨架三类，确定性生成（实体列配置是第一步，维度/码值域随实体派生）；
//   已认证项重建不覆盖；人工填的不默认算认证，须逐条点认证，认证的才进模板
// - manual：纯手动红线（敏感字段逐表人工声明，不走 LLM；行权限同属人工治理，LLM 仅可提案待审）
// - semantic：语义三类，需人工认证；LLM 重生覆盖未认证项（认证项保留，见后端 mergeLlmDraftWithCertified）
const assetGroups = [
  {
    tone: 'skeleton',
    tag: '认证保留',
    types: [
      { key: 'entities', label: '实体' },
      { key: 'dimensions', label: '维度' },
      { key: 'value-domains', label: '码值域' }
    ]
  },
  {
    tone: 'manual',
    tag: '红线',
    types: [
      { key: 'sensitive-fields', label: '敏感字段' },
      { key: 'row-policies', label: '行权限' }
    ]
  },
  {
    tone: 'semantic',
    tag: '未认证覆盖',
    types: [
      { key: 'concepts', label: '业务概念' },
      { key: 'relations', label: '关系' },
      { key: 'metrics', label: '指标' }
    ]
  }
]

// 平铺视图（资产包下载/导入校验与重生成弹窗标签用）
const assetTypes = assetGroups.flatMap(g => g.types)

// tabs 渲染序列（扁平化：组信息携在每组首个 pane 上，避免嵌套 fragment 影响 antd 收集 pane）
const assetPanes = assetGroups.flatMap(g =>
  g.types.map((t, i) => ({ ...t, tone: g.tone, tag: g.tag, groupFirst: i === 0 }))
)

const loadAsset = (key?: string) => {
  const assetType = (key || assetTab.value) as string
  assetContent.value = ''
  getAgentAsset({ agentCode: props.agentCode, assetType }, baseDomain).then((res: any) => {
    // payload 或其 content 字段缺失都回落空串，避免 undefined 传入 AssetEditor 必填 prop 告警
    assetContent.value = res.payload?.content || ''
    if (assetType === 'concepts') parseHierarchy(assetContent.value)
    if (assetType === 'entities') {
      parseEntDrafts(assetContent.value)
      loadKeyInfos()
      loadGroupOptions()
      loadConflicts()
    }
  })
  // 维度/码值域按表主从布局需要实体目录：未加载过时顺带拉取（与兄弟选项预载同理）
  if ((assetType === 'dimensions' || assetType === 'value-domains') && entDrafts.value.length === 0) {
    getAgentAsset({ agentCode: props.agentCode, assetType: 'entities' }, baseDomain).then((res: any) => {
      parseEntDrafts(res.payload?.content || '')
    })
  }
  loadSiblingOptions(assetType)
}

// 维度/码值域按表主从布局（与实体确认页同构）：分组源=实体草稿；
// 维度按 expression 前两段（db.tbl）归属，码值域按 entity 归属；未匹配行编辑器内落「其他」组可编辑不丢数据
const editorGroups = computed(() => {
  if (assetTab.value === 'dimensions') {
    return entDrafts.value
      .filter((e: any) => e.table)
      .map((e: any) => ({ key: e.table, label: e.display_name || e.name, sub: e.table }))
  }
  if (assetTab.value === 'value-domains') {
    return entDrafts.value.map((e: any) => ({ key: e.name, label: e.display_name || e.name, sub: e.table }))
  }
  return []
})

const editorRowGroup = computed<((row: any) => string) | undefined>(() => {
  if (assetTab.value === 'dimensions') {
    return (row: any) => {
      const parts = String(row.expression || '').split('.')
      return parts.length >= 2 ? parts.slice(0, 2).join('.') : ''
    }
  }
  if (assetTab.value === 'value-domains') {
    return (row: any) => row.entity || ''
  }
  return undefined
})

// 分组模式新增行预填归属字段：维度补 expression=当前表.（用户续填列名），码值域补 entity=当前实体
const editorGroupDefault = computed<((g: string) => Record<string, any>) | undefined>(() => {
  if (assetTab.value === 'dimensions') {
    return (g: string) => ({ expression: g + '.' })
  }
  if (assetTab.value === 'value-domains') {
    return (g: string) => ({ entity: g })
  }
  return undefined
})

// ---------------- 维度分组目录（concepts tab：hierarchy 只读派生视图） ----------------
// 归类单源：dim_group 存实体字段，实体保存时后端从实体派生 hierarchy；编辑入口在实体确认页「归类」列，
// 此处仅展示派生结果（加组/点选/应用等编辑能力已移除，避免旁路第二份真源）
const hierarchyRows = ref<Array<{ name: string; members: string[] }>>([])

const parseHierarchy = (content: string) => {
  try {
    const root = JSON.parse(content && content.trim() ? content : '{}')
    hierarchyRows.value = (Array.isArray(root.hierarchy) ? root.hierarchy : [])
      .filter((g: any) => g && g.name)
      .map((g: any) => ({ name: String(g.name), members: Array.isArray(g.members) ? g.members.map(String) : [] }))
  } catch {
    hierarchyRows.value = []
  }
}

// ---------------- 兄弟资产选项预载（assetSelect 编辑器：指标的支持维度取 dimensions 草稿） ----------------
const siblingOptions = ref<Record<string, Array<{ label: string; value: string }>>>({})

const loadSiblingOptions = (tab: string) => {
  siblingOptions.value = {}
  // 仅指标需要维度选项（支持维度下拉）；concepts 目录面板已改只读派生视图不再点选维度
  if (tab !== 'metrics') return
  getAgentAsset({ agentCode: props.agentCode, assetType: 'dimensions' }, baseDomain).then((res: any) => {
    try {
      const dims = JSON.parse(res.payload?.content || '[]')
      siblingOptions.value = {
        dimensions: (Array.isArray(dims) ? dims : [])
          .filter((d: any) => d && d.name)
          .map((d: any) => ({
            label: d.display_name ? `${d.name}（${d.display_name}）` : d.name,
            value: d.name
          }))
      }
    } catch {
      siblingOptions.value = {}
    }
  })
}

const saveAsset = (content: string) => {
  saveAgentAsset({
    agentCode: props.agentCode,
    assetType: assetTab.value,
    content
  }, baseDomain)
  // entities 保存后追问是否同步模板库（显式沉淀防特化配置污染，见 promptTemplateUpdate）
  if (assetTab.value === 'entities') promptTemplateUpdate()
}

// ---------------- 实体列配置确认（entities tab：每列角色/单位/粒度 + 键/分区采信） ----------------
// 数据契约：entities 草稿数组（骨架前置：选表保存即构建），列带 role 预选（unit/granularity 待人工），
// 实体带 primary_key（PRI/UNI 补采）与 partition_column 预选；键/分区预选行源 /govern/keys（索引实时读不存）；
// 确认后实体挂 confirmed，骨架重建/生成落盘不再覆盖（后端合并语义同认证）
const entDrafts = ref<Array<any>>([])
// 实体确认页「判定规则」折叠区：默认收起不占版面，点开看维度/度量/粒度判定口径
const rulesOpen = ref(false)
// 主从布局选中态：左侧目录当前表；默认落在首个待确认表（全确认时落首表），确认保存后自动跳下一个待确认表
const entActiveKey = ref('')
const entActive = computed(() => entDrafts.value.find((e: any) => e.name === entActiveKey.value))
const keyInfos = ref<Array<any>>([])

const ROLE_OPTIONS = [
  { label: '忽略', value: 'ignore' },
  { label: '维度', value: 'dimension' },
  // 多值维度：逗号分隔 code 串（如 business_types="A,B"），问数等值过滤引擎改写 FIND_IN_SET 包含匹配；
  // 数据契约不变：role 仍为 dimension，仅多携 multi_value 标记（后端派生与提示词口径同）
  { label: '多值维度', value: 'multi_dimension' },
  { label: '度量', value: 'metric' },
  { label: '名称', value: 'name' }
]

// 角色变更：多值维度是 dimension+multi_value 的复合展示选项，落库仍拆开存；
// 离开维度类角色时清掉多值标记（防残留）
const onRoleChange = (record: any, v: any) => {
  if (v === 'multi_dimension') {
    record.role = 'dimension'
    record.multi_value = true
  } else {
    record.role = v
    if (v !== 'dimension') record.multi_value = null
  }
  markFieldEdited(record)
}
const GRAN_OPTIONS = [
  { label: '年', value: 'year' },
  { label: '季', value: 'quarter' },
  { label: '月', value: 'month' },
  { label: '日', value: 'day' }
]

// 时间列判定：Date 类型 或数仓时间分区命名（dy=年/dm=月/dd=日，后端已预选粒度）——解锁粒度选择
const isTimeCol = (record: any) => record?.type === 'Date'
  || /(^|_)(dy|dm|dd)$/i.test(record?.name || '')

// 归类候选组名：系统字典 DIMENSION_GROUP_DICT（DimensionGroupDict 枚举 @MetaDict 自动注册）为主源，
// 补充并入 hierarchy 存量组名（防存量归类不在字典时下拉显示裸值）；严格下拉防组名写飞，
// 新增标准大类只改后端枚举一处，前端自动生效（目录面板已只读，不再承接新建组）
const groupNames = ref<Array<string>>([])
const groupOptions = computed(() => groupNames.value.map(n => ({ label: n, value: n })))

const loadGroupOptions = () => {
  const dictP = dictStore().getDict('DIMENSION_GROUP_DICT', baseDomain)
    .then((items: any) => (items || []).map((d: any) => String(d?.value)).filter(Boolean))
    .catch(() => [] as string[])
  const hierarchyP = getAgentAsset({ agentCode: props.agentCode, assetType: 'concepts' }, baseDomain)
    .then((cRes: any) => {
      const root = JSON.parse(cRes.payload?.content || '{}')
      return (Array.isArray(root.hierarchy) ? root.hierarchy : [])
        .map((g: any) => g?.name).filter(Boolean).map(String)
    })
    .catch(() => [] as string[])
  Promise.all([dictP, hierarchyP]).then(([dictNames, hierarchyNames]) => {
    groupNames.value = [...dictNames, ...hierarchyNames.filter(n => !dictNames.includes(n))]
  })
}

const parseEntDrafts = (content: string) => {
  try {
    const arr = JSON.parse(content && content.trim() ? content : '[]')
    entDrafts.value = Array.isArray(arr) ? arr : []
  } catch {
    entDrafts.value = []
  }
  // 默认落在首个待确认表（懒人路径也先看到要做的事）
  const first = entDrafts.value.find((e: any) => !e.confirmed) || entDrafts.value[0]
  entActiveKey.value = first ? first.name : ''
}

// 键/分区预选（实时读索引）：失败不阻断列配置（依据列显示「无」）
const loadKeyInfos = () => getGovernKeys({ agentCode: props.agentCode }, baseDomain)
  .then((res: any) => { keyInfos.value = res.payload || [] })
  .catch(() => { keyInfos.value = [] })

const keyInfoOf = (ent: any) => keyInfos.value.find((k: any) => k.table === ent.table)

const indexSummary = (ent: any) => ((keyInfoOf(ent) as any)?.indexes || [])
  .map((i: any) => `${i.name}(${(i.columns || []).join(', ')})${i.unique ? ' 唯一' : ''}`)
  .join('；')

const fieldOptions = (ent: any) => (ent.fields || []).map((f: any) => ({ label: f.name, value: f.name }))

const entConfirmedCount = computed(() => entDrafts.value.filter((e: any) => e.confirmed).length)
const entAllConfirmed = computed(() =>
  entDrafts.value.length > 0 && entConfirmedCount.value === entDrafts.value.length)
const entCertifiedCount = computed(() => entDrafts.value.filter((e: any) => e.certified).length)

// 人工改过的列打 edited 标记（骨架重建时未人工编辑的字段才覆盖——字段级合并，见阶段四）；
// 同时使本表认证失效（改过的结论不算认证过的，需重新点认证）；
// 并撤销该列单位裁决经验（unit_verified）：旧经验不得盖住新结论，下次自查重新复核单位（评审商榷项修正后重审）
const markFieldEdited = (field: any) => {
  field.edited = true
  if (field.unit_verified) field.unit_verified = null
  invalidateEntCert()
}

// 键/分区/列表约束等表级配置改动同样使认证失效（不逐列走 markFieldEdited 的入口共用）
const invalidateEntCert = () => {
  if (entActive.value && entActive.value.certified) entActive.value.certified = false
}

const serializeEnts = () => JSON.stringify(entDrafts.value, null, 2)

const saveEntDrafts = (msg: string, onlyTables?: string[]) => {
  const content = serializeEnts()
  saveAgentAsset({
    agentCode: props.agentCode,
    assetType: 'entities',
    content
  }, baseDomain).then(() => {
    assetContent.value = content
    message.success(msg)
    promptTemplateUpdate(onlyTables)
  })
}

const confirmEntity = (ent: any) => {
  ent.confirmed = true
  saveEntDrafts(`已确认「${ent.display_name || ent.name}」列配置（还剩 ${entDrafts.value.length - entConfirmedCount.value} 张表）`)
  // 顺流而下：自动跳下一个待确认表，无则停留（逐表确认免手动点开）
  const idx = entDrafts.value.findIndex((e: any) => e.name === ent.name)
  const next = entDrafts.value.slice(idx + 1).find((e: any) => !e.confirmed)
    || entDrafts.value.find((e: any) => !e.confirmed)
  if (next) entActiveKey.value = next.name
}

// 认证本表：人工逐表显式认证（人工填的不默认算认证）；认证隐含确认，认证的才进模板；
// 后续模板同步只同步本表（不把其他已认证表一并推上模板库）
const certifyEntity = (ent: any) => {
  ent.confirmed = true
  ent.certified = true
  saveEntDrafts(`已认证「${ent.display_name || ent.name}」（认证的才可沉淀模板库）`, ent.table ? [ent.table] : undefined)
}

// ---------------- 配置自查疑点清单（确定性检测无 LLM，逐条裁决；裁决即经验，同表免再检） ----------------
const conflicts = ref<Array<any>>([])
const conflictBusy = ref(false)

const loadConflicts = () => {
  detectAgentConflicts({ agentCode: props.agentCode }, baseDomain).then((res: any) => {
    conflicts.value = Array.isArray(res.payload) ? res.payload : []
  }).catch(() => { conflicts.value = [] })
}

const conflictTagText = (t: string) =>
  t === 'unit_conflict' ? '单位矛盾' : t === 'unit_absent' ? '缺单位' : t === 'domain_missing' ? '缺码值' : t
const conflictTagColor = (t: string) =>
  t === 'unit_conflict' ? 'red' : t === 'unit_absent' ? 'orange' : 'gold'

// 逐条裁决：adopt 采纳建议（写配置）/ keep 维持原值；两者都固化经验标记，返回剩余疑点清单直接刷新；
// 单位类采纳目标即建议文案（注释单位）；缺码类 adopt 补登缺码/keep 记入忽略清单，随码值域草稿落盘
const resolveFinding = (f: any, action: string) => {
  conflictBusy.value = true
  const resolution: Record<string, any> = { type: f.type, entity: f.entity, field: f.field, action }
  if (f.domain_key) resolution.domain_key = f.domain_key
  if (f.type === 'domain_missing') resolution.codes = f.missing_codes || []
  else if (action === 'adopt') resolution.unit = f.suggestion
  resolveAgentConflict({ agentCode: props.agentCode, resolution }, baseDomain).then((res: any) => {
    conflicts.value = Array.isArray(res.payload) ? res.payload : []
    message.success(action === 'adopt' ? '已采纳建议写入配置（裁决已固化为经验）' : '已维持原值（裁决已固化为经验）')
    if (action === 'adopt') loadAsset()
  }).catch((e: any) => {
    message.error(e?.response?.data?.message || e?.message || '裁决失败')
  }).finally(() => { conflictBusy.value = false })
}

// 列表约束（listable/时间窗字段/缺省输出列）变更即存；
// 不走 saveEntDrafts 的模板追问，避免开关/下拉高频改动反复弹「要不要更新到模板」
const saveListConstraint = () => {
  invalidateEntCert()
  const content = serializeEnts()
  saveAgentAsset({
    agentCode: props.agentCode,
    assetType: 'entities',
    content
  }, baseDomain).then(() => {
    assetContent.value = content
    message.success('列表约束已保存')
  })
}

// 保存后追问：有已认证表时弹确认「要不要更新到模板」，点确定才沉淀（沉淀按认证口径，保存本身不自动沉淀）；
// onlyTables 非空时仅同步清单内表（认证本表场景：不把其他已认证表一并推上模板库）
const promptTemplateUpdate = (onlyTables?: string[]) => {
  if (!entCertifiedCount.value) return
  const scoped = !!onlyTables && onlyTables.length > 0
  Modal.confirm({
    title: '更新到模板',
    content: scoped
      ? `是否把本表的认证配置同步到模板库？同数据源同表的模板会被覆盖，` +
        `其他 Agent 从模板导入时将复用这份认证结论；若本 Agent 配置是特化的（与通用口径不同），请选不用。`
      : `当前有 ${entCertifiedCount.value} 张已认证表，是否把认证配置同步到模板库？` +
        '同数据源同表的模板会被覆盖，其他 Agent 从模板导入时将复用这份认证结论；' +
        '若本 Agent 配置是特化的（与通用口径不同），请选不用。',
    okText: '更新到模板',
    cancelText: '不用',
    onOk: () => saveToTemplate(onlyTables)
  })
}

// 保存到模板（显式沉淀）：当前草稿已认证表按 数据源+表 沉淀共享模板库（覆盖式）；
// onlyTables 非空时仅沉淀清单内表（认证本表按表同步）；
// 保存实体不自动沉淀，防本 Agent 特化配置污染共享模板；无已认证表提示不动作
const saveToTemplate = (onlyTables?: string[]) => {
  saveAgentTemplates({ agentCode: props.agentCode, tables: onlyTables }, baseDomain).then((res: any) => {
    const tables = Array.isArray(res.payload?.tables) ? res.payload.tables : []
    if (tables.length) {
      message.success(`已沉淀 ${tables.length} 张已认证表到模板库：${tables.join('、')}`)
    } else {
      message.warning('无可沉淀的已认证实体，请先逐表点「认证本表」')
    }
  })
}

// 从模板导入（显式套用）：先预览当前数据源模板清单，确认后套用到未确认表（已确认表不覆盖）
const importFromTemplate = () => {
  listAgentTemplates({ agentCode: props.agentCode }, baseDomain).then((res: any) => {
    const list = Array.isArray(res.payload) ? res.payload : []
    if (!list.length) {
      message.info('当前数据源暂无可复用的表模板')
      return
    }
    Modal.confirm({
      title: '从模板导入',
      content: `当前数据源有 ${list.length} 张表的确认模板（${list.map((t: any) => t.tableName).join('、')}），` +
        '将把人工结论套用到本 Agent 未确认的表上（已确认表不受影响）。继续？',
      onOk: () => importAgentTemplates({ agentCode: props.agentCode }, baseDomain).then((r: any) => {
        const applied = Array.isArray(r.payload?.tables) ? r.payload.tables : []
        if (applied.length) {
          message.success(`已套用模板：${applied.join('、')}`)
          loadAsset('entities')
        } else {
          message.info('无可套用模板（相关表均已确认或不在选表中）')
        }
      })
    })
  })
}

// 一键采用全部预选：未确认表直接采信预选键/分区并确认（懒人路径 10 秒放行）
const adoptAllPreselect = () => {
  for (const ent of entDrafts.value) {
    if (ent.confirmed) continue
    const info = keyInfoOf(ent) as any
    if (info?.pre_key?.length) ent.primary_key = [...info.pre_key]
    if (info?.partition) ent.partition_column = info.partition
    ent.confirmed = true
  }
  saveEntDrafts('已一键采用全部预选并确认')
}

// 实体列配置表格列
const entFieldColumns = [
  { title: '列名 / 类型', key: '__col', dataIndex: 'name', width: 200 },
  { title: '显示名', key: '__disp', dataIndex: 'display_name', width: 180 },
  { title: '角色', key: '__role', dataIndex: 'role', width: 110 },
  { title: '单位（度量）', key: '__unit', dataIndex: 'unit', width: 130 },
  { title: '时间粒度', key: '__gran', dataIndex: 'granularity', width: 110 },
  { title: '归类（维度）', key: '__group', dataIndex: 'dim_group', width: 140 },
  { title: '禁用', key: '__disabled', width: 70 }
]

// ---------------- 敏感字段逐表治理（新口径） ----------------
// 数据契约：sensitive-fields 草稿 { tables: [{ entity, no_sensitive, fields: [{field, replace_field?}] }] }；
// 治理行源 entityList 取自 /govern/entities（entities 草稿优先；无骨架时后端按选表派生 + 实时列元数据），
// 治理就绪 = 基线每张表都有声明（标记敏感列或声明无敏感），与后端 sensitiveGoverned 同口径；
// 旧形态（顶层 fields[] / 全局 no_sensitive）载入时自动归一为 tables 视图，保存即迁移
const entityList = ref<Array<any>>([])
const sensitiveTables = ref<Array<any>>([])
const legacySensitive = ref(false)

const normalizeTables = (list: any) =>
  (Array.isArray(list) ? list : [])
    .filter((t: any) => t && t.entity)
    .map((t: any) => ({
      entity: String(t.entity),
      no_sensitive: !!t.no_sensitive,
      fields: (Array.isArray(t.fields) ? t.fields : [])
        .filter((f: any) => f && f.field)
        .map((f: any) => ({ field: f.field, replace_field: f.replace_field || '' }))
    }))

const loadGovernance = () => Promise.all([
  // 行源换治理清单接口；失败（如数据源不可用）全局已 toast，这里回落空清单避免阻断
  getGovernEntities({ agentCode: props.agentCode }, baseDomain).catch(() => {
    entityList.value = []
    return { payload: [] }
  }),
  getAgentAsset({ agentCode: props.agentCode, assetType: 'sensitive-fields' }, baseDomain)
]).then(([eRes, sRes]: any[]) => {
  entityList.value = (Array.isArray(eRes.payload) ? eRes.payload : []).filter((e: any) => e && e.name)
  let root: any = {}
  try {
    root = JSON.parse(sRes.payload?.content || '{}')
  } catch {
    root = {}
  }
  if (Array.isArray(root.tables) && root.tables.length) {
    sensitiveTables.value = normalizeTables(root.tables)
    legacySensitive.value = false
    return
  }
  // 旧形态归一：顶层 fields[] 按实体分组；全局 no_sensitive 记为旧口径（保存时迁移）
  const grouped: Record<string, Array<any>> = {}
  ;(Array.isArray(root.fields) ? root.fields : []).forEach((f: any) => {
    if (!f || !f.entity || !f.field) return
    const key = String(f.entity)
    if (!grouped[key]) grouped[key] = []
    grouped[key].push({ field: f.field, replace_field: f.replace_field || '' })
  })
  sensitiveTables.value = Object.keys(grouped).map(entity =>
    ({ entity, no_sensitive: false, fields: grouped[entity] }))
  legacySensitive.value = sensitiveTables.value.length === 0 && !!root.no_sensitive
})

const findEntry = (entity: string) =>
  sensitiveTables.value.find(t => t.entity === entity)

// 单表状态：marked=已标敏感列；none=已声明无敏感；pending=待处理
const statusOf = (entity: string) => {
  const t = findEntry(entity)
  if (!t) return 'pending'
  if (t.fields.length) return 'marked'
  return t.no_sensitive ? 'none' : 'pending'
}

const coveredCount = computed(() =>
  entityList.value.filter(e => statusOf(e.name) !== 'pending').length)

// 与后端同口径：新形态逐表全覆盖；旧形态（未迁到 tables）沿用 fields 非空或全局确认
const governed = computed(() => {
  if (!entityList.value.length) return false
  if (!sensitiveTables.value.length) return legacySensitive.value
  return entityList.value.every(e => statusOf(e.name) !== 'pending')
})

// 未就绪锁定：只锁 AI 侧（语义三类 tab + 生成/发布类按钮），实体/红线等人工配置不拦——
// 闸门管 LLM，不管人工：未完成敏感声明前 AI 生成与问数不放行
const lockConfig = computed(() => !governed.value)

// 单表声明弹窗
const govVisible = ref(false)
const govSaving = ref(false)
const govEntity = ref<any>(null)
const govMode = ref<'sensitive' | 'none'>('sensitive')
// 左侧勾选的敏感字段（保持勾选顺序），右侧逐列配替换字段
const govCheckedKeys = ref<string[]>([])
const govReplace = ref<Record<string, any>>({})

const govTitle = computed(() => govEntity.value
  ? `敏感字段声明：${govEntity.value.display_name || govEntity.value.name}`
  : '')

// 候选字段：当前实体字段清单（字段名+显示名，可筛选）
const govFieldOptions = computed(() =>
  ((govEntity.value && govEntity.value.fields) || [])
    .filter((f: any) => f && f.name)
    .map((f: any) => ({
      label: f.display_name ? `${f.name}（${f.display_name}）` : f.name,
      value: f.name
    })))

const filterOpt = (input: string, option: any) =>
  String(option.label || '').toLowerCase().includes(input.toLowerCase())

// 勾选/取消敏感字段：取消时同步清掉其替换字段选择
const toggleGovField = (name: string, checked: boolean) => {
  if (checked) {
    if (!govCheckedKeys.value.includes(name)) {
      govCheckedKeys.value.push(name)
    }
    if (!(name in govReplace.value)) {
      govReplace.value[name] = undefined
    }
  } else {
    govCheckedKeys.value = govCheckedKeys.value.filter(k => k !== name)
    delete govReplace.value[name]
  }
}

// 替换字段候选：实体全部字段（排除自身，避免自替换）
const replaceOptionsFor = (name: string) =>
  govFieldOptions.value.filter((o: any) => o.value !== name)

const openGovern = (record: any) => {
  govEntity.value = record
  const entry = findEntry(record.name)
  if (entry && entry.fields.length) {
    govMode.value = 'sensitive'
    govCheckedKeys.value = entry.fields.map((f: any) => f.field)
    const rep: Record<string, any> = {}
    entry.fields.forEach((f: any) => { rep[f.field] = f.replace_field || undefined })
    govReplace.value = rep
  } else if (entry && entry.no_sensitive) {
    govMode.value = 'none'
    govCheckedKeys.value = []
    govReplace.value = {}
  } else {
    govMode.value = 'sensitive'
    govCheckedKeys.value = []
    govReplace.value = {}
  }
  govVisible.value = true
}

const saveGovern = () => {
  const entity = govEntity.value && govEntity.value.name
  if (!entity) return
  let fields: Array<any> = []
  if (govMode.value === 'sensitive') {
    fields = govCheckedKeys.value.map(name => ({ field: name, replace_field: govReplace.value[name] || '' }))
    if (!fields.length) {
      message.warning('请至少勾选一个敏感字段，或改选「该表无敏感字段」')
      return
    }
  }
  const entry = { entity, no_sensitive: govMode.value === 'none', fields }
  const tables = sensitiveTables.value.filter(t => t.entity !== entity)
  tables.push(entry)
  sensitiveTables.value = tables
  const content = JSON.stringify({ schema_version: '1.0', tables }, null, 2)
  govSaving.value = true
  saveAgentAsset({
    agentCode: props.agentCode,
    assetType: 'sensitive-fields',
    content
  }, baseDomain).then(() => loadGovernance()).then(() => {
    govVisible.value = false
    message.success(governed.value
      ? '全部表已声明：敏感治理就绪，其他配置已解锁'
      : `已保存「${entity}」声明，还剩 ${entityList.value.length - coveredCount.value} 张表待处理`)
  }).finally(() => govSaving.value = false)
}

// 治理表格列
const govColumns = [
  { title: '实体 / 表', key: '__entity', dataIndex: 'name', width: 260 },
  { title: '处理状态', key: '__status', dataIndex: '__status', width: 140 },
  { title: '敏感字段（→ 替换字段）', key: '__fields', dataIndex: '__fields' },
  { title: '操作', key: '__op', dataIndex: '__op', width: 80 }
]

// 进场引导弹框：未就绪进页即弹（仅首次加载触发，后续解锁不再打扰）
const guideVisible = ref(false)

// tab 切换：锁定期间只拦 AI 三类（禁用 pane 的双保险），实体/红线等人工配置 tab 自由通行
const onTabChange = (key: any) => {
  if (lockConfig.value && llmTypes.includes(String(key))) {
    message.warning('敏感治理未就绪：请先完成全部表的敏感字段声明')
    assetTab.value = 'sensitive-fields'
    return
  }
  loadAsset(String(key))
}

// ---------------- 下载资产包（供 skill 使用） ----------------
const downloadLoading = ref(false)

// 七类资产各取当前草稿，zip 内文件名与 classpath 资产文件名一致（entities.json 等），
// 解压后直接放进 skill 的 assets 目录即可加载
const downloadAssets = () => {
  downloadLoading.value = true
  Promise.all(assetTypes.map(t =>
    getAgentAsset({ agentCode: props.agentCode, assetType: t.key }, baseDomain)
      .then((res: any) => ({ key: t.key, content: res.payload ? res.payload.content : '' }))
  )).then((items: Array<{ key: string, content: string }>) => {
    const zip = new JSZip()
    items.forEach(item => {
      zip.file(item.key + '.json', item.content || '')
    })
    return zip.generateAsync({ type: 'blob' })
  }).then((blob: Blob) => {
    downloadBlob(blob, props.agentCode + '-assets.zip')
    message.success('资产包已下载，解压后放入 skill 的 assets 目录即可')
  }).finally(() => downloadLoading.value = false)
}

// ---------------- 上传资产包（skill 调试产物导入，上传即发布生效） ----------------
const uploadLoading = ref(false)
const fileInputRef: Ref<any> = ref()

const triggerUpload = () => fileInputRef.value?.click()

// zip 内文件名（去目录/去 .json 后缀）与七类资产名一致即识别；
// 部分上传也允许，未包含的资产类型保留系统原值
const handleUploadFile = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files && input.files[0]
  input.value = ''
  if (!file) return
  uploadLoading.value = true
  try {
    const zip = await JSZip.loadAsync(file)
    const known = new Set(assetTypes.map(t => t.key))
    const assets: Array<{ assetType: string, content: string }> = []
    const skipped: string[] = []
    for (const path of Object.keys(zip.files)) {
      const entry = zip.files[path]
      if (entry.dir) continue
      if (!path.toLowerCase().endsWith('.json')) {
        skipped.push(path)
        continue
      }
      const name = path.split('/').pop()!.replace(/\.json$/i, '')
      if (!known.has(name)) {
        skipped.push(path)
        continue
      }
      assets.push({ assetType: name, content: await entry.async('string') })
    }
    if (assets.length === 0) {
      message.error('zip 内未识别到资产文件（需为 entities.json 等七类资产名）')
      return
    }
    await importAgentAssets({ agentCode: props.agentCode, assets }, baseDomain)
    message.success(`已导入 ${assets.length} 类资产并发布生效`
      + (skipped.length ? `；忽略非资产文件 ${skipped.length} 个` : ''))
    loadAsset()
    loadGovernance()
  } catch (err: any) {
    message.error('资产包导入失败：' + (err?.message || err))
  } finally {
    uploadLoading.value = false
  }
}

onMounted(() => {
  loadAsset()
  refreshGenRunning()
  startRunStatePolling()
  loadGovernance().then(() => {
    if (!governed.value) {
      // 有表未声明才弹引导；未选表时横幅已说明去向，不再弹 0/0 空引导。
      // 不再强制跳敏感 tab：新序实体先行，引导弹窗说明顺序即可
      guideVisible.value = entityList.value.length > 0
    }
  })
  reconnectAutonomous()
  reconnectReview()
  loadReviewReport()
})

// ---------------- 自主生成会话重连（KEEP_RUNNING 策略：刷新/关页后台继续，回来可续看） ----------------
// 进页查本人活跃会话，命中本 agent 的自主生成则提示重连（按快照 subject 定向）；
// 新发起生成时关闭提示，避免新会话开抽屉后旧提示残留误导
const RECONNECT_NOTIFY_KEY = 'asset-gen-reconnect'
const reconnectAutonomous = () => {
  sessionActive('asset-gen-autonomous').then((res: any) => {
    const hit = ((res?.payload || []) as any[]).find(s => s.subject === props.agentCode)
    if (!hit || autonomousOpen.value) return
    notification.info({
      key: RECONNECT_NOTIFY_KEY,
      message: '检测到进行中的自主生成任务',
      description: '上次页面关闭后生成任务仍在后台执行，可重连继续查看进度。',
      duration: 8,
      btn: () => h('a-button', { type: 'primary', size: 'small', onClick: () => { notification.close(RECONNECT_NOTIFY_KEY); autonomousSessionId.value = hit.sessionId; autonomousOpen.value = true; autonomousTerminal.value = false; genRunning.value = true } }, '重连查看'),
    })
  }).catch(() => {})
}

// ---------------- 生成草稿（三种模式：autonomous→AgentChat 抽屉；pipeline/skeleton→流程节点阶段抽屉） ----------------
// 生成入口：mode = pipeline 固定流水线 / autonomous AI 自主 / skeleton 仅骨架。
// autonomous→agent 会话抽屉（思考过程/阶段条/暂停补语/停止）；pipeline/skeleton→流程节点阶段抽屉
const generate = (mode: string) => {
  const doGenerate = () => generateAgentAssets({ agentCode: props.agentCode, mode }, baseDomain).then((res: any) => {
    const sessionId = res?.payload?.sessionId
    if (mode === 'autonomous') {
      // 锁预检拒（有生成在途）：后端 code=0 但 payload=null，「正在生成中」提示已由请求层 details 弹出；
      // 此处若无 sessionId 直接返回，勿落入 else 误开流程节点抽屉（显示成在途流水线的进度）
      if (!sessionId) return
      notification.close(RECONNECT_NOTIFY_KEY)
      genRunning.value = true
      autonomousTerminal.value = false
      autonomousSessionId.value = sessionId
      autonomousOpen.value = true
    } else {
      genRunning.value = true
      openFlowStages()
    }
  })
  // 评审弱提醒（不阻断）：最新评审报告含未处理商榷项时提醒先处理，可选先看报告或继续生成；
  // 已标记处理的不再催；评审结论未经处理不自动失效，重新评审覆盖旧报告时标记重置
  const q = openQuestionable.value
  if (q > 0) {
    Modal.confirm({
      title: '最近评审有值得商榷项未处理',
      content: `最新 AI 评审报告标了 ${q} 条「值得商榷」的实体结论，建议先到「评审报告」逐条处理（不阻断生成）。`,
      okText: '继续生成',
      cancelText: '先看报告',
      onOk: doGenerate,
      onCancel: () => openReviewReport()
    })
    return
  }
  doGenerate()
}

// ---------------- 自主模式会话抽屉（AgentChat：阶段跳动+思考流+暂停/补语/停止） ----------------
const autonomousOpen = ref(false)
const autonomousSessionId = ref<string | null>(null)
// 本抽屉会话是否已终态（AgentChat finished / 流程轨迹终态置位；新发起/重连复位）
const autonomousTerminal = ref(false)

// 关闭仅能点 ×（mask-closable=false 防误触点遮罩关闭）；
// 执行中关闭前二次确认（关闭只隐藏面板、任务后台继续，防误关后以为任务中断）；已终态直接关
const onAutonomousClose = () => {
  if (autonomousTerminal.value) {
    autonomousOpen.value = false
    return
  }
  Modal.confirm({
    title: '确定关闭进度抽屉？',
    content: '关闭仅隐藏进度面板，不影响生成任务（后台继续执行）。',
    okText: '关闭',
    cancelText: '取消',
    onOk: () => {
      autonomousOpen.value = false
    }
  })
}

// ---------------- AI 评审（只读复核实体认证结论：评审会话 + 报告面板 + 生成入口弱提醒） ----------------
// 评审链后端无写工具（评审不修改）；报告由 submit_review 工具落盘（review-report 草稿，发布/校验不参与）；
// 逐条处理走实体确认页（改动后认证自动失效→重认证→重沉淀，闭环已存在）
const reviewOpen = ref(false)
const reviewSessionId = ref<string | null>(null)
const reviewTerminal = ref(false)
const reviewStarting = ref(false)
const reviewReportOpen = ref(false)
// 最新评审报告（解析后 { reviewed_at, total, questionable, items: [{table, verdict, issue, evidence, suggestion}] }）
const reviewReport = ref<any>(null)

const loadReviewReport = () =>
  getReviewReport({ agentCode: props.agentCode }, baseDomain)
    .then((res: any) => {
      const content = res?.payload || ''
      try {
        reviewReport.value = content ? JSON.parse(content) : null
      } catch {
        reviewReport.value = null
      }
    })
    .catch(() => { reviewReport.value = null })

const startReview = () => {
  reviewStarting.value = true
  sessionStart('asset-review-autonomous', { agentCode: props.agentCode }).then((res: any) => {
    const sessionId = res?.payload?.sessionId
    // 闸预检拒（有任务在途）：提示已由请求层 details 弹出，无 sessionId 直接返回
    if (!sessionId) return
    notification.close(REVIEW_RECONNECT_NOTIFY_KEY)
    reviewTerminal.value = false
    reviewSessionId.value = sessionId
    reviewOpen.value = true
  }).finally(() => reviewStarting.value = false)
}

// 关闭仅能点 ×（mask-closable=false）；执行中关闭前二次确认（后台继续），已终态直接关；关后拉一次报告（可能已落盘）
const onReviewClose = () => {
  if (reviewTerminal.value) {
    reviewOpen.value = false
    return
  }
  Modal.confirm({
    title: '确定关闭评审抽屉？',
    content: '关闭仅隐藏进度面板，不影响评审任务（后台继续执行）。',
    okText: '关闭',
    cancelText: '取消',
    onOk: () => {
      reviewOpen.value = false
    }
  })
}

const onReviewDone = () => {
  reviewTerminal.value = true
  loadReviewReport()
}

const openReviewReport = () => {
  loadReviewReport().then(() => { reviewReportOpen.value = true })
}

// 评审报告视图筛选（人工消化闭环）：全部 / 待处理商榷 / 已处理；
// resolved 标记随报告 JSON 落盘（重新评审覆盖报告时自然重置）
const reviewFilter = ref<'all' | 'open' | 'done'>('all')

// 筛选视图：条目带原始下标 __idx（标记处理写回用），浅拷贝不污染存储结构
const filteredReviewItems = computed(() => {
  const items = (reviewReport.value?.items || []) as Array<any>
  return items
    .map((it: any, i: number) => ({ ...it, __idx: i }))
    .filter((it: any) => reviewFilter.value === 'all'
      || (reviewFilter.value === 'open'
        ? it.verdict === 'questionable' && !it.resolved
        : !!it.resolved))
})

// 待处理商榷/已处理计数：按钮徽标与生成入口弱提醒同口径（已标记的不再催）
const openQuestionable = computed(() => ((reviewReport.value?.items || []) as Array<any>)
  .filter((it: any) => it.verdict === 'questionable' && !it.resolved).length)
const resolvedCount = computed(() => ((reviewReport.value?.items || []) as Array<any>)
  .filter((it: any) => it.resolved).length)

// 标记/撤销已处理：resolved 写回报告 JSON 落盘，本地同步原始条目（筛选视图自动重算）
const toggleResolved = (item: any) => {
  const target = !item.resolved
  resolveReviewItem({ agentCode: props.agentCode, index: item.__idx, resolved: target }, baseDomain)
    .then(() => {
      reviewReport.value.items[item.__idx].resolved = target || null
    })
}

// 商榷项定位修正：切实体确认 tab 并按表全名选中对应实体（找不到仅切 tab）；
// 列级疑点（报告条目带 column）滚动定位到该列并高亮闪烁，5 秒后自动消退
const reviewHlColumn = ref('')
let reviewHlTimer: any = null
const entRowClass = (record: any) => (record.name === reviewHlColumn.value ? 'review-hl-row' : '')
const gotoEntityForReview = (item: any) => {
  reviewReportOpen.value = false
  assetTab.value = 'entities'
  const ent = entDrafts.value.find((e: any) => e.table === item.table)
  if (ent) entActiveKey.value = ent.name
  reviewHlColumn.value = item.column || ''
  if (reviewHlTimer) clearTimeout(reviewHlTimer)
  if (item.column) {
    // tab/表格刚重渲染，等一帧后从表格内滚容器里找高亮行滚到视野中央（行在 .ant-table-body 内，
    // scrollIntoView 对最近可滚容器生效，不干扰外层页面滚动）
    nextTick(() => {
      const el = document.querySelector('.review-hl-row')
      if (el) el.scrollIntoView({ block: 'center' })
    })
    reviewHlTimer = setTimeout(() => { reviewHlColumn.value = '' }, 5000)
  }
}

// 评审会话重连（KEEP_RUNNING：刷新/关页后台继续，回来可续看；与自主生成重连同口径）
const REVIEW_RECONNECT_NOTIFY_KEY = 'asset-review-reconnect'
const reconnectReview = () => {
  sessionActive('asset-review-autonomous').then((res: any) => {
    const hit = ((res?.payload || []) as any[]).find(s => s.subject === props.agentCode)
    if (!hit || reviewOpen.value) return
    notification.info({
      key: REVIEW_RECONNECT_NOTIFY_KEY,
      message: '检测到进行中的 AI 评审任务',
      description: '上次页面关闭后评审任务仍在后台执行，可重连继续查看进度。',
      duration: 8,
      btn: () => h('a-button', { type: 'primary', size: 'small', onClick: () => { notification.close(REVIEW_RECONNECT_NOTIFY_KEY); reviewSessionId.value = hit.sessionId; reviewOpen.value = true; reviewTerminal.value = false } }, '重连查看'),
    })
  }).catch(() => {})
}

// ---------------- pipeline/skeleton 流程节点阶段抽屉（AgentStages + flow trace 轮询） ----------------
const ASSET_GEN_FLOW_KEY = 'asset-gen'
const flowStagesOpen = ref(false)
const flowStages = ref<AgentStageItem[]>([])
// 过程日志（与重生成链路同一进度键：LLM 工具探查输出逐条上报；skeleton 模式无日志时区自动隐藏）
const flowLogs = ref<string[]>([])
const flowTraceTerminal = ref(false)
let flowGraphCache: FlowGraphLike | null = null
let flowTimer: ReturnType<typeof setInterval> | null = null
// 本次生成会话起点（新开任务时刷新；仅采纳之后的 trace，避免误读旧轨迹立即误报完成）
let flowOpenedAt = 0
let flowAdoptedTraceId: string | null = null

const stopFlowPolling = () => {
  if (flowTimer) {
    clearInterval(flowTimer)
    flowTimer = null
  }
}

const pollFlowTrace = async () => {
  try {
    if (!flowGraphCache) {
      const detail = await getFlowDetail(ASSET_GEN_FLOW_KEY)
      flowGraphCache = (detail?.payload?.graph as FlowGraphLike) || null
    }
    const [traces, prog] = await Promise.all([
      getFlowTraces({ flowKey: ASSET_GEN_FLOW_KEY, limit: 5 }),
      generateAgentProgress({ agentCode: props.agentCode }, baseDomain).catch(() => null)
    ])
    flowLogs.value = (prog as any)?.payload?.logs || []
    const list = (traces?.payload as FlowTraceLike[] | undefined) || []
    // 采纳本次打开后的最新轨迹（生成启动到首节点落轨迹有几秒延迟）
    const trace = list.find(t => (t.startTime || 0) >= flowOpenedAt - 10000)
      || (flowAdoptedTraceId ? list.find(t => t.traceId === flowAdoptedTraceId) : undefined)
    if (trace) flowAdoptedTraceId = trace.traceId || null
    flowStages.value = flowTraceToStages(flowGraphCache, trace || null)
    if (trace && (trace.status === 'success' || trace.status === 'error')) {
      flowTraceTerminal.value = true
      stopFlowPolling()
      onGenerateDone()
    }
  } catch {
    // 轮询失败静默，下轮重试（后端尚未落首条轨迹时 stages 全 pending）
  }
}

const openFlowStages = () => {
  flowOpenedAt = Date.now()
  flowAdoptedTraceId = null
  flowTraceTerminal.value = false
  flowStages.value = []
  flowLogs.value = []
  flowStagesOpen.value = true
  stopFlowPolling()
  pollFlowTrace()
  flowTimer = setInterval(() => {
    if (document.hidden) return
    pollFlowTrace()
  }, 2000)
}

onBeforeUnmount(stopFlowPolling)

// 抽屉关闭即停轮询（未到终态手动关闭也停，避免后台空跑）；重开时任务未收口则续上
watch(flowStagesOpen, open => {
  if (!open) {
    stopFlowPolling()
  } else if (!flowTimer && !flowTraceTerminal.value) {
    pollFlowTrace()
    flowTimer = setInterval(() => {
      if (document.hidden) return
      pollFlowTrace()
    }, 2000)
  }
})

// ---------------- 页头按钮运行态（LLM 生成草稿转圈 + 停止生成显隐） ----------------
// 进度 step 为运行口径（与 stopGenerate 判定一致）；全局单任务可能由他窗发起，
// 5s 轮询纠正（页面隐藏守卫）+ 进场/生成/收口事件即时刷新
const RUNNING_STEPS = ['UPLOAD', 'VALIDATE', 'SAVE']
const genRunning = ref(false)
let runStateTimer: ReturnType<typeof setInterval> | null = null

const refreshGenRunning = () =>
  generateAgentProgress({ agentCode: props.agentCode }, baseDomain).then((res: any) => {
    genRunning.value = RUNNING_STEPS.includes(res.payload?.step)
  }).catch(() => {
    // 轮询失败静默，下轮重试
  })

const startRunStatePolling = () => {
  if (runStateTimer) return
  runStateTimer = setInterval(() => {
    if (document.hidden) return
    refreshGenRunning()
  }, 5000)
}

onBeforeUnmount(() => {
  if (runStateTimer) {
    clearInterval(runStateTimer)
    runStateTimer = null
  }
})

// 停止生成：先查进度确认确有进行中任务再发停止键（幂等安全，避免误停下次任务）
const stopping = ref(false)
const stopGenerate = () => {
  stopping.value = true
  generateAgentProgress({ agentCode: props.agentCode }, baseDomain).then((res: any) => {
    const step = res.payload?.step
    if (step === 'UPLOAD' || step === 'VALIDATE' || step === 'SAVE') {
      return generateAgentStop({ agentCode: props.agentCode }, baseDomain).then(() => {
        message.success('停止请求已发出：任务将在当前步骤收口，已完成部分保留在草稿')
      })
    }
    message.info('当前没有进行中的生成任务')
    return null
  }).catch(() => {
    message.error('停止请求失败，请重试')
  }).finally(() => stopping.value = false)
}

// 弹窗确认后（成功/失败均触发）：重载草稿与治理状态供核对；自主抽屉会话进终态（关闭免确认）
const onGenerateDone = () => {
  autonomousTerminal.value = true
  loadAsset()
  loadGovernance()
  refreshGenRunning()
}

// ---------------- 单资产 AI 重生成（人工三类；敏感字段逐表人工声明不走 LLM） ----------------
const llmTypes = ['metrics', 'relations', 'concepts']
const regenVisible = ref(false)
const regenLoading = ref(false)
const regenGuidance = ref('')

const assetLabel = computed(() =>
  assetTypes.find(t => t.key === assetTab.value)?.label || assetTab.value)

const confirmRegen = () => {
  regenLoading.value = true
  regenAgentAsset({
    agentCode: props.agentCode,
    assetType: assetTab.value,
    guidance: regenGuidance.value
  }, baseDomain).then(() => {
    regenVisible.value = false
    regenGuidance.value = ''
    openRegenStages()
  }).finally(() => regenLoading.value = false)
}

// 待确认口径收口闭环改口径重算（AgentChat confirmation-revised）：按影响产出推断资产类型，
// 新口径作 guidance 注入复用单资产重生成链（进度抽屉同一轮询）；无法推断回落当前 tab（仅 LLM 三类支持）
const inferAssetTypeByImpact = (impact?: string | null): string => {
  const t = impact || ''
  if (t.includes('指标')) return 'metrics'
  if (t.includes('关系') || t.includes('关联')) return 'relations'
  if (t.includes('概念') || t.includes('术语')) return 'concepts'
  return llmTypes.includes(assetTab.value) ? assetTab.value : 'metrics'
}

const onConfirmationRevised = (item: AgentConfirmationT, note: string) => {
  const assetType = inferAssetTypeByImpact(item.impact)
  const guidance = `改口径重算（待确认口径 #${item.id}）：${item.question}\n用户改按口径：${note}\n（原自决口径为「${item.adopted}」，影响产出：${item.impact || '未指明'}；请按改后口径重新生成）`
  regenAgentAsset({
    agentCode: props.agentCode,
    assetType,
    guidance
  }, baseDomain).then(() => {
    openRegenStages(assetTypes.find(t => t.key === assetType)?.label || assetType)
  })
}

// ---------------- 单资产重生成进度抽屉（替代 AsyncProcess：AgentStages 单段 + 过程日志） ----------------
// 重生成不经 flow 引擎（无轨迹），数据源为与全体生成同一份进度记录：
// SAVE 步单段 1/1；logs 流式展示 LLM 过程；终态（SUCCESS/FAILED/STOPPED）收口并重载草稿
const regenStagesOpen = ref(false)
const regenStages = ref<AgentStageItem[]>([])
const regenLogs = ref<string[]>([])
const regenTerminal = ref<'' | 'success' | 'failed' | 'stopped'>('')
const regenFailText = ref('')
const regenAssetLabel = ref('')
let regenStartedAt = 0
let regenTimer: ReturnType<typeof setInterval> | null = null

const stopRegenPolling = () => {
  if (regenTimer) {
    clearInterval(regenTimer)
    regenTimer = null
  }
}

const finishRegen = (state: 'success' | 'failed' | 'stopped') => {
  regenTerminal.value = state
  stopRegenPolling()
  onGenerateDone()
}

const pollRegenProgress = async () => {
  if (regenTerminal.value) return
  try {
    const res: any = await generateAgentProgress({ agentCode: props.agentCode }, baseDomain)
    const p = res?.payload || {}
    regenLogs.value = p.logs || []
    const title = `AI 重生成（${regenAssetLabel.value}）`
    if (RUNNING_STEPS.includes(p.step)) {
      regenStages.value = [{ key: 'regen', title, status: 'running', startedAt: regenStartedAt }]
    } else if (p.step === 'SUCCESS') {
      regenStages.value = [{ key: 'regen', title, status: 'ok', startedAt: regenStartedAt, endedAt: Date.now() }]
      finishRegen('success')
    } else if (p.step === 'FAILED') {
      const reason = (p.comments || []).join('；') || '未知错误'
      regenFailText.value = reason
      regenStages.value = [{ key: 'regen', title, status: 'error', startedAt: regenStartedAt, endedAt: Date.now(), detail: reason }]
      finishRegen('failed')
    } else if (p.step === 'STOPPED') {
      const reason = (p.comments || []).join('；')
      regenStages.value = [{ key: 'regen', title, status: 'stopped', startedAt: regenStartedAt, endedAt: Date.now(), detail: reason }]
      finishRegen('stopped')
    }
  } catch {
    // 轮询失败静默，下轮重试
  }
}

const openRegenStages = (label?: string) => {
  regenAssetLabel.value = label || assetLabel.value
  regenStartedAt = Date.now()
  regenTerminal.value = ''
  regenFailText.value = ''
  regenLogs.value = []
  // 预置运行段：后端首条进度落盘前有短暂间隙，避免抽屉闪空态
  regenStages.value = [{ key: 'regen', title: `AI 重生成（${regenAssetLabel.value}）`, status: 'running', startedAt: regenStartedAt }]
  regenStagesOpen.value = true
  stopRegenPolling()
  pollRegenProgress()
  regenTimer = setInterval(() => {
    if (document.hidden) return
    pollRegenProgress()
  }, 2000)
}

onBeforeUnmount(stopRegenPolling)

// ---------------- 提示词调优（每类一个 tab；默认取本地 promptDefaults，保存存 llm-prompts 草稿） ----------------
const promptsVisible = ref(false)
const promptsSaving = ref(false)
const promptTab = ref('pairPrompt')
const promptValues = reactive<Record<string, string>>({})

// 后端 /prompts 已返回「内置默认 + 已保存覆盖」合并结果，前端不再内置默认副本
const applyPrompts = (payload: any) => {
  PROMPT_TABS.forEach(p => {
    promptValues[p.key] = (payload && payload[p.key]) || ''
  })
}

const openPrompts = () => {
  promptsVisible.value = true
  getAgentPrompts({ agentCode: props.agentCode }, baseDomain).then((res: any) => applyPrompts(res.payload))
}

// 恢复默认：取后端内置默认模板（单一源，避免前后端两份副本漂移）
const loadDefaultPrompts = () => {
  getDefaultPrompts({ agentCode: props.agentCode }, baseDomain).then((res: any) => applyPrompts(res.payload))
}

const savePrompts = () => {
  promptsSaving.value = true
  saveAgentPrompts({
    agentCode: props.agentCode,
    ...promptValues
  }, baseDomain).finally(() => promptsSaving.value = false)
}
</script>

<style scoped>
.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  margin-bottom: 6px;
}
.section-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.gen-tip {
  color: #888;
  font-size: 12px;
  margin-bottom: 10px;
}
.asset-tabs-bar {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.asset-tabs {
  flex: 1;
}
/* 资产分组：组间分隔线 + 首组标签（三组口径：纯手动/不覆盖人工/未认证覆盖） */
.grp-sep {
  display: inline-block;
  width: 1px;
  height: 14px;
  margin-right: 8px;
  background: var(--border-subtle, #d9d9d9);
  vertical-align: -2px;
}
.grp-tag {
  display: inline-block;
  margin-right: 5px;
  padding: 0 4px;
  border-radius: 3px;
  font-size: 11px;
  line-height: 16px;
  vertical-align: 1px;
}
.grp-manual {
  background: #e6f4ff;
  border: 1px solid #91caff;
  color: #0958d9;
}
.grp-skeleton {
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  color: #389e0d;
}
.grp-semantic {
  background: #fff7e6;
  border: 1px solid #ffd591;
  color: #d46b08;
}
.regen-btn {
  margin-top: 4px;
}
/* 敏感治理面板 */
.gov-panel {
  margin-top: 4px;
}
/* 实体列配置确认面板（entities tab）：主从布局——左侧表目录（确认状态一眼扫完），右侧当前表详情 */
.ent-panel {
  margin-top: 4px;
  display: flex;
  flex-direction: column;
}
.ent-layout {
  margin-top: 8px;
  display: flex;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}
.ent-menu {
  width: 230px;
  flex-shrink: 0;
  max-height: 560px;
  border-right: 1px solid #e5e7eb;
  overflow-y: auto;
  background: #fafafa;
}
.ent-menu-item {
  padding: 7px 12px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
}
.ent-menu-item:hover {
  background: #f0f5ff;
}
.ent-menu-active {
  background: #e6f4ff;
  border-left: 3px solid #1890ff;
  padding-left: 9px;
}
.ent-menu-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}
.ent-menu-name {
  font-weight: 600;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ent-menu-table {
  color: #999;
  font-size: 11px;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ent-detail {
  flex: 1;
  min-width: 0;
  padding: 10px 14px;
}
.ent-keyrow {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.ent-keylabel {
  width: 64px;
  color: #666;
  flex-shrink: 0;
}
.ent-keyselect {
  min-width: 260px;
}
.ent-partselect {
  width: 160px;
}
.ent-basis {
  color: #999;
  font-size: 12px;
}
.ent-indexes {
  color: #999;
  font-size: 12px;
  margin-bottom: 8px;
}
.ent-colname {
  font-family: monospace;
  margin-right: 6px;
}
.ent-coltype {
  color: #999;
  font-size: 12px;
}
.ent-role {
  width: 96px;
}
.ent-gran {
  width: 90px;
}
.ent-dimgroup {
  width: 130px;
}
.ent-rolelegend {
  color: #666;
  font-size: 12px;
  margin-bottom: 8px;
  line-height: 1.6;
}
.ent-rules {
  font-size: 12px;
  margin-bottom: 8px;
  line-height: 1.7;
}
.ent-rules-caret {
  display: inline-block;
  margin-right: 2px;
  color: #999;
}
.ent-rules ul {
  margin: 4px 0 0;
  padding-left: 20px;
  color: #666;
}
/* 表头功能按钮行：窄屏自动换行，认证状态提示跟在按钮后 */
.ent-actions {
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
.ent-tip {
  color: #999;
  font-size: 12px;
}
/* 维度分组目录面板（concepts tab）：组名原生 datalist 下拉常用类别 + a-select tags 点选维度 */
.hierarchy-panel {
  margin-top: 10px;
  padding: 10px 12px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  background: #fafafa;
}
.hierarchy-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.hierarchy-title {
  font-weight: 600;
  font-size: 13px;
}
.hierarchy-tip {
  color: #999;
  font-size: 12px;
  flex: 1;
  min-width: 200px;
}
.hierarchy-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 6px;
}
.hierarchy-name {
  width: 90px;
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 500;
  color: #333;
}
.hierarchy-members {
  flex: 1;
  min-width: 200px;
  font-size: 13px;
  color: #666;
  word-break: break-all;
}
.hierarchy-empty {
  color: #999;
  font-size: 12px;
  padding: 4px 0;
}
.gov-summary {
  padding: 8px 12px;
  margin-bottom: 10px;
  border-radius: 6px;
  font-size: 13px;
}
.gov-summary-ok {
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  color: #389e0d;
}
.gov-summary-warn {
  background: #fffbe6;
  border: 1px solid #ffe58f;
  color: #874d00;
}
/* 配置自查疑点清单：逐条裁决行（无一键/批量） */
.conflict-panel {
  padding: 8px 12px;
  margin-bottom: 10px;
  border-radius: 6px;
  background: #fff2f0;
  border: 1px solid #ffccc7;
  font-size: 13px;
}
.conflict-head {
  color: #a8071a;
  margin-bottom: 6px;
}
.conflict-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0;
  border-top: 1px dashed #ffd8d2;
}
.conflict-info {
  flex: 1;
  min-width: 0;
}
.conflict-loc {
  color: #262626;
  margin-right: 8px;
}
.conflict-desc {
  color: #595959;
}
.conflict-evidence {
  color: #8c8c8c;
  font-size: 12px;
  margin-top: 2px;
  word-break: break-all;
}
.conflict-ops {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.gov-entity {
  font-weight: 600;
  margin-right: 8px;
}
.gov-table {
  color: #999;
  font-size: 12px;
}
.gov-field-chip {
  display: inline-block;
  padding: 0 8px;
  margin: 2px 6px 2px 0;
  background: #f5f5f5;
  border-radius: 4px;
  font-size: 12px;
}
.gov-replace {
  color: #1677ff;
}
.gov-empty {
  color: #bbb;
}
.gov-mode {
  display: block;
  margin-bottom: 12px;
}
.gov-split {
  display: flex;
  gap: 16px;
}
.gov-split-left {
  width: 44%;
}
.gov-split-right {
  flex: 1;
  max-height: 460px;
  overflow-y: auto;
}
.gov-split-title {
  color: #666;
  font-size: 12px;
  margin-bottom: 6px;
}
.gov-field-list {
  max-height: 440px;
  overflow-y: auto;
  padding-right: 4px;
}
.gov-field-item {
  display: flex;
  align-items: center;
  padding: 5px 8px;
  margin-bottom: 2px;
  border-radius: 4px;
  line-height: 22px;
}
.gov-field-item:hover {
  background: #f5f7fa;
}
.gov-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.gov-row-label {
  flex: none;
  width: 200px;
  color: #555;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.gov-row-select {
  flex: 1;
}
.gov-tip {
  color: #888;
  font-size: 12px;
  margin-top: 10px;
  margin-bottom: 0;
}
.guide-text {
  color: #666;
}
.regen-tip {
  color: #888;
  font-size: 12px;
  margin-bottom: 10px;
}
.prompts-tip {
  color: #888;
  font-size: 12px;
}
.prompts-tabs {
  margin-top: 6px;
}
.prompts-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
/* 自主模式会话抽屉：AgentChat 撑满抽屉高度 */
.autonomous-chat-wrap {
  flex: 1;
  min-height: 0;
  padding: 8px;
}
.flow-done-tip {
  margin-top: 12px;
}
/* AI 评审报告面板：逐条卡片，商榷项黄边警示（与确认清单同色语） */
.review-summary {
  color: #595959;
  font-size: 12px;
  margin-bottom: 12px;
}
.review-summary-tip {
  display: block;
  color: #999;
  margin-top: 2px;
}
.review-warn-text {
  color: #d48806;
  font-weight: 600;
}
.review-item {
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 8px 10px;
  margin-bottom: 8px;
}
.review-item.warn {
  border-color: rgba(250, 173, 20, 0.5);
  background: #fffbe6;
}
.review-item.done {
  opacity: 0.65;
}
.review-filter {
  margin-left: 12px;
}
.review-item-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}
.review-item-table {
  font-weight: 600;
  color: #262626;
}
.review-item-line {
  color: #595959;
  font-size: 12px;
  margin-top: 4px;
  word-break: break-all;
}

/* 评审商榷项「去修正」定位高亮：命中列所在行闪烁提示（行由 antd 表格内部渲染，
   不带本组件 scopeId，须 :deep 穿透），5 秒后类名移除自然消退 */
:deep(.review-hl-row) > td {
  animation: review-hl-flash 1.2s ease-in-out 4;
}
@keyframes review-hl-flash {
  0%, 100% {
    background: rgba(250, 173, 20, 0.12);
  }
  50% {
    background: rgba(250, 173, 20, 0.35);
  }
}
</style>
