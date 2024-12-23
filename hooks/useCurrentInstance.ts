import type { ComponentInternalInstance } from "vue"
import { getCurrentInstance } from "vue"

export const getInstance = () => {
  const {appContext} = getCurrentInstance() as ComponentInternalInstance
  const _ = appContext.config.globalProperties
  return {
    _
  }
}