<script setup lang="ts">
/**
 * 分享码生成器组件
 * 页面所有者可以生成分享码并配置权限、过期时间和密码
 */
import { message } from 'ant-design-vue'

import { generateShareCode } from '../api'
import type { ShareCodeGenerateParams, ShareCodeResponse } from '../types'

interface Props {
  visible: boolean
  pageId: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
}>()

// ========== 状态管理 ==========

/** 权限类型 */
const permission = ref('2')
/** 过期时间(小时) */
const expireHours = ref(24)
/** 密码 */
const password = ref('')
/** 生成中状态 */
const generating = ref(false)
/** 生成的分享码 */
const shareCodeResult = ref<ShareCodeResponse | null>(null)

// ========== 方法 ==========

/** 生成随机4位密码 */
const generateRandomPassword = () => {
  password.value = Math.floor(1000 + Math.random() * 9000).toString()
}

/** 生成分享码 */
const handleGenerate = async () => {
  // 验证密码
  if (!password.value || password.value.trim() === '') {
    message.warning('请输入4位密码')
    return
  }
  if (password.value.length !== 4 || !/^\d{4}$/.test(password.value)) {
    message.warning('密码必须是4位数字')
    return
  }

  generating.value = true
  try {
    const params: ShareCodeGenerateParams = {
      pageId: props.pageId,
      permission: permission.value,
      expiredSeconds: expireHours.value * 3600,
      password: password.value
    }
    const result = await generateShareCode(params)
    shareCodeResult.value = result
    message.success('分享码生成成功')
  } catch (error) {
    console.error('生成分享码失败:', error)
    message.error('生成分享码失败')
  } finally {
    generating.value = false
  }
}

/** 复制分享码和密码 */
const handleCopyShareCode = async () => {
  if (!shareCodeResult.value) return
  
  try {
    // 格式：分享码|密码（使用竖线分隔，方便解析）
    const copyText = `${shareCodeResult.value.shareCode}|${password.value}`
    await navigator.clipboard.writeText(copyText)
    message.success('分享码和密码已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    message.error('复制失败，请手动复制')
  }
}

/** 关闭弹窗 */
const handleClose = () => {
  emit('update:visible', false)
  // 延迟重置状态，避免关闭动画中看到数据变化
  setTimeout(() => {
    shareCodeResult.value = null
    permission.value = '2'
    expireHours.value = 24
    password.value = ''
  }, 300)
}

// ========== 监听 ==========

watch(() => props.visible, (newVal) => {
  if (newVal) {
    // 打开时自动生成随机密码
    generateRandomPassword()
  }
})
</script>

<template>
  <a-modal
    :open="visible"
    title="生成分享码"
    :confirm-loading="generating"
    width="500px"
    @ok="shareCodeResult ? handleClose() : handleGenerate()"
    @cancel="handleClose"
  >
    <template v-if="!shareCodeResult">
      <!-- 生成分享码表单 -->
      <a-form layout="vertical">
        <a-form-item label="权限类型">
          <a-radio-group v-model:value="permission">
            <a-radio value="1">
              只读权限
            </a-radio>
            <a-radio value="2">
              编辑权限
            </a-radio>
          </a-radio-group>
        </a-form-item>

        <a-form-item label="过期时间">
          <a-select
            v-model:value="expireHours"
            style="width: 100%"
          >
            <a-select-option :value="1">
              1小时
            </a-select-option>
            <a-select-option :value="6">
              6小时
            </a-select-option>
            <a-select-option :value="24">
              24小时
            </a-select-option>
            <a-select-option :value="72">
              3天
            </a-select-option>
            <a-select-option :value="168">
              7天
            </a-select-option>
            <a-select-option :value="720">
              30天
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="访问密码(4位数字)">
          <a-input
            v-model:value="password"
            placeholder="请输入4位数字密码"
            :maxlength="4"
            style="width: calc(100% - 100px); margin-right: 8px"
          />
          <a-button @click="generateRandomPassword">
            随机生成
          </a-button>
        </a-form-item>
      </a-form>
    </template>

    <template v-else>
      <!-- 显示生成结果 -->
      <a-result
        status="success"
        title="分享码生成成功"
      >
        <template #subTitle>
          <div style="margin-bottom: 16px;">
            分享码将于 <b>{{ shareCodeResult.expireAt }}</b> 过期
          </div>
        </template>
        <template #extra>
          <div style="text-align: left;">
            <a-form layout="vertical">
              <a-form-item label="分享码">
                <div style="display: flex; gap: 8px; align-items: center;">
                  <a-input
                    :value="shareCodeResult.shareCode"
                    readonly
                    style="flex: 1;"
                  />
                  <a-button
                    type="primary"
                    @click="handleCopyShareCode"
                  >
                    复制
                  </a-button>
                </div>
              </a-form-item>
              <a-form-item label="访问密码">
                <a-input
                  :value="password"
                  readonly
                />
              </a-form-item>
            </a-form>
            <a-alert
              message="请将分享码和密码发送给需要访问的人，对方可以直接粘贴使用"
              type="info"
              show-icon
            />
          </div>
        </template>
      </a-result>
    </template>

    <template #footer>
      <a-button
        v-if="!shareCodeResult"
        @click="handleClose"
      >
        取消
      </a-button>
      <a-button
        v-if="!shareCodeResult"
        type="primary"
        :loading="generating"
        @click="handleGenerate"
      >
        生成分享码
      </a-button>
      <a-button
        v-else
        type="primary"
        @click="handleClose"
      >
        完成
      </a-button>
    </template>
  </a-modal>
</template>

<style scoped lang="less">
:deep(.ant-result) {
  padding: 24px 0;
}
</style>
