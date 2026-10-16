<!--
 * `/sso/authorize`＝出票方对外**发** SSO 票的中转页（M15 棒 0b-3，随框架前端自带——
 * framework router 静态注册 `meta.public`，应用侧零改动）。
 *
 * <p>子系统把自己的地址登记进 core 表 `ac_sso_redirect` 白名单（按 partner 归属登记）后，
 * 把未登录用户带到这一页
 * （`#/sso/authorize?app_id=<ac_partner.app_key>&sso_redirect_uri=<登记在该家名下的整串>`）。
 * 🔴 入参名刻意避开 `redirect_uri`：框架登录腿 `network/login.ts:39,49,76` 会对整串 URL 调
 * `removeURLParameter(href, 'redirect_uri')`，同名参数在"未登录 → 本地 /login → 回跳"这一跳里
 * 会被剥掉（`VITE_ssoDomain='localhost'` 即 pre 现形态走的就是这条腿）。
 * 剥参判据是**精确前缀**（`network/utils.ts:152-155` 的 `lastIndexOf(prefix, 0)`），故换名即免疫；
 * 🔴 同文件 `:151` 会把 query 段里多余的 `?` 一律换成 `&` ⇒ 传进来的地址串必须整体百分号编码。
 * 本页只做三件事：拿当前登录态向
 * `POST /web/sso/ticket` 要一张票 → 用**服务端回填的** redirect_uri 拼上 `id_token` 回跳 →
 * 拿不到票就把拒因就地画出来并给出口。</p>
 *
 * <p>🔴 回跳地址取自 `res.payload.redirectUri`（服务端按 origin 等值核过白名单的那一条），
 * 不用前端入参拼——入参可以是任意串，用它跳就是开放重定向。</p>
 * <p>🔴 未登录分流由本页自理：路由 meta.public=true、不进框架登录守卫——
 * 守卫探活体在非登录页必经 _executeLogin 发起嵌套 router.replace，嵌套导航等不到当前导航结束
 * ⇒ 探活必然 8s 超时，且 vue-router 对被取消的 pop 导航会 history.go(-1) 把地址卷回旧条目丢参。
 * 页面挂载时自查登录态：未登录→本地形态保参跳 /login（redirect_uri＝本页 full 路径，登录后由
 * Login 页 replace 回来）、IdaaS 形态走 navigation2Login 的 target_url 透传；已登录→直接出票。
 * 不自造 state。</p>
-->
<template>
  <div class="sso-auth">
    <div class="sso-auth__card">
      <template v-if="state === 'issuing'">
        <div class="sso-auth__title">
          正在签发单点登录票据…
        </div>
        <div class="sso-auth__sub">
          签发完成后自动跳回 {{ targetLabel }}
        </div>
      </template>

      <template v-else-if="state === 'redirecting'">
        <div class="sso-auth__title">
          票据已签发，正在跳回来源系统…
        </div>
        <div class="sso-auth__sub">
          若浏览器没有自动跳转，点下面的按钮
        </div>
        <a-button
          type="primary"
          @click="goRedirect"
        >
          继续跳回
        </a-button>
      </template>

      <template v-else>
        <div class="sso-auth__title">
          没能跳回来源系统
        </div>
        <div class="sso-auth__reason">
          {{ reason }}
        </div>
        <div class="sso-auth__actions">
          <a-button
            v-if="canRetry"
            @click="issue"
          >
            重新签发
          </a-button>
          <a-button
            type="primary"
            @click="backToHub"
          >
            返回墨枢
          </a-button>
        </div>
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
defineOptions({ name: 'SsoAuthorizeView' })

import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { postSsoTicket } from '@/framework/apis/sso/sso'
import { navigation2Login } from '@/framework/network/login'
import pinia from '@/framework/store'
import { useCommonStore } from '@/framework/store/common'

const route = useRoute()
const router = useRouter()

const state = ref<'issuing' | 'redirecting' | 'failed'>('issuing')
const reason = ref('')
const pendingUri = ref('')
const pendingToken = ref('')

/**
 * 入参只用于"要不要发起"和页面说明；真正回跳用的是服务端回填的那条。
 * 🔴 参数名＝`sso_redirect_uri`，不能叫 `redirect_uri`（见文件头：框架登录腿会把同名参数剥掉）。
 * 🔴 出票 redirect_uri 取值优先级＝`target_url` > `sso_redirect_uri`：会话过期回链腿
 * （login.ts 的 `navigation2Login`）跳本页时只带 `target_url`＝过期前那个页面，用它出票
 * 才能落回原页面；服务端按 origin 等值核白名单兜底，跳转仍用响应回显原串（见 `goRedirect`）。
 * vue-router 对 hash 内 query 值自动解码一层，`target_url` 到手即原始 URL，不再二次编码/解码；
 * 非 string 形态（数组等）按缺失处理、回落 `sso_redirect_uri`。
 */
const targetUrl = computed(() => (typeof route.query.target_url === 'string' ? route.query.target_url : ''))
const redirectUri = computed(() => targetUrl.value || String(route.query.sso_redirect_uri ?? ''))
/** 🔴 出票判据＝(app_id, redirect_uri) 组合，app_id 缺失不发请求 */
const appId = computed(() => String(route.query.app_id ?? ''))
const targetLabel = computed(() => redirectUri.value || '来源系统')
/** 参数缺失属用户能自己修的（回来源系统重新发起），不给"重试"按钮 */
const canRetry = computed(() => appId.value !== '' && redirectUri.value !== '')

function fail(msg: string) {
  state.value = 'failed'
  reason.value = msg
}

async function issue() {
  if (!appId.value) {
    // app_id 缺失＝组合判据无从谈起，前端就地拒，不发请求
    fail('缺少 app_id 参数，请回到来源系统重新发起登录。')
    return
  }
  if (!redirectUri.value) {
    // 后端对空值也是业务拒绝，这里在前端就地给同一句根因，省一次往返
    // （两个入参名都列：正常发起带 sso_redirect_uri，过期回链带 target_url）
    fail('缺少 target_url 或 sso_redirect_uri 参数，请回到来源系统重新发起登录。')
    return
  }
  state.value = 'issuing'
  try {
    const res = await postSsoTicket(appId.value, redirectUri.value)
    // 🔴 只信服务端回填的回调地址（已过白名单 origin 等值核对）
    pendingUri.value = String(res.payload?.redirectUri ?? '')
    pendingToken.value = String(res.payload?.idToken ?? '')
    if (!pendingToken.value || !pendingUri.value) {
      fail('没有返回可用的票据或回调地址，请回到来源系统重新发起登录。')
      return
    }
    state.value = 'redirecting'
    goRedirect()
  } catch (e: any) {
    // 后端拒绝文案即根因，原样显示（框架 showErr=false，拒因落在这里就地给）
    fail(String(e?.message ?? '出票失败，请稍后重试。'))
  }
}

function goRedirect() {
  const sep = pendingUri.value.includes('?') ? '&' : '?'
  window.location.href = pendingUri.value + sep + 'id_token=' + encodeURIComponent(pendingToken.value)
}

function backToHub() {
  router.replace('/').catch(() => window.location.reload())
}

onMounted(() => {
  if (useCommonStore(pinia).hasLogin) {
    issue()
    return
  }
  // 未登录先去登录（保参）：本地形态用本页 fullPath 自算（守卫不在场，router 空闲、replace 必提交）；
  // IdaaS 形态交给框架登录腿透传 target_url。登录成功后 Login 页 replace 回本页，hasLogin 已置真。
  const localForm = !import.meta.env.VITE_ssoLoginUrl || import.meta.env.VITE_ssoDomain === 'localhost'
  if (localForm) {
    router.replace({ path: '/login', query: { redirect_uri: route.fullPath.replace(/^\//, '') } })
  } else {
    navigation2Login()?.then()
  }
})
</script>

<style scoped>
.sso-auth {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 24px;
}

.sso-auth__card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 560px;
  padding: 24px;
  border: 1px solid var(--cf-border);
  border-radius: 8px;
  background: var(--cf-bg);
}

.sso-auth__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--cf-text);
}

.sso-auth__sub,
.sso-auth__reason {
  font-size: 13px;
  color: var(--cf-sub);
  word-break: break-all;
}

.sso-auth__reason {
  padding: 8px 10px;
  border-radius: 4px;
  background: var(--cf-hover);
  color: var(--cf-text);
}

.sso-auth__actions {
  display: flex;
  gap: 8px;
}
</style>
