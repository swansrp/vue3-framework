// 个人仪表盘测试数据

import { IndicatorTreeNode } from './types'

// 通用指标测试数据
export const commonIndicatorsTestData: IndicatorTreeNode[] = [
  {
    id: 'common-1',
    pid: '0',
    key: 'common-1',
    title: '销售总额',
    type: 'common',
    treeOrder: 1,
    displayOrder: 1,
    xGrid: 2,
    yGrid: 2,
    show: true,
    config: {
      url: '/api/sales/total',
      columns: [
        { title: '月份', dataIndex: 'month' },
        { title: '销售额', dataIndex: 'amount' }
      ]
    },
    isLeaf: true
  },
  {
    id: 'common-2',
    pid: '0',
    key: 'common-2',
    title: '客户统计',
    type: 'common',
    treeOrder: 2,
    displayOrder: 2,
    xGrid: 2,
    yGrid: 2,
    show: true,
    config: {
      url: '/api/customers/stats',
      columns: [
        { title: '地区', dataIndex: 'region' },
        { title: '客户数', dataIndex: 'count' }
      ]
    },
    isLeaf: true
  },
  {
    id: 'common-category-1',
    pid: '0',
    key: 'common-category-1',
    title: '财务指标',
    type: 'common',
    treeOrder: 3,
    displayOrder: 0,
    xGrid: 1,
    yGrid: 1,
    show: false,
    config: {},
    children: [
      {
        id: 'common-3',
        pid: 'common-category-1',
        key: 'common-3',
        title: '利润分析',
        type: 'common',
        treeOrder: 1,
        displayOrder: 3,
        xGrid: 3,
        yGrid: 2,
        show: true,
        config: {
          url: '/api/finance/profit',
          columns: [
            { title: '季度', dataIndex: 'quarter' },
            { title: '利润', dataIndex: 'profit' }
          ]
        },
        isLeaf: true
      }
    ]
  }
]

// 个人指标测试数据
export const personalIndicatorsTestData: IndicatorTreeNode[] = [
  {
    id: 'personal-1',
    pid: '0',
    key: 'personal-1',
    title: '个人销售业绩',
    type: 'personal',
    treeOrder: 1,
    displayOrder: 4,
    xGrid: 2,
    yGrid: 2,
    show: true,
    config: {
      url: '/api/personal/sales',
      columns: [
        { title: '日期', dataIndex: 'date' },
        { title: '业绩', dataIndex: 'performance' }
      ]
    },
    isLeaf: true
  },
  {
    id: 'personal-2',
    pid: '0',
    key: 'personal-2',
    title: '任务完成情况',
    type: 'personal',
    treeOrder: 2,
    displayOrder: 5,
    xGrid: 2,
    yGrid: 1,
    show: true,
    config: {
      url: '/api/personal/tasks',
      columns: [
        { title: '任务', dataIndex: 'task' },
        { title: '完成度', dataIndex: 'completion' }
      ]
    },
    isLeaf: true
  },
  {
    id: 'personal-category-1',
    pid: '0',
    key: 'personal-category-1',
    title: '个人目标',
    type: 'personal',
    treeOrder: 3,
    displayOrder: 0,
    xGrid: 1,
    yGrid: 1,
    show: false,
    config: {},
    children: [
      {
        id: 'personal-3',
        pid: 'personal-category-1',
        key: 'personal-3',
        title: '月度目标达成率',
        type: 'personal',
        treeOrder: 1,
        displayOrder: 6,
        xGrid: 3,
        yGrid: 1,
        show: true,
        config: {
          url: '/api/personal/goals',
          columns: [
            { title: '月份', dataIndex: 'month' },
            { title: '目标', dataIndex: 'target' },
            { title: '实际', dataIndex: 'actual' },
            { title: '达成率', dataIndex: 'rate' }
          ]
        },
        isLeaf: true
      }
    ]
  }
]

// 合并的测试数据
export const allIndicatorsTestData: IndicatorTreeNode[] = [
  ...commonIndicatorsTestData,
  ...personalIndicatorsTestData
]