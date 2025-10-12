#!/usr/bin/env node
/**
 * 自动检查依赖是否需要安装
 * 逻辑：
 *   - 如果 node_modules 不存在，或 package-lock.json 更新过，自动执行 npm install
 *   - 安装前打印提示
 */

import { execSync } from 'child_process'
import fs from 'fs'

const nodeModules = './node_modules'
const pkgLock = './package-lock.json'
const pkgJson = './package.json'

let needInstall = false

if (!fs.existsSync(nodeModules)) {
    needInstall = true
} else {
    const lockTime = fs.existsSync(pkgLock) ? fs.statSync(pkgLock).mtimeMs : 0
    const pkgTime = fs.existsSync(pkgJson) ? fs.statSync(pkgJson).mtimeMs : 0
    // 如果 package.json 比 lock 文件新，也认为需要 reinstall
    if (pkgTime > lockTime) needInstall = true
}

if (needInstall) {
    console.log('📦 检测到依赖缺失或变更，正在自动执行 npm install...')
    try {
        execSync('npm install', { stdio: 'inherit' })
    } catch (err) {
        console.error('❌ npm install 执行失败:', err.message)
        process.exit(1)
    }
} else {
    console.log('✅ 依赖检测通过，无需安装')
}
