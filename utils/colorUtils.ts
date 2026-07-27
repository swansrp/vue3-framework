/**
 * 颜色工具函数
 */

// 默认颜色配置
export const defaultColors = [
  '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
  '#13c2c2', '#eb2f96', '#fa8c16', '#a0d911', '#2f54eb'
]

// 预设颜色
export const presetColors = [
  '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
  '#13c2c2', '#eb2f96', '#fa8c16', '#a0d911', '#2f54eb',
  '#fa541c', '#8c8c8c', '#722ed1', '#eb2f96', '#52c41a',
  '#faad14', '#13c2c2', '#f5222d', '#fa8c16', '#a0d911'
]

/**
 * HSL 转十六进制颜色
 * @param h 色相 0-360
 * @param s 饱和度 0-100
 * @param l 亮度 0-100
 * @returns 十六进制颜色值，如 #1890ff
 */
export const hslToHex = (h: number, s: number, l: number): string => {
  const sNorm = s / 100
  const lNorm = l / 100
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = lNorm - c / 2
  let r = 0; let g = 0; let b = 0
  if (h < 60) { r = c; g = x; b = 0 } else if (h < 120) { r = x; g = c; b = 0 } else if (h < 180) { r = 0; g = c; b = x } else if (h < 240) { r = 0; g = x; b = c } else if (h < 300) { r = x; g = 0; b = c } else { r = c; g = 0; b = x }
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * 常见语义名称的固定预设色（优先于哈希）
 *
 * 哈希算法对任意名称都可能偶发撞色（如“是/否”都落在红粉区），
 * 这类高频布尔/状态名称直接按约定俗成的语义色固定，避免碰运气
 */
export const semanticNameColors: Record<string, string> = {
  '是': '#52c41a',
  '否': '#f5222d',
  '有': '#52c41a',
  '无': '#8c8c8c'
}

/**
 * 根据名称确定性哈希出颜色（同名必同色）
 *
 * 公用颜色算法，以下场景必须统一调用本函数以保证效果一致：
 * 1. 指标（sys_portal_indicator）未配置颜色时的默认色
 * 2. 图表配置维度/新增数据指标时的兜底色
 * 3. 颜色一次性初始化规整（前端算好后批量回写后端）
 *
 * 实现要点：
 * - 基础哈希与 Java String.hashCode 等价，保证算法可跨端复现
 * - 叠加雪崩混淆（MurmurHash3 fmix32）：相似名称（如“审批未通过”/“审批进行中”）
 *   的哈希值相近，直接取模会导致色相扎堆，混淆后充分打散
 * - 饱和度/亮度由独立哈希位派生（4x4=16 档），色相偶然相近时也能靠深浅区分
 * @param name 维度项名称，如“国内”
 * @returns 十六进制颜色值
 */
export const getNameHashColor = (name: string): string => {
  const key = (name ?? '').trim()
  if (!key) return defaultColors[0]
  // 高频语义名称走固定预设色
  if (semanticNameColors[key]) return semanticNameColors[key]
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (Math.imul(31, hash) + key.charCodeAt(i)) | 0
  }
  // 雪崩混淆，让相似名称的哈希位充分打散（注意 XOR 结果需回转无符号）
  let h = hash >>> 0
  h = (h ^ (h >>> 16)) >>> 0
  h = Math.imul(h, 0x85ebca6b) >>> 0
  h = (h ^ (h >>> 13)) >>> 0
  h = Math.imul(h, 0xc2b2ae35) >>> 0
  h = (h ^ (h >>> 16)) >>> 0
  const hue = h % 360
  // 饱和度 55~82、亮度 40~61，由高位哈希独立选档
  const sat = 55 + ((h >>> 9) % 4) * 9
  const light = 40 + ((h >>> 17) % 4) * 7
  return hslToHex(hue, sat, light)
}

/**
 * 获取随机颜色
 * @param colors 可选的颜色数组，默认使用 defaultColors
 * @returns 随机颜色值
 */
export const getRandomColor = (colors: string[] = defaultColors): string => {
  const availableColors = colors.length > 0 ? colors : presetColors
  // 使用时间戳和随机数结合，确保每次调用都得到不同的颜色
  const randomIndex = Math.floor((Math.random() + Date.now() * 0.001) % 1 * availableColors.length)
  return availableColors[randomIndex]
}

/**
 * 生成指定数量的不同颜色
 * @param count 需要生成的颜色数量
 * @param colors 可选的颜色数组，默认使用 defaultColors
 * @returns 颜色数组
 */
export const generateDistinctColors = (count: number, colors: string[] = defaultColors): string[] => {
  if (count <= 0) return []

  const availableColors = colors.length > 0 ? colors : presetColors
  const currentTime = Date.now()

  if (count === 1) {
    return [availableColors[0]]
  }
  
  // 基于当前时间计算起始偏移量
  const timeOffset = Math.floor(currentTime / 1000) % availableColors.length

  if (count <= availableColors.length) {
    // 如果需要的颜色数量小于等于预设颜色数量，均匀选取
    const step = Math.floor(availableColors.length / count)
    const result: string[] = []
    
    for (let i = 0; i < count; i++) {
      // 基于时间偏移量计算索引，确保每次生成的起始颜色不同
      const index = (timeOffset + i * step) % availableColors.length
      result.push(availableColors[index])
    }

    return result
  } else {
    // 如果需要的颜色数量大于预设颜色数量，先生成扩展的颜色数组
    const extendedColors = [...availableColors]

    // 使用HSL颜色空间生成更多颜色
    for (let i = availableColors.length; i < count * 2; i++) {
      const hue = (i * 137.508) % 360
      const saturation = 70 + (i % 3) * 10
      const lightness = 45 + (i % 4) * 10
      const newColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`
      extendedColors.push(newColor)
    }

    // 从扩展的颜色数组中均匀选取指定数量的颜色
    const step = Math.floor(extendedColors.length / count)
    const result: string[] = []
    
    for (let i = 0; i < count; i++) {
      // 基于时间偏移量计算索引
      const index = (timeOffset + i * step) % extendedColors.length
      result.push(extendedColors[index])
    }

    return result
  }
}
