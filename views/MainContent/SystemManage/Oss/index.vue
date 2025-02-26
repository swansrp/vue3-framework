<template>
  <content-layout width="210">
    <template #side>
      <dict-content
        v-model="currentCategory"
        dict="OSS_TYPE_DICT"
      />
    </template>
    <template #content>
      <div v-if="_.$isNotEmpty(currentCategory)" style="margin-top: 20px">
        <portal
          :key="currentCategory"
          ref="portalRef"
          :advance-condition="advanceCondition"
          :index-width="100"
          :row-allow-delete="({record}) => record.show === '0'"
          :row-allow-edit="({record}) => record.show === '0'"
          index-title=""
          mode-lock
          table-id="SaObjectStorage">
          <template #bodyCell_uri="{record}">
            <multimedia
              v-if="record.type === '5'" v-model="record.uri" :download-able="false" :type="FIELD_TYPE.AUDIO"
              useOriginalFileName />
            <multimedia
              v-else-if="record.type === '2'" v-model="record.uri" :download-able="false" :type="FIELD_TYPE.IMAGE"
              useOriginalFileName />
            <div v-else>{{ record.uri }}</div>
          </template>
          <template #action="{record}">
            <div style="display: flex;justify-content: center">
              <a-button type="link" @click="copy(record.uri)">复制地址</a-button>
              <a-button type="link" @click="downloadUrl(record.uri, record.name)">下载</a-button>
            </div>
          </template>
        </portal>
      </div>
    </template>
  </content-layout>
</template>

<script lang="ts" setup>

import Portal from "@/framework/components/common/Portal/index.vue";
import { FIELD_TYPE, FILTER_TYPE } from "@/framework/components/common/Portal/type";
import { Ref } from "vue";
import { ConditionListType } from "@/framework/components/common/AdvancedSearch/ConditionList/type";
import { message } from "ant-design-vue";
import { downloadUrl } from "@/framework/network/request";
const _ = getInstance()
const currentCategory = ref()
const advanceCondition: Ref<ConditionListType | undefined> = computed(() => {
  return {
    conditionList: [{
      property: 'type',
      relation: FILTER_TYPE.EQUAL,
      value: [...currentCategory.value]
    }]
  } as ConditionListType | undefined
})
const copy = async (str: any) => {
  await navigator.clipboard.writeText(str)
  message.info('已复制')
}
</script>


<style lang="less" scoped>

</style>