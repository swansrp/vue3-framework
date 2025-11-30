/**
 * 密码验证工具函数
 */

/**
 * 验证密码强度和安全性
 * @param password 待验证的密码
 * @returns Promise<void>
 */
export const validatePassword = (password: string): Promise<void> => {
  if (!password || password.trim() === '') {
    return Promise.reject('请输入密码')
  }

  // 密码长度至少8位
  if (password.length < 8) {
    return Promise.reject('密码长度至少8位')
  }

  // 检查是否包含数字
  const hasNumber = /[0-9]/.test(password)
  // 检查是否包含字母
  const hasLetter = /[a-zA-Z]/.test(password)

  // 必须同时包含数字和字母
  if (!hasNumber || !hasLetter) {
    return Promise.reject('密码必须包含数字和字母')
  }

  // 检查是否有3位相同的字符
  const arr = password.split('')
  for (let i = 0; i < arr.length - 2; i++) {
    if (arr[i] === arr[i + 1] && arr[i + 1] === arr[i + 2]) {
      return Promise.reject('密码不能包含3位相同的字符')
    }
  }

  // 检查是否有3位连续的数字或字母
  for (let i = 0; i < arr.length - 2; i++) {
    const firstCode = arr[i].charCodeAt(0)
    const secondCode = arr[i + 1].charCodeAt(0)
    const thirdCode = arr[i + 2].charCodeAt(0)

    // 检查递增连续（如123, abc）
    if (secondCode - firstCode === 1 && thirdCode - secondCode === 1) {
      return Promise.reject('密码不能包含3位连续的字符')
    }

    // 检查递减连续（如321, cba）
    if (firstCode - secondCode === 1 && secondCode - thirdCode === 1) {
      return Promise.reject('密码不能包含3位连续的字符')
    }
  }

  return Promise.resolve()
}
