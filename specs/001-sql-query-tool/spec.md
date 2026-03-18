# Feature Specification: SQL Query Tool

**Feature Branch**: `001-sql-query-tool`
**Created**: 2026-03-18
**Status**: Draft
**Input**: User description: "Database query tool with DB URL connection, metadata extraction, manual SQL input, and natural language SQL generation"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Connect Database and Browse Metadata (Priority: P1)

A user wants to connect to an existing database by providing its
connection URL. The system connects, extracts all table and view
metadata (column names, types, relationships), converts this metadata
to a structured format, stores it locally for reuse, and displays the
list of tables and views to the user.

**Why this priority**: Without a connected database and visible
metadata, no other feature (manual SQL or natural language queries)
can function. This is the foundational capability.

**Independent Test**: Can be fully tested by providing a valid database
URL and verifying that tables and views appear in the UI with correct
column information.

**Acceptance Scenarios**:

1. **Given** the user is on the main page with no databases configured,
   **When** they enter a valid MySQL connection URL and submit,
   **Then** the system connects to the database, extracts metadata, and
   displays a list of all tables and views with their column details.
2. **Given** the user has previously connected a database,
   **When** they return to the application,
   **Then** the previously extracted metadata is loaded from local
   storage and displayed without re-connecting to the remote database.
3. **Given** the user enters an invalid or unreachable database URL,
   **When** they submit the connection,
   **Then** the system displays a clear error message indicating the
   connection failure reason.
4. **Given** the user has a connected database,
   **When** they select a table or view from the list,
   **Then** the system displays the table's columns, data types, and
   any key/index information.

---

### User Story 2 - Execute Manual SQL Queries (Priority: P2)

A user wants to write and execute their own SQL SELECT queries against
the connected database. The system validates the query (syntax check,
SELECT-only enforcement, automatic LIMIT addition), executes it, and
displays the results as a formatted table.

**Why this priority**: Manual SQL querying is the core value
proposition for users who already know SQL. It requires the database
connection from US1 but delivers immediate standalone value.

**Independent Test**: Can be tested by connecting a database (US1),
typing a SELECT query, and verifying the results appear as a table.

**Acceptance Scenarios**:

1. **Given** a database is connected and the user is on the query page,
   **When** the user enters a valid SELECT statement and executes it,
   **Then** the system returns the query results displayed as a
   formatted table.
2. **Given** the user enters a SELECT statement without a LIMIT clause,
   **When** they execute the query,
   **Then** the system automatically appends LIMIT 1000 and displays
   results with an indication that a default limit was applied.
3. **Given** the user enters a non-SELECT statement (INSERT, UPDATE,
   DELETE, DROP, etc.),
   **When** they attempt to execute it,
   **Then** the system rejects the query and displays an error message
   explaining that only SELECT statements are permitted.
4. **Given** the user enters a syntactically invalid SQL statement,
   **When** they attempt to execute it,
   **Then** the system displays a parse error with details about the
   syntax issue.
5. **Given** the user executes a valid query,
   **When** the results are returned,
   **Then** the output is in JSON format and the frontend renders it
   as a sortable table.

---

### User Story 3 - Natural Language SQL Generation (Priority: P3)

A user who is unfamiliar with SQL wants to describe their data query
in natural language. The system sends the user's description along
with the database metadata (tables, views, columns) as context to an
LLM, which generates a valid SQL SELECT query. The generated query is
shown to the user for review before execution.

**Why this priority**: This adds significant value for non-technical
users but depends on both US1 (metadata for context) and the query
execution pipeline from US2. It builds on top of the first two stories.

**Independent Test**: Can be tested by connecting a database, entering
a natural language description like "show me all users created this
month", and verifying a valid SQL query is generated and displayed.

**Acceptance Scenarios**:

1. **Given** a database is connected with metadata available,
   **When** the user enters a natural language description of their
   desired query,
   **Then** the system generates a valid SQL SELECT statement that
   matches the user's intent and displays it for review.
2. **Given** the system has generated a SQL query from natural language,
   **When** the user reviews and confirms the query,
   **Then** the query goes through the same validation pipeline
   (syntax check, SELECT-only, LIMIT enforcement) and executes,
   displaying results as a table.
3. **Given** the system has generated a SQL query from natural language,
   **When** the user wants to modify the generated query,
   **Then** they can edit the SQL directly before executing it.
4. **Given** the user's natural language description is ambiguous or
   references non-existent tables/columns,
   **When** the LLM cannot generate a confident query,
   **Then** the system informs the user and suggests clarifications
   or shows available tables/columns as hints.

---

### Edge Cases

- What happens when the database connection drops mid-query execution?
  The system MUST display a connection error and suggest re-connecting.
- What happens when the query returns zero rows? The system MUST
  display an empty table with column headers and a "no results" message.
- What happens when the query returns an extremely large result set
  (even with LIMIT 1000)? The system MUST handle pagination or
  truncation gracefully in the frontend.
- What happens when the database schema changes after metadata was
  cached? The user MUST be able to manually refresh metadata.
- What happens when the user enters a query with multiple statements
  separated by semicolons? The system MUST reject multi-statement
  queries and inform the user to submit one query at a time.
- What happens when the LLM service is unavailable? The system MUST
  inform the user that natural language generation is temporarily
  unavailable while manual SQL input remains functional.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept a database connection URL from the
  user and establish a connection to the specified database.
- **FR-002**: System MUST extract metadata (tables, views, columns,
  data types, keys, indexes) from the connected database.
- **FR-003**: System MUST convert extracted metadata into a structured
  format and store it in a local database for reuse across sessions.
- **FR-004**: System MUST display all tables and views from the
  connected database with their column details in a browsable list.
- **FR-005**: System MUST parse every SQL input using a SQL parser to
  validate syntax before execution.
- **FR-006**: System MUST reject any SQL statement that is not a
  SELECT query, with a clear error message.
- **FR-007**: System MUST automatically append a LIMIT 1000 clause to
  any SELECT query that does not already include a LIMIT clause.
- **FR-008**: System MUST execute validated SELECT queries against the
  connected database and return results in JSON format.
- **FR-009**: Frontend MUST render JSON query results as a formatted
  table.
- **FR-010**: System MUST accept natural language descriptions from
  users and send them, along with database metadata context, to an LLM
  to generate SQL SELECT queries.
- **FR-011**: System MUST display the LLM-generated SQL query to the
  user for review and optional editing before execution.
- **FR-012**: System MUST allow users to refresh database metadata
  on demand to capture schema changes.
- **FR-013**: System MUST support managing multiple database
  connections, allowing users to add and switch between databases.
- **FR-014**: System MUST NOT store database connection credentials in
  plain text; connection URLs containing passwords MUST be encrypted at
  rest in the local database.

### Key Entities

- **databaseConnection**: Represents a user-configured database. Key
  attributes: connection URL, display name, database type, connection
  status, date added.
- **tableMetadata**: Represents a table or view in the connected
  database. Key attributes: name, type (table or view), parent
  database connection, list of columns.
- **columnMetadata**: Represents a column within a table or view. Key
  attributes: name, data type, nullable flag, key type (primary,
  foreign, none), default value.
- **queryExecution**: Represents a single query run by the user. Key
  attributes: SQL text, source (manual or LLM-generated), execution
  timestamp, result row count, status (success/error).

### Assumptions

- The initial release targets MySQL databases. Support for other
  database engines (PostgreSQL, etc.) may be added in future iterations.
- The LLM provider is an external API service; the specific provider
  is configurable.
- The application is a web application with a backend API and a
  frontend UI.
- Connection URLs follow standard database URL format
  (e.g., `mysql://user:pass@host:port/dbname`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can connect a database and see its tables/views
  within 30 seconds of submitting a valid connection URL.
- **SC-002**: Previously connected database metadata loads from local
  cache in under 2 seconds without requiring a remote connection.
- **SC-003**: Manual SQL query results are displayed within 5 seconds
  for typical queries (under 1000 rows).
- **SC-004**: 90% of natural language queries produce a valid,
  executable SQL statement on the first attempt (measured against
  common query patterns like filtering, sorting, joining two tables).
- **SC-005**: Invalid SQL (non-SELECT, syntax errors) is rejected with
  a helpful error message before any query reaches the database.
- **SC-006**: Users unfamiliar with SQL can successfully retrieve data
  using natural language descriptions within 3 attempts.
