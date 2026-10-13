<template>
  <a-select
    v-model:value="selectUserValue"
    :disabled="disabled"
    :filter-option="false"
    :options="staffList"
    :placeholder="placeholder"
    :style="{width: width + 'px'}"
    :virtual="false"
    allow-clear
    label-in-value
    show-search
    @search="handleInputChange"
  >
    <template #option="{label, avatar}">
      <div style="display: flex;">
        <img
          v-lazy="staffAvatar(avatar)"
          alt="头像"
          class="avatar"
        />
        <div style="margin-top: 10px">
          {{ label }}
        </div>
      </div>
    </template>
  </a-select>
</template>

<script lang="ts" setup>
import _ from 'lodash'

import getImgUrl from '@/framework/assets/imgs/getImgUrl'
import { getAccountInfo, getStaffList } from '@/framework/components/common/departmentAndStaffSelect/api'
import { QUERY_INTERVAL } from '@/framework/utils/constant'

const props = withDefaults(
  defineProps<{
    modelValue: any,
    width?: number,
    placeholder?: string,
    disabled?: boolean,
    active?: boolean,
    labelInValue?: boolean,
    // account＝登录账号表 ac_account（默认，保持原状）；user＝人事表 ac_user，
    // 覆盖未开登录账号的同步人员，且选项 value 取工号供下游按 customerNumber 定位
    source?: 'account' | 'user'
  }>(),
  {
    modelValue: '',
    width: 350,
    placeholder: '请搜索员工信息',
    disabled: false,
    active: true,
    labelInValue: false,
    source: 'account'
  }
)
const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
  (e: 'change', value: any): void
}>()
const { modelValue, width, placeholder, active, labelInValue, source } = toRefs(props)
const selectUserValue = ref({ value: '', label: '' } as any)
const staffList = ref([] as Array<any>)
const handleInputChange = _.debounce((value: string) => getSelectOption(value), QUERY_INTERVAL)
const defaultAvatar = getImgUrl('defaultAvatar.png')
const staffAvatar = (imgUrl: string) => {
  if (!imgUrl || imgUrl.indexOf('90') > -1) return defaultAvatar
  else return imgUrl
}
const searchStaff = (keyword: string) =>
  source.value === 'user' ? getStaffList([], keyword, true) : getAccountInfo([keyword], active.value)
const optionValue = (res: any) => (source.value === 'user' ? res.customerNumber : res.value)
const getSelectOption = (searchValue: string) => {
  if (searchValue) {
    searchStaff(searchValue).then((resp) => {
      staffList.value.length = 0
      resp.payload.forEach((res: any) => {
        staffList.value.push({
          value: optionValue(res),
          label: res.deptName ? res.label + '(' + res.deptName + ')' : res.label,
          avatar: res.pictureLink,
          name: res.label,
          deptName: res.deptName
        })
      })
    })
  }
}
watch(
  () => modelValue.value,
  () => {
    if (labelInValue.value) {
      if (modelValue.value?.value) {
        searchStaff(modelValue.value.value).then((resp) => {
          staffList.value.length = 0
          resp.payload.forEach((res: any) => {
            selectUserValue.value.value = optionValue(res)
            selectUserValue.value.label = res.label
            emit('update:modelValue', selectUserValue.value)
          })
        })
      }
    } else {
      if (modelValue.value) {
        searchStaff(modelValue.value).then((resp) => {
          staffList.value.length = 0
          resp.payload.forEach((res: any) => {
            selectUserValue.value.value = optionValue(res)
            selectUserValue.value.label = res.label
            emit('update:modelValue', optionValue(res))
          })
        })
      }
    }
  },
  {
    immediate: true
  }
)
watch(
  () => selectUserValue.value,
  () => {
    if(labelInValue.value) {
      emit('update:modelValue', selectUserValue.value)
    } else {
      emit('update:modelValue', selectUserValue.value.value)
    }
    emit('change', selectUserValue.value)

  }
)
onMounted(() => {

})
</script>

<style lang="less" scoped>
.avatar {
  display: inline-block;
  height: 38px;
  width: 30px;
}
</style>