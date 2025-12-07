<script setup lang="ts">
import { debounce } from 'lodash'
import { ref, watch, computed } from 'vue'

import { FILTER_TYPE } from '@/framework/components/common/Portal/type'

interface Props {
  modelValue?: string | number
  // 搜索 API 函数（必传）
  apiFn: (...args: any[]) => Promise<any>
  // 搜索字段配置
  searchProperty?: string // 搜索的字段名，默认 'name'
  // 选项值字段配置
  valueField?: string // 选项值字段，默认 'id'
  labelField?: string // 选项标签字段，默认 'name'
  // 其他配置
  placeholder?: string
  disabled?: boolean
  allowClear?: boolean
  pageSize?: number
  debounceTime?: number
  // 查询返回的字段列表
  selectColumns?: string[]
  // 自定义请求构造函数（优先级最高）
  customRequestBuilder?: (keyword: string) => any
}

interface Emits {
  (e: 'update:modelValue', value: string | number | undefined): void
  (e: 'change', value: string | number | undefined, option: any): void
}

const props = withDefaults(defineProps<Props>(), {
  searchProperty: 'name',
  valueField: 'id',
  labelField: 'name',
  placeholder: '请输入关键字搜索',
  disabled: false,
  allowClear: true,
  pageSize: 50,
  debounceTime: 300
})

const emit = defineEmits<Emits>()

const options = ref<any[]>([])
const loading = ref(false)
const internalValue = ref<string | number | undefined>(props.modelValue)

// 构建 select 的 options 格式
const selectOptions = computed(() => {
  return options.value.map((item, index) => ({
    value: item[props.valueField],
    label: item[props.labelField],
    key: `${item[props.valueField]}_${index}`,
    data: item // 保留原始数据供插槽使用
  }))
})

// 搜索函数
const searchData = debounce(async (keyword: string) => {
  if (!keyword || keyword.length < 1) {
    options.value = []
    return
  }
  
  try {
    loading.value = true
    
    let res: any
    
    // 如果有自定义请求构造函数，使用自定义函数
    if (props.customRequestBuilder) {
      const requestData = props.customRequestBuilder(keyword)
      res = await props.apiFn(requestData, false, false, false)
    } else {
      // 标准查询：使用通用查询格式
      const requestData: any = {
        conditionList: [
          {
            property: props.searchProperty,
            relation: FILTER_TYPE.LIKE,
            value: [keyword]
          }
        ],
        pageSize: props.pageSize,
        distinct: '1'
      }
      
      // 如果有 selectColumns，添加到请求中
      if (props.selectColumns && props.selectColumns.length > 0) {
        requestData.selectColumnList = [...props.selectColumns]
      }
      
      res = await props.apiFn(requestData, false, false, false)
    }
    
    // 处理响应数据（支持分页和非分页）
    const records = res?.payload?.records || res?.payload || []
    
    if (records && records.length > 0) {
      // 根据 valueField 去重
      const uniqueRecords = []
      const seenValues = new Set()
      
      for (const record of records) {
        const value = record[props.valueField]
        if (!seenValues.has(value)) {
          seenValues.add(value)
          uniqueRecords.push(record)
        }
      }
      
      options.value = uniqueRecords
    } else {
      options.value = []
    }
  } catch (error) {
    console.error('搜索失败:', error)
    options.value = []
  } finally {
    loading.value = false
  }
}, props.debounceTime)

// 处理选择变化
const handleChange = (value: string | number | undefined) => {
  internalValue.value = value
  // 从原始数据中查找选中项
  const option = options.value.find(opt => opt[props.valueField] === value)
  emit('update:modelValue', value)
  emit('change', value, option)
}

// 监听外部值变化
watch(() => props.modelValue, (newVal) => {
  internalValue.value = newVal
})

// 暴露方法：用于编辑时设置初始选项
defineExpose({
  setInitialOption: (option: any) => {
    if (option) {
      options.value = [option]
    }
  },
  setInitialOptions: (opts: any[]) => {
    options.value = opts
  },
  // 刷新选项列表：重新执行搜索
  refresh: async (keyword?: string) => {
    if (keyword) {
      await searchData(keyword)
    } else if (internalValue.value) {
      // 如果没有传入关键字，使用当前值作为关键字
      await searchData(String(internalValue.value))
    }
  },
  // 清空选项列表
  clearOptions: () => {
    options.value = []
  }
})
</script>

<template>
  <a-select
    v-model:value="internalValue"
    :disabled="disabled"
    :filter-option="false"
    :loading="loading"
    :placeholder="placeholder"
    :allow-clear="allowClear"
    :options="selectOptions"
    show-search
    @change="handleChange"
    @search="searchData"
  >
    <!-- 下拉选项的自定义渲染 -->
    <template #option="{ label, value, data }">
      <slot
        name="option"
        :option="data"
      >
        {{ label }}
      </slot>
    </template>
  </a-select>
</template>

<style scoped lang="less">

</style>