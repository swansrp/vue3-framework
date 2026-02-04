<template>
  <div
    :style="style"
    class="dark-dialog-mask"
  >
    <v-scale-screen
      :auto-scale="{x:false, y:false}"
      :box-style="{ background: 'transparent'}"
      :height="900"
      :width="1920"
    >
      <div
        ref="darkDialog"
        class="dark-dialog"
      >
        <div class="title">
          {{ title }}
        </div>
        <div
          class="close-btn"
          @click="onCloseDialog"
        >
          <CloseOutlined />
        </div>
        <div class="dialog-info">
          <slot></slot>
        </div>
      </div>
    </v-scale-screen>
  </div>
</template>

<script lang="ts" setup>
import { CloseOutlined } from '@ant-design/icons-vue'
import _ from 'lodash'
import VScaleScreen from 'v-scale-screen'

import { updateTableSize } from '@/framework/utils/common'


const _visible: Ref<boolean> = ref(false)
const props = defineProps<{ visible: boolean, title: string }>()
const { title } = toRefs(props)

watch(() => props.visible, v => _visible.value = v, { immediate: true })

const style = computed(() => ({ display: _visible.value ? 'block' : 'none' }))

const emits = defineEmits(['update:visible'])

const onCloseDialog = () => {
  _visible.value = false
  emits('update:visible', false)
}

const darkDialog = ref()
const tableWidth = ref(1830)
const tableHeight = ref(610)
const updateTableWidthAndHeight = () => updateTableSize(darkDialog, tableWidth, 80, tableHeight, 200)
const _updateTableSize = _.debounce(updateTableWidthAndHeight, 50)

onMounted(() => {
  updateTableWidthAndHeight()
  window.addEventListener('resize', _updateTableSize)
})
onUnmounted(() => {
  window.removeEventListener('resize', _updateTableSize)
})
</script>
<style lang="less" scoped src="@/framework/components/common/Portal/css/dark.css"></style>
<style lang="less" scoped>
.dark-dialog-mask {
  position: fixed;
  height: 100%;
  width: 100%;
  top: 0;
  left: 0;
  z-index: 999;
  background-color: rgba(0, 0, 0, 0.7);

  .dark-dialog {
    position: relative;
    z-index: 999;
    height: 815px;
    width: 1700px;
    top: 60px;
    bottom: 0;
    left: 0;
    right: 0;
    margin: auto;
    background: url("imgs/dialog-bg.svg");
    background-size: cover;
    border-bottom: 2px solid #0F7094;

    .title {
      color: #fff;
      font-size: 35px;
      font-weight: 700;
      width: 700px;
      height: 60px;
      box-sizing: border-box;
      padding-bottom: 20px;
      display: flex;
      justify-content: center;
      font-family: 'Noto Sans SC', serif;
      background: url("imgs/title-bg.svg") no-repeat;
      background-size: 100% 100%;
      position: absolute;
      top: -25px;
      left: 50.4%;
      transform: translateX(-50%);
    }

    .close-btn {
      height: 37px;
      width: 37px;
      cursor: pointer;
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 22px;
      color: #E1EAF1;
      font-weight: bold;
      background: url("imgs/close.svg") no-repeat;
      position: absolute;
      right: 30px;
      top: -45px;
    }

    .close-btn:hover {
      color: #fff;
    }

    .dialog-info {
      position: relative;
      width: 98%;
      height: 850px;
      margin: 5px auto;
      transform: translateY(5px);
      overflow: auto;

      // 强制覆盖表格行背景颜色
      :deep(.portal-table),
      :deep(.surely-table) {
        background-color: rgb(2, 57, 85) !important;

        // 单元格边框修复
        td,
        .surely-table-cell {
          border-right: none !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.2) !important;
          border-top: none !important;
          border-left: 1px solid rgba(255, 255, 255, 0.3) !important;
        }

        // 最后一行和最后一列不显示边框
        tr:last-child td,
        tr:last-child .surely-table-cell {
          border-bottom: none !important;
        }

        td:last-child,
        .surely-table-cell:last-child {
          border-right: none !important;
        }
      }

      // 全局样式，强制斑马纹效果
      :deep(.surely-table) {
        // 使用组件自带的奇偶类名，更稳定可靠
        .surely-table-row-even,
        tbody tr.surely-table-row-even,
        .surely-table-body .surely-table-row-even {
          background-color: #1B475D !important;
          color: #ffffff !important;
        }

        .surely-table-row-odd,
        tbody tr.surely-table-row-odd,
        .surely-table-body .surely-table-row-odd {
          background-color: #0E3D55 !important;
          color: #ffffff !important;
        }

        .surely-table-row-even:hover,
        tbody tr.surely-table-row-even:hover,
        .surely-table-body .surely-table-row-even:hover {
          background-color: #235A72 !important;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .surely-table-row-odd:hover,
        tbody tr.surely-table-row-odd:hover,
        .surely-table-body .surely-table-row-odd:hover {
          background-color: #164A62 !important;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        // 备用方案：使用nth-of-type作为后备
        tbody tr:nth-of-type(even):not(.surely-table-row-odd):not(.surely-table-row-even),
        .surely-table-tbody .surely-table-row:nth-of-type(even):not(.surely-table-row-odd):not(.surely-table-row-even),
        .surely-table-body tr:nth-of-type(even):not(.surely-table-row-odd):not(.surely-table-row-even),
        .surely-table-body .surely-table-row:nth-of-type(even):not(.surely-table-row-odd):not(.surely-table-row-even) {
          background-color: #1B475D !important;
          color: #ffffff !important;
        }

        tbody tr:nth-of-type(odd):not(.surely-table-row-odd):not(.surely-table-row-even),
        .surely-table-tbody .surely-table-row:nth-of-type(odd):not(.surely-table-row-odd):not(.surely-table-row-even),
        .surely-table-body tr:nth-of-type(odd):not(.surely-table-row-odd):not(.surely-table-row-even),
        .surely-table-body .surely-table-row:nth-of-type(odd):not(.surely-table-row-odd):not(.surely-table-row-even) {
          background-color: #0E3D55 !important;
          color: #ffffff !important;
        }
      }

      :deep(.surely-table-body) {
        background-color: rgb(2, 57, 85) !important;

        // 直接针对表格容器
        tr:nth-of-type(even) {
          background-color: #1B475D !important;
          color: #ffffff !important;
        }

        tr:nth-of-type(odd) {
          background-color: #0E3D55 !important;
          color: #ffffff !important;
        }

        tr:nth-of-type(even):hover {
          background-color: #235A72 !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        tr:nth-of-type(odd):hover {
          background-color: #164A62 !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
      }
    }
  }
}

</style>