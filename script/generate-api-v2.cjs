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

// 专门处理基于路径生成的函数名
function generatePathBasedFunctionName(method, path) {
  const pathParts = path.split('/').filter(part => part && !part.startsWith('{')).slice(-2);
  const baseName = method + '_' + pathParts.join('_');
  return sanitizeFunctionName(baseName);
}

// 去除函数名中的Using前缀和方法后缀，并处理重复函数名
function cleanFunctionName(operationId, method, path, usedNames = new Set()) {
  let functionName;
  
  if (operationId) {
    functionName = operationId;
    
    // 移除所有 Using 相关的后缀（包括数字后缀）
    // 匹配模式：UsingPOST_10, UsingPOST1, UsingPOST 等
    functionName = functionName.replace(/Using(GET|POST|PUT|DELETE|PATCH)[_\d]*$/i, '');
    
    // 移除末尾的下划线和数字 (如 replace_, replace_10 等)
    functionName = functionName.replace(/[_\d]+$/, '');
    
    // 添加调试信息（开发阶段可以启用）
    // if (operationId !== functionName) {
    //   console.log(`  清理函数名: ${operationId} -> ${functionName}`);
    // }
  } else {
    // 从路径生成函数名
    const pathParts = path.split('/').filter(part => part && !part.startsWith('{'));
    functionName = pathParts.join('_');
  }
  
  // 基础清理 - 保持驼峰命名
  let cleanName = functionName;
  
  // 只处理特殊字符，保持已有的驼峰命名
  cleanName = cleanName.replace(/[^a-zA-Z0-9]/g, '');
  
  // 确保首字母小写
  if (cleanName && cleanName.length > 0) {
    cleanName = cleanName.charAt(0).toLowerCase() + cleanName.slice(1);
  }
  
  // 处理 JavaScript 保留关键字
  const reservedKeywords = [
    'delete', 'export', 'import', 'return', 'function', 'var', 'let', 'const',
    'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
    'try', 'catch', 'finally', 'throw', 'new', 'this', 'super', 'class',
    'extends', 'static', 'async', 'await', 'yield', 'default', 'null',
    'undefined', 'true', 'false', 'typeof', 'instanceof', 'in', 'of'
  ];
  
  if (reservedKeywords.includes(cleanName.toLowerCase())) {
    cleanName = cleanName + 'Item'; // 添加 Item 后缀避免关键字冲突
  }
  
  // 如果数字开头，添加前缀
  if (cleanName && cleanName.match(/^[0-9]/)) {
    cleanName = 'api' + cleanName;
  }
  
  // 如果清理后的名称为空或太短，使用路径生成
  if (!cleanName || cleanName.length < 2) {
    cleanName = generatePathBasedFunctionName(method, path);
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

// 根据控制器名称生成业务前缀
function getControllerPrefix(controllerName, tagDescription) {
  // 定义业务前缀映射
  const prefixMap = {
    'evaluationPortalController': 'evaluation',
    'examPortalController': 'exam', 
    'examRefereePortalController': 'examReferee',
    'examRoomPortalController': 'examRoom',
    'examTesterPortalController': 'examTester',
    'examEvaluationBindController': 'examEvaluation',
    'examRoomRefereeBindController': 'roomReferee',
    'examRoomTesterBindController': 'roomTester'
  };
  
  // 如果有预定义的前缀，使用预定义的
  if (prefixMap[controllerName]) {
    return prefixMap[controllerName];
  }
  
  // 否则基于控制器名称生成前缀
  return controllerName
    .replace(/PortalController|BindController|Controller$/i, '')
    .replace(/([A-Z])/g, (match, p1, offset) => offset > 0 ? p1 : p1.toLowerCase())
    .replace(/^./, str => str.toLowerCase());
}

// 根据API路径生成有意义的后缀
function generatePathSuffix(path, summary) {
  // 清理路径，提取关键信息
  const cleanPath = path.replace(/^.*?\//, ''); // 移除前缀
  
  // 定义路径模式到后缀的映射
  const pathSuffixMap = {
    // 绑定相关
    '/bind/advanced/query': 'Advanced',
    '/bind/attach/query': 'Attach', 
    '/bind/query': 'Query',
    '/bind/list': 'List',
    '/bind/batch': 'Batch',
    '/bind/all': 'All',
    '/bind/info': 'Info',
    '/bind/info/list': 'InfoList',
    '/advanced/replace': 'Advanced',
    '/attach/advanced/query': 'AttachAdvanced',
    
    // 解绑相关
    '/unbind/advanced/query': 'Advanced',
    '/unbind/query': 'Query', 
    '/unbind/batch': 'Batch',
    '/unbind/all': 'All',
    
    // 通用查询相关
    '/advanced/count': 'Advanced',
    '/advanced/query': 'Advanced',
    '/advanced/select': 'Advanced', 
    '/advanced/statistic': 'Advanced',
    '/advanced/summary': 'Advanced',
    '/advanced/query/export': 'AdvancedExport',
    '/general/count': 'General',
    '/general/query': 'General',
    '/general/select': 'General',
    '/general/statistic': 'General', 
    '/general/summary': 'General',
    
    // 导入相关
    '/import/add': 'Import',
    '/import/add/progress': 'ImportProgress',
    '/import/update': 'ImportUpdate',
    '/import/update/progress': 'ImportUpdateProgress',
    
    // 其他
    '/delete/list': 'List',
    '/template/export': 'Template',
    '/update/list': 'List'
  };
  
  // 尝试匹配路径后缀
  for (const [pathPattern, suffix] of Object.entries(pathSuffixMap)) {
    if (cleanPath.endsWith(pathPattern)) {
      return suffix;
    }
  }
  
  // 如果没有匹配到，尝试从摘要中提取关键词
  if (summary) {
    if (summary.includes('列表') || summary.includes('list')) return 'List';
    if (summary.includes('批量') || summary.includes('batch')) return 'Batch';
    if (summary.includes('高级') || summary.includes('advanced')) return 'Advanced';
    if (summary.includes('通用') || summary.includes('general')) return 'General';
    if (summary.includes('导入') || summary.includes('import')) return 'Import';
    if (summary.includes('模版') || summary.includes('template')) return 'Template';
    if (summary.includes('进度') || summary.includes('progress')) return 'Progress';
    if (summary.includes('信息') || summary.includes('info')) return 'Info';
  }
  
  // 最后尝试从路径末尾提取关键词
  const pathParts = cleanPath.split('/').filter(part => part && !part.match(/^{.*}$/));
  if (pathParts.length > 0) {
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart && lastPart !== 'query' && lastPart !== 'delete' && lastPart !== 'update') {
      return lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
    }
  }
  
  return ''; // 如果都没有匹配到，返回空字符串
}

// 生成API函数
function generateApiFunction(path, method, operation, envConfig, usedNames, controllerPrefix = '') {
  // 生成函数名（去除Using后缀）
  let baseFunctionName = cleanFunctionName(operation.operationId, method, path, new Set()); // 先生成基础函数名
  
  // 为通用接口添加控制器前缀，避免命名冲突
  const commonApiPatterns = [
    'advancedCount', 'advancedQuery', 'advancedQueryExport', 'advancedSelect', 
    'advancedStatistic', 'advancedSummary', 'deleteItem', 'deleteList',
    'generalCount', 'generalQuery', 'generalSelect', 'generalStatistic', 
    'generalSummary', 'queryById', 'importAdd', 'importAddProgress',
    'importUpdate', 'importUpdateProgress', 'add', 'templateExport', 
    'update', 'bind', 'unbind', 'replace', 'getAttach', 'getBind', 
    'getUnBind', 'bindAll', 'unbindAll', 'bindInfo', 'bindInfoList', 'getBindList'
  ];
  
  // 检查是否为通用接口，如果是则添加前缀
  let functionName = baseFunctionName;
  if (commonApiPatterns.some(pattern => baseFunctionName.toLowerCase().startsWith(pattern.toLowerCase()) || baseFunctionName === pattern)) {
    functionName = controllerPrefix + baseFunctionName.charAt(0).toUpperCase() + baseFunctionName.slice(1);
  }
  
  // 改进的重复函数名处理 - 基于API路径生成更有意义的后缀
  let finalName = functionName;
  if (usedNames.has(finalName)) {
    // 根据API路径生成有意义的后缀
    const pathSuffix = generatePathSuffix(path, operation.summary || '');
    if (pathSuffix) {
      finalName = functionName + pathSuffix;
    }
    
    // 如果还是重复，则使用数字后缀
    let counter = 1;
    while (usedNames.has(finalName)) {
      if (pathSuffix) {
        finalName = `${functionName}${pathSuffix}${counter}`;
      } else {
        finalName = `${functionName}${counter}`;
      }
      counter++;
    }
  }
  
  usedNames.add(finalName);
  
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
  params.push('showSuccess = true', 'showLoading = false');
  
  // 构建路径
  let apiPath = cleanPath;
  pathParams.forEach(param => {
    apiPath = apiPath.replace(`{${param}}`, `\${${param}}`);
  });
  
  // 生成函数代码
  let code = `/**\n * ${summary}\n */\n`;
  code += `export const ${finalName} = (${params.join(', ')}) => {\n`;
  
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
          usedNames: new Set(), // 用于跟踪已使用的函数名
          controllerPrefix: getControllerPrefix(controllerName, tagDescription) // 添加控制器前缀
        };
      }
      
      const apiFunction = generateApiFunction(pathKey, method, operation, envConfig, controllerGroups[controllerName].usedNames, controllerGroups[controllerName].controllerPrefix);
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