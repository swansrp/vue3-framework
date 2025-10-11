<template>
  <a-modal
    v-model:open="visible"
    :width="'95vw'"
    :style="{ top: '20px', paddingBottom: 0 }"
    :body-style="{ height: 'calc(100vh - 120px)', padding: 0, display: 'flex', flexDirection: 'column' }"
    :footer="null"
    :destroy-on-close="true"
    @cancel="handleCancel"
  >
    <!-- 自定义表头区域 -->
    <template #title>
      <div class="modal-header">
        <span class="modal-title">{{ modalTitle }}</span>
        <div class="indicator-name-input">
          <span class="input-label">指标名称：<span class="required-star">*</span></span>
          <a-input
            v-model:value="indicatorName"
            placeholder="请输入指标名称（必填）"
            :maxlength="50"
            :status="indicatorNameError ? 'error' : ''"
            style="width: 200px;"
            @blur="validateIndicatorName"
          />
          <span
            v-if="indicatorNameError"
            class="error-message"
          >{{ indicatorNameError }}</span>
        </div>
        <div class="skip-chart-option">
          <a-checkbox
            v-model:checked="skipChartGeneration"
            :disabled="isEditMode"
          >
            跳过图表配置（仅保存指标名称）
          </a-checkbox>
        </div>
      </div>
    </template>
    <div class="chart-config-modal">
      <!-- 当跳过图表配置时显示提示信息 -->
      <div
        v-if="skipChartGeneration"
        class="skip-chart-message"
      >
        <div class="skip-message-content">
          <InfoCircleOutlined class="info-icon" />
          <p>您选择了跳过图表配置，将只保存指标名称作为根目录。</p>
          <p>后续可以通过编辑功能来添加具体的图表配置。</p>
        </div>
      </div>

      <!-- 直接使用dashboard组件 -->
      <dashboard
        v-if="!skipChartGeneration"
        ref="dashboardRef"
        :table-id="tableId"
        :edit-data="editData"
        :is-edit-mode="isEditMode"
        @save="handleSave"
        @reset-config="handleResetConfig"
      />
    </div>

    <!-- 自定义底部按钮区域 -->
    <div class="modal-footer">
      <a-button @click="handleCancel">
        取消
      </a-button>
      <a-button
        type="primary"
        :loading="saving"
        :disabled="isSaveDisabled"
        @click="handleSaveConfig"
      >
        保存配置
      </a-button>
    </div>
  </a-modal>
</template>

<script lang="ts" setup>
import { InfoCircleOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, nextTick, ref, watch } from 'vue'

import { addPersonalStatistic, updatePersonalStatistic, getPersonalStatistic, addCommonStatistic, getCommonStatistic, updateCommonStatistic } from './api'
import type { IndicatorNode } from './types'

import dashboard from '@/framework/components/common/Portal/dashboard/dashboard.vue'

interface Props {
  visible: boolean
  tableId: string
  editData?: IndicatorNode | null
  isEditMode?: boolean
  isCommonIndicator?: boolean // 是否为通用指标模式
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'save', data: any): void
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  tableId: '',
  editData: null,
  isEditMode: false,
  isCommonIndicator: false
})

const emit = defineEmits<Emits>()

// 弹窗状态
const visible = ref(props.visible)
const saving = ref(false)
const dashboardRef = ref()

// 指标名称
const indicatorName = ref('')
const indicatorNameError = ref('')

// 跳过图表生成选项
const skipChartGeneration = ref(false)

// 配置重置状态
const isConfigReset = ref(false)

// 计算属性
const modalTitle = computed(() => {
  return props.isEditMode ? '编辑图表配置' : '新增图表配置'
})

// 保存按钮是否禁用
const isSaveDisabled = computed(() => {
  // 如果是编辑模式且配置被重置了，则禁用保存按钮
  return props.isEditMode && isConfigReset.value
})

// 监听visible变化
watch(() => props.visible, async (newVal) => {
  visible.value = newVal
  if (newVal) {
    // 重置配置重置状态
    isConfigReset.value = false

    // 重置跳过图表生成选项
    skipChartGeneration.value = false

    // 设置指标名称初始值
    if (props.isEditMode && props.editData) {
      // 编辑模式：使用现有的指标名称，如果没有则使用默认值
      indicatorName.value = props.editData.title
      // 编辑模式下加载配置数据
      await loadEditData()
    } else {
      // 新增模式：设置默认名称
      indicatorName.value = ''
    }

    // 弹窗打开后，等待DOM完全渲染和弹窗动画完成，再触发dashboard组件的布局重新计算
    await nextTick()
    setTimeout(() => {
      if (dashboardRef.value && typeof dashboardRef.value.forceRecalculateLayout === 'function') {
        dashboardRef.value.forceRecalculateLayout()
      }
    }, 300) // 等待弹窗动画完成
  }
})

watch(visible, (newVal) => {
  emit('update:visible', newVal)
})

// 验证指标名称
const validateIndicatorName = () => {
  indicatorNameError.value = ''

  if (!indicatorName.value || !indicatorName.value.trim()) {
    indicatorNameError.value = '指标名称不能为空'
    message.error('指标名称不能为空')
    return false
  }

  if (indicatorName.value.trim().length < 2) {
    indicatorNameError.value = '指标名称至少需要2个字符'
    return false
  }

  if (indicatorName.value.trim().length > 50) {
    indicatorNameError.value = '指标名称不能超过50个字符'
    return false
  }

  return true
}

// 加载编辑数据
const loadEditData = async () => {
  try {
    if (!props.editData?.id) {
      message.error('无法获取指标ID')
      return
    }

    // 1) 优先使用 editData 自带的 indicator（最可靠的来源）
    let savedConfig: any | null = null
    if (props.editData?.indicator) {
      try {
        const raw = props.editData.indicator
        savedConfig = typeof raw === 'string' ? JSON.parse(raw) : raw
      } catch (e) {
        console.warn('editData.indicator 解析失败，尝试通过接口查找:', e)
      }
    }

    // 2) 如仍未获取到配置，则从接口返回的树形数据中递归查找对应 id
    if (!savedConfig) {
      const response = props.isCommonIndicator
          ? await getCommonStatistic(props.tableId)
          : await getPersonalStatistic(props.tableId)
      const personalStatistics = response.payload || []

      const findById = (nodes: any[], id: string | number): any | null => {
        for (const n of nodes) {
          if (String(n.id) === String(id)) return n
          if (Array.isArray(n.children) && n.children.length) {
            const found = findById(n.children, id)
            if (found) return found
          }
        }
        return null
      }

      const currentNode = Array.isArray(personalStatistics)
          ? findById(personalStatistics, props.editData.id)
          : null

      if (currentNode && currentNode.indicator) {
        try {
          savedConfig = typeof currentNode.indicator === 'string'
              ? JSON.parse(currentNode.indicator)
              : currentNode.indicator
        } catch (e) {
          console.error('解析接口返回的 indicator 失败:', e)
        }
      }
    }

    if (!savedConfig) {
      return
    }

    // 验证配置完整性
    if (!savedConfig.firstDimension) {
      message.warn('配置数据缺少 firstDimension，无法回显完整配置')
      return
    }

    // 等待dashboard组件加载完成
    await nextTick()

    // 恢复配置到dashboard组件
    if (dashboardRef.value && savedConfig) {
      await restoreConfigToDashboard(savedConfig)
    }
  } catch (error) {
    console.error('加载编辑数据失败:', error)
    message.error('加载配置数据失败')
  }
}

// 恢复配置到dashboard组件
const restoreConfigToDashboard = async (savedConfig: any) => {
  try {
    // 这里需要根据savedConfig的格式来恢复配置
    // 如果savedConfig是dimensionIndicatorsFilter格式
    if (savedConfig.firstDimension && dashboardRef.value) {
      // 调用dashboard组件的恢复配置方法
      if (typeof dashboardRef.value.restoreConfig === 'function') {
        await dashboardRef.value.restoreConfig(savedConfig)
      } else {
        console.error('dashboard组件没有restoreConfig方法')
        // 如果没有restoreConfig方法，直接设置dimensionIndicatorsFilter
        dashboardRef.value.dimensionIndicatorsFilter = savedConfig
      }
    } else {
      console.warn('配置数据无效或dashboard组件未准备好')
    }
  } catch (error) {
    console.error('恢复配置失败:', error)
    message.error('恢复配置失败')
  }
}

// 处理保存配置
const handleSaveConfig = async () => {
  try {
    saving.value = true

    // 验证指标名称
    if (!validateIndicatorName()) {
      saving.value = false
      return
    }

    let dimensionIndicatorsFilter: any = null

    // 如果没有选择跳过图表配置，则进行图表配置的验证和生成
    if (!skipChartGeneration.value) {
      // 检查是否配置了一级维度
      const firstDimension = dashboardRef.value?.firstDimension
      if (!firstDimension) {
        message.error('请先配置一级维度')
        return
      }

      // 先调用generateChart生成dimensionIndicatorsFilter
      try {
        await dashboardRef.value?.generateChart()
      } catch (error) {
        console.error('生成图表配置失败:', error)
        message.error('生成图表配置失败，请检查配置')
        return
      }

      // 获取生成的dimensionIndicatorsFilter
      dimensionIndicatorsFilter = dashboardRef.value?.dimensionIndicatorsFilter
      if (!dimensionIndicatorsFilter) {
        message.error('获取图表配置失败')
        return
      }
    }

    // 构建指标节点数据
    const indicatorData: Partial<IndicatorNode> = {
      title: indicatorName.value.trim(), // 使用用户输入的指标名称
      tableId: props.tableId,
      order: props.editData?.order || 0,
      show: true,
      // 如果跳过图表配置，则不设置indicator字段，或设置为空字符串
      indicator: skipChartGeneration.value ? '' : JSON.stringify(dimensionIndicatorsFilter)
    }

    // 如果是编辑模式，添加ID
    if (props.isEditMode && props.editData?.id) {
      indicatorData.id = props.editData.id
    }

    // 根据模式调用不同的API
    if (props.isEditMode && props.editData?.id) {
      // 编辑模式：根据指标类型调用对应的更新API
      if (props.isCommonIndicator) {
        await updateCommonStatistic(indicatorData)
      } else {
        await updatePersonalStatistic(indicatorData)
      }
    } else {
      // 新增模式：根据指标类型调用不同的API
      if (props.isCommonIndicator) {
        await addCommonStatistic(indicatorData)
      } else {
        await addPersonalStatistic(indicatorData)
      }
    }

    if (skipChartGeneration.value) {
      message.success('成功保存指标名称')
    } else {
      message.success('保存配置成功')
    }

    emit('save', indicatorData)

    // 清空配置
    if (dashboardRef.value?.clearChart) {
      dashboardRef.value.clearChart()
    }

    // 关闭弹窗
    handleCancel()
  } catch (error) {
    console.error('保存配置失败:', error)
    message.error('保存失败，请稍后重试')
  } finally {
    saving.value = false
  }
}

// 处理保存
const handleSave = async (data: any) => {
  emit('save', data)
}

// 处理重置配置
const handleResetConfig = () => {
  // 清空指标名称
  indicatorName.value = ''
  indicatorNameError.value = ''

  // 重置跳过图表生成选项
  skipChartGeneration.value = false

  // 如果不是新增模式，设置重置状态为true（禁用保存按钮）
  if (props.isEditMode) {
    isConfigReset.value = true
  }
}

// 处理取消
const handleCancel = () => {
  // 清空配置
  if (dashboardRef.value?.clearChart) {
    dashboardRef.value.clearChart()
  }
  // 重置指标名称和错误信息
  indicatorName.value = ''
  indicatorNameError.value = ''
  // 重置跳过图表生成选项
  skipChartGeneration.value = false
  visible.value = false
}
</script>

<style lang="less" scoped>
.chart-config-modal {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  :deep(.hr-indicator-dashboard) {
    height: 100%;
    flex: 1;
    // 弹窗上下文提升图表最小高度
    --chart-min-height: 560px;

    // 针对弹窗环境优化图表展示区域
    .chart-display-area {
      .chart-panel {

        // 在弹窗中给维度控制面板设置更严格的高度限制
        .dimension-controls {
          max-height: 120px !important; // 在弹窗中进一步限制维度控制面板高度
          flex-shrink: 0 !important;
          margin-bottom: 8px !important; // 减少底部间距，节省空间

          .ant-tabs-content-holder {
            max-height: 80px;
            overflow-y: auto;
          }

          .tab-content {
            padding: 8px !important; // 减少内边距
            max-height: 60px;
            overflow-y: auto;

            .ant-checkbox-group {
              gap: 4px 6px !important; // 减少复选框间距

              .ant-checkbox-wrapper {
                font-size: 11px !important; // 缩小字体
                padding: 2px 6px !important; // 减少内边距
                width: auto !important; // 自适应宽度
                min-width: 80px !important;
                max-width: 120px !important;
              }
            }
          }

          .tab-actions {
            padding-top: 4px !important; // 减少顶部间距

            .ant-btn-link {
              font-size: 11px !important;
              padding: 1px 6px !important;
            }
          }
        }

        // 确保图表容器能占满剩余空间
        .chart-container {
          flex: 1 !important;
          min-height: 0 !important;

          // 确保 UniversalChart 组件在弹窗中正常显示
          :deep(.universal-chart-container) {
            height: 100% !important;
            min-height: 400px !important; // 设置合理的最小高度

            .echarts-container {
              height: 100% !important;
              min-height: 400px !important;
            }
          }
        }

        .chart-placeholder {
          min-height: 300px !important; // 占位符也设置合理的最小高度

          .placeholder-content {
            .placeholder-icon {
              font-size: 36px !important; // 适当缩小图标
            }
          }
        }
      }
    }
  }
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;

  .modal-title {
    font-size: 16px;
    font-weight: 600;
    color: #262626;
  }

  .indicator-name-input {
    display: flex;
    align-items: center;
    gap: 8px;

    .input-label {
      font-size: 15px;
      font-weight: 900;
      color: #262626;
      white-space: nowrap;

      .required-star {
        color: #ff4d4f;
        margin-left: 2px;
      }
    }

    .error-message {
      font-size: 12px;
      color: #ff4d4f;
      white-space: nowrap;
      margin-left: 4px;
    }
  }

  .skip-chart-option {
    display: flex;
    align-items: center;

    .ant-checkbox-wrapper {
      font-size: 14px;
      color: #595959;

      &:hover {
        color: #1890ff;
      }

      &.ant-checkbox-wrapper-disabled {
        color: #bfbfbf;
      }
    }
  }
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 8px 16px;
  border-top: 1px solid #f0f0f0;
  background: #fff;
  flex-shrink: 0;
  margin-top: auto;
  margin: 0 -8px -8px -8px;
}

.skip-chart-message {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
  border-radius: 8px;
  margin: 16px;

  .skip-message-content {
    text-align: center;
    padding: 40px;
    color: #595959;

    .info-icon {
      font-size: 48px;
      color: #1890ff;
      margin-bottom: 16px;
    }

    p {
      margin: 8px 0;
      font-size: 14px;
      line-height: 1.5;

      &:first-of-type {
        font-weight: 600;
        color: #262626;
      }
    }
  }
}
</style>