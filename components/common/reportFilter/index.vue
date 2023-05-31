<template>
  <a-cascader
    v-if="!userOnly"
    v-model:value="areaListValue"
    multiple
    max-tag-count="responsive"
    :options="areaListOption"
    placeholder="请选择区域公司"
    @change="selectArea">
    <template #tagRender="data">
      <a-tag :key="data.value" color="blue">{{ data.label }}</a-tag>
    </template>
  </a-cascader>
  <a-input v-model:value="searchProjectName" placeholder="请输入项目名称" @change="handleChangeProjectName" style="width: 200px" v-if="!userOnly" />
  <a-select
    placeholder="请选择负责人"
    style="width: 200px"
    show-search
    allowClear
    v-model:value="selectUserValue"
    :options="allUserList"
    :filter-option="filterOption"
    @change="selectUser" />
</template>

<script setup lang="ts">
import {Ref} from "vue"
import * as _ from "lodash"
import {getTreeList} from "@/framework/apis/common"
import {CascaderProps} from "ant-design-vue"
import {ValueLabelArray} from "@/framework/utils/type"
import {QUERY_INTERVAL} from "@/framework/utils/constant"
import {getUserList} from "@/framework/apis/user/userGroup"
import {getCascaderList} from "@/framework/hooks/weekBusinessReport"

let areaListOption = ref<CascaderProps['options']>()
let areaListValue = ref([])
let areaNameValueList: Ref<Array<string>> = ref([])
let allUserList: Ref<ValueLabelArray> = ref([])
let searchProjectName: Ref<string> = ref('')
let selectUserValue: Ref<string|undefined> = ref(undefined)

getUserList().then(res => allUserList.value = res.payload)
getTreeList('BIDR_AREA_DICT').then(res => areaListOption.value = res.payload)

const emit = defineEmits(['callback'])
const props = defineProps<{userOnly?: boolean}>()
const userOnly = ref(!!props.userOnly)

const handleChangeProjectName = _.debounce(() => emit('callback', {
  searchProjectName: searchProjectName.value,
  areaNameValueList: areaNameValueList.value,
  selectUserValue: selectUserValue.value,
}), QUERY_INTERVAL)

const filterOption = (input: string, option: any) => option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0

const selectArea = () => {
  areaNameValueList.value = getCascaderList(areaListValue, areaListOption).map(item => item.value)
  emit('callback', {
    searchProjectName: searchProjectName.value,
    areaNameValueList: areaNameValueList.value,
    selectUserValue: selectUserValue.value,
  })
}
const selectUser = () => emit('callback', {
  searchProjectName: searchProjectName.value,
  areaNameValueList: areaNameValueList.value,
  selectUserValue: selectUserValue.value,
})

</script>
