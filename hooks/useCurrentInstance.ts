import type { ComponentInternalInstance } from "vue"
import { getCurrentInstance } from "vue"

export const getInstance = () => {
  const {appContext} = getCurrentInstance() as ComponentInternalInstance
  return appContext.config.globalProperties
}