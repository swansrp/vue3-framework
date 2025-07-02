import fs from 'fs'
import path from "path"

// region 解决 node_modules 修改源码，导致重新装包而要手动替换源码的重复操作。
// 将 scripts/node_modules 内的文件 覆盖 真正的 node_modules
const REAL_NODE_MODULES = path.resolve('./node_modules') // 旧node_modules
const MY_NODE_MODULES = path.resolve('./bidr_modules') // 新node_modules
// 复制目录中的所有文件包括子目录

function copy(origin, target) {
  if (fs.existsSync(origin)) {
    if (fs.statSync(origin).isDirectory()) {
      // 来源是个文件夹，那目标也整一个文件夹
      if (!fs.existsSync(target)) fs.mkdirSync(target)
      fs.readdirSync(origin).forEach(originName => {
        if (originName.startsWith('.')) return
        const originFilePath = path.resolve(origin, originName)
        const targetFilePath = path.resolve(target, originName)
        copy(originFilePath, targetFilePath)
      })
    } else fs.copyFileSync(origin, target)
  }
}

// endregion

// region 应对surely vue版本升级 直接去除水印日志
const surelyPath = './node_modules/@surely-vue/table/dist/'
const surelyFileArray = ['index.esm.js', 'index.min.js', 'index.umd.js']
const crackSurely = () => {
  surelyFileArray.forEach(file => {
    fs.readFile(surelyPath + file, 'utf8', (err, data) => {
      if (err) throw err
      const start = data.indexOf('case 1:console.error(')
      const end = data.indexOf('default:e.value=')
      if (start !== -1) {
        let modifiedData = data.replace(data.substring(start, end), '')
        modifiedData = modifiedData.replace('Powered by Surely Vue', '')
        fs.writeFile(surelyPath + file, modifiedData, 'utf8', err => {
          if (err) throw err
          console.log(file + '文件内容已成功修改!')
        })
      }
    })
    fs.readFile(surelyPath + file, 'utf8', (err, data) => {
      if (err) throw err
      const newStart = data.indexOf('case 1:new Function')
      const newEnd = data.indexOf('default:e.value=')
      if (newStart !== -1) {
        let modifiedData = data.replace(data.substring(newStart, newEnd), '')
        modifiedData = modifiedData.replace('n.value.isTrial&&', 'n.value.isTrial&&false&&')
        modifiedData = modifiedData.replace('Powered by Surely Vue', '')
        fs.writeFile(surelyPath + file, modifiedData, 'utf8', err => {
          if (err) throw err
          console.log(file + ' 5.0版本文件内容已成功修改!')
        })
      }
    })
  })
}
// endregion


const getCurrentTime = () => {
  const dateDigitToString = num => num < 10 ? '0' + num : num
  const currentDate = new Date()
  const year = dateDigitToString(currentDate.getFullYear())
  const month = dateDigitToString(currentDate.getMonth() + 1)
  const date = dateDigitToString(currentDate.getDate())
  const hour = dateDigitToString(currentDate.getHours())
  const minute = dateDigitToString(currentDate.getMinutes())
  const second = dateDigitToString(currentDate.getSeconds())
  return (year + '年' + month + '月' + date + '日 ' + hour + ':' + minute + ':' + second)
}


const printCompileTime = () => {
  const filePath = './public/compileTime.json'
  fs.writeFile(filePath, JSON.stringify({time: getCurrentTime()}), null, err => (err ? console.log(err) : console.log('编译时间文件生成成功！')))
}

printCompileTime()
//copy(MY_NODE_MODULES, REAL_NODE_MODULES)
crackSurely()
