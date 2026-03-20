/**
 * 表单数据 PDF 导出 Composable
 * 用于导出审核报告 PDF
 */
import { message } from 'ant-design-vue'

import { formDataGroupInstanceGeneralSelect } from '../apis/formDataGroupInstancePortalController'
import { formDataHistoryQueryById } from '../apis/formDataHistoryPortalController'
import { formDataGeneralSelect } from '../apis/formDataPortalController'
import { formDataSectionInstanceGeneralSelect } from '../apis/formDataSectionInstancePortalController'
import { formSchemaAttributeGroupGeneralSelect } from '../apis/formSchemaAttributeGroupPortalController'
import { formSchemaAttributeGeneralSelect } from '../apis/formSchemaAttributePortalController'
import { formSchemaModuleGeneralSelect } from '../apis/formSchemaModulePortalController'
import { formSchemaQueryById } from '../apis/formSchemaPortalController'
import { formSchemaSectionGeneralSelect } from '../apis/formSchemaSectionPortalController'

import { getDictByValue } from '@/framework/apis/dict/bizDictController'
import type { BizDictVO } from '@/framework/apis/dict/bizDictController'
import { FILTER_TYPE } from '@/framework/components/common/Portal/type'

// 数据结构定义
interface PdfGroupInstance {
  groupInstanceId: string
  groupId: string
  rowIndex: number
  data: Record<string, any>
}

interface PdfSectionInstance {
  instanceId: string
  sectionId: string
  sectionTitle: string
  moduleTitle: string
  groupInstances: PdfGroupInstance[]
}

interface PdfModuleData {
  moduleId: string
  moduleTitle: string
  sections: PdfSectionInstance[]
}

interface PdfExportData {
  formTitle: string
  versionNo: string
  enterpriseName: string
  submitTime: string
  approveTime: string
  modules: PdfModuleData[]
}

// 字段类型定义
interface AttributeDefinition {
  id: string | number
  name: string
  label: string
  type: string
  dictName?: string
  groupId: string | number
  sectionId: string | number
}

// 字典翻译缓存
const dictTranslateCache = new Map<string, string>()

// 字典翻译函数
const translateDictValue = async (dictName: string, value: string): Promise<string> => {
  if (!dictName || !value) {
    return value
  }
  
  const cacheKey = `${dictName}_${value}`
  
  if (dictTranslateCache.has(cacheKey)) {
    return dictTranslateCache.get(cacheKey)!
  }
  
  try {
    const res = await getDictByValue({ dictName, value }, false, false, false)
    
    if (res?.status?.code === 0 && res.payload) {
      const dictItem = res.payload as BizDictVO
      const label = dictItem.label || value
      dictTranslateCache.set(cacheKey, label)
      return label
    }
  } catch (error) {
    console.error('翻译字典项失败:', error)
  }
  
  return value
}

// 格式化字段值显示
const formatAttributeValue = async (value: any, attr: AttributeDefinition): Promise<string> => {
  if (value === null || value === undefined || value === '') {
    return '-'
  }
  
  // 字典类型需要翻译
  if (attr.dictName && attr.type === 'dict') {
    return await translateDictValue(attr.dictName, String(value))
  }
  
  // 日期格式化
  if (attr.type === 'date' && value) {
    return String(value).split('T')[0] // 简单日期格式化
  }
  
  // 布尔值
  if (attr.type === 'boolean') {
    return value === '1' || value === true ? '是' : '否'
  }
  
  return String(value)
}

export function useFormDataPdf() {
  /**
   * 加载所有模块数据用于PDF导出
   */
  const loadAllModulesDataForPdf = async (historyId: string): Promise<PdfExportData | null> => {
    try {
      // 1. 加载历史记录信息
      const historyRes = await formDataHistoryQueryById({ id: historyId }, false, false, true)
      if (!historyRes?.payload) {
        message.error('未找到填报记录')
        return null
      }
      
      const historyInfo = historyRes.payload
      
      // 2. 加载表单模板信息
      const formRes = await formSchemaQueryById({ id: historyInfo.formId }, false, false, true)
      if (!formRes?.payload) {
        message.error('未找到表单模板')
        return null
      }
      
      const formInfo = formRes.payload
      
      // 3. 加载所有模块
      const modulesRes = await formSchemaModuleGeneralSelect({
        conditionList: [
          { property: 'formId', relation: FILTER_TYPE.EQUAL, value: [String(formInfo.id)] },
          { property: 'valid', relation: FILTER_TYPE.EQUAL, value: ['1'] }
        ],
        sortList: [{ property: 'sort', type: 0 }]
      } as any, false, false)
      
      const modules = modulesRes?.payload || []
      
      // 4. 遍历每个模块加载数据
      const pdfModules: PdfModuleData[] = []
      
      for (const module of modules) {
        const moduleData = await loadModuleDataForPdf(historyId, module)
        if (moduleData) {
          pdfModules.push(moduleData)
        }
      }
      
      return {
        formTitle: formInfo.title || '审核报告',
        versionNo: historyInfo.versionNo || '',
        enterpriseName: historyInfo.enterpriseName || '',
        submitTime: historyInfo.submitTime || '',
        approveTime: historyInfo.approveTime || '',
        modules: pdfModules
      }
    } catch (error) {
      console.error('加载PDF数据失败:', error)
      message.error('加载数据失败')
      return null
    }
  }
  
  /**
   * 加载单个模块的数据
   */
  const loadModuleDataForPdf = async (historyId: string, module: any): Promise<PdfModuleData | null> => {
    try {
      // 1. 加载该模块的所有 section
      const sectionsRes = await formSchemaSectionGeneralSelect({
        conditionList: [
          { property: 'moduleId', relation: FILTER_TYPE.EQUAL, value: [String(module.id)] },
          { property: 'valid', relation: FILTER_TYPE.EQUAL, value: ['1'] }
        ],
        sortList: [{ property: 'sort', type: 0 }]
      } as any, false, false)
      
      const sections = sectionsRes?.payload || []
      
      // 2. 批量加载所有 section 的 groups 和 attributes
      const sectionIds = sections.map((s: any) => String(s.id))
      
      const [groupsRes, attrsRes] = await Promise.all([
        formSchemaAttributeGroupGeneralSelect({
          conditionList: [
            { property: 'sectionId', relation: FILTER_TYPE.IN, value: sectionIds },
            { property: 'valid', relation: FILTER_TYPE.EQUAL, value: ['1'] }
          ],
          sortList: [{ property: 'sort', type: 0 }]
        } as any, false, false),
        formSchemaAttributeGeneralSelect({
          conditionList: [
            { property: 'sectionId', relation: FILTER_TYPE.IN, value: sectionIds },
            { property: 'valid', relation: FILTER_TYPE.EQUAL, value: ['1'] }
          ],
          sortList: [{ property: 'sort', type: 0 }]
        } as any, false, false)
      ])
      
      // 构建 sectionId -> groups 映射
      const sectionGroupsMap = new Map<string, any[]>()
      ;(groupsRes?.payload || []).forEach((group: any) => {
        const sid = String(group.sectionId)
        if (!sectionGroupsMap.has(sid)) {
          sectionGroupsMap.set(sid, [])
        }
        sectionGroupsMap.get(sid)!.push(group)
      })
      
      // 构建 sectionId -> attributes 映射
      const sectionAttrsMap = new Map<string, AttributeDefinition[]>()
      ;(attrsRes?.payload || []).forEach((attr: any) => {
        const sid = String(attr.sectionId)
        if (!sectionAttrsMap.has(sid)) {
          sectionAttrsMap.set(sid, [])
        }
        sectionAttrsMap.get(sid)!.push({
          id: attr.id,
          name: attr.name,
          label: attr.label,
          type: attr.type,
          dictName: attr.dictName,
          groupId: attr.groupId,
          sectionId: attr.sectionId
        })
      })
      
      // 3. 加载该 historyId 下该模块的 section instances（通过 sectionId 过滤）
      const sectionInstancesRes = await formDataSectionInstanceGeneralSelect({
        conditionList: [
          { property: 'historyId', relation: FILTER_TYPE.EQUAL, value: [historyId] },
          { property: 'sectionId', relation: FILTER_TYPE.IN, value: sectionIds }
        ]
      } as any, false, false)
      
      const sectionInstances = sectionInstancesRes?.payload || []
      
      // 4. 遍历每个 section instance 加载数据
      const pdfSections: PdfSectionInstance[] = []
      
      for (const instance of sectionInstances) {
        const sectionId = String(instance.sectionId)
        const section = sections.find((s: any) => String(s.id) === sectionId)
        
        if (!section) continue
        
        // 加载 group instances
        const groupInstancesRes = await formDataGroupInstanceGeneralSelect({
          conditionList: [
            { property: 'sectionInstanceId', relation: FILTER_TYPE.EQUAL, value: [String(instance.id)] }
          ],
          sortList: [
            { property: 'groupId', type: 0 },
            { property: 'rowIndex', type: 0 }
          ]
        } as any, false, false)
        
        const groupInstanceIds = (groupInstancesRes?.payload || []).map((gi: any) => String(gi.id))
        
        // 加载字段数据
        const dataMap = new Map<string, any[]>()
        if (groupInstanceIds.length > 0) {
          const dataRes = await formDataGeneralSelect({
            conditionList: [
              { property: 'groupInstanceId', relation: FILTER_TYPE.IN, value: groupInstanceIds },
              { property: 'valid', relation: FILTER_TYPE.EQUAL, value: ['1'] }
            ]
          } as any, false, false)
          
          ;(dataRes?.payload || []).forEach((item: any) => {
            const gid = String(item.groupInstanceId)
            if (!dataMap.has(gid)) {
              dataMap.set(gid, [])
            }
            dataMap.get(gid)!.push(item)
          })
        }
        
        // 组装 group instances 数据
        const pdfGroupInstances: PdfGroupInstance[] = []
        for (const gi of (groupInstancesRes?.payload || [])) {
          const groupInstanceId = String(gi.id)
          const groupId = String(gi.groupId)
          
          const data: Record<string, any> = {}
          const dataItems = dataMap.get(groupInstanceId) || []
          dataItems.forEach((item: any) => {
            if (item.attributeId) {
              data[String(item.attributeId)] = item.value
            }
          })
          
          pdfGroupInstances.push({
            groupInstanceId,
            groupId,
            rowIndex: gi.rowIndex || 0,
            data
          })
        }
        
        pdfSections.push({
          instanceId: String(instance.id),
          sectionId,
          sectionTitle: section.title || '',
          moduleTitle: module.title || '',
          groupInstances: pdfGroupInstances
        })
      }
      
      return {
        moduleId: String(module.id),
        moduleTitle: module.title || '',
        sections: pdfSections
      }
    } catch (error) {
      console.error('加载模块数据失败:', error)
      return null
    }
  }
  
  /**
   * 生成 PDF HTML 内容
   */
  const generatePdfHtml = async (data: PdfExportData): Promise<string> => {
    const sectionsHtml: string[] = []
    
    for (const module of data.modules) {
      for (const section of module.sections) {
        const sectionHtml = await generateSectionHtml(section, module.moduleTitle)
        sectionsHtml.push(sectionHtml)
      }
    }
    
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${data.formTitle}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: "Microsoft YaHei", "SimHei", sans-serif;
      font-size: 12px;
      line-height: 1.6;
      color: #333;
      padding: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #333;
    }
    .header h1 {
      font-size: 24px;
      margin-bottom: 15px;
    }
    .header .meta {
      font-size: 12px;
      color: #666;
    }
    .header .meta span {
      margin: 0 15px;
    }
    .module-title {
      font-size: 16px;
      font-weight: bold;
      background: #f5f5f5;
      padding: 10px 15px;
      margin: 20px 0 10px 0;
      border-left: 4px solid #1890ff;
    }
    .section-title {
      font-size: 14px;
      font-weight: bold;
      padding: 8px 15px;
      margin: 15px 0 10px 0;
      background: #fafafa;
      border-bottom: 1px solid #e8e8e8;
    }
    .group-container {
      margin-bottom: 15px;
    }
    .group-title {
      font-size: 13px;
      font-weight: bold;
      color: #333;
      padding: 5px 10px;
      background: #f9f9f9;
      margin-bottom: 8px;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      table-layout: fixed;
    }
    .data-table th,
    .data-table td {
      border: 1px solid #333;
      padding: 8px 12px;
      text-align: left;
    }
    .data-table th {
      background: #f0f0f0;
      font-weight: bold;
      width: 150px;
    }
    .data-table td {
      background: #fff;
      width: auto;
    }
    .multi-row-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      table-layout: fixed;
    }
    .multi-row-table th,
    .multi-row-table td {
      border: 1px solid #333;
      padding: 6px 10px;
      text-align: left;
    }
    .multi-row-table th {
      background: #f0f0f0;
      font-weight: bold;
    }
    .multi-row-table td {
      background: #fff;
    }
    .table-wrapper {
      border: 1px solid #333;
      margin-bottom: 10px;
    }
    .table-wrapper .data-table,
    .table-wrapper .multi-row-table {
      margin-bottom: 0;
      border: none;
    }
    .table-wrapper .data-table th,
    .table-wrapper .data-table td,
    .table-wrapper .multi-row-table th,
    .table-wrapper .multi-row-table td {
      border: 1px solid #333;
    }
    .row-index {
      width: 50px;
      text-align: center;
      color: #666;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e8e8e8;
      text-align: center;
      color: #999;
      font-size: 11px;
    }
    @media print {
      body {
        padding: 0;
      }
      .module-title {
        page-break-after: avoid;
      }
      .section-title {
        page-break-after: avoid;
      }
      .group-container {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${data.formTitle}</h1>
    <div class="meta">
      ${data.enterpriseName ? `<span>企业名称：${data.enterpriseName}</span>` : ''}
      ${data.versionNo ? `<span>版本号：${data.versionNo}</span>` : ''}
      ${data.submitTime ? `<span>提交时间：${formatDateTime(data.submitTime)}</span>` : ''}
    </div>
  </div>
  
  ${sectionsHtml.join('\n')}
  
  <div class="footer">
    <p>本报告由系统自动生成</p>
    <p>生成时间：${new Date().toLocaleString('zh-CN')}</p>
  </div>
</body>
</html>
    `
  }
  
  /**
   * 生成 Section HTML
   */
  const generateSectionHtml = async (section: PdfSectionInstance, moduleTitle: string): Promise<string> => {
    // 这里需要加载 section 的 groups 和 attributes
    // 由于数据已经在 loadModuleDataForPdf 中加载，这里需要重新获取
    
    const groupsRes = await formSchemaAttributeGroupGeneralSelect({
      conditionList: [
        { property: 'sectionId', relation: FILTER_TYPE.EQUAL, value: [section.sectionId] },
        { property: 'valid', relation: FILTER_TYPE.EQUAL, value: ['1'] }
      ],
      sortList: [{ property: 'sort', type: 0 }]
    } as any, false, false)
    
    const attrsRes = await formSchemaAttributeGeneralSelect({
      conditionList: [
        { property: 'sectionId', relation: FILTER_TYPE.EQUAL, value: [section.sectionId] },
        { property: 'valid', relation: FILTER_TYPE.EQUAL, value: ['1'] }
      ],
      sortList: [{ property: 'sort', type: 0 }]
    } as any, false, false)
    
    const groups = groupsRes?.payload || []
    const attributes: AttributeDefinition[] = (attrsRes?.payload || []).map((attr: any) => ({
      id: attr.id,
      name: attr.name,
      label: attr.label,
      type: attr.type,
      dictName: attr.dictName,
      groupId: attr.groupId,
      sectionId: attr.sectionId
    }))
    
    // 构建树形结构
    const groupTree = buildGroupTree(groups)
    
    const groupsHtml: string[] = []
    
    const renderGroup = async (group: any, level = 0): Promise<string> => {
      const groupId = String(group.id)
      const groupAttrs = attributes.filter(attr => String(attr.groupId) === groupId)
      const groupRows = section.groupInstances.filter(gi => gi.groupId === groupId).sort((a, b) => a.rowIndex - b.rowIndex)
      
      let groupHtml = ''
      
      // 有子分组时，递归渲染
      if (group.children && group.children.length > 0) {
        groupHtml += `<div class="group-title" style="padding-left: ${level * 15}px;">${group.title || ''}</div>`
        for (const child of group.children) {
          groupHtml += await renderGroup(child, level + 1)
        }
        return groupHtml
      }
      
      // 没有字段时跳过
      if (groupAttrs.length === 0) {
        return ''
      }
      
      // 多行模式
      if (group.multi === '1' && groupRows.length > 0) {
        const headerRow = groupAttrs.map(attr => `<th>${attr.label}</th>`).join('')
        
        const dataRows: string[] = []
        for (const row of groupRows) {
          const cells: string[] = []
          for (const attr of groupAttrs) {
            const value = row.data[String(attr.id)]
            const formattedValue = await formatAttributeValue(value, attr)
            cells.push(`<td>${formattedValue}</td>`)
          }
          dataRows.push(`<tr><td class="row-index">${row.rowIndex + 1}</td>${cells.join('')}</tr>`)
        }
        
        groupHtml = `
          <div class="group-container">
            <div class="group-title" style="padding-left: ${level * 15}px;">${group.title || ''}</div>
            <div class="table-wrapper">
              <table class="multi-row-table">
                <thead>
                  <tr><th class="row-index">序号</th>${headerRow}</tr>
                </thead>
                <tbody>
                  ${dataRows.join('\n')}
                </tbody>
              </table>
            </div>
          </div>
        `
      } else if (groupRows.length > 0) {
        // 单行模式 - 表格形式
        const rows: string[] = []
        for (const attr of groupAttrs) {
          const value = groupRows[0].data[String(attr.id)]
          const formattedValue = await formatAttributeValue(value, attr)
          rows.push(`<tr><th>${attr.label}</th><td>${formattedValue}</td></tr>`)
        }
        
        groupHtml = `
          <div class="group-container">
            <div class="group-title" style="padding-left: ${level * 15}px;">${group.title || ''}</div>
            <div class="table-wrapper">
              <table class="data-table">
                <tbody>
                  ${rows.join('\n')}
                </tbody>
              </table>
            </div>
          </div>
        `
      } else {
        // 没有数据
        groupHtml = `
          <div class="group-container">
            <div class="group-title" style="padding-left: ${level * 15}px;">${group.title || ''}</div>
            <div class="table-wrapper">
              <table class="data-table">
                <tbody>
                  ${groupAttrs.map(attr => `<tr><th>${attr.label}</th><td>-</td></tr>`).join('\n')}
                </tbody>
              </table>
            </div>
          </div>
        `
      }
      
      return groupHtml
    }
    
    for (const group of groupTree) {
      const html = await renderGroup(group)
      groupsHtml.push(html)
    }
    
    return `
      <div class="module-title">${moduleTitle}</div>
      <div class="section-title">${section.sectionTitle}</div>
      ${groupsHtml.join('\n')}
    `
  }
  
  /**
   * 构建分组树形结构
   */
  const buildGroupTree = (groups: any[]): any[] => {
    const map = new Map<string, any>()
    const roots: any[] = []
    
    for (const group of groups) {
      map.set(String(group.id), {
        ...group,
        children: []
      })
    }
    
    for (const group of groups) {
      const node = map.get(String(group.id))!
      if (group.pid) {
        const parent = map.get(String(group.pid))
        if (parent) {
          parent.children.push(node)
        } else {
          roots.push(node)
        }
      } else {
        roots.push(node)
      }
    }
    
    // 排序
    const sortNodes = (nodes: any[]) => {
      nodes.sort((a, b) => (a.sort || 0) - (b.sort || 0))
      nodes.forEach(n => sortNodes(n.children))
    }
    sortNodes(roots)
    
    return roots
  }
  
  /**
   * 格式化日期时间
   */
  const formatDateTime = (dateStr: string): string => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateStr
    }
  }
  
  /**
   * 导出 PDF（通过打印）
   * @param historyId 历史记录ID
   * @param options 配置选项
   * @param options.debug 是否开启调试模式（默认false）
   */
  const exportPdf = async (historyId: string, options?: { debug?: boolean }): Promise<boolean> => {
    const isDebug = options?.debug ?? false
    
    try {
      message.loading({ content: '正在生成报告...', key: 'exportPdf' })
      
      // 清空字典缓存
      dictTranslateCache.clear()
      
      // 1. 加载所有数据
      const data = await loadAllModulesDataForPdf(historyId)
      if (!data) {
        message.error({ content: '加载数据失败', key: 'exportPdf' })
        return false
      }
      
      // 2. 生成 HTML
      const html = await generatePdfHtml(data)
      
      if (isDebug) {
        // 调试模式：在新页面打开HTML内容供调试样式
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        
        // 在新标签页中打开
        const debugWindow = window.open(url, '_blank')
        if (debugWindow) {
          debugWindow.addEventListener('load', () => {
            // 页面加载完成后释放 URL 对象
            URL.revokeObjectURL(url)
          })
          message.success({ 
            content: '报告已生成并在新页面打开，您可以调试样式', 
            key: 'exportPdf',
            duration: 5 
          })
        } else {
          message.error({ 
            content: '无法打开调试窗口，请检查浏览器弹窗设置', 
            key: 'exportPdf' 
          })
          return false
        }
      } else {
        // 正常打印模式
        const printWindow = window.open('', '_blank')
        if (!printWindow) {
          message.error({ content: '无法打开打印窗口，请检查浏览器弹窗设置', key: 'exportPdf' })
          return false
        }
        
        printWindow.document.write(html)
        printWindow.document.close()
        
        // 等待内容加载完成后打印
        printWindow.onload = () => {
          printWindow.print()
        }
        
        // 如果 onload 不触发，延迟打印
        setTimeout(() => {
          if (!printWindow.closed) {
            printWindow.print()
          }
        }, 1000)
        
        message.success({ content: '报告已生成，请在打印窗口选择"另存为PDF"', key: 'exportPdf' })
      }
      
      return true
    } catch (error) {
      console.error('导出PDF失败:', error)
      message.error({ content: '导出失败', key: 'exportPdf' })
      return false
    }
  }
  
  /**
   * 调试模式：仅在新页面打开HTML内容，不打印
   * 方便调试样式问题
   */
  const debugPdfHtml = async (historyId: string): Promise<boolean> => {
    try {
      message.loading({ content: '正在生成报告...', key: 'debugPdf' })
      
      // 清空字典缓存
      dictTranslateCache.clear()
      
      // 1. 加载所有数据
      const data = await loadAllModulesDataForPdf(historyId)
      if (!data) {
        message.error({ content: '加载数据失败', key: 'debugPdf' })
        return false
      }
      
      // 2. 生成 HTML
      const html = await generatePdfHtml(data)
      
      // 3. 创建 Blob 对象并在新页面打开
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      
      // 在新标签页中打开
      const debugWindow = window.open(url, '_blank')
      if (debugWindow) {
        debugWindow.addEventListener('load', () => {
          // 页面加载完成后释放 URL 对象
          URL.revokeObjectURL(url)
        })
        message.success({ 
          content: '报告已生成并在新页面打开，您可以调试样式', 
          key: 'debugPdf',
          duration: 5 
        })
        return true
      } else {
        message.error({ 
          content: '无法打开调试窗口，请检查浏览器弹窗设置', 
          key: 'debugPdf' 
        })
        return false
      }
    } catch (error) {
      console.error('调试PDF失败:', error)
      message.error({ content: '生成失败', key: 'debugPdf' })
      return false
    }
  }
  
  return {
    exportPdf,
    debugPdfHtml,  // 新增的调试方法
    loadAllModulesDataForPdf,
    generatePdfHtml
  }
}
