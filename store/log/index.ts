import { defineStore } from 'pinia'
import { Dayjs } from 'dayjs'
import { localStorageMethods } from '@/framework/utils/common'
import { ENV_TYPE, LOG_LEVEL, MODULE_ID } from './constant'

export const useLogStore = defineStore('log', {
  state: () => {
    return {
      moduleId: JSON.parse(localStorageMethods.getLocalStorage(MODULE_ID, JSON.stringify([]))),
      envType: localStorageMethods.getLocalStorage(ENV_TYPE, 'prod'),
      logLevel: JSON.parse(localStorageMethods.getLocalStorage(LOG_LEVEL, JSON.stringify(['DEBUG', 'INFO', 'WARN', 'ERROR']))),
      timeRange: [null as Dayjs | null, null as Dayjs | null]
    }
  },
  getters: {
    getModuleId: (state): Array<string> => state.moduleId,
    getEnvType: (state): string => state.envType,
    getLogLevel: (state): Array<string> => state.logLevel,
    getTimeRange: (state): Array<Dayjs | null> => state.timeRange,
    getAllParams: (state) => ({
      moduleId: state.moduleId,
      envType: state.envType,
      logLevel: state.logLevel,
      startAt: state.timeRange && state.timeRange[0]?.format('YYYY-MM-DD HH:mm:ss.SSS'),
      endAt: state.timeRange && state.timeRange[1]?.format('YYYY-MM-DD HH:mm:ss.SSS')
    })
  },
  actions: {
    setModuleId(moduleId: Array<string>) {
      localStorageMethods.setLocalStorage(MODULE_ID, JSON.stringify(moduleId))
      this.moduleId = moduleId
    },
    setEnvType(envType: string) {
      localStorageMethods.setLocalStorage(ENV_TYPE, envType)
      this.envType = envType
    },
    setLogLevel(logLevel: Array<string>) {
      localStorageMethods.setLocalStorage(LOG_LEVEL, JSON.stringify(logLevel))
      this.logLevel = logLevel
    },
    setTimeRange(timeRange: Array<Dayjs | null>) {
      this.timeRange = timeRange
    }
  }
})