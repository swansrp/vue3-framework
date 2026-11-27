import fs from 'fs'

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

// region 分页每页条数下拉(2026-11-27 对账单): vc-pagination 给 size-changer 硬编码
// getPopupContainer=triggerNode=>triggerNode.parentNode(props 优先于 ConfigProvider context,
// 顶不掉), 弹层内联挂载; 在 dark-dialog 的 v-scale-screen/.dialog-info transform 祖先里
// 定位飞出视口+进场动画卡死(恒 opacity:0), 穿透框「每页X条」看着像"点了没反应"。
// 删掉这行让弹层走 context: 普通页面=document.body 默认, dark-dialog=#dark-popup-root
const antdOptionsFileArray = [
  './node_modules/ant-design-vue/es/vc-pagination/Options.js',
  './node_modules/ant-design-vue/lib/vc-pagination/Options.js'
]
const crackPaginationDropdown = () => {
  antdOptionsFileArray.forEach(file => {
    fs.readFile(file, 'utf8', (err, data) => {
      if (err) throw err
      const target = '"getPopupContainer": triggerNode => triggerNode.parentNode'
      if (data.includes(target)) {
        fs.writeFile(file, data.replace(target + ',', '').replace(target, ''), 'utf8', err => {
          if (err) throw err
          console.log(file + ' 分页size-changer硬编码getPopupContainer已移除!')
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
  fs.writeFile(filePath, JSON.stringify({ time: getCurrentTime() }), null, err => (err ? console.log(err) : console.log('编译时间文件生成成功！')))
}

printCompileTime()
crackSurely()
crackPaginationDropdown()
