// 通用资源权限 Composable Hook
// 提供权限配置弹窗的状态管理，任何业务场景只需调用 openPerm(表名, 全部资源) 即可

import { ref } from 'vue'

export function useResourcePerm() {
  const permVisible = ref(false)
  const permResourceType = ref('')
  const permResources = ref<any[]>([])

  /**
   * 打开权限配置弹窗
   * @param resourceType 资源类型（表名）
   * @param resources    该场景下的全部资源（原始数据，字段名通过 fieldNames 配置）
   */
  const openPerm = (resourceType: string, resources: any[]) => {
    permResourceType.value = resourceType
    permResources.value = resources
    permVisible.value = true
  }

  const closePerm = () => {
    permVisible.value = false
  }

  return {
    permVisible,
    permResourceType,
    permResources,
    openPerm,
    closePerm
  }
}
