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

// —— 框架依赖对齐：src/framework/config/framework-deps.json 为框架运行时依赖唯一正源 ——
// 框架新增通用功能的依赖只改该文件；项目 package.json 由本脚本自动对齐（框架版本优先），
// 写回后 package.json 变新，自然触发下方自动 npm install。
const frameworkDepsFile = './src/framework/config/framework-deps.json'
if (fs.existsSync(frameworkDepsFile) && fs.existsSync(pkgJson)) {
    try {
        const fd = JSON.parse(fs.readFileSync(frameworkDepsFile, 'utf8'))
        const pkg = JSON.parse(fs.readFileSync(pkgJson, 'utf8'))
        let changed = false
        for (const section of ['dependencies', 'devDependencies']) {
            const want = fd[section] || {}
            pkg[section] = pkg[section] || {}
            for (const [name, ver] of Object.entries(want)) {
                if (pkg[section][name] !== ver) {
                    console.log(`🔗 ${section} ${name}: ${pkg[section][name] || '(缺失)'} -> ${ver}`)
                    pkg[section][name] = ver
                    changed = true
                }
            }
        }
        if (changed) {
            fs.writeFileSync(pkgJson, JSON.stringify(pkg, null, 2) + '\n')
            console.log('📝 package.json 已按框架依赖清单(framework-deps.json)对齐')
        }
        const bp = (pkg.scripts || {})['build:prod'] || ''
        if (bp && !bp.includes('npm run install')) {
            console.warn('⚠️ 提示：scripts.build:prod 未前置 npm run install，纯 build 流程不会触发框架依赖同步；建议改为 "npm run install && npm run bidr && ..."')
        }
    } catch (err) {
        console.error('⚠️ 框架依赖对齐失败（跳过，不影响启动）:', err.message)
    }
}

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
