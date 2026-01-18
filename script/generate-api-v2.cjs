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
  // 基于控制器名称生成前缀
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

// 转换Swagger类型到TypeScript类型
function swaggerTypeToTSType(swaggerType, format) {
  switch (swaggerType) {
    case 'integer':
    case 'number':
      return 'number';
    case 'string':
      if (format === 'date' || format === 'date-time') {
        return 'string'; // 可以改为 Date 如果需要
      }
      return 'string';
    case 'boolean':
      return 'boolean';
    case 'array':
      return 'array';
    case 'object':
      return 'object';
    default:
      return 'any';
  }
}

// 处理schema名称，正确转换泛型表示
function processSchemaName(schemaName) {
  // 处理 Page«Type» 或 Page<Type> 格式
  const genericMatch = schemaName.match(/^([A-Za-z]+)[«<]([A-Za-z0-9]+)[»>]$/);
  if (genericMatch) {
    const [, containerType, itemType] = genericMatch;
    return {
      name: `${containerType}${itemType}`,
      isGeneric: true,
      containerType,
      itemType,
      originalName: schemaName
    };
  }
  
  // 普通类型名称清理
  const cleanName = schemaName
    .replace(/[^a-zA-Z0-9_]/g, '') // 移除特殊字符但保持基本结构
    .replace(/^[0-9]/, 'T$&'); // 如果以数字开头，添加T前缀
  
  return {
    name: cleanName,
    isGeneric: false,
    originalName: schemaName
  };
}

// 为了向后兼容，保留原函数名
function cleanSchemaName(schemaName) {
  return processSchemaName(schemaName).name;
}

// 解析Swagger schema到TypeScript接口
function parseSchemaToInterface(schemaName, schema, allSchemas, processedSchemas = new Set()) {
  // 处理schema名称
  const schemaInfo = processSchemaName(schemaName);
  const cleanedSchemaName = schemaInfo.name;
  
  if (processedSchemas.has(cleanedSchemaName)) {
    return '';
  }
  processedSchemas.add(cleanedSchemaName);
  
  // 如果是泛型类型，生成特殊的接口定义
  if (schemaInfo.isGeneric && schemaInfo.containerType === 'Page') {
    const itemType = cleanSchemaName(schemaInfo.itemType);
    let interfaceCode = `/**
 * 分页响应类型 - 原始类型: ${schemaInfo.originalName}
 * @description 这个接口描述了分页响应的结构，其中 records 字段包含 ${schemaInfo.itemType} 类型的数组
 */
`;
    interfaceCode += `export interface ${cleanedSchemaName} {\n`;
    interfaceCode += `  countId?: string\n`;
    interfaceCode += `  current?: number\n`;
    interfaceCode += `  maxLimit?: number\n`;
    interfaceCode += `  optimizeCountSql?: boolean\n`;
    interfaceCode += `  orders?: OrderItem[]\n`;
    interfaceCode += `  pages?: number\n`;
    interfaceCode += `  /** 分页数据列表 - 包含 ${schemaInfo.itemType} 类型的数组 */\n`;
    interfaceCode += `  records?: ${itemType}[]\n`;
    interfaceCode += `  searchCount?: boolean\n`;
    interfaceCode += `  size?: number\n`;
    interfaceCode += `  total?: number\n`;
    interfaceCode += '}\n\n';
    
    // 确保 OrderItem 类型被包含
    if (!processedSchemas.has('OrderItem')) {
      interfaceCode += `export interface OrderItem {\n`;
      interfaceCode += `  asc?: boolean\n`;
      interfaceCode += `  column?: string\n`;
      interfaceCode += '}\n\n';
      processedSchemas.add('OrderItem');
    }
    
    return interfaceCode;
  }
  
  // 普通接口处理
  let interfaceCode = `export interface ${cleanedSchemaName} {\n`;
  
  if (schema.properties) {
    Object.keys(schema.properties).forEach(propName => {
      const prop = schema.properties[propName];
      const isRequired = schema.required && schema.required.includes(propName);
      const optional = isRequired ? '' : '?';
      
      // 添加描述注释
      if (prop.description) {
        interfaceCode += `  /** ${prop.description} */\n`;
      }
      
      // 为relation字段添加详细说明
      if (propName === 'relation' && cleanedSchemaName.includes('AdvancedQuery')) {
        interfaceCode += `  /**\n`;
        interfaceCode += `   * 查询关系类型\n`;
        interfaceCode += `   * @description 定义查询条件的关系类型，对应FILTER_TYPE枚举\n`;
        interfaceCode += `   * - 1: EQUAL (等于)\n`;
        interfaceCode += `   * - 2: NOT_EQUAL (不等于)\n`;
        interfaceCode += `   * - 3: GREATER (大于)\n`;
        interfaceCode += `   * - 4: GREATER_EQUAL (大于等于)\n`;
        interfaceCode += `   * - 5: LESS (小于)\n`;
        interfaceCode += `   * - 6: LESS_EQUAL (小于等于)\n`;
        interfaceCode += `   * - 7: NULL (为空)\n`;
        interfaceCode += `   * - 8: NOT_NULL (不为空)\n`;
        interfaceCode += `   * - 9: LIKE (模糊匹配)\n`;
        interfaceCode += `   * - 10: NOT_LIKE (不匹配)\n`;
        interfaceCode += `   * - 11: IN (包含于)\n`;
        interfaceCode += `   * - 12: NOT_IN (不包含于)\n`;
        interfaceCode += `   * - 13: BETWEEN (区间)\n`;
        interfaceCode += `   * - 14: NOT_BETWEEN (不在区间)\n`;
        interfaceCode += `   * - 15: CONTAIN (包含)\n`;
        interfaceCode += `   * - 16: CONTAIN_IN_OR (包含其中之一)\n`;
        interfaceCode += `   * - 17: CONTAIN_IN_AND (包含全部)\n`;
        interfaceCode += `   * - 99: SELECT_APPLY (特殊应用查询)\n`;
        interfaceCode += `   */\n`;
      }
      
      let propType = 'any';
      
      if (prop.$ref) {
        // 引用其他类型
        const refTypeName = prop.$ref.split('/').pop();
        propType = cleanSchemaName(refTypeName);
      } else if (prop.type === 'array') {
        if (prop.items && prop.items.$ref) {
          const itemType = prop.items.$ref.split('/').pop();
          const cleanedItemType = cleanSchemaName(itemType);
          propType = `${cleanedItemType}[]`;
        } else if (prop.items && prop.items.type) {
          const itemType = swaggerTypeToTSType(prop.items.type, prop.items.format);
          // 当数组元素是 object 类型时，使用 Array<any> 避免 TS 错误
          if (itemType === 'object') {
            propType = 'Array<any>';
          } else {
            propType = `${itemType}[]`;
          }
        } else {
          propType = 'Array<any>';
        }
      } else if (prop.type) {
        propType = swaggerTypeToTSType(prop.type, prop.format);
      }
      
      interfaceCode += `  ${propName}${optional}: ${propType}\n`;
    });
  }
  
  interfaceCode += '}\n\n';
  
  return interfaceCode;
}

// 从 Swagger 定义中提取类型信息
function extractTypeInfo(operation, controllerName, allSchemas) {
  const typeInfo = {
    requestTypes: [],
    responseTypes: [],
    relatedTypes: [],
    usedSchemas: new Set() // 记录使用的schema
  };
  
  // 提取请求体类型
  if (operation.requestBody && operation.requestBody.content) {
    const content = operation.requestBody.content;
    Object.keys(content).forEach(mediaType => {
      const schema = content[mediaType].schema;
      extractSchemaTypes(schema, typeInfo, 'request');
    });
  }
  
  // 提取响应类型
  if (operation.responses) {
    Object.keys(operation.responses).forEach(statusCode => {
      if (statusCode === '200' || statusCode === '201') { // 只处理成功响应
        const response = operation.responses[statusCode];
        if (response.content) {
          Object.keys(response.content).forEach(mediaType => {
            const schema = response.content[mediaType].schema;
            extractSchemaTypes(schema, typeInfo, 'response');
          });
        }
      }
    });
  }
  
  // 提取参数类型
  if (operation.parameters) {
    operation.parameters.forEach(param => {
      if (param.schema) {
        extractSchemaTypes(param.schema, typeInfo, 'related');
      }
    });
  }
  
  return typeInfo;
}

// 递归提取schema中的类型
function extractSchemaTypes(schema, typeInfo, category = 'related') {
  if (!schema) return;
  
  if (schema.$ref) {
    // 直接引用类型
    const typeName = schema.$ref.split('/').pop();
    const schemaInfo = processSchemaName(typeName);
    const cleanedTypeName = schemaInfo.name;
    addTypeToCategory(typeInfo, cleanedTypeName, category);
    typeInfo.usedSchemas.add(typeName); // 使用原始名称作为key
    
    // 如果是泛型类型，也要添加其元素类型
    if (schemaInfo.isGeneric) {
      typeInfo.usedSchemas.add(schemaInfo.itemType); // 也使用原始名称
    }
  } else if (schema.type === 'array' && schema.items) {
    // 数组类型
    if (schema.items.$ref) {
      const itemType = schema.items.$ref.split('/').pop();
      const schemaInfo = processSchemaName(itemType);
      const cleanedItemType = schemaInfo.name;
      addTypeToCategory(typeInfo, `${cleanedItemType}[]`, category);
      typeInfo.usedSchemas.add(itemType); // 使用原始名称
    } else {
      extractSchemaTypes(schema.items, typeInfo, category);
    }
  } else if (schema.properties) {
    // 对象类型 - 检查特殊的通用响应格式
    if (schema.properties.payload) {
      // ResponseDataType 格式: { payload: T }
      extractSchemaTypes(schema.properties.payload, typeInfo, category);
    } else if (schema.properties.records) {
      // Page 格式: { records: T[] }
      extractSchemaTypes(schema.properties.records, typeInfo, category);
    } else if (schema.properties.list) {
      // 自定义分页格式: { list: T[] }
      extractSchemaTypes(schema.properties.list, typeInfo, category);
    }
  } else if (schema.allOf) {
    // 处理 allOf 组合
    schema.allOf.forEach(subSchema => {
      extractSchemaTypes(subSchema, typeInfo, category);
    });
  } else if (schema.oneOf) {
    // 处理 oneOf 组合
    schema.oneOf.forEach(subSchema => {
      extractSchemaTypes(subSchema, typeInfo, category);
    });
  }
}

// 将类型添加到对应的分类中
function addTypeToCategory(typeInfo, typeName, category) {
  switch (category) {
    case 'request':
      if (!typeInfo.requestTypes.includes(typeName)) {
        typeInfo.requestTypes.push(typeName);
      }
      break;
    case 'response':
      if (!typeInfo.responseTypes.includes(typeName)) {
        typeInfo.responseTypes.push(typeName);
      }
      break;
    case 'related':
    default:
      if (!typeInfo.relatedTypes.includes(typeName)) {
        typeInfo.relatedTypes.push(typeName);
      }
      break;
  }
}

// 检查是否为文件上传接口
function isFileUploadApi(operation, path) {
  // 1. 检查路径是否包含 upload, import, avatar 等关键词
  const uploadKeywords = ['/upload', '/import'];
  const hasUploadPath = uploadKeywords.some(keyword => path.toLowerCase().includes(keyword));
  
  // 2. 检查 requestBody 的 content-type 是否为 multipart/form-data
  if (operation.requestBody && operation.requestBody.content) {
    const contentTypes = Object.keys(operation.requestBody.content);
    const hasMultipart = contentTypes.some(ct => ct.includes('multipart/form-data'));
    if (hasMultipart) return true;
  }
  
  // 3. 检查参数中是否有 file 或 files 类型
  if (operation.parameters) {
    const hasFileParam = operation.parameters.some(param => 
      param.name && (param.name.toLowerCase().includes('file') || param.name.toLowerCase().includes('files'))
    );
    if (hasFileParam && hasUploadPath) return true;
  }
  
  // 4. 检查 summary 或 description 是否包含上传相关关键词
  const summary = (operation.summary || '').toLowerCase();
  const description = (operation.description || '').toLowerCase();
  const uploadDescKeywords = ['上传', '导入', 'upload', 'import'];
  const hasUploadDesc = uploadDescKeywords.some(keyword => 
    summary.includes(keyword) || description.includes(keyword)
  );
  
  return hasUploadPath && hasUploadDesc;
}

// 生成API函数
function generateApiFunction(path, method, operation, envConfig, usedNames, controllerPrefix = '', controllerName = '', allSchemas = {}) {
  // 生成函数名（去除Using后缀）
  let baseFunctionName = cleanFunctionName(operation.operationId, method, path, new Set()); // 先生成基础函数名
  
  // 为通用接口添加控制器前缀,避免命名冲突
  const commonApiPatterns = [
    'advancedCount', 'advancedQuery', 'advancedQueryExport', 'advancedSelect', 
    'advancedStatistic', 'advancedSummary', 'deleteItem', 'deleteList',
    'generalCount', 'generalQuery', 'generalSelect', 'generalStatistic', 
    'generalSummary', 'queryById', 'importAdd', 'importAddProgress',
    'importUpdate', 'importUpdateProgress', 'add', 'templateExport', 
    'update', 'bind', 'unbind', 'replace', 'getAttach', 'getBind', 
    'getUnBind', 'bindAll', 'unbindAll', 'bindInfo', 'bindInfoList', 'getBindList',
    'parseExcel', 'parseExcelProgress'
  ];
  
  // 检查是否为文件上传接口
  const isUploadApi = isFileUploadApi(operation, path);
  
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
  
  // 提取类型信息
  const typeInfo = extractTypeInfo(operation, controllerName, allSchemas);
  
  // 检测参数类型
  const pathParams = (cleanPath.match(/{([^}]+)}/g) || []).map(p => p.slice(1, -1));
  const queryParams = (operation.parameters || []).filter(p => p.in === 'query');
  const hasRequestBody = !!operation.requestBody;
  
  // 提取params和data的具体类型
  let paramsType = 'object';
  let dataType = 'any';
  let paramsTypeName = '';
  let dataTypeName = '';
  let queryParamsInterface = ''; // 存储生成的query参数接口定义
  
  // 从query参数中提取类型信息
  if (queryParams.length > 0) {
    // 尝试从第一个query参数的schema中获取类型
    const firstQueryParam = queryParams[0];
    if (firstQueryParam.schema && firstQueryParam.schema.$ref) {
      const refType = firstQueryParam.schema.$ref.split('/').pop();
      paramsTypeName = cleanSchemaName(refType);
      paramsType = paramsTypeName;
    } else {
      // 如果没有$ref引用，生成内联的接口定义
      const queryParamFields = [];
      queryParams.forEach(param => {
        const paramName = param.name;
        const isRequired = param.required || false;
        const optional = isRequired ? '' : '?';
        let paramType = 'any';
        
        if (param.schema) {
          if (param.schema.type) {
            paramType = swaggerTypeToTSType(param.schema.type, param.schema.format);
          }
        }
        
        // 添加描述注释
        const description = param.description || '';
        if (description) {
          queryParamFields.push(`  /** ${description} */`);
        }
        queryParamFields.push(`  ${paramName}${optional}: ${paramType}`);
      });
      
      // 生成内联接口
      if (queryParamFields.length > 0) {
        paramsType = `{\n${queryParamFields.join('\n')}\n}`;
      }
    }
  }
  
  // 从requestBody中提取类型信息
  if (hasRequestBody && operation.requestBody.content) {
    const content = operation.requestBody.content;
    const mediaTypes = Object.keys(content);
    if (mediaTypes.length > 0) {
      const schema = content[mediaTypes[0]].schema;
      if (schema && schema.$ref) {
        const refType = schema.$ref.split('/').pop();
        dataTypeName = cleanSchemaName(refType);
        dataType = dataTypeName;
      }
    }
  }
  
  // 构建参数列表
  let params = [];
  
  // 路径参数
  pathParams.forEach(param => {
    params.push(`${param}: string | number`);
  });
  
  // 查询参数 - 使用具体类型
  if (queryParams.length > 0) {
    params.push(`params?: ${paramsType}`);
  }
  
  // 请求体 - 使用具体类型
  if (hasRequestBody) {
    params.push(`data?: ${dataType}`);
  }
  
  // 根据是否为上传接口添加不同的参数
  if (isUploadApi) {
    // 上传接口使用 onUploadProgress 回调
    params.push('onUploadProgress?: Function');
  } else {
    // 普通接口使用三个布尔参数
    // 说明:
    // - POST类型的API调用时，showSuccess和showErr一般要设置成true
    // - POST类型的方法一般不会返回数据，如果需要更新数据，再次调用获取函数完成数据更新
    // - 操作正常完成会依赖showSuccess在request框架中弹出相应的成功文案
    // - 操作失败会根据showErr在request框架中弹出相应的失败文案
    params.push('showSuccess = true', 'showLoading = false', 'showErr = true');
  }
  
  // 构建路径
  let apiPath = cleanPath;
  pathParams.forEach(param => {
    apiPath = apiPath.replace(`{${param}}`, `\${${param}}`);
  });
  
  // 生成带类型信息的注释
  let code = `/**\n * ${summary}\n`;
  
  // 添加API路径信息
  code += ` * @api ${httpMethod} ${cleanPath}\n`;
  
  // 添加参数注释
  // 路径参数
  pathParams.forEach(param => {
    code += ` * @param ${param} - 路径参数\n`;
  });
  
  // 查询参数
  if (queryParams.length > 0) {
    code += ` * @param params - 查询参数`;
    if (paramsTypeName) {
      code += `（类型: ${paramsTypeName}）`;
    }
    code += `\n`;
  }
  
  // 请求体参数
  if (hasRequestBody) {
    code += ` * @param data - 请求体数据`;
    if (dataTypeName) {
      code += `（类型: ${dataTypeName}）`;
    }
    code += `\n`;
  }
  
  // 上传或通用参数
  if (isUploadApi) {
    code += ` * @param onUploadProgress - 上传进度回调\n`;
  } else {
    code += ` * @param showSuccess - 是否显示成功提示（默认: true）\n`;
    code += ` * @param showLoading - 是否显示加载中（默认: false）\n`;
    code += ` * @param showErr - 是否显示错误提示（默认: true）\n`;
  }
  
  // 添加参数类型信息
  if (paramsTypeName) {
    code += ` * @paramsType ${paramsTypeName}\n`;
  }
  if (dataTypeName) {
    code += ` * @dataType ${dataTypeName}\n`;
  }
  
  // 添加类型信息
  if (typeInfo.requestTypes.length > 0) {
    code += ` * @requestTypes ${typeInfo.requestTypes.join(', ')}\n`;
  }
  if (typeInfo.responseTypes.length > 0) {
    code += ` * @responseTypes ${typeInfo.responseTypes.join(', ')}\n`;
  }
  if (typeInfo.relatedTypes.length > 0) {
    code += ` * @relatedTypes ${typeInfo.relatedTypes.join(', ')}\n`;
  }
  
  // 添加types文件引用
  const typesFileName = `${controllerName}Types`;
  code += ` * @see {@link @/apis/types/${typesFileName}} - 相关类型定义\n`;
  
  // 如果是上传接口，添加特殊标记
  if (isUploadApi) {
    code += ` * @upload true - 此接口使用 multipart/form-data 上传文件\n`;
  }
  
  // 定义使用POST方法但实际是查询数据的接口路径模式
  const queryApiPatterns = [
    '/advanced/count',
    '/advanced/query',
    '/advanced/select',
    '/advanced/statistic',
    '/advanced/summary',
    '/advanced/query/export',
    '/general/count',
    '/general/query',
    '/general/select',
    '/general/statistic',
    '/general/summary'
  ];
  
  // 检查当前路径是否为查询类接口
  const isQueryApi = queryApiPatterns.some(pattern => cleanPath.endsWith(pattern));
  
  // 如果是POST接口，且不是上传接口，且不是查询类接口，添加使用说明
  if (httpMethod === 'POST' && !isUploadApi && !isQueryApi) {
    code += ` * \n`;
    code += ` * @remarks\n`;
    code += ` * **POST接口使用规范（重要）:**\n`;
    code += ` * showSuccess - 默认true，成功时自动显示提示消息，通常保持默认值\n`;
    code += ` * showErr - 默认true，失败时自动显示错误消息，通常保持默认值\n`;
    code += ` * showLoading - 默认false，长时间处理的接口方法需要设置成true以显示loading图标，通常保持默认值\n`;
    code += ` * \n`;
    code += ` * **调用建议:**\n`;
    code += ` * 1. 调用此接口时使用默认参数即可（showSuccess=true, showErr=true）\n`;
    code += ` * 2. 此接口不返回业务数据，仅返回操作状态\n`;
    code += ` * 3. 数据更新流程：调用此POST接口 -> 等待成功 -> 调用相应的获取数据接口获取最新数据\n`;
    code += ` * 4. request框架会根据showSuccess和showErr自动弹出操作结果提示\n`;
  }
  
  code += ` */\n`;
  code += `export const ${finalName} = (${params.join(', ')}) => {\n`;
  
  const builderFunc = httpMethod === 'GET' ? 'buildGetApiByType' : 'buildPostApiByType';
  code += `  const api = ${builderFunc}('${apiPath}', '');\n`;
  
  // 根据是否为上传接口生成不同的调用代码
  if (isUploadApi) {
    // 文件上传接口使用 upload 方法
    if (queryParams.length > 0 && hasRequestBody) {
      code += `  return upload(api, params || {}, data || {}, onUploadProgress || (() => {}));\n`;
    } else if (queryParams.length > 0) {
      code += `  return upload(api, params || {}, {}, onUploadProgress || (() => {}));\n`;
    } else if (hasRequestBody) {
      code += `  return upload(api, {}, data || {}, onUploadProgress || (() => {}));\n`;
    } else {
      code += `  return upload(api, {}, {}, onUploadProgress || (() => {}));\n`;
    }
  } else {
    // 普通接口使用 request 方法
    if (queryParams.length > 0 && hasRequestBody) {
      code += `  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr);\n`;
    } else if (queryParams.length > 0) {
      code += `  return request(api, params || {}, {}, showSuccess, showLoading, showErr);\n`;
    } else if (hasRequestBody) {
      code += `  return request(api, {}, data || {}, showSuccess, showLoading, showErr);\n`;
    } else {
      code += `  return request(api, {}, {}, showSuccess, showLoading, showErr);\n`;
    }
  }
  
  code += '};\n\n';
  
  return { code, usedSchemas: typeInfo.usedSchemas, paramsTypeName, dataTypeName, isUploadApi };
}

// 生成按operation的tag description分组的API文件
function generateApiByController(swaggerData, envConfig) {
  const { paths, tags: swaggerTags, info, components } = swaggerData;
  const controllerGroups = {};
  let ignoredCount = 0;
  
  // 获取所有schemas
  const allSchemas = (components && components.schemas) || {};
  
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
          controllerPrefix: getControllerPrefix(controllerName, tagDescription), // 添加控制器前缀
          usedSchemas: new Set() // 记录使用的schemas
        };
      }
      
      const apiResult = generateApiFunction(pathKey, method, operation, envConfig, controllerGroups[controllerName].usedNames, controllerGroups[controllerName].controllerPrefix, controllerName, allSchemas);
      controllerGroups[controllerName].functions.push(apiResult.code);
      
      // 记录是否包含上传接口
      if (apiResult.isUploadApi) {
        controllerGroups[controllerName].hasUploadApi = true;
      }
      
      // 收集使用的schemas
      if (apiResult.usedSchemas) {
        apiResult.usedSchemas.forEach(schema => {
          controllerGroups[controllerName].usedSchemas.add(schema);
        });
      }
      
      // 收集使用的类型名称（用于导入）
      if (!controllerGroups[controllerName].usedTypeNames) {
        controllerGroups[controllerName].usedTypeNames = new Set();
      }
      if (apiResult.paramsTypeName) {
        controllerGroups[controllerName].usedTypeNames.add(apiResult.paramsTypeName);
      }
      if (apiResult.dataTypeName) {
        controllerGroups[controllerName].usedTypeNames.add(apiResult.dataTypeName);
      }
    });
  });
  
  return { controllerGroups, ignoredCount, allSchemas };
}

// 生成公共类型文件
function generateCommonTypesFile(allSchemas, controllerGroups, envConfig) {
  let content = `// ==================== 公共类型定义 ====================\n`;
  content += `// 项目: ${envConfig.projectName}\n`;
  content += `// 文件: common.ts\n`;
  content += `// 说明: 多个控制器共享的类型定义\n`;
  content += `// ============================================================\n\n`;
  
  content += `/**\n`;
  content += ` * 全局响应数据类型说明\n`;
  content += ` * @interface ResponseDataType\n`;
  content += ` * @description 所有API接口的统一响应格式\n`;
  content += ` * \n`;
  content += ` * @property {Object} status - 响应状态信息\n`;
  content += ` * @property {number} status.code - 状态码，0表示成功，非0表示失败\n`;
  content += ` * @property {string} status.msg - 状态消息\n`;
  content += ` * @property {string} status.detailMsg - 详细错误信息\n`;
  content += ` * @property {any} payload - 响应数据载体，成功时包含实际返回的数据\n`;
  content += ` * \n`;
  content += ` * @example\n`;
  content += ` * // 成功响应示例\n`;
  content += ` * {\n`;
  content += ` *   status: { code: 0, msg: 'success', detailMsg: '' },\n`;
  content += ` *   payload: { id: 1, name: 'example' }\n`;
  content += ` * }\n`;
  content += ` * \n`;
  content += ` * // 失败响应示例\n`;
  content += ` * {\n`;
  content += ` *   status: { code: 1001, msg: 'error', detailMsg: '详细错误信息' },\n`;
  content += ` *   payload: null\n`;
  content += ` * }\n`;
  content += ` */\n`;
  content += `// ResponseDataType 是全局类型，已在框架中定义\n\n`;
  
  // 统计每个 schema 被使用的次数
  const schemaUsageCount = new Map();
  Object.values(controllerGroups).forEach(group => {
    group.usedSchemas.forEach(schema => {
      const count = schemaUsageCount.get(schema) || 0;
      schemaUsageCount.set(schema, count + 1);
    });
  });
  
  // 定义业务实体类型的模式（这些类型不应该被提取为公共类型）
  const businessEntityPatterns = [
    /VO$/,           // 以VO结尾的视图对象
    /DTO$/,          // 以DTO结尾的数据传输对象
    /Entity$/,       // 以Entity结尾的实体
    /Model$/,        // 以Model结尾的模型
    /Info$/,         // 以Info结尾的信息对象
    /Detail$/,       // 以Detail结尾的详情对象
  ];
  
  // 判断是否为业务实体类型
  function isBusinessEntity(schemaName) {
    return businessEntityPatterns.some(pattern => pattern.test(schemaName));
  }
  
  // 找出被多个控制器使用的类型 (使用次数 >= 2)，但排除业务实体类型
  const commonSchemas = new Set();
  schemaUsageCount.forEach((count, schema) => {
    if (count >= 2 && !isBusinessEntity(schema)) {
      commonSchemas.add(schema);
    }
  });
  
  if (commonSchemas.size === 0) {
    content += `// 当前没有多个控制器共享的类型\n`;
    return { content, commonSchemas };
  }
  
  content += `// ==================== 共享类型定义 ====================\n`;
  content += `// 以下类型被多个控制器使用，提取到公共文件以避免重复定义\n\n`;
  
  // 生成共享类型的接口定义
  const processedSchemas = new Set();
  const schemasToProcess = Array.from(commonSchemas);
  
  // 处理依赖关系
  function addDependentSchemas(schemaName) {
    const schemaInfo = processSchemaName(schemaName);
    const cleanedSchemaName = schemaInfo.name;
    if (processedSchemas.has(cleanedSchemaName) || !allSchemas[schemaName]) {
      return;
    }
    
    processedSchemas.add(cleanedSchemaName);
    const schema = allSchemas[schemaName];
    
    if (schemaInfo.isGeneric && schemaInfo.itemType) {
      const itemTypeSchema = allSchemas[schemaInfo.itemType];
      if (itemTypeSchema && !processedSchemas.has(cleanSchemaName(schemaInfo.itemType))) {
        // 无论是否在公共类型中，都需要包含依赖类型
        schemasToProcess.push(schemaInfo.itemType);
      }
    }
    
    if (schema.properties) {
      Object.values(schema.properties).forEach(prop => {
        if (prop.$ref) {
          const refType = prop.$ref.split('/').pop();
          const refSchemaInfo = processSchemaName(refType);
          if (!processedSchemas.has(refSchemaInfo.name)) {
            // 无论是否在公共类型中，都需要包含依赖类型
            schemasToProcess.push(refType);
          }
        } else if (prop.type === 'array' && prop.items && prop.items.$ref) {
          const refType = prop.items.$ref.split('/').pop();
          const refSchemaInfo = processSchemaName(refType);
          if (!processedSchemas.has(refSchemaInfo.name)) {
            // 无论是否在公共类型中，都需要包含依赖类型
            schemasToProcess.push(refType);
          }
        }
      });
    }
  }
  
  // 生成所有公共类型
  while (schemasToProcess.length > 0) {
    const schemaName = schemasToProcess.shift();
    const schemaInfo = processSchemaName(schemaName);
    const cleanedSchemaName = schemaInfo.name;
    
    if (allSchemas[schemaName] && !processedSchemas.has(cleanedSchemaName)) {
      addDependentSchemas(schemaName);
      const tempProcessedSchemas = new Set();
      const interfaceCode = parseSchemaToInterface(schemaName, allSchemas[schemaName], allSchemas, tempProcessedSchemas);
      content += interfaceCode;
    }
  }
  
  return { content, commonSchemas };
}

// 生成单个文件内容（按tag description分组）
function generateControllerFile(controllerName, controllerData, envConfig) {
  let content = `// ==================== ${controllerData.tagDescription || controllerData.tag} API ====================\n`;
  content += `// 项目: ${envConfig.projectName}\n`;
  content += `// 文件: ${controllerName}.ts\n`;
  content += `// Tag: ${controllerData.tag}\n`;
  if (controllerData.tagDescription && controllerData.tagDescription !== controllerData.tag) {
    content += `// Tag Description: ${controllerData.tagDescription}\n`;
  }
  content += `// ============================================================\n\n`;
  
  // 检查是否有上传接口
  const hasUploadApi = controllerData.hasUploadApi || false;
  
  // 导入语句
  content += `import { buildGetApiByType, buildPostApiByType } from '@/framework/apis'\n`;
  if (hasUploadApi) {
    // 如果包含上传接口，同时导入 request 和 upload
    content += `import { request, upload } from '@/framework/network/request'\n`;
  } else {
    // 否则只导入 request
    content += `import { request } from '@/framework/network/request'\n`;
  }
  
  // 如果有使用到的类型，导入类型
  if (controllerData.usedTypeNames && controllerData.usedTypeNames.size > 0) {
    const typeNames = Array.from(controllerData.usedTypeNames).sort();
    content += `import type { ${typeNames.join(', ')} } from '@/apis/types'\n`;
  }
  
  content += '\n';
  
  // API函数
  content += controllerData.functions.join('');
  
  return content;
}

// 生成Types文件内容
function generateTypesFile(controllerName, controllerData, usedSchemas, allSchemas, envConfig, commonSchemas = new Set()) {
  let content = `// ==================== ${controllerData.tagDescription || controllerData.tag} Types ====================\n`;
  content += `// 项目: ${envConfig.projectName}\n`;
  content += `// 文件: ${controllerName}Types.ts\n`;
  content += `// Tag: ${controllerData.tag}\n`;
  if (controllerData.tagDescription && controllerData.tagDescription !== controllerData.tag) {
    content += `// Tag Description: ${controllerData.tagDescription}\n`;
  }
  content += `// ============================================================\n\n`;
  
  // 如果使用了公共类型，添加导入语句
  const usedCommonTypes = new Set();
  Array.from(usedSchemas).forEach(schema => {
    if (commonSchemas.has(schema)) {
      const schemaInfo = processSchemaName(schema);
      usedCommonTypes.add(schemaInfo.name);
    }
  });
  
  if (usedCommonTypes.size > 0) {
    content += `// 导入公共类型\n`;
    content += `import type { ${Array.from(usedCommonTypes).sort().join(', ')} } from './common'\n`;
  }
  
  content += `/**\n`;
  content += ` * 全局响应数据类型说明\n`;
  content += ` * @interface ResponseDataType\n`;
  content += ` * @description 所有API接口的统一响应格式\n`;
  content += ` * \n`;
  content += ` * @property {Object} status - 响应状态信息\n`;
  content += ` * @property {number} status.code - 状态码，0表示成功，非0表示失败\n`;
  content += ` * @property {string} status.msg - 状态消息\n`;
  content += ` * @property {string} status.detailMsg - 详细错误信息\n`;
  content += ` * @property {any} payload - 响应数据载体，成功时包含实际返回的数据\n`;
  content += ` * \n`;
  content += ` * @example\n`;
  content += ` * // 成功响应示例\n`;
  content += ` * {\n`;
  content += ` *   status: { code: 0, msg: 'success', detailMsg: '' },\n`;
  content += ` *   payload: { id: 1, name: 'example' }\n`;
  content += ` * }\n`;
  content += ` * \n`;
  content += ` * // 失败响应示例\n`;
  content += ` * {\n`;
  content += ` *   status: { code: 1001, msg: 'error', detailMsg: '详细错误信息' },\n`;
  content += ` *   payload: null\n`;
  content += ` * }\n`;
  content += ` */\n`;
  content += `// ResponseDataType 是全局类型，不需要导入\n\n`;
  
  // 生成用到的类型定义（跳过公共类型）
  const processedSchemas = new Set();
  const schemasToProcess = Array.from(usedSchemas).filter(schema => !commonSchemas.has(schema)); // 过滤掉公共类型
  
  // 处理依赖关系，确保被引用的类型也被包含
  function addDependentSchemas(schemaName) {
    const schemaInfo = processSchemaName(schemaName);
    const cleanedSchemaName = schemaInfo.name;
    if (processedSchemas.has(cleanedSchemaName) || !allSchemas[schemaName]) {
      return;
    }
    
    processedSchemas.add(cleanedSchemaName);
    const schema = allSchemas[schemaName];
    
    // 如果是泛型类型，也需要处理其元素类型
    if (schemaInfo.isGeneric && schemaInfo.itemType) {
      const itemTypeSchema = allSchemas[schemaInfo.itemType];
      if (itemTypeSchema && !processedSchemas.has(cleanSchemaName(schemaInfo.itemType))) {
        schemasToProcess.push(schemaInfo.itemType);
      }
    }
    
    if (schema.properties) {
      Object.values(schema.properties).forEach(prop => {
        if (prop.$ref) {
          const refType = prop.$ref.split('/').pop();
          const refSchemaInfo = processSchemaName(refType);
          if (!processedSchemas.has(refSchemaInfo.name)) {
            schemasToProcess.push(refType);
          }
        } else if (prop.type === 'array' && prop.items && prop.items.$ref) {
          const refType = prop.items.$ref.split('/').pop();
          const refSchemaInfo = processSchemaName(refType);
          if (!processedSchemas.has(refSchemaInfo.name)) {
            schemasToProcess.push(refType);
          }
        }
      });
    }
  }
  
  // 处理所有schema，确保接口定义被正确生成
  while (schemasToProcess.length > 0) {
    const schemaName = schemasToProcess.shift();
    const schemaInfo = processSchemaName(schemaName);
    const cleanedSchemaName = schemaInfo.name;
    
    // 只要schema存在且还没有被处理，就生成接口
    if (allSchemas[schemaName] && !processedSchemas.has(cleanedSchemaName)) {
      // 先添加依赖的schema到待处理列表
      addDependentSchemas(schemaName);
      // 生成接口定义，为每个接口创建独立的processedSchemas
      const tempProcessedSchemas = new Set(); // 每个接口独立的处理记录
      const interfaceCode = parseSchemaToInterface(schemaName, allSchemas[schemaName], allSchemas, tempProcessedSchemas);
      content += interfaceCode;
    }
  }
  
  // 生成响应类型 - 使用 Map 来跟踪已生成的类型名称，避免重复
  const generatedResponseTypes = new Map(); // key: typeName, value: typeDefinition
  
  Array.from(usedSchemas).forEach(originalSchemaName => {
    const schemaInfo = processSchemaName(originalSchemaName);
    const cleanedSchemaName = schemaInfo.name;
    if (allSchemas[originalSchemaName]) {
      // 生成基本响应类型
      const responseTypeName = `${cleanedSchemaName}Response`;
      if (!generatedResponseTypes.has(responseTypeName)) {
        generatedResponseTypes.set(responseTypeName, `export type ${responseTypeName} = ResponseDataType & {
  payload: ${cleanedSchemaName}
}

`);
      }
      
      // 生成列表响应类型
      const listResponseTypeName = `${cleanedSchemaName}ListResponse`;
      if (!generatedResponseTypes.has(listResponseTypeName)) {
        generatedResponseTypes.set(listResponseTypeName, `export type ${listResponseTypeName} = ResponseDataType & {
  payload: ${cleanedSchemaName}[]
}

`);
      }
      
      // 对于分页类型，生成更精确的响应类型
      const pageResponseTypeName = `${cleanedSchemaName}PageResponse`;
      if (!generatedResponseTypes.has(pageResponseTypeName)) {
        if (schemaInfo.isGeneric && schemaInfo.containerType === 'Page') {
          generatedResponseTypes.set(pageResponseTypeName, `export type ${pageResponseTypeName} = ResponseDataType & {
  payload: ${cleanedSchemaName}
}

`);
        } else {
          generatedResponseTypes.set(pageResponseTypeName, `export type ${pageResponseTypeName} = ResponseDataType & {
  payload: {
    records: ${cleanedSchemaName}[]
    total: number
    currentPage: number
    pageSize: number
  }
}

`);
        }
      }
    }
  });
  
  // 添加响应类型
  generatedResponseTypes.forEach(typeDefinition => {
    content += typeDefinition;
  });
  
  return content;
}

// 生成基本的Types文件（当没有复杂类型时）
function generateBasicTypesFile(controllerName, controllerData, envConfig) {
  let content = `// ==================== ${controllerData.tagDescription || controllerData.tag} Types ====================\n`;
  content += `// 项目: ${envConfig.projectName}\n`;
  content += `// 文件: ${controllerName}Types.ts\n`;
  content += `// Tag: ${controllerData.tag}\n`;
  if (controllerData.tagDescription && controllerData.tagDescription !== controllerData.tag) {
    content += `// Tag Description: ${controllerData.tagDescription}\n`;
  }
  content += `// ============================================================\n\n`;
  
  content += `// ResponseDataType 是全局类型，不需要导入\n\n`;
  
  content += `// 此控制器的API不使用复杂类型，只有基本响应类型\n`;
  content += `export type BasicResponse = ResponseDataType;\n\n`;
  
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
    const { controllerGroups, ignoredCount, allSchemas } = generateApiByController(swaggerData, envConfig);
    const controllerCount = Object.keys(controllerGroups).length;
    console.log(`📁 按Tag Description分文件: ${controllerCount} 个文件`);
    console.log(`ℹ️  忽略以'系统'开头的API: ${ignoredCount} 个\n`);
    
    // 确保输出目录存在 - 修改为src/apis
    const outputDir = path.resolve(__dirname, '../../../src/apis');
    const typesDir = path.resolve(__dirname, '../../../src/apis/types');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    if (!fs.existsSync(typesDir)) {
      fs.mkdirSync(typesDir, { recursive: true });
    }
    
    // 清理旧文件（除了examples.ts）
    const existingFiles = fs.readdirSync(outputDir);
    existingFiles.forEach(file => {
      if (file !== 'examples.ts' && file.endsWith('.ts')) {
        fs.unlinkSync(path.join(outputDir, file));
      }
    });
    
    // 清理types目录下的旧文件
    if (fs.existsSync(typesDir)) {
      const existingTypesFiles = fs.readdirSync(typesDir);
      existingTypesFiles.forEach(file => {
        if (file.endsWith('.ts')) {
          fs.unlinkSync(path.join(typesDir, file));
        }
      });
    }
    
    // 生成公共类型文件
    console.log('\n🔍 分析共享类型...');
    const { content: commonTypesContent, commonSchemas } = generateCommonTypesFile(allSchemas, controllerGroups, envConfig);
    const commonTypesFile = path.join(typesDir, 'common.ts');
    fs.writeFileSync(commonTypesFile, commonTypesContent, 'utf-8');
    console.log(`✓ 生成 common.ts (包含 ${commonSchemas.size} 个共享类型)`);
    if (commonSchemas.size > 0) {
      console.log(`  共享类型: ${Array.from(commonSchemas).map(s => processSchemaName(s).name).join(', ')}`);
    }
    
    // 生成每个文件（按tag description分组）
    let totalFunctions = 0;
    Object.keys(controllerGroups).forEach(controllerName => {
      const controllerData = controllerGroups[controllerName];
      
      // 生成API文件
      const fileContent = generateControllerFile(controllerName, controllerData, envConfig);
      const outputFile = path.join(outputDir, `${controllerName}.ts`);
      fs.writeFileSync(outputFile, fileContent, 'utf-8');
      
      // 生成Types文件 - 使用公共类型
      if (controllerData.usedSchemas.size > 0) {
        const typesContent = generateTypesFile(controllerName, controllerData, controllerData.usedSchemas, allSchemas, envConfig, commonSchemas);
        const typesOutputFile = path.join(typesDir, `${controllerName}Types.ts`);
        fs.writeFileSync(typesOutputFile, typesContent, 'utf-8');
      } else {
        // 即使没有复杂类型，也创建一个基本的types文件
        const basicTypesContent = generateBasicTypesFile(controllerName, controllerData, envConfig);
        const typesOutputFile = path.join(typesDir, `${controllerName}Types.ts`);
        fs.writeFileSync(typesOutputFile, basicTypesContent, 'utf-8');
      }
      
      const description = controllerData.tagDescription || controllerData.tag || '无描述';
      console.log(`✓ 生成 ${controllerName}.ts (${controllerData.functions.length} 个API) - ${description}`);
      
      if (controllerData.usedSchemas.size > 0) {
        console.log(`  → 生成 ${controllerName}Types.ts (${controllerData.usedSchemas.size} 个类型)`);
      } else {
        console.log(`  → 生成 ${controllerName}Types.ts (基本类型)`);
      }
      
      totalFunctions += controllerData.functions.length;
    });
    
    // 生成索引文件
    const indexContent = generateIndexFile(controllerGroups);
    const indexFile = path.join(outputDir, 'index.ts');
    fs.writeFileSync(indexFile, indexContent, 'utf-8');
    console.log(`✓ 生成 index.ts`);
    
    // 生成types的索引文件 - 使用显式导出避免重复
    console.log('\n🔍 收集所有导出类型...');
    const allExportedTypes = new Set();
    const typeFileMap = new Map(); // key: typeName, value: fileName
    
    // 预先收集所有类型，检测冲突
    Object.keys(controllerGroups).forEach(controllerName => {
      const typesFile = path.join(typesDir, `${controllerName}Types.ts`);
      if (fs.existsSync(typesFile)) {
        const content = fs.readFileSync(typesFile, 'utf-8');
        // 提取所有 export 的类型和接口
        const exportMatches = content.matchAll(/export\s+(?:type|interface)\s+([A-Za-z0-9_]+)/g);
        for (const match of exportMatches) {
          const typeName = match[1];
          if (typeFileMap.has(typeName)) {
            // 检测到重复，记录但不阻止
            // console.log(`  ⚠️  重复类型: ${typeName} (在 ${typeFileMap.get(typeName)} 和 ${controllerName}Types 中)`);
          } else {
            console.log(`  [32m✓[0m 生成类型: ${typeName} (在 ${controllerName}Types 中)`);
            typeFileMap.set(typeName, controllerName + 'Types');
            allExportedTypes.add(typeName);
          }
        }
      }
    });
    
    // 生成 types/index.ts ，使用注释说明重复的类型
    let typesIndexContent = `// ==================== 自动生成的Types导出 ====================\n`;
    typesIndexContent += `// 位置: src/apis/types/\n`;
    typesIndexContent += `// 说明: 每个API控制器的类型定义\n`;
    typesIndexContent += `// 注意: 如果多个文件中有相同的类型名称，请直接从对应的文件导入\n`;
    typesIndexContent += `// ============================================================\n\n`;
    
    // 导出公共类型
    typesIndexContent += `// 公共类型 (多个控制器共享)\n`;
    typesIndexContent += `export * from './common';\n\n`;
    
    // 使用 export * ，但添加说明
    typesIndexContent += `/**\n`;
    typesIndexContent += ` * 注意：由于Swagger生成的API可能在不同控制器中使用相同的类型名称，\n`;
    typesIndexContent += ` * 如果出现类型名冲突，建议直接从具体的类型文件导入：\n`;
    typesIndexContent += ` * \n`;
    typesIndexContent += ` * import type { YourType } from '@/apis/types/specificControllerTypes'\n`;
    typesIndexContent += ` * \n`;
    typesIndexContent += ` * 而不是使用：\n`;
    typesIndexContent += ` * import type { YourType } from '@/apis/types'\n`;
    typesIndexContent += ` */\n\n`;
    
    Object.keys(controllerGroups).forEach(controllerName => {
      const controllerData = controllerGroups[controllerName];
      const description = controllerData.tagDescription || controllerData.tag || '无描述';
      typesIndexContent += `// ${description}\n`;
      typesIndexContent += `export * from './${controllerName}Types';\n\n`;
    });
    
    const typesIndexFile = path.join(typesDir, 'index.ts');
    fs.writeFileSync(typesIndexFile, typesIndexContent, 'utf-8');
    console.log(`✓ 生成 types/index.ts`);
    
    if (typeFileMap.size !== allExportedTypes.size) {
      console.log(`\n⚠️  检测到 ${typeFileMap.size - allExportedTypes.size} 个重复的类型名称`);
      console.log(`   建议直接从具体的 types 文件导入以避免歧义\n`);
    }
    
    // 输出统计信息
    const totalTypes = Object.values(controllerGroups).reduce((sum, group) => sum + group.usedSchemas.size, 0);
    console.log('\n📊 生成统计:');
    console.log(`  - 按Tag Description分文件: ${controllerCount} 个`);
    console.log(`  - API函数总数: ${totalFunctions} 个`);
    console.log(`  - 生成类型总数: ${totalTypes} 个`);
    console.log(`  - 公共类型数量: ${commonSchemas.size} 个 (提取到 common.ts)`);
    console.log(`  - 忽略的API: ${ignoredCount} 个 (以'系统'开头)`);
    console.log(`  - 平均每个文件: ${Math.round(totalFunctions / controllerCount)} 个API`);
    
    // 输出使用说明
    console.log('\n🎉 API生成完成！');
    console.log('\n📖 使用方式:');
    console.log('  import { functionName } from "@/apis";');
    console.log('  import { TypeName } from "@/apis/types";');
    console.log('  import type { CommonType } from "@/apis/types/common"; // 导入共享类型');
    
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