import { defineStore } from 'pinia'

export const useWindowStore = defineStore('windowStore', {
  state: () => {
    return {
      windowHeight: 0
    }
  },
  getters: {},
  actions: {
    updateWindowHeight (height: number) {
      this.windowHeight = height
    }
  }
})
