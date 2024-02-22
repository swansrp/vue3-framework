import {defineStore} from 'pinia'
import {getDictList} from '@/framework/apis/common/common'
import {isEmpty, isNotEmpty} from '@/framework/utils/common'
import {ValueLabel} from '@/framework/utils/type'
import {getConfig} from '@/framework/apis/params'
import {getDictNameList} from '@/framework/apis/dict/dict'

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
            getConfig(parameterName).then(res => {
                this.map.set(parameterName, res.payload)
                return res.payload
            })
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
        async getDict(dictName: string) {
            const result = this.map.get(dictName)
            if (isNotEmpty(result)) {
                return result.data
            }
            return await getDictList(dictName).then(res => {
                const valueMap = new Map()
                const labelMap = new Map()

                res.payload.forEach((data: ValueLabel) => {
                    valueMap.set(data.value, data.label)
                    // if(!isNaN(Number(data.value))) {
                    //     valueMap.set(Number(data.value), data.label)
                    // }
                    labelMap.set(data.label, data.value)
                })
                this.map.set(dictName, {data: res.payload, valueMap, labelMap})
                return res.payload
            })
        }, async getLabelAsync(dictName: string, value: number | string) {
            let dict = this.map.get(dictName)
            if (isEmpty(dict)) {
                return await this.getDict(dictName).then(() => {
                    dict = this.map.get(dictName)
                    return dict.valueMap.get(value)
                })
            } else {
                return dict.valueMap.get(value)
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
            return this.map.get(dictName).valueMap.get(value)
        }, getValue(dictName: string, label: number | string) {
            return this.map.get(dictName).labelMap.get(label)
        }, async getAllDict(dictName: string) {
            if (isEmpty(this.allDict)) {
                return await getDictNameList({name: dictName}).then((res) => {
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
