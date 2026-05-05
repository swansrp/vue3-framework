<template>
  <div style="background:var(--bg-base);height: 100%;">
    <div class="notfound-wrapper">
      <div class="wscn-http404">
        <div class="pic-404">
          <img
            :src="img404"
            alt="404"
            class="pic-404__parent"
          />
          <img
            :src="img404Cloud"
            alt="404"
            class="pic-404__child left"
          />
          <img
            :src="img404Cloud"
            alt="404"
            class="pic-404__child mid"
          />
          <img
            :src="img404Cloud"
            alt="404"
            class="pic-404__child right"
          />
        </div>
        <div class="bullshit">
          <div class="bullshit__oops">
            {{ headerText }}
          </div>
          <div
            v-if="subHeaderText"
            class="bullshit__oops"
            style="font-size: 24px"
          >
            {{ subHeaderText }}
          </div>
          <div
            v-if="descriptionText"
            class="bullshit__info"
          >
            {{ descriptionText }}
          </div>
        </div>
      </div>

      <div class="actions-container">
        <!-- 无权限申请区域：状态为空（无权限） -->
        <div
          v-if="showNoPermissionAction"
          class="action-block"
        >
          <a-button
            type="primary"
            size="large"
            @click="openReasonModal"
          >
            申请权限
          </a-button>
        </div>

        <!-- 待审核区域 -->
        <div
          v-else-if="showPendingAction"
          class="action-block"
        >
          <a-button
            type="primary"
            :loading="loading"
            @click="fetchApplyStatus"
          >
            刷新状态
          </a-button>
        </div>

        <!-- 被拒绝区域 -->
        <div
          v-else-if="showRejectAction"
          class="action-block"
        >
          <a-alert
            type="error"
            show-icon
            closable
            :message="`拒绝理由：${applyRecord?.auditRemark || '无'}`"
            style="margin-bottom: 16px;"
          />
          <a-space>
            <a-button
              type="primary"
              @click="openReasonModal"
            >
              再次申请
            </a-button>
          </a-space>
        </div>

        <!-- 真的没有这个页面 - 返回首页 -->
        <div
          v-else-if="showNoPageAction"
          class="action-block"
        >
          <a-button
            type="primary"
            size="large"
            @click="goHome"
          >
            返回首页
          </a-button>
        </div>
      </div>
    </div>

    <a-modal
      v-model:open="reasonModalVisible"
      title="填写申请理由"
      :confirm-loading="submitLoading"
      @ok="handleSubmit"
    >
      <a-textarea
        v-model:value="reason"
        :rows="4"
        placeholder="请简要说明申请原因"
      />
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
import { message } from 'ant-design-vue'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getMyApplyList, submitPermitApply } from '@/framework/apis/admin/permitApply'
import img404 from '@/framework/assets/imgs/404_images/404.png'
import img404Cloud from '@/framework/assets/imgs/404_images/404_cloud.png'
import { useUserStore } from '@/framework/store/user'

interface PermitApplyVO {
  status?: string
  auditRemark?: string
}

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { customerNumber } = storeToRefs(userStore)

const loading = ref(false)
const submitLoading = ref(false)
const fetched = ref(false)
const applyRecord = ref<PermitApplyVO | null>(null)
const reason = ref('')
const reasonModalVisible = ref(false)
const targetUrl = computed(() => route.fullPath)

const hasLogin = computed(() => !!customerNumber.value)

// 页面文案
const headerText = computed(() => {
  if (!hasLogin.value) return '您所访问的页面不存在'
  if (!fetched.value) return '正在加载...'
  if (applyRecord.value === null) return '您所访问的页面不存在'
  if (applyRecord.value.status == null) return '您没有权限访问此页面'
  if (applyRecord.value.status === '1') return '您还没有权限访问此页面'
  if (applyRecord.value.status === '2') return '您还没有权限访问此页面'
  if (applyRecord.value.status === '3') return '此页面权限申请已通过'
  return '出错啦'
})

const subHeaderText = computed(() => {
  if (!hasLogin.value || applyRecord.value === null) return ''
  if (applyRecord.value.status == null) return '如需访问此页面,请申请权限'
  if (applyRecord.value.status == '1') return '您的权限申请已提交，请等待审核'
  if (applyRecord.value.status == '3') return '请刷新页面以访问此页面'

  return ''
})

const descriptionText = computed(() => {
  if (!hasLogin.value || applyRecord.value === null) return '请检查输入的网址是否正确'
  if (applyRecord.value.status == null) return ''
  return ''
})

// 显示不同的操作区域
const showNoPermissionAction = computed(
  () => hasLogin.value && fetched.value && applyRecord.value && applyRecord.value.status == null
)
const showPendingAction = computed(
  () => hasLogin.value && fetched.value && applyRecord.value?.status === '1'
)
const showRejectAction = computed(
  () => hasLogin.value && fetched.value && applyRecord.value?.status === '2'
)
const showNoPageAction = computed(
  () => hasLogin.value && fetched.value && applyRecord.value === null
)

const fetchApplyStatus = async () => {
  if (!customerNumber.value) return
  loading.value = true
  try {
    const resp = await getMyApplyList(customerNumber.value, targetUrl.value)

    applyRecord.value = resp?.payload ?? null

    if (applyRecord.value?.status === '3') {
      message.success('权限已通过，请刷新页面以访问此页面')
    }
  } catch (error) {
    console.error('查询申请记录失败:', error)
    message.error('查询申请记录失败')
  } finally {
    loading.value = false
    fetched.value = true
  }
}

const openReasonModal = () => {
  reason.value = ''
  reasonModalVisible.value = true
}

const handleSubmit = async () => {
  if (!customerNumber.value) {
    message.warning('请先登录后再申请权限')
    return
  }
  const trimmedReason = reason.value.trim()
  if (!trimmedReason) {
    message.warning('请输入申请理由')
    return
  }
  submitLoading.value = true
  try {
    await submitPermitApply(targetUrl.value, trimmedReason)
    message.success('申请已提交')
    reasonModalVisible.value = false
    await fetchApplyStatus()
  } catch (error) {
    console.error('提交权限申请失败:', error)
    message.error('提交权限申请失败')
  } finally {
    submitLoading.value = false
  }
}

const goHome = () => {
  router.replace('/')
}

onMounted(() => {
  if (hasLogin.value) {
    fetchApplyStatus()
  } else {
    fetched.value = true
  }
})
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.notfound-wrapper {
  min-height: calc(100vh - 80px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 16px 24px;
  gap: 16px;
}

.wscn-http404 {
  position: relative;
  width: 100%;
  max-width: 1100px;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 32px;
  flex-wrap: wrap;
  overflow: hidden;
  .pic-404 {
    position: relative;
    width: min(520px, 90vw);
    padding: 40px 0;
    overflow: hidden;
    flex: 1 1 420px;
    display: flex;
    justify-content: center;
    &__parent {
      width: 100%;
    }
    &__child {
      position: absolute;
      &.left {
        width: 80px;
        top: 17px;
        left: 220px;
        opacity: 0;
        animation-name: cloudLeft;
        animation-duration: 2s;
        animation-timing-function: linear;
        animation-fill-mode: forwards;
        animation-delay: 1s;
      }
      &.mid {
        width: 46px;
        top: 10px;
        left: 420px;
        opacity: 0;
        animation-name: cloudMid;
        animation-duration: 2s;
        animation-timing-function: linear;
        animation-fill-mode: forwards;
        animation-delay: 1.2s;
      }
      &.right {
        width: 62px;
        top: 100px;
        left: 500px;
        opacity: 0;
        animation-name: cloudRight;
        animation-duration: 2s;
        animation-timing-function: linear;
        animation-fill-mode: forwards;
        animation-delay: 1s;
      }
      @keyframes cloudLeft {
        0% {
          top: 17px;
          left: 220px;
          opacity: 0;
        }
        20% {
          top: 33px;
          left: 188px;
          opacity: 1;
        }
        80% {
          top: 81px;
          left: 92px;
          opacity: 1;
        }
        100% {
          top: 97px;
          left: 60px;
          opacity: 0;
        }
      }
      @keyframes cloudMid {
        0% {
          top: 10px;
          left: 420px;
          opacity: 0;
        }
        20% {
          top: 40px;
          left: 360px;
          opacity: 1;
        }
        70% {
          top: 130px;
          left: 180px;
          opacity: 1;
        }
        100% {
          top: 160px;
          left: 120px;
          opacity: 0;
        }
      }
      @keyframes cloudRight {
        0% {
          top: 100px;
          left: 500px;
          opacity: 0;
        }
        20% {
          top: 120px;
          left: 460px;
          opacity: 1;
        }
        80% {
          top: 180px;
          left: 340px;
          opacity: 1;
        }
        100% {
          top: 200px;
          left: 300px;
          opacity: 0;
        }
      }
    }
  }
  .bullshit {
    position: relative;
    width: min(420px, 90vw);
    padding: 20px 0;
    overflow: hidden;
    flex: 0 1 380px;
    text-align: left;
    &__oops {
      font-size: 32px;
      font-weight: bold;
      line-height: 40px;
      color: #1482f0;
      opacity: 0;
      margin-bottom: 20px;
      animation-name: slideUp;
      animation-duration: 0.5s;
      animation-fill-mode: forwards;
    }
    &__headline {
      font-size: 20px;
      line-height: 24px;
      color: #1482f0;
      opacity: 0;
      margin-bottom: 10px;
      animation-name: slideUp;
      animation-duration: 0.5s;
      animation-delay: 0.1s;
      animation-fill-mode: forwards;
    }
    &__info {
      font-size: 13px;
      line-height: 21px;
      color: grey;
      opacity: 0;
      margin-bottom: 30px;
      animation-name: slideUp;
      animation-duration: 0.5s;
      animation-delay: 0.2s;
      animation-fill-mode: forwards;
    }
    &__return-home {
      display: block;
      float: left;
      width: 110px;
      height: 36px;
      background: #1482f0;
      border-radius: 100px;
      text-align: center;
      color: #ffffff;
      opacity: 0;
      font-size: 14px;
      line-height: 36px;
      cursor: pointer;
      animation-name: slideUp;
      animation-duration: 0.5s;
      animation-delay: 0.3s;
      animation-fill-mode: forwards;
    }
    @keyframes slideUp {
      0% {
        transform: translateY(60px);
        opacity: 0;
      }
      100% {
        transform: translateY(0);
        opacity: 1;
      }
    }
    a {
      text-decoration: none;
    }
  }
}
.copyright {
  font-size: 14px;
  width: 100%;
  text-align: center;
  color: #8e8e8e;
  a {
    color: #1482f0;
    text-decoration: none;
  }
}

.actions-container {
  width: 100%;
  display: flex;
  justify-content: center;
  margin: 0 0 16px;
  min-height: 40px;
}

.action-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

@media (max-width: 900px) {
  .wscn-http404 {
    gap: 16px;
  }
  .bullshit {
    text-align: center;
  }
}
</style>
