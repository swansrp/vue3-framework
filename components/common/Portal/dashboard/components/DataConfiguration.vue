<template>
  <div class="data-section">
    <div class="section-header" @click="toggleCollapse">
      <div class="data-header">
        <h4>数据配置</h4>
        <a-button 
          type="primary" 
          size="small" 
          @click.stop="openDataConfig('add')"
        >
          添加数据
        </a-button>
      </div>
      <a-button type="text" size="small" class="collapse-btn">
        <DownOutlined v-if="!collapsed" />
        <RightOutlined v-else />
      </a-button>
    </div>
    
    <div v-show="!collapsed" class="section-content">
      <div class="data-list">
        <div 
          v-for="metric in dataMetrics" 
          :key="metric.id"
          class="data-item"
        >
          <div class="data-item-header">
            <span class="data-name">{{ metric.dataName }}</span>
            <div class="data-actions">
              <a-button 
                type="text" 
                size="small" 
                @click="openDataConfig('edit', metric)"
              >
                编辑
              </a-button>
              <a-button 
                type="text" 
                size="small" 
                danger
                @click="removeDataMetric(metric.id)"
              >
                删除
              </a-button>
            </div>
          </div>
          
          <div class="data-item-content">
            <div class="data-row">
              <span class="data-label">图表类型：</span>
              <span class="data-value">
                <a-select 
                  :value="metric.chartType"
                  size="small"
                  style="width: 120px"
                  @change="(value) => updateMetricField(metric.id, 'chartType', value)"
                >
                  <a-select-option 
                    v-for="option in chartTypeOptions" 
                    :key="option.value" 
                    :value="option.value"
                  >
                    {{ option.label }}
                  </a-select-option>
                </a-select>
              </span>
            </div>
            <div class="data-row" v-if="metric.chartType !== 'pie'">
              <span class="data-label">坐标轴：</span>
              <span class="data-value">
                <a-select 
                  :value="metric.yAxisPosition"
                  size="small"
                  style="width: 120px"
                  @change="(value) => updateMetricField(metric.id, 'yAxisPosition', value)"
                >
                  <a-select-option 
                    v-for="option in axisPositionOptions" 
                    :key="option.value" 
                    :value="option.value"
                  >
                    {{ option.label }}
                  </a-select-option>
                </a-select>
              </span>
            </div>
            <div class="data-row" v-if="metric.chartType === 'bar'">
              <span class="data-label">堆叠：</span>
              <span class="data-value">
                <a-select 
                  :value="metric.stackGroup"
                  size="small"
                  style="width: 120px"
                  @change="(value) => updateMetricField(metric.id, 'stackGroup', value)"
                >
                  <a-select-option 
                    v-for="option in stackOptions" 
                    :key="option.value" 
                    :value="option.value"
                  >
                    {{ option.label }}
                  </a-select-option>
                </a-select>
              </span>
            </div>
            
            <!-- 二级维度值的颜色设置 -->
            <div v-if="(secondDimension && secondDimension.items && secondDimension.items.length > 0) || (firstDimension && firstDimension.items && firstDimension.items.length > 0 && !secondDimension)" class="data-color-config">
              <div class="color-label">颜色配置：</div>
              <div class="color-items">
                <!-- 如果有二级维度，显示二级维度的项 -->
                <template v-if="secondDimension && secondDimension.items && secondDimension.items.length > 0">
                  <div 
                    v-for="item in secondDimension.items" 
                    :key="item.key"
                    class="color-item"
                  >
                    <span class="item-name">{{ item.title }}</span>
                    <a-button 
                      class="color-picker-btn"
                      :style="{ backgroundColor: getDataItemColor(metric.id, item.key) }"
                      @click="openDataItemColorPicker(metric.id, item.key)"
                    />
                  </div>
                </template>
                <!-- 如果只有一级维度，显示一级维度的项 -->
                <template v-else-if="firstDimension && firstDimension.items && firstDimension.items.length > 0 && !secondDimension">
                  <div 
                    v-for="item in firstDimension.items" 
                    :key="item.key"
                    class="color-item"
                  >
                    <span class="item-name">{{ item.title }}</span>
                    <a-button 
                      class="color-picker-btn"
                      :style="{ backgroundColor: getDataItemColor(metric.id, item.key) }"
                      @click="openDataItemColorPicker(metric.id, item.key)"
                    />
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 数据配置模态框 -->
      <a-modal
        v-model:open="dataConfigVisible"
        :title="dataFormMode === 'add' ? '添加数据' : '编辑数据'"
        @ok="confirmDataConfig"
        @cancel="dataConfigVisible = false"
        width="600px"
      >
        <a-form
          :model="editingDataMetric"
          :label-col="{ span: 6 }"
          :wrapper-col="{ span: 18 }"
          v-if="editingDataMetric"
        >
          <a-form-item label="数据类型" required>
            <a-select 
              v-model:value="editingDataMetric.dataField" 
              placeholder="请选择数据类型"
              @change="onDataTypeChange"
            >
              <a-select-option 
                v-for="dataType in availableDataTypes" 
                :key="dataType.dataField" 
                :value="dataType.dataField"
                :disabled="isDataTypeUsed(dataType.dataField)"
              >
                {{ dataType.dataName }}
                <span v-if="isDataTypeUsed(dataType.dataField)" class="used-tag">(已使用)</span>
              </a-select-option>
            </a-select>
          </a-form-item>
          
          <a-form-item label="图表类型" required>
            <a-select v-model:value="editingDataMetric.chartType" placeholder="请选择图表类型">
              <a-select-option 
                v-for="option in chartTypeOptions" 
                :key="option.value" 
                :value="option.value"
              >
                {{ option.label }}
              </a-select-option>
            </a-select>
          </a-form-item>
          
          <a-form-item label="坐标轴位置" v-if="editingDataMetric.chartType !== 'pie'">
            <a-radio-group v-model:value="editingDataMetric.yAxisPosition">
              <a-radio value="left">左侧</a-radio>
              <a-radio value="right">右侧</a-radio>
            </a-radio-group>
          </a-form-item>
          
          <a-form-item label="堆叠位置" v-if="editingDataMetric.chartType === 'bar'">
            <a-select 
              v-model:value="editingDataMetric.stackGroup" 
              placeholder="请选择堆叠位置"
              allow-clear
            >
              <a-select-option 
                v-for="option in stackOptions" 
                :key="option.value" 
                :value="option.value"
              >
                {{ option.label }}
              </a-select-option>
            </a-select>
            <div class="stack-tip">
              <small>提示：选择相同堆叠位置的数据将会显示在同一根柱子上</small>
            </div>
          </a-form-item>
        </a-form>
      </a-modal>

      <!-- 数据项颜色选择器 -->
      <ColorPicker
        v-model:visible="dataItemColorPickerVisible"
        title="选择数据项颜色"
        :initial-color="currentDataItemColor"
        @confirm="confirmDataItemColorChange"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import { message } from 'ant-design-vue'
import { DownOutlined, RightOutlined } from '@ant-design/icons-vue'
import ColorPicker from './ColorPicker.vue'

// 接口定义
interface IndicatorItem {
  key: string
  title: string
  color?: string
  isLeaf?: boolean
  condition?: string
}

interface IndicatorGroup {
  key: string
  title: string
  children?: IndicatorGroup[]
  items?: IndicatorItem[]
  color?: string
  isLeaf?: boolean
}

interface DataMetricUI {
  id: string
  dataName: string
  dataField: string
  chartType: 'bar' | 'line' | 'pie'
  color: string
  yAxisPosition: 'left' | 'right'
  stackGroup?: string
  unit?: string
  itemColors?: Record<string, string>
}

interface DataTypeOption {
  dataName: string
  dataField: string
  unit?: string
}

// Props
const props = defineProps<{
  dataMetrics: DataMetricUI[]
  firstDimension: IndicatorGroup | null
  secondDimension: IndicatorGroup | null
  availableDataTypes: DataTypeOption[]
}>()

// Emits
const emit = defineEmits<{
  'update:dataMetrics': [metrics: DataMetricUI[]]
  'updateMetricField': [metricId: string, field: string, value: any]
}>()

// 折叠状态
const collapsed = ref(false)

// 配置选项
const chartTypeOptions = ref<{ label: string; value: string }[]>([
  { value: 'bar', label: '柱状图' },
  { value: 'line', label: '折线图' },
  { value: 'pie', label: '饼图' }
])

const axisPositionOptions = ref<{ label: string; value: string }[]>([
  { value: 'left', label: '左侧' },
  { value: 'right', label: '右侧' }
])

const stackOptions = ref<{ label: string; value: string }[]>([
  { label: '堆叠组1', value: 'stack1' },
  { label: '堆叠组2', value: 'stack2' },
  { label: '堆叠组3', value: 'stack3' },
  { label: '堆叠组4', value: 'stack4' },
  { label: '堆叠组5', value: 'stack5' }
])

// 数据配置相关状态
const dataConfigVisible = ref(false)
const editingDataMetric = ref<DataMetricUI | null>(null)
const dataFormMode = ref<'add' | 'edit'>('add')

// 数据项颜色配置相关状态
const dataItemColorPickerVisible = ref(false)
const currentDataItemTarget = ref<{ metricId: string; itemKey: string }>({ metricId: '', itemKey: '' })

// 计算属性
const currentDataItemColor = computed(() => {
  if (!currentDataItemTarget.value.metricId || !currentDataItemTarget.value.itemKey) {
    return '#1890ff'
  }
  return getDataItemColor(currentDataItemTarget.value.metricId, currentDataItemTarget.value.itemKey)
})

// 默认颜色配置
const defaultColors = ref<string[]>([
  '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
  '#13c2c2', '#eb2f96', '#fa8c16', '#a0d911', '#2f54eb'
])

const presetColors = [
  '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
  '#13c2c2', '#eb2f96', '#fa8c16', '#a0d911', '#2f54eb',
  '#fa541c', '#1890ff', '#722ed1', '#eb2f96', '#52c41a',
  '#faad14', '#13c2c2', '#f5222d', '#fa8c16', '#a0d911'
]

// 方法
const updateMetricField = (metricId: string, field: string, value: any) => {
  emit('updateMetricField', metricId, field, value)
}

const openDataConfig = (mode: 'add' | 'edit', metric?: DataMetricUI) => {
  dataFormMode.value = mode
  
  if (mode === 'add') {
    editingDataMetric.value = {
      id: `metric_${Date.now()}`,
      dataName: '',
      dataField: '',
      chartType: 'bar',
      color: getRandomColor(),
      yAxisPosition: 'left',
      stackGroup: 'stack1',
      unit: '',
      itemColors: {}
    }
  } else if (metric) {
    editingDataMetric.value = { ...metric }
  }
  
  dataConfigVisible.value = true
}

const onDataTypeChange = (value: any) => {
  if (!editingDataMetric.value) return
  
  const dataField = value as string
  const dataType = props.availableDataTypes.find(dt => dt.dataField === dataField)
  if (dataType) {
    editingDataMetric.value.dataName = dataType.dataName
    editingDataMetric.value.dataField = dataType.dataField
    editingDataMetric.value.unit = dataType.unit || ''
  }
}

const isDataTypeUsed = (dataField: string): boolean => {
  return props.dataMetrics.some(metric => 
    metric.dataField === dataField && 
    metric.id !== editingDataMetric.value?.id
  )
}

const confirmDataConfig = () => {
  if (!editingDataMetric.value) return
  
  // 简单验证
  if (!editingDataMetric.value.dataField.trim()) {
    message.warning('请选择数据类型')
    return
  }
  
  // 检查是否重复选择
  if (isDataTypeUsed(editingDataMetric.value.dataField)) {
    message.warning('该数据类型已被选择，请选择其他类型')
    return
  }
  
  const newMetrics = [...props.dataMetrics]
  
  if (dataFormMode.value === 'add') {
    // 初始化维度值的颜色配置
    editingDataMetric.value.itemColors = {}
    
    if (props.secondDimension?.items) {
      // 如果有二级维度，使用二级维度的项
      const itemCount = props.secondDimension.items.length
      const distinctColors = generateDistinctColors(itemCount)
      
      props.secondDimension.items.forEach((item, index) => {
        editingDataMetric.value!.itemColors![item.key] = distinctColors[index] || getRandomColor()
      })
    } else if (props.firstDimension?.items) {
      // 如果只有一级维度，使用一级维度的项
      const itemCount = props.firstDimension.items.length
      const distinctColors = generateDistinctColors(itemCount)
      
      props.firstDimension.items.forEach((item, index) => {
        editingDataMetric.value!.itemColors![item.key] = distinctColors[index] || getRandomColor()
      })
    }
    
    newMetrics.push({ ...editingDataMetric.value })
    message.success('数据添加成功')
  } else {
    const index = newMetrics.findIndex(m => m.id === editingDataMetric.value!.id)
    if (index !== -1) {
      newMetrics[index] = { ...editingDataMetric.value }
      message.success('数据修改成功')
    }
  }
  
  emit('update:dataMetrics', newMetrics)
  dataConfigVisible.value = false
  editingDataMetric.value = null
}

const removeDataMetric = (id: string) => {
  const newMetrics = props.dataMetrics.filter(m => m.id !== id)
  emit('update:dataMetrics', newMetrics)
  message.success('数据删除成功')
}

// 获取数据项颜色
const getDataItemColor = (metricId: string, itemKey: string): string => {
  const metric = props.dataMetrics.find(m => m.id === metricId)
  return metric?.itemColors?.[itemKey] || '#1890ff'
}

// 打开数据项颜色选择器
const openDataItemColorPicker = (metricId: string, itemKey: string) => {
  currentDataItemTarget.value = { metricId, itemKey }
  dataItemColorPickerVisible.value = true
}

// 确认数据项颜色更改
const confirmDataItemColorChange = (color: string) => {
  const { metricId, itemKey } = currentDataItemTarget.value
  const newMetrics = [...props.dataMetrics]
  const metricIndex = newMetrics.findIndex(m => m.id === metricId)
  
  if (metricIndex !== -1) {
    if (!newMetrics[metricIndex].itemColors) {
      newMetrics[metricIndex].itemColors = {}
    }
    newMetrics[metricIndex].itemColors![itemKey] = color
    emit('update:dataMetrics', newMetrics)
  }
}

// 颜色生成函数
const getRandomColor = () => {
  const colors = defaultColors.value.length > 0 ? defaultColors.value : presetColors
  return colors[Math.floor(Math.random() * colors.length)]
}

const generateDistinctColors = (count: number): string[] => {
  if (count <= 0) return []
  
  const colors = defaultColors.value.length > 0 ? defaultColors.value : presetColors
  
  if (count === 1) return [colors[0]]
  if (count <= colors.length) {
    // 如果需要的颜色数量小于等于预设颜色数量，均匀选取
    const step = Math.floor(colors.length / count)
    const result: string[] = []
    for (let i = 0; i < count; i++) {
      result.push(colors[i * step])
    }
    return result
  } else {
    // 如果需要的颜色数量大于预设颜色数量，先用完所有预设颜色，再随机生成
    const result = [...colors]
    for (let i = colors.length; i < count; i++) {
      result.push(colors[i % colors.length])
    }
    return result
  }
}

// 折叠切换
const toggleCollapse = () => {
  collapsed.value = !collapsed.value
}
</script>

<style scoped lang="less">
.data-section {
  margin-bottom: 24px;

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    user-select: none;
    margin-bottom: 16px;
    padding: 8px 12px;
    border-radius: 4px;
    transition: all 0.3s;

    &:hover {
      background-color: #f0f2f5;
    }

    .data-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex: 1;
      margin-right: 8px;

      h4 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: #262626;
      }
    }

    .collapse-btn {
      color: #8c8c8c;
      transition: all 0.2s;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      
      &:hover {
        color: #1890ff;
        background-color: #e6f7ff;
      }
    }
  }
  
  .data-list {
    .data-item {
      border: 1px solid #e8e8e8;
      border-radius: 6px;
      margin-bottom: 12px;
      padding: 12px;
      background: white;
      transition: all 0.3s ease;
      
      &:hover {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      
      .data-item-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        
        .data-name {
          font-weight: 600;
          color: #262626;
          font-size: 13px;
        }
        
        .data-actions {
          display: flex;
          gap: 4px;
        }
      }
      
      .data-item-content {
        .data-row {
          display: flex;
          align-items: center;
          margin-bottom: 6px;
          font-size: 12px;
          line-height: 20px;
          
          .data-label {
            color: #8c8c8c;
            min-width: 60px;
            flex-shrink: 0;
          }
          
          .data-value {
            color: #595959;
            display: flex;
            align-items: center;
            gap: 4px;
            flex: 1;
            
            .ant-tag {
              margin: 0;
              line-height: 18px;
              height: 20px;
              padding: 1px 6px;
              display: inline-flex;
              align-items: center;
            }
          }
        }
        
        .data-color-config {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #f0f0f0;
          
          .color-label {
            font-size: 12px;
            color: #8c8c8c;
            margin-bottom: 8px;
            font-weight: 500;
          }
          
          .color-items {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px 8px;
            
            .color-item {
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 11px;
              padding: 4px 6px;
              background: #fafafa;
              border-radius: 4px;
              border: 1px solid #f0f0f0;
              
              .item-name {
                color: #595959;
                flex: 1;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
              
              .color-picker-btn {
                width: 18px;
                height: 18px;
                border-radius: 2px;
                border: 1px solid #d9d9d9;
                padding: 0;
                cursor: pointer;
                margin-left: 4px;
                flex-shrink: 0;
              }
            }
          }
        }
      }
    }
  }

  .stack-tip {
    margin-top: 4px;
    color: #8c8c8c;
  }
  
  .used-tag {
    color: #ff4d4f;
    font-size: 11px;
  }
}
</style>