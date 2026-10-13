<template>
  <!-- 框架「设置个人信息」弹层（从 TopHeader 抽出的共用件）：昵称/姓名/性别/头像，
       保存走 updateUserInfo → getUserInfo 回填 userStore。业务顶栏（如 InkHub 顶栏齿轮）
       复用本件；入口是否显示由宿主按 VITE_ssoDomain 闸门决定，本件不管入口 -->
  <a-modal
    :open="open"
    cancel-text="取消"
    ok-text="确认"
    title="设置个人信息"
    @cancel="emit('update:open', false)"
    @ok="updateInfo"
  >
    <a-form
      :label-col="{ style: { width: '100px' } }"
      :model="form"
      :wrapper-col="{ span: 16 }"
      layout="horizontal"
    >
      <a-form-item
        label="昵称"
        name="nickName"
      >
        <a-input
          v-model:value="form.nickName"
          autocomplete="off"
          placeholder="请输入昵称"
        />
      </a-form-item>
      <a-form-item
        label="姓名"
        name="name"
      >
        <a-input
          v-model:value="form.name"
          autocomplete="off"
          placeholder="请输入姓名"
        />
      </a-form-item>
      <a-form-item
        label="性别"
        name="sex"
      >
        <a-select
          v-model:value="form.sex"
          placeholder="请选择性别"
        >
          <a-select-option
            v-for="item in genderOptionList"
            :key="item.value"
            :value="item.value"
          >
            {{ item.label }}
          </a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item
        label="头像"
        name="avatar"
      >
        <multimedia
          v-model="form.avatar"
          delete-able
          upload-able
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script lang="ts" setup>
import { onMounted, reactive, ref, watch } from 'vue'

import { getUserInfo, updateUserInfo } from '@/framework/apis/login/login'
import pinia from '@/framework/store'
import { dictStore } from '@/framework/store/common'
import { useUserStore } from '@/framework/store/user'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>()

const userStore = useUserStore(pinia)
const genderOptionList = ref<Array<{ value: string, label: string }>>([])

const form = reactive({
  nickName: userStore.nickName,
  name: userStore.name,
  email: userStore.email,
  sex: userStore.sex,
  avatar: userStore.avatar
})

// 每次打开都从 userStore 现读：抽成共用件后宿主可能多处开关，避免陈旧回显
watch(() => props.open, v => {
  if (!v) return
  form.nickName = userStore.nickName
  form.name = userStore.name
  form.email = userStore.email
  form.sex = userStore.sex
  form.avatar = userStore.avatar
})

const updateInfo = () => {
  updateUserInfo(form).then(() => getUserInfo().then(res => {
    const data = res.payload
    Object.keys(data).forEach((key: string) => {
      if (data[key]) { // @ts-ignore
        userStore[key] = data[key]
      }
    })
    emit('update:open', false)
  }))
}

onMounted(() => {
  dictStore().getDict('GENDER_DICT').then(res => { genderOptionList.value = res })
})
</script>
