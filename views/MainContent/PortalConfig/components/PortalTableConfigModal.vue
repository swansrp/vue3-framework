<template>
  <a-modal
    v-model:open="visible"
    :title="
      'DarkTable 配置' +
        (portalConfig?.displayName ? ' - ' + portalConfig.displayName : '')
    "
    width="1500px"
    :body-style="{ height: '75vh', overflow: 'hidden' }"
    :footer="null"
    @cancel="handleCancel"
  >
    <div class="table-config-container">
      <!-- 左侧：Table 配置列表 -->
      <div class="table-list-panel">
        <div class="panel-header">
          <span>表格配置列表</span>
          <a-button
            type="primary"
            size="small"
            @click="handleAddTable"
          >
            <template #icon>
              <PlusOutlined />
            </template>
            新增
          </a-button>
        </div>
        <div class="panel-content">
          <div
            v-for="table in tableList"
            :key="table.id"
            :class="['table-item', { active: selectedTable?.id === table.id }]"
            @click="handleSelectTable(table)"
          >
            <div class="table-item-content">
              <div class="table-name">
                {{ table.tableCode || "未命名" }}
              </div>
              <div class="table-info">
                ID: {{ table.id }} | 筛选项: {{ getFilterCount(table.id) }}
              </div>
            </div>
            <div class="table-item-actions">
              <a-button
                type="link"
                size="small"
                danger
                @click.stop="handleDeleteTable(table)"
              >
                <DeleteOutlined />
              </a-button>
            </div>
          </div>
          <a-empty
            v-if="tableList.length === 0"
            description="暂无配置"
          />
        </div>
      </div>

      <!-- 右侧：配置详情 -->
      <div class="config-detail-panel">
        <template v-if="selectedTable">
          <!-- 三个配置域并排 tab，避免纵向滚动 -->
          <a-tabs
            v-model:activeKey="configActiveTab"
            class="config-tabs"
          >
            <a-tab-pane
              key="basic"
              tab="基础配置"
            >
              <div class="tab-scroll">
                <!-- Table 基础配置 -->
                <div class="basic-config-section">
                  <div class="section-title">
                    <span>基础配置</span>
                    <a-space :size="4">
                      <a-button
                        size="small"
                        :loading="reportExporting"
                        @click="handleExportReportConfig"
                      >
                        <template #icon>
                          <DownloadOutlined />
                        </template>
                        导出配置
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
                        :loading="reportImporting"
                        @click="reportFileInputRef?.click()"
                      >
                        <template #icon>
                          <UploadOutlined />
                        </template>
                        导入配置
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
                      :model="selectedTable"
                      layout="inline"
                    >
                      <a-form-item label="表格编码">
                        <a-input
                          v-model:value="selectedTable.tableCode"
                          placeholder="请输入表格编码"
                          style="width: 150px"
                        />
                      </a-form-item>
                      <a-form-item label="筛选栏宽度">
                        <a-input-number
                          v-model:value="selectedTable.filterWidth"
                          :min="100"
                          :max="500"
                          style="width: 80px"
                        />
                      </a-form-item>
                      <a-form-item label="标题间隔">
                        <a-input-number
                          v-model:value="selectedTable.paddingTh"
                          :min="0"
                          :max="50"
                          style="width: 40px"
                        />
                      </a-form-item>
                      <a-form-item label="条目间隔">
                        <a-input-number
                          v-model:value="selectedTable.paddingTd"
                          :min="0"
                          :max="50"
                          style="width: 40px"
                        />
                      </a-form-item>
                      <a-form-item label="下载">
                        <a-select
                          v-model:value="selectedTable.downloadAble"
                          style="width: 80px"
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
                          v-model:value="selectedTable.pivotMode"
                          style="width: 80px"
                        >
                          <a-select-option value="1">
                            开启
                          </a-select-option>
                          <a-select-option value="0">
                            关闭
                          </a-select-option>
                        </a-select>
                      </a-form-item>
                      <a-form-item label="状态">
                        <a-select
                          v-model:value="selectedTable.status"
                          style="width: 80px"
                        >
                          <a-select-option value="1">
                            启用
                          </a-select-option>
                          <a-select-option value="0">
                            禁用
                          </a-select-option>
                        </a-select>
                      </a-form-item>
                    </a-form>

                    <!-- 筛选列配置(透视模式下由行维度字段配置取代，隐藏) -->
                    <div
                      v-if="selectedTable.pivotMode !== '1'"
                      class="filter-columns-config"
                    >
                      <div class="filter-columns-header">
                        <span class="filter-columns-title">筛选列配置</span>
                        <span class="filter-columns-count">（已排除 {{ excludedColumnCount }} 列）</span>
                      </div>
                      <div class="filter-columns-list">
                        <a-checkbox
                          v-for="column in portalConfig?.columns || []"
                          :key="column.property"
                          v-model:checked="column.checked"
                        >
                          {{ column.displayName }} ({{ column.property }})
                        </a-checkbox>
                      </div>
                    </div>

                    <!-- 行维度字段配置(透视模式，样式同筛选列配置) -->
                    <div
                      v-if="selectedTable.pivotMode === '1'"
                      class="filter-columns-config"
                    >
                      <div class="filter-columns-header">
                        <span class="filter-columns-title">行维度字段配置</span>
                        <span class="filter-columns-count">（已勾选 {{ pivotGroupFields.length }} 个字段）</span>
                      </div>
                      <div class="filter-columns-list">
                        <a-checkbox-group v-model:value="pivotGroupFields">
                          <a-checkbox
                            v-for="field in availableFields"
                            :key="field.property"
                            :value="field.property"
                          >
                            {{ field.displayName }} ({{ field.property }})
                          </a-checkbox>
                        </a-checkbox-group>
                      </div>
                      <!-- 行维度顺序调整(决定 group by 层级) -->
                      <div
                        v-if="pivotGroupFields.length > 0"
                        class="pivot-group-order"
                      >
                        <span class="pivot-group-order-title">行维度顺序（自上而下的分组层级，也是排序优先级）：</span>
                        <div
                          v-for="(fieldProp, index) in pivotGroupFields"
                          :key="fieldProp"
                          class="pivot-group-order-item"
                        >
                          <span class="measure-index">{{ index + 1 }}</span>
                          <span class="pivot-group-order-name">{{ pivotGroupFieldDisplayName(fieldProp) }}</span>
                          <a-checkbox
                            :checked="!pivotGroupHiddenFields.includes(fieldProp)"
                            @change="(e: any) => togglePivotGroupFieldDisplay(fieldProp, e.target.checked)"
                          >
                            表格显示
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
                            <a-select-option :value="0">正序</a-select-option>
                            <a-select-option :value="1">倒序</a-select-option>
                          </a-select>
                          <!-- 排序优先级: 多个字段配置排序时按行维度顺序生效, 随 ↑↓ 调整自动重算 -->
                          <a-tag
                            v-if="pivotGroupSortPriority[fieldProp]"
                            color="blue"
                          >
                            排序优先级 {{ pivotGroupSortPriority[fieldProp] }}
                          </a-tag>
                          <a-button
                            type="text"
                            size="small"
                            :disabled="index === 0"
                            @click="movePivotGroupField(index, -1)"
                          >
                            <template #icon>
                              <ArrowUpOutlined />
                            </template>
                          </a-button>
                          <a-button
                            type="text"
                            size="small"
                            :disabled="index === pivotGroupFields.length - 1"
                            @click="movePivotGroupField(index, 1)"
                          >
                            <template #icon>
                              <ArrowDownOutlined />
                            </template>
                          </a-button>
                        </div>
                      </div>
                    </div>

                    <!-- 聚合配置(透视模式，与行维度同存 sys_portal_table，合并到基础配置) -->
                    <div
                      v-if="selectedTable.pivotMode === '1'"
                      class="filter-columns-config measure-config-section"
                    >
                      <div class="filter-columns-header">
                        <span class="filter-columns-title">聚合字段（度量列）</span>
                        <a-button
                          type="primary"
                          size="small"
                          @click="pivotMeasureRows.push({ field: '', label: '', agg: 'sum' })"
                        >
                          <template #icon>
                            <PlusOutlined />
                          </template>
                          添加聚合字段
                        </a-button>
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
                        >
                          <span class="measure-index">{{ index + 1 }}</span>
                          <a-select
                            v-model:value="measure.field"
                            :options="availableFields.map((f) => ({ label: `${f.displayName} (${f.property})`, value: f.property }))"
                            placeholder="聚合字段"
                            show-search
                            :filter-option="filterOption"
                            style="width: 300px"
                          />
                          <a-input
                            v-model:value="measure.label"
                            placeholder="显示名"
                            style="width: 180px"
                          />
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
                          </a-select>
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
                </div>
              </div>
            </a-tab-pane>

            <a-tab-pane
              key="filter"
              tab="筛选项配置"
            >
              <!-- 筛选项配置 - 左右分栏 -->
              <div class="filter-config-section tab-fill-section">
                <div class="section-title">
                  <span>筛选项配置</span>
                  <a-button
                    v-if="selectedFilter"
                    type="primary"
                    size="small"
                    :loading="savingFilter"
                    @click="handleSaveFilter(selectedFilter)"
                  >
                    保存配置
                  </a-button>
                </div>
                <div class="filter-config-content">
                  <!-- 左侧：字段列表 -->
                  <div class="filter-list-panel">
                    <div class="filter-list-header">
                      <span>字段列表 ({{ filterList.length }})</span>
                      <a-button
                        type="primary"
                        size="small"
                        @click="showAddFilterModal = true"
                      >
                        <template #icon>
                          <EditOutlined />
                        </template>
                        编辑
                      </a-button>
                    </div>
                    <div class="filter-list-content">
                      <div
                        v-for="(filter, index) in filterList"
                        :key="filter.id || index"
                        :class="[
                          'filter-item',
                          {
                            active: selectedFilter?.id === filter.id,
                            'drag-over': dragOverIndex === index,
                          },
                        ]"
                        draggable="true"
                        @click="handleSelectFilter(filter)"
                        @dragstart="handleDragStart($event, index)"
                        @dragover="handleDragOver($event, index)"
                        @drop="handleDrop($event, index)"
                        @dragend="handleDragEnd"
                      >
                        <div class="drag-handle">
                          <HolderOutlined />
                        </div>
                        <div class="filter-item-content">
                          <div class="filter-item-label">
                            {{ filter.label }}
                          </div>
                          <div class="filter-item-type">
                            {{ getFilterTypeLabel(filter.filterType) }}
                          </div>
                        </div>
                        <div class="filter-item-actions">
                          <a-popconfirm
                            title="确定删除该筛选项？"
                            @confirm="handleDeleteFilter(filter)"
                          >
                            <a-button
                              type="link"
                              size="small"
                              danger
                              @click.stop
                            >
                              <DeleteOutlined />
                            </a-button>
                          </a-popconfirm>
                        </div>
                      </div>
                      <a-empty
                        v-if="filterList.length === 0"
                        description="暂无筛选项"
                      />
                    </div>
                  </div>

                  <!-- 右侧：字段配置详情 -->
                  <div class="filter-detail-panel">
                    <template v-if="selectedFilter">

                      <div class="filter-detail-header">
                        <span class="filter-detail-title">
                          配置项：{{ selectedFilter.label }}
                        </span>
                      </div>
                      <div class="filter-detail-content">
                        <a-form
                          :model="selectedFilter"
                          :label-col="{ span: 6 }"
                          :wrapper-col="{ span: 18 }"
                        >
                          <a-row :gutter="24">
                            <a-col :span="12">
                              <a-form-item label="字段编码">
                                <a-input
                                  v-model:value="selectedFilter.code"
                                  placeholder="请输入字段编码"
                                />
                              </a-form-item>
                            </a-col>
                            <a-col :span="12">
                              <a-form-item label="字段标签">
                                <a-input
                                  v-model:value="selectedFilter.label"
                                  placeholder="请输入字段标签"
                                />
                              </a-form-item>
                            </a-col>
                            <a-col :span="12">
                              <a-form-item label="筛选类型">
                                <a-select
                                  v-model:value="selectedFilter.filterType"
                                  :options="filterTypeOptions"
                                  style="width: 100%"
                                  @change="handleFilterTypeChange"
                                />
                              </a-form-item>
                            </a-col>
                            <a-col :span="12">
                              <a-form-item label="字典编码">
                                <a-select
                                  v-model:value="selectedFilter.dictCode"
                                  :filter-option="filterOption"
                                  :options="sysDictList"
                                  placeholder="下拉选择类型需要填写字典编码"
                                  show-search
                                  style="width: 100%"
                                  allow-clear
                                />
                              </a-form-item>
                            </a-col>
                            <a-col :span="12">
                              <a-form-item label="占位文本">
                                <a-input
                                  v-model:value="selectedFilter.placeholder"
                                  placeholder="请输入占位文本"
                                />
                              </a-form-item>
                            </a-col>
                            <a-col :span="12">
                              <a-form-item label="默认值">
                                <a-input
                                  v-model:value="selectedFilter.defaultValue"
                                  placeholder="请输入默认值"
                                />
                              </a-form-item>
                            </a-col>
                            <a-col :span="12">
                              <a-form-item label="通用筛选条件">
                                <a-button @click="openDefaultConditionModal">
                                  {{
                                    hasDefaultCondition ? "已配置通用条件" : "配置通用条件"
                                  }}
                                </a-button>
                              </a-form-item>
                            </a-col>
                            <a-col :span="24">
                              <a-form-item
                                label="特殊选项条件"
                                :label-col="{ span: 3 }"
                                :wrapper-col="{ span: 21 }"
                              >
                                <div class="option-condition-section">
                                  <div class="option-condition-header">
                                    <span>为字典选项配置专属条件（可选）</span>
                                    <a-button
                                      v-if="selectedFilter.dictCode"
                                      type="link"
                                      size="small"
                                      @click="loadFilterDictOptions"
                                    >
                                      加载字典选项
                                    </a-button>
                                  </div>
                                  <div
                                    v-if="filterDictOptions.length > 0"
                                    class="option-condition-list"
                                  >
                                    <div
                                      v-for="option in filterDictOptions"
                                      :key="option.value"
                                      class="option-condition-item"
                                    >
                                      <span class="option-label">{{ option.label }}</span>
                                      <span class="option-value">({{ option.value }})</span>
                                      <a-button
                                        type="link"
                                        size="small"
                                        @click="openOptionConditionModal(option.value)"
                                      >
                                        {{
                                          conditionConfig.options[option.value]
                                            ? "已配置"
                                            : "配置"
                                        }}
                                      </a-button>
                                      <a-button
                                        v-if="conditionConfig.options[option.value]"
                                        type="link"
                                        size="small"
                                        danger
                                        @click="removeOptionCondition(option.value)"
                                      >
                                        删除
                                      </a-button>
                                    </div>
                                  </div>
                                  <a-empty
                                    v-else-if="selectedFilter.dictCode"
                                    description="点击上方按钮加载字典选项"
                                  />
                                  <a-empty
                                    v-else
                                    description="请先选择字典编码"
                                  />
                                </div>
                              </a-form-item>
                            </a-col>
                            <a-col :span="12">
                              <a-form-item label="是否多选">
                                <a-radio-group v-model:value="selectedFilter.multiple">
                                  <a-radio value="1">
                                    是
                                  </a-radio>
                                  <a-radio value="0">
                                    否
                                  </a-radio>
                                </a-radio-group>
                              </a-form-item>
                            </a-col>
                            <a-col :span="12">
                              <a-form-item label="允许清空">
                                <a-radio-group v-model:value="selectedFilter.allowClear">
                                  <a-radio value="1">
                                    是
                                  </a-radio>
                                  <a-radio value="0">
                                    否
                                  </a-radio>
                                </a-radio-group>
                              </a-form-item>
                            </a-col>
                          </a-row>
                        </a-form>
                      </div>
                    </template>
                    <a-empty
                      v-else
                      description="请选择一个筛选项进行配置"
                    />
                  </div>
                </div>
              </div>
            </a-tab-pane>

            <a-tab-pane
              key="pivot"
              tab="透视列配置"
              :disabled="selectedTable.pivotMode !== '1'"
            >
              <!-- 透视列配置(父表头条件列) -->
              <div class="filter-config-section pivot-config-section tab-fill-section">
                <div class="section-title">
                  <span>透视列配置（父表头条件列）</span>
                  <a-space :size="4">
                    <a-button
                      size="small"
                      @click="openGenPivotModal"
                    >
                      按字典批量生成
                    </a-button>
                    <a-button
                      type="primary"
                      size="small"
                      :loading="savingPivotColumn"
                      @click="handleSavePivotColumn"
                    >
                      保存配置
                    </a-button>
                  </a-space>
                </div>
                <div class="filter-config-content">
                  <div class="filter-list-panel">
                    <div class="filter-list-header">
                      <span>透视列 ({{ pivotColumnList.length }})</span>
                      <a-button
                        type="primary"
                        size="small"
                        @click="handleAddPivotColumn"
                      >
                        <template #icon>
                          <PlusOutlined />
                        </template>
                        新增
                      </a-button>
                    </div>
                    <div class="filter-list-content">
                      <div
                        v-for="(column, index) in pivotColumnList"
                        :key="column.id || 'unsaved'"
                        :class="[
                          'filter-item',
                          {
                            active: selectedPivotColumn === column,
                            'drag-over': pivotDragOverIndex === index,
                          },
                        ]"
                        draggable="true"
                        @click="selectedPivotColumn = column"
                        @dragstart="handlePivotDragStart($event, index)"
                        @dragover="handlePivotDragOver($event, index)"
                        @drop="handlePivotDrop($event, index)"
                        @dragend="handlePivotDragEndReset"
                      >
                        <div class="drag-handle">
                          <HolderOutlined />
                        </div>
                        <div class="filter-item-content">
                          <div class="filter-item-label">
                            {{ column.itemName || '未命名' }}
                          </div>
                          <div class="filter-item-type">
                            {{ column.itemValue }}
                          </div>
                        </div>
                        <div class="filter-item-actions">
                          <a-popconfirm
                            title="确定删除该透视列？"
                            @confirm="handleDeletePivotColumn(column)"
                          >
                            <a-button
                              type="link"
                              size="small"
                              danger
                              @click.stop
                            >
                              <DeleteOutlined />
                            </a-button>
                          </a-popconfirm>
                        </div>
                      </div>
                      <a-empty
                        v-if="pivotColumnList.length === 0"
                        description="暂无透视列"
                      />
                    </div>
                  </div>
                  <div class="filter-detail-panel">
                    <template v-if="selectedPivotColumn">
                      <div class="filter-detail-header">
                        <span class="filter-detail-title">
                          透视列：{{ selectedPivotColumn.itemName || '未命名' }}
                        </span>
                        <a-button
                          size="small"
                          @click="openPivotConditionModal"
                        >
                          {{ hasPivotCondition ? '已配置列条件' : '配置列条件' }}
                        </a-button>
                      </div>
                      <div class="filter-detail-content">
                        <a-form
                          :model="selectedPivotColumn"
                          :label-col="{ span: 6 }"
                          :wrapper-col="{ span: 18 }"
                        >
                          <a-row :gutter="24">
                            <a-col :span="12">
                              <a-form-item label="列标识">
                                <a-select
                                  v-model:value="selectedPivotColumn.itemValue"
                                  :options="pivotItemValueOptions"
                                  :placeholder="pivotItemValueOptions.length > 0 ? '请选择列标识' : '请先配置列条件'"
                                  show-search
                                  allow-clear
                                />
                              </a-form-item>
                            </a-col>
                            <a-col :span="12">
                              <a-form-item label="表头名称">
                                <a-input
                                  v-model:value="selectedPivotColumn.itemName"
                                  placeholder="父表头显示名称"
                                />
                              </a-form-item>
                            </a-col>
                            <a-col :span="12">
                              <a-form-item label="显示顺序">
                                <a-input-number
                                  v-model:value="selectedPivotColumn.displayOrder"
                                  :min="1"
                                  style="width: 100%"
                                />
                              </a-form-item>
                            </a-col>
                            <a-col :span="12">
                              <a-form-item label="状态">
                                <a-select v-model:value="selectedPivotColumn.status">
                                  <a-select-option value="1">
                                    启用
                                  </a-select-option>
                                  <a-select-option value="0">
                                    禁用
                                  </a-select-option>
                                </a-select>
                              </a-form-item>
                            </a-col>
                          </a-row>
                        </a-form>
                        <!-- 列条件 JSON 编辑区：可手动修改/粘贴，保存配置时校验应用 -->
                        <div class="pivot-condition-json">
                          <div class="pivot-condition-json-header">
                            <span>列条件 JSON</span>
                            <span class="pivot-condition-json-tip">可直接编辑/粘贴，点「保存配置」校验后生效</span>
                          </div>
                          <a-textarea
                            v-model:value="conditionJsonDraft"
                            :rows="10"
                            class="pivot-condition-json-textarea"
                            placeholder="{&quot;andOr&quot;:&quot;0&quot;,&quot;conditionList&quot;:[...]}"
                          />
                        </div>
                      </div>
                    </template>
                    <a-empty
                      v-else
                      description="请选择或新增一个透视列进行配置"
                    />
                  </div>
                </div>
              </div>
            </a-tab-pane>
          </a-tabs>
        </template>
        <a-empty
          v-else
          description="请选择或新增一个表格配置"
        />
      </div>
    </div>

    <!-- 筛选条件配置弹窗 -->
    <portal-advanced-search-modal
      :advanced-condition="filterConditionConfig"
      @confirm="saveFilterCondition"
    />

    <!-- 添加筛选项弹窗 -->
    <a-modal
      v-model:open="showAddFilterModal"
      title="管理筛选项"
      width="1000px"
      :body-style="{ height: '70vh', overflow: 'hidden', padding: '0' }"
      :footer="null"
      @cancel="handleCloseAddFilterModal"
    >
      <div class="add-filter-container">
        <!-- 左侧：字段勾选 -->
        <div class="add-filter-fields-panel">
          <div class="add-filter-fields-header">
            <a-input
              v-model:value="fieldSearchKeyword"
              allow-clear
              placeholder="搜索字段名称或编码"
              style="width: 100%"
            >
              <template #prefix>
                <SearchOutlined />
              </template>
            </a-input>
          </div>
          <div class="add-filter-fields-list">
            <label
              v-for="field in filteredAvailableFields"
              :key="field.key"
              :class="['add-filter-field-item', { checked: isFieldSelected(field.key) }]"
            >
              <a-checkbox
                :checked="isFieldSelected(field.key)"
                :disabled="modalSaving"
                @change="(e: any) => handleFieldToggle(field, e.target.checked)"
              >
                <div class="field-info">
                  <span class="field-name">{{ field.displayName }}</span>
                  <span class="field-code">{{ field.property }}</span>
                </div>
              </a-checkbox>
            </label>
            <a-empty
              v-if="filteredAvailableFields.length === 0"
              description="无匹配字段"
            />
          </div>
        </div>

        <!-- 右侧：已选筛选项（可拖拽排序、编辑名称） -->
        <div class="add-filter-selected-panel">
          <div class="add-filter-selected-header">
            <span class="selected-title">已选筛选项 ({{ modalFilterList.length }})</span>
            <span class="drag-tip">拖拽调整顺序</span>
          </div>
          <div class="add-filter-selected-list">
            <div
              v-for="(item, index) in modalFilterList"
              :key="item.uid"
              :class="[
                'modal-filter-card',
                { 'drag-over': modalDragOverIndex === index },
              ]"
              draggable="true"
              @dragstart="handleModalDragStart($event, index)"
              @dragover.prevent="modalDragOverIndex = index"
              @drop="handleModalDrop($event, index)"
              @dragend="handleModalDragEnd"
            >
              <div class="card-top-bar">
                <div class="modal-filter-index">
                  {{ index + 1 }}
                </div>
                <div class="drag-handle">
                  <HolderOutlined />
                </div>
              </div>
              <a-input
                v-model:value="item.label"
                size="small"
                placeholder="筛选项名称"
                style="width: 100%"
                @blur="handleModalLabelSave(item)"
                @press-enter="handleModalLabelSave(item)"
              />
              <div class="card-bottom-bar">
                <span class="modal-filter-code">{{ item.code || item.property }}</span>
                <span class="modal-filter-type-tag">{{
                  getFilterTypeLabel(item.filterType)
                }}</span>
              </div>
            </div>
            <a-empty
              v-if="modalFilterList.length === 0"
              description="请从左侧勾选字段添加筛选项"
            />
          </div>
        </div>
      </div>
    </a-modal>

    <!-- 按字典批量生成透视列弹窗 -->
    <a-modal
      v-model:open="showGenPivotModal"
      title="按字典批量生成透视列"
      width="960px"
      :mask-closable="false"
      class="gen-pivot-modal"
      @ok="handleConfirmGenPivot"
    >
      <a-form
        layout="vertical"
        :colon="false"
      >
        <a-form-item label="生成来源">
          <a-radio-group
            v-model:value="genSource"
            button-style="solid"
            @change="handleGenSourceChange"
          >
            <a-radio-button value="indicator">复用图表指标</a-radio-button>
            <a-radio-button value="dict">按字典生成</a-radio-button>
            <a-radio-button value="cross">两字典组合</a-radio-button>
          </a-radio-group>
        </a-form-item>
        <template v-if="genSource === 'indicator'">
          <a-form-item label="指标组（组内每个指标生成一个透视列，条件直接复用指标条件）">
            <a-select
              v-model:value="genIndicatorGroup"
              show-search
              :loading="genLoading"
              :filter-option="filterOption"
              placeholder="选择指标组"
              :options="genIndicatorGroups.map((g) => ({ label: `${g.groupName}（${g.items.length}个指标）`, value: g.groupId }))"
              @change="(val: any) => handleGenGroupChange(val)"
            />
          </a-form-item>
        </template>
        <template v-else-if="genSource === 'cross'">
          <div class="gen-cross-wrap">
            <div class="gen-cross-dim">
              <div class="gen-cross-dim-title">组合维度 A</div>
              <a-form-item label="条件字段">
                <a-select
                  :value="genFieldA"
                  show-search
                  :filter-option="filterOption"
                  placeholder="选择字段"
                  :options="availableFields.map((f) => ({ label: `${f.displayName} (${f.property})`, value: f.property }))"
                  @change="(val: any) => { genFieldA = val; handleGenCrossFieldChange('A', val) }"
                />
              </a-form-item>
              <a-form-item label="字典编码">
                <a-input
                  v-model:value="genDictCodeA"
                  placeholder="字典编码"
                />
              </a-form-item>
              <a-form-item label="字典层级">
                <a-radio-group
                  v-model:value="genDictModeA"
                  button-style="solid"
                  size="small"
                >
                  <a-radio-button value="flat">平铺</a-radio-button>
                  <a-radio-button value="treeParent">树-父层</a-radio-button>
                  <a-radio-button value="treeLeaf">树-叶子</a-radio-button>
                </a-radio-group>
              </a-form-item>
            </div>
            <div class="gen-cross-dim">
              <div class="gen-cross-dim-title">组合维度 B</div>
              <a-form-item label="条件字段">
                <a-select
                  :value="genFieldB"
                  show-search
                  :filter-option="filterOption"
                  placeholder="选择字段"
                  :options="availableFields.map((f) => ({ label: `${f.displayName} (${f.property})`, value: f.property }))"
                  @change="(val: any) => { genFieldB = val; handleGenCrossFieldChange('B', val) }"
                />
              </a-form-item>
              <a-form-item label="字典编码">
                <a-input
                  v-model:value="genDictCodeB"
                  placeholder="字典编码"
                />
              </a-form-item>
              <a-form-item label="字典层级">
                <a-radio-group
                  v-model:value="genDictModeB"
                  button-style="solid"
                  size="small"
                >
                  <a-radio-button value="flat">平铺</a-radio-button>
                  <a-radio-button value="treeParent">树-父层</a-radio-button>
                  <a-radio-button value="treeLeaf">树-叶子</a-radio-button>
                </a-radio-group>
              </a-form-item>
            </div>
          </div>
          <a-form-item label=" ">
            <a-button
              type="primary"
              :loading="genLoading"
              @click="loadCrossItems"
            >
              加载组合预览
            </a-button>
            <span class="gen-cross-tip">每个 A×B 组合生成一列，条件为两个等于条件 AND</span>
          </a-form-item>
        </template>
        <template v-else>
          <a-form-item label="条件字段（统计列按该字段的取值分列）">
            <a-select
              :value="genPivotField"
              show-search
              :filter-option="filterOption"
              placeholder="选择字段"
              :options="availableFields.map((f) => ({ label: `${f.displayName} (${f.property})`, value: f.property }))"
              @change="(val: any) => { genPivotField = val; handleGenFieldChange(val) }"
            />
          </a-form-item>
          <a-form-item label="字典编码（默认取自字段的字典引用，可手工修改）">
            <a-input
              v-model:value="genDictCode"
              placeholder="字典编码"
              @press-enter="loadGenItems"
            />
          </a-form-item>
          <a-form-item label="字典层级">
            <a-radio-group
              v-model:value="genDictMode"
              button-style="solid"
            >
              <a-radio-button value="flat">平铺字典</a-radio-button>
              <a-radio-button value="treeParent">树形-父层</a-radio-button>
              <a-radio-button value="treeLeaf">树形-叶子层</a-radio-button>
            </a-radio-group>
            <a-button
              type="primary"
              size="small"
              :loading="genLoading"
              style="margin-left: 12px"
              @click="loadGenItems"
            >
              加载预览
            </a-button>
          </a-form-item>
        </template>
      </a-form>
      <div
        v-if="genItems.length > 0"
        class="gen-pivot-preview"
      >
        <div class="gen-pivot-preview-header">
          <span>将生成 {{ genItems.filter((i) => i.checked).length }} / {{ genItems.length }} 个透视列</span>
          <a-checkbox
            :checked="genItems.length > 0 && genItems.every((i) => i.checked)"
            :indeterminate="genItems.some((i) => i.checked) && !genItems.every((i) => i.checked)"
            @change="(e: any) => toggleGenAll(e.target.checked)"
          >
            全选
          </a-checkbox>
        </div>
        <div class="gen-pivot-preview-list">
          <div
            v-for="(item, index) in genItems"
            :key="item.value"
            :class="['gen-pivot-preview-item', { 'gen-drag-over': genDragOverIndex === index }]"
            draggable="true"
            @dragstart="handleGenDragStart($event, index)"
            @dragover.prevent="genDragOverIndex = index"
            @dragleave="genDragOverIndex = -1"
            @drop="handleGenDrop($event, index)"
          >
            <a-checkbox v-model:checked="item.checked">
              {{ item.label }}（{{ item.value }}）
            </a-checkbox>
            <span class="gen-pivot-preview-actions">
              <a-button
                type="text"
                size="small"
                :disabled="index === 0"
                title="上移"
                @click="moveGenItem(index, -1)"
              >
                <template #icon>
                  <ArrowUpOutlined />
                </template>
              </a-button>
              <a-button
                type="text"
                size="small"
                :disabled="index === genItems.length - 1"
                title="下移"
                @click="moveGenItem(index, 1)"
              >
                <template #icon>
                  <ArrowDownOutlined />
                </template>
              </a-button>
            </span>
          </div>
        </div>
      </div>
      <template #footer>
        <a-button @click="showGenPivotModal = false">取消</a-button>
        <a-button
          type="primary"
          :loading="genSaving"
          :disabled="genItems.filter((i) => i.checked).length === 0"
          @click="handleConfirmGenPivot"
        >
          确认生成
        </a-button>
      </template>
    </a-modal>
  </a-modal>
</template>

<script setup lang="ts">
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  HolderOutlined,
  PlusOutlined,
  SearchOutlined,
  UploadOutlined,
} from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'
import { ref, watch, computed } from 'vue'

import {
  addPortalTable,
  addPortalTableFilter,
  addPortalPivotColumn,
  addPortalPivotColumnList,
  deletePortalTable,
  deletePortalTableFilter,
  deletePortalTableFilterList,
  deletePortalPivotColumn,
  FILTER_TYPE_OPTIONS,
  PivotMeasureVO,
  PortalPivotColumnVO,
  PortalTableFilterVO,
  PortalTableVO,
  getPortalTableFilterList,
  getPortalTableList,
  getPortalPivotColumnList,
  updatePortalTable,
  updatePortalTableFilter,
  updatePortalTableFilterOrder,
  updatePortalPivotColumn,
  updatePortalPivotColumnOrder,
  IdOrderReqVO,
} from '@/framework/apis/portal/table'
import { getIndicatorConfig } from '@/framework/apis/portal'
import { ConditionType } from '@/framework/components/common/AdvancedSearch/type'
import { fetchTreeDict, flattenTreeToParentGroups } from '@/framework/components/common/chart/utils/treeStacked'
import PortalAdvancedSearchModal from '@/framework/components/common/Portal/modal/PortalAdvancedSearchModal.vue'
import { FILTER_TYPE } from '@/framework/components/common/Portal/type'
import { buildCondition } from '@/framework/components/common/Portal/utils'
import { dictStore } from '@/framework/store/common'
import { downloadJsonConfig, readJsonFile } from '@/framework/utils/configTransfer'

const props = defineProps<{
  modelValue: boolean;
  portalName?: string;
  portalConfig?: any;
  columns?: any[];
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>()

const dict = dictStore()

const visible = ref(false)
const saving = ref(false)
const savingFilter = ref(false)
const loadingFilters = ref(false)
const tableList = ref<PortalTableVO[]>([])
const selectedTable = ref<PortalTableVO | null>(null)
const filterList = ref<PortalTableFilterVO[]>([])
const filterCountMap = ref<Map<number, number>>(new Map())
const selectedFilter = ref<PortalTableFilterVO | null>(null)
// 导出/导入状态
const reportExporting = ref(false)
const reportImporting = ref(false)
const reportFileInputRef = ref<HTMLInputElement>()

// 配置域 tab 当前页(基础配置/筛选项配置/透视列配置)
const configActiveTab = ref('basic')
// 关闭透视模式时若停留在透视相关 tab，自动回基础配置
watch(
  () => selectedTable.value?.pivotMode,
  async (mode, oldMode) => {
    if (mode !== '1' && configActiveTab.value === 'pivot') {
      configActiveTab.value = 'basic'
    }
    // 开启透视模式时补载透视列列表(tab 常挂载，不再依赖重新选表触发)
    if (mode === '1' && oldMode !== '1' && selectedTable.value?.id) {
      await loadPivotColumnList(selectedTable.value.id)
    }
  }
)

// ==================== 透视配置 ====================
// 行维度字段勾选列表(保存时序列化到 selectedTable.groupByFields，数组顺序即分组层级顺序)
const pivotGroupFields = ref<string[]>([])

// 行维度字段显示名
const pivotGroupFieldDisplayName = (property: string) => {
  const field = availableFields.value.find((f) => f.property === property)
  return field ? `${field.displayName} (${field.property})` : property
}

// 调整行维度字段顺序(交换相邻项)
const movePivotGroupField = (index: number, delta: number) => {
  const target = index + delta
  if (target < 0 || target >= pivotGroupFields.value.length) return
  const arr = pivotGroupFields.value.slice()
  ;[arr[index], arr[target]] = [arr[target], arr[index]]
  pivotGroupFields.value = arr
}
// 隐藏的行维度字段(仍参与 group by，仅不在表格中显示，常用于行粒度细化/筛选目标)
const pivotGroupHiddenFields = ref<string[]>([])
// 切换行维度字段是否在表格中显示
const togglePivotGroupFieldDisplay = (fieldProp: string, display: boolean) => {
  const idx = pivotGroupHiddenFields.value.indexOf(fieldProp)
  if (display && idx >= 0) {
    pivotGroupHiddenFields.value.splice(idx, 1)
  } else if (!display && idx < 0) {
    pivotGroupHiddenFields.value.push(fieldProp)
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
// 度量列编辑行(保存时序列化到 selectedTable.pivotMeasures)
const pivotMeasureRows = ref<PivotMeasureVO[]>([])
// 透视列(父表头条件列)列表
const pivotColumnList = ref<PortalPivotColumnVO[]>([])
const selectedPivotColumn = ref<PortalPivotColumnVO | null>(null)
const savingPivotColumn = ref(false)
// 条件弹窗当前是否处于透视列条件编辑模式
const editingPivotCondition = ref(false)

// 解析透视列 condition 中的 conditionList
const parsePivotConditionList = (conditionStr: string | undefined): any[] => {
  if (!conditionStr) {
    return []
  }
  try {
    const parsed = JSON.parse(conditionStr)
    if (Array.isArray(parsed)) {
      return parsed
    }
    return parsed.conditionList || []
  } catch (e) {
    console.warn('解析透视列 condition 失败:', e)
    return []
  }
}

// 列标识下拉选项：取自当前列条件中的条件值(保证标识与条件一致，排除含 __ 的值)
const pivotItemValueOptions = computed(() => {
  const values: string[] = []
  parsePivotConditionList(selectedPivotColumn.value?.condition).forEach((cond: any) => {
    const vals = Array.isArray(cond?.value) ? cond.value : cond?.value != null ? [cond.value] : []
    vals.forEach((v: any) => {
      const s = String(v)
      if (s && !s.includes('__') && !values.includes(s)) {
        values.push(s)
      }
    })
  })
  return values.map((v) => ({ label: v, value: v }))
})

// 列条件 JSON 草稿(展示与手动编辑用)
const conditionJsonDraft = ref('')

// 格式化 condition 为缩进 JSON，非法时原样展示(保存时报错)
const formatPivotCondition = (condition?: string): string => {
  if (!condition) return ''
  try {
    return JSON.stringify(JSON.parse(condition), null, 2)
  } catch (e) {
    return condition
  }
}

// 切换列或条件被弹窗外部修改时刷新草稿
watch(
  () => selectedPivotColumn.value?.condition,
  (cond) => {
    conditionJsonDraft.value = formatPivotCondition(cond)
  },
  { immediate: true }
)

// 当前透视列是否已配置条件
const hasPivotCondition = computed(() => {
  return parsePivotConditionList(selectedPivotColumn.value?.condition).length > 0
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
      ? parsed.map((m: any) => ({ field: m.field || '', label: m.label || '', agg: m.agg || 'sum' }))
      : []
  } catch (e) {
    console.warn('解析透视度量配置失败:', e)
    pivotMeasureRows.value = []
  }
}

// 加载透视列列表
const loadPivotColumnList = async (tableId: number) => {
  try {
    const res = await getPortalPivotColumnList(tableId)
    pivotColumnList.value = res.payload?.records || []
    selectedPivotColumn.value = pivotColumnList.value.length > 0 ? pivotColumnList.value[0] : null
  } catch (error) {
    console.error('加载透视列失败:', error)
    pivotColumnList.value = []
    selectedPivotColumn.value = null
  }
}

// 新增透视列(本地创建临时行，填写后点保存配置才落库，避免空标识被后端校验拒绝)
const handleAddPivotColumn = () => {
  if (!selectedTable.value?.id) return
  // 已有未保存的新增行时不重复创建
  if (pivotColumnList.value.some((c) => !c.id)) {
    message.warning('请先保存或删除未保存的新增透视列')
    return
  }
  const newColumn: PortalPivotColumnVO = {
    tableId: selectedTable.value.id,
    itemValue: '',
    itemName: '',
    condition: JSON.stringify({ conditionList: [] }),
    displayOrder: pivotColumnList.value.length + 1,
    status: '1',
  }
  pivotColumnList.value = [...pivotColumnList.value, newColumn]
  selectedPivotColumn.value = newColumn
  message.info('请在右侧填写列标识与表头名称，然后点击「保存配置」')
}

// 保存透视列
const handleSavePivotColumn = async () => {
  if (!selectedTable.value?.id) return
  if (!selectedPivotColumn.value) {
    message.warning('请先选择或新增一个透视列')
    return
  }
  // 新增保存前校验列标识，避免后端报错
  if (!selectedPivotColumn.value.id && !selectedPivotColumn.value.itemValue?.trim()) {
    message.warning('列标识不能为空')
    return
  }
  // 应用列条件 JSON 草稿：非空则解析归一化，非法则报错阻断
  const draft = conditionJsonDraft.value.trim()
  if (draft) {
    const normalized = normalizePivotCondition(draft)
    if (!normalized) {
      message.warning('列条件 JSON 格式不合法，请检查后再保存')
      return
    }
    selectedPivotColumn.value.condition = normalized
  }
  savingPivotColumn.value = true
  try {
    if (selectedPivotColumn.value.id) {
      await updatePortalPivotColumn(selectedPivotColumn.value)
    } else {
      const res = await addPortalPivotColumn(selectedPivotColumn.value)
      selectedPivotColumn.value.id = res.payload
    }
    message.success('保存成功')
    await loadPivotColumnList(selectedTable.value.id)
    const keepId = selectedPivotColumn.value?.id
    selectedPivotColumn.value = pivotColumnList.value.find((c) => c.id === keepId) || null
  } catch (error) {
    console.error('保存透视列失败:', error)
  } finally {
    savingPivotColumn.value = false
  }
}

// 删除透视列(未保存的临时行直接本地移除)
const handleDeletePivotColumn = async (column: PortalPivotColumnVO) => {
  if (!column.id) {
    pivotColumnList.value = pivotColumnList.value.filter((c) => c !== column)
    if (selectedPivotColumn.value === column) {
      selectedPivotColumn.value = pivotColumnList.value[0] || null
    }
    return
  }
  try {
    await deletePortalPivotColumn(column.id!)
    message.success('删除成功')
    if (selectedPivotColumn.value?.id === column.id) {
      selectedPivotColumn.value = null
    }
    await loadPivotColumnList(selectedTable.value!.id!)
  } catch (error) {
    console.error('删除透视列失败:', error)
  }
}

// 打开透视列条件配置弹窗(复用高级搜索条件弹窗)
const openPivotConditionModal = () => {
  if (!selectedPivotColumn.value) return
  buildColumnArray()
  editingOptionValue.value = ''
  editingPivotCondition.value = true
  filterConditionConfig.condition = {
    andOr: '0',
    conditionList: parsePivotConditionList(selectedPivotColumn.value.condition),
  }
  filterConditionConfig.show = true
}

// ==================== 按字典批量生成统计列(参照图表指标生成方式) ====================
const showGenPivotModal = ref(false)
const genLoading = ref(false)
const genSaving = ref(false)

// 打开生成弹窗：重置上次残留状态
const openGenPivotModal = () => {
  genPivotFieldReset()
  showGenPivotModal.value = true
  // 默认指标模式，预加载指标组
  loadIndicatorGroups()
}
const genPivotFieldReset = () => {
  genItems.value = []
  genSource.value = 'indicator'
  genIndicatorGroups.value = []
  genIndicatorGroup.value = undefined
  genPivotField.value = undefined
  genDictCode.value = undefined
  genDictMode.value = 'flat'
  genFieldA.value = undefined
  genDictCodeA.value = undefined
  genDictModeA.value = 'flat'
  genFieldB.value = undefined
  genDictCodeB.value = undefined
  genDictModeB.value = 'flat'
}

// 生成来源: indicator=复用图表指标, dict=按字典生成, cross=两字典笛卡尔组合
const genSource = ref<'indicator' | 'dict' | 'cross'>('indicator')
// 指标组树(拉平为 分组名 -> 指标项 列表)
interface GenIndicatorGroup {
  groupId: string
  groupName: string
  items: Array<{ key: string; title: string; condition: string | null }>
}
const genIndicatorGroups = ref<GenIndicatorGroup[]>([])
const genIndicatorGroup = ref<string | undefined>(undefined)

// 指标树拍平：递归收集所有组及其指标项(兼容嵌套子组)
const flattenIndicatorTree = (nodes: any[], prefix = ''): GenIndicatorGroup[] => {
  const groups: GenIndicatorGroup[] = []
  for (const node of nodes || []) {
    const groupName = prefix ? `${prefix} / ${node.title}` : node.title
    const items = (node.items || []).map((item: any) => ({
      key: String(item.key),
      title: item.title,
      condition: item.condition || null,
    }))
    if (items.length > 0) {
      groups.push({ groupId: String(node.id), groupName, items })
    }
    groups.push(...flattenIndicatorTree(node.children || [], groupName))
  }
  return groups
}

// 加载指标组列表
const loadIndicatorGroups = async () => {
  if (!props.portalName) {
    message.warning('未找到 Portal 名称，无法加载指标')
    return
  }
  genLoading.value = true
  try {
    const res = await getIndicatorConfig(props.portalName)
    genIndicatorGroups.value = flattenIndicatorTree(res.payload || [])
    if (genIndicatorGroups.value.length === 0) {
      message.warning('当前 Portal 暂无指标配置，可在指标管理中配置，或改用按字典生成')
    }
  } catch (error) {
    console.error('加载指标配置失败:', error)
    genIndicatorGroups.value = []
  } finally {
    genLoading.value = false
  }
}

// 切换来源时自动加载指标组
const handleGenSourceChange = () => {
  genItems.value = []
  if (genSource.value === 'indicator' && genIndicatorGroups.value.length === 0) {
    loadIndicatorGroups()
  }
}

// 切换指标组时生成预览列表
const handleGenGroupChange = (groupId: string) => {
  const group = genIndicatorGroups.value.find((g) => g.groupId === groupId)
  genItems.value = (group?.items || []).map((item) => ({
    value: item.key,
    label: item.title,
    condition: item.condition || undefined,
    checked: true,
  }))
  if (genItems.value.length === 0) {
    message.warning('该指标组下暂无指标项')
  }
}

// 条件字段(提供列条件的字段)
const genPivotField = ref<string | undefined>(undefined)
// 字典编码(默认取自字段的 reference)
const genDictCode = ref<string | undefined>(undefined)
// 字典模式: flat=平铺字典, treeParent=树父层, treeLeaf=树叶子层
const genDictMode = ref<'flat' | 'treeParent' | 'treeLeaf'>('flat')
// 生成预览项
interface GenPivotItem {
  value: string
  label: string
  checked: boolean
  // 指标模式下自带的条件 JSON(透视列直接复用)
  condition?: string
}
const genItems = ref<GenPivotItem[]>([])

// 切换条件字段时自动带出字典编码
const handleGenFieldChange = (fieldKey: string) => {
  const field = availableFields.value.find((f) => f.key === fieldKey)
  genDictCode.value = field?.reference || undefined
  genItems.value = []
}

// 按字典模式加载字典项(平铺/树父层/树叶子层)
const loadDictItemsByMode = async (
  dictCode: string,
  mode: 'flat' | 'treeParent' | 'treeLeaf'
): Promise<Array<{ value: string; label: string }>> => {
  const items: Array<{ value: string; label: string }> = []
  if (mode === 'flat') {
    // 平铺字典：每个字典项一列(与图表指标逐项生成条件同构)
    const res = await dict.getDict(dictCode)
    ;(res || []).forEach((item: any) => {
      items.push({ value: String(item.value), label: item.label || String(item.value) })
    })
  } else {
    // 树形字典：复用树形堆叠图的拍平逻辑，按父层/叶子层生成
    const tree = await fetchTreeDict(dictCode)
    const parentGroups = flattenTreeToParentGroups(tree)
    if (mode === 'treeParent') {
      parentGroups.forEach((g) => {
        items.push({ value: g.parentValue, label: g.parentLabel })
      })
    } else {
      parentGroups.forEach((g) => {
        g.children.forEach((c) => {
          items.push({ value: c.value, label: c.label })
        })
      })
    }
  }
  return items
}

// 加载字典生成预览列表
const loadGenItems = async () => {
  if (!genPivotField.value || !genDictCode.value) {
    message.warning('请先选择条件字段与字典编码')
    return
  }
  genLoading.value = true
  try {
    const items = await loadDictItemsByMode(genDictCode.value, genDictMode.value)
    genItems.value = items.map((i) => ({ ...i, checked: true }))
    if (items.length === 0) {
      message.warning('字典中没有可用项')
    }
  } catch (error) {
    console.error('加载字典失败:', error)
  } finally {
    genLoading.value = false
  }
}

// ==================== 两字典笛卡尔组合生成 ====================
// 组合维度 A / B 的字段、字典编码、字典层级
const genFieldA = ref<string | undefined>(undefined)
const genDictCodeA = ref<string | undefined>(undefined)
const genDictModeA = ref<'flat' | 'treeParent' | 'treeLeaf'>('flat')
const genFieldB = ref<string | undefined>(undefined)
const genDictCodeB = ref<string | undefined>(undefined)
const genDictModeB = ref<'flat' | 'treeParent' | 'treeLeaf'>('flat')

// 切换组合维度字段时自动带出字典编码
const handleGenCrossFieldChange = (side: 'A' | 'B', fieldKey: string) => {
  const field = availableFields.value.find((f) => f.key === fieldKey)
  const dictCode = field?.reference || undefined
  if (side === 'A') {
    genDictCodeA.value = dictCode
  } else {
    genDictCodeB.value = dictCode
  }
  genItems.value = []
}

// 加载笛卡尔组合预览列表
const loadCrossItems = async () => {
  if (!genFieldA.value || !genDictCodeA.value || !genFieldB.value || !genDictCodeB.value) {
    message.warning('请完整选择两个组合维度的字段与字典编码')
    return
  }
  genLoading.value = true
  try {
    const [itemsA, itemsB] = await Promise.all([
      loadDictItemsByMode(genDictCodeA.value, genDictModeA.value),
      loadDictItemsByMode(genDictCodeB.value, genDictModeB.value),
    ])
    // 笛卡尔积：每个组合一列，条件 = 字段A等于值A AND 字段B等于值B
    // 列标识用 && 连接(避免与透视别名分隔符 __ 冲突)
    const items: GenPivotItem[] = []
    for (const a of itemsA) {
      for (const b of itemsB) {
        items.push({
          value: `${a.value}&&${b.value}`,
          label: `${a.label}-${b.label}`,
          condition: JSON.stringify({
            andOr: '0',
            conditionList: [
              { property: genFieldA.value, relation: FILTER_TYPE.EQUAL, value: [a.value] },
              { property: genFieldB.value, relation: FILTER_TYPE.EQUAL, value: [b.value] },
            ],
          }),
          checked: true,
        })
      }
    }
    genItems.value = items
    if (items.length === 0) {
      message.warning('字典中没有可用项')
    } else {
      message.info(`已生成 ${items.length} 个组合预览，可勾选后确认生成`)
    }
  } catch (error) {
    console.error('加载组合字典失败:', error)
  } finally {
    genLoading.value = false
  }
}

// 全选/取消全选
const toggleGenAll = (checked: boolean) => {
  genItems.value.forEach((item) => {
    item.checked = checked
  })
}

// 归一化条件为后端要求的 JSON 对象格式 {andOr, conditionList}
// 指标条件历史数据可能为数组/单条件对象等格式，统一包装避免后端校验失败
const normalizePivotCondition = (raw: any): string | null => {
  let parsed: any = raw
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw)
    } catch (e) {
      return null
    }
  }
  if (Array.isArray(parsed)) {
    return JSON.stringify({ andOr: '0', conditionList: parsed })
  }
  if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.conditionList)) {
      return JSON.stringify({ andOr: parsed.andOr || '0', conditionList: parsed.conditionList })
    }
    if (parsed.property) {
      return JSON.stringify({ andOr: '0', conditionList: [parsed] })
    }
  }
  return null
}

// 兜底校验：必须为 JSON 对象字符串(后端 readJson(Map) 要求)，数组/标量/null 字面量一律拒发
const isJsonObjectString = (s: string): boolean => {
  try {
    const p = JSON.parse(s)
    return p !== null && typeof p === 'object' && !Array.isArray(p)
  } catch (e) {
    return false
  }
}

// 预览项上移/下移(调整生成顺序)
const moveGenItem = (index: number, delta: number) => {
  const target = index + delta
  const arr = genItems.value
  if (target < 0 || target >= arr.length) return
  const tmp = arr[index]
  arr[index] = arr[target]
  arr[target] = tmp
}

// 生成预览拖拽调序
const genDraggedIndex = ref(-1)
const genDragOverIndex = ref(-1)
const handleGenDragStart = (e: DragEvent, index: number) => {
  genDraggedIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
  }
}
const handleGenDrop = (e: DragEvent, targetIndex: number) => {
  e.preventDefault()
  genDragOverIndex.value = -1
  const from = genDraggedIndex.value
  genDraggedIndex.value = -1
  if (from < 0 || from === targetIndex) return
  const arr = genItems.value.slice()
  const [moved] = arr.splice(from, 1)
  arr.splice(targetIndex, 0, moved)
  genItems.value = arr
}

// 确认批量生成透视列
const handleConfirmGenPivot = async () => {
  if (!selectedTable.value?.id) return
  if (genSource.value === 'dict' && !genPivotField.value) return
  // 按预览顺序取勾选项(顺序即生成后的 displayOrder)
  const selected = genItems.value.filter((item) => item.checked)
  if (selected.length === 0) {
    message.warning('请至少勾选一项')
    return
  }
  // 列标识查重：已存在的 itemValue 跳过
  const existingValues = new Set(pivotColumnList.value.map((c) => c.itemValue))
  const toAdd = selected.filter((item) => !existingValues.has(item.value))
  if (toAdd.length === 0) {
    message.warning('勾选项均已存在对应透视列')
    return
  }
  genSaving.value = true
  try {
    let order = pivotColumnList.value.length
    let skippedNoCondition = 0
    // 先本地组装全部待新增数据，再单次批量请求(后端 /insert/list 事务提交)，避免 for 循环逐条 insert
    const toInsert: PortalPivotColumnVO[] = []
    for (const item of toAdd) {
      // 指标/组合模式：复用自带条件(归一化为 JSON 对象)；字典模式：字段 等于 字典值
      let conditionStr: string | null = null
      if (genSource.value === 'dict') {
        conditionStr = JSON.stringify({
          andOr: '0',
          conditionList: [
            {
              property: genPivotField.value,
              relation: FILTER_TYPE.EQUAL,
              value: [item.value],
            },
          ],
        })
      } else {
        conditionStr = normalizePivotCondition(item.condition)
        if (!conditionStr) {
          // 指标未配置条件时跳过，避免生成全量聚合的误导列
          skippedNoCondition++
          continue
        }
      }
      // 发送前兜底：非 JSON 对象的条件一律跳过，确保不会触发后端校验报错
      if (!isJsonObjectString(conditionStr)) {
        skippedNoCondition++
        continue
      }
      toInsert.push({
        tableId: selectedTable.value.id,
        itemValue: item.value,
        itemName: item.label,
        condition: conditionStr,
        displayOrder: ++order,
        status: '1',
      })
    }
    if (toInsert.length > 0) {
      await addPortalPivotColumnList(toInsert, false, false, false)
      message.success(
        skippedNoCondition > 0
          ? `已生成 ${toInsert.length} 个透视列，跳过 ${skippedNoCondition} 个未配置条件的指标`
          : `已生成 ${toInsert.length} 个透视列`
      )
      showGenPivotModal.value = false
      await loadPivotColumnList(selectedTable.value.id)
    } else {
      message.warning(`未能生成：${skippedNoCondition} 个指标均未配置条件`)
    }
  } catch (error) {
    console.error('批量生成透视列失败:', error)
  } finally {
    genSaving.value = false
  }
}

// 字典列表
const sysDictList = ref<Array<any>>([])

// 拖拽状态
const draggedIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

// 添加筛选项弹窗状态
const showAddFilterModal = ref(false)

// 弹窗中的筛选项列表（本地副本，可拖拽排序、编辑名称）
interface ModalFilterItem {
  uid: string;
  id?: number;
  code: string;
  label: string;
  property: string;
  displayName: string;
  filterType: string;
  dictCode: string;
  originalFilter?: PortalTableFilterVO;
}
const modalFilterList = ref<ModalFilterItem[]>([])
const modalDraggedIndex = ref<number | null>(null)
const modalDragOverIndex = ref<number | null>(null)
const modalSaving = ref(false)

// 字段搜索关键词
const fieldSearchKeyword = ref('')

// 过滤后的可选字段
const filteredAvailableFields = computed(() => {
  const keyword = fieldSearchKeyword.value.trim().toLowerCase()
  if (!keyword) return availableFields.value
  return availableFields.value.filter(
    (f) =>
      f.displayName.toLowerCase().includes(keyword) ||
      f.property.toLowerCase().includes(keyword)
  )
})

// 可选字段列表（用于筛选条件配置）
const availableFields = ref<
  Array<{
    key: string;
    title: string;
    property: string;
    displayName: string;
    reference: string;
  }>
>([])

// 筛选条件配置弹窗
const filterConditionConfig = reactive({
  show: false,
  columnArray: [] as Array<any>,
  condition: {} as ConditionType,
  okText: '保存条件',
})

// 条件配置（新格式）
interface ConditionConfig {
  default: any[]; // 通用兜底 condition
  options: Record<string, any[]>; // 按字典值映射的特殊 condition
}

// 当前筛选项的条件配置
const conditionConfig = reactive<ConditionConfig>({
  default: [],
  options: {},
})

// 当前编辑的特殊选项值
const editingOptionValue = ref<string>('')

// 当前筛选项的字典选项列表
const filterDictOptions = ref<Array<{ label: string; value: string }>>([])

// 判断是否有通用 condition
const hasDefaultCondition = computed(() => {
  return conditionConfig.default && conditionConfig.default.length > 0
})

// 判断是否是新格式的 condition
const isNewConditionFormat = (condition: any): condition is ConditionConfig => {
  return condition && typeof condition === 'object' && 'default' in condition
}

// 解析 condition 字符串到 conditionConfig
const parseCondition = (conditionStr: string | undefined) => {
  if (!conditionStr) {
    conditionConfig.default = []
    conditionConfig.options = {}
    return
  }

  try {
    const parsed = JSON.parse(conditionStr)

    if (isNewConditionFormat(parsed)) {
      // 新格式
      conditionConfig.default = parsed.default || []
      conditionConfig.options = parsed.options || {}
    } else {
      // 老格式，作为通用 condition
      if (Array.isArray(parsed)) {
        conditionConfig.default = parsed
      } else if (parsed.conditionList && Array.isArray(parsed.conditionList)) {
        conditionConfig.default = parsed.conditionList
      } else {
        conditionConfig.default = []
      }
      conditionConfig.options = {}
    }
  } catch (e) {
    console.warn('解析 condition 失败:', e)
    conditionConfig.default = []
    conditionConfig.options = {}
  }
}

// 序列化 conditionConfig 到字符串
const serializeCondition = (): string => {
  const config: ConditionConfig = {
    default: conditionConfig.default,
    options: conditionConfig.options,
  }
  return JSON.stringify(config)
}

// 加载当前筛选项的字典选项
const loadFilterDictOptions = async () => {
  if (!selectedFilter.value?.dictCode) {
    filterDictOptions.value = []
    return
  }

  try {
    const res = await dict.getDict(selectedFilter.value.dictCode)
    filterDictOptions.value = (res || []).map((item: any) => ({
      label: item.label || item.value,
      value: String(item.value),
    }))
  } catch (error) {
    console.error('加载字典选项失败:', error)
    filterDictOptions.value = []
  }
}

// 删除特殊选项条件
const removeOptionCondition = (optionValue: string) => {
  delete conditionConfig.options[optionValue]
  // 保存
  selectedFilter.value!.condition = serializeCondition()
  handleSaveFilter(selectedFilter.value!)
}

// 筛选类型选项
const filterTypeOptions = FILTER_TYPE_OPTIONS

// 获取筛选类型标签
const getFilterTypeLabel = (type: string | undefined) => {
  const option = filterTypeOptions.find((o) => o.value === type)
  return option?.label || type || '未知'
}

// 监听弹窗显示状态
watch(
  () => props.modelValue,
  (newVal) => {
    visible.value = newVal
    if (newVal) {
      loadTableList()
      initAvailableFields()
      loadDictList()
    }
  }
)

// 监听 columns 变化
watch(
  () => props.columns,
  (newColumns) => {
    console.log('columns 变化:', newColumns)
    if (visible.value) {
      initAvailableFields()
    }
  },
  { deep: true }
)

watch(visible, (newVal) => {
  emit('update:modelValue', newVal)
})

// 监听添加筛选项弹窗打开，初始化本地筛选项列表
watch(showAddFilterModal, (newVal) => {
  if (newVal) {
    modalFilterList.value = filterList.value.map((f) => ({
      uid: `item-${f.id || Math.random()}`,
      id: f.id,
      code: f.code || '',
      label: f.label || '',
      property: f.code || '',
      displayName: f.label || '',
      filterType: f.filterType || 'input',
      dictCode: f.dictCode || '',
      originalFilter: f,
    }))
    modalDraggedIndex.value = null
    modalDragOverIndex.value = null
    fieldSearchKeyword.value = ''
  }
})

// 初始化可选字段列表
const initAvailableFields = () => {
  console.log('初始化字段列表，props.columns:', props.columns)
  if (props.columns && props.columns.length > 0) {
    availableFields.value = props.columns.map((col: any) => ({
      key: col.property,
      title: `${col.displayName} (${col.property})`,
      property: col.property,
      displayName: col.displayName,
      reference: col.reference,
    }))
    console.log('availableFields 已设置:', availableFields.value)
  } else {
    availableFields.value = []
    console.log('availableFields 设置为空数组')
  }
}

// 初始化筛选列配置
const initFilterColumnsConfig = () => {
  if (!props.portalConfig?.columns) return

  // 获取当前要排除的列名列表
  const excludedColumns = selectedTable.value?.filterColumns
    ? selectedTable.value.filterColumns.split(',').map((s: string) => s.trim())
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

// 加载字典列表
const loadDictList = async () => {
  const res = await dict.getAllDict('')
  sysDictList.value = (res || []).map((item: any) => ({
    label: item.label || item.value,
    value: item.value,
  }))
}

// 加载表格配置列表
const loadTableList = async () => {
  if (!props.portalName) {
    tableList.value = []
    return
  }
  try {
    const res = await getPortalTableList(props.portalName)
    if (res.payload?.records) {
      tableList.value = res.payload.records
      // 加载每个 table 的筛选项数量
      for (const table of tableList.value) {
        if (table.id) {
          const filterRes = await getPortalTableFilterList(table.id)
          filterCountMap.value.set(table.id, filterRes.payload?.total || 0)
        }
      }
    }
  } catch (error) {
    console.error('加载表格配置失败:', error)
  }
}

// 获取筛选项数量
const getFilterCount = (tableId: number | undefined) => {
  if (!tableId) return 0
  return filterCountMap.value.get(tableId) || 0
}

// 选择表格配置
const handleSelectTable = async (table: PortalTableVO) => {
  selectedTable.value = table
  selectedFilter.value = null
  await loadFilterList(table.id!)
  // 每次选择表格时重新初始化字段列表
  initAvailableFields()
  // 初始化筛选列配置
  initFilterColumnsConfig()
  // 初始化透视配置(兼容旧逗号串格式：默认全部显示、不排序)
  const rawGroupByFields = table.groupByFields || ''
  pivotGroupSorts.value = {}
  if (rawGroupByFields.trim().startsWith('[')) {
    try {
      const list = JSON.parse(rawGroupByFields) as Array<{ field: string; display?: boolean; sort?: number }>
      pivotGroupFields.value = list.map((item) => item.field)
      pivotGroupHiddenFields.value = list.filter((item) => item.display === false).map((item) => item.field)
      list.forEach((item) => {
        if (item.sort === 0 || item.sort === 1) {
          pivotGroupSorts.value[item.field] = item.sort
        }
      })
    } catch (e) {
      console.warn('解析行维度配置失败，按逗号串兜底:', e)
      pivotGroupFields.value = rawGroupByFields.split(',').map((s: string) => s.trim()).filter((s: string) => s)
      pivotGroupHiddenFields.value = []
    }
  } else {
    pivotGroupFields.value = rawGroupByFields.split(',').map((s: string) => s.trim()).filter((s: string) => s)
    pivotGroupHiddenFields.value = []
  }
  parsePivotMeasures(table.pivotMeasures)
  selectedPivotColumn.value = null
  if (table.pivotMode === '1') {
    await loadPivotColumnList(table.id!)
  } else {
    pivotColumnList.value = []
  }
}

// 选择筛选项
const handleSelectFilter = (filter: PortalTableFilterVO) => {
  selectedFilter.value = filter
  // 解析 condition 到 conditionConfig
  parseCondition(filter.condition)
  // 清空字典选项，需要用户手动加载
  filterDictOptions.value = []
  // 如果有 dictCode，自动加载
  if (filter.dictCode) {
    loadFilterDictOptions()
  }
}

// 加载筛选项列表
const loadFilterList = async (tableId: number) => {
  loadingFilters.value = true
  try {
    const res = await getPortalTableFilterList(tableId)
    filterList.value = res.payload?.records || []
    // 默认选中第一个
    if (filterList.value.length > 0 && !selectedFilter.value) {
      selectedFilter.value = filterList.value[0]
    }
  } catch (error) {
    console.error('加载筛选项失败:', error)
    filterList.value = []
  } finally {
    loadingFilters.value = false
  }
}

// 新增表格配置
const handleAddTable = async () => {
  if (!props.portalName) {
    message.warning('请先选择一个表格配置')
    return
  }
  const newTable: PortalTableVO = {
    portalName: props.portalName,
    tableCode: '',
    filterWidth: 260,
    paddingTh: 2,
    paddingTd: 7,
    status: '1',
  }
  saving.value = true
  try {
    const res = await addPortalTable(newTable)
    if (res.payload) {
      message.success('新增成功')
      await loadTableList()
      // 选中新创建的配置
      const newRecord = tableList.value.find(
        (t) => t.tableCode === '' && t.portalName === props.portalName
      )
      if (newRecord) {
        handleSelectTable(newRecord)
      }
    }
  } catch (error) {
    console.error('新增失败:', error)
  } finally {
    saving.value = false
  }
}

// 导出报表配置
const handleExportReportConfig = async () => {
  if (!tableList.value.length) {
    message.warning('暂无可导出的报表配置')
    return
  }
  reportExporting.value = true
  try {
    // 导出所有表格及其筛选器、透视列配置
    const exportData = await Promise.all(
      tableList.value.map(async (table) => {
        const filters = await getPortalTableFilterList(table.id!)
        const pivotColumnsRes = await getPortalPivotColumnList(table.id!, false, false, false)
        return {
          table: { ...table },
          filters: (filters.payload || []).map((f: any) => f),
          pivotColumns: (pivotColumnsRes?.payload?.records || []).map((c: any) => c)
        }
      })
    )
    downloadJsonConfig(`${props.portalName}-报表配置`, {
      type: 'report',
      portalName: props.portalName,
      exportTime: new Date().toISOString(),
      data: exportData
    })
    message.success('导出成功')
  } catch (error: any) {
    message.error('导出失败: ' + (error?.message || '未知错误'))
  } finally {
    reportExporting.value = false
  }
}

// 导入报表配置
const handleReportFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  target.value = ''

  try {
    const parsed = await readJsonFile(file)
    // 校验文件类型, 避免误导入其他类型的配置 JSON(如指标配置)
    if (parsed?.type !== 'report') {
      message.warning('不是有效的报表配置文件')
      return
    }
    const importData = parsed.data || []
    if (!Array.isArray(importData) || importData.length === 0) {
      message.warning('文件中没有可导入的报表配置')
      return
    }
    // 目标 portal 优先取当前页面, 支持跨页面/跨环境导入
    const portalName = props.portalName || parsed.portalName
    if (!portalName) {
      message.warning('无法确定目标表格名称')
      return
    }
    Modal.confirm({
      title: '确认导入',
      content: `将导入 ${importData.length} 个报表配置到「${portalName}」，文件中未包含的筛选器/透视列将被删除，确认继续？`,
      okText: '确认导入',
      cancelText: '取消',
      onOk: async () => {
        reportImporting.value = true
        try {
          let added = 0, updated = 0
          const filterStat = { added: 0, updated: 0, deleted: 0 }
          const pivotStat = { added: 0, updated: 0, deleted: 0 }
          // 构建已有表查重映射: tableCode → existing table
          const existingTableMap = new Map<string, PortalTableVO>()
          tableList.value.forEach(t => {
            if (t.tableCode) existingTableMap.set(t.tableCode, t)
          })
          for (const item of importData) {
            const tableData = { ...item.table }
            delete tableData.id
            delete tableData.filterCount
            // 强制归属目标 portal, 避免带入源环境旧值
            tableData.portalName = portalName
            const tableCode = tableData.tableCode
            const existingTable = tableCode ? existingTableMap.get(tableCode) : null
            let tableId: number
            if (existingTable?.id) {
              // 已存在 → 更新
              await updatePortalTable({ ...tableData, id: existingTable.id }, false, false, false)
              tableId = existingTable.id
              updated++
            } else {
              // 不存在 → 新增
              const newTable = await addPortalTable(tableData, false, false, false)
              tableId = newTable.payload?.id || newTable.payload
              added++
            }
            // 处理筛选器(全量同步: 以文件为准, 文件外的多余项删除)
            if (Array.isArray(item.filters)) {
              // 查重：获取已有筛选器
              const existingFiltersRes = await getPortalTableFilterList(tableId!, false, false, false)
              const existingFilters: PortalTableFilterVO[] = existingFiltersRes?.payload || []
              const filterMap = new Map<string, PortalTableFilterVO>()
              existingFilters.forEach(ef => {
                if (ef.code) filterMap.set(ef.code, ef)
              })
              // 删除文件中不存在的筛选器(只删有编码可匹配的, 无编码的保守保留)
              const importFilterCodes = new Set(item.filters.map((f: any) => f.code).filter(Boolean))
              const staleFilterIds = existingFilters
                .filter(ef => ef.id && ef.code && !importFilterCodes.has(ef.code))
                .map(ef => ef.id!)
              if (staleFilterIds.length) {
                await deletePortalTableFilterList(staleFilterIds, false, false, false)
                filterStat.deleted += staleFilterIds.length
              }
              for (const f of item.filters) {
                // 移除源环境 id，避免跨环境导入时带入旧ID
                const { id: _srcFilterId, ...filterData } = f
                const existingFilter = f.code ? filterMap.get(f.code) : null
                if (existingFilter?.id) {
                  // 已存在 → 更新
                  await updatePortalTableFilter(
                    { ...filterData, id: existingFilter.id, tableId },
                    false, false, false
                  )
                  filterStat.updated++
                } else {
                  // 不存在 → 新增
                  await addPortalTableFilter(
                    { ...filterData, tableId },
                    false, false, false
                  )
                  filterStat.added++
                }
              }
            }
            // 处理透视列(全量同步: 以文件为准, 文件外的多余项删除)
            if (Array.isArray(item.pivotColumns)) {
              const existingPivotRes = await getPortalPivotColumnList(tableId!, false, false, false)
              const existingPivots: PortalPivotColumnVO[] = existingPivotRes?.payload?.records || []
              const pivotMap = new Map<string, PortalPivotColumnVO>()
              existingPivots.forEach(ep => {
                if (ep.itemValue) pivotMap.set(ep.itemValue, ep)
              })
              // 删除文件中不存在的透视列(只删有列标识可匹配的)
              const importPivotValues = new Set(item.pivotColumns.map((c: any) => c.itemValue).filter(Boolean))
              for (const ep of existingPivots) {
                if (ep.id && ep.itemValue && !importPivotValues.has(ep.itemValue)) {
                  await deletePortalPivotColumn(ep.id, false, false, false)
                  pivotStat.deleted++
                }
              }
              for (const c of item.pivotColumns) {
                const { id: _srcPivotId, ...pivotData } = c
                const existingPivot = c.itemValue ? pivotMap.get(c.itemValue) : null
                if (existingPivot?.id) {
                  await updatePortalPivotColumn(
                    { ...pivotData, id: existingPivot.id, tableId },
                    false, false, false
                  )
                  pivotStat.updated++
                } else {
                  await addPortalPivotColumn(
                    { ...pivotData, tableId },
                    false, false, false
                  )
                  pivotStat.added++
                }
              }
            }
          }
          message.success(`导入完成：表新增 ${added} / 更新 ${updated}，` +
            `筛选器新增 ${filterStat.added} / 更新 ${filterStat.updated} / 删除 ${filterStat.deleted}，` +
            `透视列新增 ${pivotStat.added} / 更新 ${pivotStat.updated} / 删除 ${pivotStat.deleted}`)
          // 刷新列表
          await loadTableList()
        } catch (error: any) {
          message.error('导入失败: ' + (error?.message || '未知错误'))
        } finally {
          reportImporting.value = false
        }
      }
    })
  } catch (error: any) {
    message.error('文件解析失败，请确保是有效的JSON文件')
  }
}

// 保存表格配置
const handleSaveTable = async () => {
  if (!selectedTable.value) return
  saving.value = true
  try {
    // 构建 filterColumns：收集所有 checked = false 的列名
    const excludedColumns = (props.portalConfig?.columns || [])
      .filter((col: any) => col.checked === false)
      .map((col: any) => col.property)

    // 如果没有排除的列，设为 null；否则用逗号连接
    selectedTable.value.filterColumns =
      excludedColumns.length > 0 ? excludedColumns.join(',') : null

    // 透视模式：序列化行维度与度量列配置
    if (selectedTable.value.pivotMode === '1') {
      // 行维度：按用户调整的顺序序列化为 JSON(顺序即分组层级，display=false 仅参与 group by 不显示，sort=聚合行排序)
      const groupConfig = pivotGroupFields.value.map((field) => {
        const cfg: { field: string; display: boolean; sort?: number } = {
          field,
          display: !pivotGroupHiddenFields.value.includes(field),
        }
        if (pivotGroupSorts.value[field] === 0 || pivotGroupSorts.value[field] === 1) {
          cfg.sort = pivotGroupSorts.value[field]
        }
        return cfg
      })
      selectedTable.value.groupByFields =
        groupConfig.length > 0 ? JSON.stringify(groupConfig) : undefined
      // 清理已取消勾选字段在隐藏列表/排序配置中的残留
      pivotGroupHiddenFields.value = pivotGroupHiddenFields.value.filter((f) => pivotGroupFields.value.includes(f))
      Object.keys(pivotGroupSorts.value).forEach((f) => {
        if (!pivotGroupFields.value.includes(f)) {
          delete pivotGroupSorts.value[f]
        }
      })

      // 度量列：过滤掉未选字段的空行
      const validMeasures = pivotMeasureRows.value.filter((m) => m.field)
      selectedTable.value.pivotMeasures =
        validMeasures.length > 0 ? JSON.stringify(validMeasures) : undefined
      // 保存后同步移除空行，界面与落库数据一致
      pivotMeasureRows.value = validMeasures
    }

    await updatePortalTable(selectedTable.value)
    message.success('保存成功')
    await loadTableList()
  } catch (error) {
    console.error('保存失败:', error)
  } finally {
    saving.value = false
  }
}

// 删除表格配置
const handleDeleteTable = async (table: PortalTableVO) => {
  try {
    await deletePortalTable(table.id!)
    message.success('删除成功')
    if (selectedTable.value?.id === table.id) {
      selectedTable.value = null
      filterList.value = []
      selectedFilter.value = null
    }
    await loadTableList()
  } catch (error) {
    console.error('删除失败:', error)
  }
}

// 保存筛选项
const handleSaveFilter = async (filter: PortalTableFilterVO) => {
  savingFilter.value = true
  try {
    if (filter.id) {
      await updatePortalTableFilter(filter)
    } else {
      const res = await addPortalTableFilter(filter)
      filter.id = res.payload
    }
    message.success('保存成功')
    await loadFilterList(selectedTable.value!.id!)
  } catch (error) {
    console.error('保存筛选项失败:', error)
  } finally {
    savingFilter.value = false
  }
}

// 删除筛选项
const handleDeleteFilter = async (filter: PortalTableFilterVO) => {
  try {
    await deletePortalTableFilter(filter.id!)
    message.success('删除成功')
    // 如果删除的是当前选中的筛选项，清空选中状态
    if (selectedFilter.value?.id === filter.id) {
      selectedFilter.value = null
    }
    await loadFilterList(selectedTable.value!.id!)
    filterCountMap.value.set(selectedTable.value!.id!, filterList.value.length)
  } catch (error) {
    console.error('删除筛选项失败:', error)
  }
}

// 拖拽排序结束
const handleFilterDragEnd = async () => {
  // 更新 displayOrder
  const orderList: IdOrderReqVO[] = []
  filterList.value.forEach((filter, index) => {
    filter.displayOrder = index + 1
    if (filter.id) {
      orderList.push({ id: filter.id as any, showOrder: index + 1 })
    }
  })

  // 调用接口保存排序
  if (orderList.length > 0) {
    try {
      await updatePortalTableFilterOrder(orderList)
      message.success('排序已保存')
    } catch (error) {
      console.error('保存排序失败:', error)
    }
  }
}

// 拖拽开始
const handleDragStart = (e: DragEvent, index: number) => {
  draggedIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }
}

// 拖拽悬停
const handleDragOver = (e: DragEvent, index: number) => {
  e.preventDefault()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
  dragOverIndex.value = index
}

// 拖拽放置
const handleDrop = (e: DragEvent, targetIndex: number) => {
  e.preventDefault()
  if (draggedIndex.value === null || draggedIndex.value === targetIndex) {
    return
  }

  // 重新排序
  const newList = [...filterList.value]
  const [movedItem] = newList.splice(draggedIndex.value, 1)
  newList.splice(targetIndex, 0, movedItem)
  filterList.value = newList

  // 保存排序
  handleFilterDragEnd()
}

// 拖拽结束
const handleDragEnd = () => {
  draggedIndex.value = null
  dragOverIndex.value = null
}

// ==================== 透视列拖拽排序(范式同筛选项) ====================
const pivotDraggedIndex = ref<number | null>(null)
const pivotDragOverIndex = ref<number | null>(null)

// 透视列拖拽排序结束: 重算 displayOrder 并批量保存(未保存的新列待「保存配置」后生效)
const handlePivotDragEnd = async () => {
  const orderList: IdOrderReqVO[] = []
  pivotColumnList.value.forEach((column, index) => {
    column.displayOrder = index + 1
    if (column.id) {
      orderList.push({ id: column.id as any, showOrder: index + 1 })
    }
  })
  if (orderList.length > 0) {
    try {
      await updatePortalPivotColumnOrder(orderList, false, false, false)
      message.success('排序已保存')
    } catch (error) {
      console.error('保存透视列排序失败:', error)
    }
  }
  if (pivotColumnList.value.some(c => !c.id)) {
    message.info('存在未保存的透视列，点击「保存配置」后其顺序生效')
  }
}

// 透视列拖拽开始
const handlePivotDragStart = (e: DragEvent, index: number) => {
  pivotDraggedIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }
}

// 透视列拖拽悬停
const handlePivotDragOver = (e: DragEvent, index: number) => {
  e.preventDefault()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
  pivotDragOverIndex.value = index
}

// 透视列拖拽放置
const handlePivotDrop = (e: DragEvent, targetIndex: number) => {
  e.preventDefault()
  if (pivotDraggedIndex.value === null || pivotDraggedIndex.value === targetIndex) {
    return
  }
  const newList = [...pivotColumnList.value]
  const [movedItem] = newList.splice(pivotDraggedIndex.value, 1)
  newList.splice(targetIndex, 0, movedItem)
  pivotColumnList.value = newList
  handlePivotDragEnd()
}

// 透视列拖拽结束(清理状态)
const handlePivotDragEndReset = () => {
  pivotDraggedIndex.value = null
  pivotDragOverIndex.value = null
}

// 穿梭框过滤
const filterOption = (inputValue: string, option: any) => {
  const label = option.title || option.label || ''
  return label.toLowerCase().indexOf(inputValue.toLowerCase()) > -1
}

// 判断字段是否已被选为筛选项
const isFieldSelected = (fieldKey: string) => {
  return modalFilterList.value.some((item) => item.property === fieldKey)
}

// 根据字段配置推断筛选类型和字典编码
const inferFilterType = (fieldKey: string) => {
  const fieldConfig = props.portalConfig?.columns?.find(
    (col: any) => col.property === fieldKey
  )
  const selectedField = availableFields.value.find((f) => f.key === fieldKey)
  let filterType = 'input'
  let dictCode = ''

  if (fieldConfig) {
    if (fieldConfig.fieldType === '6' || fieldConfig.fieldType === '7') {
      filterType = 'date'
    } else if (fieldConfig.fieldType === '4' || fieldConfig.fieldType === '18') {
      filterType = 'select'
    } else if (fieldConfig.fieldType === '2') {
      filterType = 'switch'
    } else if (fieldConfig.fieldType === '3') {
      filterType = 'number'
    } else if (
      fieldConfig.property.includes('Status') ||
      fieldConfig.property.includes('Type')
    ) {
      filterType = 'select'
    }
    if (
      (filterType === 'select' || filterType === 'select_multi_in_one') &&
      fieldConfig.reference
    ) {
      dictCode = fieldConfig.reference
    }
  } else if (selectedField) {
    if (
      selectedField.property.includes('Time') ||
      selectedField.property.includes('Date')
    ) {
      filterType = 'date'
    } else if (
      selectedField.property.includes('Status') ||
      selectedField.property.includes('Type')
    ) {
      filterType = 'select'
    }
  }

  return { filterType, dictCode }
}

// 勾选/取消勾选字段
const handleFieldToggle = async (
  field: { key: string; property: string; displayName: string; reference: string },
  checked: boolean
) => {
  if (modalSaving.value) return
  modalSaving.value = true

  try {
    if (checked) {
      const { filterType, dictCode } = inferFilterType(field.key)
      const conditionList = [buildCondition(field.property, FILTER_TYPE.EQUAL, ['$1'])]

      const newFilter: PortalTableFilterVO = {
        tableId: selectedTable.value!.id!,
        code: field.property,
        label: field.displayName,
        filterType,
        dictCode,
        placeholder: `请输入${field.displayName}`,
        defaultValue: '',
        multiple: '1',
        allowClear: '1',
        displayOrder: modalFilterList.value.length + 1,
        status: '1',
        condition: JSON.stringify(conditionList),
      }

      const res = await addPortalTableFilter(newFilter)
      if (res.payload) {
        newFilter.id = res.payload
        const newItem: ModalFilterItem = {
          uid: `item-${res.payload}`,
          id: res.payload,
          code: field.property,
          label: field.displayName,
          property: field.property,
          displayName: field.displayName,
          filterType,
          dictCode,
          originalFilter: newFilter,
        }
        modalFilterList.value.push(newItem)
        message.success(`已添加：${field.displayName}`)
      }
    } else {
      const index = modalFilterList.value.findIndex(
        (item) => item.property === field.key
      )
      if (index !== -1) {
        const item = modalFilterList.value[index]
        if (item.id) {
          await deletePortalTableFilter(item.id)
        }
        modalFilterList.value.splice(index, 1)
        message.success(`已移除：${field.displayName}`)
      }
    }
  } catch (error) {
    console.error('操作筛选项失败:', error)
  } finally {
    modalSaving.value = false
  }
}

// 弹窗内拖拽排序
const handleModalDragStart = (e: DragEvent, index: number) => {
  modalDraggedIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }
}

const handleModalDrop = async (e: DragEvent, targetIndex: number) => {
  e.preventDefault()
  if (modalDraggedIndex.value === null || modalDraggedIndex.value === targetIndex) {
    return
  }

  const newList = [...modalFilterList.value]
  const [movedItem] = newList.splice(modalDraggedIndex.value, 1)
  newList.splice(targetIndex, 0, movedItem)
  modalFilterList.value = newList

  const orderList: IdOrderReqVO[] = []
  modalFilterList.value.forEach((item, index) => {
    if (item.id) {
      orderList.push({ id: item.id as any, showOrder: index + 1 })
    }
  })
  if (orderList.length > 0) {
    try {
      await updatePortalTableFilterOrder(orderList)
      message.success('排序已保存')
    } catch (error) {
      console.error('保存排序失败:', error)
    }
  }
}

const handleModalDragEnd = () => {
  modalDraggedIndex.value = null
  modalDragOverIndex.value = null
}

// 弹窗中修改筛选项名称
const handleModalLabelSave = async (item: ModalFilterItem) => {
  if (!item.id || !item.originalFilter) return
  if (!item.label.trim()) {
    message.warning('筛选项名称不能为空')
    return
  }
  if (item.originalFilter.label === item.label) return

  item.originalFilter.label = item.label
  item.originalFilter.placeholder = `请输入${item.label}`
  try {
    await updatePortalTableFilter(item.originalFilter)
    message.success('名称已更新')
  } catch (error) {
    console.error('更新名称失败:', error)
  }
}

// 关闭弹窗时同步数据
const handleCloseAddFilterModal = async () => {
  showAddFilterModal.value = false
  fieldSearchKeyword.value = ''
  if (selectedTable.value?.id) {
    await loadFilterList(selectedTable.value.id)
    filterCountMap.value.set(selectedTable.value.id, filterList.value.length)
  }
}

// 筛选类型变化时自动设置字典编码
const handleFilterTypeChange = (value: any) => {
  // 如果切换到select/select_multi_in_one类型，且当前选中的字段有reference，则自动填入
  if ((value === 'select' || value === 'select_multi_in_one') && selectedFilter.value) {
    console.log('筛选类型变更为下拉选择，尝试自动填充字典编码')

    // 首先尝试通过label精确匹配
    let matchedField = availableFields.value.find(
      (f) => f.displayName === selectedFilter.value?.label
    )
    console.log('通过label匹配结果:', matchedField)

    // 如果没找到，尝试通过property匹配
    if (!matchedField && selectedFilter.value.label) {
      // 从condition中提取property
      try {
        const conditionStr = selectedFilter.value.condition
        if (conditionStr) {
          const condition = JSON.parse(conditionStr)
          const conditionList = Array.isArray(condition)
            ? condition
            : condition.conditionList || []
          if (conditionList.length > 0 && conditionList[0].property) {
            matchedField = availableFields.value.find(
              (f) => f.property === conditionList[0].property
            )
            console.log('通过property匹配结果:', matchedField)
          }
        }
      } catch (e) {
        console.warn('解析condition失败:', e)
      }
    }

    // 如果找到了匹配的字段且有reference，则填入字典编码
    if (matchedField?.reference) {
      selectedFilter.value.dictCode = matchedField.reference
      message.success(`已自动填入字典编码: ${matchedField.reference}`)
      console.log(
        `成功为筛选项 "${selectedFilter.value.label}" 填入字典编码: ${matchedField.reference}`
      )
    } else {
      console.log('未找到匹配的字段或字段没有reference')
      message.info('未找到对应的字典编码，请手动选择')
    }
  }
}

// 构建字段列表（通用方法）
const buildColumnArray = () => {
  filterConditionConfig.columnArray = []
  if (props.columns && props.columns.length > 0) {
    filterConditionConfig.columnArray = props.columns.map((col: any) => ({
      key: col.property,
      title: col.displayName,
      fieldType: col.fieldType,
      referenceDictOption: col.referenceDictOption,
    }))
  }
}

// 打开通用条件配置弹窗
const openDefaultConditionModal = () => {
  if (!selectedFilter.value) return

  buildColumnArray()
  editingOptionValue.value = '' // 标记为编辑通用条件
  editingPivotCondition.value = false

  // 使用 conditionConfig.default 作为当前条件
  filterConditionConfig.condition = {
    andOr: '0',
    conditionList: conditionConfig.default || [],
  }

  filterConditionConfig.show = true
}

// 打开特殊选项条件配置弹窗
const openOptionConditionModal = (optionValue: string) => {
  if (!selectedFilter.value) return

  buildColumnArray()
  editingOptionValue.value = optionValue // 标记为编辑特殊选项条件
  editingPivotCondition.value = false

  // 使用该选项的专属条件
  const optionCondition = conditionConfig.options[optionValue] || []
  filterConditionConfig.condition = {
    andOr: '0',
    conditionList: optionCondition,
  }

  filterConditionConfig.show = true
}

// 保存筛选条件配置
const saveFilterCondition = (condition: ConditionType) => {
  const conditionList = condition.conditionList || []

  // 透视列条件编辑模式
  if (editingPivotCondition.value) {
    if (!selectedPivotColumn.value) return
    selectedPivotColumn.value.condition = JSON.stringify({ conditionList })
    filterConditionConfig.show = false
    editingPivotCondition.value = false
    // 自动保存
    handleSavePivotColumn()
    return
  }

  if (!selectedFilter.value) return

  if (editingOptionValue.value) {
    // 保存特殊选项条件
    if (conditionList.length > 0) {
      conditionConfig.options[editingOptionValue.value] = conditionList
    } else {
      // 空条件则删除
      delete conditionConfig.options[editingOptionValue.value]
    }
  } else {
    // 保存通用条件
    conditionConfig.default = conditionList
  }

  // 序列化存储
  selectedFilter.value.condition = serializeCondition()
  filterConditionConfig.show = false

  // 自动保存
  handleSaveFilter(selectedFilter.value)
}

// 取消
const handleCancel = () => {
  visible.value = false
}
</script>

<style scoped lang="less">
.table-config-container {
  display: flex;
  gap: 16px;
  height: 100%;
}

.table-list-panel {
  width: 240px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.panel-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
  background: var(--bg-hover);
  border-radius: 8px 8px 0 0;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.table-item {
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  transition: all 0.2s;

  &:hover {
    background: #f5f5f5;
  }

  &.active {
    background: var(--accent-soft);
    border: 1px solid var(--accent);
  }
}

.table-item-content {
  flex: 1;
  min-width: 0;
}

.table-name {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-info {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 4px;
}

.table-item-actions {
  flex-shrink: 0;
}

.config-detail-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  // tab 布局后各配置域独立擑满高度，无需外层滚动
  overflow: hidden;
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

// 配置域三 tab 布局：tab 内容擑满剩余高度
.config-tabs {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;

  :deep(.ant-tabs-nav) {
    margin-bottom: 12px;
  }

  :deep(.ant-tabs-content-holder) {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  :deep(.ant-tabs-content) {
    height: 100%;
  }

  :deep(.ant-tabs-tabpane) {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
}

// 基础配置 tab 内容可滚动
.tab-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

// 筛选项/透视列 tab 内容擑满高度
.tab-fill-section {
  flex: 1;
  min-height: 0;
}

.basic-config-section {
  flex-shrink: 0;
  margin-bottom: 16px;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  overflow: hidden;
}

.section-title {
  padding: 12px 16px;
  background: var(--bg-hover);
  border-bottom: 1px solid var(--border-subtle);
  font-weight: 500;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-content {
  padding: 16px;
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
}

// 透视列条件 JSON 编辑区
.pivot-condition-json {
  margin-top: 12px;

  .pivot-condition-json-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
    font-weight: 500;

    .pivot-condition-json-tip {
      font-size: 12px;
      font-weight: normal;
      color: var(--text-tertiary);
    }
  }

  .pivot-condition-json-textarea {
    font-family: Consolas, Monaco, monospace;
    font-size: 12px;
  }
}

// 行维度顺序调整栏
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
    gap: 8px;

    .pivot-group-order-name {
      flex: 1;
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
    gap: 8px;
  }

  .pivot-measure-row + .pivot-measure-row {
    margin-top: 10px;
  }
}

.pivot-config-section {
  flex: 0 0 300px;
}

.filter-config-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
  // 保证列表/详情面板有可用高度，空间不足时由外层滚动
  min-height: 320px;
}

.filter-config-content {
  flex: 1;
  display: flex;
  gap: 0;
  min-height: 0;
  overflow: hidden;
}

.filter-list-panel {
  width: 280px;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.filter-list-header {
  padding: 10px 16px;
  background: var(--bg-hover);
  border-bottom: 1px solid var(--border-subtle);
  font-size: 13px;
  color: var(--text-secondary);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-list-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.filter-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 4px;
  transition: all 0.2s;
  gap: 10px;

  &:hover {
    background: var(--bg-hover);
  }

  &.active {
    background: var(--accent-soft);
    border: 1px solid var(--accent);
  }

  &.drag-over {
    border: 2px dashed var(--accent);
    background: var(--accent-soft);
  }
}

.drag-handle {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  cursor: grab;
  flex-shrink: 0;

  &:hover {
    color: #1890ff;
  }

  &:active {
    cursor: grabbing;
  }
}

.filter-item-content {
  flex: 1;
  min-width: 0;
}

.filter-item-label {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.filter-item-type {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 2px;
}

.filter-item-actions {
  flex-shrink: 0;
}

.filter-detail-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--bg-elevated);
}

.filter-detail-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.filter-detail-title {
  font-weight: 500;
  font-size: 14px;
}

.filter-detail-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.option-condition-section {
  margin-top: 8px;
  padding: 12px;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  background: var(--bg-hover);
}

.option-condition-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  font-size: 13px;
  color: var(--text-secondary);
}

.option-condition-list {
  max-height: 200px;
  overflow-y: auto;
  padding: 8px 12px;
  border-top: 1px solid var(--border-subtle);
}

.option-condition-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 4px;
  margin-bottom: 4px;
  background: var(--bg-elevated);
  transition: all 0.2s;

  &:hover {
    background: var(--accent-soft);
  }

  .option-label {
    font-weight: 500;
    margin-right: 4px;
  }

  .option-value {
    font-size: 12px;
    color: var(--text-tertiary);
    margin-right: auto;
  }
}

/* ===== 添加筛选项弹窗样式 ===== */
.add-filter-container {
  display: flex;
  height: 100%;
}

.add-filter-fields-panel {
  width: 45%;
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.add-filter-fields-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-hover);
}

.add-filter-fields-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.add-filter-field-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 4px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: var(--bg-hover);
  }

  &.checked {
    background: var(--accent-soft);
  }

  .ant-checkbox-wrapper {
    width: 100%;
    align-items: flex-start;
  }

  .field-info {
    display: flex;
    flex-direction: column;
    margin-left: 4px;
  }

  .field-name {
    font-weight: 500;
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .field-code {
    font-size: 12px;
    color: var(--text-tertiary);
    margin-top: 2px;
  }
}

.add-filter-selected-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.add-filter-selected-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-hover);
  display: flex;
  justify-content: space-between;
  align-items: center;

  .selected-title {
    font-weight: 500;
    font-size: 14px;
  }

  .drag-tip {
    font-size: 12px;
    color: var(--text-tertiary);
  }
}

.add-filter-selected-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 8px;
  align-content: start;
}

.modal-filter-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  transition: all 0.2s;
  cursor: default;

  &:hover {
    border-color: var(--accent);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  }

  &.drag-over {
    border: 2px dashed var(--accent);
    background: var(--accent-soft);
    transform: scale(1.03);
  }

  .card-top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .drag-handle {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #999;
    cursor: grab;
    flex-shrink: 0;

    &:hover {
      color: #1890ff;
    }

    &:active {
      cursor: grabbing;
    }
  }

  .modal-filter-index {
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
    color: var(--accent);
    background: var(--accent-soft);
    border-radius: 50%;
    flex-shrink: 0;
  }

  .card-bottom-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 4px;
  }

  .modal-filter-code {
    font-size: 11px;
    color: var(--text-tertiary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }

  .modal-filter-type-tag {
    flex-shrink: 0;
    font-size: 11px;
    color: var(--text-secondary);
    padding: 1px 6px;
    background: var(--bg-hover);
    border-radius: 4px;
    white-space: nowrap;
  }
}

// 按字典批量生成透视列弹窗
.gen-cross-wrap {
  display: flex;
  gap: 12px;

  .gen-cross-dim {
    flex: 1;
    min-width: 0;
    border: 1px solid var(--border-color, #e5e7eb);
    border-radius: 6px;
    padding: 8px 12px 0;

    .gen-cross-dim-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      margin-bottom: 8px;
    }

    :deep(.ant-form-item) {
      margin-bottom: 12px;
    }
  }
}

.gen-cross-tip {
  margin-left: 8px;
  font-size: 12px;
  color: var(--text-tertiary, #999);
}

.gen-pivot-preview {
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 6px;
  overflow: hidden;

  .gen-pivot-preview-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: var(--bg-hover, #f5f5f5);
    border-bottom: 1px solid var(--border-color, #e5e7eb);
    font-size: 12px;
    color: var(--text-secondary);
  }

  .gen-pivot-preview-list {
    max-height: 240px;
    overflow-y: auto;
    padding: 8px 12px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px 0;

    .gen-pivot-preview-item {
      width: 50%;
      padding-right: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 4px;
      cursor: grab;
      border-radius: 4px;

      &.gen-drag-over {
        outline: 1px dashed var(--accent, #1677ff);
        background: var(--accent-soft, #e6f4ff);
      }

      .gen-pivot-preview-actions {
        flex-shrink: 0;
        display: inline-flex;

        .ant-btn {
          padding: 0 2px;
          height: 20px;
        }
      }
    }
  }
}
</style>
