<template>
  <div class="search-bar">
    <a-cascader
      v-model:value="cascadeValue"
      style="width: 300px"
      multiple
      max-tag-count="responsive"
      :options="cascadeOptions"
      placeholder="请选择区域或省份"
    >
      <template #tagRender="data">
        <a-tag :key="data.value" color="blue">{{ data.label }}</a-tag>
      </template>
    </a-cascader>
    <a-select
      v-model:value="selectValue"
      show-search
      placeholder="根据姓名选择"
      style="width: 150px"
      :options="selectOptions"
    />
    <a-date-picker
      picker="week"
      @change="handleWeekChange"
      style="width: 120px"
    />
    <a-button type="primary" @click="confirmSelect">
      <template #icon><SearchOutlined /></template>筛选
    </a-button>
  </div>
</template>

<script lang="ts" setup>
import type { Dayjs } from "dayjs";
import { getSelectNameList, getCascadeAreaList } from "@/framework/apis/user/nav";
import type { SelectProps, CascaderProps } from "ant-design-vue";

import { SearchOutlined } from "@ant-design/icons-vue";

let cascadeValue = ref<string[]>([]);
let selectValue = ref<string | undefined>(undefined);
let weekValue = ref("");

let cascadeOptions = ref<CascaderProps["options"]>([]);
let selectOptions = ref<SelectProps["options"]>([]);

getSelectNameList().then((res) => {
  selectOptions.value = res.payload;
});
getCascadeAreaList().then((res) => {
  cascadeOptions.value = res.payload;
});

const handleWeekChange = (_: string | Dayjs, value: string) => {
  weekValue.value = value;
};

const confirmSelect = () => {
  const area = toRaw(cascadeValue.value).map((arr) =>
    arr.length === 1 ? arr[0] : arr[arr.length - 1]
  );
  const requestData = {
    area,
    name: selectValue.value || "",
    date: weekValue.value.replace("周", ""),
  };
};
</script>

<style scoped>
.search-bar {
  margin-left: auto;
  padding-right: 30px;
  display: flex;
  align-items: center;
}
.search-bar > * {
  margin-left: 10px;
}
</style>
