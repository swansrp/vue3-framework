import { defineStore } from 'pinia'

const THEME_STORAGE_KEY = 'app-theme'

export type ThemeId = 'indigo' | 'ocean' | 'navy' | 'amber' | 'classic' | 'dark'

export const LIGHT_THEMES: { id: ThemeId; label: string; desc: string; swatch: string }[] = [
  { id: 'indigo', label: '靛蓝现代', desc: '科技现代风', swatch: '#4f6cf7' },
  { id: 'ocean', label: '企业蓝', desc: '经典专业风', swatch: '#2563eb' },
  { id: 'navy', label: '深海军蓝', desc: '高端权威风', swatch: '#1e40af' },
  { id: 'amber', label: '琥珀橙', desc: '活力醒目风', swatch: '#f97316' },
  { id: 'classic', label: '经典蓝', desc: '原始配色复刻', swatch: '#1890ff' }
]

export const useThemeStore = defineStore('theme', {
  state: () => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) || ''
    // 兼容旧版 'default' 键名
    let initial: ThemeId = 'classic'
    if (saved === 'dark') initial = 'dark'
    else if (saved === 'default' || saved === 'indigo') initial = 'indigo'
    else if (saved === 'ocean') initial = 'ocean'
    else if (saved === 'navy') initial = 'navy'
    else if (saved === 'amber') initial = 'amber'
    else if (saved === 'classic') initial = 'classic'
    return {
      themeId: initial,
      _prevLightTheme: 'classic' as ThemeId
    }
  },
  getters: {
    isDark: (state) => state.themeId === 'dark',
    isLight: (state) => state.themeId !== 'dark',
    nextThemeName: (state) => state.themeId === 'dark' ? 'light' : 'dark',
    lightThemeInfo: (state) => LIGHT_THEMES.find(t => t.id === state.themeId)
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
    },
    initTheme() {
      this.applyTheme()
    }
  }
})
