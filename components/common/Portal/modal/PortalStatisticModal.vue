<template>
  <dialog-box
    v-model:visible="_show"
    :title="config.title"
    is-full>
    <content-layout :width="400" style="margin-top: 20px">
      <template #side>
        <list-content
          ref="leftRef"
          v-model="selectedDictFields"
          :list-data="dictFields"
          multi />
      </template>
      <template #content>
        <a-tabs
          v-model:activeKey="activeKey"
          destroy-inactive-tab-pane
          type="card">
          <a-tab-pane v-for="statisticTab in statisticTabs" :key="statisticTab.value" :tab="statisticTab.label">
            <drag-grid
              :key="selectedDictFields.length"
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
                  :title="item.data.label + '-' + statisticTab.label"
                  size="small"
                  style="height: 100%; border-radius: 0; background-color: transparent; border: none;">
                  <template #extra>
                    <a-button size="small" type="text">
                      饼图
                      <template #icon>
                        <FullscreenOutlined />
                      </template>
                    </a-button>
                  </template>
                </a-card>
              </template>
            </drag-grid>
          </a-tab-pane>
          <template #rightExtra>
            <a-button>高级选项</a-button>
          </template>
        </a-tabs>
      </template>
    </content-layout>
  </dialog-box>
</template>

<script lang="ts" setup>
import { ColumnType, FIELD_TYPE, TableConfigType } from '@/framework/components/common/Portal/type'
import { FullscreenOutlined } from '@ant-design/icons-vue'

const PERCENTAGE_TAB_KEY = 'percentage'
const PERCENTAGE_TAB_TITLE = '占比'
const props = withDefaults(
    defineProps<{
      show: boolean
      config: TableConfigType
      columns: Array<ColumnType>
    }>(),
    {}
)
const { config, columns, show } = toRefs(props)
const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()
const _show = ref(props.show)
watch(
    () => show.value,
    () => _show.value = show.value,
)
watch(
    () => _show.value,
    () => emit('update:show', _show.value),
)
const selectedDictFields = ref([] as Array<any>)
const dictFields = ref([] as Array<any>)
const statisticTabs = ref([{ value: PERCENTAGE_TAB_KEY, label: PERCENTAGE_TAB_TITLE }] as Array<{
  value: string,
  label: string
}>)
const statisticData = ref(new Map<string, Array<{ value: string, label: string, echatOption: any }>>())
watch(
    () => columns.value,
    () => {
      if (isNotEmpty(columns.value)) {
        statisticTabs.value.length = 0
        dictFields.value.length = 0
        statisticData.value.clear()
        statisticData.value.set(PERCENTAGE_TAB_KEY, [] as Array<{ value: string, label: string, echatOption: any }>)
        statisticTabs.value = [{ value: PERCENTAGE_TAB_KEY, label: PERCENTAGE_TAB_TITLE }]
        columns.value.forEach(column => {
          if (column.fieldType === FIELD_TYPE.SELECT || column.fieldType === FIELD_TYPE.SELECT_MULTI_IN_ONE ||
              column.fieldType === FIELD_TYPE.TREE || column.fieldType === FIELD_TYPE.TREE_MULTI_IN_ONE) {
            dictFields.value.push({ value: column.dataIndex, label: column.title })
            // 数量占比
            statisticData.value.get(PERCENTAGE_TAB_KEY)?.push({
              value: column.dataIndex,
              label: column.title,
              echatOption: {}
            })
          }
          if (column.summary) {
            statisticData.value.set(column.dataIndex, [] as Array<{ value: string, label: string, echatOption: any }>)
            statisticTabs.value.push({ value: column.dataIndex, label: column.title })
            columns.value.forEach(summary => {
              if (summary.fieldType === FIELD_TYPE.SELECT || summary.fieldType === FIELD_TYPE.SELECT_MULTI_IN_ONE ||
                  summary.fieldType === FIELD_TYPE.TREE || summary.fieldType === FIELD_TYPE.TREE_MULTI_IN_ONE) {
                statisticData.value.get(column.dataIndex)?.push({
                  value: summary.dataIndex,
                  label: summary.title,
                  echatOption: {}
                })
              }
            })
          }
        })
      }
    },
    {
      deep: true,
      immediate: true
    }
)
const statistic = ref([] as Array<{ value: string, label: string, echatOption: any }>)
const activeKey = ref(PERCENTAGE_TAB_KEY)
watch(
    () => [selectedDictFields.value, activeKey.value],
    () => {
      if(selectedDictFields.value)
        if (isNotEmpty(selectedDictFields.value)) {
          if (statisticData.value.get(activeKey.value)) {
            statistic.value = statisticData.value.get(activeKey.value)?.filter(item => selectedDictFields.value.indexOf(item.value) !== -1) || []
          }
        } else {
          statistic.value = []
        }
      console.log('statistic.value', statistic.value)
    },
    {
      deep: true,
      immediate: true
    }
)
const computedGrid = computed(() => {
  if (statistic.value.length <= 4) return { height: 15, rowHeight: 23, width: 30, maxCol: 60 }
  if (statistic.value.length <= 9) return { height: 11, rowHeight: 20.5, width: 20, maxCol: 60 }
  if (statistic.value.length <= 16) return { height: 9, rowHeight: 19, width: 15, maxCol: 60 }
  if (statistic.value.length <= 25) return { height: 8, rowHeight: 17, width: 12, maxCol: 60 }
  else return { height: 8, rowHeight: 17, width: 12, maxCol: 60 }
})

onMounted(() => {

})
</script>


<style scoped>

</style>