<template>
  <dialog-box
    v-model:visible="_show"
    :title="config.title"
    is-full>
    <content-layout :width="300" style="margin-top: 10px">
      <template #side>
        <a-tabs
          v-model:activeKey="metricActiveKey"
          destroy-inactive-tab-pane
          type="card"
          @change="onMetricTabChange">
          <a-tab-pane key="1" tab="指标">
            <list-content
              ref="leftRef"
              v-model="selectedDict"
              :list-data="dictFields"
              label-in-value
              @change="onDictFieldChange" />
          </a-tab-pane>
          <a-tab-pane key="2" tab="自定义">
            <div style="height: 100%">
              <div style="display: flex;justify-content: end">
                <a-switch
                  v-model:checked="majorCondition" checked-children="主" checked-value="0"
                  style="margin-top: 5px; margin-right: 3px;" un-checked-children="次" un-checked-value="1" />
                <a-select
                  v-model:value="customMetric" allow-clear
                  placeholder="请选择分类指标" style="width: 200px; margin-right: 10px">
                  <a-select-option v-for="item in dictFields" :key="item.value" :value="item.value">{{
                    item.label
                  }}
                  </a-select-option>
                </a-select>
                <a-tooltip placement="top">
                  <template #title>
                    <span>添加数据条目</span>
                  </template>
                  <a-button style="margin-right: 2px" @click="addCustomMetric">
                    <template #icon>
                      <PlusOutlined />
                    </template>
                  </a-button>
                </a-tooltip>
                <a-tooltip placement="top">
                  <template #title>
                    <span>清空数据条目</span>
                  </template>
                  <a-button @click="cleanCustomMetric">
                    <template #icon>
                      <ClearOutlined />
                    </template>
                  </a-button>
                </a-tooltip>
              </div>
              <drag-grid
                :key="customMetricCondition.length"
                ref="customMetricDragGridRef"
                v-model="customMetricCondition"
                :field-names="{value: 'value', label: 'label'}"
                :height="4"
                :max-col="1"
                :rowHeight="4"
                :width="1">
                <template #render="{ item }">
                  <a-card
                    :body-style="{padding: 0, height: '100%'}"
                    :head-style="{backgroundColor: '#fff'}"
                    :title="item.data.label"
                    size="small"
                    style="height: 100%; border-radius: 0; background-color: transparent; border: none;">
                    <template #extra>
                      <a-tooltip placement="top">
                        <template #title>
                          <span>编辑</span>
                        </template>
                        <a-button size="small" type="text" @click="editCustomMetric(item.data)">
                          <template #icon>
                            <EditOutlined />
                          </template>
                        </a-button>
                      </a-tooltip>
                      <a-tooltip placement="top">
                        <template #title>
                          <span>复制</span>
                        </template>
                        <a-button size="small" type="text" @click="copyCustomMetric(item.data)">
                          <template #icon>
                            <CopyOutlined />
                          </template>
                        </a-button>
                      </a-tooltip>
                      <a-tooltip placement="top">
                        <template #title>
                          <span>删除</span>
                        </template>
                        <a-button size="small" type="text" @click="deleteCustomMetric(item.data)">
                          <template #icon>
                            <DeleteOutlined />
                          </template>
                        </a-button>
                      </a-tooltip>
                    </template>
                  </a-card>
                </template>
              </drag-grid>
            </div>
            <div class="center">
              <a-button
                :disabled="customMetricCondition.length === 0" style="margin: 10px" type="primary"
                @click="confirmMetricCondition">生成指标图
              </a-button>
            </div>
          </a-tab-pane>
        </a-tabs>
      </template>
      <template #content>
        <a-tabs
          v-model:activeKey="activeKey"
          destroy-inactive-tab-pane
          @change="onTabChange">
          <a-tab-pane v-for="statisticTab in statisticTabs" :key="statisticTab.value" :tab="statisticTab.label">
            <a-row
              v-if="secondDictExpand && statisticTab.value === PERCENTAGE_TAB_KEY && selectedDict.length === 1">
              <a-col v-for="item in secondDictMap.get(selectedDict[0].value)" :key="item.value" :span="4">
                <a-checkbox
                  :key="item.value" v-model:checked="item.checked" @change="onSecondDictFieldChange(item)">
                  {{ item.label }}
                </a-checkbox>
              </a-col>
            </a-row>
            <drag-grid
              :key="statistic.length"
              ref="dragGridRef"
              v-model="statistic"
              :field-names="{value: 'value', label: 'label'}"
              :height="computedGrid.height"
              :max-col="computedGrid.maxCol"
              :rowHeight="computedGrid.rowHeight"
              :width="computedGrid.width">
              <template #render="{ item }">
                <a-card
                  :body-style="{padding: 0, height: '100%'}"
                  :head-style="{backgroundColor: '#fff'}"
                  :title="item.data.label"
                  size="small"
                  style="height: 100%; border-radius: 0; background-color: transparent; border: none;">
                  <template v-if="isEmpty(item.data.metricCondition)">
                    <single-metric
                      v-if="isEmpty(dictMap.get(item.data.value.split('-')[0].split(',')[1]))"
                      :data="item.data.echatOption"
                      :index="item.i" />
                    <double-metric
                      v-else
                      :data="item.data.echatOption"
                      :index="item.i" />
                  </template>
                  <template v-else>
                    <customize-metric
                      :data="item.data.echatOption"
                      :dict="isEmpty(item.data.metricColumn) ? undefined : dictMap.get(item.data.metricColumn[0])"
                      :index="item.i" />
                  </template>
                  <template #extra>
                    <a-button disabled size="small" type="text" @click="onCardClick(item.data)">
                      <template #icon>
                        <FullscreenOutlined />
                      </template>
                    </a-button>
                    <a-button size="small" type="text" @click="reloadCard(item.data)">
                      <template #icon>
                        <RedoOutlined />
                      </template>
                    </a-button>
                    <a-button size="small" type="text" @click="closeCard(item.data)">
                      <template #icon>
                        <CloseCircleOutlined />
                      </template>
                    </a-button>
                  </template>
                </a-card>
              </template>
            </drag-grid>
          </a-tab-pane>
          <template #leftExtra>
            <a-button
              :disabled="activeKey !== PERCENTAGE_TAB_KEY || selectedDict.length !== 1"
              style="margin-bottom: -10px"
              type="link"
              @click="secondDictExpand = !secondDictExpand">
              <template #icon>
                <MoreOutlined />
              </template>
            </a-button>
          </template>
          <template #rightExtra>
            <a-tooltip placement="top">
              <template #title>
                <span>关闭所有</span>
              </template>
              <a-button
                :disabled="statistic.length === 0" shape="circle" size="middle"
                type="text"
                @click="closeAll">
                <template #icon>
                  <ClearOutlined />
                </template>
              </a-button>
            </a-tooltip>
            <a-tooltip placement="top">
              <template #title>
                <span>高级查询</span>
              </template>
              <a-button
                shape="circle" size="middle" style="margin-right: 15px;" type="text"
                @click="advancedCondition.show = true">
                <template #icon>
                  <funnel-plot-outlined />
                </template>
              </a-button>
            </a-tooltip>
          </template>
        </a-tabs>
      </template>
    </content-layout>
  </dialog-box>
  <portal-advanced-search-modal
    :advanced="false"
    :advanced-condition="advancedCondition"
    @confirm="onAdvancedConditionConfirm" />
  <portal-statistic-custom-metric
    :advanced-condition="metricAdvancedCondition"
    @confirm="onMetricConditionConfirm" />
</template>

<script lang="ts" setup>
import { ColumnType, FIELD_TYPE, QueryType, TableConfigType } from '@/framework/components/common/Portal/type'
import {
  ClearOutlined,
  CloseCircleOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  FullscreenOutlined,
  FunnelPlotOutlined,
  MoreOutlined,
  PlusOutlined,
  RedoOutlined
} from '@ant-design/icons-vue'
import { advancedStatistic, generalStatistic } from '@/framework/apis/portal'
import SingleMetric from '../dashboard/singleMetric/index.vue'
import DoubleMetric from '../dashboard/doubleMetric/index.vue'
import CustomizeMetric from '../dashboard/customizeMetric/index.vue'
import { dictStore, useTreeStore } from '@/framework/store/common'
import { isEmpty, uuid } from '@/framework/utils/common'
import PortalStatisticCustomMetric from '@/framework/components/common/Portal/modal/PortalStatisticCustomMetric.vue'
import _ from "lodash"

const dragGridRef = ref()
const customMetricDragGridRef = ref()
const PERCENTAGE_TAB_KEY = ''
const PERCENTAGE_TAB_TITLE = '分布统计'
const props = withDefaults(
  defineProps<{
    show: boolean
    config: TableConfigType
    columns: Array<ColumnType>
    condition?: any
  }>(),
  {
    condition: []
  }
)
const { config, columns, show } = toRefs(props)
const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()
const _show = ref(props.show)
watch(
  () => show.value,
  () => _show.value = show.value
)
watch(
  () => _show.value,
  () => emit('update:show', _show.value)
)
const dict = dictStore()
const treeDict = useTreeStore()
const selectedDict = ref([] as Array<any>)
const dictFields = ref([] as Array<{ value: any, label: any, checked: boolean }>)
const dictMap = ref(new Map())
const secondDictMap = ref(new Map<String, Array<{ value: any, label: any, checked: boolean }>>())
const secondDictExpand = ref(false)
const statisticTabs = ref([{ value: PERCENTAGE_TAB_KEY, label: PERCENTAGE_TAB_TITLE }] as Array<{
  value: string,
  label: string
}>)
const statisticData = ref(new Map<string, Array<{ value: string, label: string, echatOption: any }>>())
const advancedCondition = reactive({
  show: false,
  condition: {},
  columnArray: [] as Array<any>,
  okText: '查询'
})
const metricAdvancedCondition = reactive({
  id: '',
  name: '',
  show: false,
  type: '' as 'add' | 'update' | 'copy' | '',
  condition: {},
  columnArray: [] as Array<any>,
  okText: '确定'
})
const rewriteLabelMap = ref(new Map())
//需要重写label的字典集合
const rewriteDictSet = new Set(['BOOLEAN_DICT'])

watch(
  () => props.condition,
  () => advancedCondition.condition = isNotEmpty(props.condition) ? {
    conditionList: [...props.condition],
    andOr: '0'
  } : {}
)
const formatTitle = (title: string) => {
  if (title.indexOf('\n') !== -1) {
    return title.replace('\n', '')
  } else if (title.indexOf('\\n') !== -1) {
    return title.replace('\\n', '')
  } else {
    return title
  }
}
watch(
  () => columns.value,
  () => {
    if (isNotEmpty(columns.value)) {
      statisticTabs.value.length = 0
      dictFields.value.length = 0
      dictMap.value.clear()
      secondDictMap.value.clear()
      advancedCondition.columnArray.length = 0
      metricAdvancedCondition.columnArray.length = 0
      statisticData.value.clear()
      statisticData.value.set(PERCENTAGE_TAB_KEY, [] as Array<{ value: string, label: string, echatOption: any }>)
      statisticTabs.value = [{ value: PERCENTAGE_TAB_KEY, label: PERCENTAGE_TAB_TITLE }]
      columns.value.forEach(column => {
        if (column.disabled || column.checked === false || column.customFilterDropdown === false) return
        // 高级查询字段
        advancedCondition.columnArray.push({ ...column, title: formatTitle(column.title) })
        metricAdvancedCondition.columnArray.push({ ...column, title: formatTitle(column.title) })
        secondDictMap.value.set(column.dataIndex, [{
          value: PERCENTAGE_TAB_KEY,
          label: PERCENTAGE_TAB_TITLE,
          checked: true
        }])
        if (rewriteDictSet.has(column.referenceDict)) {
          rewriteLabelMap.value.set(column.dataIndex, column.title)
        }
        // 字典字段
        if (column.fieldType === FIELD_TYPE.SELECT || column.fieldType === FIELD_TYPE.TREE) {
          dictFields.value.push({ value: column.dataIndex, label: formatTitle(column.title), checked: false })
          if (column.fieldType === FIELD_TYPE.SELECT) {
            dictMap.value.set(column.dataIndex, dict.map.get(column.referenceDict))
          } else {
            dictMap.value.set(column.dataIndex, treeDict.map.get(column.referenceDict))
          }
          columns.value.forEach(item => {
            if (item.disabled || item.checked === false || item.customFilterDropdown === false || item.dataIndex === column.dataIndex) return
            if (item.fieldType === FIELD_TYPE.SELECT || item.fieldType === FIELD_TYPE.TREE) {
              secondDictMap.value.get(column.dataIndex)?.push({
                value: item.dataIndex,
                label: formatTitle(item.title),
                checked: false
              })
            }
          })
        }
        if (column.summary) {
          statisticTabs.value.push({ value: column.dataIndex, label: column.title })
        }
      })
    }
  },
  {
    deep: true,
    immediate: true
  }
)
const statistic = ref([] as Array<{
  value: string,
  label: string,
  metricColumn: Array<any>,
  metricCondition: Array<any>,
  statisticColumn: { value: string, label: string },
  majorCondition?: string,
  echatOption: any
}>)
const activeKey = ref(PERCENTAGE_TAB_KEY)
const getDictValueMap = (dict: string) => {
  if (rewriteLabelMap.value.has(dict)) {
    const map = new Map()
    dictMap.value.get(dict)?.valueMap.forEach((value: any, key: any) => {
      map.set(key, rewriteLabelMap.value.get(dict) + ':' + value)
    })
    return Object.fromEntries(map)
  } else {
    return Object.fromEntries(dictMap.value.get(dict)?.valueMap)
  }
}
const onDictFieldChange = (value: any) => {
  console.log('onDictFieldChange', value)
  if (isNotEmpty(value)) {
    const dictValue = value[0].value
    const tabIndex = statisticTabs.value.findIndex(item => item.value === activeKey.value)
    if (tabIndex > -1) {
      const tabLabel = statisticTabs.value[tabIndex].label
      if (statistic.value.findIndex(item => (item.value === (dictValue + '-' + activeKey.value))) === -1) {
        const metricColumn = [{ column: dictValue, dictMap: getDictValueMap(dictValue) }]
        const resolve = (resp: any) => {
          statistic.value.unshift({
            value: dictValue + '-' + activeKey.value,
            label: value[0].label + '-' + tabLabel,
            echatOption: resp.payload,
            metricColumn: metricColumn,
            metricCondition: [],
            statisticColumn: { value: activeKey.value, label: tabLabel }
          })
          if (activeKey.value === PERCENTAGE_TAB_KEY) {
            secondDictMap.value.get(value[0].value)![0].checked = true
          }
          console.log('onDictFieldChange', value, secondDictMap.value, secondDictMap.value.get(value[0]))
        }
        if (config.value.advancedSearchAble) {
          advancedStatistic(config.value.url,
            advancedCondition.condition as QueryType,
            null,
            metricColumn,
            [],
            [{ value: activeKey.value, label: tabLabel }]).then(resolve)
        } else {
          generalStatistic(config.value.url,
            advancedCondition.condition as QueryType,
            null,
            metricColumn,
            [],
            [{ value: activeKey.value, label: tabLabel }]).then(resolve)
        }
      }
    }
  }
}
const onTabChange = (key: string) => {
  selectedDict.value.length = 0
  console.log('onTabChange', key)
}
const onSecondDictFieldChange = (value: any) => {
  const tabIndex = statisticTabs.value.findIndex(item => item.value === activeKey.value)
  if (tabIndex > -1) {
    const tabLabel = statisticTabs.value[tabIndex].label
    const selectedFieldValue = selectedDict.value[0].value + ',' + value.value
    let selectedFieldLabel: string
    if (value.value === PERCENTAGE_TAB_KEY) {
      selectedFieldLabel = selectedDict.value[0].label + '-' + tabLabel
    } else {
      selectedFieldLabel = selectedDict.value[0].label + '-' + value.label + '-' + tabLabel
    }
    const index = statistic.value.findIndex(item => item.value === (selectedFieldValue + '-' + activeKey.value))
    if (value.checked) {
      if (index === -1) {
        const metricColumn = selectedFieldValue.split(',').map(item => {
          return { column: item, dictMap: getDictValueMap(item) }
        })
        const resolve = (resp: any) => {
          statistic.value.unshift({
            value: selectedFieldValue + '-' + activeKey.value,
            label: selectedFieldLabel,
            echatOption: resp.payload,
            metricColumn: metricColumn,
            metricCondition: [],
            statisticColumn: { value: activeKey.value, label: tabLabel }
          })
        }
        if (config.value.advancedSearchAble) {
          advancedStatistic(config.value.url,
            advancedCondition.condition as QueryType,
            null,
            metricColumn,
            [],
            [{ value: activeKey.value, label: tabLabel }]).then(resolve)
        } else {
          generalStatistic(config.value.url,
            advancedCondition.condition as QueryType,
            null,
            metricColumn,
            [],
            [{ value: activeKey.value, label: tabLabel }]).then(resolve)
        }
      }
    } else {
      (index !== -1) && statistic.value.splice(index, 1)
    }
  }
}
const onCardClick = (arg: any) => {
  console.log('onCardClick', arg)
}
const reloadCard = (arg: any) => {
  console.log('reloadCard', arg)
}
const remove = (index: any) => {
  const removedItem = statistic.value.splice(index, 1)
  const dict = removedItem[0].value.split(',')
  const secondDict = dict[1] || ''
  const list = secondDictMap.value.get(dict[0])
  if (list) {
    const secondIndex = list.findIndex(item => item.value === secondDict)
    if (secondIndex > -1) {
      list[secondIndex].checked = false
    }
  }
}
const closeCard = (arg: any) => {
  const index = statistic.value.findIndex(item => item.value === arg.value)
  remove(index)
}
const closeAll = () => {
  const count = statistic.value.length
  for (let index = 0; index < count; index++) {
    remove(statistic.value.length - 1)
  }
  selectedDict.value.length = 0
  secondDictMap.value.forEach((item: any) => item.forEach((i: any) => i.checked = false))
}
const computedGrid = computed(() => {
  if (statistic.value.length == 1) return { height: 14, rowHeight: 40, width: 60, maxCol: 60 }
  if (statistic.value.length <= 2) return { height: 14, rowHeight: 40, width: 30, maxCol: 60 }
  if (statistic.value.length <= 4) return { height: 10, rowHeight: 40, width: 30, maxCol: 60 }
  if (statistic.value.length <= 9) return { height: 7, rowHeight: 40, width: 20, maxCol: 60 }
  if (statistic.value.length <= 16) return { height: 7, rowHeight: 40, width: 15, maxCol: 60 }
  else return { height: 7, rowHeight: 40, width: 15, maxCol: 60 }
})
const onAdvancedConditionConfirm = (arg: any) => {
  console.log('====onAdvancedConditionConfirm=====', arg)
  console.log('====onAdvancedConditionConfirm=====', advancedCondition)
}

const metricActiveKey = ref('1')
const onMetricTabChange = () => {
  console.log('onMetricTabChange')
}
const customMetricCondition = ref([] as Array<any>)
const customMetric = ref(undefined as any)
const majorCondition = ref('1')
const onMetricConditionConfirm = () => {
  const metric = {
    value: metricAdvancedCondition.id,
    label: metricAdvancedCondition.name,
    condition: metricAdvancedCondition.condition
  }
  if (metricAdvancedCondition.type === 'add' || metricAdvancedCondition.type === 'copy') {
    customMetricCondition.value.push(metric)
  } else {
    const index = customMetricCondition.value.findIndex((item: any) => item.value === metricAdvancedCondition.id)
    console.log(index, customMetricCondition.value[index])
    customMetricCondition.value[index].label = metricAdvancedCondition.name
    customMetricCondition.value[index].condition = metricAdvancedCondition.condition
    customMetricDragGridRef.value.forceUpdate()
  }
}
const addCustomMetric = () => {
  const index = customMetricCondition.value.length
  metricAdvancedCondition.id = uuid()
  metricAdvancedCondition.name = '自定义指标' + (index ? index + 1 : '')
  metricAdvancedCondition.condition = {}
  metricAdvancedCondition.type = 'add'
  metricAdvancedCondition.show = true
}
const deleteCustomMetric = (metric: any) => {
  const index = customMetricCondition.value.findIndex((item: any) => item.value === metric.value)
  customMetricCondition.value.splice(index, 1)
}
const editCustomMetric = (metric: any) => {
  metricAdvancedCondition.id = metric.value
  metricAdvancedCondition.name = metric.label
  metricAdvancedCondition.condition = metric.condition
  metricAdvancedCondition.type = 'update'
  metricAdvancedCondition.show = true
}
const copyCustomMetric = (metric: any) => {
  const index = customMetricCondition.value.findIndex((item: any) => item.value === metric.value)
  const count = customMetricCondition.value.length
  metricAdvancedCondition.id = uuid()
  metricAdvancedCondition.name = '自定义指标' + (count ? count + 1 : '')
  metricAdvancedCondition.condition = _.cloneDeep(customMetricCondition.value[index].condition)
  metricAdvancedCondition.type = 'copy'
  metricAdvancedCondition.show = true
}
const cleanCustomMetric = () => {
  customMetricCondition.value.length = 0
}
const confirmMetricCondition = () => {
  const metricColumn = customMetric.value ? [{
    column: customMetric.value,
    dictMap: getDictValueMap(customMetric.value)
  }] : []
  const tabIndex = statisticTabs.value.findIndex(item => item.value === activeKey.value)
  const tabLabel = statisticTabs.value[tabIndex].label
  const resolve = (resp: any) => {
    statistic.value.unshift({
      value: uuid(),
      label: tabLabel,
      echatOption: resp.payload,
      metricColumn: metricColumn,
      metricCondition: customMetricCondition.value,
      majorCondition: majorCondition.value,
      statisticColumn: { value: activeKey.value, label: tabLabel }
    })
  }
  if (!config.value.advancedSearchAble) {
    advancedStatistic(config.value.url, advancedCondition.condition as QueryType, null,
      metricColumn, customMetricCondition.value, [{
        value: activeKey.value,
        label: tabLabel
      }], majorCondition.value).then(resolve)
  } else {
    generalStatistic(config.value.url, advancedCondition.condition as QueryType, null,
      metricColumn, customMetricCondition.value, [{
        value: activeKey.value,
        label: tabLabel
      }], majorCondition.value).then(resolve)
  }
  console.log('confirmMetricCondition', customMetric.value, customMetricCondition.value, {
    value: activeKey.value,
    label: tabLabel
  })
}
onMounted(() => {

})
</script>


<style lang="less" scoped>
.add-option-cont {
  display: inline-block;
  width: calc(100% - 15px);
  border: 1px solid #ccc;
  border-radius: 5px;
  box-shadow: 5px 5px 5px rgb(201, 201, 201);
  vertical-align: bottom;
  font-size: 15px;
  text-align: center;
  align-items: center;
  color: #ccc;
  cursor: pointer;
}
</style>