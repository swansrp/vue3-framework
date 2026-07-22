import dayjs from 'dayjs'

import { downloadBlob } from '@/framework/network/request'

/**
 * 导出JSON配置文件
 * 将数据序列化为JSON并触发浏览器下载
 * @param fileName 文件名前缀（不含扩展名和时间戳）
 * @param data 要序列化的数据
 */
export function downloadJsonConfig(fileName: string, data: any): void {
  const fullName = `${fileName}-${dayjs().format('YYYYMMDDHHmmss')}.json`
  const jsonStr = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  downloadBlob(blob, fullName)
}

/**
 * 读取并解析JSON文件
 * @param file 用户选择的File对象
 * @returns 解析后的JSON数据
 */
export async function readJsonFile(file: File): Promise<any> {
  const text = await file.text()
  return JSON.parse(text)
}
