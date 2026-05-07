import { defineStore, getActivePinia } from 'pinia'

const THEME_STORAGE_KEY = 'app-theme'

export type ThemeId = 'indigo' | 'ocean' | 'navy' | 'amber' | 'classic' | 'dark'

export const LIGHT_THEMES: { id: ThemeId; label: string; desc: string; swatch: string }[] = [
  { id: 'indigo', label: '靛蓝现代', desc: '科技现代风', swatch: '#4f6cf7' },
  { id: 'ocean', label: '企业蓝', desc: '经典专业风', swatch: '#2563eb' },
  { id: 'navy', label: '深海军蓝', desc: '高端权威风', swatch: '#1e40af' },
  { id: 'amber', label: '琥珀橙', desc: '活力醒目风', swatch: '#f97316' },
  { id: 'classic', label: '经典蓝', desc: '原始配色复刻', swatch: '#1890ff' }
]

const VALID_THEME_IDS = new Set<string>([...LIGHT_THEMES.map(t => t.id), 'dark'])

// ============================================================
// 全局主题配置（可在 main.ts 中调用修改）
// ============================================================
let globalDefaultTheme: ThemeId = 'classic'
let globalSwitchEnabled = false

function resolveThemeId(): ThemeId {
  if (!globalSwitchEnabled) return globalDefaultTheme
  const saved = localStorage.getItem(THEME_STORAGE_KEY) || ''
  return VALID_THEME_IDS.has(saved) ? (saved as ThemeId) : globalDefaultTheme
}

function applyToDOM(themeId: ThemeId) {
  document.documentElement.setAttribute('data-theme', themeId)
}

/** 模块加载时自动初始化：用默认配置（classic / switchEnabled=false）立即设置 data-theme */
applyToDOM(resolveThemeId())

/**
 * 配置主题系统（可选调用，不调用则使用默认 classic 主题 + 禁用切换）
 * 调用后会覆盖默认配置并立即重新应用到 DOM，同时同步已创建的 store 状态
 */
export function configureTheme(options: { defaultTheme?: ThemeId; switchEnabled?: boolean }) {
  if (options.defaultTheme) globalDefaultTheme = options.defaultTheme
  if (options.switchEnabled !== undefined) globalSwitchEnabled = options.switchEnabled
  const resolved = resolveThemeId()
  applyToDOM(resolved)
  // 如果 store 已创建，同步更新 store 状态
  const activePinia = getActivePinia()
  if (activePinia) {
    try {
      const store = useThemeStore()
      if (store.themeId !== resolved) {
        store.themeId = resolved
      }
    } catch {
      // store 尚未注册，忽略
    }
  }
}

export const useThemeStore = defineStore('theme', {
  state: () => ({
    themeId: resolveThemeId(),
    _prevLightTheme: 'classic' as ThemeId
  }),
  getters: {
    isDark: (state) => state.themeId === 'dark',
    isLight: (state) => state.themeId !== 'dark',
    nextThemeName: (state) => state.themeId === 'dark' ? 'light' : 'dark',
    lightThemeInfo: (state) => LIGHT_THEMES.find(t => t.id === state.themeId),
    /** 主题切换按钮是否启用 */
    switchEnabled: () => globalSwitchEnabled
  },
  actions: {
    setTheme(id: ThemeId) {
      this.themeId = id
      this.applyTheme()
    },
    toggleTheme() {
      if (this.themeId === 'dark') {
        this.themeId = this._prevLightTheme
      } else {
        this._prevLightTheme = this.themeId
        this.themeId = 'dark'
      }
      this.applyTheme()
    },
    applyTheme() {
      document.documentElement.setAttribute('data-theme', this.themeId)
      localStorage.setItem(THEME_STORAGE_KEY, this.themeId)
    }
  }
})
