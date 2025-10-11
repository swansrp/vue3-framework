<template>
  <template
    v-for="(tag, index) in data"
    :key="tag"
  >
    <div class="block-message-tag">
      <marquee
        :content="tag"
        :width="width"
      />
      <CloseOutlined @click="handleTagClose(index)" />
    </div>
  </template>
  <a-input
    v-if="inputVisible"
    ref="inputRef"
    v-model:value="inputValue"
    :style="{ width: parseCssValue(width), marginTop: '2px' }"
    type="text"
    @blur="handleInputConfirm"
    @keyup.enter="handleInputConfirm"
  />
  <a-tag
    v-else
    style="background: #fff; margin-top:2px; border-style: dashed"
    @click="inputVisible = true"
  >
    <plus-outlined />
    {{ '添加' + title }}
  </a-tag>
</template>

<script lang="ts" setup>
import { CloseOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { Ref } from 'vue'

import { localStorageMethods, parseCssValue } from '@/framework/utils/common'

const props = withDefaults(
  defineProps<{
    title: string,
    width?: string | number,
    localStorageKey: string
  }>(),
  {
    width: '200px',
    modelValue: ''
  }
)
const { title } = toRefs(props)
const data: Ref<Array<string>> = ref(JSON.parse(localStorageMethods.getLocalStorage(props.localStorageKey, JSON.stringify([]))))
watch(
  () => data.value,
  () => {
    localStorageMethods.setLocalStorage(props.localStorageKey, JSON.stringify(data.value))
    emit('change')
  },
  {
    deep: true
  }
)
const emit = defineEmits<{
  (e: 'change'): void

}>()
const inputVisible = ref(false)
const inputValue = ref('')
const handleTagClose = (index: number) => {
  data.value.splice(index, 1)
}
const handleInputConfirm = () => {
  if (isNotEmpty(inputValue.value)) {
    data.value.push(inputValue.value)
  }
  inputValue.value = ''
  inputVisible.value = false

}
onMounted(() => {
})
</script>

<style lang="less" scoped>
.block-message-tag {
  display: flex;
  justify-content: space-between;
  margin-top: 2px;
  width: 200px;
  border: 1px dot-dash;
  border-radius: 4px;
  padding: 2px 4px;
  background-color: #f0f0f0;
}
</style>