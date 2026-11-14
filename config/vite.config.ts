import fs from 'fs'
import path from 'path'

import legacyPlugin from '@vitejs/plugin-legacy'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import AutoImport from 'unplugin-auto-import/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'
import eslintPlugin from 'vite-plugin-eslint'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'
import vueDevTools from 'vite-plugin-vue-devtools'
import VueSetupExtend from 'vite-plugin-vue-setup-extend'

// 从 package.json 读取项目名，用于动态生成代理路径
const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../package.json'), 'utf-8'))
const apiPrefix = `/${pkg.name}`

// 🔴 dev/preview 代理目标：读项目根 .env.development 的 VITE_PROXY_TARGET（缺省本地 InkHub）。
// 本机联调口径（2026-11-14 拍板）＝VITE_baseURL 恒空＋代理同源转发：浏览器全程零跨域
// （直连网关形态在 localStorage 残留票带 Authorization 头时，会被预检 ACAH:* 不覆盖
// Authorization 卡死＝浏览器报跨域；curl 无此校验所以探测全绿，勿再走直连形态）。
// 改 VITE_PROXY_TARGET 同样要重启 vite（配置只在起服时读一次）。
const devEnvText = (() => {
  try {
    return fs.readFileSync(path.resolve(__dirname, '../../../.env.development'), 'utf-8')
  } catch {
    return ''
  }
})()
const proxyTarget =
  (devEnvText.match(/^VITE_PROXY_TARGET='?([^'\r\n]+)'?\s*$/m) || [])[1]?.trim()
  || 'http://127.0.0.1:8080'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return id.toString().split('node_modules/')[1].split('/')[0].toString()
          }
        }
      },
      external: [
        // 排除 setup 目录下的所有文件
        /\/src\/framework\/setup\//
      ]
    }
  },
  plugins: [
    vue(),
    vueDevTools(),
    vueJsx(),
    VueSetupExtend(),
    eslintPlugin({
      include: ['src/**/*.js', 'src/**/*.vue', 'src/*.js', 'src/*.vue']
    }),
    AutoImport({
      imports: ['vue', 'vue-router',
        {
          '@/framework/hooks/useCurrentInstance': ['getInstance']
        },{
          '@/framework/utils/common': ['isNotEmpty', 'isEmpty', 'log']
        }],
      dts: 'src/auto-import.d.ts'
    }),
    Components({
      resolvers: [
        // antdv 4.x 缺 es/auto-complete/style 兼容目录，默认 resolver 会注入不存在的样式路径致 vite 解析报错；
        // AutoComplete 单独解析只导组件（v4 样式运行时 cssinjs 注入，不导 less 无影响）
        (name: string) => name === 'AAutoComplete'
          ? { name: 'AutoComplete', from: 'ant-design-vue/es' }
          : undefined,
        AntDesignVueResolver({
          importStyle: 'less', // 使用 less 预编译样式，兼容老浏览器
          resolveIcons: true // 自动按需导入 antd 图标
        })],
      dirs: ['src/components', 'src/framework/components'],
      dts: 'src/components.d.ts'
    }),
    legacyPlugin({
      targets: ['chrome 52'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
      renderLegacyChunks: true,
      polyfills: [
        'es.symbol',
        'es.promise',
        'es.promise.finally',
        'es/map',
        'es/set',
        'es.array.filter',
        'es.array.for-each',
        'es.array.flat-map',
        'es.object.define-properties',
        'es.object.define-property',
        'es.object.get-own-property-descriptor',
        'es.object.get-own-property-descriptors',
        'es.object.keys',
        'es.object.to-string',
        'web.dom-collections.for-each',
        'esnext.global-this',
        'esnext.string.match-all'
      ]
    }),
    createSvgIconsPlugin({
      // 图标文件夹为src/assets/icons
      iconDirs: [path.resolve(process.cwd(), 'src/assets/icons')],
      // 指定symbolId格式
      symbolId: 'icon-[dir]-[name]'
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../../src'),
      'grid-layout-plus/src/helpers/types': 'grid-layout-plus/dist/helpers/types.js'
    }
  },
  define: {
    // 解决 interactjs 模块导入问题
    global: 'globalThis'
  },
  optimizeDeps: {
    include: [
      'brace',
      'interactjs'
    ],
    exclude: ['grid-layout-plus']
  },
  // 不加入这部分代码，surely table会报错
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true
      },
      // 采用 modern API，消除 Dart Sass legacy JS API 弃用警告（Vite 5.4+ 支持）
      scss: {
        api: 'modern'
      }
    }
  },
  base: './',
  server: {
    host: '0.0.0.0',
    port: 8082, //vite项目启动时自定义端口
    proxy: {
      [apiPrefix]: {
        target: proxyTarget,
        changeOrigin: true
      }
    }
  },
  // preview（dist 预览）与 dev 同款代理：业务层「同源直调」通道（inkhubFetch 的 fetch/XHR 相对路径，
  // 如 skill 包上传 multipart 直调）都按 /<pkg.name> 相对路径发请求，preview 不配代理时会落到
  // 前端自身域名的 SPA fallback 上，请求永远到不了后端
  preview: {
    host: '0.0.0.0',
    proxy: {
      [apiPrefix]: {
        target: proxyTarget,
        changeOrigin: true
      }
    }
  }
})
