# API Contracts: SQL Query Tool

**Feature**: 001-sql-query-tool
**Date**: 2026-03-18
**Base URL**: `/api`

## Connections

### POST /api/connections

Create a new database connection.

**Request**:
```json
{
  "displayName": "My MySQL DB",
  "connectionUrl": "mysql://user:pass@host:3306/dbname"
}
```

**Response** (201):
```json
{
  "id": 1,
  "displayName": "My MySQL DB",
  "dbType": "mysql",
  "status": "active",
  "createdAt": "2026-03-18T10:00:00Z",
  "updatedAt": "2026-03-18T10:00:00Z"
}
```

**Errors**:
- 400: Invalid connection URL format
- 422: Connection failed (unreachable host, auth failure)

---

### GET /api/connections

List all database connections.

**Response** (200):
```json
[
  {
    "id": 1,
    "displayName": "My MySQL DB",
    "dbType": "mysql",
    "status": "active",
    "createdAt": "2026-03-18T10:00:00Z",
    "updatedAt": "2026-03-18T10:00:00Z"
  }
]
```

---

### DELETE /api/connections/{connectionId}

Remove a database connection and its cached metadata.

**Response** (204): No content

**Errors**:
- 404: Connection not found

---

### POST /api/connections/{connectionId}/refresh

Re-extract metadata from the remote database, replacing cached data.

**Response** (200):
```json
{
  "tablesCount": 15,
  "viewsCount": 3,
  "fetchedAt": "2026-03-18T10:05:00Z"
}
```

**Errors**:
- 404: Connection not found
- 422: Connection failed

## Metadata

### GET /api/connections/{connectionId}/tables

List all tables and views for a connection (from cache).

**Query Parameters**:
- `type` (optional): Filter by "TABLE" or "VIEW"

**Response** (200):
```json
[
  {
    "id": 1,
    "name": "users",
    "schemaName": "mydb",
    "type": "TABLE",
    "comment": "User accounts",
    "columnCount": 8,
    "fetchedAt": "2026-03-18T10:00:00Z"
  }
]
```

---

### GET /api/connections/{connectionId}/tables/{tableId}

Get detailed table metadata including all columns.

**Response** (200):
```json
{
  "id": 1,
  "name": "users",
  "schemaName": "mydb",
  "type": "TABLE",
  "comment": "User accounts",
  "fetchedAt": "2026-03-18T10:00:00Z",
  "columns": [
    {
      "id": 1,
      "name": "id",
      "dataType": "INT",
      "nullable": false,
      "keyType": "primary",
      "defaultValue": null,
      "ordinalPosition": 1,
      "comment": "Auto-increment ID"
    }
  ]
}
```

## Queries

### POST /api/connections/{connectionId}/query

Execute a SQL query against the connected database.

**Request**:
```json
{
  "sql": "SELECT * FROM users WHERE active = 1",
  "source": "manual"
}
```

**Response** (200):
```json
{
  "columns": ["id", "name", "email", "active"],
  "rows": [
    {"id": 1, "name": "Alice", "email": "alice@example.com", "active": 1}
  ],
  "rowCount": 1,
  "limitApplied": true,
  "executionTimeMs": 45
}
```

**Errors**:
- 400: SQL syntax error (includes parse error details)
- 400: Non-SELECT statement rejected
- 404: Connection not found
- 422: Query execution failed (database error)

---

### POST /api/connections/{connectionId}/generate-sql

Generate SQL from natural language using LLM.

**Request**:
```json
{
  "naturalLanguage": "show me all active users created this month"
}
```

**Response** (200):
```json
{
  "generatedSql": "SELECT * FROM users WHERE active = 1 AND created_at >= '2026-03-01' LIMIT 1000",
  "explanation": "Filters users table for active users created in March 2026"
}
```

**Errors**:
- 404: Connection not found (or no metadata cached)
- 422: LLM generation failed
- 503: LLM service unavailable

## Query History

### GET /api/connections/{connectionId}/history

Get query execution history for a connection.

**Query Parameters**:
- `limit` (optional, default 50): Max results
- `offset` (optional, default 0): Pagination offset

**Response** (200):
```json
[
  {
    "id": 1,
    "sqlText": "SELECT * FROM users LIMIT 1000",
    "source": "manual",
    "naturalLanguageInput": null,
    "status": "success",
    "rowCount": 42,
    "executedAt": "2026-03-18T10:10:00Z",
    "durationMs": 45
  }
]
```

## Common Error Response Format

All error responses follow this structure:

```json
{
  "detail": "Human-readable error message",
  "errorType": "validation_error | connection_error | parse_error | execution_error | llm_error",
  "context": {}
}
```
