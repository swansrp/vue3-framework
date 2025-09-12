// 仪表盘Mock数据配置

import Mock from 'mockjs'
import { commonIndicatorsTestData, personalIndicatorsTestData } from '../testData'

// 设置Mock拦截延迟
Mock.setup({
  timeout: '200-600'
})

// Mock通用指标数据接口
Mock.mock(/\/api\/portal\/dashboard\/indicator\/common/, 'get', (options: any) => {
  console.log('Mock拦截到通用指标请求:', options)
  
  // 模拟处理查询参数
  const url = new URL(options.url, 'http://localhost')
  const tableId = url.searchParams.get('tableId')
  
  return {
    code: 200,
    message: 'success',
    payload: commonIndicatorsTestData,
    tableId: tableId || 'default'
  }
})

// Mock个人指标数据接口
Mock.mock(/\/api\/portal\/dashboard\/indicator\/personal/, 'get', (options: any) => {
  console.log('Mock拦截到个人指标请求:', options)
  
  // 模拟处理查询参数
  const url = new URL(options.url, 'http://localhost')
  const tableId = url.searchParams.get('tableId')
  
  return {
    code: 200,
    message: 'success',
    payload: personalIndicatorsTestData,
    tableId: tableId || 'default'
  }
})

// Mock保存指标树数据接口
Mock.mock(/\/api\/portal\/dashboard\/indicator\/tree/, 'post', (options: any) => {
  console.log('Mock拦截到保存指标树请求:', options)
  
  // 模拟处理请求体
  const body = JSON.parse(options.body || '{}')
  
  return {
    code: 200,
    message: '保存成功',
    tableId: body.tableId || 'default'
  }
})

// Mock新增个人指标接口
Mock.mock(/\/api\/portal\/dashboard\/indicator\/add/, 'post', (options: any) => {
  console.log('Mock拦截到新增个人指标请求:', options)
  
  // 模拟处理请求体
  const body = JSON.parse(options.body || '{}')
  
  return {
    code: 200,
    message: '新增成功',
    tableId: body.tableId || 'default',
    data: body.data || {}
  }
})

// Mock更新个人指标接口
Mock.mock(/\/api\/portal\/dashboard\/indicator$/, 'post', (options: any) => {
  console.log('Mock拦截到更新个人指标请求:', options)
  
  // 模拟处理请求体
  const body = JSON.parse(options.body || '{}')
  
  return {
    code: 200,
    message: '更新成功',
    tableId: body.tableId || 'default',
    data: body.data || {}
  }
})

// Mock删除个人指标接口
Mock.mock(/\/api\/portal\/dashboard\/indicator\/delete/, 'post', (options: any) => {
  console.log('Mock拦截到删除个人指标请求:', options)
  
  // 模拟处理请求体
  const body = JSON.parse(options.body || '{}')
  
  return {
    code: 200,
    message: '删除成功',
    tableId: body.tableId || 'default',
    data: {
      indicatorId: body.indicatorId || ''
    }
  }
})

export default Mock