# Institutions

这是一个数据库查询工具，用户可以添加一个 db url，系统会连接到数据库，获取数据库的 metadata，然后将数据库中的 table 和 view 展示出来，然后用户可以自己输入 sql 语句，也可以通过自然语言来生成 sql 查询。

基本想法：

- 数据库连接和数据库的 metadata 都会存储到 sqllite 数据库中，我们可以根据不同的数据类型来查询系统的表和视图的信息，然后用 LLM 将这些信息转换成 json 格式，存储到 sqllite 数据库中，这个信息可以以后服用。

- 当用户使用 LLM 来生成 SQL 查询时，我们可以把系统中的表和视图信息作为 context 传递给 LLM，然后 LLM 根据这些信息来生成 SQL 查询。

- 任何输入的 SQL 语句，都需要经过 sqlparser 解析，确保语法正确，并且仅包含 SELECT 语句，如果语法不正确，需要给出错误信息，如果查询不包含 LIMIT 子句，则默认添加 LIIMIT 1000。

- 输出格式是 JSON，前端将其组织成表格并展示

技术选型：

- 后端使用 Python(uv)/FastAPI/sqlglot/openapi sdk
- 前端使用 React/refine5/tailwind/ant design 来实现，sql editor 使用 monaco editor 来实现
- OpenAI 相关配置放在 .env 文件，数据库连接和 metadata 存储在 sqllite 数据库中，放在 ./db_query/db_query.db 中
- 接口要符合 RESTFul API 风格
- 后端 API 需要支持 CORS，允许所有 origin，大致 API 如下

```
# 获取所有已存储的数据库
GET /api/v1/dbs

# 添加一个数据库
PUT /api/v1/dbs/{name}
{
    "url":"dsn",
    "name":""
}

# 查询某个数据库的 metadta
GET /api/v1/dbs/{name}

# 查询某个数据库的信息
GET /api/v1/dbs/{name}/query

# 根据自然语言生成 SQL
POST /api/v1/dbs/{name}/query/natural
{
    "prompt":"查询所有用户信息"
}
```

# constitution

- 后端使用 Ergonomic Python 风格来编写代码，前端使用 typescript
- 前后端都要有严格的类型标准
- 使用 pydantic 来定义数据模型
- 类、字段、函数命名使用 camelCase 格式