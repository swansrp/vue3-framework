#!/usr/bin/env node
/**
 * ESLint-only 代码优化脚本（Vue 兼容版）
 * 功能：
 *   ✅ 删除未使用 import/变量
 *   ✅ 排序 import
 *   ✅ 去掉分号
 *   ✅ 统一单引号
 *   ✅ 统一对象/解构空格
 *   ✅ Vue 自闭合标签 (<img /> 等)
 * 特点：
 *   ⚠️ Vue 模板 <template> 保留 {{ ... }} 空格、换行和空行
 * 用法：
 *   node optimize-eslint-vue.js [优化目录] [--staged]
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

import { ESLint } from 'eslint'

const gitattributesContent = `
# 强制所有文本文件使用 LF
* text eol=lf
*.js text eol=lf
*.ts text eol=lf
*.vue text eol=lf
*.json text eol=lf
*.md text eol=lf
*.yml text eol=lf
*.yaml text eol=lf
*.css text eol=lf
*.scss text eol=lf
*.html text eol=lf
*.java text eol=lf

# 二进制文件
*.png binary
*.jpg binary
*.jpeg binary
*.gif binary
*.ico binary
*.zip binary
*.tar binary
*.gz binary
*.ttf binary
*.woff binary
*.woff2 binary
*.svg binary
`

/**
 * 获取 Git staged 文件列表
 */
function getStagedFiles() {
    try {
        const output = execSync('git diff --cached --name-only --diff-filter=ACM').toString()
        return output
            .split('\n')
            .map(f => f.trim())
            .filter(f => f && /\.(js|ts|jsx|tsx|vue)$/.test(f))
    } catch (e) {
        console.warn('⚠️ 获取 staged 文件失败，格式化全部目录')
        return []
    }
}

async function eslintOptimize(targetFilesOrDir, rootDir, stagedOnly = false) {
    const eslint = new ESLint({
        fix: true,
        useEslintrc: false,
        baseConfig: {
            parser: 'vue-eslint-parser',
            parserOptions: {
                parser: '@typescript-eslint/parser',
                ecmaVersion: 2020,
                sourceType: 'module'
            },
            plugins: ['vue', 'unused-imports', 'import', '@typescript-eslint'],
            extends: ['plugin:vue/vue3-recommended'],
            rules: {
                'unused-imports/no-unused-imports': 'error',
                'unused-imports/no-unused-vars': [
                    'warn',
                    { vars: 'all', args: 'after-used', varsIgnorePattern: '^_', argsIgnorePattern: '^_' }
                ],
                'import/order': [
                    'warn',
                    {
                        groups: ['builtin', 'external', 'internal', ['parent', 'sibling'], 'index'],
                        'newlines-between': 'always',
                        alphabetize: { order: 'asc', caseInsensitive: true }
                    }
                ],
                quotes: ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
                semi: ['error', 'never'],
                'object-curly-spacing': ['error', 'always'],
                'vue/html-self-closing': [
                    'error',
                    { html: { void: 'always', normal: 'never', component: 'always' }, svg: 'always', math: 'always' }
                ],
                'no-console': 'warn',
                'no-debugger': 'warn'
            },
            ignorePatterns: ['src/framework/setup/**/*']
        },
        extensions: ['.js', '.ts', '.jsx', '.tsx', '.vue']
    })

    let targets = []

    if (stagedOnly) {
        targets = getStagedFiles()
        if (targets.length === 0) {
            console.log('⚡ 没有 staged 文件，跳过 ESLint')
            return
        }
        console.log(`🚀 ESLint 优化 staged 文件: ${targets.join(', ')}`)
    } else {
        targets = [`${targetFilesOrDir}/**/*.{js,ts,jsx,tsx,vue}`]
        console.log(`🚀 ESLint 优化目录: ${targetFilesOrDir}`)
    }

    const results = await eslint.lintFiles(targets)
    await ESLint.outputFixes(results)

    // 如果是 staged 模式，把修复的文件重新 add
    if (stagedOnly) {
        const fixedFilePaths = results.filter(r => r.output).map(r => r.filePath)
        if (fixedFilePaths.length > 0) {
            execSync(`git add ${fixedFilePaths.map(f => `"${f}"`).join(' ')}`)
            console.log(`✅ 已将 ESLint 修复文件加入 Git staged: ${fixedFilePaths.length} 个`)
        }
    }

    // 强制 LF 换行符
    for (const r of results) {
        if (r.output) {
            const filePath = path.resolve(r.filePath)
            try {
                let content = fs.readFileSync(filePath, 'utf8')
                content = content.replace(/\r\n/g, '\n')
                fs.writeFileSync(filePath, content, 'utf8')
            } catch (e) {
                console.warn(`⚠️ 无法处理文件: ${r.filePath}`, e.message)
            }
        }
    }

    // 根目录 .gitattributes
    const gitattributesPath = path.resolve(rootDir, '.gitattributes')
    if (!fs.existsSync(gitattributesPath)) {
        console.log('\n🚀 开始生成 Git 换行符策略 (.gitattributes)...')
        fs.writeFileSync(gitattributesPath, gitattributesContent, 'utf8')
        console.log('✅ 已生成 .gitattributes')
    }

    // 统计结果
    let removedImports = 0
    let removedVars = 0
    let fixedFiles = 0

    for (const r of results) {
        if (r.output) fixedFiles++
        for (const msg of r.messages) {
            if (msg.ruleId === 'unused-imports/no-unused-imports') removedImports++
            if (msg.ruleId === 'unused-imports/no-unused-vars')
            {
                console.log(`🔸 ${r.filePath}:${msg.line}:${msg.column} - ${msg.message}`)
                removedVars++
            }
        }
    }

    console.log(`\n✅ 代码优化完成！
🧹 修复文件数: ${fixedFiles}
📦 删除未使用 import: ${removedImports}
🔸 标记未使用变量: ${removedVars}
`)
}

async function main() {
    const args = process.argv.slice(2)
    const stagedOnly = args.includes('--staged')
    const inputDir = args.find(a => a !== '--staged')
    const rootDir = process.cwd()
    const targetDir = inputDir
        ? path.resolve(inputDir.replace(/^['"]|['"]$/g, ''))
        : path.resolve(rootDir, 'src')

    if (!stagedOnly && !fs.existsSync(targetDir)) {
        console.error(`❌ 目录不存在: ${targetDir}`)
        process.exit(1)
    }

    await eslintOptimize(targetDir, rootDir, stagedOnly)
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
