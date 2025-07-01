import Dexie from 'dexie'
import { title } from '@/../package.json'

export const db = new Dexie(title) as any

export const getPrimaryKey = (tableName: any) => {
  return db[tableName].schema.primKey.name;
}

// 获取所有 items
export const selectAll = async (tableName: any) => {
  return await db[tableName].toArray();
}

// 获取所有 items
export const selectById = async (tableName: any, id: any) => {
  return await db[tableName].get(id);
}

// 添加 item
export const add = async (tableName: any, obj: any) => {
  return await db[tableName].add(obj);
}

// 删除 item
export const deleteById = async (tableName: any, id: any) => {
  return await db[tableName].delete(id);
}

// 更新 item
export const updateById = async (tableName: any, id: any, obj: any) => {
  return await db[tableName].update(id, obj);
}

export const insertOrUpdateById = async (tableName: any, id: any, obj: any) => {
  const existingRecord = await db[tableName].get(id);
  if (existingRecord) {
    await db[tableName].update(id, obj);
  } else {
    return await db[tableName].add(obj);
  }
}