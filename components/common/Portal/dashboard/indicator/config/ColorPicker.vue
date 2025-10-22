<template>
  <a-modal
    :open="visible"
    :title="title"
    width="500px"
    @ok="confirmColorChange"
    @cancel="handleCancel"
  >
    <div class="color-picker-modal">
      <!-- HSV 颜色圆盘 -->
      <div class="color-wheel-container">
        <div class="color-wheel-section">
          <h4>颜色选择</h4>
          
          <!-- 主颜色圆盘 -->
          <div class="color-wheel-main">
            <!-- 色调环 -->
            <div 
              ref="hueWheelRef" 
              class="hue-wheel"
              @mousedown="startHueDrag"
              @mousemove="onHueMove"
              @mouseup="stopHueDrag"
            >
              <div 
                class="hue-pointer" 
                :style="huePointerStyle"
              ></div>
            </div>
            
            <!-- 饱和度-明度方形区域 -->
            <div 
              ref="svSquareRef"
              class="sv-square"
              :style="{ backgroundColor: currentHueColor }"
              @mousedown="startSVDrag"
              @mousemove="onSVMove"
              @mouseup="stopSVDrag"
            >
              <div class="sv-overlay-white"></div>
              <div class="sv-overlay-black"></div>
              <div 
                class="sv-pointer" 
                :style="svPointerStyle"
              ></div>
            </div>
          </div>
          
          <!-- 透明度滑块 -->
          <div class="alpha-section">
            <span class="alpha-label">透明度:</span>
            <div 
              ref="alphaSliderRef"
              class="alpha-slider"
              :style="{ background: alphaGradient }"
              @mousedown="startAlphaDrag"
              @mousemove="onAlphaMove"
              @mouseup="stopAlphaDrag"
            >
              <div 
                class="alpha-pointer" 
                :style="alphaPointerStyle"
              ></div>
            </div>
            <span class="alpha-value">{{ Math.round(alpha * 100) }}%</span>
          </div>
          
          <!-- 颜色预览 -->
          <div class="color-preview-section">
            <div class="color-preview-container">
              <div class="color-preview-bg"></div>
              <div 
                class="color-preview"
                :style="{ backgroundColor: selectedColor }"
              ></div>
            </div>
            <a-input 
              v-model:value="selectedColor"
              placeholder="输入颜色值（如 #ff0000）"
              class="color-input"
              @change="onColorInputChange"
            />
          </div>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue'

// Props
const props = defineProps<{
  visible: boolean
  title: string
  initialColor?: string
}>()

// Emits
const emit = defineEmits<{
  'update:visible': [visible: boolean]
  'confirm': [color: string]
  'cancel': []
}>()

// HSV 颜色圆盘相关状态
const hue = ref(220) // 0-360
const saturation = ref(1) // 0-1
const value = ref(1) // 0-1
const alpha = ref(1) // 0-1

const isDraggingHue = ref(false)
const isDraggingSV = ref(false)
const isDraggingAlpha = ref(false)

const hueWheelRef = ref<HTMLElement>()
const svSquareRef = ref<HTMLElement>()
const alphaSliderRef = ref<HTMLElement>()

const selectedColor = ref(props.initialColor || '#1890ff')

// 计算属性
const currentHueColor = computed(() => {
  return hsvToHex(hue.value, 1, 1)
})

const huePointerStyle = computed(() => {
  const angle = (hue.value - 90) * Math.PI / 180
  const radius = 80
  const centerX = 100
  const centerY = 100
  const x = centerX + Math.cos(angle) * radius
  const y = centerY + Math.sin(angle) * radius
  return {
    left: `${x}px`,
    top: `${y}px`
  }
})

const svPointerStyle = computed(() => {
  return {
    left: `${saturation.value * 200}px`,
    top: `${(1 - value.value) * 200}px`
  }
})

const alphaGradient = computed(() => {
  const baseColor = hsvToHex(hue.value, saturation.value, value.value)
  return `linear-gradient(to right, transparent, ${baseColor})`
})

const alphaPointerStyle = computed(() => {
  return {
    left: `${alpha.value * 200}px`
  }
})

// 颜色转换函数
const hsvToHex = (h: number, s: number, v: number): string => {
  const rgb = hsvToRgb(h, s, v)
  return rgbToHex(rgb.r, rgb.g, rgb.b)
}

const hsvToRgb = (h: number, s: number, v: number) => {
  h = h / 360
  const i = Math.floor(h * 6)
  const f = h * 6 - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)

  let r, g, b
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break
    case 1: r = q; g = v; b = p; break
    case 2: r = p; g = v; b = t; break
    case 3: r = p; g = q; b = v; break
    case 4: r = t; g = p; b = v; break
    case 5: r = v; g = p; b = q; break
    default: r = 0; g = 0; b = 0
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  }
}

const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

const hexToHsv = (color: string) => {
  // 如果是 HSL 格式，先转换为 RGB
  if (color.startsWith('hsl')) {
    const rgb = hslToRgb(color)
    return rgbToHsv(rgb.r, rgb.g, rgb.b)
  }
  
  // 如果是十六进制格式，转换为 RGB
  const rgb = hexToRgb(color)
  if (!rgb) return { h: 0, s: 0, v: 0 }
  return rgbToHsv(rgb.r, rgb.g, rgb.b)
}

const hslToRgb = (hsl: string) => {
  const match = hsl.match(/hsl\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)/)
  if (!match) return { r: 0, g: 0, b: 0 }
  
  const h = parseInt(match[1]) / 360
  const s = parseInt(match[2]) / 100
  const l = parseInt(match[3]) / 100
  
  let r, g, b
  
  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1/6) return p + (q - p) * 6 * t
      if (t < 1/2) return q
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
      return p
    }
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    
    r = hue2rgb(p, q, h + 1/3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1/3)
  }
  
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  }
}

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

const rgbToHsv = (r: number, g: number, b: number) => {
  r /= 255
  g /= 255
  b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const diff = max - min
  
  let h = 0
  const s = max === 0 ? 0 : diff / max
  const v = max

  if (diff !== 0) {
    switch (max) {
      case r: h = ((g - b) / diff) % 6; break
      case g: h = (b - r) / diff + 2; break
      case b: h = (r - g) / diff + 4; break
    }
  }
  
  h = Math.round(h * 60)
  if (h < 0) h += 360

  return { h, s, v }
}

// 验证颜色值是否有效
const isValidColor = (color: string): boolean => {
  if (!color) return false
  
  // 检查是否为十六进制颜色值
  const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
  if (hexColorRegex.test(color)) return true
  
  // 检查是否为CSS颜色名称
  const cssColors = [
    'red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'cyan', 'magenta',
    'lime', 'indigo', 'violet', 'brown', 'gray', 'grey', 'black', 'white', 'silver',
    'gold', 'navy', 'teal', 'olive', 'maroon', 'aqua', 'fuchsia'
  ]
  if (cssColors.includes(color.toLowerCase())) return true
  
  // 检查是否为RGB或RGBA值
  const rgbColorRegex = /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/
  const rgbaColorRegex = /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[01]?(\.\d+)?\s*\)$/
  if (rgbColorRegex.test(color) || rgbaColorRegex.test(color)) return true
  
  // 检查是否为HSL或HSLA值
  const hslColorRegex = /^hsl\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)$/
  const hslaColorRegex = /^hsla\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*,\s*[01]?(\.\d+)?\s*\)$/
  return hslColorRegex.test(color) || hslaColorRegex.test(color)
}

// 更新选中的颜色
const updateSelectedColor = () => {
  const hex = hsvToHex(hue.value, saturation.value, value.value)
  if (alpha.value < 1) {
    const rgb = hsvToRgb(hue.value, saturation.value, value.value)
    selectedColor.value = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha.value})`
  } else {
    selectedColor.value = hex
  }
}

// 监听初始颜色变化和模态框可见性
watch(
  [() => props.initialColor, () => props.visible],
  ([newColor, isVisible], [_oldColor, wasVisible]) => {
    console.log('=== ColorPicker Watch Debug ===')
    console.log('newColor:', newColor)
    console.log('isVisible:', isVisible)
    console.log('wasVisible:', wasVisible)
    console.log('condition:', isVisible && !wasVisible, newColor && isValidColor(newColor))
    
    // 当模态框打开时，重置为初始颜色
    if (isVisible && !wasVisible && newColor && isValidColor(newColor)) {
      console.log('执行颜色重置，设置颜色为:', newColor)
      selectedColor.value = newColor
      const hsv = hexToHsv(newColor)
      console.log('转换后的HSV值:', hsv)
      hue.value = hsv.h
      saturation.value = hsv.s
      value.value = hsv.v
      
      // 处理 rgba 格式
      if (newColor.startsWith('rgba')) {
        const match = newColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
        if (match && match[4]) {
          alpha.value = parseFloat(match[4])
        }
      } else {
        alpha.value = 1
      }
    } else {
      console.log('不执行颜色重置，原因:')
      if (!isVisible) console.log('- 模态框未打开')
      if (wasVisible) console.log('- 模态框之前就是打开的')
      if (!newColor) console.log('- 没有传入颜色')
      if (newColor && !isValidColor(newColor)) console.log('- 传入的颜色无效:', newColor)
    }
    console.log('=== End ColorPicker Watch Debug ===')
  },
  { immediate: true }
)

// 监听HSV值的变化
watch([hue, saturation, value, alpha], () => {
  updateSelectedColor()
})

// 色调拖拽处理
const startHueDrag = (e: MouseEvent) => {
  isDraggingHue.value = true
  updateHueFromEvent(e)
  document.addEventListener('mousemove', onHueMove)
  document.addEventListener('mouseup', stopHueDrag)
}

const onHueMove = (e: MouseEvent) => {
  if (isDraggingHue.value) {
    updateHueFromEvent(e)
  }
}

const stopHueDrag = () => {
  isDraggingHue.value = false
  document.removeEventListener('mousemove', onHueMove)
  document.removeEventListener('mouseup', stopHueDrag)
}

const updateHueFromEvent = (e: MouseEvent) => {
  if (!hueWheelRef.value) return
  
  const rect = hueWheelRef.value.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX)
  let degree = (angle * 180 / Math.PI + 90) % 360
  if (degree < 0) degree += 360
  
  hue.value = degree
}

// 饱和度-明度拖拽处理
const startSVDrag = (e: MouseEvent) => {
  isDraggingSV.value = true
  updateSVFromEvent(e)
  document.addEventListener('mousemove', onSVMove)
  document.addEventListener('mouseup', stopSVDrag)
}

const onSVMove = (e: MouseEvent) => {
  if (isDraggingSV.value) {
    updateSVFromEvent(e)
  }
}

const stopSVDrag = () => {
  isDraggingSV.value = false
  document.removeEventListener('mousemove', onSVMove)
  document.removeEventListener('mouseup', stopSVDrag)
}

const updateSVFromEvent = (e: MouseEvent) => {
  if (!svSquareRef.value) return
  
  const rect = svSquareRef.value.getBoundingClientRect()
  const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left))
  const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top))
  
  saturation.value = x / rect.width
  value.value = 1 - (y / rect.height)
}

// 透明度拖拽处理
const startAlphaDrag = (e: MouseEvent) => {
  isDraggingAlpha.value = true
  updateAlphaFromEvent(e)
  document.addEventListener('mousemove', onAlphaMove)
  document.addEventListener('mouseup', stopAlphaDrag)
}

const onAlphaMove = (e: MouseEvent) => {
  if (isDraggingAlpha.value) {
    updateAlphaFromEvent(e)
  }
}

const stopAlphaDrag = () => {
  isDraggingAlpha.value = false
  document.removeEventListener('mousemove', onAlphaMove)
  document.removeEventListener('mouseup', stopAlphaDrag)
}

const updateAlphaFromEvent = (e: MouseEvent) => {
  if (!alphaSliderRef.value) return
  
  const rect = alphaSliderRef.value.getBoundingClientRect()
  const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left))
  alpha.value = x / rect.width
}

// 颜色输入变化处理
const onColorInputChange = () => {
  if (isValidColor(selectedColor.value)) {
    const hsv = hexToHsv(selectedColor.value)
    hue.value = hsv.h
    saturation.value = hsv.s
    value.value = hsv.v
    
    // 处理 rgba 格式
    if (selectedColor.value.startsWith('rgba')) {
      const match = selectedColor.value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
      if (match && match[4]) {
        alpha.value = parseFloat(match[4])
      }
    } else {
      alpha.value = 1
    }
  }
}

// 事件处理
const confirmColorChange = () => {
  emit('confirm', selectedColor.value)
  emit('update:visible', false)
}

const handleCancel = () => {
  emit('cancel')
  emit('update:visible', false)
}
</script>

<style scoped lang="less">
.color-picker-modal {
  .color-wheel-container {
    display: flex;
    justify-content: center;
    
    .color-wheel-section {
      width: 100%;
      
      h4 {
        margin: 0 0 16px 0;
        font-size: 14px;
        font-weight: 600;
        color: #262626;
        text-align: center;
      }
    }
  }
  
  .color-wheel-main {
    display: flex;
    gap: 20px;
    margin-bottom: 20px;
    justify-content: center;
    align-items: center;
    
    .hue-wheel {
      position: relative;
      width: 200px;
      height: 200px;
      border-radius: 50%;
      background: conic-gradient(
        #ff0000 0deg,
        #ffff00 60deg,
        #00ff00 120deg,
        #00ffff 180deg,
        #0000ff 240deg,
        #ff00ff 300deg,
        #ff0000 360deg
      );
      cursor: crosshair;
      
      .hue-pointer {
        position: absolute;
        width: 12px;
        height: 12px;
        border: 2px solid white;
        border-radius: 50%;
        background: transparent;
        transform: translate(-50%, -50%);
        pointer-events: none;
        box-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
      }
    }
    
    .sv-square {
      position: relative;
      width: 200px;
      height: 200px;
      cursor: crosshair;
      
      .sv-overlay-white {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(to right, white, transparent);
      }
      
      .sv-overlay-black {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(to bottom, transparent, black);
      }
      
      .sv-pointer {
        position: absolute;
        width: 12px;
        height: 12px;
        border: 2px solid white;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none;
        box-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
      }
    }
  }
  
  .alpha-section {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
    
    .alpha-label {
      font-size: 12px;
      color: #666;
      min-width: 50px;
    }
    
    .alpha-slider {
      position: relative;
      flex: 1;
      height: 20px;
      border-radius: 10px;
      cursor: pointer;
      background-image: 
        linear-gradient(45deg, #ccc 25%, transparent 25%),
        linear-gradient(-45deg, #ccc 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #ccc 75%),
        linear-gradient(-45deg, transparent 75%, #ccc 75%);
      background-size: 8px 8px;
      background-position: 0 0, 0 4px, 4px -4px, -4px 0px;
      
      .alpha-pointer {
        position: absolute;
        width: 16px;
        height: 16px;
        border: 2px solid white;
        border-radius: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        background: transparent;
        pointer-events: none;
        box-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
      }
    }
    
    .alpha-value {
      font-size: 12px;
      color: #666;
      min-width: 35px;
      text-align: right;
    }
  }
  
  .color-preview-section {
    display: flex;
    align-items: center;
    gap: 12px;
    
    .color-preview-container {
      position: relative;
      width: 50px;
      height: 32px;
      border-radius: 4px;
      overflow: hidden;
      
      .color-preview-bg {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-image: 
          linear-gradient(45deg, #ccc 25%, transparent 25%),
          linear-gradient(-45deg, #ccc 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, #ccc 75%),
          linear-gradient(-45deg, transparent 75%, #ccc 75%);
        background-size: 8px 8px;
        background-position: 0 0, 0 4px, 4px -4px, -4px 0px;
      }
      
      .color-preview {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        border: 1px solid #d9d9d9;
        border-radius: 4px;
      }
    }
    
    .color-input {
      flex: 1;
    }
  }
}
</style>
