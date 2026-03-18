# Research: SQL Query Tool

**Feature**: 001-sql-query-tool
**Date**: 2026-03-18

## R-001: SQL Parsing with sqlglot

**Decision**: Use sqlglot for SQL parsing, validation, and AST manipulation.

**Rationale**: sqlglot is a pure-Python SQL parser that supports MySQL
dialect, can parse SQL into an AST, detect statement types (SELECT vs
INSERT/UPDATE/DELETE), check for LIMIT clauses, and programmatically
add LIMIT nodes. No external C dependencies required.

**Alternatives considered**:
- `sqlparse`: Simpler but less reliable for AST manipulation; cannot
  reliably add LIMIT clauses programmatically.
- `python-sqlparser`: C-based, harder to install, less maintained.

**Key usage patterns**:
```python
import sqlglot
from sqlglot import exp

# Parse and validate
parsed = sqlglot.parse(sql, dialect="mysql")
# Check statement type
if not isinstance(parsed[0], exp.Select):
    raise ValueError("Only SELECT statements allowed")
# Check/add LIMIT
if parsed[0].args.get("limit") is None:
    parsed[0] = parsed[0].limit(1000)
```

## R-002: Database Driver Interface (Strategy Pattern)

**Decision**: Define a `databaseDriver` Protocol (abstract interface)
with concrete implementations per database type. Use a driver registry
to resolve the correct implementation by `dbType`.

**Rationale**: Different databases have different connection libraries,
metadata queries, and SQL dialects. The strategy pattern isolates these
differences behind a common interface, making it trivial to add new
database support without modifying existing code.

**Interface definition** (`databaseDriver` Protocol):
```python
class databaseDriver(Protocol):
    dialect: str  # sqlglot dialect name (e.g., "mysql", "postgres")

    async def testConnection(self, connectionUrl: str) -> bool: ...
    async def extractMetadata(self, connectionUrl: str) -> metadataResult: ...
    async def executeQuery(self, connectionUrl: str, sql: str) -> queryRawResult: ...
```

**Driver registry**:
```python
_drivers: dict[str, type[databaseDriver]] = {}

def registerDriver(dbType: str, driver: type[databaseDriver]) -> None:
    _drivers[dbType] = driver

def getDriver(dbType: str) -> databaseDriver:
    if dbType not in _drivers:
        raise ValueError(f"Unsupported database type: {dbType}")
    return _drivers[dbType]()
```

**Initial implementation**: MySQL driver only. The registry makes adding
PostgreSQL, SQLite, etc. a matter of writing a new driver class and
calling `registerDriver`.

## R-002a: MySQL Driver Implementation

**Decision**: Implement `mysqlDriver` using `aiomysql` for async MySQL
connections. Use `INFORMATION_SCHEMA` queries for metadata extraction.

**Rationale**: `INFORMATION_SCHEMA` is the standard SQL way to query
metadata in MySQL. `aiomysql` provides native async MySQL protocol
support compatible with FastAPI.

**Key queries**:
- `SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?`
- `SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ?`
- `SELECT * FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ?`

**Alternatives considered**:
- `SQLAlchemy inspect()`: Heavier dependency for a simple metadata read.
- `SHOW TABLES` / `DESCRIBE`: Non-standard, less structured output.

## R-003: LLM Integration via OpenAI SDK

**Decision**: Use the OpenAI Python SDK with `OPENAI_API_KEY` from
environment. Use `gpt-4o` model for SQL generation with structured
system prompt containing database metadata context.

**Rationale**: OpenAI SDK is well-maintained, supports async, and the
user explicitly specified it. The API key is read from environment
variable `OPENAI_API_KEY`.

**Prompt strategy**:
1. System message: Include full table/column metadata as context.
2. User message: The natural language query.
3. Response format: Request raw SQL only, no markdown fencing.
4. Post-process: Run generated SQL through sqlglot validation pipeline.

## R-004: SQLite for Local Storage

**Decision**: Use aiosqlite for async SQLite access. Database file at
`./db_query/db_query.db`. Store connection configs and cached metadata.

**Rationale**: SQLite is zero-config, file-based, and ideal for local
caching. aiosqlite provides async interface compatible with FastAPI's
async handlers.

**Schema considerations**:
- `connections` table: id, displayName, connectionUrl (encrypted),
  dbType, createdAt, updatedAt
- `tables` table: id, connectionId, name, type (TABLE/VIEW), schema
- `columns` table: id, tableId, name, dataType, nullable, keyType,
  defaultValue, ordinalPosition

## R-005: Frontend Stack (React + Refine 5 + Ant Design + Tailwind)

**Decision**: Use Refine v5 as the application framework with Ant
Design as the UI component library, Tailwind CSS for custom styling,
and Monaco Editor for the SQL editor.

**Rationale**: Refine v5 provides data provider abstractions, routing,
and CRUD scaffolding. Ant Design provides Table, Form, Layout
components. Monaco Editor provides syntax highlighting, autocomplete
support, and a professional code editing experience.

**Key packages**:
- `@refinedev/core`, `@refinedev/antd`, `@refinedev/react-router`
- `antd`, `@ant-design/icons`
- `tailwindcss`
- `@monaco-editor/react`

## R-006: Credential Encryption

**Decision**: Use `cryptography.Fernet` for symmetric encryption of
connection URLs at rest. Derive encryption key from a machine-specific
secret or environment variable.

**Rationale**: FR-014 requires connection URLs with passwords to be
encrypted at rest. Fernet provides authenticated encryption with a
simple API. The encryption key can be derived from an environment
variable `DB_QUERY_SECRET_KEY` or generated and stored locally on first
run.

**Alternatives considered**:
- `keyring`: OS-dependent, harder in server/container environments.
- Plain base64: Not encryption, just encoding.

## R-007: Database Connectivity Strategy

**Decision**: Each database type provides its own async driver behind
the `databaseDriver` interface. MySQL uses `aiomysql`, future
PostgreSQL support would use `asyncpg`, etc.

**Rationale**: FastAPI is async-first; each driver MUST provide async
methods. The strategy pattern ensures the service layer (connectionManager,
queryExecutor) never imports database-specific libraries directly —
they only depend on the `databaseDriver` Protocol.

**MySQL driver**: `aiomysql` with connection pooling via
`aiomysql.create_pool()`.

**Adding a new database type**:
1. Create `backend/app/services/drivers/newDbDriver.py`
2. Implement `databaseDriver` Protocol
3. Register in `backend/app/services/drivers/__init__.py`
4. Add dbType enum value in `backend/app/models/common.py`

**Alternatives considered**:
- `pymysql`: Synchronous, would block the event loop.
- `SQLAlchemy async`: Over-engineered for raw query execution.
