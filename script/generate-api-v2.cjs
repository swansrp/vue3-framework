const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// 加载环境配置
function loadEnvConfig() {
  const env = process.env.NODE_ENV || 'development';
  const envFile = path.resolve(__dirname, `../../../.env.${env}`);
  
  let envConfig = {};
  if (fs.existsSync(envFile)) {
    const envContent = fs.readFileSync(envFile, 'utf-8');
    envContent.split('\n').forEach(line => {
      if (line && !line.startsWith('//') && line.includes('=')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          envConfig[key.trim()] = valueParts.join('=').trim().replace(/['"]/g, '');
        }
      }
    });
  }
  
  const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../package.json'), 'utf-8'));
  
  return {
    baseURL: envConfig.VITE_baseURL,
    projectName: packageJson.name
  };
}

// 获取Swagger JSON
function fetchSwaggerJson(url) {
  return new Promise((resolve, reject) => {
    console.log(`正在获取: ${url}`);
    
    const client = url.startsWith('https:') ? https : http;
    
    const request = client.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        return;
      }

      let chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        try {
          // 拼成完整 Buffer
          const buffer = Buffer.concat(chunks);

          // 转字符串（UTF-8）
          let text = buffer.toString('utf-8');

          // 去掉 BOM 头（如果有）
          if (text.charCodeAt(0) === 0xFEFF) {
            text = text.slice(1);
          }

          resolve(JSON.parse(text));
        } catch (err) {
          reject(new Error(`解析JSON失败: ${err.message}`));
        }
      });
    });
    
    request.on('error', (err) => {
      reject(new Error(`网络错误: ${err.message}`));
    });
    
    request.setTimeout(10000, () => {
      request.destroy();
      reject(new Error('请求超时'));
    });
  });
}

// 工具函数
function toCamelCase(str) {
  return str.replace(/[-_]([a-z])/g, (_, letter) => letter.toUpperCase());
}

function sanitizeFunctionName(name) {
  let functionName = name.replace(/[^a-zA-Z0-9]/g, '');
  if (functionName.match(/^[0-9]/)) {
    functionName = 'api' + functionName;
  }
  return toCamelCase(functionName);
}

// 去除函数名中的Using前缀和方法后缀，并处理重复函数名
function cleanFunctionName(operationId, method, path, usedNames = new Set()) {
  let functionName;
  
  if (operationId) {
    // 移除 UsingGET, UsingPOST 等后缀
    functionName = operationId.replace(/Using(GET|POST|PUT|DELETE|PATCH)$/i, '');
    // 移除数字后缀 (如 UsingPOST1, UsingPOST2, loginUsingPOST1 等)
    functionName = functionName.replace(/Using(GET|POST|PUT|DELETE|PATCH)\d+$/i, '');
    // 移除只有数字的后缀 (如 login1, refresh2 等)
    functionName = functionName.replace(/\d+$/, '');
  } else {
    // 从路径生成函数名
    const pathParts = path.split('/').filter(part => part && !part.startsWith('{'));
    functionName = pathParts.join('_');
  }
  
  // 基础清理
  let cleanName = sanitizeFunctionName(functionName);
  
  // 如果清理后的名称为空或太短，使用路径生成
  if (!cleanName || cleanName.length < 2) {
    const pathParts = path.split('/').filter(part => part && !part.startsWith('{')).slice(-2); // 取后两段
    cleanName = sanitizeFunctionName(method + '_' + pathParts.join('_'));
  }
  
  // 处理重复函数名
  let finalName = cleanName;
  let counter = 1;
  while (usedNames.has(finalName)) {
    finalName = `${cleanName}${counter}`;
    counter++;
  }
  
  usedNames.add(finalName);
  return finalName;
}

// 清理URL路径，移除项目前缀
function cleanApiPath(path, projectName) {
  // 移除 /项目名/web 前缀
  const prefix = `/${projectName}/web`;
  if (path.startsWith(prefix)) {
    return path.substring(prefix.length);
  }
  
  // 移除 /项目名 前缀
  const simplePrefix = `/${projectName}`;
  if (path.startsWith(simplePrefix)) {
    return path.substring(simplePrefix.length);
  }
  
  return path;
}

// 从 Swagger JSON 的 tags 定义中获取 description
function getControllerNameFromTags(swaggerTags, operationTags) {
  if (!operationTags || operationTags.length === 0) return 'common';
  
  const tagName = operationTags[0];
  
  // 忽略以'系统'开头的API
  if (tagName.startsWith('系统')) {
    return null; // 返回null表示需要忽略
  }
  
  // 在 Swagger JSON 的 tags 定义中查找对应的 tag
  let tagDescription = tagName; // 默认使用 tag 名称
  
  if (swaggerTags && Array.isArray(swaggerTags)) {
    const foundTag = swaggerTags.find(tag => tag.name === tagName);
    if (foundTag && foundTag.description) {
      tagDescription = foundTag.description;
    }
  }
  
  // 处理英文词组和中英混合内容
  function processFileName(name) {
    // 首先处理英文词组，直接转换为驼峰格式
    if (/^[a-zA-Z\s]+$/.test(name)) {
      // 纯英文，转为驼峰格式
      return name
        .split(/\s+/) // 按空格分割
        .map((word, index) => {
          word = word.toLowerCase();
          // 第一个单词保持小写，其他单词首字母大写
          return index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join('');
    }
    
    return name
  }
  
  let result = processFileName(tagDescription);
  
  // 如果处理后还是包含中文，使用tag作为后备
  if (/[\u4e00-\u9fa5]/.test(result)) {
    result = processFileName(tagName) || 'api';
  }
  
  // 最终清理和格式化
  return result
    .replace(/[\s\-\.\-\/\(\)\（\）\【\】\[\]]/g, '') // 移除特殊字符
    .replace(/[^a-zA-Z0-9]/g, '') // 只保留英文和数字
    .replace(/^[0-9]/, 'api$&') // 数字开头添加前缀
    .replace(/^[A-Z]/, (match) => match.toLowerCase()) // 首字母小写
    || 'common';
}

// 生成API函数
function generateApiFunction(path, method, operation, envConfig, usedNames) {
  // 生成函数名（去除Using后缀）
  const functionName = cleanFunctionName(operation.operationId, method, path, usedNames);
  
  const httpMethod = method.toUpperCase();
  const summary = operation.summary || '';
  
  // 清理API路径（移除项目前缀）
  const cleanPath = cleanApiPath(path, envConfig.projectName);
  
  // 检测参数类型
  const pathParams = (cleanPath.match(/{([^}]+)}/g) || []).map(p => p.slice(1, -1));
  const queryParams = (operation.parameters || []).filter(p => p.in === 'query');
  const hasRequestBody = !!operation.requestBody;
  
  // 构建参数列表
  let params = [];
  
  // 路径参数
  pathParams.forEach(param => {
    params.push(`${param}: string | number`);
  });
  
  // 查询参数
  if (queryParams.length > 0) {
    params.push('params?: object');
  }
  
  // 请求体
  if (hasRequestBody) {
    params.push('data?: any');
  }
  
  // 默认参数
  params.push('showSuccess = false', 'showLoading = true');
  
  // 构建路径
  let apiPath = cleanPath;
  pathParams.forEach(param => {
    apiPath = apiPath.replace(`{${param}}`, `\${${param}}`);
  });
  
  // 生成函数代码
  let code = `/**\n * ${summary}\n */\n`;
  code += `export const ${functionName} = (${params.join(', ')}) => {\n`;
  
  const builderFunc = httpMethod === 'GET' ? 'buildGetApiByType' : 'buildPostApiByType';
  code += `  const api = ${builderFunc}('${apiPath}', '');\n`;
  
  if (queryParams.length > 0 && hasRequestBody) {
    code += `  return request(api, params || {}, data || {}, showSuccess, showLoading);\n`;
  } else if (queryParams.length > 0) {
    code += `  return request(api, params || {}, {}, showSuccess, showLoading);\n`;
  } else if (hasRequestBody) {
    code += `  return request(api, {}, data || {}, showSuccess, showLoading);\n`;
  } else {
    code += `  return request(api, {}, {}, showSuccess, showLoading);\n`;
  }
  
  code += '};\n\n';
  
  return code;
}

// 生成按operation的tag description分组的API文件
function generateApiByController(swaggerData, envConfig) {
  const { paths, tags: swaggerTags, info } = swaggerData;
  const controllerGroups = {};
  let ignoredCount = 0;
  
  console.log('\n📝 Swagger Tags 定义:');
  if (swaggerTags && Array.isArray(swaggerTags)) {
    swaggerTags.forEach(tag => {
      console.log(`  - ${tag.name}: ${tag.description || '无描述'}`);
    });
  } else {
    console.log('  - 未找到 tags 定义');
  }
  console.log('');
  
  // 按每个operation的tag description分组，每个operation一个文件
  Object.keys(paths).forEach(pathKey => {
    const pathObj = paths[pathKey];
    Object.keys(pathObj).forEach(method => {
      const operation = pathObj[method];
      
      // 忽略某些方法
      if (['options', 'head'].includes(method.toLowerCase())) {
        return;
      }
      
      // 使用新的函数，从 tags 定义中获取 description
      const controllerName = getControllerNameFromTags(swaggerTags, operation.tags);
      
      // 如果controllerName为null，说明是以'系统'开头的API，需要忽略
      if (controllerName === null) {
        ignoredCount++;
        return;
      }
      
      // 每个operation创建一个独立的文件组
      const uniqueKey = `${controllerName}_${method}_${pathKey.replace(/[^a-zA-Z0-9]/g, '_')}`;
      
      if (!controllerGroups[controllerName]) {
        // 找到对应的 tag description
        let tagDescription = '';
        if (swaggerTags && Array.isArray(swaggerTags) && operation.tags && operation.tags.length > 0) {
          const foundTag = swaggerTags.find(tag => tag.name === operation.tags[0]);
          tagDescription = foundTag ? (foundTag.description || foundTag.name) : operation.tags[0];
        } else {
          tagDescription = operation.tags ? operation.tags[0] : 'common';
        }
        
        controllerGroups[controllerName] = {
          tag: operation.tags ? operation.tags[0] : 'common',
          tagDescription: tagDescription,
          summary: operation.summary || '',
          description: operation.description || '',
          functions: [],
          usedNames: new Set() // 用于跟踪已使用的函数名
        };
      }
      
      const apiFunction = generateApiFunction(pathKey, method, operation, envConfig, controllerGroups[controllerName].usedNames);
      controllerGroups[controllerName].functions.push(apiFunction);
    });
  });
  
  return { controllerGroups, ignoredCount };
}

// 生成单个文件内容（按tag description分组）
function generateControllerFile(controllerName, controllerData, envConfig) {
  let content = `// ==================== ${controllerData.tagDescription || controllerData.tag} API ====================\n`;
  content += `// 生成时间: ${new Date().toLocaleString()}\n`;
  content += `// 项目: ${envConfig.projectName}\n`;
  content += `// 文件: ${controllerName}.ts\n`;
  content += `// Tag: ${controllerData.tag}\n`;
  if (controllerData.tagDescription && controllerData.tagDescription !== controllerData.tag) {
    content += `// Tag Description: ${controllerData.tagDescription}\n`;
  }
  content += `// ============================================================\n\n`;
  
  // 导入语句
  content += `import { request } from '@/framework/network/request';\n`;
  content += `import { buildGetApiByType, buildPostApiByType } from '@/framework/apis';\n\n`;
  
  // API函数
  content += controllerData.functions.join('');
  
  return content;
}

// 生成索引文件
function generateIndexFile(controllerGroups) {
  let content = `// ==================== 自动生成的API导出 ====================\n`;
  content += `// 生成时间: ${new Date().toLocaleString()}\n`;
  content += `// 位置: src/apis/\n`;
  content += `// 说明: 每个API操作按其tag description单独生成文件\n`;
  content += `// ============================================================\n\n`;
  
  Object.keys(controllerGroups).forEach(controllerName => {
    const controllerData = controllerGroups[controllerName];
    const description = controllerData.tagDescription || controllerData.tag || '无描述';
    content += `// ${description}\n`;
    content += `export * from './${controllerName}';\n\n`;
  });
  
  return content;
}

// 主函数
async function main() {
  try {
    console.log('🚀 开始生成API...\n');
    
    const envConfig = loadEnvConfig();
    
    console.log('📋 配置信息:');
    console.log(`  - 项目名称: ${envConfig.projectName}`);
    console.log(`  - 基础URL: ${envConfig.baseURL}\n`);
    
    const swaggerJsonUrl = `${envConfig.baseURL}/${envConfig.projectName}/v3/api-docs`;
    console.log(`📡 获取Swagger JSON: ${swaggerJsonUrl}`);

    // 获取Swagger数据
    const swaggerData = await fetchSwaggerJson(swaggerJsonUrl);
    console.log('✓ 成功获取Swagger JSON');
    
    const pathCount = Object.keys(swaggerData.paths || {}).length;
    console.log(`  - 发现 ${pathCount} 个API端点\n`);
    
    // 按每个API operation的tag description生成API
    const { controllerGroups, ignoredCount } = generateApiByController(swaggerData, envConfig);
    const controllerCount = Object.keys(controllerGroups).length;
    console.log(`📁 按Tag Description分文件: ${controllerCount} 个文件`);
    console.log(`ℹ️  忽略以'系统'开头的API: ${ignoredCount} 个\n`);
    
    // 确保输出目录存在 - 修改为src/apis
    const outputDir = path.resolve(__dirname, '../../../src/apis');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 清理旧文件（除了examples.ts）
    const existingFiles = fs.readdirSync(outputDir);
    existingFiles.forEach(file => {
      if (file !== 'examples.ts' && file.endsWith('.ts')) {
        fs.unlinkSync(path.join(outputDir, file));
      }
    });
    
    // 生成每个文件（按tag description分组）
    let totalFunctions = 0;
    Object.keys(controllerGroups).forEach(controllerName => {
      const controllerData = controllerGroups[controllerName];
      const fileContent = generateControllerFile(controllerName, controllerData, envConfig);
      
      const outputFile = path.join(outputDir, `${controllerName}.ts`);
      fs.writeFileSync(outputFile, fileContent, 'utf-8');
      
      const description = controllerData.tagDescription || controllerData.tag || '无描述';
      console.log(`✓ 生成 ${controllerName}.ts (${controllerData.functions.length} 个API) - ${description}`);
      totalFunctions += controllerData.functions.length;
    });
    
    // 生成索引文件
    const indexContent = generateIndexFile(controllerGroups);
    const indexFile = path.join(outputDir, 'index.ts');
    fs.writeFileSync(indexFile, indexContent, 'utf-8');
    console.log(`✓ 生成 index.ts`);
    
    // 输出统计信息
    console.log('\n📊 生成统计:');
    console.log(`  - 按Tag Description分文件: ${controllerCount} 个`);
    console.log(`  - API函数总数: ${totalFunctions} 个`);
    console.log(`  - 忽略的API: ${ignoredCount} 个 (以'系统'开头)`);
    console.log(`  - 平均每个文件: ${Math.round(totalFunctions / controllerCount)} 个API`);
    
    // 输出使用说明
    console.log('\n🎉 API生成完成！');
    console.log('\n📖 使用方式:');
    console.log('  import { functionName } from "@/apis";');
    console.log('\n💡 改进内容:');
    console.log('  1. ✅ 移除了函数名中的UsingGET/UsingPOST后缀');
    console.log('  2. ✅ 清理了API路径，移除了项目前缀');
    console.log('  3. ✅ 按每个API的Tag Description分别生成文件');
    console.log('  4. ✅ 忽略了以\'系统\'开头的API');
    console.log('  5. ✅ 文件生成在src/apis/目录下');
    console.log('  6. ✅ 使用英文驼峰命名，避免中文文件名问题');
    console.log('  7. ✅ 从 Swagger JSON 的 tags 定义中获取 description 生成文件名');
    
  } catch (error) {
    console.error('\n❌ 生成失败:', error.message);
    console.error('\n🔍 请检查:');
    console.error('  1. 后端服务是否正常运行');
    console.error('  2. Swagger JSON地址是否可访问'); 
    console.error('  3. 网络连接是否正常');
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 如果后端服务未启动，这是正常的。请启动后端服务后重试。');
    }
    
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { main, loadEnvConfig };