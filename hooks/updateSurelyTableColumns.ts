import { Ref } from 'vue'
import { localStorageMethods } from '@/framework/utils/common'
import { ColumnsType } from 'ant-design-vue/es/table'

const updateColumns = (updatedColumns: Ref, newColumns: Ref, tableId: Ref | undefined) => {
  if (tableId === undefined) throw new Error('请先为 surely table 设置 tableId 后在使用其表头拖拽功能')
  let user_config = localStorageMethods.getLocalStorage(tableId.value)

  if (user_config) {
    const newConfigList = [] as Array<ColumnsType>
    user_config = JSON.parse(user_config)
    const length = Math.max(Object.getOwnPropertyNames(user_config).length, newColumns.value.length)
    updatedColumns.value = new Array(length)
    newColumns.value.forEach((config: any) => {
      const newConfigKey = config.dataIndex
      if (user_config[newConfigKey] === undefined) {
        newConfigList.push(config)
      }else {
        const newConfigKeyIndex = +user_config[newConfigKey]
        updatedColumns.value[newConfigKeyIndex] = config
      }
    })
    updatedColumns.value = updatedColumns.value.filter((config: ColumnsType) => config)
    updatedColumns.value.push(...newConfigList)
  } else updatedColumns.value = newColumns.value
}

export { updateColumns }
