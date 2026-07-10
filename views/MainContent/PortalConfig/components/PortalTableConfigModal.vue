<template>
  <a-modal
    v-model:open="visible"
    :title="
      'DarkTable 配置' +
      (portalConfig?.displayName ? ' - ' + portalConfig.displayName : '')
    "
    width="1400px"
    :body-style="{ height: '75vh', overflow: 'hidden' }"
    :footer="null"
    @cancel="handleCancel"
  >
    <div class="table-config-container">
      <!-- 左侧：Table 配置列表 -->
      <div class="table-list-panel">
        <div class="panel-header">
          <span>表格配置列表</span>
          <a-button type="primary" size="small" @click="handleAddTable">
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
          <a-empty v-if="tableList.length === 0" description="暂无配置" />
        </div>
      </div>

      <!-- 右侧：配置详情 -->
      <div class="config-detail-panel">
        <template v-if="selectedTable">
          <!-- Table 基础配置 -->
          <div class="basic-config-section">
            <div class="section-title">
              <span>基础配置</span>
              <a-button
                type="primary"
                size="small"
                :loading="saving"
                @click="handleSaveTable"
              >
                保存基础配置
              </a-button>
            </div>
            <div class="section-content">
              <a-form :model="selectedTable" layout="inline">
                <a-form-item label="表格编码">
                  <a-input
                    v-model:value="selectedTable.tableCode"
                    placeholder="请输入表格编码"
                    style="width: 200px"
                  />
                </a-form-item>
                <a-form-item label="筛选栏宽度">
                  <a-input-number
                    v-model:value="selectedTable.filterWidth"
                    :min="100"
                    :max="500"
                    style="width: 100px"
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
                    <a-select-option value="1"> 允许 </a-select-option>
                    <a-select-option value="0"> 禁用 </a-select-option>
                  </a-select>
                </a-form-item>
                <a-form-item label="状态">
                  <a-select v-model:value="selectedTable.status" style="width: 80px">
                    <a-select-option value="1"> 启用 </a-select-option>
                    <a-select-option value="0"> 禁用 </a-select-option>
                  </a-select>
                </a-form-item>
              </a-form>

              <!-- 筛选列配置 -->
              <div class="filter-columns-config">
                <div class="filter-columns-header" @click="toggleFilterColumns">
                  <span class="filter-columns-title">筛选列配置</span>
                  <span class="filter-columns-count"
                    >（已排除 {{ excludedColumnCount }} 列）</span
                  >
                  <CaretDownOutlined v-if="filterColumnsExpanded" />
                  <CaretRightOutlined v-else />
                </div>
                <div v-show="filterColumnsExpanded" class="filter-columns-list">
                  <a-checkbox
                    v-for="column in portalConfig?.columns || []"
                    :key="column.property"
                    v-model:checked="column.checked"
                  >
                    {{ column.displayName }} ({{ column.property }})
                  </a-checkbox>
                </div>
              </div>
            </div>
          </div>

          <!-- 筛选项配置 - 左右分栏 -->
          <div class="filter-config-section">
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
                      <PlusOutlined />
                    </template>
                    添加
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
                        <a-button type="link" size="small" danger @click.stop>
                          <DeleteOutlined />
                        </a-button>
                      </a-popconfirm>
                    </div>
                  </div>
                  <a-empty v-if="filterList.length === 0" description="暂无筛选项" />
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
                              <a-empty v-else description="请先选择字典编码" />
                            </div>
                          </a-form-item>
                        </a-col>
                        <a-col :span="12">
                          <a-form-item label="是否多选">
                            <a-radio-group v-model:value="selectedFilter.multiple">
                              <a-radio value="1"> 是 </a-radio>
                              <a-radio value="0"> 否 </a-radio>
                            </a-radio-group>
                          </a-form-item>
                        </a-col>
                        <a-col :span="12">
                          <a-form-item label="允许清空">
                            <a-radio-group v-model:value="selectedFilter.allowClear">
                              <a-radio value="1"> 是 </a-radio>
                              <a-radio value="0"> 否 </a-radio>
                            </a-radio-group>
                          </a-form-item>
                        </a-col>
                      </a-row>
                    </a-form>
                  </div>
                </template>
                <a-empty v-else description="请选择一个筛选项进行配置" />
              </div>
            </div>
          </div>
        </template>
        <a-empty v-else description="请选择或新增一个表格配置" />
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
      title="添加筛选项"
      width="600px"
      :footer="null"
      @cancel="showAddFilterModal = false"
    >
      <a-tabs v-model:active-key="addFilterTab">
        <!-- 从字段创建 Tab -->
        <a-tab-pane key="fromField" tab="从字段创建">
          <a-form :model="fieldCreateForm" layout="vertical">
            <a-form-item label="搜索字段">
              <a-input
                v-model:value="fieldSearchKeyword"
                allow-clear
                placeholder="输入字段名称或编码搜索"
                style="width: 100%"
              />
            </a-form-item>
            <a-form-item label="选择字段">
              <div class="field-pick-grid">
                <div
                  v-for="field in filteredAvailableFields"
                  :key="field.key"
                  :class="[
                    'field-pick-item',
                    { active: fieldCreateForm.selectedFieldKey === field.key },
                  ]"
                  @click="handleFieldChange(field.key)"
                >
                  <div class="field-pick-name">
                    {{ field.displayName }}
                  </div>
                  <div class="field-pick-code">
                    {{ field.property }}
                  </div>
                </div>
                <a-empty
                  v-if="filteredAvailableFields.length === 0"
                  :image="null"
                  description="无匹配字段"
                  style="grid-column: 1 / -1"
                />
              </div>
            </a-form-item>
            <a-form-item label="筛选项标签">
              <a-input
                v-model:value="fieldCreateForm.label"
                placeholder="自动根据字段生成"
              />
            </a-form-item>
            <div style="text-align: right; margin-top: 24px">
              <a-button @click="showAddFilterModal = false"> 取消 </a-button>
              <a-button
                type="primary"
                :loading="savingFilter"
                style="margin-left: 8px"
                @click="handleCreateFromField"
              >
                确定创建
              </a-button>
            </div>
          </a-form>
        </a-tab-pane>

        <!-- 手动创建 Tab -->
        <a-tab-pane key="manual" tab="手动创建">
          <a-form :model="manualCreateForm" layout="vertical">
            <a-form-item label="筛选项标签">
              <a-input
                v-model:value="manualCreateForm.label"
                placeholder="请输入筛选项标签"
              />
            </a-form-item>
            <div style="text-align: right; margin-top: 24px">
              <a-button @click="showAddFilterModal = false"> 取消 </a-button>
              <a-button
                type="primary"
                :loading="savingFilter"
                style="margin-left: 8px"
                @click="handleCreateManual"
              >
                确定创建
              </a-button>
            </div>
          </a-form>
        </a-tab-pane>
      </a-tabs>
    </a-modal>
  </a-modal>
</template>

<script setup lang="ts">
import {
  DeleteOutlined,
  HolderOutlined,
  PlusOutlined,
  CaretDownOutlined,
  CaretRightOutlined,
} from "@ant-design/icons-vue";
import { message } from "ant-design-vue";
import { ref, watch, computed } from "vue";

import {
  addPortalTable,
  addPortalTableFilter,
  deletePortalTable,
  deletePortalTableFilter,
  FILTER_TYPE_OPTIONS,
  PortalTableFilterVO,
  PortalTableVO,
  getPortalTableFilterList,
  getPortalTableList,
  updatePortalTable,
  updatePortalTableFilter,
  updatePortalTableFilterOrder,
  IdOrderReqVO,
} from "@/framework/apis/portal/table";
import { ConditionType } from "@/framework/components/common/AdvancedSearch/type";
import PortalAdvancedSearchModal from "@/framework/components/common/Portal/modal/PortalAdvancedSearchModal.vue";
import { FILTER_TYPE } from "@/framework/components/common/Portal/type";
import { buildCondition } from "@/framework/components/common/Portal/utils";
import { dictStore } from "@/framework/store/common";

const props = defineProps<{
  modelValue: boolean;
  portalName?: string;
  portalConfig?: any;
  columns?: any[];
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

const dict = dictStore();

const visible = ref(false);
const saving = ref(false);
const savingFilter = ref(false);
const loadingFilters = ref(false);
const tableList = ref<PortalTableVO[]>([]);
const selectedTable = ref<PortalTableVO | null>(null);
const filterList = ref<PortalTableFilterVO[]>([]);
const filterCountMap = ref<Map<number, number>>(new Map());
const selectedFilter = ref<PortalTableFilterVO | null>(null);

// 筛选列配置展开/收起状态
const filterColumnsExpanded = ref(false);

// 字典列表
const sysDictList = ref<Array<any>>([]);

// 拖拽状态
const draggedIndex = ref<number | null>(null);
const dragOverIndex = ref<number | null>(null);

// 添加筛选项弹窗状态
const showAddFilterModal = ref(false);
const addFilterTab = ref("fromField");

// 从字段创建表单
const fieldCreateForm = reactive({
  selectedFieldKey: "",
  code: "",
  label: "",
});

// 字段搜索关键词
const fieldSearchKeyword = ref("");

// 过滤后的可选字段
const filteredAvailableFields = computed(() => {
  const keyword = fieldSearchKeyword.value.trim().toLowerCase();
  if (!keyword) return availableFields.value;
  return availableFields.value.filter(
    (f) =>
      f.displayName.toLowerCase().includes(keyword) ||
      f.property.toLowerCase().includes(keyword)
  );
});

// 手动创建表单
const manualCreateForm = reactive({
  label: "",
});

// 可选字段列表（用于筛选条件配置）
const availableFields = ref<
  Array<{
    key: string;
    title: string;
    property: string;
    displayName: string;
    reference: string;
  }>
>([]);

// 筛选条件配置弹窗
const filterConditionConfig = reactive({
  show: false,
  columnArray: [] as Array<any>,
  condition: {} as ConditionType,
  okText: "保存条件",
});

// 条件配置（新格式）
interface ConditionConfig {
  default: any[]; // 通用兜底 condition
  options: Record<string, any[]>; // 按字典值映射的特殊 condition
}

// 当前筛选项的条件配置
const conditionConfig = reactive<ConditionConfig>({
  default: [],
  options: {},
});

// 当前编辑的特殊选项值
const editingOptionValue = ref<string>("");

// 当前筛选项的字典选项列表
const filterDictOptions = ref<Array<{ label: string; value: string }>>([]);

// 判断是否有通用 condition
const hasDefaultCondition = computed(() => {
  return conditionConfig.default && conditionConfig.default.length > 0;
});

// 判断是否是新格式的 condition
const isNewConditionFormat = (condition: any): condition is ConditionConfig => {
  return condition && typeof condition === "object" && "default" in condition;
};

// 解析 condition 字符串到 conditionConfig
const parseCondition = (conditionStr: string | undefined) => {
  if (!conditionStr) {
    conditionConfig.default = [];
    conditionConfig.options = {};
    return;
  }

  try {
    const parsed = JSON.parse(conditionStr);

    if (isNewConditionFormat(parsed)) {
      // 新格式
      conditionConfig.default = parsed.default || [];
      conditionConfig.options = parsed.options || {};
    } else {
      // 老格式，作为通用 condition
      if (Array.isArray(parsed)) {
        conditionConfig.default = parsed;
      } else if (parsed.conditionList && Array.isArray(parsed.conditionList)) {
        conditionConfig.default = parsed.conditionList;
      } else {
        conditionConfig.default = [];
      }
      conditionConfig.options = {};
    }
  } catch (e) {
    console.warn("解析 condition 失败:", e);
    conditionConfig.default = [];
    conditionConfig.options = {};
  }
};

// 序列化 conditionConfig 到字符串
const serializeCondition = (): string => {
  const config: ConditionConfig = {
    default: conditionConfig.default,
    options: conditionConfig.options,
  };
  return JSON.stringify(config);
};

// 加载当前筛选项的字典选项
const loadFilterDictOptions = async () => {
  if (!selectedFilter.value?.dictCode) {
    filterDictOptions.value = [];
    return;
  }

  try {
    const res = await dict.getDict(selectedFilter.value.dictCode);
    filterDictOptions.value = (res || []).map((item: any) => ({
      label: item.label || item.value,
      value: String(item.value),
    }));
  } catch (error) {
    console.error("加载字典选项失败:", error);
    filterDictOptions.value = [];
  }
};

// 删除特殊选项条件
const removeOptionCondition = (optionValue: string) => {
  delete conditionConfig.options[optionValue];
  // 保存
  selectedFilter.value!.condition = serializeCondition();
  handleSaveFilter(selectedFilter.value!);
};

// 筛选类型选项
const filterTypeOptions = FILTER_TYPE_OPTIONS;

// 获取筛选类型标签
const getFilterTypeLabel = (type: string | undefined) => {
  const option = filterTypeOptions.find((o) => o.value === type);
  return option?.label || type || "未知";
};

// 监听弹窗显示状态
watch(
  () => props.modelValue,
  (newVal) => {
    visible.value = newVal;
    if (newVal) {
      loadTableList();
      initAvailableFields();
      loadDictList();
    }
  }
);

// 监听 columns 变化
watch(
  () => props.columns,
  (newColumns) => {
    console.log("columns 变化:", newColumns);
    if (visible.value) {
      initAvailableFields();
    }
  },
  { deep: true }
);

watch(visible, (newVal) => {
  emit("update:modelValue", newVal);
});

// 初始化可选字段列表
const initAvailableFields = () => {
  console.log("初始化字段列表，props.columns:", props.columns);
  if (props.columns && props.columns.length > 0) {
    availableFields.value = props.columns.map((col: any) => ({
      key: col.property,
      title: `${col.displayName} (${col.property})`,
      property: col.property,
      displayName: col.displayName,
      reference: col.reference,
    }));
    console.log("availableFields 已设置:", availableFields.value);
  } else {
    availableFields.value = [];
    console.log("availableFields 设置为空数组");
  }
};

// 初始化筛选列配置
const initFilterColumnsConfig = () => {
  if (!props.portalConfig?.columns) return;

  // 获取当前要排除的列名列表
  const excludedColumns = selectedTable.value?.filterColumns
    ? selectedTable.value.filterColumns.split(",").map((s: string) => s.trim())
    : [];

  // 默认所有列都 checked = true，排除的列设为 false
  props.portalConfig.columns.forEach((column: any) => {
    if (excludedColumns.includes(column.property)) {
      column.checked = false;
    } else {
      column.checked = true;
    }
  });
};

// 计算已排除的列数量
const excludedColumnCount = computed(() => {
  if (!props.portalConfig?.columns) return 0;
  return props.portalConfig.columns.filter((col: any) => col.checked === false).length;
});

// 切换筛选列配置的展开/收起状态
const toggleFilterColumns = () => {
  filterColumnsExpanded.value = !filterColumnsExpanded.value;
};

// 加载字典列表
const loadDictList = async () => {
  const res = await dict.getAllDict("");
  sysDictList.value = (res || []).map((item: any) => ({
    label: item.label || item.value,
    value: item.value,
  }));
};

// 加载表格配置列表
const loadTableList = async () => {
  if (!props.portalName) {
    tableList.value = [];
    return;
  }
  try {
    const res = await getPortalTableList(props.portalName);
    if (res.payload?.records) {
      tableList.value = res.payload.records;
      // 加载每个 table 的筛选项数量
      for (const table of tableList.value) {
        if (table.id) {
          const filterRes = await getPortalTableFilterList(table.id);
          filterCountMap.value.set(table.id, filterRes.payload?.total || 0);
        }
      }
    }
  } catch (error) {
    console.error("加载表格配置失败:", error);
  }
};

// 获取筛选项数量
const getFilterCount = (tableId: number | undefined) => {
  if (!tableId) return 0;
  return filterCountMap.value.get(tableId) || 0;
};

// 选择表格配置
const handleSelectTable = async (table: PortalTableVO) => {
  selectedTable.value = table;
  selectedFilter.value = null;
  await loadFilterList(table.id!);
  // 每次选择表格时重新初始化字段列表
  initAvailableFields();
  // 初始化筛选列配置
  initFilterColumnsConfig();
};

// 选择筛选项
const handleSelectFilter = (filter: PortalTableFilterVO) => {
  selectedFilter.value = filter;
  // 解析 condition 到 conditionConfig
  parseCondition(filter.condition);
  // 清空字典选项，需要用户手动加载
  filterDictOptions.value = [];
  // 如果有 dictCode，自动加载
  if (filter.dictCode) {
    loadFilterDictOptions();
  }
};

// 加载筛选项列表
const loadFilterList = async (tableId: number) => {
  loadingFilters.value = true;
  try {
    const res = await getPortalTableFilterList(tableId);
    filterList.value = res.payload?.records || [];
    // 默认选中第一个
    if (filterList.value.length > 0 && !selectedFilter.value) {
      selectedFilter.value = filterList.value[0];
    }
  } catch (error) {
    console.error("加载筛选项失败:", error);
    filterList.value = [];
  } finally {
    loadingFilters.value = false;
  }
};

// 新增表格配置
const handleAddTable = async () => {
  if (!props.portalName) {
    message.warning("请先选择一个表格配置");
    return;
  }
  const newTable: PortalTableVO = {
    portalName: props.portalName,
    tableCode: "",
    filterWidth: 260,
    paddingTh: 2,
    paddingTd: 7,
    status: "1",
  };
  saving.value = true;
  try {
    const res = await addPortalTable(newTable);
    if (res.payload) {
      message.success("新增成功");
      await loadTableList();
      // 选中新创建的配置
      const newRecord = tableList.value.find(
        (t) => t.tableCode === "" && t.portalName === props.portalName
      );
      if (newRecord) {
        handleSelectTable(newRecord);
      }
    }
  } catch (error) {
    console.error("新增失败:", error);
  } finally {
    saving.value = false;
  }
};

// 保存表格配置
const handleSaveTable = async () => {
  if (!selectedTable.value) return;
  saving.value = true;
  try {
    // 构建 filterColumns：收集所有 checked = false 的列名
    const excludedColumns = (props.portalConfig?.columns || [])
      .filter((col: any) => col.checked === false)
      .map((col: any) => col.property);

    // 如果没有排除的列，设为 null；否则用逗号连接
    selectedTable.value.filterColumns =
      excludedColumns.length > 0 ? excludedColumns.join(",") : null;

    await updatePortalTable(selectedTable.value);
    message.success("保存成功");
    await loadTableList();
  } catch (error) {
    console.error("保存失败:", error);
  } finally {
    saving.value = false;
  }
};

// 删除表格配置
const handleDeleteTable = async (table: PortalTableVO) => {
  try {
    await deletePortalTable(table.id!);
    message.success("删除成功");
    if (selectedTable.value?.id === table.id) {
      selectedTable.value = null;
      filterList.value = [];
      selectedFilter.value = null;
    }
    await loadTableList();
  } catch (error) {
    console.error("删除失败:", error);
  }
};

// 保存筛选项
const handleSaveFilter = async (filter: PortalTableFilterVO) => {
  savingFilter.value = true;
  try {
    if (filter.id) {
      await updatePortalTableFilter(filter);
    } else {
      const res = await addPortalTableFilter(filter);
      filter.id = res.payload;
    }
    message.success("保存成功");
    await loadFilterList(selectedTable.value!.id!);
  } catch (error) {
    console.error("保存筛选项失败:", error);
  } finally {
    savingFilter.value = false;
  }
};

// 删除筛选项
const handleDeleteFilter = async (filter: PortalTableFilterVO) => {
  try {
    await deletePortalTableFilter(filter.id!);
    message.success("删除成功");
    // 如果删除的是当前选中的筛选项，清空选中状态
    if (selectedFilter.value?.id === filter.id) {
      selectedFilter.value = null;
    }
    await loadFilterList(selectedTable.value!.id!);
    filterCountMap.value.set(selectedTable.value!.id!, filterList.value.length);
  } catch (error) {
    console.error("删除筛选项失败:", error);
  }
};

// 拖拽排序结束
const handleFilterDragEnd = async () => {
  // 更新 displayOrder
  const orderList: IdOrderReqVO[] = [];
  filterList.value.forEach((filter, index) => {
    filter.displayOrder = index + 1;
    if (filter.id) {
      orderList.push({ id: filter.id, showOrder: index + 1 });
    }
  });

  // 调用接口保存排序
  if (orderList.length > 0) {
    try {
      await updatePortalTableFilterOrder(orderList);
      message.success("排序已保存");
    } catch (error) {
      console.error("保存排序失败:", error);
    }
  }
};

// 拖拽开始
const handleDragStart = (e: DragEvent, index: number) => {
  draggedIndex.value = index;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  }
};

// 拖拽悬停
const handleDragOver = (e: DragEvent, index: number) => {
  e.preventDefault();
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = "move";
  }
  dragOverIndex.value = index;
};

// 拖拽放置
const handleDrop = (e: DragEvent, targetIndex: number) => {
  e.preventDefault();
  if (draggedIndex.value === null || draggedIndex.value === targetIndex) {
    return;
  }

  // 重新排序
  const newList = [...filterList.value];
  const [movedItem] = newList.splice(draggedIndex.value, 1);
  newList.splice(targetIndex, 0, movedItem);
  filterList.value = newList;

  // 保存排序
  handleFilterDragEnd();
};

// 拖拽结束
const handleDragEnd = () => {
  draggedIndex.value = null;
  dragOverIndex.value = null;
};

// 穿梭框过滤
const filterOption = (inputValue: string, option: any) => {
  const label = option.title || option.label || "";
  return label.toLowerCase().indexOf(inputValue.toLowerCase()) > -1;
};

// 字段选择过滤
const filterFieldOption = (input: string, option: any) => {
  const children = option.children?.toString() || "";
  return children.toLowerCase().indexOf(input.toLowerCase()) >= 0;
};

// 字段选择变化时自动设置标签
const handleFieldChange = (value: string) => {
  fieldCreateForm.selectedFieldKey = value;
  const selectedField = availableFields.value.find((f) => f.key === value);
  if (selectedField) {
    fieldCreateForm.code = selectedField.property;
    fieldCreateForm.label = selectedField.displayName;
  }
};

// 筛选类型变化时自动设置字典编码
const handleFilterTypeChange = (value: string) => {
  // 如果切换到select/select_multi_in_one类型，且当前选中的字段有reference，则自动填入
  if ((value === "select" || value === "select_multi_in_one") && selectedFilter.value) {
    console.log("筛选类型变更为下拉选择，尝试自动填充字典编码");

    // 首先尝试通过label精确匹配
    let matchedField = availableFields.value.find(
      (f) => f.displayName === selectedFilter.value?.label
    );
    console.log("通过label匹配结果:", matchedField);

    // 如果没找到，尝试通过property匹配
    if (!matchedField && selectedFilter.value.label) {
      // 从condition中提取property
      try {
        const conditionStr = selectedFilter.value.condition;
        if (conditionStr) {
          const condition = JSON.parse(conditionStr);
          const conditionList = Array.isArray(condition)
            ? condition
            : condition.conditionList || [];
          if (conditionList.length > 0 && conditionList[0].property) {
            matchedField = availableFields.value.find(
              (f) => f.property === conditionList[0].property
            );
            console.log("通过property匹配结果:", matchedField);
          }
        }
      } catch (e) {
        console.warn("解析condition失败:", e);
      }
    }

    // 如果找到了匹配的字段且有reference，则填入字典编码
    if (matchedField?.reference) {
      selectedFilter.value.dictCode = matchedField.reference;
      message.success(`已自动填入字典编码: ${matchedField.reference}`);
      console.log(
        `成功为筛选项 "${selectedFilter.value.label}" 填入字典编码: ${matchedField.reference}`
      );
    } else {
      console.log("未找到匹配的字段或字段没有reference");
      message.info("未找到对应的字典编码，请手动选择");
    }
  }
};

// 从字段创建筛选项
const handleCreateFromField = async () => {
  if (!fieldCreateForm.selectedFieldKey) {
    message.warning("请选择字段");
    return;
  }

  if (!fieldCreateForm.label) {
    message.warning("标签不能为空");
    return;
  }

  const selectedField = availableFields.value.find(
    (f) => f.key === fieldCreateForm.selectedFieldKey
  );
  if (!selectedField) {
    message.error("选择的字段不存在");
    return;
  }

  const maxOrder = Math.max(0, ...filterList.value.map((f) => f.displayOrder || 0));

  // 从portalConfig.columns中找到对应字段的完整配置
  const fieldConfig = props.portalConfig?.columns?.find(
    (col: any) => col.property === selectedField.key
  );

  // 根据字段配置判断筛选类型
  let filterType = "input";
  let dictCode = "";

  if (fieldConfig) {
    console.log(`找到字段配置:`, fieldConfig);

    // 根据字段类型判断筛选类型
    if (fieldConfig.fieldType === "6" || fieldConfig.fieldType === "7") {
      // Date or DateTime
      filterType = "date";
    } else if (fieldConfig.fieldType === "4" || fieldConfig.fieldType === "18") {
      // Select or SelectMultiInOne
      filterType = "select";
    } else if (fieldConfig.fieldType === "2") {
      // Switch
      filterType = "switch";
    } else if (fieldConfig.fieldType === "3") {
      // Number
      filterType = "number";
    } else if (
      fieldConfig.property.includes("Status") ||
      fieldConfig.property.includes("Type")
    ) {
      // 兜底逻辑：通过属性名判断
      filterType = "select";
    }

    // 如果是下拉选择类型且字段有reference，则设置字典编码
    if (
      (filterType === "select" || filterType === "select_multi_in_one") &&
      fieldConfig.reference
    ) {
      dictCode = fieldConfig.reference;
      console.log(`为字段 ${selectedField.displayName} 自动设置字典编码: ${dictCode}`);
    }
  } else {
    console.warn(`未找到字段 ${selectedField.key} 的配置信息`);
    // 兜底逻辑：通过属性名判断
    if (
      selectedField.property.includes("Time") ||
      selectedField.property.includes("Date")
    ) {
      filterType = "date";
    } else if (
      selectedField.property.includes("Status") ||
      selectedField.property.includes("Type")
    ) {
      filterType = "select";
    }
  }

  const conditionList = [];
  conditionList.push(buildCondition(selectedField.property, FILTER_TYPE.EQUAL, ["$1"]));

  const newFilter: PortalTableFilterVO = {
    tableId: selectedTable.value!.id!,
    code: fieldCreateForm.code,
    label: fieldCreateForm.label,
    filterType,
    dictCode,
    placeholder: `请输入${fieldCreateForm.label}`,
    defaultValue: "",
    multiple: "1",
    allowClear: "1",
    displayOrder: maxOrder + 1,
    status: "1",
    condition: JSON.stringify(conditionList),
  };

  savingFilter.value = true;
  showAddFilterModal.value = false;
  try {
    const res = await addPortalTableFilter(newFilter);
    if (res.payload) {
      message.success("添加成功");
      await loadFilterList(selectedTable.value!.id!);
      // 选中新创建的筛选项
      const newRecord = filterList.value.find((f) => f.label === fieldCreateForm.label);
      if (newRecord) {
        selectedFilter.value = newRecord;
        // 如果是select类型且有reference，确保字典编码已设置
        if (
          (newRecord.filterType === "select" ||
            newRecord.filterType === "select_multi_in_one") &&
          !newRecord.dictCode &&
          fieldConfig?.reference
        ) {
          newRecord.dictCode = fieldConfig.reference;
          message.success(`已为新筛选项自动填入字典编码: ${fieldConfig.reference}`);
        }
      }
      // 更新筛选项数量
      filterCountMap.value.set(selectedTable.value!.id!, filterList.value.length);
      // 重置表单
      fieldCreateForm.selectedFieldKey = "";
      fieldCreateForm.label = "";
    }
  } catch (error) {
    console.error("添加筛选项失败:", error);
  } finally {
    savingFilter.value = false;
  }
};

// 手动创建筛选项
const handleCreateManual = async () => {
  if (!manualCreateForm.label) {
    message.warning("请输入筛选项标签");
    return;
  }

  const maxOrder = Math.max(0, ...filterList.value.map((f) => f.displayOrder || 0));

  const newFilter: PortalTableFilterVO = {
    tableId: selectedTable.value!.id!,
    label: manualCreateForm.label,
    filterType: "input",
    placeholder: `请输入${manualCreateForm.label}`,
    defaultValue: "",
    multiple: "0",
    allowClear: "1",
    displayOrder: maxOrder + 1,
    status: "1",
    condition: "",
  };

  savingFilter.value = true;
  showAddFilterModal.value = false;
  try {
    const res = await addPortalTableFilter(newFilter);
    if (res.payload) {
      message.success("添加成功");
      await loadFilterList(selectedTable.value!.id!);
      // 选中新创建的筛选项
      const newRecord = filterList.value.find((f) => f.label === manualCreateForm.label);
      if (newRecord) {
        selectedFilter.value = newRecord;
      }
      // 更新筛选项数量
      filterCountMap.value.set(selectedTable.value!.id!, filterList.value.length);
      // 重置表单
      manualCreateForm.label = "";
    }
  } catch (error) {
    console.error("添加筛选项失败:", error);
  } finally {
    savingFilter.value = false;
  }
};

// 构建字段列表（通用方法）
const buildColumnArray = () => {
  filterConditionConfig.columnArray = [];
  if (props.columns && props.columns.length > 0) {
    filterConditionConfig.columnArray = props.columns.map((col: any) => ({
      key: col.property,
      title: col.displayName,
      fieldType: col.fieldType,
      referenceDictOption: col.referenceDictOption,
    }));
  }
};

// 打开通用条件配置弹窗
const openDefaultConditionModal = () => {
  if (!selectedFilter.value) return;

  buildColumnArray();
  editingOptionValue.value = ""; // 标记为编辑通用条件

  // 使用 conditionConfig.default 作为当前条件
  filterConditionConfig.condition = {
    andOr: "0",
    conditionList: conditionConfig.default || [],
  };

  filterConditionConfig.show = true;
};

// 打开特殊选项条件配置弹窗
const openOptionConditionModal = (optionValue: string) => {
  if (!selectedFilter.value) return;

  buildColumnArray();
  editingOptionValue.value = optionValue; // 标记为编辑特殊选项条件

  // 使用该选项的专属条件
  const optionCondition = conditionConfig.options[optionValue] || [];
  filterConditionConfig.condition = {
    andOr: "0",
    conditionList: optionCondition,
  };

  filterConditionConfig.show = true;
};

// 保存筛选条件配置
const saveFilterCondition = (condition: ConditionType) => {
  if (!selectedFilter.value) return;

  const conditionList = condition.conditionList || [];

  if (editingOptionValue.value) {
    // 保存特殊选项条件
    if (conditionList.length > 0) {
      conditionConfig.options[editingOptionValue.value] = conditionList;
    } else {
      // 空条件则删除
      delete conditionConfig.options[editingOptionValue.value];
    }
  } else {
    // 保存通用条件
    conditionConfig.default = conditionList;
  }

  // 序列化存储
  selectedFilter.value.condition = serializeCondition();
  filterConditionConfig.show = false;

  // 自动保存
  handleSaveFilter(selectedFilter.value);
};

// 取消
const handleCancel = () => {
  visible.value = false;
};
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
  overflow: hidden;
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
    cursor: pointer;
    transition: all 0.2s;
    user-select: none;

    &:hover {
      background: var(--bg-active);
    }

    .filter-columns-title {
      font-weight: 500;
      font-size: 14px;
      color: var(--text-primary);
    }

    .filter-columns-count {
      font-size: 13px;
      color: var(--text-tertiary);
    }

    .anticon {
      font-size: 14px;
      color: var(--text-tertiary);
      transition: transform 0.2s;
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

.filter-config-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
  min-height: 0;
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

.field-pick-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  max-height: 320px;
  overflow-y: auto;
  padding: 4px;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
}

.field-pick-item {
  padding: 8px 12px;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--bg-elevated);

  &:hover {
    border-color: var(--accent);
    background: var(--accent-soft);
  }

  &.active {
    border-color: var(--accent);
    background: var(--accent-soft);
    box-shadow: 0 0 0 2px var(--accent-soft);
  }

  .field-pick-name {
    font-weight: 500;
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .field-pick-code {
    font-size: 12px;
    color: var(--text-tertiary);
    margin-top: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
