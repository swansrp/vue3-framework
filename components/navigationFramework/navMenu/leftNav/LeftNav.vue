<template>
  <div
    class="left-nav-container"
    :style="{width: collapsed ? '50px' : `${menuWidth}px`}"
  >
    <!-- 嵌入态（墨枢 iframe / embedded=nav|1）专用：轻量「切换页面」入口（2026-11-27 用户拍板 A）。
         嵌入态无自家 topnav（11-25 拍板撤，防双条）、也无齿轮入口 ⇒ 顶级菜单之间没有切换通道
         （U117 连带缺口）。这里复用 topnav 数据源（routeStore.dynamicRoute 顶级节点，嵌入态已
         剥离「系统管理」树）做一个下拉切换器，只落在左栏顶部一行，不是完整 topnav。
         只有一个顶级时不渲染（无切换必要）；左栏收起时隐藏（空间不足）。
         🔴 共享件：InkHub 宿主无 embedded 参数 ⇒ isEmbeddedChrome() 恒 false，渲染面为零变化。 -->
    <div
      v-if="isEmbedded && !collapsed && topNodes.length > 1"
      class="left-switcher"
    >
      <a-dropdown
        :trigger="['click']"
        placement="bottomLeft"
      >
        <button
          type="button"
          class="left-switcher__btn"
          :title="`切换到其他页面（当前：${currentTopTitle}）`"
        >
          <SwapOutlined class="left-switcher__icon" />
          <span class="left-switcher__label">切换页面</span>
          <span class="left-switcher__current">{{ currentTopTitle }}</span>
          <DownOutlined class="left-switcher__arrow" />
        </button>
        <template #overlay>
          <a-menu
            :selected-keys="currentTopPath ? [currentTopPath] : []"
            @click="onSwitchTop"
          >
            <a-menu-item
              v-for="node in topNodes"
              :key="node.path"
            >
              {{ node.meta?.title || node.title || node.name }}
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </div>
    <!-- U124 统一侧栏（非嵌入态）→ U136 重构（2026-11-28 用户「折叠不要整个 topnav 级别，
         是子菜单级别能开闭；不显示当前的 topNav，显示的话也在 leftNav 底部」）：
         侧栏只渲染**当前顶级模块的子树**——顶级组标签全部不再出现（当前模块身份由底部
         贴底切换器唯一承载），子菜单级可折叠（chevron 开合，含当前条目的链自动展开），
         叶子＝条目（选中海蓝 pill）；模块切换职能全部归底部切换器（U125 外链过滤沿用）。
         嵌入态（墨枢 iframe）零变化：仍走 left-switcher＋a-menu（U119/U117 口径）。 -->
    <template v-if="!isEmbedded">
      <nav
        class="ln-nav"
        :class="{ 'is-collapsed': collapsed }"
      >
        <template
          v-for="child in navList"
          :key="child.key || child.path"
        >
          <!-- 有下级 → 子菜单级折叠节（U136） -->
          <template v-if="child.children && child.children.length > 0">
            <button
              type="button"
              class="ln-group"
              :class="{ 'is-open': isSubOpen(child) }"
              :title="isSubOpen(child) ? '收起' : '展开'"
              @click="toggleSub(child)"
            >
              <span class="ln-group__text">{{ topTitle(child) }}</span>
              <DownOutlined class="ln-group__chevron" />
            </button>
            <div
              v-show="isSubOpen(child)"
              class="ln-group__body"
            >
              <a
                v-for="gc in child.children"
                :key="gc.key || gc.path"
                class="ln-item ln-item--sub"
                :class="{ 'is-active': isActive(gc) }"
                href="javascript:;"
                :title="topTitle(gc)"
                @click="navigateTo(activeTopNode, gc)"
              >
                <Icon
                  v-if="iconOf(gc)"
                  :icon="iconOf(gc)"
                  class="ln-item__icon"
                />
                <span class="ln-item__label">{{ topTitle(gc) }}</span>
              </a>
            </div>
          </template>
          <a
            v-else
            class="ln-item"
            :class="{ 'is-active': isActive(child) }"
            href="javascript:;"
            :title="topTitle(child)"
            @click="navigateTo(activeTopNode, child)"
          >
            <Icon
              v-if="iconOf(child)"
              :icon="iconOf(child)"
              class="ln-item__icon"
            />
            <span class="ln-item__label">{{ topTitle(child) }}</span>
          </a>
        </template>
      </nav>
      <!-- U129 模块切换器贴底（2026-11-28 用户征询「放上边还是贴底像 Windows 菜单」，
           AI 拍板贴底：logo 区/切换器同为「头部块」上下相叠是重叠感根源——贴底后顶部
           只剩 logo 一个身份块，切换器成为左下角常驻锚点，收起态恰好只剩瓦片钮＝开始
           按钮形态；下拉改向上弹出。
           U130：弹出层弃 a-menu 改自绘面板（ProjectSwitcher 面板同族——面板头＋图标
           条目＋当前项勾选），antd 裸菜单观感用户不收。
           U136-g（2026-11-28 用户定稿外链语义）：当前顶级为外链（isFrame=1）⇒ 贴底切换器
           整条不渲染（外链模块不露内部导航）；非外链态显示，下拉列全部顶级（含外链——
           切过去允许，落地后切换器随之消失）。 -->
      <a-dropdown
        v-if="activeTopNode && !currentTopIsExternal"
        :trigger="['click']"
        placement="topLeft"
        overlay-class-name="ln-switcher-dropdown"
      >
        <div
          class="ln-switcher"
          :class="{ 'is-collapsed': collapsed }"
          title="点击切换功能模块"
        >
          <span class="ln-switcher__tile">
            <Icon
              v-if="activeTopIcon"
              :icon="activeTopIcon"
            />
            <img
              v-else
              alt="公司标志"
              src="../../../../../../public/icon.png"
            />
          </span>
          <span class="ln-switcher__text">
            <span class="ln-switcher__name">
              <span class="ln-switcher__label">{{ topTitle(activeTopNode) }}</span>
            </span>
            <span class="ln-switcher__sub">{{ switcherCount }} 个功能入口</span>
          </span>
        </div>
        <template #overlay>
          <div class="ln-switcher-panel">
            <div class="ln-switcher-panel__head">切换功能模块</div>
            <div class="ln-switcher-panel__list">
              <div
                v-for="node in visibleTops"
                :key="node.path"
                class="ln-switcher-panel__item"
                :class="{ 'is-current': node.path === activeTopNode.path }"
                @click="onPickModule(node)"
              >
                <span class="ln-switcher-panel__item-icon">
                  <Icon
                    v-if="iconOf(node)"
                    :icon="iconOf(node)"
                  />
                </span>
                <span class="ln-switcher-panel__item-label">{{ topTitle(node) }}</span>
                <CheckOutlined
                  v-if="node.path === activeTopNode.path"
                  class="ln-switcher-panel__item-check"
                />
              </div>
            </div>
          </div>
        </template>
      </a-dropdown>
    </template>
    <a-menu
      v-else-if="tabStore.isNeedLeftNav"
      v-model:open-keys="keys.openKeys"
      v-model:selected-keys="keys.selectedKeys"
      :inline-collapsed="collapsed"
      :style="{width: collapsed ? '50px' : `${menuWidth}px`}"
      class="left-menu"
      mode="inline"
      theme="dark"
      @select="selectLeftNav"
    >
      <template v-for="item in navList">
        <template v-if="!item.children || item.children?.length === 0">
          <a-menu-item
            :id="item.key"
            :key="item.key"
            :path="item.name || item.path"
            :query="item.query"
            :title="item.title"
          >
            <template #icon>
              <Icon :icon="item.icon" />
            </template>
            <span>{{ item.title }}</span>
          </a-menu-item>
        </template>
        <template v-else>
          <sub-nav
            :id="item.key"
            :key="item.key"
            :sub-nav-list="item"
          />
        </template>
      </template>
    </a-menu>

    <!-- 拖拽调整宽度的控制条 -->
    <div 
      v-if="!collapsed"
      class="resize-handle"
      :class="{hovering: isHovering}"
      @mousedown="startResize"
      @mouseover="handleHover"
      @mouseleave="handleLeave"
    >
      <div class="resize-indicator">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>
    </div>
    
    <!-- 收起/展开按钮 -->
    <div 
      class="toggle-button"
      :class="{
        'toggle-collapsed': collapsed,
        'toggle-expanded': !collapsed,
        'hovering': toggleHovering
      }"
      :style="{
        left: collapsed ? '25px' : `${menuWidth - 14}px`
      }"
      @click="toggleCollapsed"
      @mouseenter="toggleHovering = true"
      @mouseleave="toggleHovering = false"
    >
      <div class="toggle-icon">
        <div
          class="arrow"
          :class="collapsed ? 'arrow-right' : 'arrow-left'"
        ></div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { CheckOutlined, DownOutlined, SwapOutlined } from '@ant-design/icons-vue'
import { LocationQueryRaw, useRouter } from 'vue-router'


import SubNav from '@/framework/components/navigationFramework/navMenu/subNav/SubNav.vue'
import { getTitlePathByKey } from '@/framework/hooks/initKeysAndRouteInNav'
import { getQueryObject } from '@/framework/network/utils'
import pinia from '@/framework/store'
import { useTabStore } from '@/framework/store/nav'
import { useNavigationStore } from '@/framework/store/navigation'
import { useRouteStore } from '@/framework/store/route'
import { isEmbeddedChrome } from '@/framework/utils/embed'


const router = useRouter()
const navigationStore = useNavigationStore(pinia)
const tabStore = useTabStore(pinia)
const routeStore = useRouteStore(pinia)

// 嵌入态（墨枢 iframe）：左栏顶部渲染「切换页面」下拉（U119，2026-11-27 用户拍板 A）。
// 判定取框架公共件（双宿主共享，不引业务侧模块）；非嵌入态恒 false ⇒ 渲染面零变化。
const isEmbedded = isEmbeddedChrome()
// 可切换的页面＝顶级节点全集（嵌入态 dynamicRoute 已剥离「系统管理」树，见 store/route.ts）
const topNodes = computed(() => routeStore.dynamicRoute || [])
const currentTopPath = computed(() => navigationStore.activeTopNavPath || '')
const currentTopTitle = computed(() => {
  const node = topNodes.value.find((n: any) => n.path === currentTopPath.value)
  return node?.meta?.title || node?.title || node?.name || '选择页面'
})

/** 切到另一页面：落入该顶级第一个叶子（与 enterFirstDynamicRoute 同构的逐层下钻） */
const onSwitchTop = ({ key }: { key: string | number }) => {
  const node = topNodes.value.find((n: any) => n.path === key)
  if (!node) return
  let cursor: any = node
  const pathArray = [node.path]
  while (cursor.children && cursor.children.length > 0) {
    cursor = cursor.children[0]
    pathArray.push(cursor.path)
  }
  const leafPath = pathArray.join('/')
  navigationStore.setActiveTopNav(node.path)
  const queryStr = routeStore.dynamicRouteMap[leafPath]?.query
  const query = (queryStr ? getQueryObject(queryStr) : {}) as LocationQueryRaw
  router.push({ path: `/${leafPath}`, query })
}

// 响应式计算菜单列表 - 替代 initLeftNavList
const navList = computed(() => {
  if (!navigationStore.activeTopNavPath) return []

  const topNode = routeStore.dynamicRoute.find(
    node => node.path === navigationStore.activeTopNavPath
  )
  return topNode?.children || []
})

// ── U124 统一侧栏（非嵌入态）────────────────────────────
const topTitle = (n: any) => n?.meta?.title || n?.title || n?.name || ''

/** 切换面板可选顶级＝全部（U136-g 用户定稿：非外链态下拉列所有 topNav，含外链——
    切过去允许，落地后切换器随外链语义隐藏） */
const visibleTops = computed(() => routeStore.dynamicRoute)

/** 当前顶级是否外链勾选（isFrame=1）——是 ⇒ 贴底切换器整条不渲染（U136-g） */
const currentTopIsExternal = computed(() =>
  !!routeStore.routePathIsFrameMap[String(navigationStore.activeTopNavPath || '')]
)

// U125 模块切换器（左栏顶部）：当前顶级展示＋下拉切换
const activeTopNode = computed(() =>
  routeStore.dynamicRoute.find((n: any) => n.path === navigationStore.activeTopNavPath)
)
const activeTopIcon = computed(() => activeTopNode.value?.icon || activeTopNode.value?.meta?.icon || '')
/** 当前顶级叶子功能数（递归，分组不计数）——切换器副行 */
const switcherCount = computed(() => {
  const walk = (nodes: any[]): number =>
    (nodes || []).reduce((s, n) => s + (n.children?.length ? walk(n.children) : 1), 0)
  return activeTopNode.value ? walk(activeTopNode.value.children) : 0
})

/** 逐层下钻取该节点树第一个叶子 */
const firstLeafOf = (node: any): any => {
  let cursor: any = node
  while (cursor.children && cursor.children.length > 0) cursor = cursor.children[0]
  return cursor
}

/** 切换模块（U130 弹出面板自绘列表直取节点）：下钻首个叶子后走统一 navigateTo */
const onPickModule = (node: any) => {
  if (!node) return
  navigateTo(node, firstLeafOf(node))
}

const iconOf = (n: any) => n?.icon || n?.meta?.icon || ''

// ── U136 子菜单级折叠（侧栏只渲染当前顶级子树，顶级组标签不再出现）──
// U136-c（用户「左侧的树要默认都展开」）：语义反转——collapsedSubs 记手动收起的节，
// 默认全开；收起态强制全开（图标列不丢功能）；跨模块切换后新模块子树同样默认全开
const collapsedSubs = ref<Set<string>>(new Set())
const subKeyOf = (n: any) => String(n.key ?? n.path)
const isSubOpen = (child: any) => collapsed.value || !collapsedSubs.value.has(subKeyOf(child))
const toggleSub = (child: any) => {
  const k = subKeyOf(child)
  const next = new Set(collapsedSubs.value)
  if (next.has(k)) next.delete(k)
  else next.add(k)
  collapsedSubs.value = next
}

/** 从顶级节点向下找目标叶子，返回 root→…→leaf 链（找不到返回 null；
    key 缺省的节点按 path 兜底匹配——无子级顶级直接当条目时走这条腿） */
const findChainByKey = (root: any, targetKey: any): any[] | null => {
  const walk = (cur: any, chain: any[]): any[] | null => {
    const next = [...chain, cur]
    if ((cur.key != null && String(cur.key) === String(targetKey)) ||
        (cur.key == null && String(cur.path) === String(targetKey))) return next
    for (const c of cur.children || []) {
      const hit = walk(c, next)
      if (hit) return hit
    }
    return null
  }
  return walk(root, [])
}

/** 统一侧栏条目点击：任意顶级模块直达其下任意叶子（与 selectLeftNav 的全路径拼接
    同构，但不限于当前激活顶级）；外链叶子（isFrame）保持 selectLeftNav 的开新窗口径 */
const navigateTo = (top: any, leaf: any) => {
  const chain = findChainByKey(top, leaf.key ?? leaf.path)
  if (!chain) return
  navigationStore.setActiveTopNav(top.path)
  const last = chain[chain.length - 1]
  navigationStore.activeLeftNavKey = String(last.key ?? last.path)
  const fullPath = `/${chain.map((n) => n.path).join('/')}`
  const queryStr = leaf.query || ''
  const query = (queryStr ? getQueryObject(queryStr) : {}) as LocationQueryRaw
  const fullForFrame = fullPath.startsWith('/') ? fullPath.substring(1) : fullPath
  const isFrame = routeStore.routePathIsFrameMap[fullForFrame] || routeStore.routePathIsFrameMap[leaf.path]
  if (isFrame) {
    const urlArray = fullPath.split('http')
    if (urlArray.length > 1) {
      window.open(fullPath.substring(urlArray[0].length), '_blank')
    } else {
      window.open(router.resolve({ path: fullPath, query }).href, '_blank')
    }
  } else {
    router.push({ path: fullPath, query })
  }
}

/** 选中判定（U136：侧栏只渲染当前顶级子树，无需跨顶级比对） */
const isActive = (node: any) =>
  !!navigationStore.activeTopNavPath &&
  String(node.key ?? node.path) === String(navigationStore.activeLeftNavKey)

// 响应式计算选中状态
const selectedKeys = computed(() => 
  navigationStore.activeLeftNavKey ? [navigationStore.activeLeftNavKey] : []
)

// 响应式计算展开状态
const openKeys = computed({
  get: () => navigationStore.openLeftNavKeys,
  set: (keys: string[]) => {
    navigationStore.openLeftNavKeys = keys
  }
})

// 将 selectedKeys 和 openKeys 绑定到 keys 对象(兼容现有模板)
// 注意: 不能直接把 computed 放入 reactive,需要用 ref 包装
const keys = {
  get selectedKeys() {
    return selectedKeys.value
  },
  set selectedKeys(value: string[]) {
    // computed 是只读的,通过 navigationStore 设置
    if (value.length > 0) {
      navigationStore.activeLeftNavKey = value[0]
    }
  },
  get openKeys() {
    return openKeys.value
  },
  set openKeys(value: string[]) {
    navigationStore.openLeftNavKeys = value
  }
}

const collapsed = ref(navigationStore.ui.leftNavCollapsed)

// 拖拽相关状态
const menuWidth = ref(250)
const minWidth = 150
const maxWidth = 800
const isHovering = ref(false)
const toggleHovering = ref(false)
const isDragging = ref(false)

// 拖拽功能
const startResize = (e: MouseEvent) => {
  if (e.button !== 0) return // 只响应左键
  e.stopPropagation()
  
  isDragging.value = true
  const startX = e.clientX
  const startWidth = menuWidth.value
  
  const handleMouseMove = (moveEvent: MouseEvent) => {
    if (!isDragging.value) return
    
    const deltaX = moveEvent.clientX - startX
    const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + deltaX))
    
    requestAnimationFrame(() => {
      menuWidth.value = newWidth
    })
  }
  
  const handleMouseUp = () => {
    isDragging.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    
    // 保存宽度到 store
    tabStore.setLeftNavWidth(menuWidth.value)
    
    // 触发resize事件通知其他组件
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'))
    }, 100)
  }
  
  document.addEventListener('mousemove', handleMouseMove, { passive: true })
  document.addEventListener('mouseup', handleMouseUp)
}

const handleHover = () => {
  isHovering.value = true
}

const handleLeave = () => {
  isHovering.value = false
}
const toggleCollapsed = () => {
  collapsed.value = !collapsed.value
  tabStore.setLeftNavCollapsed(collapsed.value)
  let resizeEvent = new Event('resize')
  window.dispatchEvent(resizeEvent)
}

const selectLeftNav = (obj: any, triggerIsFrame = true) => {
  // 添加安全检查
  if (!obj) {
    console.warn('selectLeftNav: obj is undefined', obj)
    return
  }
  
  // 处理 Ant Design Menu 的 select 事件参数格式
  let menuItemData = null
  let selectedKey = null
  
  if (obj.key !== undefined) {
    // 来自菜单点击事件，obj.key 是选中的菜单项 key
    selectedKey = obj.key
    
    // 需要根据 key 从 navList 中查找对应的菜单数据
  // 递归查找菜单项目
  const findMenuItemByKey = (nodes: any[], targetKey: string): any => {
    for (const node of nodes) {
      if (node.key === targetKey || node.key == targetKey || String(node.key) === String(targetKey)) {
        return node
      }
      if (node.children && node.children.length > 0) {
        const result = findMenuItemByKey(node.children, targetKey)
        if (result) return result
      }
    }
    return null
  }
    
    menuItemData = findMenuItemByKey(navList.value, selectedKey)
    if (!menuItemData) {
      console.warn('Cannot find menu item data for key:', selectedKey)
      return
    }
  } else if (obj.item) {
    // 来自其他调用（如初始化），obj.item 直接包含菜单数据
    menuItemData = obj.item
    selectedKey = obj.item.key
  } else {
    // 来自其他调用，obj 直接是菜单数据
    menuItemData = obj
    selectedKey = obj.key
  }
  
  if (!menuItemData) {
    console.warn('selectLeftNav: menuItemData is undefined')
    return
  }
  
  // tab跳转过来走name 自动走path
  let path = menuItemData.name || menuItemData.path
  
  // 重要：对于多级菜单，需要从topNav开始，层层递归拼接所有路径上的path
  // 获取从根节点到当前节点的完整路径
  const getFullPath = (item: any, navList: any[]): string => {
    // 获取当前激活的顶部导航路径
    const topNavPath = navigationStore.activeTopNavPath || routeStore.currentTopNav
    
    // 如果没有topNavPath，说明还未初始化，返回错误
    if (!topNavPath) {
      console.error('[LeftNav] getFullPath: topNavPath is empty!')
      return `/${path}`
    }
    
    // 如果 key 为 undefined，使用回退逻辑
    if (!item.key) {
      return `/${topNavPath}/${path}`
    }
    
    // 递归查找目标节点，在向下递归过程中累积路径
    const findPathToItem = (nodes: any[], targetKey: string, currentPath: string[] = []): string[] | null => {
      for (const node of nodes) {
        // 将当前节点的path加入路径
        const newPath = [...currentPath, node.path]
        
        // 如果当前节点就是目标节点，返回完整路径
        // 处理key类型不匹配问题（数字 vs 字符串）
        if (node.key === targetKey || node.key == targetKey || String(node.key) === String(targetKey)) {
          return newPath
        }
        
        // 如果有子节点，将当前路径传递给子节点递归查找
        if (node.children && node.children.length > 0) {
          const result = findPathToItem(node.children, targetKey, newPath)
          if (result) return result
        }
      }
      return null
    }
    
    const pathArray = findPathToItem(navList, item.key)
    if (pathArray) {
      // 从topNav开始拼接完整路径
      return `/${topNavPath}/${pathArray.join('/')}`
    }
    // 如果没找到，回退到简单拼接
    return `/${topNavPath}/${path}`
  }
  
  const fullPath = getFullPath(menuItemData, navList.value)
  
  const query = (menuItemData.query ? getQueryObject(menuItemData.query) : {}) as LocationQueryRaw
  // 使用完整路径判断是否为外链
  const fullPathForFrame = fullPath.startsWith('/') ? fullPath.substring(1) : fullPath
  const isFrame = routeStore.routePathIsFrameMap[fullPathForFrame] || routeStore.routePathIsFrameMap[path]
  if (isFrame && triggerIsFrame) {
    // 外链菜单：在打开外链前立即设置菜单高亮状态
    keys.selectedKeys = [selectedKey]
    const { keyPath } = getTitlePathByKey(navList.value, selectedKey)
    keys.openKeys = keyPath
    
    // 打开外链
    const urlArray = fullPath.split('http')
    if(urlArray.length > 1) {
      const routeUrl = fullPath.substring(urlArray[0].length)
      window.open(routeUrl, '_blank')
    } else {
      const routeUrl = router.resolve({ path: fullPath, query })
      window.open(routeUrl.href, '_blank')
    }
  } else {
    // 使用path进行导航，而不是name
    router.push({
      path: fullPath,
      query
    })
  }
}

// 同步collapsed状态到store
watch(collapsed, (value) => {
  navigationStore.setLeftNavCollapsed(value)
})

// 同步menuWidth到store
watch(menuWidth, (value) => {
  navigationStore.setLeftNavWidth(value)
})

onMounted(() => {
  // 初始化时同步宽度到 store
  navigationStore.setLeftNavWidth(menuWidth.value)
})


</script>

<style scoped>
* {
  user-select: none;
}

.left-nav-container {
  position: relative;
  height: 100%;
  /* 纵向 flex：顶部「切换页面」条 + 菜单区吃剩余高度（U119；无切换条时菜单仍吃满，视觉零变化） */
  display: flex;
  flex-direction: column;
  background: var(--left-nav-bg);
  backdrop-filter: var(--left-nav-blur);
  -webkit-backdrop-filter: var(--left-nav-blur);
  border-right: var(--left-nav-border);
  transition: width var(--transition-normal);
  box-shadow: var(--shadow-nav-divider);
  z-index: 10;

  /* U127 质感修正（2026-11-28 用户「比照演示壳的字体深浅大小颜色，现在看着很廉价」）：
     ln-* 此前吃 var(--text-secondary/tertiary/primary)，在框架壳被 design-tokens 劫持成
     rgba(0,0,0,.48/.28/.85) 半透明黑（演示页 .workbench-theme 里才是 #4d5361/#878e9c/#20242c
     实色蓝灰）——整栏发灰发飘。改容器级局部调色板（--ln-*）硬指向海蓝族实色，绕开全局
     同名劫持；抗锯齿同步开启（演示壳观感的另一半）。 */
  --ln-text-strong: #20242c;
  --ln-text: #4d5361;
  --ln-text-muted: #878e9c;
  --ln-accent: #1a63a8;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

:deep(.ant-menu) {
  /* 原 height:100% 在 flex 容器里会与顶部切换条叠加溢出；改 flex 吃剩余并可滚动 */
  flex: 1;
  min-height: 0;
  height: auto;
  overflow-y: auto;
  /* 纵向滚动条占掉 ~12px 后可用宽度变窄，菜单项仍按容器宽排版会溢出，
     Windows 上表现为菜单里多出一条横向滚动条（2026-11-27 用户反馈）；裁掉即可 */
  overflow-x: hidden;
  background: transparent !important;
}

/* 嵌入态「切换页面」入口：白底菜单主题下的一行轻量胶囊（U119 用户拍板 A） */
.left-switcher {
  flex-shrink: 0;
  padding: 10px 12px 8px;
  border-bottom: 1px solid var(--nav-line, #d5e0ee);
}

.left-switcher__btn {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 6px 10px;
  font-size: 12px;
  line-height: 18px;
  color: var(--nav-text, #4d5361);
  cursor: pointer;
  background: var(--nav-bg-hover, rgba(255, 255, 255, 0.65));
  border: 1px solid var(--nav-line, #d5e0ee);
  border-radius: 8px;
  transition: background 0.2s, color 0.2s;
}

.left-switcher__btn:hover {
  color: var(--nav-text-hover, #20242c);
  background: #fff;
}

.left-switcher__icon {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--nav-text-tertiary, #878e9c);
}

.left-switcher__label {
  flex-shrink: 0;
  color: var(--nav-text-tertiary, #878e9c);
}

.left-switcher__current {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-weight: 600;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.left-switcher__arrow {
  flex-shrink: 0;
  font-size: 10px;
  color: var(--nav-text-tertiary, #878e9c);
}

.left-menu {
  position: relative;
  z-index: 999;
  transition: width var(--transition-normal);
}

/* ====== 菜单项基础样式 ====== */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-item) {
  margin: 2px 10px;
  border-radius: 8px;
  transition: all var(--transition-fast);
  padding: 0 12px;
  height: 36px;
  line-height: 36px;
  color: var(--nav-text);
  position: relative;
  /* 每项底部添加微弱的水平分隔线，提升视觉层次感 */
  border-bottom: 1px solid var(--nav-item-separator);
}

/* 最后一项去除分隔线，避免多余边框 */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-item:last-of-type) {
  border-bottom: none;
}

/* 未选中菜单项悬停（U123：纯色提亮，去掉 translateX 弹跳——演示壳同款手感） */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-item:not(.ant-menu-item-selected):hover) {
  background: var(--nav-bg-hover) !important;
  color: var(--nav-text-hover) !important;
}

/* ====== 选中菜单项 ====== */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-item-selected) {
  background: var(--nav-selected-bg) !important;
  color: var(--nav-selected-color) !important;
  font-weight: var(--nav-selected-font-weight);
  position: relative;
  border: var(--nav-selected-border);
  box-shadow: var(--nav-selected-shadow);
  transform: var(--nav-selected-transform);
  text-shadow: var(--nav-selected-text-shadow);
}

/* 选中态左侧指示线（U123：通高线改 16px 短线垂直居中收边，演示壳同款） */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-item-selected::before) {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  bottom: auto;
  height: 16px;
  transform: translateY(-50%);
  width: var(--nav-selected-indicator-width);
  background: var(--nav-selected-indicator-bg, linear-gradient(180deg, rgba(64, 169, 255, 1) 0%, rgba(24, 144, 255, 1) 20%, rgba(64, 169, 255, 1) 50%, rgba(24, 144, 255, 1) 80%, rgba(64, 169, 255, 1) 100%));
  border-radius: 0 3px 3px 0;
  pointer-events: none;
  animation: var(--nav-indicator-animation);
}

/* 选中态图标颜色 + 发光 + 放大 */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-item-selected .anticon) {
  color: var(--nav-selected-color) !important;
  filter: var(--nav-selected-icon-filter, drop-shadow(0 0 12px rgba(24, 144, 255, 1)) drop-shadow(0 0 6px rgba(64, 169, 255, 0.8)));
  transform: var(--nav-selected-icon-transform, scale(1.15));
  transition: all 0.15s ease;
}

/* 普通菜单项图标 */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-item .anticon) {
  color: var(--nav-text);
  transition: all var(--transition-fast);
  margin-right: 10px;
  font-size: 15px;
}

/* 悬停图标颜色 */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-item:not(.ant-menu-item-selected):hover .anticon) {
  color: var(--nav-text-hover);
  transform: scale(1.02);
}

/* ====== 子菜单标题 ====== */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-submenu-title) {
  margin: 2px 10px;
  border-radius: 8px;
  transition: all var(--transition-fast);
  padding: 0 12px;
  height: 36px;
  line-height: 36px;
  color: var(--nav-text);
  border-bottom: 1px solid var(--nav-item-separator);
}

:deep(.ant-menu-dark.ant-menu-inline .ant-menu-submenu-title:hover) {
  background: var(--nav-bg-hover) !important;
  color: var(--nav-text-hover) !important;
}

:deep(.ant-menu-dark.ant-menu-inline .ant-menu-submenu-open > .ant-menu-submenu-title) {
  color: var(--nav-text-hover);
}

/* 子菜单展开箭头 */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-submenu-title .ant-menu-submenu-arrow) {
  color: var(--nav-text-tertiary);
}

:deep(.ant-menu-dark.ant-menu-inline .ant-menu-submenu-title:hover .ant-menu-submenu-arrow) {
  color: var(--nav-text);
}

/* ====== 菜单文字 ====== */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-item),
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-submenu-title) {
  font-weight: 400;
  font-size: 13.5px;
  letter-spacing: 0.3px;
}

/* ====== 收起状态 ====== */
:deep(.ant-menu-dark.ant-menu-inline-collapsed .ant-menu-item) {
  margin: 2px 8px;
  text-align: center;
  padding: 0 12px;
  height: 34px;
  line-height: 34px;
}

/* ====== 子菜单列表 ====== */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-submenu) {
  margin: 0;
}

:deep(.ant-menu-dark.ant-menu-inline .ant-menu-submenu .ant-menu-sub) {
  background: transparent;
  padding: 0;
  position: relative;
}

/* 子菜单左侧垂直引导线 - 增加层次感和连接感 */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-submenu .ant-menu-sub::before) {
  content: '';
  position: absolute;
  left: 20px;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--nav-line);
  pointer-events: none;
}

:deep(.ant-menu-dark.ant-menu-inline .ant-menu-submenu .ant-menu-item) {
  height: 32px;
  line-height: 32px;
  font-size: 13px;
  border-radius: 8px;
  padding: 0 12px 0 28px;
  color: var(--nav-text);
  margin: 2px 8px 2px 12px;
  border-bottom: 1px solid var(--nav-item-separator);
}

:deep(.ant-menu-dark.ant-menu-inline .ant-menu-submenu .ant-menu-item:last-of-type) {
  border-bottom: none;
}

:deep(.ant-menu-dark.ant-menu-inline .ant-menu-submenu .ant-menu-item:not(.ant-menu-item-selected):hover) {
  background: var(--nav-bg-hover) !important;
  color: var(--nav-text-hover) !important;
}

/* ====== 子菜单选中项 ====== */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-submenu .ant-menu-item-selected) {
  background: var(--nav-selected-bg) !important;
  color: var(--nav-selected-color) !important;
  font-weight: var(--nav-selected-font-weight);
  position: relative;
  border: var(--nav-selected-border);
  box-shadow: var(--nav-selected-shadow);
  transform: var(--nav-selected-transform);
  text-shadow: var(--nav-selected-text-shadow);
}

:deep(.ant-menu-dark.ant-menu-inline .ant-menu-submenu .ant-menu-item-selected::before) {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  bottom: auto;
  height: 16px;
  transform: translateY(-50%);
  width: var(--nav-selected-indicator-width);
  background: var(--nav-selected-indicator-bg, linear-gradient(180deg, rgba(64, 169, 255, 1) 0%, rgba(24, 144, 255, 1) 20%, rgba(64, 169, 255, 1) 50%, rgba(24, 144, 255, 1) 80%, rgba(64, 169, 255, 1) 100%));
  border-radius: 0 3px 3px 0;
  pointer-events: none;
  animation: var(--nav-indicator-animation);
}

/* ====== 统一侧栏·导航（U124：父级=小节标签、子级=条目，弃 antd menu，演示壳同款观感） ====== */
.ln-nav {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  /* U136-b：顶部呼吸感对齐演示壳侧栏（logo 条→首条目原仅 3px 紧贴，demo 有 43px 气口） */
  padding: 20px 10px 10px;
}

.ln-nav::-webkit-scrollbar {
  width: 5px;
}

.ln-nav::-webkit-scrollbar-thumb {
  background: rgba(26, 99, 168, 0.22);
  border-radius: 3px;
}

.ln-nav::-webkit-scrollbar-thumb:hover {
  background: rgba(26, 99, 168, 0.4);
}

.ln-nav::-webkit-scrollbar-track {
  background: transparent;
}

/* ====== 模块切换器（U129 贴底：Windows 开始菜单锚点感——顶部只剩 logo 身份块，
     切换器成为左下角常驻控制；外链模块隐藏口径沿用 U125） ====== */
.ln-switcher {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  cursor: pointer;
  border-top: 1px solid var(--nav-line, #d5e0ee);
  transition: background 0.15s;
}

.ln-switcher:hover {
  background: rgba(26, 99, 168, 0.06);
}

/* 收起态：只留瓦片钮（开始按钮形态） */
.ln-switcher.is-collapsed {
  justify-content: center;
  padding: 10px 0;
}

.ln-switcher.is-collapsed .ln-switcher__text {
  display: none;
}

.ln-switcher__tile {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #1e6cb4, #114d83);
  border-radius: 10px;
  box-shadow: 0 3px 10px rgba(26, 99, 168, 0.35);
}

.ln-switcher__tile .anticon {
  font-size: 18px;
  color: #fff;
}

.ln-switcher__tile img {
  width: 20px;
  height: 20px;
  filter: brightness(0) invert(1);
}

.ln-switcher__text {
  min-width: 0;
}

.ln-switcher__name {
  display: flex;
  align-items: center;
  min-width: 0;
}

.ln-switcher__label {
  overflow: hidden;
  font-size: 14.5px;
  font-weight: 650;
  color: var(--ln-text-strong);
  letter-spacing: 0.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}


.ln-switcher__sub {
  margin-top: 2px;
  font-size: 11px;
  color: var(--ln-text-muted);
  letter-spacing: 0.4px;
}

/* ====== 切换器弹出面板（U130：ProjectSwitcher 面板同族——面板头＋图标条目＋当前项勾选，
     弃 antd 裸菜单；overlay 经 portal 渲染，面板自身带全量观感） ====== */
.ln-switcher-panel {
  min-width: 230px;
  background: var(--bg-elevated, #fff);
  border: 1px solid var(--border-subtle, #e2eaf3);
  border-radius: 10px;
  box-shadow: 0 6px 20px rgba(26, 99, 168, 0.16);
  padding: 6px;
  overflow: hidden;
}

.ln-switcher-panel__head {
  margin-bottom: 4px;
  padding: 8px 10px 9px;
  font-size: 12px;
  font-weight: 550;
  color: #1a63a8;
  border-bottom: 1px solid #eef1f5;
}

.ln-switcher-panel__item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 2px 2px;
  padding: 9px 10px;
  border-radius: 8px;
  font-size: 13.5px;
  color: var(--ln-text, #4d5361);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.ln-switcher-panel__item:hover {
  background: rgba(26, 99, 168, 0.08);
  color: #1a63a8;
}

.ln-switcher-panel__item.is-current {
  background: rgba(26, 99, 168, 0.1);
  color: #1a63a8;
  font-weight: 550;
}

.ln-switcher-panel__item-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 18px;
  font-size: 15px;
}

.ln-switcher-panel__item-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.ln-switcher-panel__item-check {
  flex-shrink: 0;
  font-size: 12px;
  color: #1a63a8;
}

/* 父级组标签（U131 折叠节）：label＋chevron，点击展开/收起；当前组主色定位 */
.ln-group {
  display: flex;
  width: 100%;
  align-items: center;
  padding: 12px 10px 6px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  font-size: 11.5px;
  color: var(--ln-text-muted);
  letter-spacing: 1px;
  transition: color 0.15s;
}

.ln-group:hover {
  color: var(--ln-accent);
}

.ln-group__text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.ln-group__chevron {
  flex-shrink: 0;
  margin-left: 6px;
  font-size: 9px;
  color: var(--ln-text-muted);
  transition: transform 0.15s;
  transform: rotate(-90deg);
}

.ln-group.is-open .ln-group__chevron {
  transform: rotate(0);
}

.ln-group:hover .ln-group__chevron {
  color: var(--ln-accent);
}

/* 当前组（无论开合）主色常驻＝「我在哪个模块」定位 */
.ln-group.is-current {
  color: var(--ln-accent);
  font-weight: 550;
}

.ln-group__body {
  /* 展开体：仅承载，无额外观感 */
}

/* 子级条目：演示壳同款（9px 竖距、8px 圆角、悬停蓝纱、选中海蓝渐变 pill＋白短线） */
.ln-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 2px 0;
  padding: 9px 12px;
  border-radius: 8px;
  font-size: 13.5px;
  color: var(--ln-text);
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.ln-item:hover {
  background: var(--nav-bg-hover, rgba(26, 99, 168, 0.08));
  color: var(--ln-accent);
}

.ln-item.is-active {
  background: var(--nav-selected-bg, linear-gradient(112deg, #1e6cb4, #114d83));
  color: var(--nav-selected-color, #fff);
  font-weight: 550;
  box-shadow: var(--nav-selected-shadow, 0 2px 8px rgba(26, 99, 168, 0.35));
}

.ln-item.is-active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 16px;
  border-radius: 0 3px 3px 0;
  background: rgba(255, 255, 255, 0.85);
}

.ln-item__icon {
  flex-shrink: 0;
  font-size: 15px;
}

.ln-item.is-active .ln-item__icon {
  color: #fff !important;
}

.ln-item__label {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.ln-item--sub {
  margin-left: 10px;
  padding: 8px 12px;
  font-size: 13px;
}

/* 收起态：只留图标列（组标签/文字隐藏） */
.ln-nav.is-collapsed {
  padding: 0 6px;
}

.ln-nav.is-collapsed .ln-group,
.ln-nav.is-collapsed .ln-item__label {
  display: none;
}

.ln-nav.is-collapsed .ln-item {
  justify-content: center;
  padding: 9px 0;
}

.ln-nav.is-collapsed .ln-item--sub {
  margin-left: 0;
}


/* 菜单区细滚动条（灰蓝族，与演示壳侧栏一致） */
:deep(.left-menu::-webkit-scrollbar) {
  width: 5px;
}

:deep(.left-menu::-webkit-scrollbar-thumb) {
  background: rgba(26, 99, 168, 0.22);
  border-radius: 3px;
}

:deep(.left-menu::-webkit-scrollbar-thumb:hover) {
  background: rgba(26, 99, 168, 0.4);
}

:deep(.left-menu::-webkit-scrollbar-track) {
  background: transparent;
}

/* ====== 拖拽控制条 ====== */
.resize-handle {
  position: absolute;
  top: 0;
  right: -2px;
  width: 5px;
  height: 100%;
  cursor: ew-resize;
  z-index: 900;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.resize-handle::before {
  content: '';
  position: absolute;
  top: 0;
  right: 1px;
  width: 1px;
  height: 100%;
  background: transparent;
  transition: background var(--transition-fast);
}

.resize-handle:hover::before {
  background: var(--accent-mid);
}

.resize-indicator {
  display: none;
}

/* ====== 收起/展开按钮 ====== */
.toggle-button {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 48px;
  transform: translateY(-50%);
  cursor: pointer;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  user-select: none;
  opacity: 0;
}

.left-nav-container:hover .toggle-button {
  opacity: 1;
}

/* 展开状态 */
.toggle-expanded {
  background: var(--nav-toggle-bg);
  border-radius: 4px 0 0 4px;
  right: 0;
}

.toggle-expanded:hover {
  background: var(--nav-toggle-bg-hover);
}

/* 收起状态 */
.toggle-collapsed {
  background: var(--nav-toggle-bg);
  border-radius: 0 4px 4px 0;
  left: 0;
}

.toggle-collapsed:hover {
  background: var(--nav-toggle-bg-hover);
}

/* 箭头图标 */
.arrow {
  width: 0;
  height: 0;
  border-style: solid;
  transition: all var(--transition-fast);
}

.arrow-left {
  border-width: 5px 6px 5px 0;
  border-color: transparent var(--nav-toggle-arrow) transparent transparent;
}

.arrow-right {
  border-width: 5px 0 5px 6px;
  border-color: transparent transparent transparent var(--nav-toggle-arrow);
}

.toggle-button:hover .arrow-left {
  border-color: transparent var(--nav-toggle-arrow-hover) transparent transparent;
}

.toggle-button:hover .arrow-right {
  border-color: transparent transparent transparent var(--nav-toggle-arrow-hover);
}

.toggle-button:active {
  transform: translateY(-50%) scale(0.95);
}
</style>

<style>
/* U130 切换器弹层去 antd 底壳（overlay 走 portal，scoped 不达——overlayClassName 定向剥离，
   观感全由 .ln-switcher-panel 自带） */
.ant-dropdown.ln-switcher-dropdown {
  background: transparent;
  border-radius: 10px;
  box-shadow: none;
  padding: 0;
}
</style>
