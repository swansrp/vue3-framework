/**
 * 框架内置当前租户 store（2026-10-21）——齿轮下拉「切换租户」的数据面。
 *
 * 口径：清单与 current 均以后端为准（core TenantMyController 现查）；localStorage 只做
 * 「上次选过的租户」记忆（高亮兜底），不做任何数据判定（行级隔离在服务端，前端仅 UX）。
 * 懒加载：齿轮下拉首开时才拉清单（loaded 防重复）；拉取失败静默＝菜单不出现，不打扰主流程。
 */
import { defineStore } from 'pinia'

import { listMyTenants, switchMyTenant, TenantMyVO } from '@/framework/apis/tenant'
import { localStorageMethods } from '@/framework/utils/common'

const TENANT_LAST_KEY = 'framework.tenant.currentTenantId'

interface TenantState {
  loading: boolean
  loaded: boolean
  switching: boolean
  tenants: TenantMyVO[]
}

export const useTenantStore = defineStore('frameworkTenantStore', {
  state: (): TenantState => ({
    loading: false,
    loaded: false,
    switching: false,
    tenants: []
  }),
  getters: {
    /** 可切面存在（多租户成员/平台档/系统级全量）＝齿轮里出现「切换租户」；清单空或只有一条＝不出现 */
    switchable: (state) => state.tenants.length > 1,
    /** 当前租户条目（后端 current 标定；缺省回落 localStorage 记忆） */
    currentTenant(state): TenantMyVO | null {
      const fromServer = state.tenants.find((t) => t.current)
      if (fromServer) return fromServer
      const remembered = localStorageMethods.getLocalStorage(TENANT_LAST_KEY)
      if (remembered != null) {
        return state.tenants.find((t) => String(t.tenantId) === String(remembered)) || null
      }
      return null
    },
    /** 当前租户显示名（后端未标定且无记忆＝占位） */
    currentTenantLabel(): string {
      return this.currentTenant?.name || '未选择'
    }
  },
  actions: {
    /** 拉取我的租户清单（齿轮下拉首开触发；失败静默＝菜单不出现） */
    async fetchMyTenants() {
      if (this.loaded || this.loading) return
      this.loading = true
      try {
        this.tenants = (await listMyTenants()).payload || []
        this.loaded = true
        const current = this.tenants.find((t) => t.current)
        if (current) {
          localStorageMethods.setLocalStorage(TENANT_LAST_KEY, String(current.tenantId))
        }
      } catch (e) {
        console.warn('[tenant] 我的租户清单拉取失败，切换菜单保持隐藏', e)
      } finally {
        this.loading = false
      }
    },
    /** 切换当前租户（后端改写 token；整页刷新由调用方决定时机） */
    async switchTenant(tenantId: number) {
      if (this.switching) return
      this.switching = true
      try {
        await switchMyTenant(tenantId)
        this.rememberCurrent(tenantId)
      } finally {
        this.switching = false
      }
    },
    /** 本地记忆（切换成功后调用） */
    rememberCurrent(tenantId: number) {
      localStorageMethods.setLocalStorage(TENANT_LAST_KEY, String(tenantId))
    }
  }
})
