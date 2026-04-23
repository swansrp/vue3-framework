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

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 3000,
    reportCompressedSize: false,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // echarts 全家桶
            if (id.includes('echarts') || id.includes('zrender')) {
              return 'echarts-vendor'
            }
            // antd + surely-table 同源，归入同一 chunk
            if (id.includes('ant-design-vue') || id.includes('@ant-design') || id.includes('@surely-vue')) {
              return 'antd-vendor'
            }
            // excel 处理
            if (id.includes('exceljs') || id.includes('xlsx-js-style')) {
              return 'excel-vendor'
            }
            // 富文本编辑器
            if (id.includes('tinymce') || id.includes('@tiptap') || id.includes('tiptap-extend')) {
              return 'editor-vendor'
            }
            // pdf / 截图
            if (id.includes('html2canvas') || id.includes('jspdf') || id.includes('dompurify')) {
              return 'document-vendor'
            }
            // 拼音（体积大，独立拆分）
            if (id.includes('pinyin')) {
              return 'pinyin-vendor'
            }
            // G6 图编辑
            if (id.includes('@antv/g6') || id.includes('@antv')) {
              return 'g6-vendor'
            }
            // datav 大屏组件
            if (id.includes('datav-vue3') || id.includes('v-scale-screen')) {
              return 'datav-vendor'
            }
            // swiper 轮播
            if (id.includes('swiper') || id.includes('vue-awesome-swiper')) {
              return 'swiper-vendor'
            }
            // 布局 / 拖拽
            if (id.includes('grid-layout-plus') || id.includes('interactjs')) {
              return 'layout-vendor'
            }
            // 代码编辑器
            if (id.includes('brace') || id.includes('bin-editor-next') || id.includes('sql-formatter')) {
              return 'code-editor-vendor'
            }
            // markdown 处理
            if (id.includes('marked') || id.includes('turndown')) {
              return 'markdown-vendor'
            }
            // vue 核心（vue-demi 被 pinia 依赖且自身依赖 vue，必须同 chunk 避免循环引用）
            if (id.includes('vue/') || id.includes('vue-router') || id.includes('pinia') || id.includes('@vue/') || id.includes('vue-demi')) {
              return 'vue-core'
            }
            // 工具库
            if (id.includes('lodash') || id.includes('axios') || id.includes('qs') || id.includes('core-js') || id.includes('tslib')) {
              return 'vendor-utils'
            }
            // 兜底
            return 'vendor'
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
      resolvers: [AntDesignVueResolver({
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
      }
    }
  },
  base: './',
  server: {
    host: '0.0.0.0',
    port: 8082 //vite项目启动时自定义端口
  }
})
