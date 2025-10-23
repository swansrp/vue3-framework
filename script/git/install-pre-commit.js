#!/usr/bin/env node
/**
 * 安装统一 pre-commit 钩子，自动调用 hooks-runner.js
 */

import fs from 'fs'
import path from 'path'

const gitHookPath = path.resolve('.git/hooks/pre-commit')
const runnerPath = path.resolve('src/framework/script/git/hooks-runner.js')

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

installHook()
