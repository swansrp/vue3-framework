import { defineStore } from 'pinia'

import { getStaff } from '@/framework/components/common/departmentAndStaffSelect/api'

export const useStaffStore = defineStore('staffStore', {
  state: () => {
    return {
      staffObj: {} as any
    }
  },
  actions: {
    async getStaffInfo(customerNumber: string) {
      const staffInfo = this.staffObj[customerNumber]
      if (staffInfo) return staffInfo
      return await getStaff([customerNumber]).then(({ payload }) => {
        this.staffObj[customerNumber] = payload[0]
        return payload[0]
      })
    }
  }
})