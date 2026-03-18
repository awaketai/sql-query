# DB Query Tool

一个基于 Web 的 SQL 查询工具，支持连接 MySQL 数据库、浏览元数据、执行 SQL 查询，以及通过自然语言生成 SQL。

## 功能特性

- **数据库连接管理** - 添加、管理多个 MySQL 数据库连接
- **元数据浏览** - 自动提取并缓存表、视图、列信息
- **SQL 编辑器** - Monaco 编辑器，支持语法高亮、自动补全
- **查询执行** - SELECT-only 安全查询，自动添加 LIMIT 限制
- **自然语言生成 SQL** - 使用 OpenAI GPT-4o 将自然语言转换为 SQL
- **查询历史** - 记录所有查询执行历史

## 技术栈

**后端:**
- Python 3.13+
- FastAPI
- sqlglot (SQL 解析与验证)
- aiomysql (MySQL 异步驱动)
- OpenAI SDK

**前端:**
- React 19
- TypeScript
- Refine v5 (管理框架)
- Ant Design
- Monaco Editor
- Tailwind CSS

## 快速开始

### 前置要求

- Python 3.13+
- Node.js 18+
- [uv](https://docs.astral.sh/uv/) (Python 包管理器)
- MySQL 数据库
- OpenAI API Key

### 安装

```bash
# 克隆项目
git clone <repository-url>
cd sql-query

# 安装所有依赖
make install
```

或手动安装:

```bash
# 后端
cd backend
uv sync

# 前端
cd frontend
npm install
```

### 配置

创建 `.env` 文件 (复制 `.env.example` 并修改):

```bash
cp .env.example .env
```

或手动设置环境变量:

```bash
# OpenAI 配置 (必需，用于自然语言生成 SQL)
export OPENAI_API_KEY="your-openai-api-key"

# 可选：自定义 OpenAI 端点 (默认: https://api.openai.com/v1)
# 用于 Azure OpenAI、自托管模型等
export OPENAI_BASE_URL="https://api.openai.com/v1"

# 可选：指定模型 (默认: gpt-4o)
export OPENAI_MODEL="gpt-4o"

# 可选：设置加密密钥 (用于加密数据库连接密码)
export DB_QUERY_SECRET_KEY="your-secret-key"
```

**配置说明:**

| 环境变量 | 必需 | 默认值 | 说明 |
|---------|------|--------|------|
| `OPENAI_API_KEY` | 是 | - | OpenAI API 密钥 |
| `OPENAI_BASE_URL` | 否 | `https://api.openai.com/v1` | OpenAI API 端点 |
| `OPENAI_MODEL` | 否 | `gpt-4o` | 使用的模型名称 |
| `DB_QUERY_SECRET_KEY` | 否 | 自动生成 | 加密密钥 |

### 启动

**使用 Makefile (推荐):**

```bash
# 开发模式 (前台运行，可看到日志输出)
make dev

# 或以后台模式启动
make start

# 停止服务
make stop

# 重启服务
make restart
```

**手动启动:**

```bash
# 终端 1: 启动后端
cd backend
uv run uvicorn app.main:app --reload --port 8000

# 终端 2: 启动前端
cd frontend
npm run dev
```

### 访问应用

打开浏览器访问: http://localhost:3000

## 使用指南

### 1. 添加数据库连接

1. 点击左侧导航栏的 **Connections**
2. 点击 **Add Connection** 按钮
3. 填写连接信息:
   - **Display Name**: 连接名称 (如 "生产环境数据库")
   - **Connection URL**: MySQL 连接字符串
     ```
     mysql://username:password@host:port/database
     ```
   - **Database Type**: 选择 MySQL
4. 点击 **Connect** 保存连接

连接成功后，系统会自动提取并缓存数据库元数据。

### 2. 浏览数据库结构

1. 点击左侧导航栏的 **Database Explorer**
2. 从下拉菜单选择要浏览的数据库连接
3. 在左侧树形结构中展开 **Tables** 或 **Views**
4. 点击表名查看详细的列信息，包括:
   - 列名和数据类型
   - 是否可为空
   - 键类型 (主键/外键/唯一键)
   - 默认值
   - 列注释

点击 **Refresh Metadata** 按钮可重新提取最新的数据库结构。

### 3. 执行 SQL 查询

1. 点击左侧导航栏的 **Query Workspace**
2. 选择要查询的数据库连接
3. 在 **SQL Editor** 标签页中输入 SQL 语句
4. 点击 **Run Query** 或按 `Ctrl+Enter` (Mac: `Cmd+Enter`) 执行

**注意事项:**
- 仅支持 `SELECT` 语句
- 如果查询没有 LIMIT，系统会自动添加 `LIMIT 1000`
- 查询结果会显示在下方表格中
- 支持列排序和分页

### 4. 自然语言生成 SQL

1. 在 **Query Workspace** 中切换到 **Natural Language** 标签页
2. 用自然语言描述你想查询的内容，例如:
   - "显示最近 30 天创建的所有用户"
   - "查询订单金额大于 1000 的订单"
   - "统计每个部门的员工数量"
3. 点击 **Generate SQL**
4. 系统会生成对应的 SQL 语句并显示解释
5. 检查生成的 SQL，可以手动编辑修改
6. 点击 **Run Query** 执行查询

## Makefile 命令

| 命令 | 说明 |
|------|------|
| `make help` | 显示帮助信息 |
| `make install` | 安装所有依赖 |
| `make dev` | 开发模式启动 (前台) |
| `make start` | 后台启动服务 |
| `make stop` | 停止所有服务 |
| `make restart` | 重启服务 |
| `make clean` | 清理构建产物 |
| `make test` | 运行测试 |
| `make lint` | 代码检查 |
| `make backend` | 仅启动后端 |
| `make frontend` | 仅启动前端 |

## 项目结构

```
sql-query/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI 应用入口
│   │   ├── models/              # Pydantic 数据模型
│   │   │   ├── common.py        # 公共类型和枚举
│   │   │   ├── connection.py    # 连接相关模型
│   │   │   ├── metadata.py      # 元数据模型
│   │   │   └── query.py         # 查询模型
│   │   ├── services/            # 业务逻辑服务
│   │   │   ├── databaseDriver.py    # 数据库驱动协议
│   │   │   ├── connectionManager.py # 连接管理
│   │   │   ├── queryValidator.py    # SQL 验证
│   │   │   ├── queryExecutor.py     # 查询执行
│   │   │   ├── sqlGenerator.py      # LLM SQL 生成
│   │   │   ├── encryption.py        # 加密服务
│   │   │   └── drivers/             # 数据库驱动实现
│   │   │       └── mysqlDriver.py
│   │   ├── api/                 # API 路由
│   │   │   ├── connections.py
│   │   │   ├── metadata.py
│   │   │   ├── queries.py
│   │   │   └── generation.py
│   │   └── db/
│   │       └── sqlite.py        # SQLite 数据库
│   ├── pyproject.toml
│   └── tests/
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # 应用主入口
│   │   ├── types/               # TypeScript 类型定义
│   │   ├── providers/           # Refine 数据提供者
│   │   ├── components/          # 可复用组件
│   │   │   ├── connectionForm.tsx
│   │   │   ├── metadataBrowser.tsx
│   │   │   ├── sqlEditor.tsx
│   │   │   └── resultTable.tsx
│   │   └── pages/               # 页面组件
│   │       ├── connectionList.tsx
│   │       ├── databaseExplorer.tsx
│   │       └── queryWorkspace.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── specs/                       # 功能规格文档
├── Makefile
└── README.md
```

## API 端点

### 连接管理
- `POST /api/connections` - 创建新连接
- `GET /api/connections` - 列出所有连接
- `GET /api/connections/{id}` - 获取连接详情
- `DELETE /api/connections/{id}` - 删除连接
- `POST /api/connections/{id}/refresh` - 刷新元数据

### 元数据
- `GET /api/connections/{id}/tables` - 列出所有表和视图
- `GET /api/connections/{id}/tables/{tableId}` - 获取表详情和列信息

### 查询
- `POST /api/connections/{id}/query` - 执行 SQL 查询
- `GET /api/connections/{id}/history` - 获取查询历史

### SQL 生成
- `POST /api/connections/{id}/generate-sql` - 自然语言生成 SQL

## 安全说明

- 数据库连接密码使用 Fernet 对称加密存储
- 仅支持 SELECT 查询，防止数据修改
- 自动添加 LIMIT 限制，防止大量数据查询
- 支持多语句查询拒绝，防止 SQL 注入

## 开发

```bash
# 运行后端测试
cd backend
uv run pytest

# 后端代码检查
cd backend
uv run ruff check .

# 前端代码检查
cd frontend
npm run lint

# 构建前端生产版本
cd frontend
npm run build
```

## 许可证

MIT License
