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

const props = defineProps<{size?: string, btnContent?: string, popContent?: string, type?: string}>()
const size: Ref<string> = ref(props.size || 'small')
const btnContent: Ref<string> = ref(props.btnContent || '删除')
const popContent: Ref<string> = ref(props.popContent || '确定要删除这条数据吗？')
const type: Ref<string> = ref(props.type || 'primary')
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
