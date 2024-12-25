import { isNotEmpty, isEmpty, log } from '@/framework/utils/common'

export default {
  install: (app: any) => {
    app.config.globalProperties.$isNotEmpty = (data: any) => {
      return isNotEmpty(data)
    }
    app.config.globalProperties.$isEmpty = (data: any) => {
      return isEmpty(data)
    }
    app.config.globalProperties.$log = (...data: Array<any>) => {
      return log(...data)
    }
  }
}
