<template>
  <a-form
    ref="formRef" :label-col="{ span: 6 }" :model="permissionForm"
    :wrapper-col="{ span: 14 }" @finish="onEditFinish">
    <a-form-item :rules="[{ required: true, message: '请为用户选择一个权限!' }]" label="拥有权限" name="dataScope">
      <a-select v-model:value="permissionForm['dataScope']">
        <a-select-option v-for="item in permissionList" :key="item.value" :value="item.value">{{ item.label }}</a-select-option>
      </a-select>
    </a-form-item>
    <a-form-item :wrapper-col="{ span: 14, offset: 6 }">
      <div class="form-button-list">
        <a-button @click="resetForm()">清空</a-button>
        <a-button html-type="submit" type="primary">提交</a-button>
      </div>
    </a-form-item>
  </a-form>
</template>

<script lang="ts" setup>
import {clearFromField} from "@/framework/utils/common";
import {Ref} from "vue"
import {getDictListByDictName} from "@/framework/apis/common/common";
import {ValueLabelArray} from "@/framework/utils/type";

let formRef = ref()
const emit = defineEmits(['callback'])
const props = defineProps<{ dataScope: string, permissionList: ValueLabelArray }>()
const permissionList = ref(props.permissionList)

getDictListByDictName('DATA_PERMIT_SCOPE_DICT', permissionList)
interface permissionFormType { dataScope: string}

const permissionForm:Ref<permissionFormType> = ref({dataScope: props.dataScope})
const onEditFinish = () => emit('callback', permissionForm.value.dataScope)
const resetForm = () => clearFromField(permissionForm, formRef)

</script>

<style scoped>
.form-button-list {
    display: flex;
    justify-content: space-between;
}

.form-button-list button {
    width: 45%;
}
</style>
