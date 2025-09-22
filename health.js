/**
 * 健康检查模块
 * 提供 ccs health 命令：读取 ~/.claude/apiConfigs.json，依次检测各端点健康与网络延迟
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const chalk = require('chalk');

// 配置路径
const CONFIG_DIR = path.join(os.homedir(), '.claude');
const API_CONFIGS_FILE = path.join(CONFIG_DIR, 'apiConfigs.json');

/**
 * 读取API配置文件
 * @returns {Array} API配置数组（可能为空）
 */
function readApiConfigs() {
  try {
    if (!fs.existsSync(API_CONFIGS_FILE)) {
      console.log(chalk.yellow(`警告: API配置文件不存在 (${API_CONFIGS_FILE})`));
      return [];
    }
    const data = fs.readFileSync(API_CONFIGS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(chalk.red(`读取API配置文件失败: ${error.message}`));
    return [];
  }
}

/**
 * 探测指定端点
 * - 将 2xx 与 4xx 视为可达（成功）
 * - 将 5xx 或网络错误视为失败
 * - 返回 { ok, statusCode, latencyMs, error, endpoint }
 * @param {string} baseUrl 基础URL，如 https://api.anthropic.com
 * @param {string} authToken API密钥用于鉴权
 * @param {string} endpoint 端点路径，如 '/v1/models'
 * @param {object} options 额外选项
 * @returns {Promise<{ok:boolean,statusCode:number|undefined,latencyMs:number|undefined,error:Error|undefined,endpoint:string}>}
 */
function probeEndpoint(baseUrl, authToken, endpoint = '/v1/models', options = {}) {
  return new Promise((resolve) => {
    let urlString = baseUrl.endsWith('/') ? `${baseUrl}${endpoint.substring(1)}` : `${baseUrl}${endpoint}`;
    let timedOut = false;
    const start = Date.now();

    try {
      const urlObj = new URL(urlString);
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          // 'x-api-key': authToken,
          ...(options.includeAnthropicVersion !== false && { 'anthropic-version': '2023-06-01' }),
          ...(options.contentType && { 'Content-Type': options.contentType }),
          ...options.extraHeaders
        },
        timeout: 30000
      };

      const req = https.request(requestOptions, (res) => {
        // 消耗响应体以完成请求
        res.on('data', () => {});
        res.on('end', () => {
          const latencyMs = Date.now() - start;
          const status = res.statusCode || 0;
          const ok = status < 500; // 2xx/4xx 视为可达
          resolve({ ok, statusCode: status, latencyMs, error: undefined, endpoint });
        });
      });

      req.on('timeout', () => {
        timedOut = true;
        req.destroy(new Error('Request timeout'));
      });

      req.on('error', (err) => {
        const latencyMs = Date.now() - start;
        resolve({ ok: false, statusCode: undefined, latencyMs, error: timedOut ? new Error('timeout') : err, endpoint });
      });

      if (options.body) {
        req.write(options.body);
      }
      req.end();
    } catch (e) {
      resolve({ ok: false, statusCode: undefined, latencyMs: undefined, error: e, endpoint });
    }
  });
}

/**
 * 对单个配置执行智能健康检查
 * 如果 /v1/models 返回 404，会尝试其他常见端点
 * @param {object} configItem apiConfigs.json中单项
 * @returns {Promise<{name:string, baseUrl:string, tokenPresent:boolean, healthy:boolean, statusCodes:number[], latencies:number[], error:Error|undefined, endpoint:string}>}
 */
async function checkConfigHealth(configItem) {
  const name = configItem?.name || 'unknown';
  const env = configItem?.config?.env || {};
  const baseUrl = env.ANTHROPIC_BASE_URL || '';
  const tokenPresent = Boolean(env.ANTHROPIC_AUTH_TOKEN);
  const authToken = env.ANTHROPIC_AUTH_TOKEN || '';

  // 定义要尝试的端点
  const endpointsToTry = [
    { path: '/v1/models', description: 'Claude Models API' },
    { path: '/v1/chat/completions', description: 'OpenAI Compatible API', 
      options: { 
        method: 'POST', 
        contentType: 'application/json',
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1
        })
      }
    },
    { path: '/v1/models', description: 'No Anthropic Version', options: { includeAnthropicVersion: false } },
    { path: '/', description: 'Root Path' },
    { path: '/health', description: 'Health Check' },
    { path: '/api/v1/models', description: 'Alternative API Path' }
  ];

  let bestResult = null;
  let testedEndpoints = [];

  for (const endpointConfig of endpointsToTry) {
    const result = await probeEndpoint(baseUrl, authToken, endpointConfig.path, endpointConfig.options || {});
    testedEndpoints.push(`${endpointConfig.path}:${result.statusCode}`);
    
    // 如果是 2xx 状态码，直接返回成功结果
    if (result.statusCode >= 200 && result.statusCode < 300) {
      return {
        name,
        baseUrl,
        tokenPresent,
        healthy: true,
        statusCodes: [result.statusCode],
        latencies: [result.latencyMs],
        error: undefined,
        endpoint: `${endpointConfig.path} (${endpointConfig.description})`
      };
    }

    // 记录最好的结果（最低的错误代码或最早的可达结果）
    if (!bestResult || (result.ok && !bestResult.ok) || 
        (result.statusCode && (!bestResult.statusCode || result.statusCode < bestResult.statusCode))) {
      bestResult = { ...result, description: endpointConfig.description };
    }
  }

  // 如果没有找到 2xx 响应，返回最好的结果
  const healthy = bestResult ? bestResult.ok : false;
  return {
    name,
    baseUrl,
    tokenPresent,
    healthy,
    statusCodes: bestResult ? [bestResult.statusCode] : [],
    latencies: bestResult ? [bestResult.latencyMs] : [],
    error: bestResult?.error,
    endpoint: bestResult ? `${bestResult.endpoint} (${bestResult.description})` : 'All endpoints failed'
  };
}

/**
 * 掩码显示API Key，显示前7位+****
 * @param {boolean} present 是否存在
 * @param {string} token 原始token
 * @returns {string} 掩码显示
 */
function maskToken(present, token) {
  if (!present) return 'N/A';
  if (!token || token.length < 7) return '****';
  return `${token.slice(0, 7)}****`;
}

/**
 * 注册 health 命令
 * @param {import('commander').Command} program Commander实例
 */
function registerHealthCommands(program) {
  program
    .command('health')
    .description('检查各API端点的可用性与网络延迟')
    .action(async () => {
      const apiConfigs = readApiConfigs();
      if (apiConfigs.length === 0) {
        console.log(chalk.yellow('没有找到可用的API配置'));
        return;
      }

      console.log(chalk.cyan('开始健康检查 (/v1/models)...\n'));

      // 去重URL，只检测每个URL的第一个配置
      const uniqueUrls = new Set();
      const configsToCheck = [];
      
      apiConfigs.forEach(item => {
        const env = item?.config?.env || {};
        const baseUrl = env.ANTHROPIC_BASE_URL || '';
        const token = env.ANTHROPIC_AUTH_TOKEN || '';
        
        // 只处理首次出现的URL
        if (!uniqueUrls.has(baseUrl) && baseUrl) {
          uniqueUrls.add(baseUrl);
          configsToCheck.push({
            item,
            token,
            baseUrl
          });
        }
      });

      // 固定宽度设置
      const nameWidth = 18;
      const fixedUrlWidth = 30;
      const tokenWidth = 12;
      const statusWidth = 22;

      // 表头
      const nameHeader = 'Name'.padEnd(nameWidth);
      const urlHeader = 'Base URL'.padEnd(fixedUrlWidth);
      const tokenHeader = 'Token'.padEnd(tokenWidth);
      const statusHeader = 'Status'.padEnd(statusWidth);
      const latencyHeader = 'Latency';
      
      console.log(chalk.bold(`| ${nameHeader} | ${urlHeader} | ${tokenHeader} | ${statusHeader} | ${latencyHeader} |`));
      console.log(`|${'-'.repeat(nameWidth + 2)}|${'-'.repeat(fixedUrlWidth + 2)}|${'-'.repeat(tokenWidth + 2)}|${'-'.repeat(statusWidth + 2)}|${'-'.repeat(10)}|`);

      // 逐个检测并输出
      for (const config of configsToCheck) {
        const name = (config.item?.name || 'unknown').length > nameWidth 
          ? (config.item?.name || 'unknown').substring(0, nameWidth - 3) + '...' 
          : (config.item?.name || 'unknown').padEnd(nameWidth);
        const url = config.baseUrl.length > fixedUrlWidth 
          ? config.baseUrl.substring(0, fixedUrlWidth - 3) + '...' 
          : config.baseUrl.padEnd(fixedUrlWidth);
        const tokenMasked = maskToken(Boolean(config.token), config.token).padEnd(tokenWidth);
        
        // 显示检测中状态
        const checkingStatus = chalk.yellow('Checking...').padEnd(statusWidth + (chalk.yellow('Checking...').length - 'Checking...'.length));
        process.stdout.write(`| ${name} | ${url} | ${tokenMasked} | ${checkingStatus} | ... |\r`);
        
        // 执行检测
        const endpointResult = await checkConfigHealth(config.item);
        
        const latencyText = endpointResult.latencies.length
          ? `${Math.round(endpointResult.latencies[0])}ms`
          : 'N/A';

        const statusCode = endpointResult.statusCodes.length ? endpointResult.statusCodes[0] : 'N/A';
        const healthStatus = endpointResult.healthy ? 'Healthy' : 'Unhealthy';
        const statusText = `${healthStatus} (status: ${statusCode})`;
        
        // 根据状态码着色
        let coloredStatus;
        if (statusCode >= 200 && statusCode < 300) {
          coloredStatus = chalk.green(statusText);
        } else if (statusCode >= 400 || (typeof statusCode === 'string' && statusCode !== 'N/A')) {
          coloredStatus = chalk.red(statusText);
        } else {
          coloredStatus = chalk.yellow(statusText);
        }
        
        const statusFormatted = coloredStatus.padEnd(statusWidth + (coloredStatus.length - statusText.length));
        
        // 清除当前行并输出最终结果
        process.stdout.write('\r\x1b[K');
        console.log(`| ${name} | ${url} | ${tokenMasked} | ${statusFormatted} | ${latencyText} |`);
        
        if (!endpointResult.healthy && endpointResult.error) {
          console.log(chalk.gray(`  Error: ${endpointResult.error.message}`));
        }
        
        // // 显示找到的可用端点信息
        // if (endpointResult.endpoint && endpointResult.endpoint !== '/v1/models (Claude Models API)') {
        //   console.log(chalk.cyan(`  → Found working endpoint: ${endpointResult.endpoint}`));
        // }
      }
    });
}

module.exports = { registerHealthCommands };

