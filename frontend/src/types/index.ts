/**
 * TypeScript type definitions for the SQL Query Tool.
 * All interfaces use camelCase naming per project constitution.
 */

// Database types
export type DbType = 'mysql' | 'postgresql'; // Extensible for future: 'sqlite'

export type ConnectionStatus = 'active' | 'inactive' | 'error';

export type TableType = 'TABLE' | 'VIEW';

export type KeyType = 'primary' | 'foreign' | 'unique' | 'none';

export type QuerySource = 'manual' | 'llmGenerated';

export type QueryStatus = 'success' | 'error';

export type ErrorType =
  | 'validation_error'
  | 'connection_error'
  | 'parse_error'
  | 'execution_error'
  | 'llm_error';

// Connection types
export interface DatabaseConnection {
  id: number;
  displayName: string;
  dbType: DbType;
  status: ConnectionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConnectionRequest {
  displayName: string;
  connectionUrl: string;
  dbType?: DbType;
}

export interface RefreshResponse {
  tablesCount: number;
  viewsCount: number;
  fetchedAt: string;
}

// Metadata types
export interface ColumnMetadata {
  id: number;
  name: string;
  dataType: string;
  nullable: boolean;
  keyType: KeyType;
  defaultValue: string | null;
  ordinalPosition: number;
  comment: string | null;
}

export interface TableListItem {
  id: number;
  name: string;
  schemaName: string;
  type: TableType;
  comment: string | null;
  columnCount: number;
  fetchedAt: string;
}

export interface TableDetail extends TableListItem {
  columns: ColumnMetadata[];
}

// Query types
export interface QueryRequest {
  sql: string;
  source: QuerySource;
}

export interface QueryResponse {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  limitApplied: boolean;
  executionTimeMs: number;
}

export interface QueryHistoryItem {
  id: number;
  sqlText: string;
  source: QuerySource;
  naturalLanguageInput: string | null;
  status: QueryStatus;
  rowCount: number | null;
  errorMessage: string | null;
  executedAt: string;
  durationMs: number | null;
}

// SQL Generation types
export interface GenerateSqlRequest {
  naturalLanguage: string;
}

export interface GenerateSqlResponse {
  generatedSql: string;
  explanation: string;
}

// Error types
export interface ErrorResponse {
  detail: string;
  errorType: ErrorType;
  context: Record<string, unknown>;
}
