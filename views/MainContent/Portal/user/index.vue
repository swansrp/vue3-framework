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
import { ExclamationCircleOutlined } from '@ant-design/icons-vue'
import { Modal } from 'ant-design-vue'
import { createVNode, Ref } from 'vue'

import { passwordReset, userEnable, userDisable } from '@/framework/apis/admin/user'
import { ColumnType, TableConfigType } from '@/framework/components/common/Portal/type'

const userTable: Ref = ref(null)

const resetPassword = (portalConfig: TableConfigType, column: ColumnType, record: any) => {
  Modal.confirm({
    title: '注意',
    icon: createVNode(ExclamationCircleOutlined),
    content: createVNode('div', { style: 'color:red;' }, '重置密码，下次登录时会提示该用户设置密码。'),
    onOk() {
      passwordReset(record.customerNumber)
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
