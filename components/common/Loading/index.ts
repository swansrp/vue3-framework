import { createApp } from 'vue'
import myLoad from '@/framework/components/common/Loading/index.vue'

let hasInsert = false
const loading = createApp(myLoad).mount(document.createElement('div'))

const insertLoadingToBody = () => {
    if (hasInsert) return
    hasInsert = true
    document.body.appendChild(loading.$el)
}

export const load = {
    show() { // 控制显示loading的方法
        insertLoadingToBody()
        const myLoading = document.getElementById('my-loading')
        if (myLoading) myLoading.style.display = 'block'
    },
    close() { // 控制loading隐藏的方法
        const myLoading = document.getElementById('my-loading')
        if (myLoading) myLoading.style.display = 'none'
    }
}

