<script setup lang="ts">
/**
 * 评估表单查看器组件
 * 用于展示填报数据，支持只读和编辑模式
 * 优化版：支持左右布局、Section导航树、Group折叠卡片、进度显示
 */
import { ArrowLeftOutlined, SaveOutlined, DeleteOutlined, DownOutlined, UpOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons-vue'
import { ref, computed, watch, provide, nextTick } from 'vue'
import { useRouter } from 'vue-router'

import EvalGroupForm from './GroupForm.vue'
import ModuleSteps from './ModuleSteps.vue'
import SectionNavTree from './SectionNavTree.vue'
import type { SectionInstance, SectionProgress, MutualExclusiveGroup } from './useEvalFormData'
import { strLF2HtmlLF } from '../../../../utils/common'
import Dict from '../../dict/index.vue'


// Props
interface Props {
  // 状态数据
  pageTitle: string
  historyInfo: any
  loading: boolean
  hasPermission: boolean
  recordNotFound: boolean
  
  // 模块数据
  modules: any[]
  currentModuleIndex: number
  currentModule: any
  
  // Section 数据
  availableSections: any[]
  sectionInstances: SectionInstance[]
  sectionGroups: Record<string, any[]>
  sectionAttributes: Record<string, any[]>
  groupInstances: Record<string, any[]>
  isMultiSection: boolean
  currentSectionInstanceId?: string | null
  
  // 控制属性
  readonly?: boolean
  showSaveButton?: boolean
  showNavTree?: boolean  // 是否显示导航树
  
  // 方法
  getGroupRows: (sectionInstanceId: string, groupId: string) => any[]
  getGroupAttributes: (sectionId: string, groupId: string) => any[]
  translateDictValue: (dictName: string, value: string) => Promise<string>
  getSectionProgress?: (instanceId: string) => SectionProgress
  getMutualExclusiveGroups?: (sectionId: string) => MutualExclusiveGroup[]
  shouldShowGroup?: (sectionId: string, groupId: string) => boolean
  getGroupTree?: (sectionId: string) => any[]  // 获取树形结构的 Groups
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  showSaveButton: true,
  showNavTree: true,
  currentSectionInstanceId: null,
  getSectionProgress: undefined,
  getMutualExclusiveGroups: undefined,
  shouldShowGroup: undefined,
  getGroupTree: undefined
})

// Emits
const emit = defineEmits<{
  (e: 'back'): void
  (e: 'moduleChange', index: number): void
  (e: 'addSection', sectionId: string): void
  (e: 'removeSection', instanceId: string): void
  (e: 'saveSection', instanceId: string): void
  (e: 'saveAll'): void
  (e: 'addGroupRow', sectionInstanceId: string, groupId: string): void
  (e: 'deleteGroupRow', sectionInstanceId: string, groupId: string, rowIndex: number): void
  (e: 'updateData', sectionInstanceId: string, groupInstanceId: string, attributeId: string, value: any): void
  (e: 'selectSection', instanceId: string): void
  (e: 'mutualOptionChange', flag: string, groupId: string): void
  (e: 'saveGroup', sectionInstanceId: string, groupId: string, rowsData: Array<{ groupInstanceId: string; rowIndex: number; data: Record<string, any> }>): void
}>()

const router = useRouter()

// EvalGroupForm 组件的 ref
const groupFormRefs = ref<Record<string, any>>({})

// 子 Group 组件的 ref 映射（用于导航控制）
const childGroupRefsMap = ref<Record<string, any>>({})

// 拒绝理由折叠状态
const rejectReasonCollapsed = ref(false)

// 导航树折叠状态
const navTreeCollapsed = ref(false)

// 当前选中的 Section Instance ID
const localCurrentInstanceId = ref<string | null>(null)

// 计算当前选中的实例ID
const currentInstanceId = computed(() => {
  return props.currentSectionInstanceId || localCurrentInstanceId.value
})

// 当前选中的 Section Instance
const currentInstance = computed(() => {
  if (!currentInstanceId.value) {
    return props.sectionInstances[0] || null
  }
  return props.sectionInstances.find(inst => inst.instanceId === currentInstanceId.value) || props.sectionInstances[0] || null
})

// 监听 sectionInstances 变化，自动选中第一个
watch(() => props.sectionInstances, (instances) => {
  if (instances.length > 0 && !localCurrentInstanceId.value) {
    localCurrentInstanceId.value = instances[0].instanceId
  }
}, { immediate: true })

// 处理选中 Section Instance
const handleSelectInstance = (instanceId: string) => {
  localCurrentInstanceId.value = instanceId
  emit('selectSection', instanceId)
}

// 切换导航树折叠
const toggleNavTree = () => {
  navTreeCollapsed.value = !navTreeCollapsed.value
}

// 获取应该显示的 Groups（树形结构）
const getDisplayGroups = (sectionId: string) => {
  // 如果提供了 getGroupTree 方法，使用树形结构
  if (props.getGroupTree) {
    return props.getGroupTree(sectionId)
  }
  
  // 否则使用扁平结构（兼容旧版本）
  const groups = props.sectionGroups[sectionId] || []
  if (!props.shouldShowGroup) return groups
  return groups.filter(group => props.shouldShowGroup!(sectionId, String(group.id)))
}

// 获取互斥选项组
const getMutualGroups = (sectionId: string): MutualExclusiveGroup[] => {
  if (!props.getMutualExclusiveGroups) return []
  return props.getMutualExclusiveGroups(sectionId)
}

// 处理互斥选项切换
const handleMutualOptionChange = (flag: string, groupId: string) => {
  emit('mutualOptionChange', flag, groupId)
}

// 处理 Group 保存
const handleSaveGroup = (groupId: string, rowsData: Array<{ groupInstanceId: string; rowIndex: number; data: Record<string, any> }>) => {
  if (!currentInstance.value) return
  emit('saveGroup', currentInstance.value.instanceId, groupId, rowsData)
}

// 当前激活的子 Group ID
const activeChildGroupId = ref<string | null>(null)

// 获取当前 Section 的可导航 Groups（用于快捷按钮）
// 逻辑：如果有选中的子 Group，显示其兄弟列表；否则显示顶级 Groups
const getNavigableGroups = (sectionId: string) => {
  const groups = getDisplayGroups(sectionId)
  
  // 如果有激活的子 Group，找到它的父 Group，显示父 Group 的所有子 Group
  if (activeChildGroupId.value) {
    // 找到当前激活的 group
    const findGroupById = (groupList: any[], targetId: string): any | null => {
      for (const group of groupList) {
        if (String(group.id) === targetId) {
          return group
        }
        if (group.children && group.children.length > 0) {
          const found = findGroupById(group.children, targetId)
          if (found) return found
        }
      }
      return null
    }
    
    // 找到激活 group 的父 group
    const findParentGroup = (groupList: any[], targetId: string, parent: any = null): any | null => {
      for (const group of groupList) {
        if (String(group.id) === targetId) {
          return parent
        }
        if (group.children && group.children.length > 0) {
          const found = findParentGroup(group.children, targetId, group)
          if (found !== undefined) return found
        }
      }
      return null
    }
    
    const activeGroup = findGroupById(groups, activeChildGroupId.value)
    const parentGroup = findParentGroup(groups, activeChildGroupId.value)
    
    if (parentGroup && parentGroup.children && parentGroup.children.length > 0) {
      // 有父 Group，显示父 Group 的所有子 Group
      return parentGroup.children.map((child: any) => ({
        ...child,
        parentTitle: parentGroup.title,
        parentId: parentGroup.id
      }))
    } else if (activeGroup && activeGroup.children && activeGroup.children.length > 0) {
      // 当前 Group 本身有子 Group，显示其子 Group
      return activeGroup.children.map((child: any) => ({
        ...child,
        parentTitle: activeGroup.title,
        parentId: activeGroup.id
      }))
    }
  }
  
  // 没有激活的子 Group，显示顶级 Groups（pid 为 null 或没有父级的 Groups）
  const topLevelGroups = groups.filter(group => !group.pid)
  
  // 如果顶级 Groups 只有一个且有子 Group，则显示其子 Group
  if (topLevelGroups.length === 1 && topLevelGroups[0].children && topLevelGroups[0].children.length > 0) {
    const parent = topLevelGroups[0]
    return parent.children.map((child: any) => ({
      ...child,
      parentTitle: parent.title,
      parentId: parent.id
    }))
  }
  
  // 默认激活第一个
  if (!activeChildGroupId.value && topLevelGroups.length > 0) {
    activeChildGroupId.value = String(topLevelGroups[0].id)
  }
  
  return topLevelGroups
}

// 设置子 Group 组件的 ref
const setChildGroupRef = (groupId: string) => (el: any) => {
  if (el) {
    childGroupRefsMap.value[groupId] = el
  } else {
    delete childGroupRefsMap.value[groupId]
  }
}

// 滚动到指定的 Group 并设置为激活状态
const scrollToGroup = (groupId: string) => {
  // 设置激活状态
  activeChildGroupId.value = groupId
  
  // 等待下一帧，确保状态更新
  nextTick(() => {
    // 获取所有子 Group 组件实例
    const childGroupRefs = childGroupRefsMap.value
    
    // 遍历所有子 Group，调用 setCollapsed 方法改变状态
    Object.entries(childGroupRefs).forEach(([gId, groupRef]) => {
      if (!groupRef || !groupRef.setCollapsed) return
      
      const isCollapsed = groupRef.collapsed
      // 转换为字符串进行比较，避免类型不匹配
      const isTarget = String(gId) === String(groupId)
      
      if (isTarget) {
        // 目标 Group：展开
        if (isCollapsed) {
          groupRef.setCollapsed(false)
        }
      } else {
        // 其他 Group：折叠
        if (!isCollapsed) {
          groupRef.setCollapsed(true)
        }
      }
    })
    
    // 滚动到目标 Group
    setTimeout(() => {
      const groupElement = document.querySelector(`[data-group-id="${groupId}"]`)
      if (groupElement) {
        groupElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 200)
  })
}

// Provide 方法给子组件（用于递归渲染）
provide('getGroupAttributes', props.getGroupAttributes)
provide('getGroupRows', props.getGroupRows)
provide('setChildGroupRef', setChildGroupRef)
provide('activeChildGroupId', activeChildGroupId)
// 提供 groupFormRefs 给子组件，让递归子 groups 也能注册 ref
provide('groupFormRefs', groupFormRefs)

// 页面加载后自动折叠非激活的子 Group
const collapseInactiveChildGroups = () => {
  nextTick(() => {
    setTimeout(() => {
      // 只查询直接子 Group（.child-groups 的直接子元素）
      const allChildGroupElements = document.querySelectorAll('.child-groups > .eval-group-form[data-group-id]')
      
      allChildGroupElements.forEach(el => {
        const groupId = el.getAttribute('data-group-id')
        const header = el.querySelector('.group-header.clickable') as HTMLElement
        if (!header) return
        
        const isCollapsed = el.classList.contains('is-collapsed')
        
        // 如果不是激活的 Group 且未折叠，则折叠
        if (groupId !== activeChildGroupId.value && !isCollapsed) {
          header.click()
        }
      })
    }, 500) // 增加延迟时间，确保 DOM 完全渲染
  })
}

// 监听 Section 实例变化，重置激活状态并折叠非激活的子 Group
watch(() => currentInstance.value?.instanceId, () => {
  activeChildGroupId.value = null
  collapseInactiveChildGroups()
})

// 监听激活 Group 变化，在首次设置时折叠其他子 Group
watch(activeChildGroupId, (newVal, oldVal) => {
  if (newVal && !oldVal) {
    // 首次设置激活 Group，折叠其他子 Group
    collapseInactiveChildGroups()
  }
})

// 返回/关闭页面
const handleBack = () => {
  emit('back')
  window.close()
  setTimeout(() => {
    router.back()
  }, 100)
}

// 暴露方法给父组件
defineExpose({
  groupFormRefs,
  handleBack,
  currentInstanceId,
  localCurrentInstanceId
})
</script>

<template>
  <div class="eval-form-viewer">
    <!-- 记录不存在提示页面 -->
    <div
      v-if="recordNotFound"
      class="no-permission-container"
    >
      <a-result
        status="404"
        title="记录不存在"
        sub-title="抱歉，该填报记录不存在或已被删除。请检查记录ID是否正确。"
      >
        <template #extra>
          <a-button
            type="primary"
            @click="handleBack"
          >
            返回列表
          </a-button>
        </template>
      </a-result>
    </div>

    <!-- 无权限提示页面 -->
    <div
      v-else-if="!hasPermission"
      class="no-permission-container"
    >
      <a-result
        status="403"
        title="无访问权限"
        sub-title="抱歉，您没有权限查看该填报记录。请联系管理员获取权限。"
      >
        <template #extra>
          <a-button
            type="primary"
            @click="handleBack"
          >
            关闭页面
          </a-button>
        </template>
      </a-result>
    </div>

    <!-- 正常内容 -->
    <template v-else>
      <!-- 顶部标题栏插槽 -->
      <slot name="header">
        <!-- 默认标题栏实现 -->
        <div class="page-header">
          <a-button
            type="link"
            @click="handleBack"
          >
            <template #icon>
              <ArrowLeftOutlined />
            </template>
            返回列表
          </a-button>
          <h2 class="page-title">
            {{ pageTitle }}
          </h2>
          <div class="header-info">
            <slot
              name="header-info"
              :history-info="historyInfo"
            ></slot>
          </div>
          <!-- 自定义右侧按钮插槽 -->
          <slot name="header-actions"></slot>
        </div>
      </slot>

      <!-- 加载状态 -->
      <div
        v-if="loading"
        class="loading-container"
      >
        <a-spin
          size="large"
          tip="加载中..."
        />
      </div>

      <!-- 主内容区 -->
      <div
        v-else-if="historyInfo"
        class="form-content"
      >
        <!-- 拒绝理由提示 -->
        <div
          v-if="historyInfo?.status === '2' && historyInfo?.confirmReason"
          class="reject-reason-card"
        >
          <div 
            class="reject-reason-header"
            @click="rejectReasonCollapsed = !rejectReasonCollapsed"
          >
            <div class="reject-reason-title">
              <span class="reject-icon">⚠️</span>
              <span>审批拒绝理由</span>
            </div>
            <a-button
              type="text"
              size="small"
              class="collapse-btn"
            >
              <template #icon>
                <UpOutlined v-if="!rejectReasonCollapsed" />
                <DownOutlined v-else />
              </template>
            </a-button>
          </div>
          <div 
            v-show="!rejectReasonCollapsed"
            class="reject-reason-content"
            v-html="strLF2HtmlLF(historyInfo.confirmReason)"
          ></div>
        </div>

        <!-- 模块步骤条 -->
        <div
          v-if="modules.length > 0"
          class="module-steps"
        >
          <ModuleSteps
            :modules="modules"
            :current-index="currentModuleIndex"
            readonly
            @change="(index) => emit('moduleChange', index)"
          />
        </div>

        <!-- 区块填报区域：左右布局 -->
        <div
          v-if="currentModule"
          class="section-area"
          :class="{ 'with-nav': showNavTree && !navTreeCollapsed }"
        >
          <!-- 左侧导航树 -->
          <div
            v-if="showNavTree"
            class="nav-panel"
            :class="{ 'is-collapsed': navTreeCollapsed }"
          >
            <SectionNavTree
              v-show="!navTreeCollapsed"
              :sections="availableSections"
              :instances="sectionInstances"
              :current-instance-id="currentInstanceId"
              :readonly="readonly"
              :get-section-progress="getSectionProgress"
              @select="handleSelectInstance"
              @add="(sectionId) => emit('addSection', sectionId)"
              @remove="(instanceId) => emit('removeSection', instanceId)"
            />
            
            <!-- 折叠按钮 -->
            <a-button
              type="text"
              class="nav-toggle-btn"
              @click="toggleNavTree"
            >
              <MenuUnfoldOutlined v-if="navTreeCollapsed" />
              <MenuFoldOutlined v-else />
            </a-button>
          </div>

          <!-- 右侧内容区 -->
          <div class="content-panel">
            <!-- 区块标题栏 -->
            <div class="section-header">
              <h3>{{ currentModule.title }}</h3>
              <div class="section-actions">
                <!-- 保存所有数据按钮 -->
                <a-button
                  v-if="!readonly && showSaveButton"
                  type="primary"
                  style="margin-right: 12px; margin-left: 20px;"
                  @click="emit('saveAll')"
                >
                  <template #icon>
                    <SaveOutlined />
                  </template>
                  保存所有数据
                </a-button>
              </div>
            </div>

            <!-- 当前 Section Instance 表单 -->
            <div
              v-if="currentInstance"
              class="current-section-form"
            >
              <!-- Section Instance 标题 -->
              <div class="instance-header">
                <div class="instance-title">
                  <h4>{{ currentInstance.section.title }}</h4>
                  <!-- 进度条 -->
                  <div
                    v-if="getSectionProgress"
                    class="section-progress"
                  >
                    <a-progress
                      :percent="getSectionProgress(currentInstance.instanceId).percent"
                      :show-info="false"
                      :stroke-width="6"
                      style="width: 120px;"
                    />
                    <span class="progress-text">{{ getSectionProgress(currentInstance.instanceId).percent }}%</span>
                  </div>
                  
                  <!-- 子 Group 快捷导航 -->
                  <div
                    v-if="getNavigableGroups(currentInstance.sectionId).length > 0"
                    class="group-nav-buttons"
                  >
                    <a-button
                      v-for="navGroup in getNavigableGroups(currentInstance.sectionId)"
                      :key="navGroup.id"
                      size="small"
                      class="group-nav-btn"
                      :class="{ 'is-active': activeChildGroupId === String(navGroup.id) }"
                      @click="scrollToGroup(String(navGroup.id))"
                    >
                      {{ navGroup.title }}
                    </a-button>
                  </div>
                </div>
                <div
                  v-if="!readonly"
                  class="header-actions"
                >
                  <a-button
                    v-if="showSaveButton"
                    type="primary"
                    size="small"
                    @click="emit('saveSection', currentInstance.instanceId)"
                  >
                    <template #icon>
                      <SaveOutlined />
                    </template>
                  </a-button>
                  <a-button
                    v-if="availableSections.length > 1"
                    type="primary"
                    danger
                    size="small"
                    @click="emit('removeSection', currentInstance.instanceId)"
                  >
                    <template #icon>
                      <DeleteOutlined />
                    </template>
                  </a-button>
                </div>
              </div>

              <!-- 互斥选项切换器（只在非只读模式下显示） -->
              <template v-if="!readonly">
                <div
                  v-for="mutualGroup in getMutualGroups(currentInstance.sectionId)"
                  :key="mutualGroup.flag"
                  class="mutual-option-switcher"
                >
                  <span class="switcher-label">{{ mutualGroup.groups[0]?.title?.replace(/[含不含]/g, '') }}选项：</span>
                  <a-radio-group
                    :value="mutualGroup.selectedGroupId || String(mutualGroup.groups[0]?.id)"
                    @change="(e) => handleMutualOptionChange(mutualGroup.flag, e.target.value)"
                  >
                    <a-radio
                      v-for="group in mutualGroup.groups"
                      :key="group.id"
                      :value="String(group.id)"
                    >
                      {{ group.title }}
                    </a-radio>
                  </a-radio-group>
                </div>
              </template>

              <!-- 遍历渲染 Groups -->
              <div
                v-for="(group, groupIndex) in getDisplayGroups(currentInstance.sectionId)"
                :key="group.id"
                class="group-block"
              >
                <EvalGroupForm
                  :ref="(el) => { if (el) groupFormRefs[`${currentInstance.instanceId}_${String(group.id)}`] = el }"
                  :group="{
                    id: String(group.id),
                    title: group.title,
                    description: group.description,
                    multi: group.multi,
                    sort: group.sort,
                    required: group.required,
                    children: group.children || []
                  }"
                  :attributes="getGroupAttributes(currentInstance.sectionId, String(group.id))"
                  :rows="getGroupRows(currentInstance.instanceId, String(group.id))"
                  :readonly="readonly"
                  :is-default-group="group.sort === 0"
                  :is-first-group="groupIndex === 0"
                  :dict-translate-fn="translateDictValue"
                  :default-values="currentModule?.defaultValues"
                  :show-progress="true"
                  :depth="0"
                  :section-instance-id="currentInstance.instanceId"
                  :section-id="currentInstance.sectionId"
                  :get-group-attributes-fn="getGroupAttributes"
                  :get-group-rows-fn="getGroupRows"
                  @add-row="() => emit('addGroupRow', currentInstance.instanceId, String(group.id))"
                  @delete-row="(rowIndex) => emit('deleteGroupRow', currentInstance.instanceId, String(group.id), rowIndex)"
                  @update-data="(groupInstanceId, attributeId, value) => emit('updateData', currentInstance.instanceId, groupInstanceId, attributeId, value)"
                  @save-group="handleSaveGroup"
                >
                  <!-- 自定义 select 组件 -->
                  <template #select="{ attribute, value, readonly: isReadonly, updateValue, parentValue }">
                    <slot
                      name="select"
                      :attribute="attribute"
                      :value="value"
                      :readonly="isReadonly"
                      :update-value="updateValue"
                      :parent-value="parentValue"
                    >
                      <dict
                        v-if="attribute.dict"
                        :model-value="value"
                        :dict-code="attribute.dict"
                        :parent-code="parentValue"
                        :disabled="isReadonly"
                        :placeholder="`请选择${attribute.label}`"
                        @update:model-value="updateValue"
                      />
                      <a-select
                        v-else
                        :value="value"
                        :placeholder="`请选择${attribute.label}`"
                        :disabled="isReadonly"
                        style="width: 100%"
                        @update:value="updateValue"
                      />
                    </slot>
                  </template>

                  <!-- 自定义 selectMulti 组件（多选下拉） -->
                  <template #selectMulti="{ attribute, value, readonly: isReadonly, updateValue, parentValue }">
                    <slot
                      name="selectMulti"
                      :attribute="attribute"
                      :value="value"
                      :readonly="isReadonly"
                      :update-value="updateValue"
                      :parent-value="parentValue"
                    >
                      <dict
                        v-if="attribute.dict"
                        :model-value="Array.isArray(value) ? value.join(',') : value"
                        :dict-code="attribute.dict"
                        :parent-code="parentValue"
                        :disabled="isReadonly"
                        :placeholder="`请选择${attribute.label}`"
                        multiple
                        @update:model-value="(strValue) => {
                          // dict 多选模式返回逗号分隔的字符串，需要转换为数组
                          const arrValue = strValue ? String(strValue).split(',').filter(v => v !== '') : []
                          updateValue(arrValue)
                        }"
                      />
                      <a-select
                        v-else
                        :value="value"
                        :placeholder="`请选择${attribute.label}`"
                        :disabled="isReadonly"
                        mode="multiple"
                        :max-tag-count="2"
                        :max-tag-placeholder="(omittedValues: any[]) => `+${omittedValues.length}...`"
                        style="width: 100%"
                        @update:value="updateValue"
                      />
                    </slot>
                  </template>

                  <!-- 自定义 tree 组件（树形单选） -->
                  <template #tree="{ attribute, value, readonly: isReadonly, updateValue }">
                    <a-tree-select
                      :value="value"
                      :placeholder="`请选择${attribute.label}`"
                      :disabled="isReadonly"
                      allow-clear
                      tree-default-expand-all
                      tree-node-filter-prop="label"
                      style="width: 100%"
                      @update:value="updateValue"
                    />
                  </template>

                  <!-- 自定义 treeMulti 组件（树形多选） -->
                  <template #treeMulti="{ attribute, value, readonly: isReadonly, updateValue }">
                    <a-tree-select
                      :value="value"
                      :placeholder="`请选择${attribute.label}`"
                      :disabled="isReadonly"
                      multiple
                      allow-clear
                      tree-default-expand-all
                      tree-node-filter-prop="label"
                      :max-tag-count="2"
                      :max-tag-placeholder="(omittedValues: any[]) => `+${omittedValues.length}...`"
                      style="width: 100%"
                      @update:value="updateValue"
                    />
                  </template>
                </EvalGroupForm>
              </div>
            </div>

            <!-- 空状态 -->
            <div
              v-else
              class="empty-section-container"
            >
              <a-empty
                description="请从左侧导航树选择或添加区块"
                style="margin-top: 48px"
              />
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped lang="less">
.eval-form-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f0f2f5;
}

.no-permission-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: #fff;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;

  .page-title {
    flex: 1;
    margin: 0;
    font-size: 18px;
    font-weight: 500;
  }

  .header-info {
    display: flex;
    gap: 8px;
  }
}

.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
}

.form-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.reject-reason-card {
  margin-bottom: 16px;
  background: #fff;
  border: 2px solid #ff4d4f;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(255, 77, 79, 0.15);
  
  .reject-reason-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%);
    cursor: pointer;
    user-select: none;
    transition: all 0.3s;
    
    &:hover {
      background: linear-gradient(135deg, #ff7875 0%, #ff4d4f 100%);
    }
    
    .reject-reason-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 600;
      color: #fff;
      
      .reject-icon {
        font-size: 18px;
      }
    }
    
    .collapse-btn {
      color: #fff;
      
      &:hover {
        background: rgba(255, 255, 255, 0.1);
      }
    }
  }
  
  .reject-reason-content {
    padding: 16px;
    background: #fff2f0;
    border-top: 1px solid #ffccc7;
    font-size: 14px;
    line-height: 1.8;
    color: #262626;
    white-space: pre-wrap;
    word-break: break-word;
    animation: slideDown 0.3s ease;
  }
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.module-steps {
  margin-bottom: 16px;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
}

.section-area {
  display: flex;
  gap: 16px;
  background: transparent;
  border-radius: 8px;
  min-height: 500px;
  
  &.with-nav {
    .content-panel {
      flex: 1;
      min-width: 0;
    }
  }
}

.nav-panel {
  position: relative;
  width: 280px;
  min-width: 280px;
  transition: all 0.3s;
  
  &.is-collapsed {
    width: 40px;
    min-width: 40px;
  }
  
  .nav-toggle-btn {
    position: absolute;
    right: -12px;
    top: 50%;
    transform: translateY(-50%);
    z-index: 10;
    width: 24px;
    height: 48px;
    padding: 0;
    background: #fff;
    border: 1px solid #e8e8e8;
    border-radius: 0 4px 4px 0;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
    
    &:hover {
      background: #f5f5f5;
    }
  }
}

.content-panel {
  flex: 1;
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: -16px -16px 16px -16px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px 8px 0 0;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #fff;
    letter-spacing: 0.5px;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .section-actions {
    display: flex;
    align-items: center;
  }
}

.current-section-form {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.instance-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 0 0 12px 0;
  border-bottom: 2px solid #1890ff;
  
  .instance-title {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }

  h4 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #1890ff;
  }
  
  .section-progress {
    display: flex;
    align-items: center;
    gap: 8px;
    
    .progress-text {
      font-size: 13px;
      color: #1890ff;
      font-weight: 500;
    }
  }
  
  .group-nav-buttons {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    
    .group-nav-btn {
      padding: 4px 12px;
      height: auto;
      line-height: 1.5;
      font-size: 13px;
      color: #595959;
      background: #fafafa;
      border-radius: 4px;
      border: 1px solid #d9d9d9;
      transition: all 0.2s;
      box-shadow: none;
      
      &:hover {
        color: #1890ff;
        background: #e6f7ff;
        border-color: #91d5ff;
      }
      
      &:focus {
        color: #595959;
        background: #fafafa;
        border-color: #d9d9d9;
      }
      
      &.is-active {
        color: #fff;
        background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
        border-color: #1890ff;
        font-weight: 600;
        box-shadow: 0 2px 6px rgba(24, 144, 255, 0.3);
        
        &:hover {
          background: linear-gradient(135deg, #40a9ff 0%, #1890ff 100%);
          border-color: #40a9ff;
        }
        
        &:focus {
          color: #fff;
          background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
          border-color: #1890ff;
        }
      }
    }
  }

  .header-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }
}

.mutual-option-switcher {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 8px;
  border: 1px solid #e8e8e8;
  
  .switcher-label {
    margin-right: 16px;
    font-size: 14px;
    font-weight: 500;
    color: #262626;
  }
}

.group-block {
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
}

.empty-section-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}
</style>
