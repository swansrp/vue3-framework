import App from './App.vue'

import pinia from '@/framework/store'

import STable from '@surely-vue/table'
import { createApp } from 'vue'
import '@/framework/assets/css/base.css'
import '@/framework/assets/css/design-tokens.css'
import VueLazyload from 'vue-lazyload'

import '@surely-vue/table/dist/index.less'
// 自己封装的，用于显示antd Menu的图标组件
import defaultAvatar from '@/framework/assets/imgs/defaultAvatar.png'
import { setupAntdIcon } from '@/framework/components/common/antdIcons/AntdIcons'
import { checkLoginState } from '@/framework/network/login'
import { download, upload } from '@/framework/network/request'
import pluginLoader from '@/framework/plugin'
import router, { enterDynamicRoute } from '@/framework/router'
import { useCommonStore } from '@/framework/store/common'
// // 数据大屏
// import DataVVue3 from '@kjgl77/datav-vue3'
// import 'echarts-liquidfill'
// import * as echarts from 'echarts' // 引入echarts
// 引入字体
import './assets/fonts/fonts.css'

/**
 * bootstrap 函数：先挂载生产 Mock，再启动 Vue
 */
async function bootstrap() {
  // 1️⃣ 初始化生产 Mock
  // await enableMock()

  // 2️⃣ 注入业务层的 MainContent 组件
  // setMainContentComponent(() => import('@/views/MainContent.vue'))

  // 3️⃣ 创建 Vue 应用
  const app = createApp(App)

  // 自定义 app.use
  pluginLoader(app)
  app.use(pinia)

  // 注册静态路由


  app.use(router)
  app.use(STable)
  app.use(VueLazyload, { loading: defaultAvatar })

  // 提供全局方法
  app.provide('upload', upload)
  app.provide('download', download)

  setupAntdIcon(app)

  // 全局挂载 echarts
  // app.config.globalProperties.$echarts = echarts
  // app.use(DataVVue3)

  // 4️⃣ 挂载 Vue
  app.mount('#app')

  console.log('[App] Vue 已挂载，应用启动完成')

  router.beforeEach(async (to, from, next) => {
    const commonStore = useCommonStore(pinia)
    if (to.path === '/login' || to.meta.public) {
      next()
    } else if (commonStore.hasLogin) {
      enterDynamicRoute(to, from, next)
    } else {
      await checkLoginState()
      delete to.query.id_token
      if (!commonStore.hasLogin) {
        next('/login')
      } else {
        next({ path: to.path, query: to.query })
      }
    }
  })

}

// 启动
bootstrap()

export default null
