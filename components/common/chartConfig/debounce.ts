// 防抖函数工具
// 统一 chartConfig 各组件中重复的 debounce 实现（带 cancel 能力）
export interface DebouncedFn {
  (...args: any[]): void
  cancel: () => void
}

export const debounce = (func: Function, delay: number): DebouncedFn => {
  let timeoutId: NodeJS.Timeout
  const debounced = ((...args: any[]) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(null, args), delay)
  }) as DebouncedFn
  debounced.cancel = () => {
    clearTimeout(timeoutId)
  }
  return debounced
}
