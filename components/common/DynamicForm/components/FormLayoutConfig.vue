<script setup lang="ts">
import { DownOutlined, RightOutlined, EditOutlined, CopyOutlined, DatabaseOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { ref, watch, computed } from 'vue'

import GroupTreeNode from './GroupTreeNode.vue'
import MatrixMappingModal from './MatrixMappingModal.vue'
import {
  formSchemaAttributeGroupGeneralSelect
} from '../apis/formSchemaAttributeGroupPortalController'
import {
  formSchemaAttributeGeneralSelect
} from '../apis/formSchemaAttributePortalController'
import {
  formSchemaModuleGeneralSelect
} from '../apis/formSchemaModulePortalController'
import {
  formSchemaSectionGeneralSelect
} from '../apis/formSchemaSectionPortalController'

import { FILTER_TYPE } from '@/framework/components/common/Portal/type'


// 换行符转 HTML
const strLF2HtmlLF = (str: string) => {
  if (str && typeof str === 'string') {
    return str.replace(/\n|\\n/g, '<br/>')
  }
  return str
}

interface Props {
  formId: string
  formCode?: string  // 表单编码，用于生成表名前缀
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  formCode: undefined,
  readonly: false
})

const emit = defineEmits<{
  (e: 'editModule', module: any): void
  (e: 'editSection', section: any): void
  (e: 'editGroup', group: any): void
  (e: 'editAttribute', attribute: any): void
}>()

// 字段类型名称映射
const fieldTypeNames: Record<string, string> = {
  '-2': '区域标题',
  '-1': '分割线',
  '1': '文本输入',
  '2': '开关',
  '3': '数值',
  '4': '下拉选择',
  '5': '树形选择',
  '6': '日期',
  '7': '日期时间',
  '8': '超链接',
  '9': 'HTML',
  '10': '文本域',
  '12': '图片',
  '13': '视频',
  '14': '音频',
  '15': '文件',
  '18': '下拉多选',
  '19': '树形多选'
}

// 获取字段类型名称
const getFieldTypeName = (type: string) => {
  return fieldTypeNames[type] || `类型${type}`
}

// 完整的层级数据
const modules = ref<any[]>([])
const loading = ref(false)

// 展开状态
const expandedModules = ref<Set<string>>(new Set())
const expandedSections = ref<Set<string>>(new Set())
const expandedGroups = ref<Set<string>>(new Set())

// 右键菜单状态
const contextMenuVisible = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })
const contextMenuTarget = ref<any>(null)
const contextMenuType = ref<'module' | 'section' | 'group' | 'attribute'>('attribute')

// 矩阵映射弹窗状态
const matrixMappingVisible = ref(false)
const currentMappingSection = ref<any>(null)

// 构建分组树形结构（支持递归）
const buildGroupTree = (groups: any[]) => {
  const map = new Map<string, any>()
  const roots: any[] = []
  
  // 第一遍：创建所有节点
  for (const group of groups) {
    map.set(String(group.id), {
      ...group,
      children: [],
      attributes: []
    })
  }
  
  // 第二遍：建立父子关系
  for (const group of groups) {
    const node = map.get(String(group.id))!
    if (group.pid && map.has(String(group.pid))) {
      map.get(String(group.pid))!.children.push(node)
    } else {
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

// 加载完整数据
const loadAllData = async () => {
  loading.value = true
  try {
    // 1. 加载模块
    const modulesRes = await formSchemaModuleGeneralSelect({
      conditionList: [
        { property: 'formId', relation: FILTER_TYPE.EQUAL, value: [props.formId] },
        { property: 'valid', relation: FILTER_TYPE.EQUAL, value: ['1'] }
      ],
      orderList: [{ property: 'sort', type: 0 }]
    } as any, false, false)

    if (modulesRes?.payload) {
      modules.value = modulesRes.payload

      // 2. 为每个模块加载区块
      for (const module of modules.value) {
        const sectionsRes = await formSchemaSectionGeneralSelect({
          conditionList: [
            { property: 'moduleId', relation: FILTER_TYPE.EQUAL, value: [module.id] },
            { property: 'valid', relation: FILTER_TYPE.EQUAL, value: ['1'] }
          ],
          orderList: [{ property: 'sort', type: 0 }]
        } as any, false, false)

        module.sections = sectionsRes?.payload || []

        // 3. 为每个区块加载分组和属性
        for (const section of module.sections) {
          // 加载所有分组（包括嵌套的）
          const groupsRes = await formSchemaAttributeGroupGeneralSelect({
            conditionList: [
              { property: 'sectionId', relation: FILTER_TYPE.EQUAL, value: [section.id] },
              { property: 'valid', relation: FILTER_TYPE.EQUAL, value: ['1'] }
            ],
            orderList: [{ property: 'sort', type: 0 }]
          } as any, false, false)

          const allGroups = groupsRes?.payload || []
          
          // 加载属性
          const attrsRes = await formSchemaAttributeGeneralSelect({
            conditionList: [
              { property: 'sectionId', relation: FILTER_TYPE.EQUAL, value: [section.id] },
              { property: 'valid', relation: FILTER_TYPE.EQUAL, value: ['1'] }
            ],
            orderList: [{ property: 'sort', type: 0 }]
          } as any, false, false)

          const allAttributes = attrsRes?.payload || []
          section.allAttributes = allAttributes

          // 构建分组树
          section.groupTree = buildGroupTree(allGroups, allGroups)
          
          // 为每个分组关联属性
          const assignAttributesToGroups = (groups: any[]) => {
            for (const group of groups) {
              group.attributes = allAttributes.filter((attr: any) => String(attr.groupId) === String(group.id))
              if (group.children?.length > 0) {
                assignAttributesToGroups(group.children)
              }
            }
          }
          assignAttributesToGroups(section.groupTree)
          
          // 未分组的属性
          section.ungroupedAttributes = allAttributes.filter((attr: any) => !attr.groupId)
          
          // 统计总分组数（包括嵌套）
          const countGroups = (groups: any[]): number => {
            let count = groups.length
            for (const g of groups) {
              if (g.children?.length > 0) {
                count += countGroups(g.children)
              }
            }
            return count
          }
          section.groupCount = countGroups(section.groupTree)
        }
      }
    }
  } catch (error) {
    console.error('加载数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 切换展开状态
const toggleModule = (moduleId: string) => {
  if (expandedModules.value.has(moduleId)) {
    expandedModules.value.delete(moduleId)
  } else {
    expandedModules.value.add(moduleId)
  }
}

const toggleSection = (sectionId: string) => {
  if (expandedSections.value.has(sectionId)) {
    expandedSections.value.delete(sectionId)
  } else {
    expandedSections.value.add(sectionId)
  }
}

const toggleGroup = (groupId: string) => {
  if (expandedGroups.value.has(groupId)) {
    expandedGroups.value.delete(groupId)
  } else {
    expandedGroups.value.add(groupId)
  }
}

// 全部展开/收起
const expandAll = () => {
  const expandGroups = (groups: any[]) => {
    for (const g of groups) {
      expandedGroups.value.add(g.id)
      if (g.children?.length > 0) {
        expandGroups(g.children)
      }
    }
  }
  
  modules.value.forEach(m => {
    expandedModules.value.add(m.id)
    m.sections?.forEach((s: any) => {
      expandedSections.value.add(s.id)
      expandGroups(s.groupTree || [])
    })
  })
}

const collapseAll = () => {
  expandedModules.value.clear()
  expandedSections.value.clear()
  expandedGroups.value.clear()
}

// 统计信息
const stats = computed(() => {
  let moduleCount = modules.value.length
  let sectionCount = 0
  let groupCount = 0
  let attributeCount = 0

  modules.value.forEach(m => {
    sectionCount += m.sections?.length || 0
    m.sections?.forEach((s: any) => {
      groupCount += s.groupCount || s.groups?.length || 0
      attributeCount += s.allAttributes?.length || 0
    })
  })

  return { moduleCount, sectionCount, groupCount, attributeCount }
})

// 右键菜单处理
const handleContextMenu = (e: MouseEvent, item: any, type: 'module' | 'section' | 'group' | 'attribute') => {
  e.preventDefault()
  e.stopPropagation()
  
  contextMenuPosition.value = { x: e.clientX, y: e.clientY }
  contextMenuTarget.value = item
  contextMenuType.value = type
  contextMenuVisible.value = true
  
  // 点击其他地方关闭菜单
  document.addEventListener('click', closeContextMenu, { once: true })
}

const closeContextMenu = () => {
  contextMenuVisible.value = false
}

// 复制字段名
const handleCopyFieldName = async (fieldName?: string) => {
  const nameToCopy = fieldName || contextMenuTarget.value?.name
  if (nameToCopy) {
    try {
      await navigator.clipboard.writeText(nameToCopy)
      message.success('字段名已复制')
    } catch (error) {
      console.error('复制失败:', error)
      message.error('复制失败')
    }
  }
  closeContextMenu()
}

// 打开矩阵映射弹窗
const handleOpenMatrixMapping = (section: any) => {
  currentMappingSection.value = section
  matrixMappingVisible.value = true
}

// 矩阵映射同步完成
const handleMatrixSynced = async () => {
  await loadAllData()
}

// 监听表单变化
watch(() => props.formId, () => {
  if (props.formId) {
    loadAllData()
  }
}, { immediate: true })

// 暴露刷新方法供父组件调用
defineExpose({
  refresh: loadAllData
})
</script>

<template>
  <div class="data-preview-panel">
    <!-- 头部 -->
    <div class="preview-header">
      <div class="header-stats">
        <a-statistic
          title="模块"
          :value="stats.moduleCount"
        />
        <a-statistic
          title="区块"
          :value="stats.sectionCount"
        />
        <a-statistic
          title="分组"
          :value="stats.groupCount"
        />
        <a-statistic
          title="字段"
          :value="stats.attributeCount"
        />
      </div>
      <div class="header-actions">
        <a-button
          size="small"
          @click="expandAll"
        >
          全部展开
        </a-button>
        <a-button
          size="small"
          @click="collapseAll"
        >
          全部收起
        </a-button>
      </div>
    </div>

    <!-- 树形结构 -->
    <a-spin :spinning="loading">
      <div class="tree-container">
        <!-- 模块列表 -->
        <div
          v-for="module in modules"
          :key="module.id"
          class="tree-module"
        >
          <div
            class="module-header"
            @click="toggleModule(module.id)"
            @contextmenu="handleContextMenu($event, module, 'module')"
          >
            <div class="header-left">
              <DownOutlined
                v-if="expandedModules.has(module.id)"
                class="expand-icon"
              />
              <RightOutlined
                v-else
                class="expand-icon"
              />
              <span class="module-icon">📦</span>
              <span class="module-title">{{ module.title }}</span>
              <a-tag
                v-if="module.multi === '1'"
                color="orange"
                size="small"
              >
                多实例
              </a-tag>
            </div>
            <div class="header-right">
              <a-tag color="blue">
                {{ module.sections?.length || 0 }} 区块
              </a-tag>
            </div>
          </div>

          <!-- 区块列表 -->
          <div
            v-show="expandedModules.has(module.id)"
            class="module-content"
          >
            <div
              v-for="section in module.sections"
              :key="section.id"
              class="tree-section"
            >
              <div
                class="section-header"
                @click="toggleSection(section.id)"
                @contextmenu="handleContextMenu($event, section, 'section')"
              >
                <div class="header-left">
                  <DownOutlined
                    v-if="expandedSections.has(section.id)"
                    class="expand-icon"
                  />
                  <RightOutlined
                    v-else
                    class="expand-icon"
                  />
                  <span class="section-icon">📋</span>
                  <span class="section-title">{{ section.title }}</span>
                </div>
                <div class="header-right">
                  <a-button
                    type="link"
                    size="small"
                    @click.stop="handleOpenMatrixMapping(section)"
                  >
                    <DatabaseOutlined /> 实体表
                  </a-button>
                  <a-tag color="green">
                    {{ section.groupCount || 0 }} 分组
                  </a-tag>
                  <a-tag color="purple">
                    {{ section.allAttributes?.length || 0 }} 字段
                  </a-tag>
                </div>
              </div>

              <!-- 分组列表 -->
              <div
                v-show="expandedSections.has(section.id)"
                class="section-content"
              >
                <!-- 未分组属性 -->
                <div
                  v-if="section.ungroupedAttributes?.length > 0"
                  class="ungrouped-attributes"
                >
                  <div class="ungrouped-header">
                    <span class="ungrouped-icon">📝</span>
                    <span>未分组字段</span>
                    <a-tag color="default">
                      {{ section.ungroupedAttributes.length }}
                    </a-tag>
                  </div>
                  <div class="attribute-grid">
                    <div
                      v-for="attr in section.ungroupedAttributes"
                      :key="attr.id"
                      class="attribute-card"
                      @contextmenu="handleContextMenu($event, attr, 'attribute')"
                    >
                      <div class="attr-header">
                        <span class="attr-label">
                          <span
                            v-if="attr.isRequired === '1'"
                            class="required"
                          >*</span>
                          <span v-html="strLF2HtmlLF(attr.label)"></span>
                        </span>
                        <span
                          class="attr-tag"
                          :class="attr.isRequired === '1' ? 'attr-tag-required' : 'attr-tag-optional'"
                        >
                          {{ attr.isRequired === '1' ? '必填' : '选填' }}
                        </span>
                      </div>
                      <div class="attr-type-row">
                        <span class="attr-tag attr-tag-type">
                          {{ getFieldTypeName(attr.fieldType) }}
                        </span>
                        <div class="attr-action-icons">
                          <span
                            class="attr-action-icon"
                            @click.stop="emit('editAttribute', attr)"
                          >
                            <EditOutlined />
                          </span>
                          <span
                            class="attr-action-icon"
                            @click.stop="handleCopyFieldName(attr.name)"
                          >
                            <CopyOutlined />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 递归渲染分组树 -->
                <template v-if="section.groupTree?.length > 0">
                  <template
                    v-for="rootGroup in section.groupTree"
                    :key="rootGroup.id"
                  >
                    <GroupTreeNode
                      :group="rootGroup"
                      :level="0"
                      :expanded-groups="expandedGroups"
                      :field-type-names="fieldTypeNames"
                      @toggle="toggleGroup"
                      @contextmenu="handleContextMenu"
                      @edit-attribute="emit('editAttribute', $event)"
                    />
                  </template>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <a-empty
          v-if="!modules.length && !loading"
          description="暂无数据"
        />
      </div>
    </a-spin>

    <!-- 矩阵映射弹窗 -->
    <MatrixMappingModal
      v-model:visible="matrixMappingVisible"
      :section-id="currentMappingSection?.id || ''"
      :section-title="currentMappingSection?.title || ''"
      :table-name="currentMappingSection?.tableName"
      :attributes="currentMappingSection?.allAttributes || []"
      :form-code="formCode"
      @synced="handleMatrixSynced"
    />
  </div>
</template>

<style scoped lang="less">
.data-preview-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafbfc;

  .header-stats {
    display: flex;
    gap: 32px;

    :deep(.ant-statistic) {
      .ant-statistic-title {
        font-size: 12px;
        color: #8c8c8c;
      }
      .ant-statistic-content {
        font-size: 24px;
        font-weight: 600;
        color: #1890ff;
      }
    }
  }

  .header-actions {
    display: flex;
    gap: 8px;
  }
}

.tree-container {
  flex: 1;
  overflow: auto;
  padding: 16px;
}

// 模块样式
.tree-module {
  margin-bottom: 12px;
  border: 1px solid #e8eaed;
  border-radius: 8px;
  overflow: hidden;

  .module-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: linear-gradient(135deg, #e6f4ff 0%, #f0f7ff 100%);
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: linear-gradient(135deg, #d6e8ff 0%, #e6f4ff 100%);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;

      .expand-icon {
        color: #1890ff;
        font-size: 12px;
      }

      .module-icon {
        font-size: 18px;
      }

      .module-title {
        font-size: 15px;
        font-weight: 600;
        color: #1890ff;
      }
    }
  }

  .module-content {
    padding: 0 16px 16px;
    background: #fff;
  }
}

// 区块样式
.tree-section {
  margin-top: 12px;
  border: 1px solid #e8eaed;
  border-radius: 6px;
  overflow: hidden;

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: linear-gradient(135deg, #f6ffed 0%, #fcfff5 100%);
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: linear-gradient(135deg, #e6ffcc 0%, #f6ffed 100%);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;

      .expand-icon {
        color: #52c41a;
        font-size: 12px;
      }

      .section-icon {
        font-size: 16px;
      }

      .section-title {
        font-size: 14px;
        font-weight: 600;
        color: #52c41a;
      }
    }

    .header-right {
      display: flex;
      gap: 6px;
    }
  }

  .section-content {
    padding: 12px;
    background: #fff;
  }
}

// 未分组属性
.ungrouped-attributes {
  margin-bottom: 12px;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px dashed #d9d9d9;

  .ungrouped-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    font-size: 13px;
    color: #8c8c8c;
    padding-bottom: 8px;
    border-bottom: 1px solid #e8eaed;

    .ungrouped-icon {
      font-size: 14px;
    }
  }
}

// 属性网格
.attribute-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
}

// 属性卡片
.attribute-card {
  padding: 14px 16px;
  background: #fff;
  border: 1px solid #e8eaed;
  border-radius: 8px;
  transition: all 0.2s;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  min-height: 80px;

  &:hover {
    background: #f0f7ff;
    border-color: #1890ff;
    box-shadow: 0 2px 12px rgba(24, 144, 255, 0.12);
  }

  .attr-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 6px;

    .attr-label {
      font-size: 14px;
      font-weight: 600;
      color: #262626;
      display: flex;
      align-items: flex-start;
      gap: 4px;
      flex: 1;
      min-width: 0;
      line-height: 1.4;

      .required {
        color: #ff4d4f;
        font-weight: 700;
        font-size: 16px;
        flex-shrink: 0;
      }
      
      // v-html 内容容器
      > span {
        flex: 1;
        min-width: 0;
        word-break: break-word;
      }
    }
  }

  // 类型标签行
  .attr-type-row {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 8px;
    min-height: 24px;
    margin-top: auto;
  }

  // 操作图标容器
  .attr-action-icons {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: auto;
  }

  // 操作图标
  .attr-action-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 4px;
    cursor: pointer;
    color: #8c8c8c;
    font-size: 12px;
    transition: all 0.2s;
    
    &:hover {
      color: #1890ff;
      background: #e6f4ff;
    }
  }

  // 统一标签样式
  .attr-tag {
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    
    // 类型标签 - 蓝色
    &.attr-tag-type {
      color: #1890ff;
      background: #e6f4ff;
      border: 1px solid #91caff;
    }
    
    // 必填标签 - 红色
    &.attr-tag-required {
      color: #ff4d4f;
      background: #fff1f0;
      border: 1px solid #ffa39e;
    }
    
    // 选填标签 - 灰色
    &.attr-tag-optional {
      color: #666;
      background: #f5f5f5;
      border: 1px solid #d9d9d9;
    }
  }
}

// 右键菜单
.context-menu {
  position: fixed;
  z-index: 9999;
  background: #fff;
  border: 1px solid #e8eaed;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 120px;
  padding: 4px 0;

  .context-menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: #f0f5ff;
      color: #1890ff;
    }
  }
}
</style>
