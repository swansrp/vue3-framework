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
 * 特点：
 *   ⚠️ Vue 模板 <template> 保留 {{ ... }} 空格、换行和空行
 * 用法：
 *   node optimize-eslint-vue.js [根目录]
 */

import fs from 'fs'
import path from 'path'

import { ESLint } from 'eslint'

const IGNORE_DIRS = ['node_modules', 'dist', 'build', 'public', 'coverage']

async function eslintOptimize(targetDir) {
  const eslint = new ESLint({
    fix: true,
    useEslintrc: false,
    baseConfig: {
      parser: 'vue-eslint-parser', // 解析 .vue 文件
      parserOptions: {
        parser: '@typescript-eslint/parser', // 解析 <script lang="ts">
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
        'object-curly-spacing': ['error', 'always']
      }
    },
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.vue']
  })

  console.log(`🚀 ESLint 优化中: ${targetDir}`)
  const results = await eslint.lintFiles([`${targetDir}/**/*.{js,ts,jsx,tsx,vue}`])
  await ESLint.outputFixes(results)

  let removedImports = 0
  let removedVars = 0
  for (const r of results) {
    for (const msg of r.messages) {
      if (msg.ruleId === 'unused-imports/no-unused-imports') removedImports++
      if (msg.ruleId === 'unused-imports/no-unused-vars') removedVars++
    }
  }
  return { removedImports, removedVars }
}

// 递归扫描文件
function getFiles(dir, exts) {
  const result = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.includes(entry.name)) continue
      result.push(...getFiles(full, exts))
    } else if (exts.some((e) => full.endsWith(e))) {
      result.push(full)
    }
  }
  return result
}

async function main() {
  // 支持命令行传入根目录，默认 src
  const inputDir = process.argv[2]
  const targetDir = inputDir ? path.resolve(inputDir.replace(/^['"]|['"]$/g, '')) : path.resolve('src')

  if (!fs.existsSync(targetDir)) {
    console.error(`❌ 目录不存在: ${targetDir}`)
    process.exit(1)
  }

  const { removedImports, removedVars } = await eslintOptimize(targetDir)

  console.log(`
✅ 代码优化完成！
`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
