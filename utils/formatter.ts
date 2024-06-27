import { isEmpty } from '@/framework/utils/common'

export const formatMoney = (money: number, fix = 2, unit = 10000) => {
  if (isEmpty(money)) {
    return '--'
  } else if (isNaN(money)) {
    return '--'
  } else {
    try {
      const res = (money / unit).toFixed(fix)
      return Number(res).toLocaleString(undefined, {minimumFractionDigits: fix})
    } catch (e) {
      return '--'
    }
  }
}

export const formatPercent = (src: number, fix = 2, dist = 100) => {
  const percent = src / dist
  if (isNaN(percent) || !Number.isFinite(percent)) {
    return '--'
  } else {
    try {
      const res = (percent * 100).toFixed(fix)
      return Number(res).toLocaleString(undefined, {minimumFractionDigits: fix}) + '%'
    } catch (e) {
      return '--'
    }
  }
}
