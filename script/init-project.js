/**
 * 项目初始化脚本
 * 用途：从 framework/setup 文件夹复制模板文件并初始化新项目
 * 使用方法：node src/framework/script/init-project.js
 */

import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { fileURLToPath } from 'url'

// 获取当前文件所在目录
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 项目根目录
const rootDir = path.resolve(__dirname, '../../..')

// setup 模板目录
const setupDir = path.resolve(__dirname, '../setup')

// package.json.backup 文件路径
const packageBackupPath = path.resolve(__dirname, '../config/package.json.backup')

// 需要复制的文件和目录
const filesToCopy = [
  '.env.development',
  '.env.production',
  '.eslintrc.cjs',
  '.gitignore',
  'deploy.sh',
  'index.html',
  'tsconfig.json',
  'public',
  'src/App.vue',
  'src/main.ts',
  'src/assets'
]

/**
 * 创建 readline 接口用于用户输入
 */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

/**
 * 询问用户输入
 */
function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim())
    })
  })
}

/**
 * 递归复制文件夹
 */
function copyDirectory(src, dest) {
  // 创建目标目录
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true })
  }

  // 读取源目录
  const entries = fs.readdirSync(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      // 递归复制子目录
      copyDirectory(srcPath, destPath)
    } else {
      // 复制文件
      fs.copyFileSync(srcPath, destPath)
      console.log(`✓ 已复制: ${path.relative(rootDir, destPath)}`)
    }
  }
}

/**
 * 复制单个文件
 */
function copyFile(src, dest) {
  const destDir = path.dirname(dest)
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true })
  }
  fs.copyFileSync(src, dest)
  console.log(`✓ 已复制: ${path.relative(rootDir, dest)}`)
}

/**
 * 创建 package.json 文件
 */
function createPackageJson(projectCode, projectName) {
  // 读取 package.json.backup
  if (!fs.existsSync(packageBackupPath)) {
    throw new Error(`找不到模板文件: ${packageBackupPath}`)
  }

  let content = fs.readFileSync(packageBackupPath, 'utf-8')
  
  // 替换 name 和 title
  content = content.replace('"name": "server_name"', `"name": "${projectCode}"`)
  content = content.replace('"title": "server_title"', `"title": "${projectName}"`)

  // 写入根目录
  const targetPath = path.join(rootDir, 'package.json')
  fs.writeFileSync(targetPath, content, 'utf-8')
  console.log(`✓ 已创建: package.json (name: ${projectCode}, title: ${projectName})`)
}

/**
 * 检查文件是否存在
 */
function checkFileExists(filePath) {
  return fs.existsSync(filePath)
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('='.repeat(60))
    console.log('   项目初始化工具')
    console.log('='.repeat(60))
    console.log()

    // 检查 setup 目录是否存在
    if (!fs.existsSync(setupDir)) {
      throw new Error(`找不到 setup 目录: ${setupDir}`)
    }

    // 检查 package.json.backup 是否存在
    if (!fs.existsSync(packageBackupPath)) {
      throw new Error(`找不到 package.json.backup: ${packageBackupPath}`)
    }

    // 询问用户输入
    const projectCode = await question('请输入项目编码 (英文，用于 package.json 的 name): ')
    if (!projectCode) {
      throw new Error('项目编码不能为空')
    }

    const projectName = await question('请输入项目名称 (中文，用于 package.json 的 title): ')
    if (!projectName) {
      throw new Error('项目名称不能为空')
    }

    console.log()
    console.log('开始初始化项目...')
    console.log(`项目编码: ${projectCode}`)
    console.log(`项目名称: ${projectName}`)
    console.log()

    // 确认是否继续
    const confirm = await question('确认要初始化项目吗？这将覆盖现有文件 (y/n): ')
    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
      console.log('已取消初始化')
      rl.close()
      return
    }

    console.log()
    console.log('正在复制文件...')
    console.log()

    // 复制文件和目录
    for (const item of filesToCopy) {
      const srcPath = path.join(setupDir, item)
      const destPath = path.join(rootDir, item)

      if (!fs.existsSync(srcPath)) {
        console.warn(`⚠ 警告: 源文件不存在，跳过: ${item}`)
        continue
      }

      const stat = fs.statSync(srcPath)
      if (stat.isDirectory()) {
        copyDirectory(srcPath, destPath)
      } else {
        copyFile(srcPath, destPath)
      }
    }

    console.log()
    console.log('正在创建 package.json...')
    console.log()

    // 创建 package.json
    createPackageJson(projectCode, projectName)

    console.log()
    console.log('='.repeat(60))
    console.log('✓ 项目初始化完成！')
    console.log('='.repeat(60))
    console.log()

    // 询问是否安装依赖
    const installDeps = await question('是否立即安装依赖？(y/n): ')
    if (installDeps.toLowerCase() === 'y' || installDeps.toLowerCase() === 'yes') {
      console.log()
      console.log('正在安装依赖...')
      const { execSync } = await import('child_process')
      try {
        execSync('npm install', { cwd: rootDir, stdio: 'inherit' })
        console.log()
        console.log('✓ 依赖安装完成！')
        console.log()

        // 询问是否启动开发服务器
        const startDev = await question('是否启动开发服务器？(y/n): ')
        if (startDev.toLowerCase() === 'y' || startDev.toLowerCase() === 'yes') {
          console.log()
          console.log('正在启动开发服务器...')
          console.log('按 Ctrl+C 可停止服务器')
          console.log()
          execSync('npm run dev', { cwd: rootDir, stdio: 'inherit' })
        } else {
          console.log()
          console.log('提示：可以稍后运行 npm run dev 启动开发服务器')
          console.log()
        }
      } catch (error) {
        console.error()
        console.error('✗ 执行失败:', error.message)
        console.error()
      }
    } else {
      console.log()
      console.log('后续步骤：')
      console.log('  1. 运行 npm install 安装依赖')
      console.log('  2. 运行 npm run dev 启动开发服务器')
      console.log()
    }

  } catch (error) {
    console.error()
    console.error('✗ 初始化失败:', error.message)
    console.error()
  } finally {
    rl.close()
  }
}

// 运行主函数
main()
