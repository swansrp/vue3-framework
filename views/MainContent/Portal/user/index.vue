<template>
  <portal
    ref="userTable"
    table-id="AcUser"
    :action-width="180"
  >
    <template #action="{ portalConfig, column, record }">
      <div style="display: flex">
        <a-button
          type="link"
          @click="resetPassword(portalConfig, column, record)"
        >
          重置密码
        </a-button>
        <a-button
          v-if="record.status !== '1'"
          type="link"
          @click="enable(portalConfig, column, record)"
        >
          生效
        </a-button>
        <a-button
          v-if="record.status === '1'"
          type="link"
          @click="disable(portalConfig, column, record)"
        >
          禁用
        </a-button>
      </div>
    </template>
  </portal>
</template>

<script lang="ts" setup>
import { ExclamationCircleOutlined, CopyOutlined } from '@ant-design/icons-vue'
import { Modal, message, Button } from 'ant-design-vue'
import { createVNode, Ref, h } from 'vue'

import { passwordReset, userEnable, userDisable } from '@/framework/apis/admin/user'
import { ColumnType, TableConfigType } from '@/framework/components/common/Portal/type'

const userTable: Ref = ref(null)

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).then(() => {
    message.success('密码已复制到剪贴板')
  }).catch(() => {
    message.error('复制失败，请手动复制')
  })
}

const resetPassword = (portalConfig: TableConfigType, column: ColumnType, record: any) => {
  Modal.confirm({
    title: '注意',
    icon: createVNode(ExclamationCircleOutlined),
    content: createVNode('div', { style: 'color:red;' }, '重置密码，下次登录时会提示该用户设置密码。'),
    async onOk() {
      try {
        const resp = await passwordReset(record.customerNumber)
        if (resp?.payload) {
          const tempPassword = resp.payload
          
          Modal.warning({
            title: '密码重置成功',
            width: 500,
            content: h('div', {
              style: 'padding: 20px 0;'
            }, [
              h('div', {
                style: 'margin-bottom: 16px; font-size: 14px; line-height: 1.6;'
              }, [
                h('div', { style: 'color: #ff4d4f; font-weight: 600; margin-bottom: 8px;' }, '⚠️ 重要提示'),
                h('div', { style: 'color: #595959;' }, '临时密码仅此一次显示，请立即复制并妥善保存。'),
                h('div', { style: 'color: #595959;' }, '如果忘记密码，需要重新进行密码重置。')
              ]),
              h('div', {
                style: 'background: #f5f5f5; border: 1px solid #d9d9d9; border-radius: 4px; padding: 16px; margin-bottom: 20px; position: relative;'
              }, [
                h('div', { style: 'color: #8c8c8c; font-size: 12px; margin-bottom: 8px;' }, '临时密码：'),
                h('div', {
                  style: 'font-size: 18px; font-weight: 600; color: #1890ff; font-family: monospace; word-break: break-all; margin-bottom: 12px;'
                }, tempPassword),
                h(Button, {
                  type: 'primary',
                  icon: h(CopyOutlined),
                  size: 'large',
                  block: true,
                  onClick: () => copyToClipboard(tempPassword),
                  style: 'height: 48px; font-size: 16px; font-weight: 600;'
                }, { default: () => '复制密码' })
              ])
            ]),
            okText: '我已保存',
            onOk() {
              userTable.value?.queryData()
            }
          })
        }
      } catch (error) {
        console.error('密码重置失败:', error)
      }
    },
    onCancel() {

    }
  })
}
const enable = (portalConfig: TableConfigType, column: ColumnType, record: any) => {
  userEnable(record.customerNumber).then(userTable.value.queryData)
}
const disable = (portalConfig: TableConfigType, column: ColumnType, record: any) => {
  userDisable(record.customerNumber).then(userTable.value.queryData)

}
</script>

<style scoped>

</style>
