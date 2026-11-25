<template>
  <a-popconfirm
    placement="left"
    :ok-button-props="{danger: true}"
    @confirm="handleDeleteEvent"
  >
    <template #icon>
      <WarningFilled style="color: red;font-size: 21px;" />
    </template>
    <template #title>
      <div class="pop-confirm-title">
        {{ popContent }}
      </div>
    </template>
    <a-button
      :class="type ? '' : 'item-delete-btn'"
      :size="size"
      :type="type"
      danger
    >
      {{ btnContent }}
    </a-button>
  </a-popconfirm>
</template>

<script lang="ts" setup>
import { WarningFilled } from '@ant-design/icons-vue'
import { Ref } from 'vue'

// size/type 直接透传给 a-button, 用其枚举类型(宽 string 不被库接受)
const props = defineProps<{
  size?: 'small' | 'middle' | 'large'
  btnContent?: string
  popContent?: string
  type?: 'default' | 'primary' | 'ghost' | 'dashed' | 'link' | 'text'
}>()
// 局部副本沿用 props 的枚举类型(声明成宽 string 会让 a-button 的 size/type 类型不通过)
const size = ref<'small' | 'middle' | 'large'>(props.size || 'small')
const btnContent: Ref<string> = ref(props.btnContent || '删除')
const popContent: Ref<string> = ref(props.popContent || '确定要删除这条数据吗？')
const type = ref<'default' | 'primary' | 'ghost' | 'dashed' | 'link' | 'text'>(props.type || 'primary')
const emit = defineEmits(['deleteEvent'])
const handleDeleteEvent = () => emit('deleteEvent')
</script>

<style scoped>

.pop-confirm-title{
  line-height: 25px;
}

.item-delete-btn {
  background-color: #FF5722;
  border-color: #FF5722;
}

</style>
