import path from "path"
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteMockServe } from "vite-plugin-mock"
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
import eslintPlugin from "vite-plugin-eslint"
import vueJsx from "@vitejs/plugin-vue-jsx"
import legacyPlugin from '@vitejs/plugin-legacy'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'
import VueSetupExtend from 'vite-plugin-vue-setup-extend'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
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
      '@': path.resolve(__dirname, '../../../src')
    }
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
    port: 8083 //vite项目启动时自定义端口
  }
})
