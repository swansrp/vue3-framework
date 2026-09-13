<script setup lang="ts">
/** SearchSelect 通用搜索下拉(三种能力可组合, 2026-09-12 合并原 SelectAdd):
 *  1) 远程搜索(默认): 传 api-fn, 关键字防抖 LIKE 下推, 值回显自动回查, 单结果自动选中;
 *  2) 本地候选: 传 options(label/value 数组), 不发请求(候选全量由父级维护);
 *  3) 原地新建: 传 create-fn 后出现「＋」按钮与下拉尾部添加入口, 建档成功自动选中新值
 *     并 emit created(建档实现业务无关, 配套 src/components/quickCreate.ts 的 quickCreateBy/quickCreateParty);
 *  扩展字段用默认插槽(如类别切换), 取值在 create-fn 里自行读取。
 *  readonly(默认 true): 本地候选模式输入框不可键入、纯点选下拉; 传 false 启用键入过滤;
 *  远程搜索模式忽略此值(必须可键入才能发请求)。 */
import { message } from 'ant-design-vue'
import { debounce } from 'lodash'
import { ref, watch, computed } from 'vue'

import { FILTER_TYPE } from '@/framework/components/common/Portal/type'

interface Props {
  modelValue?: string | number
  // 搜索 API 函数(远程搜索模式必传; 传了 options 的本地模式可不传)
  apiFn?: (...args: any[]) => Promise<any>
  // 本地候选模式: 传入则不发请求, 前端过滤
  options?: { label: string, value: any }[]
  // 原地新建: 传入即启用「＋」按钮与下拉尾部添加入口
  createFn?: (name: string) => Promise<{ label?: string, value: any } | Record<string, any>>
  addText?: string
  createTitle?: string
  nameLabel?: string
  namePlaceholder?: string
  // 只读点选: true 时输入框不可键入、点开下拉直接选(仅本地候选模式; 远程搜索模式忽略, 始终可键入)
  readonly?: boolean
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
  (e: 'created', item: { label?: string, value: any }): void
}

const props = withDefaults(defineProps<Props>(), {
  apiFn: undefined,
  options: undefined,
  createFn: undefined,
  addText: '添加',
  createTitle: '快速添加',
  nameLabel: '名称',
  namePlaceholder: '',
  readonly: true,
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

// antdv4 dropdownRender 透传原菜单节点
const VNodes = (_: any, { attrs }: any) => attrs.vnodes

const remoteOptions = ref<any[]>([])
const loading = ref(false)
const internalValue = ref<string | number | undefined>(props.modelValue)
const hasSearched = ref(false) // 标记是否已经搜索过

/** 本地候选模式(传了 options 即启用) */
const isLocalMode = computed(() => Array.isArray(props.options))
const searchWord = ref('')
/** 本会话内新建的档案(父级通常在 @created 里刷新 options, 这里兼底保证立即可选) */
const createdItems = ref<{ label: string, value: any }[]>([])
const mergedLocalOptions = computed(() => {
  const list = [...(props.options || [])]
  for (const item of createdItems.value) {
    if (!list.some(o => String(o.value) === String(item.value))) list.push(item)
  }
  return list
})

/** 下拉候选: 本地模式用 merged, 远程模式映射原始记录 */
const selectOptions = computed(() => {
  if (isLocalMode.value) {
    return mergedLocalOptions.value.map((item, index) => ({
      value: item.value,
      label: item.label,
      key: `${item.value}_${index}`,
      data: item
    }))
  }
  return remoteOptions.value.map((item, index) => {
    const value = item[props.valueField]
    const label = item[props.labelField]

    return {
      value,
      label,
      key: `${value}_${index}`,
      data: item // 保留原始数据供插槽使用
    }
  })
})

/** 本地模式前端过滤(远程模式 filter-option=false 由服务端过滤) */
const filterOption = (input: string, option: any) =>
  isLocalMode.value
    ? String(option.label || '').toLowerCase().includes(String(input || '').toLowerCase())
    : false

/** 是否可键入搜索: 只读点选(readonly)时不启用 show-search(输入框不可键入, 点开直接选);
 *  远程搜索模式必须可键入, 忽略 readonly */
const showSearch = computed(() => (isLocalMode.value ? !props.readonly : true))

/** 下拉尾部「添加」入口: 搜索词无同名候选时显示;
 *  只读点选(无搜索词)时也始终提供, 方便不开键盘直接新建 */
const canAddFromSearch = computed(() => {
  if (!props.createFn) return false
  const kw = searchWord.value.trim().toLowerCase()
  if (!kw) return isLocalMode.value && !!props.readonly
  return !selectOptions.value.some(o => String(o.label || '').toLowerCase() === kw)
})

/** 尾部文案: 有搜索词时带「词」, 无搜索词(只读点选)时只显示「添加xx」 */
const addTailText = computed(() => {
  const kw = searchWord.value.trim()
  return kw ? `＋ ${props.addText}「${kw}」` : `＋ ${props.addText}`
})

// 根据值加载对应的选项（用于显示翻译；本地模式候选由父级维护，不需回查）
const loadOptionByValue = async (value: string | number) => {
  if (!value || isLocalMode.value) return

  // 如果已经有这个选项了，就不用再查了
  if (remoteOptions.value.some(opt => opt[props.valueField] === value)) {
    return
  }
  
  try {
    loading.value = true
    
    let res: any
    
    // 使用 customRequestBuilder 或标准查询
    if (props.customRequestBuilder) {
      const requestData = props.customRequestBuilder(String(value))
      // 如果自定义函数返回 null，则跳过查询
      if (requestData === null) {
        loading.value = false
        return
      }
      res = await props.apiFn!(requestData, false, false, false)
    } else {
      // 标准查询：使用 valueField 精确查询
      const requestData: any = {
        conditionList: [
          {
            property: props.valueField,
            relation: FILTER_TYPE.EQUAL,
            value: [value]
          }
        ],
        pageSize: 10,
        distinct: '1'
      }
      
      if (props.selectColumns && props.selectColumns.length > 0) {
        requestData.selectColumnList = [...props.selectColumns]
      }
      
      res = await props.apiFn(requestData, false, false, false)
    }
    
    // 处理响应数据
    const records = res?.payload?.records || res?.payload || []
    
    // 如果找到结果，添加到候选
    if (records && records.length > 0) {
      remoteOptions.value = [...records, ...remoteOptions.value]
    }
  } catch (error) {
    console.error('[SearchSelect] 查询失败:', error)
  } finally {
    loading.value = false
  }
}

// 搜索函数
const searchData = debounce(async (keyword: string) => {
  // 本地模式: 前端过滤, 只记录关键词供下拉尾部「添加」入口判断
  if (isLocalMode.value) {
    searchWord.value = keyword || ''
    return
  }

  try {
    loading.value = true
    
    let res: any
    
    // 如果有自定义请求构造函数，使用自定义函数
    if (props.customRequestBuilder) {
      const requestData = props.customRequestBuilder(keyword)
      // 如果自定义函数返回 null，则跳过搜索
      if (requestData === null) {
        remoteOptions.value = []
        loading.value = false
        return
      }
      res = await props.apiFn!(requestData, false, false, false)
    } else {
      // 标准查询：使用通用查询格式
      const requestData: any = {
        conditionList: [],
        pageSize: props.pageSize,
        distinct: '1'
      }
      
      // 只有当关键字不为空时，才添加搜索条件
      if (keyword && keyword.trim()) {
        requestData.conditionList.push({
          property: props.searchProperty,
          relation: FILTER_TYPE.LIKE,
          value: [keyword]
        })
      }
      
      // 如果有 selectColumns，添加到请求中
      if (props.selectColumns && props.selectColumns.length > 0) {
        requestData.selectColumnList = [...props.selectColumns]
      }
      
      res = await props.apiFn!(requestData, false, false, false)
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
      
      remoteOptions.value = uniqueRecords
    } else {
      remoteOptions.value = []
    }
  } catch (error) {
    console.error('搜索失败:', error)
    remoteOptions.value = []
  } finally {
    loading.value = false
  }
  // 当只有一个结果时自动选择，但只在值真正变化时才 emit
  if (remoteOptions.value.length === 1) {
    const option = remoteOptions.value[0]
    const newValue = option[props.valueField]
    // 只有当值真正变化时才触发事件，避免循环触发
    if (newValue !== internalValue.value) {
      internalValue.value = newValue
      emit('update:modelValue', internalValue.value)
      emit('change', internalValue.value, option)
    }
  }
}, props.debounceTime)

// 处理选择变化
const handleChange = (value: any) => {
  internalValue.value = value
  // 从原始数据中查找选中项
  const option = remoteOptions.value.find(opt => opt[props.valueField] === value)
  emit('update:modelValue', value)
  emit('change', value, option)
}

// ===== 原地新建(create-fn 传入时启用) =====
const modalVisible = ref(false)
const creating = ref(false)
const formName = ref('')

const openAddModal = (preset: string) => {
  formName.value = preset
  modalVisible.value = true
}

const save = async () => {
  const name = formName.value.trim()
  if (!name) {
    message.warning(`请输入${props.nameLabel}`)
    return
  }
  creating.value = true
  try {
    const created: any = await props.createFn!(name)
    if (!created || created.value === undefined || created.value === null) {
      throw new Error('create-fn 未返回新档案的 value')
    }
    const item = { label: created.label || name, value: created.value }
    // 新档案并入候选(本地/远程两模式), 保证立即可选
    if (isLocalMode.value) {
      createdItems.value.push(item)
    } else {
      remoteOptions.value = [{ [props.valueField]: item.value, [props.labelField]: item.label }, ...remoteOptions.value]
    }
    modalVisible.value = false
    searchWord.value = ''
    internalValue.value = item.value
    emit('update:modelValue', item.value)
    emit('change', item.value, created)
    emit('created', created)
  } catch (e: any) {
    message.error(e?.message || '添加失败')
  } finally {
    creating.value = false
  }
}

// 监听外部值变化
watch(() => props.modelValue, async (newVal, oldVal) => {
  // 如果值相同，不重复处理
  if (newVal === oldVal) return
  // 如果都是空值，也不处理
  if (!newVal && !oldVal) return
  
  internalValue.value = newVal
  
  // 根据值加载对应的选项
  if (newVal) {
    await loadOptionByValue(newVal)
  }
}, { immediate: true })

// 暴露方法：用于编辑时设置初始选项
defineExpose({
  setInitialOption: (option: any) => {
    if (option) {
      remoteOptions.value = [option]
      hasSearched.value = true // 标记已有数据
    }
  },
  setInitialOptions: (opts: any[]) => {
    remoteOptions.value = opts
    hasSearched.value = true // 标记已有数据
  },
  // 刷新选项列表：重新执行搜索
  refresh: async (keyword?: string) => {
    hasSearched.value = false // 重置标记
    if (keyword) {
      await searchData(keyword)
    } else {
      // 如果没有传入关键字,使用当前值作为关键字
      await searchData(String(internalValue.value || ''))
    }
  },
  // 清空选项列表
  clearOptions: () => {
    remoteOptions.value = []
    hasSearched.value = false // 重置标记
  },
  // 获取当前选项列表
  getOptions: () => {
    return remoteOptions.value
  }
})
</script>

<template>
  <div
    class="ss-wrap"
    :class="{ addable: !!createFn }"
  >
    <a-select
      v-model:value="internalValue"
      class="ss-main"
      :disabled="disabled"
      :filter-option="filterOption"
      :loading="loading"
      :placeholder="placeholder"
      :allow-clear="allowClear"
      :options="selectOptions"
      :show-search="showSearch"
      @change="handleChange"
      @search="searchData"
    >
      <!-- 下拉选项的自定义渲染 -->
      <template #option="{ label, data }">
        <slot
          name="option"
          :option="data"
        >
          {{ label }}
        </slot>
      </template>
      <!-- 搜索词无同名候选时, 下拉尾部出现「＋ 添加xx「搜索词」」, 选中即建档 -->
      <template #dropdownRender="{ menuNode }">
        <v-nodes :vnodes="menuNode" />
        <div
          v-if="canAddFromSearch"
          class="ss-add-tail"
          @mousedown.prevent
          @click="openAddModal(searchWord.trim())"
        >
          {{ addTailText }}
        </div>
      </template>
    </a-select>
    <a-button
      v-if="createFn"
      class="ss-add-btn"
      :disabled="disabled"
      :title="addText"
      @click="openAddModal('')"
    >
      ＋
    </a-button>

    <!-- 原地建档弹窗: 名称预填(下拉搜索词), 保存走 create-fn, 成功后自动选中新值 -->
    <a-modal
      v-model:visible="modalVisible"
      :title="createTitle"
      :width="480"
      :confirm-loading="creating"
      @ok="save"
    >
      <a-form
        layout="vertical"
        @submit.prevent
      >
        <a-form-item
          :label="nameLabel"
          required
        >
          <a-input
            v-model:value="formName"
            :placeholder="namePlaceholder"
            @press-enter="save"
          />
        </a-form-item>
        <!-- 扩展字段: 调用方通过默认插槽追加表单项, 取值在 create-fn 里自行读取 -->
        <slot></slot>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped lang="less">
/* 默认不产生盒子(兼容旧用法裸 a-select 布局); 启用新建时 flex 行布局 */
.ss-wrap {
  display: contents;

  &.addable {
    display: flex;
    gap: 6px;

    .ss-main {
      flex: 1;
      min-width: 0;
    }

    .ss-add-btn {
      flex: none;
      padding: 0 10px;
    }
  }

  .ss-add-tail {
    margin: 4px;
    padding: 6px 12px;
    border-top: 1px solid var(--split, #f0f0f0);
    color: var(--primary, #1677ff);
    font-size: 13px;
    cursor: pointer;
    user-select: none;

    &:hover {
      background: rgba(22, 119, 255, 0.06);
      border-radius: 4px;
    }
  }
}
</style>