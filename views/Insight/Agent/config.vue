<!--
 * Agent 工作台（DB 菜单 AgentWorkbench，component 直达本文件）——业务薄封装
 * （framework 层页面：所有项目共享，后端依赖 insight 模块即可用）
 *
 * 通用底座（framework 层 SkillWorkbench 组件）按 skillCode=smart-agent 渲染：
 * 1. 链路画布——asset-gen 资产生成链（敏感闸→骨架→配对推断→生成指标/关系/概念→落盘收口）
 * 2. 执行轨迹——资产生成调试反馈回路：trace 列表 + 结点事件时间线
 * 3. 评价统计——运营回路：通用端点按 skillCode 过滤（评价由问答侧产生后回这里查询）
 *
 * 与 ChatBI 工作台（views/Insight/ChatBi/config.vue）对等：api 走同一工厂
 * （createSkillWorkbenchApi），业务差异只剩链路文案；入口形式不同（chatbi 为静态路由，
 * 本页为 DB 菜单），组件解析经 getComponent 直达 .vue。资产内容维护在 Agent 管理页
 * （资产编辑器直接落草稿/发布，不经画布），故本页无业务资产 Tab。
-->
<template>
  <SkillWorkbench
    skill-code="smart-agent"
    title="智能问数 · Agent 工作台"
    subtitle="资产生成链路编排与执行轨迹调试"
    :api="workbenchApi"
    :flow-meta="FLOW_META"
    trace-empty-hint="去 Agent 管理页发起资产生成后回来刷新"
    rating-empty-hint="在 Agent 问答页对回答点赞/点踩后回来查询"
  />
</template>

<script lang="ts" setup>
import SkillWorkbench from '@/framework/components/common/skill/SkillWorkbench.vue'
import { createSkillWorkbenchApi } from '@/framework/components/common/skill/workbenchApi'

// ===== 业务注入：链路职责富文案（registry 只给显示名，未维护的链由组件降级显示） =====

const FLOW_META: Record<string, { duty: string; trigger: string; output: string }> = {
  'asset-gen': {
    duty: '资产生成链：选表 → 敏感闸 → 骨架 → 配对推断 → 生成指标/关系/概念 → 落盘收口（Agent 资产生产线，mode 条件边区分 skeleton/pipeline）',
    trigger: 'Agent 管理页发起资产生成（POST /admin/generate，mode=skeleton|pipeline）',
    output: '资产草稿（实体/指标/关系/概念/码值域）'
  }
}

// ===== 业务注入：Skill 工作台 api 适配器（通用工厂：skillCode=smart-agent → /web/api/agent 端点） =====

const workbenchApi = createSkillWorkbenchApi('smart-agent')
</script>
