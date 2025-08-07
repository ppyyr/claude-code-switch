# Claude配置切换工具 (CCS)

一个用于在不同的Claude API配置之间进行切换的命令行工具。

## 功能

- 列出所有可用的API配置并提示选择
  - 支持交互式菜单（光标上下移动选择）
  - 支持手动输入序号
- 切换当前使用的API配置
- 打开配置文件进行编辑
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

工具需要两个配置文件，都位于 `~/.claude/` 目录下：

#### 1. apiConfigs.json - API配置列表

存储所有可用的Claude API配置，格式如下：

```json
[
  {
    "name": "wenwen-ai",
    "config": {
      "env": {
        "ANTHROPIC_AUTH_TOKEN": "sk-XXXXXXX",
        "ANTHROPIC_BASE_URL": "https://code.wenwen-ai.com",
        "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1"
      },
      "permissions": {
        "allow": [],
        "deny": []
      },
      "model": "opus"
    }
  },
  {
    "name": "zone",
    "config": {
      "env": {
        "ANTHROPIC_AUTH_TOKEN": "sk-XXXXXXX",
        "ANTHROPIC_BASE_URL": "https://zone.veloera.org/pg",
        "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1"
      },
      "permissions": {
        "allow": [],
        "deny": []
      },
      "model": "opus"
    }
  }
]
```

#### 2. settings.json - 当前激活配置

存储当前使用的配置，格式如下：

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://zone.veloera.org/pg",
    "ANTHROPIC_AUTH_TOKEN": "sk-XXXXXXX",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1"
  },
  "permissions": {
    "allow": [],
    "deny": []
  },
  "model": "opus"
}
```

**注意**：切换配置时，整个 `settings.json` 文件会被选中配置的 `config` 对象完全替换。

### 命令

#### 列出所有可用的API配置并提示选择

```bash
ccs list
# 或使用简写
ccs ls
```

输出示例：

```
? 请选择要切换的配置: (Use arrow keys)
> 1. [wenwen-ai   ]  sk-XXXXXXX  https://code.wenwen-ai.com (当前)
  2. [zone        ]  sk-XXXXXXX  https://zone.veloera.org/pg
  3. [co.yes.vg   ]  sk-XXXXXXX  https://co.yes.vg/api
  4. [a-generic   ]  sk-XXXXXXX  https://a-generic.be-a.dev/api
  ──────────────
  输入序号...

? 请选择要切换的配置: 2. [zone        ]  sk-XXXXXXX  https://zone.veloera.org/pg

当前选择的配置:
{
  "name": "zone",
  "config": {
    "env": {
      "ANTHROPIC_AUTH_TOKEN": "sk-xxxx",
      "ANTHROPIC_BASE_URL": "https://zone.veloera.org/pg",
      "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1"
    },
    "permissions": {
      "allow": [],
      "deny": []
    },
    "model": "opus"
  }
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
  "config": {
    "env": {
      "ANTHROPIC_AUTH_TOKEN": "sk-xxxxxx",
      "ANTHROPIC_BASE_URL": "https://zone.veloera.org/pg",
      "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1"
    },
    "permissions": {
      "allow": [],
      "deny": []
    },
    "model": "opus"
  }
}

? 确认切换到此配置? Yes

成功切换到配置: zone
```

#### 打开配置文件

```bash
# 打开API配置文件 (apiConfigs.json)
ccs o api

# 打开设置配置文件 (settings.json)
ccs o setting
```

这些命令会在默认编辑器中打开相应的配置文件，方便直接编辑配置。如果文件不存在，会显示相应的提示信息。

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
  list, ls           列出所有可用的API配置并提示选择
  use <index>        设置当前使用的API配置
  o                  打开Claude配置文件
    api              打开API配置文件 (apiConfigs.json)
    setting          打开设置配置文件 (settings.json)
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
  ls
  use
  o

使用 --help 查看更多信息
```

## 注意事项

- 确保 `~/.claude/apiConfigs.json` 和 `~/.claude/settings.json` 文件存在并包含有效的配置信息
- 工具会自动创建 `~/.claude` 目录（如果不存在）
- 确认操作时默认为"是"，直接按Enter键即可确认
- 切换配置时会完全替换 `settings.json` 文件内容

## 更新日志

### 1.3.0

- 新增 `ccs ls` 命令作为 `ccs list` 的简写
- 新增 `ccs o api` 命令用于打开API配置文件 (apiConfigs.json)
- 新增 `ccs o setting` 命令用于打开设置配置文件 (settings.json)
- 改进配置文件编辑体验，可以直接在默认编辑器中修改配置

### 1.2.0

- 支持完整的Claude配置对象格式
- 新增配置深度比较功能，准确识别当前激活配置
- 优化配置显示格式，对齐显示配置名称
- 更新配置文件结构，支持env、permissions、model等完整配置项

### 1.1.0

- 添加交互式菜单，支持光标上下移动选择
- 保留原有的序号输入功能
- 优化用户体验，确认操作时默认为"是"

### 1.0.0

- 初始版本发布
- 基本的API配置切换功能
