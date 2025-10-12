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
import { getAccountInfo } from '@/framework/components/common/departmentAndStaffSelect/api'
import { QUERY_INTERVAL } from '@/framework/utils/constant'

const props = withDefaults(
  defineProps<{
    modelValue: any,
    width?: number,
    placeholder?: string,
    disabled?: boolean,
    active?: boolean,
    labelInValue?: boolean
  }>(),
  {
    modelValue: '',
    width: 350,
    placeholder: '请搜索员工信息',
    disabled: false,
    active: true,
    labelInValue: false
  }
)
const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
  (e: 'change', value: any): void
}>()
const { modelValue, width, placeholder, active, labelInValue } = toRefs(props)
const selectUserValue = ref({ value: '', label: '' } as any)
const staffList = ref([] as Array<any>)
const handleInputChange = _.debounce((value: string) => getSelectOption(value), QUERY_INTERVAL)
const defaultAvatar = getImgUrl('defaultAvatar.png')
const staffAvatar = (imgUrl: string) => {
  if (!imgUrl || imgUrl.indexOf('90') > -1) return defaultAvatar
  else return imgUrl
}
const getSelectOption = (searchValue: string) => {
  if (searchValue) {
    getAccountInfo([searchValue], active.value).then((resp) => {
      staffList.value.length = 0
      resp.payload.forEach((res: any) => {
        staffList.value.push({
          value: res.value,
          label: res.label + '(' + res.deptName + ')',
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
      if (modelValue.value.value) {
        getAccountInfo([modelValue.value.value], active.value).then((resp) => {
          staffList.value.length = 0
          resp.payload.forEach((res: any) => {
            selectUserValue.value.value = res.value
            selectUserValue.value.label = res.label
            emit('update:modelValue', selectUserValue.value)
          })
        })
      }
    } else {
      if (modelValue.value) {
        getAccountInfo([modelValue.value], active.value).then((resp) => {
          staffList.value.length = 0
          resp.payload.forEach((res: any) => {
            selectUserValue.value.value = res.value
            selectUserValue.value.label = res.label
            emit('update:modelValue', res.value)
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