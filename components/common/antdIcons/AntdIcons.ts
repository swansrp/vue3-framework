import * as Icons from '@ant-design/icons-vue'
import type { App } from 'vue'
import { createVNode } from 'vue'

const Icon = (props: {icon: string}) => {
  const { icon } = props
  const comp = Icons[icon as keyof typeof Icons]
  // 菜单未配置图标(或图标名无效)时用默认图标, 避免 createVNode(undefined) 告警
  return createVNode(comp || Icons.SettingOutlined)
}

export function setupAntdIcon(app: App<Element>): void {
  app.component('Icon', Icon)
}
