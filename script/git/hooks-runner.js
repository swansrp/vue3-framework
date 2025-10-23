#!/usr/bin/env node
/**
 * pre-commit hooks runner
 * 手动列出要执行的命令，支持单独添加参数
 */

import { execSync } from 'child_process'

/**
 * 定义要执行的 pre-commit 命令列表
 * 每个元素是一个对象：
 *   cmd: 要执行的命令
 *   desc: 命令描述（可选）
 */
const hooks = [
    { cmd: 'npm run optimize --staged', desc: 'ESLint staged 文件格式化' },
    // { cmd: 'node scripts/hooks/test-pre-commit.js --option', desc: '示例测试脚本' },
]

function runHooks() {
    if (hooks.length === 0) {
        console.log('⚡ 没有 pre-commit 命令，跳过')
        return
    }

    for (const hook of hooks) {
        console.log(`🚀 执行 pre-commit: ${hook.desc || hook.cmd}`)
        try {
            execSync(hook.cmd, { stdio: 'inherit' })
        } catch (err) {
            console.error(`❌ 命令失败: ${hook.cmd}`)
            process.exit(1) // 阻止提交
        }
    }

    console.log('✅ 所有 pre-commit 命令执行成功')
}

runHooks()
