/**
 * 评估表单数据加载 Composable
 * 用于 fill.vue 和 confirm.vue 共享数据加载逻辑
 * 迁移后使用新的 form data API
 */
import { message } from 'ant-design-vue'
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'

import { formDataGroupInstanceGeneralSelect } from '../apis/formDataGroupInstancePortalController'
import { formDataHistoryAdd, formDataHistoryQueryById } from '../apis/formDataHistoryPortalController'
import { formDataGeneralSelect } from '../apis/formDataPortalController'
import { formDataSectionInstanceGeneralSelect } from '../apis/formDataSectionInstancePortalController'
import { formSchemaAttributeGroupGeneralSelect } from '../apis/formSchemaAttributeGroupPortalController'
import { formSchemaAttributeGeneralSelect } from '../apis/formSchemaAttributePortalController'
import { formSchemaModuleGeneralSelect } from '../apis/formSchemaModulePortalController'
import { formSchemaGeneralSelect, formSchemaQueryById } from '../apis/formSchemaPortalController'
import { formSchemaSectionGeneralSelect } from '../apis/formSchemaSectionPortalController'

import { getDictByValue } from '@/framework/apis/dict/bizDictController'
import type { BizDictVO } from '@/framework/apis/dict/bizDictController'
import { FILTER_TYPE } from '@/framework/components/common/Portal/type'

// 类型定义
export interface SectionInstance {
  sectionId: string
  instanceId: string
  section: any
}

export interface GroupInstanceData {
  groupInstanceId: string
  groupId: string
  rowIndex: number
  data: Record<string, any>
}

export interface GroupProgress {
  filled: number
  total: number
  percent: number
}

export interface SectionProgress {
  completed: number
  total: number
  percent: number
}

export interface RequiredParseResult {
  type: 'none' | 'simple' | 'flag'
  flag?: string
  min?: number
  max?: number
}

export interface MutualExclusiveGroup {
  flag: string
  groups: any[]
  selectedGroupId?: string
}

export function useEvalFormData() {
  const route = useRoute()

  // 权限和状态（迁移后不再需要 enterpriseId）
  const enterpriseId = ref<string | null>(null)
  const enterpriseName = ref<string>('')
  const canEdit = ref(false)
  const hasPermission = ref(true)
  const recordNotFound = ref(false)
  const loading = ref(false)

  // 填写历史记录信息
  const historyId = ref<string>('')
  const historyInfo = ref<any>(null)
  const formInfo = ref<any>(null) // 表单模板信息（替代 productInfo）

  // 延迟创建模式：是否延迟创建 historyId
  const lazyCreate = ref(false)
  // 本地暂存数据（延迟创建模式下使用）
  const localSectionInstances = ref<SectionInstance[]>([])
  const localGroupInstances = ref<Record<string, GroupInstanceData[]>>({})
  const localSavedSectionData = ref<Record<string, any>>({})

  // 模块数据
  const modules = ref<any[]>([])
  const currentModuleIndex = ref(0)
  const loadingModules = ref(false)

  // 当前模块
  const currentModule = computed(() => modules.value[currentModuleIndex.value])

  // Sections
  const availableSections = ref<any[]>([])
  const loadingSections = ref(false)
  const sectionInstances = ref<SectionInstance[]>([])
  const savedSectionData = ref<Record<string, any>>({})
  const sectionGroups = ref<Record<string, any[]>>({})
  const sectionAttributes = ref<Record<string, any[]>>({})

  // Group Instances
  const groupInstances = ref<Record<string, GroupInstanceData[]>>({})

  // 是否有多个section（基于section数量而不是module属性）
  const isMultiSection = computed(() => availableSections.value.length > 1)

  // 当前选中的 Section Instance ID
  const currentSectionInstanceId = ref<string | null>(null)

  // 互斥选项选中状态
  const selectedMutualOptions = ref<Record<string, string>>({}) // flag -> groupId

  // 页面标题
  const pageTitle = computed(() => {
    if (!formInfo.value) return '表单数据'
    const versionNo = historyInfo.value?.versionNo || ''
    return `${formInfo.value.title || '表单'}${versionNo ? ' - ' + versionNo : ''}`
  })

  // 加载历史记录信息
  const loadHistoryInfo = async () => {
    if (!historyId.value) return

    loading.value = true
    try {
      const res = await formDataHistoryQueryById(
        { id: historyId.value },
        false,
        false,
        true
      )

      if (res?.status?.code === 0 && res.payload) {
        historyInfo.value = res.payload
        
        if (historyInfo.value?.formId) {
          await loadFormInfo(String(historyInfo.value.formId))
        }
      } else {
        message.error('未找到填报记录')
        return false
      }
    } catch (error) {
      console.error('加载填报记录失败:', error)
      message.error('加载填报记录失败')
      return false
    } finally {
      loading.value = false
    }
    return true
  }

  // 加载表单模板信息（通过 ID）
  const loadFormInfo = async (formId: string) => {
    try {
      const res = await formSchemaQueryById(
        { id: formId },
        false,
        false,
        true
      )

      if (res?.status?.code === 0 && res.payload) {
        formInfo.value = res.payload
        // 传递 formId 给 loadModules，确保新增模式下也能正确加载
        await loadModules(String(formInfo.value.id))
      }
    } catch (error) {
      console.error('加载表单模板失败:', error)
    }
  }

  // 加载表单模板信息（通过 Code）
  const loadFormInfoByCode = async (formCode: string) => {
    try {
      const res = await formSchemaGeneralSelect(
        {
          conditionList: [
            { property: 'code', relation: FILTER_TYPE.EQUAL, value: [formCode] },
            { property: 'valid', relation: FILTER_TYPE.EQUAL, value: ['1'] }
          ]
        },
        false,
        false,
        true
      )

      if (res?.status?.code === 0 && res.payload && res.payload.length > 0) {
        formInfo.value = res.payload[0]
        // 传递 formId 给 loadModules，确保新增模式下也能正确加载
        await loadModules(String(formInfo.value.id))
        return true
      } else {
        message.error('未找到表单模板')
        return false
      }
    } catch (error) {
      console.error('加载表单模板失败:', error)
      return false
    }
  }

  // 加载模块列表
  const loadModules = async (formId?: string) => {
    // 优先使用传入的 formId，其次使用 historyInfo 中的 formId
    const targetFormId = formId || historyInfo.value?.formId
    if (!targetFormId) return
    
    loadingModules.value = true
    try {
      const res = await formSchemaModuleGeneralSelect({
        conditionList: [
          { property: 'formId', relation: FILTER_TYPE.EQUAL, value: [String(targetFormId)] },
          { property: 'valid', relation: FILTER_TYPE.EQUAL, value: ['1'] }
        ],
        orderList: [{ property: 'sort', type: 0 }]
      } as any, false, false)
      
      if (res?.payload) {
        modules.value = res.payload
        if (modules.value.length > 0) {
          await loadCurrentModuleData()
        }
      }
    } catch (error) {
      message.error('加载模块列表失败')
    } finally {
      loadingModules.value = false
    }
  }

  // 加载当前模块的数据
  const loadCurrentModuleData = async () => {
    if (!currentModule.value) return
    
    await loadAvailableSections()
    await loadSectionInstances()
  }

  // 加载可用的sections
  const loadAvailableSections = async () => {
    if (!currentModule.value) return
    
    loadingSections.value = true
    try {
      console.log('[DEBUG] loadAvailableSections - 开始加载sections, moduleId:', currentModule.value.id)
      
      const res = await formSchemaSectionGeneralSelect({
        conditionList: [
          { property: 'moduleId', relation: FILTER_TYPE.EQUAL, value: [currentModule.value.id] },
          { property: 'valid', relation: FILTER_TYPE.EQUAL, value: ['1'] }
        ],
        orderList: [{ property: 'sort', type: 0 }]
      } as any, false, false)
      
      console.log('[DEBUG] loadAvailableSections - sections API返回:', res)
      
      if (res?.payload && res.payload.length > 0) {
        availableSections.value = res.payload
        console.log('[DEBUG] loadAvailableSections - 加载到sections数量:', availableSections.value.length)
        
        // 收集所有 sectionId（转换为字符串）
        const sectionIds = availableSections.value.map(section => String(section.id))
        console.log('[DEBUG] loadAvailableSections - 收集到的sectionIds:', sectionIds)
        
        // 批量加载分组配置和属性定义
        console.log('[DEBUG] loadAvailableSections - 开始并行加载分组和属性')
        await Promise.all([
          loadAllSectionGroups(sectionIds),
          loadAllSectionAttributes(sectionIds)
        ])
        console.log('[DEBUG] loadAvailableSections - 批量加载完成')
      } else {
        console.warn('[DEBUG] loadAvailableSections - 没有找到sections')
      }
    } catch (error) {
      console.error('[DEBUG] loadAvailableSections - 加载区块列表失败:', error)
    } finally {
      loadingSections.value = false
    }
  }

  // 批量加载所有section的分组配置
  const loadAllSectionGroups = async (sectionIds: string[]) => {
    try {
      console.log('[DEBUG] loadAllSectionGroups - 开始批量加载分组配置, sectionIds:', sectionIds)
      
      const res = await formSchemaAttributeGroupGeneralSelect({
        conditionList: [
          { property: 'sectionId', relation: FILTER_TYPE.IN, value: sectionIds },
          { property: 'valid', relation: FILTER_TYPE.EQUAL, value: ['1'] }
        ],
        orderList: [{ property: 'sort', type: 0 }]
      } as any, false, false)
      
      console.log('[DEBUG] loadAllSectionGroups - API返回结果:', res)
      
      if (res?.payload) {
        console.log('[DEBUG] loadAllSectionGroups - payload数据量:', res.payload.length)
        
        // 按 sectionId 分组存储
        const groupMap = new Map<string, any[]>()
        res.payload.forEach((group: any) => {
          const sid = String(group.sectionId)
          if (!groupMap.has(sid)) {
            groupMap.set(sid, [])
          }
          groupMap.get(sid)!.push(group)
        })
        
        console.log('[DEBUG] loadAllSectionGroups - 分组后的Map:', Array.from(groupMap.entries()).map(([k, v]) => ({ sectionId: k, count: v.length })))
        
        // 存储到 sectionGroups
        sectionIds.forEach(sectionId => {
          const sid = String(sectionId) // 确保类型一致
          sectionGroups.value[sectionId] = groupMap.get(sid) || []
          console.log(`[DEBUG] loadAllSectionGroups - 存储到 sectionGroups[${sectionId}]:`, sectionGroups.value[sectionId]?.length || 0, '个分组')
        })
      } else {
        console.warn('[DEBUG] loadAllSectionGroups - 没有返回payload数据')
      }
    } catch (error) {
      console.error('[DEBUG] loadAllSectionGroups - 加载分组配置失败:', error)
    }
  }

  // 批量加载所有section的属性定义
  const loadAllSectionAttributes = async (sectionIds: string[]) => {
    try {
      const res = await formSchemaAttributeGeneralSelect({
        conditionList: [
          { property: 'sectionId', relation: FILTER_TYPE.IN, value: sectionIds },
          { property: 'valid', relation: FILTER_TYPE.EQUAL, value: ['1'] }
        ],
        orderList: [{ property: 'sort', type: 0 }]
      } as any, false, false)
      
      if (res?.payload) {
        // 按 sectionId 分组存储
        const attrMap = new Map<string, any[]>()
        res.payload.forEach((attr: any) => {
          const sid = String(attr.sectionId)
          if (!attrMap.has(sid)) {
            attrMap.set(sid, [])
          }
          attrMap.get(sid)!.push(attr)
        })
        
        // 存储到 sectionAttributes
        sectionIds.forEach(sectionId => {
          sectionAttributes.value[sectionId] = attrMap.get(String(sectionId)) || []
        })
      }
    } catch (error) {
      console.error('加载字段定义失败:', error)
    }
  }

  // 加载单个section的分组配置（保留用于兼容性）
  const loadSectionGroups = async (sectionId: string) => {
    try {
      const res = await formSchemaAttributeGroupGeneralSelect({
        conditionList: [
          { property: 'sectionId', relation: FILTER_TYPE.EQUAL, value: [sectionId] },
          { property: 'valid', relation: FILTER_TYPE.EQUAL, value: ['1'] }
        ],
        orderList: [{ property: 'sort', type: 0 }]
      } as any, false, false)
      
      if (res?.payload) {
        // 存储扁平数组（用于兼容现有逻辑）
        sectionGroups.value[sectionId] = res.payload
      }
    } catch (error) {
      console.error('加载分组配置失败:', error)
    }
  }

  // 加载单个section的属性定义（保留用于兼容性）
  const loadSectionAttributes = async (sectionId: string) => {
    try {
      const res = await formSchemaAttributeGeneralSelect({
        conditionList: [
          { property: 'sectionId', relation: FILTER_TYPE.EQUAL, value: [sectionId] },
          { property: 'valid', relation: FILTER_TYPE.EQUAL, value: ['1'] }
        ],
        orderList: [{ property: 'sort', type: 0 }]
      } as any, false, false)
      
      if (res?.payload) {
        sectionAttributes.value[sectionId] = res.payload
      }
    } catch (error) {
      console.error('加载字段定义失败:', error)
    }
  }

  // 加载已保存的section实例
  const loadSectionInstances = async () => {
    if (!currentModule.value || !historyId.value) return
    
    try {
      const res = await formDataSectionInstanceGeneralSelect({
        conditionList: [
          { property: 'historyId', relation: FILTER_TYPE.EQUAL, value: [historyId.value] }
        ]
      } as any, false, false)
      
      if (res?.payload) {
        savedSectionData.value = {}
        const loadedInstances: SectionInstance[] = []
        
        for (const instance of res.payload) {
          const instanceId = String(instance.id)
          savedSectionData.value[instanceId] = instance
          
          const section = availableSections.value.find(s => Number(s.id) === Number(instance.sectionId))
          
          if (section) {
            loadedInstances.push({
              sectionId: String(instance.sectionId),
              instanceId,
              section
            })
            
            await loadGroupInstances(instanceId)
          }
        }
        
        if (loadedInstances.length > 0) {
          sectionInstances.value = loadedInstances
        }
      }
    } catch (error) {
      console.error('加载表单实例失败:', error)
    }
  }

  // 加载section实例的 Group Instances 数据
  const loadGroupInstances = async (sectionInstanceId: string) => {
    try {
      const instance = savedSectionData.value[sectionInstanceId]
      if (!instance) return

      const groupInstancesRes = await formDataGroupInstanceGeneralSelect({
        conditionList: [
          { property: 'sectionInstanceId', relation: FILTER_TYPE.EQUAL, value: [sectionInstanceId] }
        ],
        orderList: [
          { property: 'groupId', type: 0 },
          { property: 'rowIndex', type: 0 }
        ]
      } as any, false, false)

      if (!groupInstancesRes?.payload || groupInstancesRes.payload.length === 0) {
        return
      }

      // 收集所有 groupInstanceId
      const groupInstanceIds = groupInstancesRes.payload.map((gi: any) => String(gi.id))

      // 使用 IN 批量查询所有数据
      const dataRes = await formDataGeneralSelect({
        conditionList: [
          { property: 'groupInstanceId', relation: FILTER_TYPE.IN, value: groupInstanceIds },
          { property: 'valid', relation: FILTER_TYPE.EQUAL, value: ['1'] }
        ]
      } as any, false, false)

      // 构建 groupInstanceId -> data[] 的映射
      const dataMap = new Map<string, any[]>()
      if (dataRes?.payload) {
        dataRes.payload.forEach((item: any) => {
          const gid = String(item.groupInstanceId)
          if (!dataMap.has(gid)) {
            dataMap.set(gid, [])
          }
          dataMap.get(gid)!.push(item)
        })
      }

      // 组装最终数据
      const instances: GroupInstanceData[] = []
      for (const gi of groupInstancesRes.payload) {
        const groupInstanceId = String(gi.id)
        const groupId = String(gi.groupId)

        const data: Record<string, any> = {}
        const dataItems = dataMap.get(groupInstanceId) || []
        dataItems.forEach((item: any) => {
          if (item.attributeId) {
            data[String(item.attributeId)] = item.value
          }
        })

        instances.push({
          groupInstanceId,
          groupId,
          rowIndex: gi.rowIndex || 0,
          data
        })
      }

      groupInstances.value[sectionInstanceId] = instances
    } catch (error) {
      console.error('加载 Group Instances 失败:', error)
    }
  }

  // 获取某个 group 的所有行数据
  const getGroupRows = (sectionInstanceId: string, groupId: string) => {
    const instances = groupInstances.value[sectionInstanceId] || []
    return instances
      .filter(gi => gi.groupId === groupId)
      .sort((a, b) => a.rowIndex - b.rowIndex)
      .map(gi => ({
        groupInstanceId: gi.groupInstanceId,
        rowIndex: gi.rowIndex,
        data: gi.data
      }))
  }

  // 获取某个 group 的字段列表
  const getGroupAttributes = (sectionId: string | number, groupId: string) => {
    const attributes = sectionAttributes.value[String(sectionId)] || []
    return attributes.filter(attr => String(attr.groupId) === groupId)
  }

  // 解析 required 字段
  const parseRequired = (required?: string): RequiredParseResult => {
    if (!required || required === '0') {
      return { type: 'none' }
    } else if (required === '1') {
      return { type: 'simple' }
    } else if (required.includes('###')) {
      const parts = required.split('###')
      return {
        type: 'flag',
        flag: parts[0] || '',
        min: parseInt(parts[1]) || 1,
        max: parts[2] ? parseInt(parts[2]) : undefined
      }
    }
    return { type: 'none' }
  }

  // 计算 Group 填写进度
  const getGroupProgress = (sectionInstanceId: string, groupId: string): GroupProgress => {
    const instances = groupInstances.value[sectionInstanceId] || []
    const groupInsts = instances.filter(gi => gi.groupId === groupId)
    const sectionId = savedSectionData.value[sectionInstanceId]?.sectionId
    if (!sectionId) return { filled: 0, total: 0, percent: 0 }
    
    const attributes = getGroupAttributes(String(sectionId), groupId)
    const requiredAttrs = attributes.filter(a => a.isRequired === '1')
    
    // 如果没有必填字段，统计所有字段
    const attrsToCount = requiredAttrs.length > 0 ? requiredAttrs : attributes
    const total = attrsToCount.length * Math.max(1, groupInsts.length)
    
    let filled = 0
    for (const inst of groupInsts) {
      for (const attr of attrsToCount) {
        const value = inst.data[String(attr.id)]
        if (value !== undefined && value !== null && value !== '') {
          filled++
        }
      }
    }
    
    return {
      filled,
      total,
      percent: total > 0 ? Math.round(filled / total * 100) : 0
    }
  }

  // 计算 Section 填写进度
  const getSectionProgress = (sectionInstanceId: string): SectionProgress => {
    const instance = savedSectionData.value[sectionInstanceId]
    if (!instance) return { completed: 0, total: 0, percent: 0 }
    
    const sectionId = String(instance.sectionId)
    const groups = sectionGroups.value[sectionId] || []
    
    let completedGroups = 0
    for (const group of groups) {
      const progress = getGroupProgress(sectionInstanceId, String(group.id))
      if (progress.percent === 100) completedGroups++
    }
    
    return {
      completed: completedGroups,
      total: groups.length,
      percent: groups.length > 0 ? Math.round(completedGroups / groups.length * 100) : 0
    }
  }

  // 获取互斥 Group 分组
  const getMutualExclusiveGroups = (sectionId: string | number): MutualExclusiveGroup[] => {
    const groups = sectionGroups.value[String(sectionId)] || []
    const flagGroups = new Map<string, any[]>()
    
    for (const group of groups) {
      const parsed = parseRequired(group.required)
      if (parsed.type === 'flag' && parsed.flag && parsed.max === 1) {
        if (!flagGroups.has(parsed.flag)) {
          flagGroups.set(parsed.flag, [])
        }
        flagGroups.get(parsed.flag)!.push(group)
      }
    }
    
    // 只返回有多个选项的互斥组
    return Array.from(flagGroups.entries())
      .filter(([_, groups]) => groups.length > 1)
      .map(([flag, groups]) => ({ 
        flag, 
        groups,
        selectedGroupId: selectedMutualOptions.value[flag]
      }))
  }

  // 设置互斥选项
  const setMutualOption = (flag: string, groupId: string) => {
    selectedMutualOptions.value[flag] = groupId
  }

  // 检查 Group 是否应该显示（基于互斥规则）
  const shouldShowGroup = (sectionId: string | number, groupId: string): boolean => {
    const groups = sectionGroups.value[String(sectionId)] || []
    const group = groups.find(g => String(g.id) === groupId)
    if (!group) return true
    
    const parsed = parseRequired(group.required)
    if (parsed.type !== 'flag' || !parsed.flag || parsed.max !== 1) {
      return true // 不是互斥规则，始终显示
    }
    
    // 检查是否是互斥组
    const mutualGroups = getMutualExclusiveGroups(sectionId)
    const mutualGroup = mutualGroups.find(mg => mg.flag === parsed.flag)
    if (!mutualGroup || mutualGroup.groups.length <= 1) {
      return true // 不是互斥组或只有一个选项
    }
    
    // 检查是否是当前选中的选项
    const selectedId = selectedMutualOptions.value[parsed.flag]
    if (!selectedId) {
      // 没有选中任何选项，默认显示第一个
      return String(mutualGroup.groups[0].id) === groupId
    }
    
    return selectedId === groupId
  }

  // 获取可见的 Groups（过滤掉互斥的 Groups）
  const getVisibleGroups = (sectionId: string | number) => {
    const groups = sectionGroups.value[String(sectionId)] || []
    return groups.filter(group => shouldShowGroup(sectionId, String(group.id)))
  }
  
  // 构建 Group 树形结构（只包含可见的分组，过滤掉父分组被隐藏的子分组）
  const buildGroupTree = (groups: any[], allGroups: any[]) => {
    const map = new Map<string, any>()
    const roots: any[] = []
    
    // 第一遍：创建所有可见节点
    for (const group of groups) {
      map.set(String(group.id), {
        ...group,
        children: []
      })
    }
    
    // 第二遍：建立父子关系，过滤掉父分组被隐藏的子分组
    for (const group of groups) {
      const node = map.get(String(group.id))!
      if (group.pid) {
        // 有父分组
        if (map.has(String(group.pid))) {
          // 父分组可见，添加为子节点
          map.get(String(group.pid))!.children.push(node)
        } else {
          // 父分组被隐藏（不在可见列表中），检查父分组是否存在于全部分组中
          const parentExists = allGroups.some(g => String(g.id) === String(group.pid))
          if (!parentExists) {
            // 父分组不存在（实际上是根节点），添加到根列表
            roots.push(node)
          }
          // 父分组存在但被隐藏，不添加这个子分组（它也应该被隐藏）
        }
      } else {
        // 没有父分组，是根节点
        roots.push(node)
      }
    }
    
    // 按 sort 排序
    const sortNodes = (nodes: any[]) => {
      nodes.sort((a, b) => (a.sort || 0) - (b.sort || 0))
      nodes.forEach(n => sortNodes(n.children))
    }
    sortNodes(roots)
    
    return roots
  }
  
  // 获取树形结构的 Groups（用于渲染）
  const getGroupTree = (sectionId: string | number) => {
    const allGroups = sectionGroups.value[String(sectionId)] || []
    const flatGroups = getVisibleGroups(sectionId)
    return buildGroupTree(flatGroups, allGroups)
  }

  // 切换模块
  const handleModuleChange = async (index: number) => {
    currentModuleIndex.value = index
    sectionInstances.value = []
    await loadCurrentModuleData()
  }

  // 延迟创建模式下创建 historyId
  const createHistoryId = async (): Promise<string | null> => {
    if (!formInfo.value) {
      message.error('表单模板信息未加载')
      return null
    }
    
    console.log('[createHistoryId] formInfo:', formInfo.value)
    console.log('[createHistoryId] formInfo.id:', formInfo.value.id)
    
    try {
      // formId 可能是 UUID 字符串或数字，保持原样传递
      const formIdValue = formInfo.value.id
      const requestData: any = {
        formId: typeof formIdValue === 'string' ? formIdValue : Number(formIdValue),
        status: '0' // 草稿状态
      }
      console.log('[createHistoryId] 请求数据:', requestData)
      
      const createRes = await formDataHistoryAdd(
        requestData,
        false,
        false,
        true
      )
      
      console.log('[createHistoryId] 响应:', createRes)
      
      if (createRes?.status?.code === 0 && createRes.payload) {
        const newHistoryId = String(createRes.payload.id || createRes.payload)
        historyId.value = newHistoryId
        historyInfo.value = {
          id: newHistoryId,
          formId: formIdValue,
          status: '0'
        }
        return newHistoryId
      }
      return null
    } catch (error) {
      console.error('创建填报记录失败:', error)
      return null
    }
  }

  // 字典翻译缓存
  const dictTranslateCache = new Map<string, string>()
  const translatePendingPromises = new Map<string, Promise<string>>()

  // 字典翻译函数
  const translateDictValue = async (dictName: string, value: string): Promise<string> => {
    if (!dictName || !value) {
      return value
    }
    
    const cacheKey = `${dictName}_${value}`
    
    if (dictTranslateCache.has(cacheKey)) {
      return dictTranslateCache.get(cacheKey)!
    }
    
    if (translatePendingPromises.has(cacheKey)) {
      return await translatePendingPromises.get(cacheKey)!
    }
    
    const promise = (async () => {
      try {
        const res = await getDictByValue(
          { dictName, value },
          false,
          false,
          false
        )
        
        if (res?.status?.code === 0 && res.payload) {
          const dictItem = res.payload as BizDictVO
          const label = dictItem.label || value
          dictTranslateCache.set(cacheKey, label)
          return label
        }
      } catch (error) {
        console.error('翻译字典项失败:', error)
      } finally {
        translatePendingPromises.delete(cacheKey)
      }
      
      return value
    })()
    
    translatePendingPromises.set(cacheKey, promise)
    
    return await promise
  }

  // 初始化数据
  const initData = async (options: { forceReadonly?: boolean; formId?: string; formCode?: string; historyId?: string; lazyCreate?: boolean } = {}) => {
    // 优先使用传入的 formId/formCode，其次从 URL 获取
    const formIdFromUrl = route.query.formId as string
    const formCodeFromUrl = route.query.formCode as string
    const formId = options.formId || formIdFromUrl
    const formCode = options.formCode || formCodeFromUrl
    
    // 优先使用传入的 historyId，其次从 URL 获取
    const historyIdFromUrl = route.query.historyId as string
    historyId.value = options.historyId || historyIdFromUrl || ''
    
    // 设置延迟创建模式
    lazyCreate.value = options.lazyCreate ?? false

    // 新增模式：有 formCode 或 formId，没有 historyId
    if (!historyId.value && (formCode || formId)) {
      loading.value = true
      try {
        // 1. 先加载表单模板信息（优先使用 formCode）
        let loadSuccess = false
        if (formCode) {
          loadSuccess = await loadFormInfoByCode(formCode)
        } else if (formId) {
          await loadFormInfo(formId)
          loadSuccess = !!formInfo.value
        }
        
        if (!loadSuccess || !formInfo.value) {
          message.error('表单模板不存在')
          return false
        }
        
        // 2. 延迟创建模式：不立即创建 historyId，只设置编辑权限
        if (lazyCreate.value) {
          canEdit.value = options.forceReadonly ? false : true
          return true
        }
        
        // 3. 非延迟创建模式：立即创建新的填报记录
        const formIdValue = formInfo.value.id // 使用加载后的表单 ID
        const createRes = await formDataHistoryAdd(
          {
            formId: formIdValue,
            status: '0' // 草稿状态
          },
          false, // 不显示成功提示
          false,
          true
        )
        
        if (createRes?.status?.code === 0 && createRes.payload) {
          // 4. 获取新创建的 historyId
          historyId.value = String(createRes.payload.id || createRes.payload)
          historyInfo.value = {
            id: historyId.value,
            formId: formIdValue,
            status: '0'
          }
          
          // 5. 模块数据已在 loadFormInfo 中加载，设置编辑权限
          canEdit.value = options.forceReadonly ? false : true
          return true
        } else {
          message.error('创建填报记录失败')
          return false
        }
      } catch (error) {
        console.error('新增模式初始化失败:', error)
        message.error('初始化失败')
        return false
      } finally {
        loading.value = false
      }
    }
    
    // 编辑/查看模式：有 historyId
    if (!historyId.value) {
      message.error('缺少填报记录ID或表单模板ID')
      return false
    }

    try {
      // 直接加载历史记录信息
      const success = await loadHistoryInfo()
      
      if (success) {
        canEdit.value = options.forceReadonly ? false : (historyInfo.value?.status === '0' || historyInfo.value?.status === '2')
      }
      
      return success
    } catch (error) {
      console.error('初始化失败:', error)
      recordNotFound.value = true
      loading.value = false
      return false
    }
  }

  return {
    // 状态
    enterpriseId,
    enterpriseName,
    canEdit,
    hasPermission,
    recordNotFound,
    loading,
    historyId,
    historyInfo,
    formInfo,
    modules,
    currentModuleIndex,
    loadingModules,
    currentModule,
    availableSections,
    loadingSections,
    sectionInstances,
    savedSectionData,
    sectionGroups,
    sectionAttributes,
    groupInstances,
    isMultiSection,
    pageTitle,
    currentSectionInstanceId,
    selectedMutualOptions,
    // 延迟创建模式
    lazyCreate,
    localSectionInstances,
    localGroupInstances,
    localSavedSectionData,
    
    // 方法
    loadHistoryInfo,
    loadFormInfo,
    loadFormInfoByCode,
    loadModules,
    loadCurrentModuleData,
    loadAvailableSections,
    loadSectionGroups,
    loadSectionAttributes,
    loadSectionInstances,
    loadGroupInstances,
    getGroupRows,
    getGroupAttributes,
    handleModuleChange,
    translateDictValue,
    initData,
    createHistoryId,
    // 进度计算
    parseRequired,
    getGroupProgress,
    getSectionProgress,
    // 互斥选项
    getMutualExclusiveGroups,
    setMutualOption,
    shouldShowGroup,
    getVisibleGroups,
    // 树形结构
    buildGroupTree,
    getGroupTree
  }
}
