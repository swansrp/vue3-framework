<template>
  <div class="dictionary-config">
    <a-list size="small" bordered :data-source="listData" class="dictionary-config-list">
      <template #renderItem="{ item, index }">
        <a-list-item @click="getCurrentDictionaryName(item.value, item.label, index)" :class="{'activate-item': activateDictItem === index}">{{ item.label }}</a-list-item>
      </template>
      <template #header>
        <a-input-search v-model:value="inputDictionaryName" placeholder="请输入字典名称" enter-button @search="onSearch" />
      </template>
      <template #footer>
        <div class="list-footer-content">
          <a-button type="primary" @click="handleAddDict"><template #icon><PlusOutlined /></template></a-button>
        </div>
      </template>
    </a-list>
    <div class="dictionary-config-space" ref="dictionaryConfigSpace">
      <a-tabs v-if="dictConfigItem === 'currentConfig'" type="card">
        <a-tab-pane key="editNode" tab="编辑字典项">
          <div class="add-dict-item-btn">
            <a-button @click="handleAddDictItem" type="primary">新增字典项</a-button>
          </div>
          <dialog-box v-model:visible="addDictItemVisible" title="新增字典项">
            <a-form :model="addDictItemForm" :label-col="{ span: 6 }" :wrapper-col="{ span: 14 }" @finish="onAddDictItemFinish" ref="addDictItemFormRef">
              <a-form-item label="字典项名称" name="dictLabel" :rules="[{ required: true, message: '请输入字典项名称!' }]">
                <a-input v-model:value="addDictItemForm['dictLabel']" />
              </a-form-item>
              <a-form-item label="字典项值" name="dictValue" required :rules="[{ required: true, message: '请填写字典项值!' }]">
                <a-input v-model:value="addDictItemForm['dictValue']" />
              </a-form-item>
              <a-form-item :wrapper-col="{ span: 14, offset: 6 }">
                <div class="form-button-list">
                  <a-button @click="resetForm(addDictItemFormRef)">清空</a-button>
                  <a-button type="primary" html-type="submit">提交</a-button>
                </div>
              </a-form-item>
            </a-form>
          </dialog-box>
          <surely-table
            :data-source="surelyTableData"
            :columns="surelyTableColumns"
            tableId="dictEditTable"
            class="dictEditTable"
            :table-height="500"
            :table-width="contentWidth"
            ref="dictEditTable"
            :pagination="false"
            @on-row-drag="onRowDrag">
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'dictValue'">
                <div class="editable-cell">
                  <div v-if="editableData[record.key]" class="editable-cell-input-wrapper">
                    <a-input v-model:value="editableData[record.key].dictValue" @press-enter="save(record.key)" />
                    <check-outlined class="editable-cell-icon-check" @click="save(record.key)" />
                  </div>
                  <div v-else class="editable-cell-text-wrapper">
                    {{ record.dictValue || '' }}
                    <edit-outlined class="editable-cell-icon" @click="edit(record.key)" />
                  </div>
                </div>
              </template>
              <template v-if="column.dataIndex === 'dictLabel'">
                <div class="editable-cell">
                  <div v-if="editableData[record.key]" class="editable-cell-input-wrapper">
                    <a-input v-model:value="editableData[record.key].dictLabel" @press-enter="save(record.key)" />
                    <check-outlined class="editable-cell-icon-check" @click="save(record.key)" />
                  </div>
                  <div v-else class="editable-cell-text-wrapper">
                    {{ record.dictLabel || '' }}
                    <edit-outlined class="editable-cell-icon" @click="edit(record.key)" />
                  </div>
                </div>
              </template>
              <template v-if="column.dataIndex === 'isDefault'">
                <div class="editable-cell">
                  <div v-if="editableData[record.key]" class="editable-cell-input-wrapper">
                    <a-radio-group v-model:value="isDefaultInRadio" name="radioGroup">
                      <a-radio value="0">否</a-radio>
                      <a-radio value="1">是</a-radio>
                    </a-radio-group>
                    <check-outlined class="editable-cell-icon-check" @click="saveDefault(record.key)" />
                  </div>
                  <div v-else class="editable-cell-text-wrapper">
                    {{ +record.isDefault ? '是' : '否' || '' }}
                    <edit-outlined class="editable-cell-icon" @click="edit(record.key, column.dataIndex, record)" />
                  </div>
                </div>
              </template>
              <template v-else-if="column.dataIndex === 'operation'">
                <div class="table-operation-btns">
                  <delete-pop-confirm @delete-event="deleteDictItemData(record.key)" />
                </div>
              </template>
            </template>
          </surely-table>
        </a-tab-pane>
        <a-tab-pane key="deleteNode" tab="删除字典">
          <a-alert message="警告" show-icon type="error">
            <template #icon><Icon icon="WarningFilled" /></template>
            <template #description>确认删除当前字典？<br /><b>说明：该操作会删除掉当前字典对应的所有字典项</b></template>
          </a-alert>
          <a-button class="delete-btn" danger type="primary" @click="handleDeleteDict">确认删除</a-button>
        </a-tab-pane>
      </a-tabs>
      <dialog-box v-model:visible="addDictBoxVisible" title="新增字典">
        <a-form :model="addDictForm" :label-col="{ span: 6 }" :wrapper-col="{ span: 14 }" @finish="onAddDictFinish" ref="addDictFormRef">
          <a-form-item label="字典名称" name="dictTitle" :rules="[{ required: true, message: '请输入字典名称!' }]">
            <a-input v-model:value="addDictForm['dictTitle']" />
          </a-form-item>
          <a-form-item label="字典值" name="dictName" required :rules="[{ required: true, message: '请填写字典值!' }]">
            <a-input v-model:value="addDictForm['dictName']" />
          </a-form-item>
          <a-form-item :wrapper-col="{ span: 14, offset: 6 }">
            <div class="form-button-list">
              <a-button @click="resetForm(addDictFormRef)">清空</a-button>
              <a-button type="primary" html-type="submit">提交</a-button>
            </div>
          </a-form-item>
        </a-form>
      </dialog-box>
    </div>
  </div>
</template>

<script lang="ts" setup>
import * as _ from 'lodash'
import {Ref, UnwrapRef} from "vue"
import {message} from "ant-design-vue"
import {PlusOutlined, CheckOutlined, EditOutlined} from "@ant-design/icons-vue"
import {DictDateType, DictConfigItemType, DataItem} from "./types"
import { deleteDictItem, getDictItemByName, getDictNameList, updateDictItem, updateDictItemSetDefault,
  updateDictItemOrder, addDictItem, addDict, deleteDict } from "@/framework/apis/dict/dict"
import {QUERY_INTERVAL} from "@/framework/utils/constant";
import {DataNode} from "ant-design-vue/es/vc-tree/interface";

const surelyTableColumns = ref([
  {title:'序号', dataIndex: 'index', rowDrag: true, width: 70},
  {title:'字典项值', dataIndex: 'dictValue', width: 180},
  {title:'字典项名称', dataIndex: 'dictLabel', autoHeight: true, minWidth: 150},
  {title:'字典项顺序', dataIndex: 'dictSort', width: 120},
  {title:'是否为默认选项', dataIndex: 'isDefault', width: 170},
  {title: '操作', dataIndex: 'operation', fixed: 'right', width: 100},
]) // 表格的列名及其配置初始化
surelyTableColumns.value.forEach((item: any) => { item.align = 'center'; item.resizable = true })

let dictEditTable = ref()  //surely table的指针，用于去水印
let inputDictionaryName:Ref<string> = ref('') // 记录字典搜索框的值
let currentDictName:Ref<string> = ref('')  //记录当前选择的字典的值
let currentDictTitle:Ref<string> = ref('') //记录当前选择的字典的名称
let addDictFormRef: Ref<any> = ref()
let addDictItemFormRef: Ref<any> = ref()
let addDictItemVisible:Ref<boolean> = ref(false)
let addDictBoxVisible:Ref<boolean> = ref(false)
let addDictForm = ref({ dictName: '', dictTitle: ''}) //增加字典的表单变量
let addDictItemForm = ref({ dictLabel: '', dictValue: '', dictName: ''}) //增加字典项的表单变量
let listData = ref<Array<DictDateType>>([]) //保存字典列表
let dictConfigItem = ref<DictConfigItemType>('') //用于控制.dictionary-config-space是否显示
let activateDictItem:Ref<number> = ref(-1) //记录当前选择的字典列表的索引，用于点击字典名称后的高亮效果
let surelyTableData:Ref<DataNode[]> = ref([]) //展示字典所有字典项的表格
// 这个变量就是为了显示radio的变化，如果radio不绑定一个可变的值，就算改变radio 的选项，在页面中也不会体现
let isDefaultInRadio: Ref<any> = ref('') // 所以需要这个看似用不着的变量

let contentWidth: Ref<number> = ref(300)
let dictionaryConfigSpace = ref()

const editableData: UnwrapRef<Record<string, DataItem>> = reactive({}) //保存surely table当前编辑的数据
const getCurrentDictionaryName = (dictionaryValue: string, dictionaryLabel: string, index:number) => {
  activateDictItem.value = index
  dictConfigItem.value = 'currentConfig'
  currentDictTitle.value = dictionaryLabel
  currentDictName.value = dictionaryValue
  getDictItem()
}

const getDictItem = () => {
  getDictItemByName({dictName: currentDictName.value}).then(res => {
    surelyTableData.value = res.payload
    // 需要对后台数据增加key和index两个字段
    surelyTableData.value.forEach((item:any, index: number) => { item['key'] = item.dictId; item['index'] = index + 1 })
    updateContentWidth()
  })
}

const getDictList = () => getDictNameList({name: inputDictionaryName.value}).then(res => res.payload && (listData.value = res.payload))
const edit = (key: string, columnDataIndex?: string, record?:DataNode) => {
  editableData[key] = _.cloneDeep(surelyTableData.value.filter((item: DataNode) => key === item.key)[0]) as DataItem
  if (columnDataIndex === 'isDefault' && record) {
    isDefaultInRadio.value = record.isDefault
    editableData[key].isDefault = record.isDefault
  }
}
const save = (key: string) => {
  updateDictItem(toRaw(editableData[key])).then(() => getDictItem())
  delete editableData[key]
}

const saveDefault = (key: string) => {
  updateDictItemSetDefault({dictId: key, dictName: currentDictName.value}).then(() => getDictItem())
  delete editableData[key]
}

const handleDeleteDict = () => {
  deleteDict({id: currentDictName.value}).then(() => {
    getDictList()
    dictConfigItem.value = ''
    currentDictName.value = ''
    currentDictTitle.value = ''
  })
}

const onSearch = () => getDictList()
const onAddDictItemFinish = () => {
  addDictItemForm.value['dictName'] = currentDictName.value
  addDictItem(addDictItemForm.value).then(() => {
    getDictItem()
    resetForm(addDictItemFormRef)
    addDictItemVisible.value = false
  })
}

const onAddDictFinish = () => {
  addDict(addDictForm.value).then(() => {
    inputDictionaryName.value = ''
    getDictList()
    resetForm(addDictFormRef)
    addDictBoxVisible.value = false
  })
}

const deleteDictItemData = (key: number) => {
  if (surelyTableData.value.length === 1) {
    message.warning({
      content: () => '只剩一个字典项时无法执行字典项删除操作，因为这会导致字典项对应的字典没有存在意义，或许您可以直接删除字典项对应的字典',
      style: { margin: '0 auto', marginTop: '20vh', width: '650px' },
      duration: 5
    })
  } else { deleteDictItem({id: key}).then(() => getDictItem()) }
}
const resetForm = (formRef: Ref) => formRef.value!.resetFields()
const handleAddDictItem = () => addDictItemVisible.value = true
const handleAddDict = () => addDictBoxVisible.value = true
const onRowDrag = (updatedTableData : Array<object>) => {
  const requestData = toRaw(updatedTableData).map((item: any, index: number) => ({id: item.dictId, showOrder: index}))
  updateDictItemOrder(requestData).then(() => getDictItem())
}

getDictList() //初始化字典列表

watch(inputDictionaryName, _.debounce(() => { getDictList() }, QUERY_INTERVAL))

const updateContentWidth = () => {
  if (dictionaryConfigSpace && dictionaryConfigSpace.value)
    contentWidth.value = dictionaryConfigSpace.value.offsetWidth - 45
}

window.addEventListener('resize', _.debounce(updateContentWidth, 50))

</script>

<style scoped lang="less">
.dictionary-config {
  display: flex;
  height: calc(100% - 80px);
}
.dictionary-config-list {
  width: 250px;
  height: calc(100% - 15px);
  box-shadow: 0 4px 10px 0 rgba(69, 89, 120, 0.5);
  margin: 10px 15px;
}
:deep(.dictionary-config-list .ant-spin-container){
  max-height: 680px;
  overflow: auto;
  cursor: pointer;
}
:deep(.dictionary-config-list .ant-spin-container li:hover){
  background-color: #e6f7ff;
  border-right: 3px solid #1890ff;
}
.activate-item {
  background-color: #e6f7ff;
  border-right: 3px solid #1890ff;
}

.list-footer-content {
  display: flex;
  justify-content: flex-end;
}
.dictionary-config-space {
  height: calc(100% - 15px);
  box-sizing: border-box;
  padding: 20px;
  margin-top: 10px;
  flex: 1 0 auto;
}

.dictEditTable{
  position: absolute;
  margin-top: 10px;
}

.dictionary-config .delete-btn {
  float: right;
  margin-top: 10px;
}

.editable-cell {
  position: relative;
  .editable-cell-input-wrapper,
  .editable-cell-text-wrapper {
    padding-right: 24px;
  }

  .editable-cell-text-wrapper {
    padding: 5px 24px 5px 5px;
  }

  .editable-cell-icon,
  .editable-cell-icon-check {
    position: absolute;
    right: 0;
    width: 20px;
    cursor: pointer;
  }

  .editable-cell-icon {
    margin-top: 4px;
    display: inline-block;
    // display: none;
  }

  .editable-cell-icon-check {
    line-height: 28px;
  }

  .editable-cell-icon:hover,
  .editable-cell-icon-check:hover {
    color: #108ee9;
  }
}
.editable-cell:hover .editable-cell-icon {
  display: inline-block;
}

.add-dict-item-btn {
  margin-bottom: 8px;
  margin-right: 5px;
  margin-top: -55px;
  display: flex;
  justify-content: flex-end;
}
.form-button-list {
  display: flex;
  justify-content: space-between;
}
.form-button-list button {
  width: 45%;
}
</style>
