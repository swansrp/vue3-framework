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
