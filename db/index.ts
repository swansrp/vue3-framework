import Dexie, { Table } from 'dexie'
import { title } from '@/../package.json'

class Database extends Dexie {
  constructor(name: string) {
    super(title + '-' + name)
  }

  // 创建或获取表格的方法
  getTable<T>(tableName: string): Table<T> {
    return this.table(tableName) as Table<T>
  }

  getPrimaryKey(tableName: any) {
    return this.getTable(tableName).schema.primKey.name
  }

  sanitizeItem = (item: any) => {
    // 移除对象中的非可序列化属性（例如函数、DOM 元素等）
    const sanitizedItem = { ...item }

    // 移除函数类型的属性
    Object.keys(sanitizedItem).forEach((key) => {
      if (typeof sanitizedItem[key] === 'function') {
        delete sanitizedItem[key]
      } else if (sanitizedItem[key] === undefined) {
        delete sanitizedItem[key]
      } else if (typeof sanitizedItem[key] === 'object') {
        delete sanitizedItem[key]
      }
    })
    return sanitizedItem
  }

  validateItem = (tableName: string, item: any) => {
    const entity = this.sanitizeItem(item)
    const primaryKey = this.getPrimaryKey(tableName)
    let keys: Array<string> = ['id']
    if (primaryKey.startsWith('[')) {
      keys = primaryKey.substring(1, primaryKey.length - 1).split('+')
    } else if (primaryKey.startsWith('++')) {
      keys = primaryKey.split('++')
    } else if (primaryKey.startsWith('&')) {
      keys = primaryKey.split('&')
    }
    for (const key of keys) {
      if (isNotEmpty(key)) {
        if (isEmpty(entity[key])) {
          console.debug('入库校验失败: 字段' + key + '不存在', entity)
          return null
        }
      }
    }
    return entity
  }

// 获取所有 items
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

// 获取所有 item 指定id
  async selectById(tableName: any, id: any) {
    return this.getTable(tableName).get(id)
  }

// 添加 item
  async insert(tableName: any, obj: any) {
    const entity = this.validateItem(tableName, obj)
    return entity && this.getTable(tableName).add(this.validateItem(tableName, obj))
  }

// 删除 item
  async deleteById(tableName: any, id: any) {
    return this.getTable(tableName).delete(id)
  }

// 更新 item
  async updateById(tableName: any, id: any, obj: any) {
    const entity = this.validateItem(tableName, obj)
    return entity && this.getTable(tableName).update(id, this.validateItem(tableName, obj))
  }

  async insertOrUpdate(tableName: any, obj: any) {
    const entity = this.validateItem(tableName, obj)
    return entity && this.getTable(tableName).put(entity)
  }
}

export default Database