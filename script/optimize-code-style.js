#!/usr/bin/env node
/**
 * ESLint-only 代码优化脚本（Vue 兼容版）
 * 功能：
 *   ✅ 删除未使用 import
 *   ✅ 删除未使用变量
 *   ✅ 排序 import
 *   ✅ 去掉分号
 *   ✅ 统一单引号
 *   ✅ 统一对象/解构空格
 *   ✅ Vue 自闭合标签 (<img /> 等)
 * 特点：
 *   ⚠️ Vue 模板 <template> 保留 {{ ... }} 空格、换行和空行
 * 用法：
 *   node optimize-eslint-vue.js [根目录]
 */

import fs from 'fs'
import path from 'path'

import { ESLint } from 'eslint'

async function eslintOptimize(targetDir) {
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

                // ✅ Vue 模板自闭合规范
                'vue/html-self-closing': [
                    'error',
                    {
                        html: {
                            void: 'always',
                            normal: 'never',
                            component: 'always'
                        },
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

    // ✅ 新增：强制 LF 换行符
    for (const r of results) {
        if (r.output) {
            const filePath = path.resolve(r.filePath)
            try {
                let content = fs.readFileSync(filePath, 'utf8')
                // 统一换行符
                content = content.replace(/\r\n/g, '\n')
                fs.writeFileSync(filePath, content, 'utf8')
            } catch (e) {
                console.warn(`⚠️ 无法处理文件: ${r.filePath}`, e.message)
            }
        }
    }

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
    const targetDir = inputDir ? path.resolve(inputDir.replace(/^['"]|['"]$/g, '')) : path.resolve('src')

    if (!fs.existsSync(targetDir)) {
        console.error(`❌ 目录不存在: ${targetDir}`)
        process.exit(1)
    }

    await eslintOptimize(targetDir)
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
