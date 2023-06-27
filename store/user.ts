import { defineStore } from 'pinia'
import {localStorageMethods} from "@/framework/utils/common";
import {ID_TOKEN} from "@/framework/utils/constant";

export const useUserStore = defineStore('userStore', {
    state: () => {
        return {
            canEdit: true, // 只是测试用
            token: '',
            self: {},
            role: {},
            name: '游客',
            customerNumber: '',
            avatar: '',
            roles: []
        }
    },
    actions: {
        setIdToken(token: string) {
            return new Promise((resolve) => {
                this.token = token
                localStorageMethods.setLocalStorage(ID_TOKEN, token)
                resolve(token)
            })
        }
    },
    getters: {
        getIdToken:(state)=> {
            if (state.token) return state.token
            return localStorageMethods.getLocalStorage(ID_TOKEN)
        }
    }
})
