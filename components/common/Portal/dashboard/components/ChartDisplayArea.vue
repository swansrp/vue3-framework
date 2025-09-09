<template>
  <div class="chart-panel">
    <div class="chart-container">
      <div class="chart-placeholder">
        <div class="placeholder-content">
          <BarChartOutlined class="placeholder-icon" />
          <p>配置维度后点击"生成图表"按钮</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { BarChartOutlined } from '@ant-design/icons-vue'

// Props
const props = defineProps<{
  // 可以根据需要添加图表相关的props
  chartData?: any
  chartConfig?: any
}>()

// 这里可以添加图表渲染逻辑
// 例如使用ECharts等图表库
</script>

<style scoped lang="less">
.chart-panel {
  flex: 1;
  background: white;
  margin: 16px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-width: 0; /* 防止flex子项溢出 */

  .chart-container {
    height: 100%;
    position: relative;

    .chart-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #8c8c8c;

      .placeholder-content {
        text-align: center;

        .placeholder-icon {
          font-size: 48px;
          margin-bottom: 16px;
          color: #d9d9d9;
        }

        p {
          margin: 0;
          font-size: 14px;
        }
      }
    }

    .chart {
      width: 100%;
      height: 100%;
    }
  }
}
</style>