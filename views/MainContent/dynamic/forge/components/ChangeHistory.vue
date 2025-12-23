<template>
  <div class="change-history">
    <div class="action-bar">
      <a-space>
        <a-button
          type="primary"
          :loading="exportLoading"
          :disabled="dataSource.length === 0"
          @click="handleExport"
        >
          <template #icon>
            <DownloadOutlined />
          </template>
          导出变更日志
        </a-button>
        <a-button
          :loading="importLoading"
          @click="handleImport"
        >
          <template #icon>
            <UploadOutlined />
          </template>
          导入变更日志
        </a-button>
      </a-space>
    </div>
    
    <a-spin :spinning="loading">
      <a-timeline mode="left">
        <a-timeline-item
          v-for="item in groupedLogs"
          :key="item.version"
          :color="getVersionColor(item.logs)"
        >
          <template #dot>
            <span class="version-dot">v{{ item.version }}</span>
          </template>
          <div class="version-block">
            <div class="version-header">
              <h3>版本 {{ item.version }}</h3>
              <span class="version-time">{{ item.logs[0]?.createAt }}</span>
            </div>
            <a-space
              direction="vertical"
              style="width: 100%"
            >
              <a-card
                v-for="log in item.logs"
                :key="log.id"
                size="small"
                :class="['change-card', log.executeStatus === '0' ? 'error' : '']"
              >
                <div class="change-header">
                  <a-space>
                    <a-tag :color="getChangeTypeColor(log.changeType)">
                      {{ getChangeTypeText(log.changeType) }}
                    </a-tag>
                    <a-tag :color="getExecuteStatusColor(log.executeStatus)">
                      {{ getExecuteStatusText(log.executeStatus) }}
                    </a-tag>
                    <span
                      v-if="log.affectedColumn"
                      class="affected-column"
                    >
                      字段: {{ log.affectedColumn }}
                    </span>
                  </a-space>
                </div>
                <div class="change-desc">
                  {{ log.changeDesc }}
                </div>
                <div
                  v-if="log.ddlStatement"
                  class="ddl-statement"
                >
                  <a-button
                    type="link"
                    size="small"
                    @click="toggleDDL(log.id!)"
                  >
                    {{ expandedDDL.has(log.id!) ? '收起' : '查看' }} DDL 语句
                  </a-button>
                  <pre v-if="expandedDDL.has(log.id!)"><code>{{ log.ddlStatement }}</code></pre>
                </div>
                <div
                  v-if="log.errorMsg"
                  class="error-msg"
                >
                  <a-alert
                    type="error"
                    :message="log.errorMsg"
                    banner
                  />
                </div>
              </a-card>
            </a-space>
          </div>
        </a-timeline-item>
      </a-timeline>

      <a-empty
        v-if="dataSource.length === 0 && !loading"
        description="暂无变更历史"
      />
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'
import { ref, computed, onMounted } from 'vue'

import type { MatrixInfo, MatrixChangeLog } from '../types'
import { CHANGE_TYPES, EXECUTE_STATUS } from '../types'

import { 
  sysMatrixChangeLogGeneralSelect,
  exportChangeLog,
  importChangeLog
} from '@/framework/views/MainContent/dynamic/apis/sysMatrixChangeLogPortalController'
import { FILTER_TYPE } from '@/framework/components/common/Portal/type'
import { buildCondition } from '@/framework/components/common/Portal/utils'

interface Props {
  matrix: MatrixInfo
}

const props = defineProps<Props>()

const dataSource = ref<MatrixChangeLog[]>([])
const loading = ref(false)
const expandedDDL = ref<Set<string>>(new Set())
const exportLoading = ref(false)
const importLoading = ref(false)

// 按版本分组
const groupedLogs = computed(() => {
  const groups = new Map<number, MatrixChangeLog[]>()
  
  dataSource.value.forEach(log => {
    const version = log.version
    if (!groups.has(version)) {
      groups.set(version, [])
    }
    groups.get(version)!.push(log)
  })
  
  // 转换为数组并按版本号降序排列
  return Array.from(groups.entries())
    .map(([version, logs]) => ({ version, logs }))
    .sort((a, b) => b.version - a.version)
})

const loadData = async () => {
  loading.value = true
  try {
    const res = await sysMatrixChangeLogGeneralSelect(
      {
        conditionList: [
          buildCondition('matrixId', FILTER_TYPE.EQUAL, [props.matrix.id])
        ],
      },
      false,
      false
    )
    
    if (res.status?.code === 0) {
      dataSource.value = (res.payload || []) as MatrixChangeLog[]
    }
  } catch (error) {
    console.error('加载变更历史失败:', error)
  } finally {
    loading.value = false
  }
}

const toggleDDL = (id: string) => {
  if (expandedDDL.value.has(id)) {
    expandedDDL.value.delete(id)
  } else {
    expandedDDL.value.add(id)
  }
}

const getChangeTypeText = (type: string) => {
  return CHANGE_TYPES.find(t => t.value === type)?.label || type
}

const getChangeTypeColor = (type: string) => {
  return CHANGE_TYPES.find(t => t.value === type)?.color || 'default'
}

const getExecuteStatusText = (status: string) => {
  return EXECUTE_STATUS.find(s => s.value === status)?.label || status
}

const getExecuteStatusColor = (status: string) => {
  return EXECUTE_STATUS.find(s => s.value === status)?.color || 'default'
}

const getVersionColor = (logs: MatrixChangeLog[]) => {
  // 如果有失败的记录，显示红色
  if (logs.some(log => log.executeStatus === '0')) {
    return 'red'
  }
  // 否则显示蓝色
  return 'blue'
}

const handleExport = async () => {
  exportLoading.value = true
  try {
    const res = await exportChangeLog(
      { id: props.matrix.id },
      false,
      false
    )
    
    if (res.status?.code === 0 && res.payload) {
      // 创建 Blob 并下载
      const blob = new Blob([res.payload], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `matrix_${props.matrix.id}_changelog_${new Date().getTime()}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      message.success('变更日志导出成功')
    }
  } catch (error) {
    console.error('导出变更日志失败:', error)
    message.error('导出变更日志失败')
  } finally {
    exportLoading.value = false
  }
}

const handleImport = () => {
  // 创建文件选择器
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  
  input.onchange = async (e: Event) => {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    
    if (!file) return
    
    importLoading.value = true
    try {
      const reader = new FileReader()
      
      reader.onload = async (e) => {
        try {
          const changeLogData = e.target?.result as string
          
          // 确认导入
          Modal.confirm({
            title: '确认导入',
            content: `确定要导入变更日志到矩阵 "${props.matrix.tableComment || props.matrix.tableName}" 吗？这将同步其他环境的变更记录。`,
            okText: '确定',
            cancelText: '取消',
            onOk: async () => {
              try {
                const res = await importChangeLog(
                  { changeLogData },
                  false,
                  true
                )
                
                if (res.status?.code === 0) {
                  message.success('变更日志导入成功')
                  // 重新加载数据
                  await loadData()
                }
              } catch (error) {
                console.error('导入变更日志失败:', error)
                message.error('导入变更日志失败')
              }
            }
          })
        } catch (error) {
          console.error('读取文件失败:', error)
          message.error('读取文件失败，请确保文件格式正确')
        } finally {
          importLoading.value = false
        }
      }
      
      reader.onerror = () => {
        message.error('读取文件失败')
        importLoading.value = false
      }
      
      reader.readAsText(file)
    } catch (error) {
      console.error('处理文件失败:', error)
      message.error('处理文件失败')
      importLoading.value = false
    }
  }
  
  input.click()
}

onMounted(() => {
  loadData()
})
</script>

<style scoped lang="less">
.change-history {
  padding: 20px;

  .action-bar {
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid #f0f0f0;
  }

  .version-dot {
    display: inline-block;
    padding: 2px 8px;
    background: #1890ff;
    color: white;
    border-radius: 10px;
    font-size: 12px;
    font-weight: bold;
  }

  .version-block {
    margin-bottom: 20px;

    .version-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;

      h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }

      .version-time {
        color: #999;
        font-size: 12px;
      }
    }
  }

  .change-card {
    &.error {
      border-color: #ff4d4f;
    }

    .change-header {
      margin-bottom: 8px;

      .affected-column {
        color: #666;
        font-size: 12px;
      }
    }

    .change-desc {
      margin-bottom: 8px;
      color: #333;
    }

    .ddl-statement {
      pre {
        margin-top: 8px;
        padding: 12px;
        background: #f5f5f5;
        border-radius: 4px;
        overflow-x: auto;

        code {
          font-size: 12px;
          color: #333;
        }
      }
    }

    .error-msg {
      margin-top: 8px;
    }
  }
}
</style>
