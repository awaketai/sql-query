# Data Model: SQL Query Tool

**Feature**: 001-sql-query-tool
**Date**: 2026-03-18

## Entities

### databaseConnection

Represents a user-configured remote database connection.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | integer | PK, auto-increment | Unique identifier |
| displayName | string | required, max 255 | User-friendly name |
| connectionUrl | string | required, encrypted | Database URL (encrypted at rest) |
| dbType | enum | required | Database engine type (mysql, postgresql, sqlite, etc.) |
| status | enum | required | active, inactive, error |
| createdAt | datetime | required | When connection was added |
| updatedAt | datetime | required | Last modification time |

**Relationships**: One databaseConnection has many tableMetadata.

---

### tableMetadata

Represents a table or view discovered in the connected database.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | integer | PK, auto-increment | Unique identifier |
| connectionId | integer | FK → databaseConnection.id | Parent connection |
| name | string | required | Table or view name |
| schemaName | string | required | Database schema name |
| type | enum | required | TABLE or VIEW |
| comment | string | optional | Table comment from DB |
| fetchedAt | datetime | required | When metadata was extracted |

**Relationships**: Belongs to one databaseConnection. Has many
columnMetadata.

---

### columnMetadata

Represents a column within a table or view.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | integer | PK, auto-increment | Unique identifier |
| tableId | integer | FK → tableMetadata.id | Parent table |
| name | string | required | Column name |
| dataType | string | required | SQL data type (VARCHAR, INT, etc.) |
| nullable | boolean | required | Whether column allows NULL |
| keyType | enum | required | primary, foreign, unique, none |
| defaultValue | string | optional | Default value expression |
| ordinalPosition | integer | required | Column order in table |
| comment | string | optional | Column comment from DB |

**Relationships**: Belongs to one tableMetadata.

---

### queryHistory

Represents a single query execution record.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | integer | PK, auto-increment | Unique identifier |
| connectionId | integer | FK → databaseConnection.id | Target database |
| sqlText | string | required | The executed SQL statement |
| source | enum | required | manual, llmGenerated |
| naturalLanguageInput | string | optional | Original NL input (if LLM) |
| status | enum | required | success, error |
| rowCount | integer | optional | Number of rows returned |
| errorMessage | string | optional | Error details if failed |
| executedAt | datetime | required | Execution timestamp |
| durationMs | integer | optional | Query execution time in ms |

**Relationships**: Belongs to one databaseConnection.

## SQLite Schema (local storage: ./db_query/db_query.db)

All entities above are stored in the local SQLite database. The SQLite
database serves as both the application's configuration store and the
metadata cache.

## Validation Rules

- `connectionUrl` MUST be encrypted before storage (Fernet).
- `displayName` MUST be unique per user session.
- `type` on tableMetadata MUST be either "TABLE" or "VIEW".
- `keyType` on columnMetadata MUST be one of: primary, foreign, unique,
  none.
- `source` on queryHistory MUST be one of: manual, llmGenerated.
- `status` on queryHistory MUST be one of: success, error.

## State Transitions

### databaseConnection.status

```
inactive → active    (successful connection test)
active → error       (connection failure detected)
error → active       (successful reconnection)
active → inactive    (user disconnects)
```
