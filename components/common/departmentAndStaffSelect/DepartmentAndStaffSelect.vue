<template>
  <div :style="{flexDirection, height: wrapperHeight, marginBottom}" class="department-staff-form-wrapper">
    <div v-if="showDept">
      <a-form-item :label="departmentInputLabel" :style="{width: inputWidth}">
        <a-cascader
          v-model:value="departmentListValue"
          :options="departmentListOption"
          :show-search="{ cascaderFilter }"
          :showSearch="true"
          max-tag-count="responsive"
          multiple
          placeholder="请选择公司部门"
          @change="selectDepartment">
          <template #tagRender="data">
            <a-tag :key="data.value" color="blue">{{ data.label }}</a-tag>
          </template>
        </a-cascader>
      </a-form-item>
    </div>
    <a-form-item :label="staffInputLabel" :style="{width: inputWidth}">
      <a-select
        ref="selectUserRef"
        v-model:value="staffListValue"
        :max-tag-count="3"
        :options="staffListOption"
        :virtual="false"
        allowClear
        labelInValue
        mode="multiple"
        optionFilterProp="label"
        placeholder="请选择职工"
        @blur="handleBlur"
        @change="handleStaffChange"
        @search="handleInputChange">
        <template #option="{label, value}">
          <img v-lazy="staffAvatar(staffId2AvatarMap[value])" alt="头像" class="avatar" />
          {{ label }}
        </template>
        <template v-if="isMultiple" #dropdownRender="{ menuNode: menu }">
          <VNodes :vnodes="menu" />
          <a-divider style="margin: 4px 0" />
          <div class="staff-select-operation-btn-list" @mousedown="e => e.preventDefault()">
            <a-button class="confirm-btn" size="small" @click="closeSelectBox">确定</a-button>
            <a-button size="small" type="primary" @click="selectAllStaff">全选</a-button>
            <a-button size="small" @click="invertCurrentStaff">反选</a-button>
            <a-button danger size="small" @click="clearAllSelectStaff">清空</a-button>
          </div>
        </template>
      </a-select>
    </a-form-item>
  </div>
</template>

<script lang="ts">
export default defineComponent({
  components: {
    VNodes: (_, {attrs}) => attrs.vnodes
  }
})
</script>

<script lang="ts" setup>
import _ from "lodash"
import {getDepartmentTree, getStaffList} from "./api"
import {ShowSearchType} from "ant-design-vue/es/vc-cascader"
import {StaffBaseSelectArrayType, ValueLabelArray} from "@/framework/utils/type"
import {getCascaderList} from "../utils"
import {QUERY_INTERVAL} from "@/framework/utils/constant"
import getImgUrl from "@/framework/assets/imgs/getImgUrl"


const defaultAvatar = getImgUrl('defaultAvatar.png')
const staffAvatar = (imgUrl: string) => {
  if (!imgUrl || imgUrl.indexOf('90') > -1) return defaultAvatar
  else return imgUrl
}

// 只有LayoutModeType为horizontal时，width才会生效；
//    LayoutModeType为vertical时，   width为100%
type LayoutModeType = 'horizontal' | 'vertical'
const props = withDefaults(defineProps<{
  width?: number,
  layoutMode?: LayoutModeType,
  staffListValue: ValueLabelArray,
  departmentListValue?: Array<string>,
  isMultiple?: boolean,
  showDept?: boolean
}>(), {
  isMultiple: true,
  showDept: true
})

const {layoutMode, width, isMultiple, showDept} = toRefs(props)
const emit = defineEmits(['update:staffListValue', 'update:departmentListValue', 'onChange'])

// 组件的样式配置
const isHorizontal = layoutMode && layoutMode.value === 'horizontal'
const flexDirection = computed(() => isHorizontal ? 'row' : 'column')
const wrapperHeight = computed(() => isHorizontal ? '44px' : '88px')
const marginBottom = computed(() => isHorizontal ? '0' : '24px')
const inputWidth = computed(() => {
  if (!isHorizontal) return '100%'
  if (width && showDept.value) return 'calc(50% - 7px)'
  return '200px'
})

const departmentInputLabel = computed(() => (isHorizontal ? '' : '公司部门') as any)
const staffInputLabel = computed(() => (isHorizontal ? '' : '职工姓名') as any)

// 级联选择器（部门选择）部分的代码
let departmentList: Array<string> = []
let departmentListValue = ref<Array<string>>([])
let departmentListOption = ref<ValueLabelArray>()

showDept && showDept.value && getDepartmentTree().then(res => departmentListOption.value = res.payload)

const selectDepartment = () => {
  emit('update:departmentListValue', departmentListValue.value)
  departmentList = getCascaderList(departmentListValue, departmentListOption).map(item => item.value)
  clearAllSelectStaff() // 重新选择部门后，应清空职工姓名的select
}
const cascaderFilter: ShowSearchType['filter'] = (inputValue, path) =>
    path.some(option => option.label.toLowerCase().indexOf(inputValue.toLowerCase()) > -1)


// 多选（职工选择）部分的代码
let selectUserRef = ref()
let staffListOption = ref<StaffBaseSelectArrayType>([])
const staffListValue = ref<StaffBaseSelectArrayType>([])
let staffId2AvatarMap: { [key: string]: string } = {}
// 职工姓名的全选（“全选” 按钮对应的点击事件）
const selectAllStaff = () => {
  staffListValue.value = staffListOption.value
  handleStaffChange()
}
// 职工姓名的反向选择（“反选” 按钮对应的点击事件）
const invertCurrentStaff = () => {
  const staffListValueSet = new Set(staffListValue.value.map(option => option.value))
  staffListValue.value = staffListOption.value.filter(option => !staffListValueSet.has(option.value))
  handleStaffChange()
}
// 职工姓名的清空（“清空” 按钮对应的点击事件）
const clearAllSelectStaff = () => {
  staffListValue.value = []
  handleStaffChange()
  queryStaffList(departmentList, '')
}
const queryStaffList = (deptIdList: Array<string>, name = '') =>
    getStaffList(deptIdList, name).then(res => {
      staffListOption.value = res.payload
      staffListOption.value.forEach(option => {
        option.label = option.label + '(' + option.deptName + ')'
        staffId2AvatarMap[option.value] = option.pictureLink || ''
      })
    })
// 监听用户对职工名称的查询输入，以实时获取对应的select的options
const handleInputChange = _.debounce((value: string) => queryStaffList(departmentList, value), QUERY_INTERVAL)
// 当职工名称对应的select发生改变，向外部更新staffListValue
const handleStaffChange = (option?: any[]) => {
  if (isMultiple.value) emit('update:staffListValue', staffListValue.value)
  else if (option && Array.isArray(option)) {
    if (option.length === 0) staffListValue.value = []
    else staffListValue.value = [{...option[option.length - 1]}]
    emit('update:staffListValue', staffListValue.value)
  }
  emit('onChange', {
    staffListValue: staffListValue.value
  })
}

const handleBlur = () => queryStaffList(departmentList, '').then(closeSelectBox)

const closeSelectBox = () => selectUserRef.value.blur()

document.addEventListener("error", function (e: any) {
  const elem = e.target
  if (elem.tagName.toLowerCase() === 'img') elem.src = defaultAvatar
}, true /*指定事件处理函数在捕获阶段执行*/)

watch(() => props.staffListValue, value => staffListValue.value = value, {immediate: true})
watch(() => props.departmentListValue, value => departmentListValue && value && (departmentListValue.value = value), {immediate: true})


</script>


<style scoped>
.department-staff-form-wrapper {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 100%;
  margin-right: 3px;
}

.staff-select-operation-btn-list {
  width: 100%;
  display: flex;
  justify-content: space-evenly;
}

.avatar {
  display: inline-block;
  height: 38px;
  width: 30px;
}

.confirm-btn {
  color: #fff;
  background-color: #16BAAA;
  border: 1px solid #16BAAA;
}

.confirm-btn:hover {
  border: 1px solid #16BAAA;
}
</style>
