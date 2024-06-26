import { isEmpty } from '@/framework/utils/common'

export const formatMoney = (money: number, fix: number, unit?: number) => {
  if (unit === undefined || isEmpty(unit)) {
    unit = 1
  }
  if (isEmpty(money)) {
    return '--'
  } else if (isNaN(money)) {
    return '--'
  } else {
    try {
      if (isEmpty(fix)) {
        const res = money / unit
        return Number(res).toLocaleString(undefined, { minimumFractionDigits: 2 })
      } else {
        const res = (money / unit).toFixed(fix)
        return Number(res).toLocaleString(undefined, { minimumFractionDigits: fix })
      }
    } catch (e) {
      return '--'
    }
  }
}

export const formatPercent = (src: number, dist: number, fix: number) => {
  const percent = src / dist
  if (isNaN(percent) || !Number.isFinite(percent)) {
    return '--'
  } else {
    try {
      if (isEmpty(fix)) {
        const res = percent * 100
        return Number(res).toLocaleString(undefined, { minimumFractionDigits: 2 }) + '%'
      } else {
        const res = (percent * 100).toFixed(fix)
        return Number(res).toLocaleString(undefined, { minimumFractionDigits: fix }) + '%'
      }
    } catch (e) {
      return '--'
    }
  }
}
