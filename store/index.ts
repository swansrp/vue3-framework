// 如果在js文件中直接使用pinia，容易出现还未加载main.ts时就加载某些js文件
// 以至于出现pinia还没有挂在到vue上就使用的问题，控制台弹出 pinia未安装或加载 的错误
// 解决方案是先创建一个全局的pinia对象，然后共同引入，就解决了这个问题

import { createPinia } from 'pinia'
const pinia = createPinia();
export default pinia
