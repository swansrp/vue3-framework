import { Button, Modal } from 'ant-design-vue'
import { defineComponent, h, ref } from 'vue'


import { autoFixAgentAssets, publishAgent, validateAgentAssets } from '@/framework/apis/smartAgent'

// 发布前预检：交叉校验草稿资产，error 弹清单（悬空引用类支持一键自动修复，修复后自动重校验；
// 敏感字段/行权限类需手工处理）、warn 列出让管理员确认后继续，通过后再调发布

const TYPE_CN: Record<string, string> = {
  entities: '实体',
  metrics: '指标',
  dimensions: '维度',
  relations: '关系',
  'value-domains': '码值域',
  concepts: '业务概念',
  'sensitive-fields': '敏感字段',
  'row-policies': '行权限'
}

const issueList = (issues: Array<any>) =>
  h('div', { style: 'max-height: 320px; overflow: auto; text-align: left;' },
    issues.map((i: any) =>
      h('p', { style: 'margin: 4px 0;' }, `【${TYPE_CN[i.assetType] || i.assetType}】${i.message}`)))

/** 纯文本清单（修复摘要等无 assetType 的行） */
const textList = (lines: Array<string>) =>
  h('div', { style: 'text-align: left;' },
    lines.map((s: string) => h('p', { style: 'margin: 4px 0;' }, s)))

/** 校验并发布：返回是否已发布；错误/取消返回 false */
export const validateAndPublish = (agentCode: string, baseDomain?: string): Promise<boolean> => {
  const doPublish = () => publishAgent({ agentCode }, baseDomain).then(() => true)

  // 单次「校验 → 处置」：有 error 进错误弹窗（可一键修复后递归本流程），无 error 走 warn/发布
  const runOnce = (): Promise<boolean> =>
    validateAgentAssets({ agentCode }, baseDomain).then((res: any) => {
      const issues = res?.payload?.issues || []
      const errors = issues.filter((i: any) => i.level === 'error')
      const warns = issues.filter((i: any) => i.level === 'warn')
      if (errors.length) {
        return showErrorsWithAutoFix(agentCode, baseDomain, errors, runOnce)
      }
      if (warns.length) {
        return new Promise<boolean>((resolve) => {
          Modal.confirm({
            title: `校验通过，但有 ${warns.length} 条提醒，仍要发布吗？`,
            width: 560,
            content: issueList(warns),
            okText: '仍然发布',
            cancelText: '先处理',
            onOk: () => doPublish().then(() => resolve(true)),
            onCancel: () => resolve(false)
          })
        })
      }
      return doPublish()
    })

  return runOnce()
}

/** 错误弹窗：清单 + 一键自动修复按钮；修复后关闭弹窗，摘要确认后递归重校验 */
const showErrorsWithAutoFix = (agentCode: string, baseDomain: string | undefined,
                               errors: Array<any>, retry: () => Promise<boolean>): Promise<boolean> =>
  new Promise<boolean>((resolve) => {
    const fixing = ref(false)

    const doFix = () => {
      fixing.value = true
      autoFixAgentAssets({ agentCode }, baseDomain).then((res: any) => {
        const summary: Array<string> = res?.payload?.summary || []
        Modal.destroyAll()
        if (!summary.length) {
          // 无可自动修复项：剩余均为安全设施/骨架类，需手工处理
          Modal.warning({
            title: '无可自动修复项',
            width: 560,
            content: '剩余错误涉及敏感字段/行权限/实体骨架，需人工在对应资产页逐条处理后再发布'
          })
          resolve(false)
          return
        }
        Modal.success({
          title: '已自动修复',
          width: 560,
          content: textList(summary),
          okText: '重新校验',
          onOk: () => retry().then(resolve)
        })
      }).catch(() => {
        fixing.value = false // 请求层已提示错误，恢复按钮可点
      })
    }

    const ErrorPanel = defineComponent({
      setup() {
        return () => h('div', [
          issueList(errors),
          h('p', { style: 'margin-top: 8px; color: #999; font-size: 12px;' },
            '悬空引用类错误（引用已取消勾选的表/不存在的维度等）可一键自动修复；'
            + '敏感字段与行权限类错误涉及安全策略，需人工处理'),
          h(Button, {
            type: 'primary',
            loading: fixing.value,
            onClick: doFix,
            style: 'margin-top: 8px;'
          }, { default: () => '一键自动修复' })
        ])
      }
    })

    Modal.confirm({
      title: `发布校验未通过：${errors.length} 个错误`,
      width: 620,
      content: h(ErrorPanel),
      okText: '关闭',
      cancelButtonProps: { style: 'display: none;' },
      onOk: () => resolve(false)
    })
  })
