# Implementation Plan: SQL Query Tool

**Branch**: `001-sql-query-tool` | **Date**: 2026-03-18 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-sql-query-tool/spec.md`

## Summary

Build a web-based SQL query tool that lets users connect to databases
via URL, browse table/view metadata (cached in SQLite), execute
validated SELECT queries, and generate SQL from natural language using
an LLM. Database access is abstracted behind a `databaseDriver`
Protocol (strategy pattern) with per-dbType implementations; the
initial release ships a MySQL driver. Backend is Python/FastAPI with
sqlglot for SQL validation; frontend is React/Refine 5 with Monaco
Editor for SQL editing.

## Technical Context

**Language/Version**: Python 3.13+ (backend), TypeScript (frontend)
**Primary Dependencies**: FastAPI, sqlglot, openai SDK, aiomysql,
aiosqlite, cryptography (backend); React, Refine v5, Ant Design,
Tailwind CSS, Monaco Editor (frontend)
**Storage**: SQLite (local metadata cache at `./db_query/db_query.db`),
remote target databases (MySQL initially, extensible via driver interface)
**Testing**: pytest (backend), vitest (frontend)
**Target Platform**: Web application (localhost / deployable)
**Project Type**: Web application (backend API + frontend SPA)
**Performance Goals**: Metadata extraction <30s, query results <5s,
cached metadata load <2s
**Constraints**: SELECT-only queries, auto LIMIT 1000, encrypted
credential storage
**Scale/Scope**: Single-user tool, multiple database connections

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Ergonomic Python + TypeScript | PASS | Backend = Python 3.13+, Frontend = TypeScript strict |
| II. Strict Type Safety | PASS | Full type annotations in Python, strict TS config |
| III. Pydantic Data Models | PASS | All API schemas and DB models use Pydantic |
| IV. camelCase Naming | PASS | camelCase for classes, fields, functions; Pydantic alias for DB columns |

**Post-Phase 1 Re-check**: All principles satisfied. Pydantic models
defined for every entity. API contracts use camelCase field names.
SQLite columns use camelCase with Pydantic serialization handling any
mapping.

## Project Structure

### Documentation (this feature)

```text
specs/001-sql-query-tool/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── api.md           # REST API contracts
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── main.py              # FastAPI application entry point
│   ├── models/
│   │   ├── connection.py    # databaseConnection Pydantic models
│   │   ├── metadata.py      # tableMetadata, columnMetadata models
│   │   ├── query.py         # queryHistory, query request/response models
│   │   └── common.py        # Shared types, enums, error models
│   ├── services/
│   │   ├── databaseDriver.py     # databaseDriver Protocol (interface)
│   │   ├── drivers/
│   │   │   ├── __init__.py       # Driver registry (getDriver, registerDriver)
│   │   │   └── mysqlDriver.py    # MySQL implementation of databaseDriver
│   │   ├── connectionManager.py  # DB connection lifecycle (uses driver registry)
│   │   ├── queryValidator.py     # sqlglot parsing & validation (dialect from driver)
│   │   ├── queryExecutor.py      # Query execution (delegates to driver)
│   │   ├── sqlGenerator.py       # LLM-based SQL generation
│   │   └── encryption.py         # Fernet encryption for credentials
│   ├── api/
│   │   ├── connections.py    # /api/connections routes
│   │   ├── metadata.py       # /api/connections/{id}/tables routes
│   │   ├── queries.py        # /api/connections/{id}/query routes
│   │   └── generation.py     # /api/connections/{id}/generate-sql routes
│   └── db/
│       ├── sqlite.py         # SQLite connection & schema init
│       └── migrations.py     # Schema versioning
├── pyproject.toml
└── tests/
    ├── test_queryValidator.py
    ├── test_metadataExtractor.py
    └── test_sqlGenerator.py

frontend/
├── src/
│   ├── App.tsx               # Refine app root with routing
│   ├── components/
│   │   ├── sqlEditor.tsx     # Monaco Editor wrapper
│   │   ├── resultTable.tsx   # Ant Design Table for query results
│   │   ├── metadataBrowser.tsx  # Table/view/column tree browser
│   │   └── connectionForm.tsx   # Add/edit connection form
│   ├── pages/
│   │   ├── connectionList.tsx   # Connections management page
│   │   ├── databaseExplorer.tsx # Metadata browsing page
│   │   └── queryWorkspace.tsx   # SQL editor + results page
│   ├── providers/
│   │   └── dataProvider.ts   # Refine data provider for backend API
│   └── types/
│       └── index.ts          # Shared TypeScript interfaces
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
└── tests/
```

**Structure Decision**: Web application layout with separate `backend/`
and `frontend/` directories. Backend follows FastAPI conventions with
models/services/api layering. Frontend uses Refine v5 project structure
with pages, components, and providers.

## Complexity Tracking

> No constitution violations detected. No entries needed.
