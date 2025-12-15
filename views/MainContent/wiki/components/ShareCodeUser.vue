<script setup lang="ts">
/**
 * 分享码使用组件
 * 用户可以输入分享码和密码获取页面权限
 */
import { message } from 'ant-design-vue'

import { useShareCode } from '../api'
import type { ShareCodeUseParams } from '../types'

interface Props {
  visible: boolean
}

defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'success'): void
}>()

// ========== 状态管理 ==========

/** 分享码 */
const shareCode = ref('')
/** 密码 */
const password = ref('')
/** 使用中状态 */
const using = ref(false)

// ========== 方法 ==========

/** 监听输入框粘贴事件 */
const handlePaste = (e: ClipboardEvent) => {
  const pastedText = e.clipboardData?.getData('text') || ''
  
  // 尝试解析格式：分享码|密码
  if (pastedText.includes('|')) {
    e.preventDefault() // 阻止默认粘贴行为
    const parts = pastedText.split('|')
    if (parts.length === 2) {
      shareCode.value = parts[0].trim()
      password.value = parts[1].trim()
      message.success('已自动填入分享码和密码')
    }
  }
}

/** 使用分享码 */
const handleUse = async () => {
  // 验证输入
  if (!shareCode.value || shareCode.value.trim() === '') {
    message.warning('请输入分享码')
    return
  }
  if (!password.value || password.value.trim() === '') {
    message.warning('请输入密码')
    return
  }
  if (password.value.length !== 4 || !/^\d{4}$/.test(password.value)) {
    message.warning('密码必须是4位数字')
    return
  }

  using.value = true
  try {
    const params: ShareCodeUseParams = {
      shareCode: shareCode.value.trim(),
      password: password.value
    }
    await useShareCode(params)
    emit('success')
    handleClose()
  } catch (error: any) {

  } finally {
    using.value = false
  }
}

/** 关闭弹窗 */
const handleClose = () => {
  emit('update:visible', false)
  // 延迟重置状态
  setTimeout(() => {
    shareCode.value = ''
    password.value = ''
  }, 300)
}
</script>

<template>
  <a-modal
    :open="visible"
    title="使用分享码"
    :confirm-loading="using"
    width="450px"
    @ok="handleUse"
    @cancel="handleClose"
  >
    <a-form layout="vertical">
      <a-form-item label="分享码">
        <a-input
          v-model:value="shareCode"
          placeholder="请输入分享码，或粘贴分享码|密码"
          :maxlength="50"
          @paste="handlePaste"
        />
      </a-form-item>

      <a-form-item label="访问密码(4位数字)">
        <a-input-password
          v-model:value="password"
          placeholder="请输入4位数字密码"
          :maxlength="4"
        />
      </a-form-item>

      <a-alert
        message="提示：可以直接粘贴'分享码|密码'格式，系统会自动填入两个输入框"
        type="info"
        show-icon
      />
    </a-form>
  </a-modal>
</template>

<style scoped lang="less">
</style>
