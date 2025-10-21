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
 *   node optimize-eslint-vue.js [优化目录]
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

import { ESLint } from 'eslint'
const gitattributesContent = `
# 强制所有文本文件使用 LF
# ========== 基础文本配置 ==========
# 所有文本文件强制使用 LF 换行符
* text eol=lf

# 常见源码文件显式标注（可防止特殊 IDE 自动转 CRLF）
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

# ========== 二进制文件配置 ==========
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
async function eslintOptimize(targetDir, rootDir) {
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
                // 删除未使用 import/变量
                'unused-imports/no-unused-imports': 'error',
                'unused-imports/no-unused-vars': [
                    'warn',
                    {
                        vars: 'all',
                        args: 'after-used',
                        varsIgnorePattern: '^_',
                        argsIgnorePattern: '^_'
                    }
                ],

                // import 排序
                'import/order': [
                    'warn',
                    {
                        groups: ['builtin', 'external', 'internal', ['parent', 'sibling'], 'index'],
                        'newlines-between': 'always',
                        alphabetize: { order: 'asc', caseInsensitive: true }
                    }
                ],

                // 单引号 & 去掉分号
                quotes: ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
                semi: ['error', 'never'],

                // 对象/解构空格
                'object-curly-spacing': ['error', 'always'],

                // Vue 模板自闭合规范
                'vue/html-self-closing': [
                    'error',
                    {
                        html: { void: 'always', normal: 'never', component: 'always' },
                        svg: 'always',
                        math: 'always'
                    }
                ],
                'no-console': 'warn',
                'no-debugger': 'warn'
            }
        },
        extensions: ['.js', '.ts', '.jsx', '.tsx', '.vue']
    })

    console.log(`🚀 ESLint 优化中: ${targetDir}`)
    const results = await eslint.lintFiles([`${targetDir}/**/*.{js,ts,jsx,tsx,vue}`])
    await ESLint.outputFixes(results)

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

    // 安全同步到 Git
    try {
        console.log('\n🚀 同步 .gitattributes 到 Git')
        execSync('git add .gitattributes', { stdio: 'inherit' })
        execSync('git add --renormalize .', { stdio: 'inherit' })
        console.log('✅ Git 换行符策略同步完成\n')
    } catch (e) {
        console.warn('⚠️ Git 同步失败，请检查 Git 状态', e.message)
    }

    // 统计结果
    let removedImports = 0
    let removedVars = 0
    let fixedFiles = 0

    for (const r of results) {
        if (r.output) fixedFiles++
        for (const msg of r.messages) {
            if (msg.ruleId === 'unused-imports/no-unused-imports') removedImports++
            if (msg.ruleId === 'unused-imports/no-unused-vars') removedVars++
        }
    }

    console.log(`\n✅ 代码优化完成！
🧹 修复文件数: ${fixedFiles}
📦 删除未使用 import: ${removedImports}
🔸 标记未使用变量: ${removedVars}
`)
}

async function main() {
    const inputDir = process.argv[2]
    const rootDir = process.cwd() // 项目根目录
    const targetDir = inputDir
        ? path.resolve(inputDir.replace(/^['"]|['"]$/g, ''))
        : path.resolve(rootDir, 'src')

    if (!fs.existsSync(targetDir)) {
        console.error(`❌ 目录不存在: ${targetDir}`)
        process.exit(1)
    }

    await eslintOptimize(targetDir, rootDir)
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
