import {defineStore} from "pinia";

export const useCopyrightStore = defineStore('copyrightStore', {
  state: () => {
    return {
      // 网站主体
      author: '',
      // 备案号
      icp: ''
    }
  },
  actions: {
    setCopyrightIcp(author: string, icp: string) {
      this.author = author
      this.icp = icp
    }
  },
  getters: {
    getAuthor:(state) => {
      return state.author
    },
    getIcp:(state) => state.icp,
  }
})