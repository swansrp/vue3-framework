import { defineStore } from 'pinia'

import { localStorageMethods } from '@/framework/utils/common'
import { ID_TOKEN } from '@/framework/utils/constant'

export const useUserStore = defineStore('userStore', {
  state: () => {
    return {
      canEdit: true, // 只是测试用
      token: '',
      self: {},
      role: {},
      name: '游客',
      sex: '1',
      deptName: '',
      customerNumber: '',
      avatar: '',
      nickName: '',
      email: '',
      roleList: []
    }
  },
  actions: {
    /**
     * 清空上一个账号的展示档案（登录成功后、写入 getUserInfo 之前调用）。
     * 🔴 2026-11-11：afterLogin 原先只按「非空才覆盖」写 store，换号重登时新账号若头像为空
     * 会把上一个账号的头像/昵称原样留下；本地登录 router.replace 不整页刷新，症状更明显。
     * 不动 token/canEdit：token 正源在 localStorage，getIdToken 有回落。
     */
    resetProfile() {
      // 只清展示档案；self/role/roleList 留给路由与 getUserInfo 的既有链路，不在登录口动
      this.name = ''
      this.sex = ''
      this.deptName = ''
      this.customerNumber = ''
      this.avatar = ''
      this.nickName = ''
      this.email = ''
    },
    setIdToken(token: string) {
      return new Promise((resolve) => {
        this.token = token
        localStorageMethods.setLocalStorage(ID_TOKEN, token)
        resolve(token)
      })
    }
  },
  getters: {
    getIdToken:(state) => {
      if (state.token) return state.token
      return localStorageMethods.getLocalStorage(ID_TOKEN)
    },
    getAllAttrs:(state) => state,
    getRole:(state) => {
      return state.roleList
    }
  }
})
