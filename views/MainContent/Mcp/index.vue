<template>
  <a-tabs :active-key="endpoint" style="margin-left: 20px">
    <a-tab-pane
      v-for="category in mcpEndpoint"
      :key="category.value"
      :tab="category.label"
    >
      <a-radio-group v-model:value="type" button-style="solid">
        <a-radio-button
          v-for="item in mcpType"
          :key="item.value"
          :value="item.value"
        >
          {{ item.label }}
        </a-radio-button>
      </a-radio-group>
      <div class="card-grid">
        <a-card
          v-for="item in mcpList"
          :key="item.name"
          :title="item.name"
          class="card-item"
        >
          <template #extra>
            <a-button type="link" @click="toggleEdit(item)">
              {{ item.editing ? '保存' : '编辑' }}
            </a-button>
          </template>
          <div v-if="!item.editing">
            {{ item.description }}
          </div>
          <div v-else>
            <a-textarea
              v-model:value="item.tempDescription"
              :rows="5"
            />
          </div>
        </a-card>
      </div>
    </a-tab-pane>
  </a-tabs>
</template>

<script lang="ts" setup>
import { dictStore } from '@/framework/store/common'
import { Ref } from 'vue'
import { getMcpEndpoint, getMcpList, updateMcpDescription } from '@/framework/apis/mcp'

const dict = dictStore()
const endpoint = ref()
const mcpEndpoint: Ref<Array<any>> = ref([])
const type = ref('0')
const mcpType: Ref<Array<any>> = ref([])
const mcpList: Ref<Array<any>> = ref([])

// 编辑或保存
const toggleEdit = async (item: any) => {
  if (item.editing) {
    // 保存状态，模拟 API 请求
    await updateMcpDescription(endpoint.value, type.value, item.name, item.tempDescription, baseUrl.value)
    item.description = item.tempDescription
  } else {
    // 进入编辑状态，临时保存当前内容
    item.tempDescription = item.description
  }
  item.editing = !item.editing
}
const baseUrl: Ref<string|undefined> = ref(undefined)
const { currentRoute } = useRouter()
const route = currentRoute.value
onMounted(async () => {
  route.query && route.query.baseUrl && (baseUrl.value =  route.query.baseUrl as string)
  await getMcpEndpoint(baseUrl.value).then((resp: any) => {
    mcpEndpoint.value = resp.payload
    endpoint.value = mcpEndpoint.value[0].value
  })
  await dict.getDict('MCP_TYPE_DICT').then(res => mcpType.value = res)
  watch(
    () => [endpoint.value, type.value],
    () => getMcpList(endpoint.value, type.value, baseUrl.value).then((resp: any) => {
      mcpList.value = resp.payload
    }),
    {
      immediate: true
    }
  )
})
</script>

<style lang="less" scoped>
.card-grid {
  margin-top: 30px;
  padding-right: 20px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); /* 自动换行，最小450px */
  gap: 16px;
  width: 100%;
}

.card-item {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>