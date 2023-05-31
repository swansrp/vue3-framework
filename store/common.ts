import { defineStore } from 'pinia'

export const useCommonStore = defineStore('commonStore', {
    state: () => {
        return {
            version: '',
            hasLogin: false, // 用于判断请求中 headers 字段中的 Authorization
        }
    },
    getters: {
        getLoginState: (state): boolean => state.hasLogin
    }
})
