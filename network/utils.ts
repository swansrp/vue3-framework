import {EmptyObjectType} from "@/framework/utils/type"

export const getQueryObject = function (url: string) {
    url = url || window.location.href
    const search = url.substring(url.lastIndexOf('?') + 1).split('#')[0]
    const obj: EmptyObjectType = {}
    const reg = /([^?&=]+)=([^?&=]*)/g
    search.replace(reg, (rs, $1, $2) => {
        const name = decodeURIComponent($1)
        let val = decodeURIComponent($2)
        val = String(val)
        obj[name] = val
        return rs
    })
    return obj
}

export const removeURLParameter = function (url: string, parameter: string) {
    const urlParts = url.split('?')
    if (urlParts.length >= 2) {
        // 参数名前缀
        const prefix = encodeURIComponent(parameter) + '='
        const pars = urlParts[1].split(/[&;]/g)
        // 循环查找匹配参数
        for (let i = pars.length; i-- > 0;) {
            if (pars[i].lastIndexOf(prefix, 0) !== -1) {
                // 存在则删除
                pars.splice(i, 1)
            }
        }
        return urlParts[0] + (pars.length > 0 ? '?' + pars.join('&') : '')
    }
    return url
}
