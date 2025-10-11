import Dexie, { Table } from 'dexie'

import { name } from '@/../package.json'

class Database extends Dexie {
  constructor(dbName: string) {
    super(name + '-' + dbName)
  }

  // 创建或获取表格的方法
  getTable<T>(tableName: string): Table<T> {
    return this.table(tableName) as Table<T>
  }

  getPrimaryKey(tableName: any, data: any) {
    const primaryKey = this.getPrimaryKeyPath(tableName)
    // 计算主键值，支持复合主键
    return primaryKey && (Array.isArray(primaryKey)
      ? primaryKey.map(pk => data[pk]).join('-') // 拼接复合主键
      : data[primaryKey])
  }

  sanitizeItem = (data: any) => {
    // 移除对象中的非可序列化属性（例如函数、DOM 元素等）
    const res = { ...data }

    // 移除函数类型的属性
    Object.keys(res).forEach((key) => {
      if (typeof res[key] === 'function') {
        delete res[key]
      } else if (res[key] === undefined) {
        delete res[key]
      } else if (typeof res[key] === 'object') {
        delete res[key]
      }
    })
    return res
  }

  validateItem = (tableName: string, data: any) => {
    if (isEmpty(data)) {
      return false
    }
    const entity = this.sanitizeItem(data)
    const primaryKey = this.getPrimaryKeyPath(tableName)
    if (Array.isArray(primaryKey)) {
      // 复合主键
      for (const key of primaryKey) {
        if (data[key] === null || data[key] === undefined) {
          console.error(`主键字段 "${ key }" 的值无效：null 或 undefined`, data)
          return false
        }
      }
    } else if (primaryKey) {
      // 单一主键
      if (data[primaryKey] === null || data[primaryKey] === undefined) {
        console.error(`主键字段 "${ primaryKey }" 的值无效：null 或 undefined`, data)
        return false
      }
    }
    return entity
  }

  reflectToPrimaryKeyMap(tableName: string, allData: Array<any>) {
    const dataMap = new Map<any, any>()
    allData.forEach(item => {
      dataMap.set(this.getPrimaryKey(tableName, item), item)
    })
    return dataMap
  }

  async selectAll(tableName: any, property?: string, asc?: 0 | 1) {
    if (property && property !== '') {
      if (!asc) {
        return this.getTable(tableName).orderBy(property).toArray()
      } else {
        return this.getTable(tableName).orderBy(property).reverse().toArray()
      }
    } else {
      return this.getTable(tableName).toArray()
    }
  }

  async selectById(tableName: any, id: any) {
    return this.getTable(tableName).get(id)
  }

  async insert(tableName: any, obj: any) {
    const entity = this.validateItem(tableName, obj)
    return entity && this.getTable(tableName).add(entity)
  }

  async deleteById(tableName: any, obj: any) {
    const primaryKey = this.getPrimaryKeyObj(tableName, obj)
    return this.getTable(tableName).delete(primaryKey)
  }

  async deleteByProperty(tableName: any, property: any, data: any) {
    return this.getTable(tableName).where(property).equals(data).delete()
  }

  async update(tableName: any, obj: any) {
    const entity = this.validateItem(tableName, obj)
    return entity && this.getTable(tableName).update(this.getPrimaryKeyObj(tableName, obj), entity)
  }

  async insertOrUpdate(tableName: any, obj: any) {
    const entity = this.validateItem(tableName, obj)
    return entity && this.getTable(tableName).put(entity)
  }

  private getPrimaryKeyPath(tableName: any) {
    return this.getTable(tableName).schema.primKey.keyPath
  }

  private getPrimaryKeyObj(tableName: any, data: any) {
    const primaryKey = this.getPrimaryKeyPath(tableName)
    const result = {} as any
    // 计算主键值，支持复合主键
    if (primaryKey) {
      if (Array.isArray(primaryKey)) {
        for (const key of primaryKey) {
          if (key in data) {
            result[key] = data[key]
          }
        }
      } else {
        result[primaryKey] = data[primaryKey]
      }
      return result
    } else {
      return null
    }
  }
}

export default Database