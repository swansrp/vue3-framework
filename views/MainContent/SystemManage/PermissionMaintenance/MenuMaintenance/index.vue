<template>
  <div class="menu-config">
    <!--展示树状结构的样式-->
    <div class="menu-tree">
      <div class="menu-category">
        {{ menuName }}
      </div>
      <!--如果treeData的length为0，说明没有数据，展示提示信息-->
      <div
        v-if="!treeData || !treeData.length"
        class="no-data"
      >
        暂无数据
      </div>
      <!--使用treeData作为a-tree的key，实现在数据更新时，正确渲染a-tree的样式-->
      <a-tree
        :key="treeData"
        v-model:selected-keys="treeSelectKey"
        :default-expand-all="true"
        :show-line="true"
        :tree-data="treeData"
        style="overflow: auto; max-height: 550px"
        draggable
        @drop="onDrop"
        @select="selectTreeNode"
      >
        <!--使用title插槽自定义a-tree的图标-->
        <template #title="{ dataRef }">
          <Icon :icon="dataRef.icon" />
          {{ dataRef.title }}
        </template>
      </a-tree>
      <!--底部按钮列表-->
      <div class="nav-switch-btn-list">
        <a-button
          type="primary"
          @click="addRootMenu"
        >
          <template #icon>
            <file-add-filled />
          </template>
          新增节点
        </a-button>
        <a-button
          v-show="menuNameListIndex === 1"
          type="primary"
          @click="backToMainMenu"
        >
          <template #icon>
            <left-outlined />
          </template>
          返回主菜单
        </a-button>
        <a-button
          v-show="menuNameListIndex === 0"
          :disabled="!canEnterSubMenuFlag"
          type="primary"
          @click="enterSubMenu"
        >
          <template #icon>
            <right-outlined />
          </template>
          进入子菜单
        </a-button>
      </div>
    </div>
    <!--节点信息配置区域-->
    <div class="menu-config-space">
      <!--为左侧导航的编辑提供一个标题，以展示该左侧导航菜单属于哪一个横向导航菜单-->
      <div
        v-show="menuTitle"
        class="sub-menu-title"
      >
        {{ menuTitle }}
        <span v-if="menuNameListIndex">{{ subMenuCurrentPath }}</span>
      </div>
      <a-tabs
        v-if="menuConfigItem === 'currentConfig'"
        v-model:active-key="tabActiveKey"
        type="card"
        @change="tabsChange"
      >
        <a-tab-pane
          key="editNode"
          :tab="isButton()?'编辑按钮':'编辑节点'"
        >
          <tree-edit-form
            :form-state="editMenuFormState"
            :grand-id="grandId"
            :menu-id="menuId"
            :type="EDIT"
          />
        </a-tab-pane>
        <a-tab-pane
          v-if="menuNameListIndex === 1 && !isButton()"
          key="addSubMenu"
          tab="增加子菜单"
        >
          <tree-edit-form
            :form-state="addSubMenuFormState"
            :grand-id="grandId"
            :menu-id="menuId"
            type="add_menu"
          />
        </a-tab-pane>
        <a-tab-pane
          v-if="menuNameListIndex === 1 && !isButton()"
          key="addMenuButton"
          tab="增加按钮"
        >
          <tree-edit-form
            :form-state="addSubMenuFormState"
            :grand-id="grandId"
            :menu-id="menuId"
            type="add_button"
          />
        </a-tab-pane>
        <a-tab-pane
          key="deleteNode"
          :tab="isButton()?'删除按钮':'删除节点'"
        >
          <a-alert
            message="警告"
            show-icon
            type="error"
          >
            <template #icon>
              <Icon icon="WarningFilled" />
            </template>
            <template #description>
              确认删除当前节点？<br /><b>说明：只有当前接节点不含有子节点时才允许删除该节点</b>
            </template>
          </a-alert>
          <a-button
            :disabled="disableDeleteBtn"
            class="delete-btn"
            danger
            type="primary"
            @click="deleteNode"
          >
            确认删除
          </a-button>
        </a-tab-pane>
      </a-tabs>
      <div
        v-if="menuConfigItem === 'addRootMenu'"
        class="add-root-menu"
      >
        <div class="add-root-menu-title">
          新增根节点
        </div>
        <tree-edit-form
          :form-state="addRootMenuFormState"
          :grand-id="grandId"
          type="add_menu"
        />
      </div>
      <div
        v-if="!menuConfigItem"
        class="config-warning"
      >
        顶部导航和左侧导航的叶子节点必须要配置"路由路径"和"组件地址"
      </div>
    </div>
        
    <!--菜单绑定信息区域-->
    <div class="permit-source-panel">
      <div class="panel-title">
        菜单绑定情况
      </div>
      <a-spin :spinning="permitSourceLoading">
        <div
          v-if="!menuId"
          class="empty-tip"
        >
          请先选择一个菜单节点
        </div>
        <div
          v-else-if="permitSourceData.length === 0 && !permitSourceLoading"
          class="empty-tip"
        >
          该菜单暂无绑定信息
        </div>
        <div
          v-else
          class="permit-source-list"
        >
          <a-timeline mode="left">
            <a-timeline-item
              v-for="(item, index) in permitSourceData"
              :key="index"
              :color="getSourceTypeColor(item.sourceType)"
            >
              <div class="permit-item">
                <div class="permit-header">
                  <a-tag
                    :color="getSourceTypeColor(item.sourceType)"
                    class="source-tag"
                  >
                    {{ getSourceTypeLabel(item.sourceType) }}
                  </a-tag>
                  <span class="source-name">{{ item.sourceName }}</span>
                </div>
                <div class="permit-path">
                  {{ item.path }}
                </div>
              </div>
            </a-timeline-item>
          </a-timeline>
        </div>
      </a-spin>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { FileAddFilled, LeftOutlined, RightOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { Key } from 'ant-design-vue/es/_util/type'
import { AntTreeNodeDropEvent } from 'ant-design-vue/es/tree'
import { DataNode } from 'ant-design-vue/es/vc-tree/interface'
import { Ref } from 'vue'

import { changePID, deleteMainMenu, getMainMenu, getSubMenu, updateMenuOrder, getPermitSource } from '@/framework/apis/admin/navEdit'
import TreeEditForm from '@/framework/components/common/treeEditForm/TreeEditForm.vue'
import { FormState } from '@/framework/components/common/treeEditForm/type'
import { getDroppedData } from '@/framework/hooks/antTreeDropSort'
import { getAllParentNodes, getBrotherNodes, setField } from '@/framework/utils/common'
import { EDIT } from '@/framework/utils/constant'

const _initFormState: FormState = {
  title: '',
  icon: 'SettingOutlined',
  menuType: 0,
  isCache: false,
  isFrame: false,
  path: '',
  query: '',
  pid: undefined,
  grandId: undefined,
  menuId: undefined,
  component: ''
}

let menuId: Ref<number | undefined> = ref(undefined)
let grandId: Ref<number | undefined> = ref(undefined)
let menuTitle: Ref<string> = ref('')
let subMenuCurrentPath: Ref<string> = ref('')
let tabActiveKey = ref('editNode')
let treeSelectKey: Ref<TreeKeyType> = ref<TreeKeyType>([])
let treeData: Ref<Array<DataNode>> = ref([])
let menuConfigItem = ref<MenuConfigItem>('')
let editMenuFormState: FormState = reactive<FormState>({ ..._initFormState })
let addSubMenuFormState: FormState = reactive<FormState>({ ..._initFormState })
let addRootMenuFormState: FormState = reactive<FormState>({ ..._initFormState })
let canEnterSubMenuFlag: Ref<boolean> = ref(false)

// 菜单绑定信息相关状态
let permitSourceLoading: Ref<boolean> = ref(false)
let permitSourceData: Ref<PermitSourceItem[]> = ref([])

// 权限来源类型枚举
enum SourceTypeEnum {
  USER = 'USER',
  ROLE = 'ROLE',
  DEPT = 'DEPT',
  DEPT_DATA_SCOPE = 'DEPT_DATA_SCOPE',
  GROUP = 'GROUP',
  GROUP_DATA_SCOPE = 'GROUP_DATA_SCOPE'
}

// 权限来源类型对应的中文描述
const SOURCE_TYPE_LABELS: Record<SourceTypeEnum, string> = {
  [SourceTypeEnum.USER]: '用户',
  [SourceTypeEnum.ROLE]: '角色',
  [SourceTypeEnum.DEPT]: '部门',
  [SourceTypeEnum.DEPT_DATA_SCOPE]: '部门数据范围',
  [SourceTypeEnum.GROUP]: '用户组',
  [SourceTypeEnum.GROUP_DATA_SCOPE]: '用户组数据范围'
}

// 权限来源类型对应的颜色
const SOURCE_TYPE_COLORS: Record<SourceTypeEnum, string> = {
  [SourceTypeEnum.USER]: '#1890ff',
  [SourceTypeEnum.ROLE]: '#722ed1',
  [SourceTypeEnum.DEPT]: '#52c41a',
  [SourceTypeEnum.DEPT_DATA_SCOPE]: '#fa8c16',
  [SourceTypeEnum.GROUP]: '#eb2f96',
  [SourceTypeEnum.GROUP_DATA_SCOPE]: '#fa8c16'
}

interface PermitSourceItem {
  sourceType: SourceTypeEnum
  sourceId: number
  sourceName: string
  path: string
}

type TreeKeyType = string[] | number[]
type MenuConfigItem = 'addRootMenu' | 'currentConfig' | ''

const isButton = () => {
  return editMenuFormState.menuType === 3
}

const selectTreeKey = () => {
  if (menuId.value === undefined && treeData.value && treeData.value!.length) {
    treeSelectKey.value = [treeData.value[0].menuId]
  } else if (menuId.value !== undefined) {
    treeSelectKey.value = [menuId.value]
  }
}

// 为了避免多次重写这两坨代码，将其写到一个函数中
const updateMainTree = (needSelectKey = true) => {
  getMainMenu().then(res => {
    treeData.value = res.payload
    needSelectKey && selectTreeKey()
  })
}
const updateSubTree = () => {
  const data = { menuId: grandId.value }
  getSubMenu(data).then(res => {
    treeData.value = res.payload
    selectTreeKey()
  })

}

// 向子组件提供a-tree的更新函数
provide('updateMainTree', updateMainTree)
provide('updateSubTree', updateSubTree)


// 默认渲染出 a-tree
updateMainTree(false)

let menuNameListIndex = ref(0)
const menuNameList = ['顶部导航菜单', '左侧导航菜单']
let menuName = ref(menuNameList[menuNameListIndex.value])
let disableDeleteBtn = ref(false)

const selectTreeNode = (_: string, info: any) => {
  canEnterSubMenuFlag.value = true
  const { node } = info // 获取当前的节点信息
  menuId.value = node.menuId
  if (menuNameListIndex.value === 0) menuTitle.value = node.title
  else if (menuNameListIndex.value === 1) {
    if (node.parent)
      subMenuCurrentPath.value = '-' + node.parent.nodes.map((node: any) => node.title).join('-') + '-' + node.title
    else
      subMenuCurrentPath.value = '-' + node.title
  }
  // 将当前的节点信息拷贝到editMenuFormState中(只拷贝editMenuFormState中已有的属性的值)
  Object.keys(editMenuFormState).forEach(key => setField(editMenuFormState, key as keyof FormState, node[key]))
  // 判断当前节点是否为叶子节点
  if (node.children && node.children.length) {
    // 如果不是叶子节点,无法从该节点直接进入到对应的Sub Menu,也不可以进行删除
    disableDeleteBtn.value = true
    // disableEnterSubMenu.value = true
  } else {
    // 如果是叶子节点,接触上述限制
    disableDeleteBtn.value = false
    // disableEnterSubMenu.value = false
  }
  // 只要点击了tree的节点,就应该展示menu-config-space的配置面板
  menuConfigItem.value = 'currentConfig'
  // 每次点击tree的节点后,默认展示编辑tab
  tabActiveKey.value = 'editNode'
  
  // 加载菜单绑定信息
  loadPermitSource(node.menuId)
}

// 加载菜单绑定信息
const loadPermitSource = async (menuId: number) => {
  if (!menuId) return
  permitSourceLoading.value = true
  try {
    // 不传 customerNumber，查询该菜单绑定的所有目标
    const result = await getPermitSource(menuId, '')
    permitSourceData.value = result.payload || []
  } catch (error) {
    console.error('获取菜单绑定信息失败:', error)
    permitSourceData.value = []
  } finally {
    permitSourceLoading.value = false
  }
}

const getSourceTypeLabel = (type: SourceTypeEnum): string => {
  return SOURCE_TYPE_LABELS[type] || type
}

const getSourceTypeColor = (type: SourceTypeEnum): string => {
  return SOURCE_TYPE_COLORS[type] || '#cccccc'
}


// 点击返回Main Menu tree的按钮后的操作
const backToMainMenu = () => {
  grandId.value = undefined
  updateMainTree()
  menuNameListIndex.value = 0
  menuName.value = menuNameList[menuNameListIndex.value]
}
// 点击进入Sub Menu tree的按钮后的操作
const enterSubMenu = () => {
  // 从当前节点进入，则当前Main Menu菜单节点是它对应Sub Menu的所有节点的祖先节点
  grandId.value = menuId.value
  updateSubTree()
  menuNameListIndex.value = 1
  menuName.value = menuNameList[menuNameListIndex.value]
  // 刚进入Sub Menu tree时,不显示menu-config-space的配置面板
  menuConfigItem.value = ''
}

// 增加Main Menu和Sub Menu根节点的方法,通过menuConfigItem控制对应form的展示
const addRootMenu = () => {
  menuConfigItem.value = 'addRootMenu'
  menuTitle.value = ''
}

// 处理menu-config-space中tab的切换事件
const tabsChange = (activeKey: Key) => {
  if (activeKey === 'editNode') {
    // menuConfigItem.value = 'currentConfig'
  } else if (activeKey === 'addSubMenu' || activeKey === 'addMenuButton') {
    // 当前节点的menuId将为子节点的parentId，即pid
    addSubMenuFormState.pid = menuId.value
  }
}
// 删除菜单节点的方法
const deleteNode = () => {
  // 删除Main Menu 和Sub Menu的方法都是一样的，所以只是根据menuNameListIndex的选择情况判断需要使用哪个方法更新a-tree
  deleteMainMenu({ id: menuId.value }).then(() => {
    if (menuNameListIndex.value === 0) updateMainTree()
    else if (menuNameListIndex.value === 1) updateSubTree()
    // 删除节点后,不显示menu-config-space的配置面板
    menuConfigItem.value = ''
    menuTitle.value = ''
  })
}

const onDrop = (info: AntTreeNodeDropEvent) => {
  const dragKey = info.dragNode.key
  treeData.value = getDroppedData(info, treeData)
  const brotherNodes = getBrotherNodes(treeData.value, dragKey, 'key')
  const parentNodes = getAllParentNodes(treeData.value, dragKey, 'key')
  const updatePIdData = {
    pid: parentNodes.length ? parentNodes[0].menuId : null,
    id: dragKey
  }
  if (menuNameListIndex.value === 0 && info.dragNode.pid !== updatePIdData.pid) {
    message.error({ content: () => '顶部导航不能存在子节点！' })
    updateMainTree()
    return
  }
  let updateOrderData: any = []
  brotherNodes.forEach((node: FormState, index: number) => {
    updateOrderData.push({ id: node.menuId, showOrder: index })
  })

  let changeOrderPromise = updateMenuOrder(updateOrderData)
  changeOrderPromise.then(() => changePID(updatePIdData)).then(() => {
    if (grandId && grandId.value) updateSubTree()
    else updateMainTree()
  })
}

</script>

<style scoped>

.menu-config {
  display: flex;
}

.no-data {
  width: 100%;
  font-size: 17px;
  font-weight: bold;
  text-align: center;
  color: #8e8e8e;
  padding-top: 20px;
}

.menu-tree {
  width: 280px;
  height: 700px;
  box-shadow: 0 4px 10px 0 rgba(69, 89, 120, 0.5);
  margin: 15px 15px;
  position: relative;
}

.menu-category {
  font-size: 23px;
  font-weight: bold;
  text-align: center;
  padding: 10px 0;
}

.sub-menu-title {
  font-size: 18px;
  padding: 10px 0;
  width: 100%;
  box-sizing: border-box;
  text-align: center;
  border-bottom: 1px solid #e8e8e8;
  margin-bottom: 10px;
}

.nav-switch-btn-list {
  width: 100%;
  display: flex;
  justify-content: space-evenly;
  position: absolute;
  bottom: 20px;
  right: 0;
}

.menu-config-space {
  width: 700px;
  margin: 15px 5px;
  padding: 0 10px;
  box-shadow: 0 4px 10px 0 rgba(69, 89, 120, 0.5);
}

.menu-config-space .ant-alert-with-description {
  height: 200px;
}

.menu-config-space .delete-btn {
  float: right;
  margin-top: 10px;
}

.add-root-menu-title {
  font-size: 24px;
  height: 60px;
  line-height: 60px;
  font-weight: bold;
  text-align: center;
}

.config-warning {
  height: 100%;
  width: 100%;
  font-size: 20px;
  padding: 0 20px;
  box-sizing: border-box;
  display: flex;
  font-weight: bold;
  line-height: 50px;
  text-align: center;
  justify-content: center;
  align-items: center;
  color: #f5222d;
}

.permit-source-panel {
  width: 350px;
  height: 700px;
  margin: 15px 15px 15px 0;
  padding: 15px;
  box-shadow: 0 4px 10px 0 rgba(69, 89, 120, 0.5);
  overflow-y: auto;
}

.panel-title {
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  padding: 10px 0;
  border-bottom: 1px solid #e8e8e8;
  margin-bottom: 15px;
}

.empty-tip {
  text-align: center;
  color: #8e8e8e;
  padding: 40px 20px;
  font-size: 14px;
}

.permit-source-list {
  padding: 10px 5px;
}

.permit-item {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s;
}

.permit-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  transform: translateY(-1px);
}

.permit-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  gap: 8px;
}

.source-tag {
  font-weight: 500;
  border-radius: 4px;
}

.source-name {
  font-size: 14px;
  font-weight: 600;
  color: #1d1d1d;
}

.permit-path {
  font-size: 12px;
  line-height: 1.5;
  color: #595959;
  padding: 6px 10px;
  background-color: #fafafa;
  border-radius: 4px;
  border-left: 3px solid #1890ff;
}
</style>



