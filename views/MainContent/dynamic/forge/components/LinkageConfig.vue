<template>
  <div class="linkage-config">
    <div class="toolbar">
      <a-button
        type="primary"
        @click="handleAdd"
      >
        <template #icon>
          <PlusOutlined />
        </template>
        添加联动规则
      </a-button>
    </div>

    <a-table
      :columns="columns"
      :data-source="dataSource"
      :loading="loading"
      row-key="id"
      :pagination="false"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'isEnabled'">
          <a-switch
            v-model:checked="record.isEnabled"
            checked-value="1"
            un-checked-value="0"
            @change="handleToggle(record)"
          />
        </template>
        <template v-else-if="column.key === 'action'">
          <a-space>
            <a-button
              type="link"
              size="small"
              @click="handleEdit(record)"
            >
              编辑
            </a-button>
            <a-button
              type="link"
              size="small"
              @click="handleTest(record)"
            >
              测试
            </a-button>
            <a-popconfirm
              title="确定删除该联动规则吗？"
              @confirm="handleDelete(record)"
            >
              <a-button
                type="link"
                danger
                size="small"
              >
                删除
              </a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>

    <!-- 联动配置弹窗 -->
    <a-modal
      v-model:open="modalVisible"
      :title="modalTitle"
      width="900px"
      @ok="handleSubmit"
      @cancel="handleCancel"
    >
      <a-form
        ref="formRef"
        :model="formData"
        :label-col="{ span: 5 }"
        :wrapper-col="{ span: 18 }"
      >
        <a-form-item
          label="触发字段"
          name="formConfigId"
          :rules="[{ required: true, message: '请选择触发字段' }]"
        >
          <a-select
            v-model:value="formData.formConfigId"
            placeholder="请选择字段"
            :disabled="!!formData.id"
          >
            <a-select-option
              v-for="config in formConfigs"
              :key="config.id"
              :value="config.id"
            >
              {{ config.label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item
          label="联动名称"
          name="linkageName"
          :rules="[{ required: true, message: '请输入联动名称' }]"
        >
          <a-input
            v-model:value="formData.linkageName"
            placeholder="如: 自动计算总分"
          />
        </a-form-item>
        <a-form-item
          label="触发事件"
          name="triggerEvent"
          :rules="[{ required: true, message: '请选择触发事件' }]"
        >
          <a-select v-model:value="formData.triggerEvent">
            <a-select-option
              v-for="item in TRIGGER_EVENTS"
              :key="item.value"
              :value="item.value"
            >
              {{ item.label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item
          label="条件脚本"
          name="conditionScript"
        >
          <a-textarea
            v-model:value="formData.conditionScript"
            placeholder="如: score1 != null && score2 != null"
            :rows="3"
          />
          <div class="help-text">
            当条件为真时执行动作脚本。留空表示总是执行。
          </div>
        </a-form-item>
        <a-form-item
          label="动作脚本"
          name="actionScript"
          :rules="[{ required: true, message: '请输入动作脚本' }]"
        >
          <a-textarea
            v-model:value="formData.actionScript"
            placeholder="如: totalScore = parseFloat(score1) + parseFloat(score2);"
            :rows="5"
          />
          <div class="help-text">
            使用 JavaScript 语法。可访问表单中所有字段（通过字段名）。
          </div>
        </a-form-item>
        <a-form-item
          label="目标字段"
          name="targetFields"
        >
          <a-input
            v-model:value="formData.targetFields"
            placeholder="多个字段用逗号分隔，如: totalScore,avgScore"
          />
          <div class="help-text">
            脚本执行后会更新这些字段的值。
          </div>
        </a-form-item>
        <a-form-item
          label="优先级"
          name="priority"
        >
          <a-input-number
            v-model:value="formData.priority"
            :min="0"
            style="width: 100%"
          />
          <div class="help-text">
            数字越小优先级越高。
          </div>
        </a-form-item>
        <a-form-item
          label="是否启用"
          name="isEnabled"
        >
          <a-radio-group v-model:value="formData.isEnabled">
            <a-radio value="1">
              启用
            </a-radio>
            <a-radio value="0">
              禁用
            </a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item
          label="排序"
          name="sort"
        >
          <a-input-number
            v-model:value="formData.sort"
            :min="0"
            style="width: 100%"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 测试弹窗 -->
    <a-modal
      v-model:open="testModalVisible"
      title="测试联动规则"
      width="700px"
      @ok="executeTest"
      @cancel="testModalVisible = false"
    >
      <a-alert
        message="在下方输入测试数据，点击确定执行联动计算"
        type="info"
        show-icon
        style="margin-bottom: 16px"
      />
      <a-form
        :label-col="{ span: 6 }"
        :wrapper-col="{ span: 16 }"
      >
        <a-form-item
          v-for="config in formConfigs"
          :key="config.id"
          :label="config.label"
        >
          <a-input v-model:value="testData[config.label]" />
        </a-form-item>
      </a-form>
      <a-divider>执行结果</a-divider>
      <pre class="test-result">{{ testResult }}</pre>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { PlusOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { ref, reactive, onMounted } from 'vue'


import type { LinkageInfo, MatrixInfo, FormConfigInfo } from '../types'
import { TRIGGER_EVENTS } from '../types'

import {
  sysFormLinkageGeneralSelect,
  sysFormLinkageAdd,
  sysFormLinkageUpdate,
  sysFormLinkageDeleteItem,
  executeLinkage,
} from '@/apis/sysFormLinkagePortalController'

interface Props {
  matrix: MatrixInfo
  formConfigs: FormConfigInfo[]
}

const props = defineProps<Props>()

const columns = [
  { title: '排序', dataIndex: 'sort', key: 'sort', width: 80 },
  { title: '联动名称', dataIndex: 'linkageName', key: 'linkageName', width: 150 },
  { title: '触发事件', dataIndex: 'triggerEvent', key: 'triggerEvent', width: 100 },
  { title: '目标字段', dataIndex: 'targetFields', key: 'targetFields', width: 150 },
  { title: '优先级', dataIndex: 'priority', key: 'priority', width: 80 },
  { title: '启用', dataIndex: 'isEnabled', key: 'isEnabled', width: 80 },
  { title: '操作', key: 'action', width: 200, fixed: 'right' },
]

const dataSource = ref<LinkageInfo[]>([])
const loading = ref(false)

const modalVisible = ref(false)
const modalTitle = ref('添加联动规则')
const formRef = ref()
const formData = reactive<LinkageInfo>({
  formConfigId: '',
  linkageName: '',
  triggerEvent: 'change',
  conditionScript: '',
  actionScript: '',
  targetFields: '',
  priority: 1,
  isEnabled: '1',
  sort: 1,
})

const testModalVisible = ref(false)
const testData = reactive<Record<string, any>>({})
const testResult = ref('')
const currentTestConfig = ref<LinkageInfo>()

const loadData = async () => {
  loading.value = true
  try {
    // 获取所有表单配置的ID
    const formConfigIds = props.formConfigs.map(c => c.id).filter(Boolean)
    if (formConfigIds.length === 0) {
      dataSource.value = []
      return
    }

    const res = await sysFormLinkageGeneralSelect(
      {
        conditions: [
          {
            field: 'formConfigId',
            operator: 'in',
            value: formConfigIds,
          },
        ],
        orders: [{ field: 'sort', order: 'asc' }],
      },
      false,
      false
    )
    if (res.status?.code === 0) {
      dataSource.value = res.payload || []
    }
  } catch (error) {
    console.error('加载数据失败:', error)
  } finally {
    loading.value = false
  }
}

const handleAdd = () => {
  modalTitle.value = '添加联动规则'
  Object.assign(formData, {
    formConfigId: '',
    linkageName: '',
    triggerEvent: 'change',
    conditionScript: '',
    actionScript: '',
    targetFields: '',
    priority: 1,
    isEnabled: '1',
    sort: dataSource.value.length + 1,
  })
  delete formData.id
  modalVisible.value = true
}

const handleEdit = (record: LinkageInfo) => {
  modalTitle.value = '编辑联动规则'
  Object.assign(formData, record)
  modalVisible.value = true
}

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    let res
    if (formData.id) {
      res = await sysFormLinkageUpdate({}, formData as any)
    } else {
      res = await sysFormLinkageAdd(formData as any)
    }
    if (res.status?.code === 0) {
      message.success(formData.id ? '更新成功' : '添加成功')
      modalVisible.value = false
      loadData()
    }
  } catch (error) {
    console.error('提交失败:', error)
  }
}

const handleCancel = () => {
  modalVisible.value = false
  formRef.value?.resetFields()
}

const handleDelete = async (record: LinkageInfo) => {
  try {
    const res = await sysFormLinkageDeleteItem({ id: record.id })
    if (res.status?.code === 0) {
      message.success('删除成功')
      loadData()
    }
  } catch (error) {
    console.error('删除失败:', error)
  }
}

const handleToggle = async (record: LinkageInfo) => {
  try {
    await sysFormLinkageUpdate({}, record as any)
    message.success(record.isEnabled === '1' ? '已启用' : '已禁用')
  } catch (error) {
    console.error('更新失败:', error)
    // 恢复原值
    record.isEnabled = record.isEnabled === '1' ? '0' : '1'
  }
}

const handleTest = (record: LinkageInfo) => {
  currentTestConfig.value = record
  // 初始化测试数据
  props.formConfigs.forEach(config => {
    testData[config.label] = ''
  })
  testResult.value = ''
  testModalVisible.value = true
}

const executeTest = async () => {
  try {
    const res = await executeLinkage(
      { formConfigId: Number(currentTestConfig.value!.formConfigId) },
      testData
    )
    if (res.status?.code === 0) {
      testResult.value = JSON.stringify(res.payload, null, 2)
      message.success('执行成功')
    }
  } catch (error) {
    console.error('执行失败:', error)
    testResult.value = '执行失败: ' + error
  }
}

onMounted(() => {
  if (props.formConfigs.length > 0) {
    loadData()
  }
})
</script>

<style scoped lang="less">
.linkage-config {
  height: 100%;
  display: flex;
  flex-direction: column;

  .toolbar {
    margin-bottom: 16px;
  }

  .help-text {
    font-size: 12px;
    color: #999;
    margin-top: 4px;
  }

  .test-result {
    background: #f5f5f5;
    padding: 12px;
    border-radius: 4px;
    max-height: 300px;
    overflow: auto;
  }
}
</style>
