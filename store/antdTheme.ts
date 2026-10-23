/**
 * antd ThemeConfig 构建器 —— 按 data-theme 返回 ConfigProvider 的 theme 映射。
 *
 * 【范围纪律】只有 plsintec / plsintecDark 两个主题带完整 token 映射
 * （正源＝docs/plsintec-ui-tokens.md）；其余主题（mokShu/indigo/…/共享 dark）
 * 一律保持历史行为＝仅配 algorithm，不动观感。
 *
 * 【4.2.6 版本约束】（落码前对照 node_modules 类型核实过）
 * - 基础文字 token 名是 colorText / colorTextHeading，没有 colorTextPrimary；
 * - Table/Modal 的 ComponentToken 是空接口，tableHeaderBg 等由 colorFillQuaternary
 *   等 alias token 派生，只能通过 components 作用域覆写 alias token 间接控制；
 * - 表格行高无法用 token 精确控制（padding 种子水平垂直共用），不在此收口。
 */
import type { ThemeConfig } from 'ant-design-vue/es/config-provider/context'

import { theme as antdTheme } from 'ant-design-vue'

import type { ThemeId } from './theme'

/** plsintec 浅色字体栈（规范 p10/p11；与 design-tokens.css 的 plsintec 块同一套） */
const PLSINTEC_FONT_FAMILY = "'Roboto', 'PingFang SC', 'Microsoft YaHei', sans-serif"

/** plsintec 浅色 token 映射（值与溯源见 docs/plsintec-ui-tokens.md） */
const PLSINTEC_TOKEN = {
  colorPrimary: '#1E4BFF',
  colorSuccess: '#0F9D58',
  colorWarning: '#FF9900',
  colorError: '#D93025',
  colorInfo: '#1A73E8',
  colorLink: '#1E4BFF',
  borderRadius: 4,
  borderRadiusLG: 12,
  controlHeight: 32,
  fontSize: 14,
  fontFamily: PLSINTEC_FONT_FAMILY,
  fontWeightStrong: 500,
  colorTextHeading: '#1F1F1F',
  colorText: '#666666',
  colorTextSecondary: '#999999',
  colorTextQuaternary: '#CCCCCC',
  colorBorder: '#E0E0E0',
  colorBorderSecondary: '#EBEEF5',
  colorBgLayout: '#F5F5F5',
  colorBgContainer: '#FFFFFF',
  colorBgContainerDisabled: '#F5F7FA',
  controlOutline: 'rgba(30, 75, 255, 0.2)',
  motionDurationFast: '0.1s',
  motionDurationMid: '0.2s',
  motionDurationSlow: '0.3s'
}

/** plsintec 暗色 token 映射（G 章 p28–29：品牌蓝换锚 #4A87F5，不换其他锚） */
const PLSINTEC_DARK_TOKEN = {
  ...PLSINTEC_TOKEN,
  colorPrimary: '#4A87F5',
  colorSuccess: '#529B4E',
  colorWarning: '#B8823F',
  colorError: '#C45656',
  colorInfo: '#8C9099',
  colorLink: '#4A87F5',
  colorTextHeading: '#E5EAF3',
  colorText: '#E5EAF3',
  colorTextSecondary: '#A3A6AD',
  colorTextQuaternary: '#8C9099',
  colorBorder: '#414243',
  colorBorderSecondary: '#414243',
  colorBgLayout: '#121212',
  colorBgContainer: '#1E1E1E',
  colorBgContainerDisabled: '#2A2A2A',
  controlOutline: 'rgba(74, 135, 245, 0.4)'
}

export function buildAntdTheme(themeId: ThemeId): ThemeConfig {
  // 非 plsintec 系主题：保持历史行为（仅明暗算法），不影响既有项目观感
  if (themeId !== 'plsintec' && themeId !== 'plsintecDark') {
    return { algorithm: themeId === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm }
  }

  const isDark = themeId === 'plsintecDark'
  return {
    algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: { ...(isDark ? PLSINTEC_DARK_TOKEN : PLSINTEC_TOKEN) },
    components: {
      // 表头底/行悬停底/斑马纹在 4.2.6 同由 colorFillQuaternary 派生（取舍⑤），
      // 表头文字走 colorTextHeading 作用域覆写（表头 N1、正文 N3）
      Table: { colorFillQuaternary: isDark ? '#262626' : '#F5F7FA', colorTextHeading: isDark ? '#E5EAF3' : '#1F1F1F' },
      // 弹窗标题 16px（规范 p25 头部标题 16 加粗；antd 默认 fontSizeHeading5=20）
      Modal: { fontSizeHeading5: 16 }
    }
  }
}
