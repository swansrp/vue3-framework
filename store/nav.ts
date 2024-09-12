import {defineStore} from "pinia"
import {Key} from 'ant-design-vue/lib/table/interface'
import {TabType} from "@/framework/components/navigationFramework/historyTab/type";
import {HOME, MAIN_CONTENT} from "@/framework/utils/constant";
import {getQueryObject} from "@/framework/network/utils";
import {LocationQueryRaw} from "vue-router";

export const useTabStore = defineStore('tabStore', {
  state: () => {
    return {
      // 左侧导航栏 当前选项的 key，与selectedKeys相对应；同时联系着HistoryTab组件
      tabActivateKey: '' as Key,
      // 记录已有key，用于判断左侧导航中已选的选项是否存在与tab中
      _historyTabSet: new Set(),
      // 记录用户在左侧导航中的历史选项tab
      _historyTabArray: [] as Array<TabType>,
      // 记录历史tab选项，使用key可以快速找到对应的tab
      _key2HistoryTabMap: {} as { [key: string]: TabType },
      // 只记录顶部导航菜单的path
      topNavPath: '',
      // 记录左侧导航的中文名称路径，用于在面包屑中展示
      titlePath: [] as Array<string>,
      // 用于判断是否需要左侧导航，根据左侧导航的数据源 dataSource 是否为空进行判断
      isNeedLeftNav: true,
      isNeedNav: true,
      //标志位，每次更新就加1，这样就可以强制触发topNavPath的更新操作
      updateTopNav: 0,
      //标志位，变为true就表示需要使用动态路由中的第一个路由
      updateLeftNav: false
    }
  },
  actions: {
    addHistoryTab(tab: TabType, hrefFullPath: string) {
      // console.log('addHistoryTab', tab, hrefFullPath)
      const key = String(tab.id || tab.key)
      tab.key = key
      if (!this._historyTabSet.has(key)) {
        this._historyTabSet.add(key)
        this._historyTabArray.push(tab)
      }
      this._key2HistoryTabMap[key] = tab
      this._key2HistoryTabMap[key].fullPath = hrefFullPath
      this.tabActivateKey = key
    },
    deleteHistoryTab(key: Key) {
      this._historyTabArray = this._historyTabArray.filter(tab => tab.key !== key)
      this._historyTabSet.delete(key)
      delete this._key2HistoryTabMap[key]
    },
    // 保存用户最后选择的openKeys和tab
    changeTab(key: Key) {
      const fullPath = this._key2HistoryTabMap[key].fullPath
      const fullPathArray = fullPath.split('/').filter(item => item).slice(1)
      // 通知topNav选中对应的菜单项
      this.topNavPath = fullPathArray[0]
    },
    setTitlePath(pathArray: Array<string>) {
      this.titlePath = pathArray
    },
    setTopNavPath(path: string) {
      this.topNavPath = path
    },
    getRouterTarget(key: Key) {
      if(this._key2HistoryTabMap[key]) {
        const path = `${this._key2HistoryTabMap[key].fullPath}`
        let query = undefined
        if(this._key2HistoryTabMap[key].query) {
          query = getQueryObject(`${this._key2HistoryTabMap[key].query}`) as LocationQueryRaw
        }
        return {
          path,
          query
        }
      } else {
        return {
          path: `/${MAIN_CONTENT}/${HOME}`
        }
      }
    }
  }
})
