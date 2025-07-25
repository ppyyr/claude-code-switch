# Claude配置切换工具 (CCS)

一个用于在不同的Claude API配置之间进行切换的命令行工具。

## 功能

- 列出所有可用的API配置并提示选择
  - 支持交互式菜单（光标上下移动选择）
  - 支持手动输入序号
- 切换当前使用的API配置
- 显示版本信息
- 错误处理和帮助提示

## 安装

### 本地安装

```bash
# 克隆仓库
git clone <仓库地址>
cd claude-code-switch

# 安装依赖
npm install

# 全局安装
npm install -g .
```

### 依赖项

- Node.js (>= 12.0.0)
- npm (>= 6.0.0)
- 依赖库:
  - commander: 命令行界面解析
  - chalk: 终端彩色输出
  - inquirer: 交互式命令行用户界面

## 使用方法

### 配置文件

工具会读取 `~/.claude/apiConfigs.json` 文件中的配置信息，文件格式如下：

```json
[
  {
    "name": "wenwen-ai",
    "WEBURL": "https://code.wenwen-ai.com",
    "ANTHROPIC_BASE_URL": "https://code.wenwen-ai.com",
    "ANTHROPIC_AUTH_TOKEN": "sk-XXXXXXX"
  },
  {
    "name": "zone",
    "WEBURL": "https://zone.veloera.org",
    "ANTHROPIC_BASE_URL": "https://zone.veloera.org/pg",
    "ANTHROPIC_AUTH_TOKEN": "sk-XXXXXXX"
  }
]
```

### 命令

#### 列出所有可用的API配置并提示选择

```bash
ccs list
```

输出示例：

```
? 请选择要切换的配置: (Use arrow keys)
> 1. wenwen-ai
  2. zone
  3. co.yes.vg
  4. a-generic.be-a.dev
  ──────────────
  输入序号...

? 请选择要切换的配置: 2. zone

当前选择的配置:
{
  "name": "zone",
  "WEBURL": "https://zone.veloera.org",
  "ANTHROPIC_BASE_URL": "https://zone.veloera.org/pg",
  "ANTHROPIC_AUTH_TOKEN": "sk-xxxx"
}

? 确认切换到此配置? Yes

成功切换到配置: zone
```

**交互方式**:

1. **光标选择**: 使用键盘上下箭头选择配置，按Enter确认
2. **手动输入**: 选择"输入序号..."选项，然后输入配置的序号

#### 直接设置当前使用的API配置

```bash
ccs use <序号>
```

例如：

```bash
ccs use 2
```

输出示例：

```
当前选择的配置:
{
  "name": "zone",
  "WEBURL": "https://zone.veloera.org",
  "ANTHROPIC_BASE_URL": "https://zone.veloera.org/pg",
  "ANTHROPIC_AUTH_TOKEN": "sk-xxxxxx"
}

? 确认切换到此配置? Yes

成功切换到配置: zone
```

#### 显示版本信息

```bash
ccs --version
# 或
ccs -v
```

输出示例：

```
ccs 版本: 1.0.0
```

#### 显示帮助信息

```bash
ccs --help
```

输出示例：

```
Usage: ccs [options] [command]

Claude配置切换工具

Options:
  -v, --version      显示版本信息
  -h, --help         display help for command

Commands:
  list               列出所有可用的API配置并提示选择
  use <index>        设置当前使用的API配置
  help [command]     display help for command
```

#### 错误处理

当输入不存在的命令时，会显示错误信息和可用命令列表：

```bash
ccs unknown
```

输出示例：

```
错误: 未知命令 'unknown'

可用命令:
  list
  use

使用 --help 查看更多信息
```

## 注意事项

- 确保 `~/.claude/apiConfigs.json` 文件存在并包含有效的配置信息
- 工具会自动创建 `~/.claude` 目录（如果不存在）
- 确认操作时默认为"是"，直接按Enter键即可确认

## 更新日志

### 1.0.0

- 初始版本发布
- 基本的API配置切换功能

### 1.1.0

- 添加交互式菜单，支持光标上下移动选择
- 保留原有的序号输入功能
- 优化用户体验，确认操作时默认为"是"
