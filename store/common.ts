import { defineStore } from 'pinia'

import { baseDomain } from '@/framework/apis'
import { getDictList, getTreeList } from '@/framework/apis/common/common'
import { getAllTreeDict, getDictNameList } from '@/framework/apis/dict/dict'
import { getAllNodes, isEmpty, isNotEmpty } from '@/framework/utils/common'
import { ValueLabel } from '@/framework/utils/type'

export const useCommonStore = defineStore('commonStore', {
  state: () => {
    return {
      version: '', hasLogin: false // 用于判断请求中 headers 字段中的 Authorization
    }
  }, getters: {
    getLoginState: (state): boolean => state.hasLogin
  }
})

export const parameterStore = defineStore('parameterStore', {
  state: () => {
    return {
      map: new Map() // 用于判断请求中 headers 字段中的 Authorization
    }
  }, actions: {
    async getParameter(parameterName: string) {
      const result = this.map.get(parameterName)
      if (isNotEmpty(result)) {
        return result
      }
      return await import('@/framework/apis/params').then(m => m.getConfig(parameterName).then(res => {
        this.map.set(parameterName, res.payload)
        return res.payload
      }))
    }
  }, getters: {}
})

export const dictStore = defineStore('dictStore', {
  state: () => {
    return {
      map: new Map(),
      allDict: [] as Array<{ value: string, label: string }>
    }
  }, actions: {
    async getDict(dictName: string, baseUrl = baseDomain) {
      const result = this.map.get(dictName)
      if (isNotEmpty(result)) {
        return result.data.filter((dict:any) => dict.show !== '0')
      }
      return await getDictList(dictName, baseUrl).then(res => {
        const valueMap = new Map()
        const labelMap = new Map()

        res.payload.forEach((data: ValueLabel) => {
          valueMap.set(data.value, data.label)
          // if(!isNaN(Number(data.value))) {
          //     valueMap.set(Number(data.value), data.label)
          // }
          labelMap.set(data.label, data.value)
        })
        this.map.set(dictName, { data: res.payload, valueMap, labelMap })
        return res.payload.filter((dict:any) => dict.show !== '0')
      })
    }, async getLabelAsync(dictName: string, value: number | string) {
      const dict = this.map.get(dictName)
      if (isEmpty(dict)) {
        return await this.getDict(dictName).then(() => {
          return this.getLabel(dictName, value)
        })
      } else {
        return this.getLabel(dictName, value)
      }

    }, async getValueAsync(dictName: string, label: number | string) {
      let dict = this.map.get(dictName)
      if (isEmpty(dict)) {
        return await this.getDict(dictName).then(() => {
          dict = this.map.get(dictName)
          return dict.labelMap.get(label)
        })
      } else {
        return dict.labelMap.get(label)
      }
    }, getLabel(dictName: string, value: number | string) {
      if (isEmpty(value)) return ''
      const dictArray = value.toString().split(',')
      const display = [] as Array<string>
      dictArray.forEach((item: any) => {
        display.push(this.map.get(dictName).valueMap.get(item))
      })
      return display.join(',')

    }, getValue(dictName: string, label: number | string) {
      return this.map.get(dictName).labelMap.get(label)
    }, async getAllDict(dictName: string) {
      if (isEmpty(this.allDict)) {
        return await getDictNameList({ name: dictName }).then((res) => {
          this.allDict = res.payload || []
          return this.allDict
        })
      } else {
        if (isEmpty(dictName)) {
          return this.allDict
        } else {
          return this.allDict.filter(dict => dict.value.indexOf(dictName) !== -1)
        }
      }
    }
  }, getters: {}
})

export const useTreeStore = defineStore('treeStore', {
  state: () => {
    return {
      map: new Map(),
      allDict: [] as Array<{ value: string, label: string }>
    }
  }, actions: {
    async getTree(dictName: string, baseUrl = baseDomain) {
      const result = this.map.get(dictName)
      if (isNotEmpty(result)) {
        return result.data
      }
      return await getTreeList(dictName, baseUrl).then(res => {
        const valueMap = new Map()
        const labelMap = new Map()
        getAllNodes(res.payload, (item: any) => {
          valueMap.set(item.value.toString(), item.label)
          labelMap.set(item.label, item.value)
        })
        this.map.set(dictName, { data: res.payload, valueMap, labelMap })
        return res.payload
      })
    }, getLabel(dictName: string, value: number | string) {
      if (isEmpty(value)) return ''
      const dictArray = value.toString().split(',')
      const display = [] as Array<string>
      dictArray.forEach((item: any) => {
        display.push(this.map.get(dictName).valueMap.get(item))
      })
      return display.join(',')

    }, getValue(dictName: string, label: number | string) {
      return this.map.get(dictName).labelMap.get(label)
    }, async getAllDict() {
      if (isEmpty(this.allDict)) {
        return await getAllTreeDict().then((res: any) => {
          this.allDict = res.payload || []
          return this.allDict
        })
      } else {
        return this.allDict
      }
    }
  }, getters: {}
})
