# Tasks: SQL Query Tool

**Input**: Design documents from `/specs/001-sql-query-tool/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/api.md

**Tests**: Not explicitly requested in the feature specification. Test tasks are omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: Project initialization and basic structure

- [ ] T001 Create backend project structure with `backend/app/__init__.py`, `backend/app/models/`, `backend/app/services/`, `backend/app/services/drivers/`, `backend/app/api/`, `backend/app/db/` directories and `backend/pyproject.toml` with dependencies (fastapi, uvicorn, sqlglot, openai, aiomysql, aiosqlite, cryptography, pydantic)
- [ ] T002 [P] Create frontend project using Vite + React + TypeScript at `frontend/`, install dependencies (@refinedev/core, @refinedev/antd, @refinedev/react-router, antd, @ant-design/icons, @monaco-editor/react, tailwindcss), configure `frontend/tsconfig.json` with `strict: true`, `frontend/tailwind.config.js`, and `frontend/vite.config.ts`
- [ ] T003 [P] Create shared Pydantic enums and error models in `backend/app/models/common.py`: dbType enum (mysql — extensible for postgresql, sqlite, etc.), connectionStatus enum (active, inactive, error), tableType enum (TABLE, VIEW), keyType enum (primary, foreign, unique, none), querySource enum (manual, llmGenerated), queryStatus enum (success, error), and errorResponse model with detail/errorType/context fields. All names camelCase per constitution.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [ ] T004 Implement SQLite database initialization and schema creation in `backend/app/db/sqlite.py`: async connection factory for `./db_query/db_query.db`, CREATE TABLE statements for connections, tables, columns, queryHistory tables. Ensure `db_query/` directory is created if missing. All column names camelCase.
- [ ] T005 Implement Fernet encryption service in `backend/app/services/encryption.py`: functions `encryptValue(plaintext: str) -> str` and `decryptValue(ciphertext: str) -> str`. Read key from `DB_QUERY_SECRET_KEY` env var; if not set, generate and store key in `./db_query/.secret_key` on first run.
- [ ] T006 Define `databaseDriver` Protocol in `backend/app/services/databaseDriver.py`: abstract interface with `dialect: str` property, `async testConnection(connectionUrl: str) -> bool`, `async extractMetadata(connectionUrl: str) -> metadataResult`, `async executeQuery(connectionUrl: str, sql: str) -> queryRawResult`. Define `metadataResult` and `queryRawResult` as Pydantic models (metadataResult: list of table dicts with columns; queryRawResult: columns list + rows list of dicts). All names camelCase.
- [ ] T007 Create driver registry in `backend/app/services/drivers/__init__.py`: `registerDriver(dbType: str, driverClass: type[databaseDriver]) -> None` and `getDriver(dbType: str) -> databaseDriver` functions. Registry is a module-level dict. Raise ValueError for unsupported dbType. Auto-register all built-in drivers on import.
- [ ] T008 Implement MySQL driver in `backend/app/services/drivers/mysqlDriver.py`: class `mysqlDriver` implementing `databaseDriver` Protocol. Set `dialect = "mysql"`. `testConnection`: create aiomysql connection and close. `extractMetadata`: query INFORMATION_SCHEMA.TABLES, INFORMATION_SCHEMA.COLUMNS, INFORMATION_SCHEMA.KEY_COLUMN_USAGE, return metadataResult. `executeQuery`: connect via aiomysql, execute SQL, return queryRawResult with columns from cursor.description and rows as list of dicts. Register with `registerDriver("mysql", mysqlDriver)`.
- [ ] T009 [P] Create FastAPI application entry point in `backend/app/main.py`: create FastAPI app instance, configure CORS middleware (allow frontend origin), include API routers, add lifespan handler to initialize SQLite database on startup. Import drivers package to trigger auto-registration.
- [ ] T010 [P] Create Refine app root in `frontend/src/App.tsx`: configure Refine with Ant Design, React Router, and custom data provider. Set up routing for connectionList, databaseExplorer, and queryWorkspace pages. Create layout with Ant Design sidebar navigation.
- [ ] T011 [P] Create TypeScript type definitions in `frontend/src/types/index.ts`: interfaces for databaseConnection (with dbType as union type string), tableMetadata, columnMetadata, queryHistory, queryRequest, queryResponse, generateSqlRequest, generateSqlResponse, errorResponse matching API contracts (all camelCase).
- [ ] T012 [P] Create Refine data provider in `frontend/src/providers/dataProvider.ts`: implement custom data provider that maps Refine CRUD operations to backend REST API endpoints at `/api`. Handle JSON request/response serialization.

**Checkpoint**: Foundation ready — driver interface, MySQL driver, and infrastructure in place. User story implementation can now begin.

---

## Phase 3: User Story 1 - Connect Database and Browse Metadata (Priority: P1)

**Goal**: Users can add a database connection URL, system extracts and caches metadata, and users can browse tables/views/columns.

**Independent Test**: Add a valid MySQL connection URL and verify tables/views appear with column details.

### Implementation for User Story 1

- [ ] T013 [P] [US1] Create databaseConnection Pydantic models in `backend/app/models/connection.py`: createConnectionRequest (displayName, connectionUrl, dbType with default "mysql"), connectionResponse (id, displayName, dbType, status, createdAt, updatedAt), refreshResponse (tablesCount, viewsCount, fetchedAt). Use camelCase field names.
- [ ] T014 [P] [US1] Create tableMetadata and columnMetadata Pydantic models in `backend/app/models/metadata.py`: tableListItem (id, name, schemaName, type, comment, columnCount, fetchedAt), tableDetail (extends tableListItem with columns list), columnDetail (id, name, dataType, nullable, keyType, defaultValue, ordinalPosition, comment). Use camelCase field names.
- [ ] T015 [US1] Implement connectionManager service in `backend/app/services/connectionManager.py`: async functions createConnection (parse dbType from request, resolve driver via `getDriver(dbType)`, call `driver.testConnection()`, encrypt URL, store in SQLite, call `driver.extractMetadata()`, store metadata in SQLite, return connectionResponse), listConnections (query SQLite, return list), deleteConnection (cascade delete metadata and history), getConnection (by id). The service MUST NOT import any database-specific library — it only depends on the databaseDriver Protocol and driver registry.
- [ ] T016 [US1] Implement connections API routes in `backend/app/api/connections.py`: POST /api/connections (create with dbType field), GET /api/connections (list), DELETE /api/connections/{connectionId} (delete), POST /api/connections/{connectionId}/refresh (look up dbType from stored connection, resolve driver, re-extract metadata). Wire to connectionManager. Return proper error responses per contracts/api.md.
- [ ] T017 [US1] Implement metadata API routes in `backend/app/api/metadata.py`: GET /api/connections/{connectionId}/tables (list with optional type filter), GET /api/connections/{connectionId}/tables/{tableId} (detail with columns). Query SQLite cache, return Pydantic models serialized as JSON.
- [ ] T018 [P] [US1] Create connectionForm component in `frontend/src/components/connectionForm.tsx`: Ant Design Form with displayName (Input), connectionUrl (Input.Password), and dbType (Select dropdown, options: MySQL, with placeholder for future types) fields. On submit, POST to /api/connections. Show success/error notification via Ant Design message.
- [ ] T019 [P] [US1] Create metadataBrowser component in `frontend/src/components/metadataBrowser.tsx`: Ant Design Tree or Collapse showing tables and views grouped by type. Each table node expands to show columns with data type, nullable, and key type badges. Use Ant Design Tag for column types.
- [ ] T020 [US1] Create connectionList page in `frontend/src/pages/connectionList.tsx`: Ant Design Table listing all connections with displayName, dbType, status, createdAt columns. Actions: delete button, refresh metadata button. "Add Connection" button opens connectionForm modal. dbType column shows database type badge.
- [ ] T021 [US1] Create databaseExplorer page in `frontend/src/pages/databaseExplorer.tsx`: connection selector dropdown at top (switch between databases, showing dbType), metadataBrowser component below showing tables/views for selected connection. Refresh button to re-extract metadata.

**Checkpoint**: User Story 1 complete. Users can add database connections (with dbType selection), browse tables/views/columns from cached metadata, refresh metadata, and manage multiple connections.

---

## Phase 4: User Story 2 - Execute Manual SQL Queries (Priority: P2)

**Goal**: Users can write SQL in Monaco Editor, system validates (SELECT-only, syntax, auto-LIMIT), executes against the database via driver, and displays results as a table.

**Independent Test**: Connect a database, type `SELECT * FROM some_table`, execute, and verify results appear as a formatted table.

### Implementation for User Story 2

- [ ] T022 [P] [US2] Create query Pydantic models in `backend/app/models/query.py`: queryRequest (sql, source), queryResponse (columns list, rows list of dicts, rowCount, limitApplied, executionTimeMs), queryHistoryItem (id, sqlText, source, naturalLanguageInput, status, rowCount, executedAt, durationMs). Use camelCase field names.
- [ ] T023 [US2] Implement queryValidator service in `backend/app/services/queryValidator.py`: function `validateAndPrepare(sql: str, dialect: str) -> tuple[str, bool]` that uses sqlglot to (1) parse SQL with the specified dialect (resolved from the connection's driver), (2) reject multi-statement queries, (3) reject non-SELECT statements with descriptive error, (4) check for LIMIT clause and add `LIMIT 1000` if missing, (5) return the (possibly modified) SQL string and a boolean indicating if LIMIT was auto-applied. Accept dialect as parameter so it works for any database type. Raise ValueError with parse error details on syntax errors.
- [ ] T024 [US2] Implement queryExecutor service in `backend/app/services/queryExecutor.py`: async function `executeQuery(connectionId, sql, source)` that (1) loads connection from SQLite to get dbType, (2) resolves driver via `getDriver(dbType)`, (3) validates SQL via queryValidator with `driver.dialect`, (4) decrypts connection URL, (5) calls `driver.executeQuery(connectionUrl, validatedSql)`, (6) records execution in queryHistory table (SQLite), (7) returns queryResponse. The service MUST NOT import any database-specific library.
- [ ] T025 [US2] Implement query API routes in `backend/app/api/queries.py`: POST /api/connections/{connectionId}/query (validate via queryValidator, execute via queryExecutor, return queryResponse or error), GET /api/connections/{connectionId}/history (paginated query history from SQLite). Return 400 for parse/validation errors, 422 for execution errors per contracts/api.md.
- [ ] T026 [P] [US2] Create sqlEditor component in `frontend/src/components/sqlEditor.tsx`: Monaco Editor wrapper with SQL language mode. Props: value, onChange, onExecute (Ctrl+Enter / Cmd+Enter shortcut). Set reasonable defaults (minimap off, line numbers on, word wrap on).
- [ ] T027 [P] [US2] Create resultTable component in `frontend/src/components/resultTable.tsx`: Ant Design Table that renders queryResponse data. Dynamic columns from response.columns array. Sortable columns. Show rowCount, executionTimeMs, and "LIMIT 1000 auto-applied" badge if limitApplied is true. Handle empty results with "No results found" message showing column headers.
- [ ] T028 [US2] Create queryWorkspace page in `frontend/src/pages/queryWorkspace.tsx`: connection selector dropdown, sqlEditor component, "Run" button (also bound to Ctrl+Enter), resultTable below. Show loading spinner during query execution. Display error messages from API in Ant Design Alert component. Integrate with POST /api/connections/{connectionId}/query.

**Checkpoint**: User Story 2 complete. Users can write SQL queries in Monaco Editor, get validation feedback (using the correct dialect for their database type), auto-LIMIT enforcement, and see results in a sortable table.

---

## Phase 5: User Story 3 - Natural Language SQL Generation (Priority: P3)

**Goal**: Users describe queries in natural language, LLM generates SQL using database metadata as context, user reviews/edits before execution.

**Independent Test**: Connect a database, type "show me all users", verify a valid SELECT query is generated and displayed for review.

### Implementation for User Story 3

- [ ] T029 [US3] Implement sqlGenerator service in `backend/app/services/sqlGenerator.py`: async function `generateSql(connectionId, naturalLanguage)` that (1) loads connection from SQLite to get dbType, (2) resolves driver via `getDriver(dbType)` to get `driver.dialect`, (3) loads all table/column metadata for the connection from SQLite, (4) formats metadata as structured context including the database type and dialect, (5) calls OpenAI API (gpt-4o) with system prompt containing metadata context, dialect info, and user prompt containing natural language input, (6) extracts raw SQL from response, (7) validates generated SQL through queryValidator with correct dialect, (8) returns generatedSql and explanation. Read OPENAI_API_KEY from env. Handle API errors and return appropriate error types.
- [ ] T030 [US3] Implement SQL generation API route in `backend/app/api/generation.py`: POST /api/connections/{connectionId}/generate-sql (accept naturalLanguage, call sqlGenerator service, return generatedSql + explanation). Return 404 if no metadata cached, 422 if LLM generation fails, 503 if OpenAI service unavailable.
- [ ] T031 [US3] Add natural language input mode to queryWorkspace page in `frontend/src/pages/queryWorkspace.tsx`: add toggle/tab between "SQL" and "Natural Language" modes. In NL mode, show Ant Design TextArea for natural language input and "Generate SQL" button. On generate: call POST /api/connections/{connectionId}/generate-sql, populate the Monaco Editor with generatedSql, show explanation in an info banner, let user review/edit before clicking "Run". Show loading state during LLM generation. Show error alert if LLM unavailable with suggestion to use manual SQL mode.

**Checkpoint**: All user stories complete. Users can connect databases, browse metadata, write SQL manually, and generate SQL from natural language — all via the driver interface.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T032 [P] Add error handling middleware in `backend/app/main.py`: catch ValueError (validation errors → 400), ConnectionError (DB connection errors → 422), OpenAI API errors (→ 503), generic exceptions (→ 500). Format all errors using errorResponse model from common.py.
- [ ] T033 [P] Add connection status indicator to frontend layout in `frontend/src/App.tsx`: show current connection status (active/error/inactive) in the header or sidebar. Auto-refresh connection status on page load.
- [ ] T034 Run quickstart.md validation: verify backend starts with `uv run uvicorn app.main:app`, frontend starts with `npm run dev`, and end-to-end flow works (add connection → browse metadata → run query → generate SQL).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion
- **User Story 2 (Phase 4)**: Depends on Foundational phase completion (can run in parallel with US1 for backend, but frontend queryWorkspace needs connection selector from US1)
- **User Story 3 (Phase 5)**: Depends on US1 (metadata for LLM context) and US2 (query execution pipeline, queryWorkspace page)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Backend (T022-T025) can start after Foundational in parallel with US1. Frontend (T026-T028) depends on US1 frontend for connection selector component.
- **User Story 3 (P3)**: Backend (T029-T030) depends on US1 metadata services. Frontend (T031) extends US2 queryWorkspace page.

### Within Each User Story

- Models before services (models define data shapes services use)
- Services before API routes (routes wire to services)
- Backend API before frontend pages (frontend calls backend)
- Components (parallel) before pages that compose them

### Key Architecture Rule

**No service or API route may import database-specific libraries
(aiomysql, asyncpg, etc.) directly.** All database operations MUST go
through the `databaseDriver` Protocol resolved via `getDriver(dbType)`.
This ensures adding a new database type requires ONLY:
1. A new driver file in `backend/app/services/drivers/`
2. A new enum value in `backend/app/models/common.py`

### Parallel Opportunities

- T002 + T003 can run in parallel with T001
- T005, T009, T010, T011, T012 can all run in parallel after T004
- T006 → T007 → T008 must be sequential (interface → registry → implementation)
- T013 + T014 can run in parallel (models)
- T018 + T019 can run in parallel (frontend components)
- T022 can run in parallel with US1 tasks
- T026 + T027 can run in parallel (frontend components)
- T032 + T033 can run in parallel (polish tasks)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T012)
3. Complete Phase 3: User Story 1 (T013-T021)
4. **STOP and VALIDATE**: Test connecting a MySQL DB and browsing metadata
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational -> Foundation ready
2. Add User Story 1 -> Test independently -> Deploy/Demo (MVP!)
3. Add User Story 2 -> Test independently -> Deploy/Demo
4. Add User Story 3 -> Test independently -> Deploy/Demo
5. Polish phase -> Final validation

### Adding a New Database Type (Future)

1. Add enum value to `dbType` in `backend/app/models/common.py`
2. Create `backend/app/services/drivers/<dbName>Driver.py` implementing `databaseDriver`
3. Register in `backend/app/services/drivers/__init__.py`
4. Add driver-specific pip dependency to `backend/pyproject.toml`
5. Add option to frontend dbType Select dropdown
6. No changes needed in services, API routes, or other frontend code

### Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- camelCase naming MUST be followed in all code per constitution
- All structured data MUST use Pydantic models per constitution
- All Python functions MUST have full type annotations per constitution
- **All database access MUST go through the databaseDriver interface — no direct imports of database-specific libraries in services or API routes**
