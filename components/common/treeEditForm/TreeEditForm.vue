<template>
  <a-form :model="formState" :label-col="{ span: 6 }" :wrapper-col="{ span: 14 }" @finish="onFinish" ref="formRef">
    <a-form-item label="菜单名称" name="title" :rules="[{ required: true, message: '请输入菜单名称!' }]">
      <a-input v-model:value="formState['title']" />
    </a-form-item>
    <a-form-item label="菜单项图标" name="icon" :rules="[{ required: true, message: '请选择一个菜单图标!' }]">
      <a-input v-model:value="formState['icon']" @click="selectMenuIcon" readOnly class="icon-input" ref="iconInput">
        <template #prefix v-if="formState['icon'].length">
          <Icon :icon="formState['icon']" />
        </template>
      </a-input>
    </a-form-item>
    <a-form-item label="是否缓存" required>
      <a-switch v-model:checked="formState['isCache']" />
    </a-form-item>
    <a-form-item label="是否为外链" required>
      <a-switch v-model:checked="formState['isFrame']" />
    </a-form-item>
    <a-form-item label="路由路径" name="path">
      <a-input v-model:value="formState['path']" />
    </a-form-item>
    <a-form-item label="组件地址" name="component">
      <a-input v-model:value="formState['component']" />
    </a-form-item>
    <a-form-item label="路由参数">
      <a-input v-model:value="formState['query']" />
    </a-form-item>
    <a-form-item :wrapper-col="{ span: 14, offset: 6 }">
      <div class="form-button-list">
        <a-button @click="resetForm">清空</a-button>
        <a-button type="primary" html-type="submit">提交</a-button>
      </div>
    </a-form-item>
  </a-form>
  <icon-modal v-model:visible="visible" v-model:icon="formState['icon']" />
</template>

<script lang="ts" setup>
import {Ref} from "vue"
import {FormState, FormType} from "@/framework/components/common/treeEditForm/type"
import {addMainMenu, addSubMenu, updateMainMenu, updateSubMenu} from "@/framework/apis/admin/navEdit"
import {FormInstance} from "ant-design-vue"

const iconInput = ref()
const formRef = ref<FormInstance>()
let visible:Ref<boolean> = ref(false) //控制图标选择对话框的弹出

// formState：默认表单数据，因为编辑的时候需要展示已有信息， type：用于区别是目前表单应为编辑表单还是新增表单
// menuId: 菜单项Id，用于编辑Sub Menu和Main Menu菜单项和新增Sub Menu菜单项
const props = defineProps<{formState: FormState,type: FormType,  menuId?: number, grandId?: number|null}>()
let { formState, menuId, type, grandId } = toRefs(props)

// 从父组件中接收两个函数，以更新父组件中相关组件的更新
const updateMainTree = inject('updateMainTree') as () => void
const updateSubTree = inject('updateSubTree') as () => void

// Icon输入框的点击事件，调出IconModal对话框
const selectMenuIcon = () => visible.value = true

// 表单验证成功后的回调函数，整理数据后发送网络请求，并更新父组件中的某些组件
const onFinish = () => {
  if (type.value === 'edit' && menuId && typeof menuId.value === 'number') {
    const data = {...formState.value, menuId: menuId.value}
    data['isCache'] = +data['isCache']
    data['isFrame'] = +data['isFrame']
    // grandId 有值，说明操作的是SubMenu，则需要更新updateSubTree；否则，需要更新updateMainTree
    if (grandId && grandId.value) updateSubMenu(data).then(()=> {updateSubTree()})
    else updateMainMenu(data).then(()=> updateMainTree())
  } else if (type.value === 'add') {
    const data = toRaw(formState.value)
    // grandId 有值，说明当前需要新增SubMenu菜单，需要在发送请求的时候带上grandId
    if(grandId && typeof grandId.value === 'number') data['grandId'] = grandId.value
    data['isCache'] = +data['isCache']
    data['isFrame'] = +data['isFrame']
    if (grandId && grandId.value) addSubMenu(data).then(() => updateSubTree())
    else addMainMenu(data).then(() => updateMainTree())
  }
}

// 清空表单内容
const resetForm = () => formRef.value!.resetFields()

// 手动触发表单验证，只用于处理Icon Input中的图标选择后，更新form的更新状态
watch(() => formState.value.icon, () => {
  // 因为js为input赋值的时候，不会触发input的change等方法，所以需要手动定义一个change事件，并在对应的input元素上触发
  // 目的是更新form的验证状态，antd是根据input的change事件，更新的表单验证状态
  const changeEvent = new Event('change')
  iconInput.value.input.dispatchEvent(changeEvent)
})


</script>
<style>

.icon-input, .icon-input input.ant-input {
  cursor: pointer!important;
}
.form-button-list {
  display: flex;
  justify-content: space-between;
}
.form-button-list button {
  width: 45%;
}
</style>
