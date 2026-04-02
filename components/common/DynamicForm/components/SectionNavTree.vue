<script setup lang="ts">
/**
 * Section 树形导航组件
 * 用于显示 Section 列表和实例状态，支持快速导航
 */
import { PlusOutlined, DeleteOutlined, CheckCircleFilled, MinusCircleFilled, ExclamationCircleFilled } from '@ant-design/icons-vue'
import { computed } from 'vue'

interface Section {
  id: string
  title: string
  description?: string
  required?: string
  multi?: string
  minCount?: number
  maxCount?: number
}

interface SectionInstance {
  sectionId: string
  instanceId: string
  section: Section
}

interface SectionProgress {
  completed: number
  total: number
  percent: number
}

interface Props {
  sections: Section[]                    // 可用的 Section 列表
  instances: SectionInstance[]           // 已创建的 Instance 列表
  currentInstanceId: string | null       // 当前选中的 Instance
  readonly: boolean                      // 只读模式
  getSectionProgress?: (instanceId: string) => SectionProgress  // 进度获取函数
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  getSectionProgress: undefined
})

const emit = defineEmits<{
  (e: 'select', instanceId: string): void      // 选中 Instance
  (e: 'add', sectionId: string): void          // 添加 Instance
  (e: 'remove', instanceId: string): void      // 删除 Instance
}>()

// 按 Section 分组实例
const groupedInstances = computed(() => {
  const groups: Record<string, SectionInstance[]> = {}
  
  // 初始化所有 Section
  props.sections.forEach(section => {
    groups[section.id] = []
  })
  
  // 分组实例
  props.instances.forEach(instance => {
    if (groups[instance.sectionId]) {
      groups[instance.sectionId].push(instance)
    }
  })
  
  return groups
})

// 解析 required 字段
const parseRequired = (required?: string): { type: 'none' | 'simple' | 'flag'; flag?: string; min?: number; max?: number } => {
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

// 获取 Section 状态
const getSectionStatus = (section: Section): 'complete' | 'inProgress' | 'empty' | 'required' => {
  const instances = groupedInstances.value[section.id] || []
  const parsed = parseRequired(section.required)
  
  if (instances.length === 0) {
    // 没有任何实例
    if (parsed.type === 'simple') {
      return 'required' // 必填但未添加
    }
    return 'empty'
  }
  
  // 有实例，检查进度
  if (props.getSectionProgress) {
    const allComplete = instances.every(inst => {
      const progress = props.getSectionProgress!(inst.instanceId)
      return progress.percent === 100
    })
    return allComplete ? 'complete' : 'inProgress'
  }
  
  return 'inProgress'
}

// 获取实例状态
const getInstanceStatus = (instanceId: string): 'complete' | 'inProgress' | 'empty' => {
  if (!props.getSectionProgress) return 'empty'
  const progress = props.getSectionProgress(instanceId)
  if (progress.percent === 100) return 'complete'
  if (progress.percent > 0) return 'inProgress'
  return 'empty'
}

// 缓存所有实例的进度数据（避免模板中多次调用函数）
const instanceProgressMap = computed(() => {
  const map: Record<string, SectionProgress> = {}
  if (!props.getSectionProgress) return map
  
  props.instances.forEach(instance => {
    const progress = props.getSectionProgress!(instance.instanceId)
    map[instance.instanceId] = progress
  })
  
  return map
})

// 获取缓存的实例进度
const getCachedProgress = (instanceId: string): SectionProgress | null => {
  return instanceProgressMap.value[instanceId] || null
}

// 是否可以添加实例
const canAddInstance = (section: Section): boolean => {
  if (props.readonly) return false
  
  const instances = groupedInstances.value[section.id] || []
  const currentCount = instances.length
  
  // 检查 multi 字段
  if (section.multi === '0') {
    return currentCount === 0 // 单实例模式，只有没有时才能添加
  }
  
  // 检查最大数量限制
  if (section.maxCount && section.maxCount > 0 && currentCount >= section.maxCount) {
    return false
  }
  
  return true
}

// 是否可以删除实例
const canDeleteInstance = (section: Section): boolean => {
  if (props.readonly) return false
  
  const instances = groupedInstances.value[section.id] || []
  const currentCount = instances.length
  const minCount = section.minCount || 0
  
  return currentCount > minCount
}

// 处理选中实例
const handleSelectInstance = (instanceId: string) => {
  emit('select', instanceId)
}

// 处理添加实例
const handleAddInstance = (sectionId: string, event: Event) => {
  event.stopPropagation()
  emit('add', sectionId)
}

// 处理删除实例
const handleRemoveInstance = (instanceId: string, event: Event) => {
  event.stopPropagation()
  emit('remove', instanceId)
}
</script>

<template>
  <div class="section-nav-tree">
    <div class="nav-header">
      <span class="nav-title">区块导航</span>
    </div>
    
    <div class="nav-content">
      <div
        v-for="section in sections"
        :key="section.id"
        class="section-group"
      >
        <!-- Section 标题 -->
        <div
          class="section-title"
          :class="{ 'has-instances': (groupedInstances[section.id] || []).length > 0 }"
        >
          <div class="title-left">
            <!-- 状态图标 -->
            <CheckCircleFilled
              v-if="getSectionStatus(section) === 'complete'"
              class="status-icon complete"
            />
            <MinusCircleFilled
              v-else-if="getSectionStatus(section) === 'inProgress'"
              class="status-icon in-progress"
            />
            <ExclamationCircleFilled
              v-else-if="getSectionStatus(section) === 'required'"
              class="status-icon required"
            />
            <span class="section-name">{{ section.title }}</span>
          </div>
          
          <!-- 添加按钮 -->
          <a-button
            v-if="canAddInstance(section)"
            type="link"
            size="small"
            class="add-btn"
            @click="(e) => handleAddInstance(section.id, e)"
          >
            <PlusOutlined />
          </a-button>
        </div>
        
        <!-- Instance 列表 -->
        <div
          v-if="(groupedInstances[section.id] || []).length > 0"
          class="instance-list"
        >
          <div
            v-for="(instance, index) in groupedInstances[section.id]"
            :key="instance.instanceId"
            class="instance-item"
            :class="{ 'is-active': currentInstanceId === instance.instanceId }"
            @click="handleSelectInstance(instance.instanceId)"
          >
            <!-- 第一行：状态图标 + 名称 + 删除按钮 -->
            <div class="instance-row">
              <div class="instance-info">
                <!-- 实例状态图标 -->
                <CheckCircleFilled
                  v-if="getInstanceStatus(instance.instanceId) === 'complete'"
                  class="status-icon complete small"
                />
                <MinusCircleFilled
                  v-else-if="getInstanceStatus(instance.instanceId) === 'inProgress'"
                  class="status-icon in-progress small"
                />
                <span
                  v-else
                  class="status-dot empty"
                ></span>
                
                <span class="instance-name">
                  {{ section.title }}
                  <template v-if="(groupedInstances[section.id] || []).length > 1">
                    #{{ index + 1 }}
                  </template>
                </span>
              </div>
              
              <!-- 删除按钮 -->
              <a-button
                v-if="canDeleteInstance(section)"
                type="link"
                size="small"
                danger
                class="delete-btn"
                @click="(e) => handleRemoveInstance(instance.instanceId, e)"
              >
                <DeleteOutlined />
              </a-button>
            </div>
            
            <!-- 第二行：进度条 -->
            <template v-if="getCachedProgress(instance.instanceId)">
              <a-tooltip
                :title="`已完成 ${getCachedProgress(instance.instanceId)!.completed}/${getCachedProgress(instance.instanceId)!.total} 项`"
              >
                <div class="progress-bar">
                  <div
                    class="progress-fill"
                    :style="{ width: `${getCachedProgress(instance.instanceId)!.percent}%` }"
                  ></div>
                </div>
              </a-tooltip>
            </template>
          </div>
        </div>
        
        <!-- 空状态提示 -->
        <div
          v-else
          class="empty-hint"
          @click="canAddInstance(section) && handleAddInstance(section.id, $event)"
        >
          <span v-if="canAddInstance(section)">点击添加</span>
          <span v-else>暂无数据</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.section-nav-tree {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  
  .nav-header {
    padding: 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    
    .nav-title {
      font-size: 16px;
      font-weight: 600;
      color: #fff;
    }
  }
  
  .nav-content {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
  }
  
  .section-group {
    margin-bottom: 12px;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
  
  .section-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    background: #f5f7fa;
    border-radius: 6px;
    cursor: default;
    transition: all 0.2s;
    
    &.has-instances {
      background: #e8f4ff;
    }
    
    .title-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .status-icon {
      font-size: 14px;
      
      &.complete { color: #52c41a; }
      &.in-progress { color: #1890ff; }
      &.required { color: #ff4d4f; }
    }
    
    .section-name {
      font-size: 14px;
      font-weight: 500;
      color: #262626;
    }
    
    .add-btn {
      opacity: 0;
      transition: opacity 0.2s;
    }
    
    &:hover .add-btn {
      opacity: 1;
    }
  }
  
  .instance-list {
    margin-top: 4px;
    margin-left: 12px;
    border-left: 2px solid #e8e8e8;
    padding-left: 12px;
  }
  
  .instance-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 12px;
    margin-bottom: 4px;
    background: #fafafa;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover {
      background: #f0f7ff;
      
      .delete-btn {
        opacity: 1;
      }
    }
    
    &.is-active {
      background: #e6f7ff;
      border-left: 3px solid #1890ff;
      margin-left: -3px;
      padding-left: 9px;
    }
    
    .instance-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .instance-info {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .status-icon.small {
      font-size: 12px;
    }
    
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      
      &.empty {
        background: #d9d9d9;
      }
    }
    
    .instance-name {
      font-size: 13px;
      color: #595959;
    }
    
    .progress-bar {
      height: 4px;
      background: #e8e8e8;
      border-radius: 2px;
      overflow: hidden;
      
      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #1890ff, #52c41a);
        border-radius: 2px;
        transition: width 0.3s;
      }
    }
    
    .delete-btn {
      opacity: 0;
      transition: opacity 0.2s;
      flex-shrink: 0;
      margin-left: 8px;
    }
  }
  
  .empty-hint {
    margin-top: 4px;
    margin-left: 12px;
    padding: 8px 12px;
    font-size: 12px;
    color: #999;
    background: #fafafa;
    border-radius: 4px;
    border: 1px dashed #d9d9d9;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover {
      color: #1890ff;
      border-color: #1890ff;
      background: #f0f7ff;
    }
  }
}
</style>
