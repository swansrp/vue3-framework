<template>
  <div
    :style="{flexDirection, height: wrapperHeight, marginBottom}"
    class="department-staff-form-wrapper"
  >
    <div v-if="showDept">
      <a-form-item :label="departmentInputLabel">
        <a-cascader
          v-model:value="localDepartmentListValue"
          :style="{width: inputWidth}"
          :options="departmentListOption"
          :show-search="{ cascaderFilter }"
          max-tag-count="responsive"
          multiple
          placeholder="请选择公司部门"
          @change="selectDepartment"
        >
          <template #tagRender="data">
            <a-tag
              :key="data.value"
              color="blue"
            >
              {{ data.label }}
            </a-tag>
          </template>
        </a-cascader>
      </a-form-item>
    </div>
    <a-form-item :label="staffInputLabel">
      <a-select
        ref="selectUserRef"
        v-model:value="localStaffListValue"
        :style="{width: inputWidth}"
        :max-tag-count="staffMaxTagCount"
        :options="staffListOption"
        :max-tag-text-length="10"
        :virtual="false"
        :filter-option="false"
        allow-clear
        label-in-value
        mode="multiple"
        placeholder="请选择职工"
        show-search
        @blur="handleBlur"
        @change="handleStaffChange"
        @search="handleInputChange"
      >
        <template #option="{label, value}">
          <img
            v-lazy="staffAvatar(staffId2AvatarMap[value])"
            alt="头像"
            class="avatar"
          />
          {{ label }}
        </template>
        <template
          v-if="isMultiple"
          #dropdownRender="{ menuNode: menu }"
        >
          <VNodes :vnodes="menu" />
          <a-divider style="margin: 4px 0" />
          <div
            class="staff-select-operation-btn-list"
            @mousedown="e => e.preventDefault()"
          >
            <a-button
              class="confirm-btn"
              size="small"
              @click="closeSelectBox"
            >
              确定
            </a-button>
            <a-button
              size="small"
              type="primary"
              @click="selectAllStaff"
            >
              全选
            </a-button>
            <a-button
              size="small"
              @click="invertCurrentStaff"
            >
              反选
            </a-button>
            <a-button
              danger
              size="small"
              @click="clearAllSelectStaff"
            >
              清空
            </a-button>
          </div>
        </template>
      </a-select>
    </a-form-item>
  </div>
</template>

<script lang="ts">
export default defineComponent({
  components: {
    VNodes: (_, { attrs }) => attrs.vnodes
  }
})
</script>

<script lang="ts" setup>
import { ShowSearchType } from 'ant-design-vue/es/vc-cascader'
import _ from 'lodash'

import { getCascaderList } from '../utils'
import { getDepartmentTree, getStaffList } from './api'

import getImgUrl from '@/framework/assets/imgs/getImgUrl'
import { QUERY_INTERVAL } from '@/framework/utils/constant'
import { StaffBaseSelectArrayType, ValueLabelArray } from '@/framework/utils/type'


const defaultAvatar = getImgUrl('defaultAvatar.png')
const staffAvatar = (imgUrl: string) => {
  if (!imgUrl || imgUrl.indexOf('90') > -1) return defaultAvatar
  else return imgUrl
}

// 只有LayoutModeType为horizontal时，width才会生效；
//    LayoutModeType为vertical时，   width为100%
type LayoutModeType = 'horizontal' | 'vertical'
const props = withDefaults(defineProps<{
  width?: number, // 输入框的宽度
  layoutMode?: LayoutModeType, //布局模式， horizontal 为水平，即横向布局； vertical 为垂直，即纵向布局
  staffListValue: ValueLabelArray, // 绑定的员工列表，可以绑定到父组件的相关变量
  departmentListValue?: Array<string>, // 选择的部门列表，可以绑定到父组件的相关变量
  isMultiple?: boolean, // 是否开启职工的多选模式
  showDept?: boolean, // 是否展示部门选择框
  staffMaxTagCount?: number // 职工选择组件的最大展示数量
}>(), {
  isMultiple: true,
  showDept: true,
  staffMaxTagCount: 3
})

const { layoutMode, width, isMultiple, showDept, staffMaxTagCount } = toRefs(props)
const emit = defineEmits(['update:staffListValue', 'update:departmentListValue', 'onChange'])

// 组件的样式配置
const isHorizontal = layoutMode && layoutMode.value === 'horizontal'
const flexDirection = computed(() => isHorizontal ? 'row' : 'column')
const wrapperHeight = computed(() => isHorizontal ? '44px' : 'auto')
const marginBottom = computed(() => isHorizontal ? '0' : '12px')
const inputWidth = computed(() => {
  if (!isHorizontal) {
    if (width && width.value) return width.value + 'px'
    else return '100%'
  }
  if (width && showDept.value) return 'calc(50% - 7px)'
  if (width && width.value) return width.value + 'px'
  return '350px'
})

const departmentInputLabel = computed(() => (isHorizontal ? '' : '公司部门') as any)
const staffInputLabel = computed(() => (isHorizontal ? '' : '职工姓名') as any)

// 级联选择器（部门选择）部分的代码
let departmentList: Array<string> = []
let localDepartmentListValue = ref<Array<string>>([])
let departmentListOption = ref<ValueLabelArray>()

showDept && showDept.value && getDepartmentTree().then(res => departmentListOption.value = res.payload)

const selectDepartment = () => {
  emit('update:departmentListValue', localDepartmentListValue.value)
  departmentList = getCascaderList(localDepartmentListValue, departmentListOption).map(item => item.value)
  clearAllSelectStaff() // 重新选择部门后，应清空职工姓名的select
}
const cascaderFilter: ShowSearchType['filter'] = (inputValue, path) =>
    path.some(option => option.label.toLowerCase().indexOf(inputValue.toLowerCase()) > -1)


// 多选（职工选择）部分的代码
let selectUserRef = ref()
let staffListOption = ref<StaffBaseSelectArrayType>([])
const localStaffListValue = ref<StaffBaseSelectArrayType>([])
let staffId2AvatarMap: { [key: string]: string } = {}
// 职工姓名的全选（“全选” 按钮对应的点击事件）
const selectAllStaff = () => {
  localStaffListValue.value = staffListOption.value.map((item: any) => {
    item.option = _.cloneDeep(item)
    return item
  })
  handleStaffChange()
}
// 职工姓名的反向选择（“反选” 按钮对应的点击事件）
const invertCurrentStaff = () => {
  const staffListValueSet = new Set(localStaffListValue.value.map(item => item.value))
  localStaffListValue.value = staffListOption.value.filter(item => !staffListValueSet.has(item.value)).map((item: any) => {
    item.option = _.cloneDeep(item)
    return item
  })
  handleStaffChange()
}
// 职工姓名的清空（“清空” 按钮对应的点击事件）
const clearAllSelectStaff = () => {
  localStaffListValue.value = []
  handleStaffChange()
  queryStaffList(departmentList, '')
}
const queryStaffList = (deptIdList: Array<string>, name = '') =>
    getStaffList(deptIdList, name).then(res => {
      staffListOption.value = res.payload
      staffListOption.value.forEach(option => {
        if (option.deptName) {
          option.label = option.label + '(' + option.deptName + ')'
        }
        staffId2AvatarMap[option.value] = option.pictureLink || ''
      })
    })
// 监听用户对职工名称的查询输入，以实时获取对应的select的options
const handleInputChange = _.debounce((value: string) => queryStaffList(departmentList, value), QUERY_INTERVAL)

// 使用一个变量，存储曾经选择过的职工
// 之所以需要这样，是因为antd select 开启多选后，只会将最后一次选择的职工的option信息带出来
// 比如，我输入了孟，选择了某个姓孟的人，然后输入王，选择了一个姓王的人，那么我获取到的staffListValue，只能获取到姓王的人的option中的信息
const staffKey2StaffNumberMap:{[key: string]: string | number} = {}
// 当职工名称对应的select发生改变，向外部更新staffListValue
const handleStaffChange = (option?: any[]) => {
  if (isMultiple.value) {
    localStaffListValue.value.forEach((item: any) => item.option && (staffKey2StaffNumberMap[item.key || item.value] = _.cloneDeep(item.option)))
    let copyData = _.cloneDeep(localStaffListValue.value)
    copyData.forEach((item: any) => !item.option && (item.option = staffKey2StaffNumberMap[item.key || item.value]))
    emit('update:staffListValue', copyData)
  }
  else if (option && Array.isArray(option)) {
    if (option.length === 0) localStaffListValue.value = []
    else localStaffListValue.value = [{ ...option[option.length - 1] }]
    emit('update:staffListValue', localStaffListValue.value)
  }
  emit('onChange', {
    staffListValue: localStaffListValue.value
  })
}

const handleBlur = () => queryStaffList(departmentList, '').then(closeSelectBox)
const closeSelectBox = () => selectUserRef.value.blur()

document.addEventListener('error', function (e: any) {
  const elem = e.target
  if (elem.tagName.toLowerCase() === 'img') elem.src = defaultAvatar
}, true /*指定事件处理函数在捕获阶段执行*/)

watch(() => props.staffListValue, value => {
  localStaffListValue.value = value
  localStaffListValue.value.forEach((item: any) => item.option && (staffKey2StaffNumberMap[item.key || item.value] = _.cloneDeep(item.option)))
}, { immediate: true })
watch(() => props.departmentListValue, value => localDepartmentListValue && value && (localDepartmentListValue.value = value), { immediate: true })

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
  vertical-align: middle;
}

/* 选项容器样式 - 确保头像和文字垂直居中对齐 */
:deep(.ant-select-item-option-content) {
  display: flex;
  align-items: center;
  gap: 8px;
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
