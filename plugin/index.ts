import common from '@/framework/plugin/common'


const plugins = [
  common
] as any[]

export default function (Vue: any) {
  plugins.map(plugin => Vue.use(plugin))
}