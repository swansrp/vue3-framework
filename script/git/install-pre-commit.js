#!/usr/bin/env node
/**
 * 安装统一 pre-commit 钩子，自动调用 hooks-runner.js
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const gitHookPath = path.resolve('.git/hooks/pre-commit')
// 使用相对路径，避免项目移动后绝对路径失效
const runnerPath = 'src/framework/script/git/hooks-runner.js'

// 预生成的钩子内容
const hookContent = `#!/bin/sh
# ⚡ 自动调用 hooks-runner.js
node "${runnerPath}" || {
  echo "❌ pre-commit hooks 失败，禁止提交"
  exit 1
}
exit 0
`

function installHook() {
    if (fs.existsSync(gitHookPath)) {
        const current = fs.readFileSync(gitHookPath, 'utf8')
        if (!current.includes('hooks-runner.js')) {
            console.warn('⚠️ pre-commit 钩子已存在，但不是 hooks-runner 管理的')
            console.warn('建议手动备份或删除后重新安装')
            return
        } else {
            console.log('⚡ pre-commit 钩子已安装，跳过')
            return
        }
    }

    fs.writeFileSync(gitHookPath, hookContent, { mode: 0o755 })
    console.log('✅ pre-commit 钩子安装成功，调用 framework/script/git/hooks-runner.js')
}

// 钩子链假定「前端目录＝git 仓根」：runnerPath 相对仓根、提交时以仓根为 cwd 跑 npm run optimize。
// 嵌套布局（如 pan 的 view 在仓内子目录）两条假定都不成立，装进去反而会挡死仓根的所有提交 ⇒ 跳过。
function isGitRepoRoot() {
    try {
        const toplevel = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim()
        return path.resolve(toplevel) === process.cwd()
    } catch {
        return false
    }
}

if (isGitRepoRoot()) {
    installHook()
} else {
    console.log('⚡ 当前目录不是 git 仓根（嵌套布局或无 git），跳过 pre-commit 钩子安装')
}
