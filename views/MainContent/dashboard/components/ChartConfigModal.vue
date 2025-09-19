<template>
  <a-modal
    v-model:open="visible" :width="'95vw'" :style="{ top: '20px', paddingBottom: 0 }"
    :bodyStyle="{ height: 'calc(100vh - 120px)', padding: 0, display: 'flex', flexDirection: 'column' }" :footer="null"
    :destroyOnClose="true" @cancel="handleCancel">
    <!-- 自定义表头区域 -->
    <template #title>
      <div class="modal-header">
        <span class="modal-title">{{ modalTitle }}</span>
        <div class="indicator-name-input">
          <span class="input-label">指标名称：<span class="required-star">*</span></span>
          <a-input
            v-model:value="indicatorName" placeholder="请输入指标名称（必填）" :maxlength="50"
            :status="indicatorNameError ? 'error' : ''" style="width: 200px;" @blur="validateIndicatorName" />
          <span v-if="indicatorNameError" class="error-message">{{ indicatorNameError }}</span>
        </div>
      </div>
    </template>
    <div class="chart-config-modal">
      <!-- 直接使用dashboard组件 -->
      <dashboard-component
        ref="dashboardRef" :table-id="tableId" :edit-data="editData" :is-edit-mode="isEditMode"
        @save="handleSave" @reset-config="handleResetConfig" />
    </div>

    <!-- 自定义底部按钮区域 -->
    <div class="modal-footer">
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :loading="saving" :disabled="isSaveDisabled" @click="handleSaveConfig">
        保存配置
      </a-button>
    </div>
  </a-modal>
</template>

<script lang="ts" setup>
import { computed, nextTick, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { addPersonalStatistic, updatePersonalStatistic, getPersonalStatistic } from '../api'
import type { IndicatorNode } from '../types'
import DashboardComponent from '@/framework/components/common/Portal/dashboard/dashboard.vue'

interface Props {
  visible: boolean
  tableId: string
  editData?: IndicatorNode | null
  isEditMode?: boolean
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'save', data: any): void
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  tableId: '',
  editData: null,
  isEditMode: false
})

const emit = defineEmits<Emits>()

// 弹窗状态
const visible = ref(props.visible)
const saving = ref(false)
const dashboardRef = ref()

// 指标名称
const indicatorName = ref('')
const indicatorNameError = ref('')

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

    // 设置指标名称初始值
    if (props.isEditMode && props.editData) {
      // 编辑模式：使用现有的指标名称，如果没有则使用默认值
      indicatorName.value = props.editData.title
      // 编辑模式下加载配置数据
      await loadEditData()
    } else {
      // 新增模式：设置默认名称
      indicatorName.value = '个人指标'
    }
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
    console.log('开始加载编辑数据，editData:', props.editData)

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
        console.log('从 editData.indicator 解析的配置数据:', savedConfig)
      } catch (e) {
        console.warn('editData.indicator 解析失败，尝试通过接口查找:', e)
      }
    }

    // 2) 如仍未获取到配置，则从接口返回的树形数据中递归查找对应 id
    if (!savedConfig) {
      const response = await getPersonalStatistic(props.tableId)
      const personalStatistics = response.payload || []
      console.log('获取到的个人指标数据(树):', personalStatistics)

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

      console.log('递归找到的当前指标节点:', currentNode)
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
      console.log('未找到可用的配置数据，保持新增/空配置状态')
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
      console.log('开始恢复配置到dashboard组件')
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
    console.log('ChartConfigModal开始恢复配置:', savedConfig)

    // 这里需要根据savedConfig的格式来恢复配置
    // 如果savedConfig是dimensionIndicatorsFilter格式
    if (savedConfig.firstDimension && dashboardRef.value) {
      console.log('调用dashboard的restoreConfig方法')

      // 调用dashboard组件的恢复配置方法
      if (typeof dashboardRef.value.restoreConfig === 'function') {
        await dashboardRef.value.restoreConfig(savedConfig)
        console.log('dashboard restoreConfig调用完成')
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
    const dimensionIndicatorsFilter = dashboardRef.value?.dimensionIndicatorsFilter
    if (!dimensionIndicatorsFilter) {
      message.error('获取图表配置失败')
      return
    }

    // 构建指标节点数据
    const indicatorData: Partial<IndicatorNode> = {
      title: indicatorName.value.trim(), // 使用用户输入的指标名称
      tableId: props.tableId,
      order: props.editData?.order || 0,
      show: true,
      indicator: JSON.stringify(dimensionIndicatorsFilter) // 将配置转为JSON存储
    }

    // 如果是编辑模式，添加ID
    if (props.isEditMode && props.editData?.id) {
      indicatorData.id = props.editData.id
    }

    console.log('发送给后端的数据:', indicatorData)

    // 根据模式调用不同的API
    if (props.isEditMode && props.editData?.id) {
      // 编辑模式：调用更新API
      await updatePersonalStatistic(indicatorData)
    } else {
      // 新增模式：调用新增API
      await addPersonalStatistic(indicatorData)
    }

    message.success('保存配置成功')
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
  console.log('配置面板被重置')

  // 清空指标名称
  indicatorName.value = ''
  indicatorNameError.value = ''

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
  }
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 16px;

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
</style>