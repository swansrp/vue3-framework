<template>
  <div class="tab-scroll">
    <!-- Table 基础配置 -->
    <div class="basic-config-section">
      <div class="section-title">
        <span>基础配置</span>
        <a-space :size="4">
          <a-button
            size="small"
            :loading="exporting"
            @click="emit('export')"
          >
            <template #icon>
              <DownloadOutlined />
            </template>
            导出本表格
          </a-button>
          <input
            ref="reportFileInputRef"
            type="file"
            accept=".json"
            style="display: none"
            @change="handleReportFileChange"
          />
          <a-button
            size="small"
            :loading="importing"
            @click="reportFileInputRef?.click()"
          >
            <template #icon>
              <UploadOutlined />
            </template>
            导入到本表格
          </a-button>
          <a-button
            type="primary"
            size="small"
            :loading="saving"
            @click="handleSaveTable"
          >
            保存基础配置
          </a-button>
        </a-space>
      </div>
      <div class="section-content">
        <a-form
          :model="tableForm"
        >
          <!-- 4 列网格排布: 两行、标签与控件逐列对齐, 不随窗口宽度换行错乱 -->
          <div class="basic-form-grid">
            <a-form-item label="表格编码">
              <a-input
                v-model:value="tableForm.tableCode"
                placeholder="请输入表格编码"
              />
            </a-form-item>
            <a-form-item label="筛选栏宽度">
              <a-input-number
                v-model:value="tableForm.filterWidth"
                :min="100"
                :max="500"
                style="width: 100%"
              />
            </a-form-item>
            <a-form-item label="标题间隔">
              <a-input-number
                v-model:value="tableForm.paddingTh"
                :min="0"
                :max="50"
                style="width: 100%"
              />
            </a-form-item>
            <a-form-item label="条目间隔">
              <a-input-number
                v-model:value="tableForm.paddingTd"
                :min="0"
                :max="50"
                style="width: 100%"
              />
            </a-form-item>
            <a-form-item label="下载">
              <a-select
                v-model:value="tableForm.downloadAble"
              >
                <a-select-option value="1">
                  允许
                </a-select-option>
                <a-select-option value="0">
                  禁用
                </a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item label="透视模式">
              <a-select
                v-model:value="tableForm.pivotMode"
              >
                <a-select-option value="1">
                  开启
                </a-select-option>
                <a-select-option value="0">
                  关闭
                </a-select-option>
              </a-select>
            </a-form-item>
            <!-- 锁定方向(仅透视模式, pivotRow 布局除外): s-table 两边同时锁定会异常, 只能选一边;
                 左锁→行维度字段逐个勾选左锁定, 右锁→度量列逐个勾选右锁定;
                 pivotRow 布局无此项: 透视列部分(行维度+层级列+名目列)恒左冻结(行标识常驻), 度量不右锁 -->
            <a-form-item
              v-if="tableForm.pivotMode === '1' && tableForm.pivotMeasureLayout !== 'pivotRow'"
              label="锁定方向"
            >
              <a-select
                v-model:value="pivotLockSide"
                @change="onLockSideChange"
              >
                <a-select-option value="">
                  不锁定
                </a-select-option>
                <a-select-option value="left">
                  左锁
                </a-select-option>
                <a-select-option value="right">
                  右锁
                </a-select-option>
              </a-select>
            </a-form-item>
            <!-- 度量布局(仅透视模式): col=度量横向平铺为列, row=度量纵向展开为行, pivotRow=透视值纵向展开为行(度量仍作列) -->
            <a-form-item
              v-if="tableForm.pivotMode === '1'"
              label="度量布局"
            >
              <a-select
                v-model:value="tableForm.pivotMeasureLayout"
              >
                <a-select-option value="col">
                  列(度量横向平铺)
                </a-select-option>
                <a-select-option value="row">
                  行(度量纵向展开)
                </a-select-option>
                <a-select-option value="pivotRow">
                  透视列转行(竖排)
                </a-select-option>
              </a-select>
            </a-form-item>
            <!-- 合计位置同一字段两用: row=合计列在透视列前/后, pivotRow=组内小计行在组内前/后; first=靠前 last=靠后(默认) -->
            <a-form-item
              v-if="tableForm.pivotMode === '1' && (tableForm.pivotMeasureLayout === 'row' || tableForm.pivotMeasureLayout === 'pivotRow')"
              :label="tableForm.pivotMeasureLayout === 'row' ? '合计列位置' : '小计行位置'"
            >
              <a-select v-model:value="pivotTotalPosModel">
                <a-select-option value="first">
                  {{ tableForm.pivotMeasureLayout === 'row' ? '靠前(透视列之前)' : '靠前(组内首行之前)' }}
                </a-select-option>
                <a-select-option value="last">
                  {{ tableForm.pivotMeasureLayout === 'row' ? '靠后(透视列之后)' : '靠后(组内末行之后)' }}
                </a-select-option>
                <!-- 不显示小计仅 pivotRow(组内小计行)可选项; row 布局的合计列不支持隐藏 -->
                <a-select-option
                  v-if="tableForm.pivotMeasureLayout === 'pivotRow'"
                  value="none"
                >
                  不显示小计
                </a-select-option>
              </a-select>
            </a-form-item>
            <!-- 总计行(仅透视模式): 最底部汇总行; 默认跟随所绑 Portal 配置的 summary 开关, 可按表覆盖 -->
            <a-form-item
              v-if="tableForm.pivotMode === '1'"
              label="总计行"
            >
              <a-select v-model:value="pivotSummaryShowModel">
                <a-select-option value="">
                  跟随Portal配置
                </a-select-option>
                <a-select-option value="1">
                  显示
                </a-select-option>
                <a-select-option value="0">
                  隐藏
                </a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item label="状态">
              <a-select
                v-model:value="tableForm.status"
              >
                <a-select-option value="1">
                  启用
                </a-select-option>
                <a-select-option value="0">
                  禁用
                </a-select-option>
              </a-select>
            </a-form-item>
            <!-- 常驻条件: 每次查询强制 AND 拼入、用户在筛选栏改不掉; 挂在成员表格自身, 故多Tab页面各 Tab 互不影响 -->
            <a-form-item label="常驻条件">
              <div class="fixed-condition-row">
                <a-button
                  class="fixed-condition-btn"
                  @click="showFixedConditionModal"
                >
                  {{ fixedRows.length > 0 ? `已配置 ${fixedRows.length} 条` : '配置' }}
                </a-button>
                <a-button
                  v-if="fixedRows.length > 0"
                  type="link"
                  size="small"
                  danger
                  @click="clearFixedRows"
                >
                  清空
                </a-button>
              </div>
            </a-form-item>
            <!-- 报表默认排序: 普通报表把 JSON 下发给查询接口当 sortList,
                 透视模式在聚合结果行上排(候选=行维度字段+聚合度量, 与「行维度顺序」里的逐字段排序并存) -->
            <a-form-item label="排序字段">
              <a-select
                v-model:value="sortColumn"
                :options="sortFieldOptions"
                placeholder="不排序"
                allow-clear
                show-search
                :filter-option="filterOption"
              />
            </a-form-item>
            <a-form-item label="排序方向">
              <a-select
                v-model:value="sortType"
                :disabled="!sortColumn"
              >
                <a-select-option :value="0">
                  正序
                </a-select-option>
                <a-select-option :value="1">
                  倒序
                </a-select-option>
              </a-select>
            </a-form-item>
          </div>
        </a-form>
        <div class="basic-form-tip">
          常驻条件每次查询都强制拼入，用户在筛选栏改不掉；多Tab页面按各 Tab 自身的表格配置生效，互不影响。
        </div>

        <!-- 表格列显示配置(勾选=显示, 拖动芯片调整列序; 透视模式下由行维度字段配置取代，隐藏) -->
        <div
          v-if="tableForm.pivotMode !== '1'"
          class="filter-columns-config"
        >
          <div class="filter-columns-header">
            <span class="filter-columns-title">表格列显示配置</span>
            <span class="filter-columns-count">（已排除 {{ excludedColumnCount }} 列，拖动芯片可调整列序）</span>
            <a-space
              class="filter-columns-actions"
              :size="4"
            >
              <a-button
                size="small"
                @click="checkAllFilterColumns"
              >
                全选
              </a-button>
              <a-button
                size="small"
                @click="invertFilterColumns"
              >
                反选
              </a-button>
            </a-space>
          </div>
          <div class="filter-columns-list">
            <div
              v-for="(column, index) in portalConfig?.columns || []"
              :key="column.id ?? column.property"
              class="filter-columns-drag-shell"
              draggable="true"
              :class="{ 'filter-columns-item-dragging': dragIndex === index }"
              @dragstart="onColumnDragStart(index, $event)"
              @dragover.prevent="onColumnDragOver(index)"
              @dragend="onColumnDragEnd"
            >
              <a-checkbox v-model:checked="column.checked">
                {{ strRemoveLF(column.displayName) }} ({{ column.property }})
              </a-checkbox>
            </div>
          </div>
        </div>

        <!-- 行维度字段配置(透视模式，样式同筛选列配置) -->
        <div
          v-if="tableForm.pivotMode === '1'"
          class="filter-columns-config"
        >
          <div class="filter-columns-header">
            <span class="filter-columns-title">行维度字段配置</span>
            <span class="filter-columns-count">（已勾选 {{ pivotGroupFields.length }} 个字段，拖动已勾选芯片可调整分组层级）</span>
          </div>
          <div class="filter-columns-list">
            <a-checkbox-group v-model:value="pivotGroupFields">
              <div
                v-for="field in orderedPivotGroupChips"
                :key="field.property"
                class="filter-columns-drag-shell"
                :draggable="pivotGroupFields.includes(field.property)"
                :class="{ 'filter-columns-item-dragging': groupDragIndex === pivotGroupFields.indexOf(field.property) }"
                @dragstart="onGroupChipDragStart(field.property, $event)"
                @dragover="onGroupChipDragOver(field.property, $event)"
                @dragend="onGroupFieldDragEnd"
              >
                <a-checkbox :value="field.property">
                  {{ strRemoveLF(field.displayName) }} ({{ field.property }})
                </a-checkbox>
              </div>
            </a-checkbox-group>
          </div>
          <!-- 行维度顺序调整(决定 group by 层级, 拖动行调整顺序) -->
          <div
            v-if="pivotGroupFields.length > 0"
            class="pivot-group-order"
          >
            <span class="pivot-group-order-title">行维度顺序（自上而下的分组层级，也是排序优先级，拖动行可调整）：</span>
            <div
              v-for="(fieldProp, index) in pivotGroupFields"
              :key="fieldProp"
              class="pivot-group-order-item"
              :class="{ 'pivot-group-order-item-dragging': groupDragIndex === index }"
              draggable="true"
              @dragstart="onGroupFieldDragStart(index, $event)"
              @dragover.prevent="onGroupFieldDragOver(index)"
              @dragend="onGroupFieldDragEnd"
            >
              <HolderOutlined class="pivot-group-order-handle" />
              <span class="measure-index">{{ index + 1 }}</span>
              <!-- 字段名靠左: 低维度在左, 右侧控件列固定顺序, 有无排序均对齐 -->
              <span class="pivot-group-order-name">{{ pivotGroupFieldDisplayName(fieldProp) }}</span>
              <a-checkbox
                :checked="!pivotGroupHiddenFields.includes(fieldProp)"
                @change="(e: any) => togglePivotGroupFieldDisplay(fieldProp, e.target.checked)"
              >
                表格显示
              </a-checkbox>
              <!-- 左锁定方向下逐字段勾选锁定 -->
              <a-checkbox
                v-if="pivotLockSide === 'left'"
                :checked="pivotGroupFixedFields.includes(fieldProp)"
                @change="(e: any) => togglePivotGroupFieldFixed(fieldProp, e.target.checked)"
              >
                锁定
              </a-checkbox>
              <!-- 聚合结果排序: 0=正序 1=倒序(PORTAL_SORT_DICT), 未配置=不排序 -->
              <a-select
                :value="pivotGroupSorts[fieldProp]"
                size="small"
                style="width: 96px"
                placeholder="不排序"
                allow-clear
                @change="(val: any) => setPivotGroupFieldSort(fieldProp, val)"
              >
                <a-select-option :value="0">
                  正序
                </a-select-option>
                <a-select-option :value="1">
                  倒序
                </a-select-option>
              </a-select>
              <!-- 排序优先级占位固定宽度: 无排序的行保持对齐 -->
              <span class="pivot-sort-priority">{{ pivotGroupSortPriority[fieldProp] || '—' }}</span>
            </div>
          </div>
        </div>

        <!-- 聚合配置(透视模式，与行维度同存 sys_portal_table，合并到基础配置) -->
        <div
          v-if="tableForm.pivotMode === '1'"
          class="filter-columns-config measure-config-section"
        >
          <div class="filter-columns-header">
            <span class="filter-columns-title">聚合字段（度量列）</span>
            <a-space :size="4">
              <a-button
                size="small"
                @click="handleExportMeasures"
              >
                导出
              </a-button>
              <a-popconfirm
                title="导入将替换当前全部聚合字段（点「保存基础配置」后才落库），确认？"
                @confirm="measureImportInputRef?.click()"
              >
                <a-button size="small">
                  导入
                </a-button>
              </a-popconfirm>
              <a-button
                type="primary"
                size="small"
                @click="pivotMeasureRows.push({ field: '', key: '', condition: '', groupPath: '', label: '', desc: '', agg: 'sum', fixed: false, hideZero: false, numerator: '', denominator: '', numeratorAgg: 'sum', denominatorAgg: 'sum' })"
              >
                <template #icon>
                  <PlusOutlined />
                </template>
                添加聚合字段
              </a-button>
            </a-space>
            <input
              ref="measureImportInputRef"
              type="file"
              accept=".json,application/json"
              style="display: none"
              @change="handleImportMeasuresFile"
            />
          </div>
          <div class="measure-config-tip">
            每个聚合字段可单独配条件，与透视列条件按「且」叠加；同一字段配多条不同条件会各自成列；「父表头」可把度量列挂到多层级表头下。导出的 JSON 可在其它表格配置里导入（需目标数据集存在同名字段）。
          </div>
          <div class="measure-rows">
            <a-empty
              v-if="pivotMeasureRows.length === 0"
              description="暂无聚合字段，点击右上角添加"
            />
            <div
              v-for="(measure, index) in pivotMeasureRows"
              :key="index"
              class="pivot-measure-row"
              :class="{ 'pivot-measure-row-dragging': measureDragIndex === index }"
              @dragover.prevent="onMeasureDragOver(index)"
              @dragend="onMeasureDragEnd"
            >
              <!-- 只有手柄可发起拖拽: 整行 draggable 会吃掉行内输入框的文本拖选 -->
              <HolderOutlined
                class="pivot-measure-row-handle"
                draggable="true"
                @dragstart="onMeasureDragStart(index, $event)"
              />
              <span class="measure-index">{{ index + 1 }}</span>
              <!-- ratio(比率加权): field 仅作输出键, 取数走分子/分母两列, 各自聚合后相除 -->
              <template v-if="measure.agg === 'ratio'">
                <a-select
                  v-model:value="measure.numerator"
                  :options="availableFields.map((f) => ({ label: `${strRemoveLF(f.displayName)} (${f.property})`, value: f.property }))"
                  placeholder="分子字段"
                  show-search
                  :filter-option="filterOption"
                  style="width: 180px; min-width: 120px"
                  @change="handleRatioFieldChange(measure)"
                />
                <!-- 腿聚合缺省 sum; 分母配 max 服务组内恒定目标值(达成率=sum(实际)/max(目标)) -->
                <a-select
                  v-model:value="measure.numeratorAgg"
                  :options="ratioLegAggOptions"
                  style="width: 92px"
                />
                <span
                  class="measure-index"
                  style="margin: 0 2px"
                >/</span>
                <a-select
                  v-model:value="measure.denominator"
                  :options="availableFields.map((f) => ({ label: `${strRemoveLF(f.displayName)} (${f.property})`, value: f.property }))"
                  placeholder="分母字段"
                  show-search
                  :filter-option="filterOption"
                  style="width: 180px; min-width: 120px"
                  @change="handleRatioFieldChange(measure)"
                />
                <a-select
                  v-model:value="measure.denominatorAgg"
                  :options="ratioLegAggOptions"
                  style="width: 92px"
                />
              </template>
              <a-select
                v-else
                v-model:value="measure.field"
                :options="availableFields.map((f) => ({ label: `${strRemoveLF(f.displayName)} (${f.property})`, value: f.property }))"
                placeholder="聚合字段"
                show-search
                :filter-option="filterOption"
                style="width: 300px; min-width: 200px"
              />
              <a-input
                v-model:value="measure.label"
                placeholder="显示名"
                style="width: 180px; min-width: 120px"
              />
              <!-- 聚合方式与勾选框紧跟取值控件, 注释按钮贴到删除左侧成"行尾操作区" -->
              <a-select
                v-model:value="measure.agg"
                style="width: 120px"
              >
                <a-select-option value="sum">
                  求和
                </a-select-option>
                <a-select-option value="count">
                  计数
                </a-select-option>
                <a-select-option value="countDistinct">
                  去重计数
                </a-select-option>
                <a-select-option value="avg">
                  平均
                </a-select-option>
                <a-select-option value="min">
                  最小
                </a-select-option>
                <a-select-option value="max">
                  最大
                </a-select-option>
                <a-select-option value="ratio">
                  比率(加权)
                </a-select-option>
              </a-select>
              <!-- 仅求和项开放: sum 去掉 0/NULL 行合计仍恒等, 其余聚合滤零行会与单元格数字对不上 -->
              <a-checkbox
                v-if="measure.agg === 'sum'"
                v-model:checked="measure.hideZero"
              >
                钻取隐藏零值
              </a-checkbox>
              <!-- 右锁定方向下逐度量勾选锁定 -->
              <a-checkbox
                v-if="pivotLockSide === 'right'"
                v-model:checked="measure.fixed"
              >
                锁定
              </a-checkbox>
              <!-- 行尾操作区: 整体贴右且宽度由内容固定, 各行按钮起点对齐成一条竖线 -->
              <div class="measure-row-actions">
                <!-- 父表头: 给度量列加多层级表头(叶子标题仍是显示名), 与透视列父链叠加 -->
                <a-tooltip>
                  <template #title>
                    <span v-if="measure.groupPath">{{ parseGroupPathLabel(measure.groupPath) }}</span>
                    <span v-else>设置多层级父表头（叶子标题仍是显示名）</span>
                  </template>
                  <a-button
                    class="measure-path-btn"
                    :type="measure.groupPath ? 'primary' : 'dashed'"
                    :ghost="!!measure.groupPath"
                    size="small"
                    @click="openPathEditor(index)"
                  >
                    <template #icon>
                      <apartment-outlined />
                    </template>
                    父表头
                  </a-button>
                </a-tooltip>
                <!-- 度量自身条件: 与透视列条件按「且」叠加, 每个聚合字段各配各的 -->
                <a-tooltip>
                  <template #title>
                    <span v-if="measure.condition">已配置度量条件（点开修改），与透视列条件按「且」叠加</span>
                    <span v-else>给该聚合字段单独加条件，与透视列条件按「且」叠加</span>
                  </template>
                  <a-button
                    class="measure-cond-btn"
                    :type="measure.condition ? 'primary' : 'dashed'"
                    :ghost="!!measure.condition"
                    size="small"
                    @click="openMeasureCondition(index)"
                  >
                    <template #icon>
                      <filter-outlined />
                    </template>
                    条件
                  </a-button>
                </a-tooltip>
                <!-- 注释文本长, 不放窄输入框: 走按钮＋宽弹框, 按钮只区分"有/无"(虚线待填 vs 蓝色已填), 内容悬停回显 -->
                <a-tooltip>
                  <template #title>
                    <span v-if="measure.desc">{{ measure.desc }}</span>
                    <span v-else>未填写列注释</span>
                  </template>
                  <a-button
                    class="measure-desc-btn"
                    :type="measure.desc ? 'primary' : 'dashed'"
                    :ghost="!!measure.desc"
                    size="small"
                    @click="openDescEditor(index)"
                  >
                    <template #icon>
                      <message-filled v-if="measure.desc" />
                      <edit-outlined v-else />
                    </template>
                    注释
                  </a-button>
                </a-tooltip>
                <!-- 复制: 整行深拷贝追加到列表末尾(含条件/父表头/注释), 输出键保存时按行序自动加 _2/_3 不用改 -->
                <a-button
                  size="small"
                  @click="copyMeasureRow(index)"
                >
                  <template #icon>
                    <copy-outlined />
                  </template>
                  复制
                </a-button>
                <a-button
                  type="link"
                  danger
                  size="small"
                  @click="pivotMeasureRows.splice(index, 1)"
                >
                  删除
                </a-button>
              </div>
            </div>
          </div>
        </div>
        <!-- Tab 成员配置(多Tab页面): 配置后本表格即宿主(路由入口), 左侧筛选栏以本表格为准 -->
        <div class="filter-columns-config tab-items-config">
          <div class="filter-columns-header">
            <span class="filter-columns-title">Tab 成员配置（多Tab页面）</span>
            <a-button
              size="small"
              @click="addTabMemberRow"
            >
              <template #icon>
                <PlusOutlined />
              </template>
              添加 Tab 成员
            </a-button>
          </div>
          <div class="tab-items-body">
            <div class="tab-items-tip">
              勾选后本表格作为页面宿主: 菜单路由用本表格编码, 左侧筛选栏/外观均以本表格为准;
              成员各自的筛选项在多Tab页面中不生效。
            </div>
            <div class="tab-self-row">
              <a-checkbox
                :checked="tabSelfEnabled"
                @change="(e: any) => (tabSelfEnabled = e.target.checked)"
              >
                本表格作为一个 Tab 页
              </a-checkbox>
            </div>
            <div class="tab-member-rows">
              <a-empty
                v-if="tabOrderedSlots.length === 0"
                description="暂无 Tab 成员, 仅本表格单页展示"
              />
              <div
                v-for="(row, index) in tabOrderedSlots"
                :key="row.key"
                class="pivot-measure-row tab-member-row"
                :class="{ 'pivot-measure-row-dragging': tabDragIndex === index }"
                @dragover.prevent="onTabDragOver(index)"
                @dragend="onTabDragEnd"
              >
                <HolderOutlined
                  class="pivot-measure-row-handle"
                  draggable="true"
                  @dragstart="onTabDragStart(index, $event)"
                />
                <span class="measure-index">{{ index + 1 }}</span>
                <template v-if="row.self">
                  <span class="tab-self-chip">本表格（页面宿主）</span>
                  <a-input
                    v-model:value="tabSelfLabel"
                    placeholder="Tab 名称(留空用表格编码)"
                    style="width: 200px"
                  />
                </template>
                <template v-else>
                  <a-select
                    v-model:value="tabMemberRows[row.memberIndex].tableId"
                    :options="tabMemberOptions(row.memberIndex)"
                    placeholder="选择成员表格"
                    show-search
                    :filter-option="filterOption"
                    style="width: 300px"
                  />
                  <a-input
                    v-model:value="tabMemberRows[row.memberIndex].label"
                    placeholder="Tab 名称(留空用表格编码)"
                    style="width: 200px"
                  />
                  <a-button
                    type="link"
                    danger
                    size="small"
                    @click="tabMemberRows.splice(row.memberIndex, 1)"
                  >
                    删除
                  </a-button>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 常驻条件编辑器: 与筛选项/透视列条件共用同一个高级条件弹窗 -->
    <PortalAdvancedSearchModal
      :advanced-condition="fixedConditionModal"
      @confirm="saveFixedCondition"
    />

    <!-- 聚合字段条件编辑器: 与常驻条件同一弹窗组件, 确认才写回该度量行(点「保存基础配置」落库) -->
    <PortalAdvancedSearchModal
      :advanced-condition="measureConditionModal"
      @confirm="saveMeasureCondition"
    />

    <!-- 度量列注释编辑: 点行内「注释」按钮打开, 确定才写回该行 -->
    <a-modal
      v-model:open="descModal.open"
      :title="`列注释 · ${descModal.label || '未命名度量'}`"
      :width="640"
    >
      <a-textarea
        v-model:value="descModal.draft"
        :auto-size="{ minRows: 4, maxRows: 12 }"
        :maxlength="300"
        placeholder="写这一列衡量什么、怎么算、怎么读。报表表头悬停问号时显示。"
        show-count
      />
      <template #footer>
        <a-button
          v-if="descModal.original"
          danger
          @click="clearDescEditor"
        >
          清除
        </a-button>
        <a-button @click="descModal.open = false">
          取消
        </a-button>
        <a-button
          type="primary"
          @click="confirmDescEditor"
        >
          确定
        </a-button>
      </template>
    </a-modal>

    <!-- 度量父表头编辑: 纯文本以 / 分层(自外向内), 光标任意位置可插入(加在最前就点到开头输), 全选可复制; 确定才写回该行 -->
    <a-modal
      v-model:open="pathModal.open"
      :title="`父表头 · ${pathModal.label || '未命名度量'}`"
      :width="560"
    >
      <div class="measure-path-input-row">
        <a-input
          v-model:value="pathModal.draft"
          placeholder="如: 经营目标 / 合同类（以 / 分层, 自外向内）"
          allow-clear
        />
        <a-button @click="copyPathDraft">
          复制
        </a-button>
      </div>
      <div class="measure-path-tip">
        以 / 分隔层级、自外向内; 光标点到哪就插到哪（加在最前面就点到开头输入）; 整条路径可全选复制。与透视列父表头叠加: 同一透视列下多个度量配同一父链会合并成同组; 留空则挂回透视列直下。
      </div>
      <template #footer>
        <a-button
          v-if="pathModal.draft.length > 0"
          danger
          @click="clearPathEditor"
        >
          清除
        </a-button>
        <a-button @click="pathModal.open = false">
          取消
        </a-button>
        <a-button
          type="primary"
          @click="confirmPathEditor"
        >
          确定
        </a-button>
      </template>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import {
  ApartmentOutlined,
  CopyOutlined,
  DownloadOutlined,
  EditOutlined,
  FilterOutlined,
  HolderOutlined,
  MessageFilled,
  PlusOutlined,
  UploadOutlined,
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, reactive, ref, watch } from 'vue'

import { pruneBlankConditions, useConditionModal } from './useConditionModal'

import { PivotMeasureVO, PortalTableVO, updatePortalTable } from '@/framework/apis/portal/table'
import { updatePortalColumnOrder } from '@/framework/apis/portal/config'
import { ConditionType } from '@/framework/components/common/AdvancedSearch/type'
import { downloadJsonConfig, readJsonFile } from '@/framework/utils/configTransfer'
import PortalAdvancedSearchModal from '@/framework/components/common/Portal/modal/PortalAdvancedSearchModal.vue'
import { strRemoveLF } from '@/framework/utils/common'


const props = defineProps<{
  table: PortalTableVO;
  /** 同底表下全部表格配置(多Tab成员候选) */
  tableList?: PortalTableVO[];
  portalConfig?: any;
  availableFields: Array<{
    key: string;
    title: string;
    property: string;
    displayName: string;
    reference: string;
  }>;
  exporting?: boolean;
  importing?: boolean;
}>()

const emit = defineEmits<{
  'saved': [];
  'export': [];
  'import': [file: File];
}>()

const saving = ref(false)
const reportFileInputRef = ref<HTMLInputElement>()

// 表单编辑对象：指向与 table prop 同一引用，避免模板直接对 prop 写入触发 vue/no-mutating-props
const tableForm = computed<PortalTableVO>(() => props.table)

// ==================== 表格常驻条件 ====================
// 落库结构同 sys_portal.default_condition: {"andOr":"0","conditionList":[...]}
// 清空必须显式写空条件树而非 null —— update 接口非 strict 模式跳过 null，清不掉旧值（与默认排序同坑）
const FIXED_CONDITION_EMPTY = '{"andOr":"0","conditionList":[]}'
// 编辑中的条件行：切换表格时从 table.fixedCondition 反填，点「保存基础配置」才序列化落库
const fixedRows = ref<any[]>([])
// 条件间关系('0'=与 '1'=或)；关系字段是后补的，老数据没有 ⇒ 与
const fixedAndOr = ref<'0' | '1'>('0')

const parseFixedCondition = (json?: string | null) => {
  fixedRows.value = []
  fixedAndOr.value = '0'
  if (!json) return
  try {
    const parsed = JSON.parse(json)
    // 兼容裸数组与 {conditionList} 两种历史写法
    const list = Array.isArray(parsed) ? parsed : parsed?.conditionList
    fixedRows.value = Array.isArray(list) ? list : []
    fixedAndOr.value = (!Array.isArray(parsed) && parsed?.andOr === '1') ? '1' : '0'
  } catch (e) {
    console.warn('解析表格常驻条件失败:', e)
  }
}

const {
  filterConditionConfig: fixedConditionModal,
  openConditionModal,
  handleConditionConfirm: saveFixedCondition,
} = useConditionModal(
  () => props.portalConfig?.columns,
  (condition: ConditionType) => {
    // 起步空行与空条件组不回填，否则「保存基础配置」会把一条永不生效的空条件写进 fixedCondition
    fixedRows.value = pruneBlankConditions(condition?.conditionList || [])
    fixedAndOr.value = (condition?.andOr === '1') ? '1' : '0'
  }
)

const showFixedConditionModal = () => openConditionModal(fixedRows.value, fixedAndOr.value)
const clearFixedRows = () => { fixedRows.value = [] }

// ==================== 透视配置(基础配置 tab 内的行维度/度量编辑状态) ====================
// 行维度字段勾选列表(保存时序列化到 table.groupByFields，数组顺序即分组层级顺序)
const pivotGroupFields = ref<string[]>([])

// 行维度字段显示名
const pivotGroupFieldDisplayName = (property: string) => {
  const field = props.availableFields.find((f) => f.property === property)
  return field ? `${strRemoveLF(field.displayName)} (${field.property})` : property
}

// 字段中文名(不带英文名后缀): 度量未填显示名时的回退显示
const fieldChineseName = (property: string) =>
  strRemoveLF(props.availableFields.find((f) => f.property === property)?.displayName || property)

// 行维度芯片渲染顺序: 已勾选按分组层级在前, 未勾选按字段清单顺序排后(层级顺序即芯片顺序, 两处拖拽面共享同一数组)
const orderedPivotGroupChips = computed(() => {
  const checked = pivotGroupFields.value.flatMap((p) => {
    const f = props.availableFields.find((item) => item.property === p)
    return f ? [f] : []
  })
  const checkedProps = new Set(pivotGroupFields.value)
  const unchecked = props.availableFields.filter((f) => !checkedProps.has(f.property))
  return [...checked, ...unchecked]
})

// 行维度顺序调整: 拖动时就地重排勾选数组, 保存时按此顺序序列化 groupByFields(顺序即分组层级/排序优先级)
const groupDragIndex = ref<number | null>(null)
const onGroupFieldDragStart = (index: number, e: DragEvent) => {
  groupDragIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }
}
// 拖过某行/某枚芯片即让位(实时预览最终顺序), 松手时数组已是目标顺序, 无需单独的 drop 处理
const onGroupFieldDragOver = (index: number) => {
  const from = groupDragIndex.value
  if (from === null || from === index || index < 0) return
  const [item] = pivotGroupFields.value.splice(from, 1)
  pivotGroupFields.value.splice(index, 0, item)
  groupDragIndex.value = index
}
const onGroupFieldDragEnd = () => {
  groupDragIndex.value = null
}
// 芯片面入口: 勾选状态由位置转属性; 未勾选芯片不是层级槽位, 不放行 drop 也不让位
const onGroupChipDragStart = (property: string, e: DragEvent) => {
  onGroupFieldDragStart(pivotGroupFields.value.indexOf(property), e)
}
const onGroupChipDragOver = (property: string, e: DragEvent) => {
  const to = pivotGroupFields.value.indexOf(property)
  if (to < 0) return
  e.preventDefault()
  onGroupFieldDragOver(to)
}

// 聚合字段行拖拽排序: 行序即度量输出顺序(多度量列头顺序/row 模式熔接行序)
const measureDragIndex = ref<number | null>(null)
const onMeasureDragStart = (index: number, e: DragEvent) => {
  measureDragIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }
}
// 拖过某行即让位(实时预览最终顺序), 松手无需单独 drop 处理
const onMeasureDragOver = (index: number) => {
  const from = measureDragIndex.value
  if (from === null || from === index || index < 0) return
  const [item] = pivotMeasureRows.value.splice(from, 1)
  pivotMeasureRows.value.splice(index, 0, item)
  measureDragIndex.value = index
}
const onMeasureDragEnd = () => {
  measureDragIndex.value = null
}
// 隐藏的行维度字段(仍参与 group by，仅不在表格中显示，常用于行粒度细化/筛选目标)
const pivotGroupHiddenFields = ref<string[]>([])
// 锁定方向: ''=不锁定 left=左锁(行维度逐个勾选) right=右锁(度量逐个勾选);
// s-table 两边同时锁定会渲染异常, 切换方向时清空对侧勾选;
// pivotRow 布局无锁定方向: 透视列部分(行维度+层级列+名目列)恒左冻结, 该布局下恒为 ''(勾选区不出现)
const pivotLockSide = ref<'' | 'left' | 'right'>('')
// 左锁定的行维度字段列表(保存时写入 groupByFields JSON 项的 fixed)
const pivotGroupFixedFields = ref<string[]>([])
// 切换行维度字段是否在表格中显示(隐藏时同步清除左锁定勾选, 避免残留无 UI 入口的锁定状态)
const togglePivotGroupFieldDisplay = (fieldProp: string, display: boolean) => {
  const idx = pivotGroupHiddenFields.value.indexOf(fieldProp)
  if (display && idx >= 0) {
    pivotGroupHiddenFields.value.splice(idx, 1)
  } else if (!display && idx < 0) {
    pivotGroupHiddenFields.value.push(fieldProp)
    const fixedIdx = pivotGroupFixedFields.value.indexOf(fieldProp)
    if (fixedIdx >= 0) {
      pivotGroupFixedFields.value.splice(fixedIdx, 1)
    }
  }
}
// 切换行维度字段左锁定勾选
const togglePivotGroupFieldFixed = (fieldProp: string, fixed: boolean) => {
  const idx = pivotGroupFixedFields.value.indexOf(fieldProp)
  if (fixed && idx < 0) {
    pivotGroupFixedFields.value.push(fieldProp)
  } else if (!fixed && idx >= 0) {
    pivotGroupFixedFields.value.splice(idx, 1)
  }
}
// 锁定方向切换: 切到某方向时默认全选该方向字段(可手动取消), 同时清空对侧勾选(保证只锁一边)
const onLockSideChange = () => {
  if (pivotLockSide.value === 'left') {
    // 只全选可见字段: 隐藏字段无「锁定」勾选入口, 全选会落库无感知的锁定状态
    pivotGroupFixedFields.value = pivotGroupFields.value.filter(f => !pivotGroupHiddenFields.value.includes(f))
    pivotMeasureRows.value.forEach((m) => { m.fixed = false })
  } else if (pivotLockSide.value === 'right') {
    pivotGroupFixedFields.value = []
    pivotMeasureRows.value.forEach((m) => { m.fixed = true })
  } else {
    pivotGroupFixedFields.value = []
    pivotMeasureRows.value.forEach((m) => { m.fixed = false })
  }
}
// 行维度字段排序配置(作用于 group by 后的聚合行; 0=正序 1=倒序, 无 key=不排序)
const pivotGroupSorts = ref<Record<string, number>>({})
// 设置行维度字段排序(清空时移除配置)
const setPivotGroupFieldSort = (fieldProp: string, sort: number | undefined) => {
  if (sort === 0 || sort === 1) {
    pivotGroupSorts.value[fieldProp] = sort
  } else {
    delete pivotGroupSorts.value[fieldProp]
  }
}
// 排序优先级: 按行维度顺序给已配置排序的字段编号(1=第一排序维度), 随顺序调整自动重算
const pivotGroupSortPriority = computed(() => {
  const map: Record<string, number> = {}
  let priority = 0
  for (const fieldProp of pivotGroupFields.value) {
    if (pivotGroupSorts.value[fieldProp] === 0 || pivotGroupSorts.value[fieldProp] === 1) {
      map[fieldProp] = ++priority
    }
  }
  return map
})
// ratio 腿聚合选项(缺省 sum; 分母配 max 服务组内恒定目标值, 防 sum 分母随行数放大)
const ratioLegAggOptions = [
  { label: '求和', value: 'sum' },
  { label: '计数', value: 'count' },
  { label: '去重计数', value: 'countDistinct' },
  { label: '平均', value: 'avg' },
  { label: '最小', value: 'min' },
  { label: '最大', value: 'max' }
]

// 度量列编辑行(保存时序列化到 table.pivotMeasures)
const pivotMeasureRows = ref<PivotMeasureVO[]>([])

// ratio 度量的 field 仅是输出键(取数走分子/分母), 由分子/分母派生保证取数键唯一且不与真实列混淆
const handleRatioFieldChange = (measure: PivotMeasureVO) => {
  if (measure.agg === 'ratio' && measure.numerator && measure.denominator) {
    measure.field = `${measure.numerator}_over_${measure.denominator}`
  }
}

// 复制度量行: 整行深拷贝(值全为原始类型/JSON串)追加到列表末尾; 输出键保存时按行序自动加 _2/_3 后缀, 无需处理
const copyMeasureRow = (index: number) => {
  pivotMeasureRows.value.push(JSON.parse(JSON.stringify(pivotMeasureRows.value[index])))
}

// ==================== 聚合字段条件(度量自身条件) ====================
// 与透视列条件按「且」叠加: 透视列圈定表头切片, 度量条件圈定该度量自己的口径
const activeMeasureIndex = ref(-1)

// 条件 JSON → 弹窗输入(兼容裸数组/单条件对象/已存成对象等历史写法, 与透视列条件同口径)
const parseConditionJson = (raw?: any): { list: any[], andOr: '0' | '1' } => {
  if (raw == null || raw === '') return { list: [], andOr: '0' }
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    const list = Array.isArray(parsed)
      ? parsed
      : (Array.isArray(parsed?.conditionList) ? parsed.conditionList : (parsed?.property ? [parsed] : []))
    return { list, andOr: (!Array.isArray(parsed) && parsed?.andOr === '1') ? '1' : '0' }
  } catch (e) {
    console.warn('解析度量条件失败:', e)
    return { list: [], andOr: '0' }
  }
}

// 配置里统一存 JSON 串(外部导入可能给对象): 否则回填/保存时的字符串操作会炸
const conditionToJson = (raw: any): string => {
  if (raw == null || raw === '') return ''
  return typeof raw === 'string' ? raw : JSON.stringify(raw)
}

// 确认即写回行内(点「保存基础配置」才落库); 条件清空则回落空串, 序列化时不落该键
const saveMeasureCondition = (condition: ConditionType) => {
  const measure = pivotMeasureRows.value[activeMeasureIndex.value]
  if (!measure) return
  const conditionList = pruneBlankConditions(condition?.conditionList || [])
  // relation 统一为数字(与透视列条件及历史数据一致, 弹窗返回的是字符串)
  conditionList.forEach((cond: any) => {
    if (cond?.relation != null && cond.relation !== '' && !isNaN(Number(cond.relation))) {
      cond.relation = Number(cond.relation)
    }
  })
  measure.condition = conditionList.length > 0
    ? JSON.stringify({ andOr: condition.andOr || '0', conditionList })
    : ''
  closeMeasureConditionModal()
}

const { filterConditionConfig: measureConditionModal, openConditionModal: openMeasureConditionModal, closeConditionModal: closeMeasureConditionModal } =
  useConditionModal(() => props.portalConfig?.columns, saveMeasureCondition)

const openMeasureCondition = async (index: number) => {
  activeMeasureIndex.value = index
  const parsed = parseConditionJson(pivotMeasureRows.value[index]?.condition)
  await openMeasureConditionModal(parsed.list, parsed.andOr)
}

/**
 * 度量输出键: 字段唯一时=字段(老配置零变更), 同字段第2条起加 _2/_3 后缀。
 * 键只作列别名后半段(${透视列}__${键}), 取数仍走 field; 行序即分配顺序
 */
const buildMeasureKeys = (rows: PivotMeasureVO[]): string[] => {
  const used = new Set<string>()
  return rows.map((m) => {
    const base = (m.field || '').trim()
    if (!base) return ''
    let key = base
    let n = 2
    while (used.has(key)) {
      key = `${base}_${n}`
      n++
    }
    used.add(key)
    return key
  })
}

// 编辑态行的输出键(默认排序候选/可排校验用, 与保存时序列化同源)
const measureKeysPreview = computed(() => buildMeasureKeys(pivotMeasureRows.value))

// ==================== 度量列注释 ====================
// 注释文本长(整段口径说明), 塞行内输入框会被挤成一截, 改为按钮开宽弹框编辑; 点「保存基础配置」才序列化落库
const descModal = reactive<{ open: boolean; index: number; draft: string; original: string; label: string }>({
  open: false,
  index: -1,
  draft: '',
  original: '',
  label: ''
})

const openDescEditor = (index: number) => {
  const measure = pivotMeasureRows.value[index]
  descModal.index = index
  descModal.original = measure.desc || ''
  descModal.draft = descModal.original
  descModal.label = measure.label || fieldChineseName(measure.field)
  descModal.open = true
}

const confirmDescEditor = () => {
  const measure = pivotMeasureRows.value[descModal.index]
  if (measure) {
    measure.desc = descModal.draft.trim()
  }
  descModal.open = false
}

const clearDescEditor = () => {
  descModal.draft = ''
  confirmDescEditor()
}

// ==================== 度量父表头(多层级) ====================
// 父链路径 string[](自外向内)序列化存 groupPath; 运行态与透视列父链拼接成多层表头, 叶子标题仍是度量显示名
const parseGroupPathDraft = (raw?: any): string[] => {
  if (raw == null || raw === '') return []
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(parsed) ? parsed.map((s) => String(s)).filter(Boolean) : []
  } catch (e) {
    console.warn('解析父表头路径失败:', e)
    return []
  }
}

// 统一存 JSON 串(外部导入可能给数组): 空链落空串, 序列化时不落该键
const groupPathToJson = (raw: any): string => {
  const path = parseGroupPathDraft(raw)
  return path.length > 0 ? JSON.stringify(path) : ''
}

const parseGroupPathLabel = (raw?: any): string => {
  const path = parseGroupPathDraft(raw)
  return path.length > 0 ? path.join(' / ') : ''
}

// 路径文本 <-> 层级数组: 以 / 或 ，, 分层, 前后空白剔除, 空段丢弃; 空路径落 ''(平铺)
const parsePathText = (text: string): string[] =>
  text.split(/[/，,]/).map((s) => s.trim()).filter(Boolean)
const pathTextToJson = (text: string): string => {
  const path = parsePathText(text)
  return path.length > 0 ? JSON.stringify(path) : ''
}

const pathModal = reactive<{ open: boolean; index: number; draft: string; label: string }>({
  open: false,
  index: -1,
  draft: '',
  label: ''
})

const openPathEditor = (index: number) => {
  const measure = pivotMeasureRows.value[index]
  pathModal.index = index
  pathModal.draft = parseGroupPathDraft(measure.groupPath).join(' / ')
  pathModal.label = measure.label || fieldChineseName(measure.field)
  pathModal.open = true
}

const writeBackPathDraft = () => {
  const measure = pivotMeasureRows.value[pathModal.index]
  if (measure) {
    measure.groupPath = pathTextToJson(pathModal.draft)
  }
  pathModal.open = false
}

const confirmPathEditor = () => {
  writeBackPathDraft()
}

const clearPathEditor = () => {
  pathModal.draft = ''
  writeBackPathDraft()
}

// 复制当前路径文本(整条可粘到其它度量或透视列的父表头输入框): clipboard API 在 http 内网不可用, 回退 execCommand
const copyPathDraft = async () => {
  const text = pathModal.draft
  if (!text) {
    message.warning('路径为空，无可复制')
    return
  }
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    message.success('父表头路径已复制')
  } catch (e) {
    console.error('复制父表头路径失败:', e)
    message.error('复制失败，请手动选择文本复制')
  }
}

// 合计列位置: 缺省视为 last(与列默认值一致), 避免首开下拉为空
const pivotTotalPosModel = computed<string>({
  get: () => tableForm.value.pivotTotalPos || 'last',
  set: (val) => { tableForm.value.pivotTotalPos = val }
})

// 总计行显隐: ''=跟随Portal配置(缺省), '1'=显示, '0'=隐藏
const pivotSummaryShowModel = computed<string>({
  get: () => tableForm.value.pivotSummaryShow || '',
  set: (val) => { tableForm.value.pivotSummaryShow = val }
})

// ==================== 报表默认排序 ====================
// 落库结构同 sys_portal.default_sort: [{property, type}] type 0=正序 1=倒序
const sortColumn = ref<string | undefined>(undefined)
// 默认正序: 只选字段不改方向时得到 ASC, 方向下拉在未按字段前置灰
const sortType = ref<number>(0)

/**
 * 排序字段候选
 * - 普通报表: 全部列(直接交给后端 ORDER BY 真实列)
 * - 透视模式: 外层只有 group by 列与聚合度量可排, 故取已勾选的行维度(含隐藏项) + 已填的聚合度量;
 *   同名字段既是行维度又是度量时按行维度取值(选项分组已标明归属)
 */
const sortFieldOptions = computed(() => {
  const displayNameOf = (property: string) =>
    strRemoveLF(props.availableFields.find((f) => f.property === property)?.displayName || property)
  if (tableForm.value.pivotMode === '1') {
    return [
      {
        label: '行维度字段',
        options: pivotGroupFields.value.map((p) => ({ value: p, label: `${displayNameOf(p)} (${p})` }))
      },
      {
        label: '聚合度量',
        options: pivotMeasureRows.value
          .map((m, index) => ({ measure: m, key: measureKeysPreview.value[index] }))
          .filter(({ measure, key }) => !!measure.field && !!key)
          .map(({ measure, key }) => ({
            value: key,
            label: `合计 ${measure.label || displayNameOf(measure.field)} (${measure.agg || 'sum'})`
          }))
      }
    ]
  }
  return props.availableFields.map((f) => ({ label: `${strRemoveLF(f.displayName)} (${f.property})`, value: f.property }))
})

/** 透视模式下当前可排序的字段集(行维度 + 度量输出键), 用于拦掉切模式后失效的残留选择 */
const isSortableInPivot = (property: string) =>
  pivotGroupFields.value.includes(property) || measureKeysPreview.value.includes(property)

// 解析 defaultSort JSON 到编辑状态(仅取第一项, 与 portal 级默认排序同约束)
const parseDefaultSort = (json: string | undefined) => {
  sortColumn.value = undefined
  sortType.value = 0
  if (!json) return
  try {
    const parsed = JSON.parse(json)
    const first = Array.isArray(parsed) ? parsed[0] : undefined
    if (first?.property) {
      sortColumn.value = first.property
      sortType.value = first.type === 1 ? 1 : 0
    }
  } catch (e) {
    console.warn('解析默认排序配置失败:', e)
  }
}

// ==================== Tab 成员配置(多Tab页面) ====================
// 本表格自身也作为一个 tab(默认勾选, 与成员在同一序列参与拖拽排序)
const tabSelfEnabled = ref(true)
// 本表格的 tab 名称(留空用表格编码)
const tabSelfLabel = ref('')
// Tab 成员编辑行(保存时按合并序列的当前顺序写入 table.tabItems)
const tabMemberRows = ref<Array<{ tableId: number | undefined; label: string }>>([])

const addTabMemberRow = () => {
  tabMemberRows.value.push({ tableId: undefined, label: '' })
}

// Tab 页拖拽排序: 宿主与成员在同一序列里调序(行序即 tab 页顺序, 宿主不再固定第 1 页)
const tabDragIndex = ref<number | null>(null)
// 宿主落位 = 它前面有几个成员(0 即第 1 页); 删成员时相对位置自然保持
const tabSelfPosition = ref(0)
// 合并序列展开/拼回时识别宿主的占位标记
const TAB_SELF_MARKER = { __tabSelf: true } as const

// 合并视图: 宿主按 tabSelfPosition 插进成员序列, 未勾选宿主时仅成员
const tabOrderedSlots = computed<Array<{ key: string; self: boolean; memberIndex: number }>>(() => {
  const slots: Array<{ key: string; self: boolean; memberIndex: number }> = []
  const selfPos = tabSelfEnabled.value
    ? Math.max(0, Math.min(tabSelfPosition.value, tabMemberRows.value.length))
    : -1
  let placed = false
  tabMemberRows.value.forEach((_, m) => {
    if (!placed && m === selfPos) {
      slots.push({ key: 'self', self: true, memberIndex: -1 })
      placed = true
    }
    slots.push({ key: `m${m}`, self: false, memberIndex: m })
  })
  if (!placed && selfPos >= 0) {
    slots.push({ key: 'self', self: true, memberIndex: -1 })
  }
  return slots
})

const onTabDragStart = (index: number, e: DragEvent) => {
  tabDragIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }
}
// 拖过某行即让位(实时预览最终顺序): 展开成条目序列 splice 后拼回宿主位置与成员顺序
const onTabDragOver = (index: number) => {
  const from = tabDragIndex.value
  if (from === null || from === index || index < 0) return
  const items: Array<typeof TAB_SELF_MARKER | { tableId: number | undefined; label: string }> =
    tabOrderedSlots.value.map((s) => (s.self ? TAB_SELF_MARKER : tabMemberRows.value[s.memberIndex]))
  const [moved] = items.splice(from, 1)
  items.splice(index, 0, moved)
  const selfIdx = items.indexOf(TAB_SELF_MARKER)
  if (selfIdx >= 0) {
    tabSelfPosition.value = selfIdx
  }
  tabMemberRows.value = items.filter((it) => it !== TAB_SELF_MARKER) as Array<{ tableId: number | undefined; label: string }>
  tabDragIndex.value = index
}
const onTabDragEnd = () => {
  tabDragIndex.value = null
}

// 成员候选: 同底表下其它表格, 且未被其它行选用(避免重复 tab)
const tabMemberOptions = (currentIndex: number) => {
  const usedIds = new Set(
    tabMemberRows.value
      .filter((_, i) => i !== currentIndex)
      .map((r) => r.tableId)
      .filter((id): id is number => id != null)
  )
  return (props.tableList || [])
    .filter((t) => t.id !== props.table.id && t.id != null && !usedIds.has(t.id))
    .map((t) => ({ label: `${t.tableCode} (ID:${t.id})`, value: t.id as number }))
}

// 解析 tabItems JSON 到编辑状态(按 tableId 识别宿主, 记下它在序列中的落位)
const parseTabItems = (json: string | undefined) => {
  tabSelfEnabled.value = false
  tabSelfLabel.value = ''
  tabMemberRows.value = []
  tabSelfPosition.value = 0
  if (!json) return
  try {
    const parsed = JSON.parse(json)
    if (!Array.isArray(parsed)) return
    let validIdx = 0
    parsed.forEach((it: any) => {
      const tableId = Number(it?.tableId)
      if (!Number.isFinite(tableId)) return
      if (tableId === props.table.id) {
        tabSelfEnabled.value = true
        tabSelfLabel.value = it?.label || ''
        tabSelfPosition.value = validIdx
      } else {
        tabMemberRows.value.push({ tableId, label: it?.label || '' })
      }
      validIdx++
    })
  } catch (e) {
    console.warn('解析 tabItems 失败:', e)
  }
}

// 聚合字段行归一化(落库 JSON 解析与导入文件共用同一映射, 字段缺省口径一致)
const normalizeMeasureRow = (m: any) => ({
  field: m.field || '',
  key: m.key || '',
  condition: conditionToJson(m.condition),
  groupPath: groupPathToJson(m.groupPath),
  label: m.label || '',
  desc: m.desc || '',
  agg: m.agg || 'sum',
  fixed: m.fixed === true,
  hideZero: m.hideZero === true,
  numerator: m.numerator || '',
  denominator: m.denominator || '',
  numeratorAgg: m.numeratorAgg || 'sum',
  denominatorAgg: m.denominatorAgg || 'sum',
})

// 解析 pivotMeasures JSON 到编辑行
const parsePivotMeasures = (json: string | undefined) => {
  if (!json) {
    pivotMeasureRows.value = []
    return
  }
  try {
    const parsed = JSON.parse(json)
    pivotMeasureRows.value = Array.isArray(parsed)
      ? parsed.map(normalizeMeasureRow)
      : []
  } catch (e) {
    console.warn('解析透视度量配置失败:', e)
    pivotMeasureRows.value = []
  }
}

// ==================== 聚合字段导入/导出 ====================
// 导出当前聚合字段配置为 JSON(与全表报表配置同一下载通道), 供其它表格配置导入套用, 免逐行手填
const measureImportInputRef = ref<HTMLInputElement | null>(null)
const handleExportMeasures = () => {
  if (!pivotMeasureRows.value.length) {
    message.warning('暂无聚合字段可导出')
    return
  }
  downloadJsonConfig(`${tableForm.value.portalName || '透视表'}-聚合字段配置`, {
    type: 'portalPivotMeasures',
    exportTime: new Date().toISOString(),
    measures: pivotMeasureRows.value,
  })
  message.success('导出成功')
}

// 导入聚合字段配置: 以文件为准整表替换(仅替换本地编辑行, 点「保存基础配置」才落库);
// 行映射走与落库解析同一套归一化, 同字段多条件行/输出键冲突仍由保存时的 _2/_3 后缀兜底
const handleImportMeasuresFile = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (!file) {
    return
  }
  try {
    const parsed = await readJsonFile(file)
    const rawList = Array.isArray(parsed) ? parsed : parsed?.measures
    if (!Array.isArray(rawList)) {
      message.warning('文件格式不正确：需要聚合字段配置 JSON（含 measures 数组）')
      return
    }
    const imported = rawList
      .filter((m: any) => m && m.field)
      .map(normalizeMeasureRow)
    if (!imported.length) {
      message.warning('文件里没有可导入的聚合字段（缺 field）')
      return
    }
    pivotMeasureRows.value = imported
    message.success(`已导入 ${imported.length} 个聚合字段，请确认字段在目标数据集存在，点「保存基础配置」生效`)
  } catch (e) {
    console.error('导入聚合字段失败:', e)
    message.error('导入失败：文件不是合法 JSON')
  }
}

// 初始化筛选列配置
const initFilterColumnsConfig = () => {
  if (!props.portalConfig?.columns) return

  // 获取当前要排除的列名列表
  const excludedColumns = props.table.filterColumns
    ? props.table.filterColumns.split(',').map((s: string) => s.trim())
    : []

  // 默认所有列都 checked = true，排除的列设为 false
  props.portalConfig.columns.forEach((column: any) => {
    if (excludedColumns.includes(column.property)) {
      column.checked = false
    } else {
      column.checked = true
    }
  })
}

// 计算已排除的列数量
const excludedColumnCount = computed(() => {
  if (!props.portalConfig?.columns) return 0
  return props.portalConfig.columns.filter((col: any) => col.checked === false).length
})

// 筛选列全选/反选(勾选=显示; 「已排除」数随勾选联动)
const checkAllFilterColumns = () => {
  const columns = props.portalConfig?.columns || []
  columns.forEach((column: any) => {
    column.checked = true
  })
}

const invertFilterColumns = () => {
  const columns = props.portalConfig?.columns || []
  columns.forEach((column: any) => {
    column.checked = !column.checked
  })
}

// 列顺序调整: 拖动时就地重排共享列数组(与父级/其他面板同一引用), 保存时按此顺序落 display_order
const dragIndex = ref<number | null>(null)
const onColumnDragStart = (index: number, e: DragEvent) => {
  dragIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }
}
// 拖过某行即让位(实时预览最终顺序), 松手时数组已是目标顺序, 无需单独的 drop 处理
const onColumnDragOver = (index: number) => {
  const from = dragIndex.value
  const columns = props.portalConfig?.columns
  if (from === null || from === index || !columns) return
  const [item] = columns.splice(from, 1)
  columns.splice(index, 0, item)
  dragIndex.value = index
}
const onColumnDragEnd = () => {
  dragIndex.value = null
}

// 切换表格时初始化筛选列勾选与透视行维度/度量编辑状态
watch(
  () => props.table,
  (table) => {
    if (!table) return
    initFilterColumnsConfig()
    // 初始化透视配置(兼容旧逗号串格式：默认全部显示、不排序)
    const rawGroupByFields = table.groupByFields || ''
    pivotGroupSorts.value = {}
    if (rawGroupByFields.trim().startsWith('[')) {
      try {
        const list = JSON.parse(rawGroupByFields) as Array<{ field: string; display?: boolean; sort?: number; fixed?: boolean }>
        pivotGroupFields.value = list.map((item) => item.field)
        pivotGroupHiddenFields.value = list.filter((item) => item.display === false).map((item) => item.field)
        pivotGroupFixedFields.value = list.filter((item) => item.fixed === true).map((item) => item.field)
        list.forEach((item) => {
          if (item.sort === 0 || item.sort === 1) {
            pivotGroupSorts.value[item.field] = item.sort
          }
        })
      } catch (e) {
        console.warn('解析行维度配置失败，按逗号串兜底:', e)
        pivotGroupFields.value = rawGroupByFields.split(',').map((s: string) => s.trim()).filter((s: string) => s)
        pivotGroupHiddenFields.value = []
        pivotGroupFixedFields.value = []
      }
    } else {
      pivotGroupFields.value = rawGroupByFields.split(',').map((s: string) => s.trim()).filter((s: string) => s)
      pivotGroupHiddenFields.value = []
      pivotGroupFixedFields.value = []
    }
    parsePivotMeasures(table.pivotMeasures)
    parseTabItems(table.tabItems)
    parseDefaultSort(table.defaultSort)
    parseFixedCondition(table.fixedCondition)
    // 锁定方向由两侧已存配置推导(界面保证只锁一边: 行维度有锁定→左锁, 度量有锁定→右锁);
    // pivotRow 布局无锁定方向(透视列部分恒左冻结): 恒为 '', 旧数据遗留的右锁/左锁推导一并回落
    pivotLockSide.value = pivotGroupFixedFields.value.length > 0
      ? 'left'
      : (pivotMeasureRows.value.some((m) => m.fixed) ? 'right' : '')
    if (tableForm.value.pivotMeasureLayout === 'pivotRow') {
      pivotLockSide.value = ''
    }
  },
  { immediate: true }
)

// 穿梭框过滤
const filterOption = (inputValue: string, option: any) => {
  const label = option.title || option.label || ''
  return label.toLowerCase().indexOf(inputValue.toLowerCase()) > -1
}

// 导入配置文件(实现委托父组件)
const handleReportFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  target.value = ''
  emit('import', file)
}

// 保存表格配置
const handleSaveTable = async () => {
  if (!props.table) return
  saving.value = true
  // 经 tableForm 别名写入同一对象，避免直接对 prop 赋值
  const table = tableForm.value
  try {
    // 构建 filterColumns：收集所有 checked = false 的列名
    const excludedColumns = (props.portalConfig?.columns || [])
      .filter((col: any) => col.checked === false)
      .map((col: any) => col.property)

    // 清空必须显式写空串：update 接口非 strict 模式跳过 null，取消全部排除列会清不掉旧值
    // 消费侧(运行态列过滤与本面板回显)一律 falsy 判定，空串与 null 等价
    table.filterColumns =
      excludedColumns.length > 0 ? excludedColumns.join(',') : ''

    // 默认排序: 未选字段写 '[]' 而非 null —— update 接口非 strict 模式会跳过 null, 无法清掉旧值
    // 透视模式下字段必须落在当前行维度/度量内, 否则渲染时命不中排序列(切模式残留的选择按不排序处理)
    let sortProperty: string | undefined = sortColumn.value
    if (sortProperty && table.pivotMode === '1' && !isSortableInPivot(sortProperty)) {
      sortProperty = undefined
    }
    table.defaultSort = sortProperty
      ? JSON.stringify([{ property: sortProperty, type: sortType.value }])
      : '[]'

    // 透视模式：序列化行维度与度量列配置
    if (table.pivotMode === '1') {
      // 行维度：按用户调整的顺序序列化为 JSON(顺序即分组层级，display=false 仅参与 group by 不显示，sort=聚合行排序，fixed=左锁方向下的锁定勾选)
      const groupConfig = pivotGroupFields.value.map((field) => {
        const cfg: { field: string; display: boolean; sort?: number; fixed?: boolean } = {
          field,
          display: !pivotGroupHiddenFields.value.includes(field),
        }
        if (pivotGroupSorts.value[field] === 0 || pivotGroupSorts.value[field] === 1) {
          cfg.sort = pivotGroupSorts.value[field]
        }
        if (pivotLockSide.value === 'left' && pivotGroupFixedFields.value.includes(field)) {
          cfg.fixed = true
        }
        return cfg
      })
      table.groupByFields =
        groupConfig.length > 0 ? JSON.stringify(groupConfig) : '[]'
      // 清理已取消勾选字段在隐藏列表/排序配置中的残留
      pivotGroupHiddenFields.value = pivotGroupHiddenFields.value.filter((f) => pivotGroupFields.value.includes(f))
      Object.keys(pivotGroupSorts.value).forEach((f) => {
        if (!pivotGroupFields.value.includes(f)) {
          delete pivotGroupSorts.value[f]
        }
      })

      // 度量列：过滤掉未选字段的空行(非右锁方向时清掉锁定标记, 保证只锁一边); ratio 行还要求分子/分母齐备
      const validRows = pivotMeasureRows.value
        .filter((m) => m.field && (m.agg !== 'ratio' || (m.numerator && m.denominator)))
      // 输出键按行序生成: 同字段多条件各出一列时第2条起加后缀, 老配置(字段唯一)键=字段
      const validKeys = buildMeasureKeys(validRows)
      const validMeasures = validRows
        .map((m, index) => ({
          ...m,
          key: validKeys[index],
          // 未配条件不落库(空串落库会被后端当成显式条件)
          condition: conditionToJson(m.condition).trim() || undefined,
          // 空父链不落库(与老配置零差异)
          groupPath: groupPathToJson(m.groupPath) || undefined,
          fixed: pivotLockSide.value === 'right' ? m.fixed === true : false,
          // 防呆: 隐藏零值仅对 sum 有意义, 改成其余聚合后不留无效配置
          hideZero: m.agg === 'sum' && m.hideZero === true,
          // 防呆: 比率分子/分母及两腿聚合仅对 ratio 有意义
          numerator: m.agg === 'ratio' ? m.numerator : undefined,
          denominator: m.agg === 'ratio' ? m.denominator : undefined,
          numeratorAgg: m.agg === 'ratio' ? (m.numeratorAgg || 'sum') : undefined,
          denominatorAgg: m.agg === 'ratio' ? (m.denominatorAgg || 'sum') : undefined,
          // 空注释不落库(JSON.stringify 会丢掉 undefined 键)
          desc: m.desc?.trim() || undefined
        }))
      table.pivotMeasures =
        validMeasures.length > 0 ? JSON.stringify(validMeasures) : '[]'
      // 保存后同步移除空行，界面与落库数据一致
      pivotMeasureRows.value = validMeasures
    }

    // Tab 成员: 按合并序列(拖拽后的显示顺序)落库, 宿主按 tableId 识别、可落在任意位置;
    // 全空则回退单表页面
    // 清空必须显式写 '[]'：update 接口非 strict 模式跳过 null/undefined，删掉的成员会原样留在库里
    const tabItemsPayload: Array<{ tableId: number; label?: string }> = []
    tabOrderedSlots.value.forEach((slot) => {
      if (slot.self) {
        if (table.id != null) {
          tabItemsPayload.push({ tableId: table.id, ...(tabSelfLabel.value ? { label: tabSelfLabel.value } : {}) })
        }
      } else {
        const r = tabMemberRows.value[slot.memberIndex]
        if (r?.tableId != null) {
          tabItemsPayload.push({ tableId: r.tableId as number, ...(r.label ? { label: r.label } : {}) })
        }
      }
    })
    table.tabItems = tabItemsPayload.length > 0 ? JSON.stringify(tabItemsPayload) : '[]'

    // 常驻条件: 无配置也要显式写空条件树, 否则非 strict update 跳过 null 清不掉旧值
    // andOr 是整组的关系('0'=与 '1'=或)，不存下来重开永远回退「与」
    table.fixedCondition = fixedRows.value.length > 0
      ? JSON.stringify({ andOr: fixedAndOr.value || '0', conditionList: fixedRows.value })
      : FIXED_CONDITION_EMPTY

    // 列顺序: 按面板当前顺序批量落 display_order(全员默认序, 列 id 来自 /config/full 的实体行);
    // 未调整时写回同值幂等, 与表格配置同批提交, 任一失败都不亮「保存成功」
    const orderedColumns = props.portalConfig?.columns || []
    if (orderedColumns.length > 0) {
      await updatePortalColumnOrder(
        orderedColumns.map((col: any, index: number) => ({ id: col.id, title: col.displayName, showOrder: index + 1 }))
      )
    }

    await updatePortalTable(table)
    message.success('保存成功')
    emit('saved')
  } catch (error) {
    console.error('保存失败:', error)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="less">
@import './portal-table-config.less';

.basic-config-section {
  flex-shrink: 0;
  margin-bottom: 16px;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  overflow: hidden;
}

.section-content {
  padding: 16px;
}

// 基础配置表单: 4 列网格两行排布, 标签右对齐固定宽、控件擑满格宽, 逐列对齐
.basic-form-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px 24px;

  :deep(.ant-form-item) {
    margin: 0;
  }

  :deep(.ant-form-item-label) {
    // 84px 容纳五字标签(筛选栏宽度)+冒号, 避免贴住控件
    flex: 0 0 84px;
    text-align: right;

    > label {
      color: var(--text-secondary);
    }
  }

  :deep(.ant-form-item-control) {
    flex: 1;
    min-width: 0;
  }

  // 常驻条件: 按钮擑满整格, 与同行的输入框/下拉框右边缘对齐
  .fixed-condition-row {
    display: flex;
    align-items: center;
    gap: 4px;
    width: 100%;
  }

  .fixed-condition-btn {
    flex: 1;
    min-width: 0;
  }
}

// 基础配置表单下方的一行说明
.basic-form-tip {
  margin-top: 12px;
  font-size: 12px;
  color: var(--text-tertiary);
  line-height: 1.6;
}

// 聚合配置 tab 度量行序号
.measure-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--primary-bg, #e6f4ff);
  color: var(--primary, #1677ff);
  font-size: 12px;
  flex-shrink: 0;
}

.filter-columns-config {
  margin-top: 16px;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  background: var(--bg-hover);

  .filter-columns-header {
    padding: 10px 16px;
    display: flex;
    align-items: center;
    gap: 8px;

    .filter-columns-title {
      font-weight: 500;
      font-size: 14px;
      color: var(--text-primary);
    }

    .filter-columns-count {
      font-size: 13px;
      color: var(--text-tertiary);
    }

    // 全选/反选按钮靠右
    .filter-columns-actions {
      margin-left: auto;
    }
  }

  .filter-columns-list {
    padding: 12px 16px;
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    border-top: 1px solid var(--border-subtle);
    max-height: 300px;
    overflow-y: auto;

    .ant-checkbox-wrapper {
      margin: 0;
      padding: 6px 10px;
      background: var(--bg-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: 4px;
      transition: all 0.2s;

      &:hover {
        border-color: var(--accent);
        background: var(--accent-soft);
      }

      &.ant-checkbox-wrapper-checked {
        background: var(--accent-soft);
        border-color: var(--accent);
        color: var(--accent);
        font-weight: 500;
      }

      &.ant-checkbox-wrapper-disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }
  }

  // 拖拽壳: draggable 不能挂在 a-checkbox 根元素上(它是 label, Chromium 不从 checkbox label 发起原生拖拽),
  // 壳紧贴芯片不添视觉; user-select 防 mousedown 起文本选择劫持拖拽
  .filter-columns-drag-shell {
    display: inline-flex;
    user-select: none;

    &[draggable='true'] {
      cursor: grab;
    }

    &.filter-columns-item-dragging {
      opacity: 0.6;
    }
  }
}

// 行维度顺序调整栏(字段名靠左, 右侧控件列固定宽度保证逐行对齐)
.pivot-group-order {
  padding: 10px 16px;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: 6px;

  .pivot-group-order-title {
    font-size: 13px;
    color: var(--text-secondary);
  }

  .pivot-group-order-item {
    display: flex;
    align-items: center;
    gap: 10px;

    .pivot-group-order-handle {
      flex-shrink: 0;
      color: var(--text-tertiary);
      cursor: grab;
    }

    &.pivot-group-order-item-dragging {
      opacity: 0.6;
    }

    .pivot-group-order-name {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    // 排序优先级固定占位: 无排序的行显示 "—", 保证行间控件列对齐
    .pivot-sort-priority {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      flex-shrink: 0;
      font-size: 12px;
      color: var(--accent, #1677ff);
    }
  }
}

// 聚合配置(并入基础配置 tab，卡片样式同 filter-columns-config)：度量行纵向排列
.measure-config-section {
  .measure-rows {
    padding: 12px 16px;
    border-top: 1px solid var(--border-subtle);
  }

  .pivot-measure-row {
    display: flex;
    align-items: center;
    // 行不换行: 宽度压力全部由可收缩的取值/显示名控件(带 min-width 下限)吸收,
    // 行尾操作区(父表头/条件/注释/复制/删除)加了按钮也不会把删除顶到第二行
    flex-wrap: nowrap;
    gap: 8px;

    .pivot-measure-row-handle {
      flex-shrink: 0;
      color: var(--text-tertiary);
      cursor: grab;
    }

    .measure-index,
    .ant-checkbox-wrapper,
    .ant-btn {
      flex-shrink: 0;
    }

    &.pivot-measure-row-dragging {
      opacity: 0.6;
    }
  }

  // 行尾操作区(父表头/条件/注释/复制/删除)整体贴右: 宽度由内容决定且不收缩 ⇒
  // 无论左侧控件多少(ratio 行有两套分子/分母), 各行的按钮起点都在同一条竖线上
  .pivot-measure-row .measure-row-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    margin-left: auto;
  }

  .pivot-measure-row + .pivot-measure-row {
    margin-top: 10px;
  }

  .measure-config-tip {
    padding: 8px 16px 0;
    font-size: 12px;
    color: var(--text-tertiary);
  }
}

// 度量父表头弹窗里的提示(teleport 到 body, 但 scoped 属性随组件渲染仍在)
.measure-path-tip {
  margin-top: 12px;
  font-size: 12px;
  color: var(--text-tertiary);
}

// 度量父表头弹窗: 路径输入框 + 复制按钮同行
.measure-path-input-row {
  display: flex;
  gap: 8px;

  :deep(.ant-input-affix-wrapper) {
    flex: 1;
  }
}

// Tab 成员配置(多Tab页面)
.tab-items-config {
  .tab-items-body {
    padding: 12px 16px;
    border-top: 1px solid var(--border-subtle);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .tab-items-tip {
    font-size: 12px;
    color: var(--text-tertiary);
    line-height: 1.6;
  }

  .tab-self-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  // 宿主行占位芯片: 与成员行的表格下拉(300px)同 footprint, 不可编辑仅标识
  .tab-self-chip {
    display: inline-flex;
    align-items: center;
    width: 300px;
    height: 32px;
    padding: 0 11px;
    border: 1px solid var(--border-subtle, #d9d9d9);
    border-radius: 4px;
    background: var(--bg-hover, #f5f5f5);
    color: var(--text-secondary, #666);
  }

  .tab-member-row {
    margin-top: 0;
  }
}
</style>
