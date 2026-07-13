import { isNumber } from 'lodash'

export const formatMoney = (money: number, fix = 2, unit = 10000) => {
  if (!isNumber(money)) {
    return '--'
  } else if (isNaN(money)) {
    return '--'
  } else {
    try {
      const res = (money / unit).toFixed(fix)
      return Number(res).toLocaleString(undefined, { minimumFractionDigits: fix })
    } catch (e) {
      return '--'
    }
  }
}

export const formatPercent = (src: number, fix = 2, dist = 100) => {
  const percent = src / dist
  if (isEmpty(src) || isNaN(percent) || !Number.isFinite(percent)) {
    return '--'
  } else {
    try {
      const res = (percent * 100).toFixed(fix)
      return Number(res).toLocaleString(undefined, { minimumFractionDigits: fix }) + '%'
    } catch (e) {
      return '--'
    }
  }
}

export const formatDate = (inputTime: Date) => {
  const date = new Date(inputTime)
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return ''
  }
  let month: string | number = date.getMonth() + 1
  let strDate: string | number = date.getDate()
  if (month >= 1 && month <= 9) {
    month = '0' + month
  }
  if (strDate >= 0 && strDate <= 9) {
    strDate = '0' + strDate
  }
  let hour: string | number = date.getHours()
  if (hour >= 0 && hour <= 9) {
    hour = '0' + hour
  }
  let minutes: string | number = date.getMinutes()
  if (minutes >= 0 && minutes <= 9) {
    minutes = '0' + minutes
  }
  let seconds: string | number = date.getSeconds()
  if (seconds >= 0 && seconds <= 9) {
    seconds = '0' + seconds
  }
  return date.getFullYear() + '-' + month + '-' + strDate +
    ' ' + hour + ':' + minutes + ':' + seconds
}
