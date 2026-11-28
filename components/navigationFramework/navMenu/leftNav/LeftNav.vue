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
    <!-- U124 统一侧栏（非嵌入态，2026-11-28 用户拍板「app 品牌白色样式做成 topheader ＋
         喜欢演示壳父级/子级的显示方式，甚至可以不用 antd 组件」）：自绘导航弃 antd menu——
         父级＝小节标签（顶级模块，点击下钻首个叶子）、子级＝条目（icon＋文字，选中海蓝 pill），
         全部顶级模块一次全展示；横向 topnav 由 TopHeader hide-topnav 撤除（壳装配层下发）。
         品牌区不做进侧栏：TopHeader 的 top_title 已与左列同宽对齐、按演示壳瓦片样式重做，
         两段拼成一条连续品牌柱。嵌入态（墨枢 iframe）零变化：仍走 left-switcher＋a-menu
         逐级展开（U119/U117 口径），本分支不渲染。 -->
    <template v-if="!isEmbedded">
      <nav
        class="ln-nav"
        :class="{ 'is-collapsed': collapsed }"
      >
        <template
          v-for="top in routeStore.dynamicRoute"
          :key="top.path"
        >
          <button
            type="button"
            class="ln-group"
            :title="`进入 ${topTitle(top)}`"
            @click="onGroupClick(top)"
          >
            {{ topTitle(top) }}
          </button>
          <template
            v-for="child in top.children || []"
            :key="child.key || child.path"
          >
            <!-- 有下级的子节点降级为二级组标签（演示壳无此层，取小节标签同款弱化态） -->
            <template v-if="child.children && child.children.length > 0">
              <div class="ln-group ln-group--sub">
                {{ topTitle(child) }}
              </div>
              <a
                v-for="gc in child.children"
                :key="gc.key || gc.path"
                class="ln-item ln-item--sub"
                :class="{ 'is-active': isActive(gc, top) }"
                href="javascript:;"
                :title="topTitle(gc)"
                @click="navigateTo(top, gc)"
              >
                <Icon
                  v-if="gc.icon"
                  :icon="gc.icon"
                  class="ln-item__icon"
                />
                <span class="ln-item__label">{{ topTitle(gc) }}</span>
              </a>
            </template>
            <a
              v-else
              class="ln-item"
              :class="{ 'is-active': isActive(child, top) }"
              href="javascript:;"
              :title="topTitle(child)"
              @click="navigateTo(top, child)"
            >
              <Icon
                v-if="child.icon"
                :icon="child.icon"
                class="ln-item__icon"
              />
              <span class="ln-item__label">{{ topTitle(child) }}</span>
            </a>
          </template>
        </template>
      </nav>
      <div
        v-if="!collapsed"
        class="left-foot"
      >
        <div class="left-foot__main">共 {{ leafCount }} 个功能</div>
        <div class="left-foot__sub">拖拽右缘可调宽度</div>
      </div>
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
import { DownOutlined, SwapOutlined } from '@ant-design/icons-vue'
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

/** 从顶级节点向下找目标叶子，返回 root→…→leaf 链（找不到返回 null） */
const findChainByKey = (root: any, targetKey: any): any[] | null => {
  const walk = (cur: any, chain: any[]): any[] | null => {
    const next = [...chain, cur]
    if (cur.key != null && String(cur.key) === String(targetKey)) return next
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
  navigationStore.activeLeftNavKey = String(chain[chain.length - 1].key)
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

/** 父级组标签点击＝下钻到该顶级第一个叶子（与嵌入态 onSwitchTop 同构） */
const onGroupClick = (top: any) => {
  let cursor: any = top
  while (cursor.children && cursor.children.length > 0) cursor = cursor.children[0]
  navigateTo(top, cursor)
}

/** 选中判定：顶级＋叶子键双对齐（跨顶级同 key 不会串） */
const isActive = (node: any, top: any) =>
  navigationStore.activeTopNavPath === top.path &&
  node.key != null &&
  String(navigationStore.activeLeftNavKey) === String(node.key)

/** 叶子功能数（分组不计数，递归下钻，全顶级合计）——底部收尾同口径 */
const leafCount = computed(() => {
  const walk = (nodes: any[]): number =>
    (nodes || []).reduce((s, n) => s + (n.children?.length ? walk(n.children) : 1), 0)
  return walk(routeStore.dynamicRoute)
})

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
  padding: 0 10px 10px;
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

/* 父级组标签：小节标签语言（可点击＝下钻该顶级首个叶子） */
.ln-group {
  display: block;
  width: 100%;
  padding: 12px 10px 6px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  font-size: 11.5px;
  color: var(--text-tertiary, #878e9c);
  letter-spacing: 1px;
  transition: color 0.15s;
}

.ln-group:hover {
  color: var(--accent, #1a63a8);
}

/* 二级组标签（有下级的子节点降级展示）：弱化＋不可点 */
.ln-group--sub {
  padding: 8px 10px 4px 12px;
  cursor: default;
  font-size: 11px;
  opacity: 0.85;
}

.ln-group--sub:hover {
  color: var(--text-tertiary, #878e9c);
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
  color: var(--text-secondary, #4d5361);
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.ln-item:hover {
  background: var(--nav-bg-hover, rgba(26, 99, 168, 0.08));
  color: var(--accent, #1a63a8);
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

/* ====== 底部收尾（U123：功能计数＋宽度提示，演示壳侧栏 foot 同构） ====== */
.left-foot {
  flex-shrink: 0;
  margin: 0 12px;
  padding: 10px 12px;
  border-top: 1px solid var(--nav-line, #d5e0ee);
}

.left-foot__main {
  font-size: 12px;
  color: var(--text-tertiary, #878e9c);
}

.left-foot__sub {
  margin-top: 3px;
  font-size: 11px;
  color: var(--text-tertiary, #878e9c);
  opacity: 0.8;
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
