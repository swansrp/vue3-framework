import pinyin from 'pinyin'

/**
 * 将中文文本转换为拼音格式
 * @param text 要转换的中文文本
 * @param uppercase 是否转大写（字典编码用大写，字段名用小写）
 * @returns 拼音字符串，用下划线连接
 */
export const convertToPinyin = (text: string, uppercase = false): string => {
  try {
    // 先去除换行符、空白字符等特殊字符，以及字符串字面量的 \n \r
    let cleanText = text
      .replace(/[\r\n\s\t]/g, '') // 真正的换行符和空白字符
      .replace(/\\n/g, '') // 字符串字面量 \n
      .replace(/\\r/g, '') // 字符串字面量 \r
    
    // 将中文转换为拼音，使用下划线连接
    const pinyinResult = pinyin(cleanText, {
      style: pinyin.STYLE_NORMAL, // 不带音调
      heteronym: false // 不返回多音字的所有读音
    })
    // pinyin() 返回二维数组，需要展平并用下划线连接
    const result = pinyinResult
      .map((item: string[]) => item[0]) // 取每个字的拼音
      .filter((item: string) => item && /[a-zA-Z0-9]/.test(item)) // 只保留非空且包含字母的项
      .join('_') // 用下划线连接
    
    return uppercase ? result.toUpperCase() : result.toLowerCase()
  } catch (error) {
    console.warn('拼音转换失败:', error)
    return ''
  }
}
