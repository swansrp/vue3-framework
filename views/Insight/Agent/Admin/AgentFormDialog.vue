<template>
  <dialog-box
    v-model:visible="innerVisible"
    :title="isAdd ? '新增 Agent' : '编辑 Agent'"
    :width="560"
  >
    <a-form
      :model="agentForm"
      label-align="right"
      :label-col="{ span: 6 }"
      @finish="submitForm"
    >
      <a-form-item
        label="Agent 编码"
        name="agentCode"
        required
        :rules="[
          {required: true, message: '请输入 Agent 编码!'},
          {pattern: /^[a-z0-9][a-z0-9_-]*$/, message: '仅小写字母、数字、下划线、中划线'}
        ]"
      >
        <a-input
          v-model:value="agentForm.agentCode"
          :disabled="!isAdd"
          placeholder="问数时的 agent 标识，创建后不可修改"
        />
      </a-form-item>
      <a-form-item
        label="Agent 名称"
        name="agentName"
        required
        :rules="[{required: true, message: '请输入 Agent 名称!'}]"
      >
        <a-input
          v-model:value="agentForm.agentName"
          placeholder="用于页面展示"
        />
      </a-form-item>
      <a-form-item
        label="绑定数据源"
        name="dsName"
        required
        :rules="[{required: true, message: '请选择绑定数据源!'}]"
      >
        <a-select
          v-model:value="agentForm.dsName"
          placeholder="选择该 Agent 数据所在的数据源（多个 Agent 可共用同一数据源）"
        >
          <a-select-option
            v-for="ds in dsOptions"
            :key="ds"
            :value="ds"
          >
            {{ ds }}
          </a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item
        label="状态"
        name="status"
      >
        <a-switch
          v-model:checked="statusChecked"
          checked-children="启用"
          un-checked-children="停用"
        />
      </a-form-item>
      <a-form-item
        label="思考强度(问数)"
        name="thinkingBudget"
      >
        <a-select
          v-model:value="agentForm.thinkingBudget"
          placeholder="仅问数链生效；资产生成/评审的思考强度在系统参数配置"
        >
          <a-select-option :value="0">最强（不限制思考）</a-select-option>
          <a-select-option :value="8192">均衡（8k token 上限）</a-select-option>
          <a-select-option :value="2048">轻量（2k token 上限）</a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item
        label="备注"
        name="remark"
      >
        <a-textarea
          v-model:value="agentForm.remark"
          :rows="2"
        />
      </a-form-item>
      <a-form-item>
        <a-button
          html-type="submit"
          type="primary"
          style="float: right;width: 370px;"
        >
          提交
        </a-button>
      </a-form-item>
    </a-form>
  </dialog-box>
</template>

<script lang="ts" setup>
import { Ref, computed } from 'vue'
import { useRouter } from 'vue-router'

import { queryDataSources } from '@/framework/apis/dataSource'
import { addAgent, updateAgent } from '@/framework/apis/smartAgent'
import DialogBox from '@/framework/components/common/dialogBox/DialogBox.vue'

// Agent 新增/编辑弹窗：表单校验 + 数据源下拉载入，提交成功后通知父组件刷新
const props = defineProps<{
  visible: boolean,
  isAdd: boolean,
  record: any
}>()

const emit = defineEmits(['update:visible', 'saved'])

const { currentRoute } = useRouter()
const baseDomain = currentRoute.value.query
  ? currentRoute.value.query.domain ? '/' + currentRoute.value.query.domain : undefined
  : undefined

const innerVisible = computed({
  get: () => props.visible,
  set: (v: boolean) => emit('update:visible', v)
})

const agentForm: any = reactive({
  agentId: null as string | null,
  agentCode: '',
  agentName: '',
  dsName: undefined as string | undefined,
  thinkingBudget: 0 as number,
  remark: ''
})
const statusChecked = ref(true)
const dsOptions: Ref<Array<string>> = ref([])

const loadDsOptions = () =>
  queryDataSources([], [], 100, 1, baseDomain).then((res: any) => {
    dsOptions.value = (res.payload.records || []).map((r: any) => r.dsName)
  })

// 打开时重置/回填表单并载入数据源选项
watch(() => props.visible, v => {
  if (!v) return
  agentForm.agentId = props.record ? props.record.agentId : null
  agentForm.agentCode = props.record ? props.record.agentCode : ''
  agentForm.agentName = props.record ? props.record.agentName : ''
  agentForm.dsName = props.record ? props.record.dsName : undefined
  agentForm.thinkingBudget = props.record && props.record.thinkingBudget > 0 ? props.record.thinkingBudget : 0
  agentForm.remark = props.record ? props.record.remark : ''
  statusChecked.value = props.record ? props.record.status === '1' : true
  loadDsOptions()
})

const submitForm = () => {
  const data: any = { ...agentForm, status: statusChecked.value ? '1' : '0' }
  const action = props.isAdd ? addAgent(data, baseDomain) : updateAgent(data, baseDomain)
  action.then(() => {
    emit('saved')
    innerVisible.value = false
  })
}
</script>
