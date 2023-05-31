import mitt from "mitt"
// 定义一个全局的事件总线
// 之所以没有挂载到Vue的app上，是因为这种方法获取到事件总线需要首先获取Vue的app的实例对象，且获取对象时容易出现各种TS错误和实例对象为null的错误，比较麻烦
// 不如单独写一个文件，需要时直接引入即可
export default mitt()
