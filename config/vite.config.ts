import path from 'path'

import legacyPlugin from '@vitejs/plugin-legacy'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import AutoImport from 'unplugin-auto-import/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'
import eslintPlugin from 'vite-plugin-eslint'
import { viteMockServe } from 'vite-plugin-mock'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'
import vueDevTools from 'vite-plugin-vue-devtools'
import VueSetupExtend from 'vite-plugin-vue-setup-extend'

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
      }
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
        importStyle: false // css in js
      })],
      dirs: ['src/components', 'src/framework/components'],
      dts: 'src/components.d.ts'
    }),
    viteMockServe({
      logger: false,
      mockPath: 'src/mock'
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
