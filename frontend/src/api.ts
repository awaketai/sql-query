/**
 * Centralized API layer
 *
 * - apiFetch: low-level wrapper (auto JSON parse, response.ok check, nested error extraction)
 * - api.*: typed endpoint methods with centralized URLs
 * - Components call api.* methods; errors are ApiError with human-readable messages
 */

import { msg } from './message';
import type {
  DatabaseConnection,
  CreateConnectionRequest,
  RefreshResponse,
  TableListItem,
  TableDetail,
  QueryRequest,
  QueryResponse,
  QueryHistoryItem,
  GenerateSqlResponse,
  ErrorType,
} from './types';

// ---------------------------------------------------------------------------
// ApiError
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  status: number;
  errorType?: ErrorType;

  constructor(msg: string, status: number, errorType?: ErrorType) {
    super(msg);
    this.status = status;
    this.errorType = errorType;
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Extract human-readable error message from API error responses.
 * Handles both flat and nested detail formats:
 *   { "detail": "some string" }
 *   { "detail": { "detail": "some string", "errorType": "...", "context": {} } }
 */
function extractErrorMessage(data: unknown, fallback: string): string {
  if (data == null || typeof data !== 'object') return fallback;
  const detail = (data as Record<string, unknown>).detail;
  if (typeof detail === 'string') return detail;
  if (detail != null && typeof detail === 'object') {
    const inner = (detail as Record<string, unknown>).detail;
    if (typeof inner === 'string') return inner;
  }
  return fallback;
}

function extractErrorType(data: unknown): ErrorType | undefined {
  if (data == null || typeof data !== 'object') return undefined;
  const detail = (data as Record<string, unknown>).detail;
  if (detail != null && typeof detail === 'object') {
    const et = (detail as Record<string, unknown>).errorType;
    if (typeof et === 'string') return et as ErrorType;
  }
  return undefined;
}

function jsonBody(body: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

async function apiFetch<T = unknown>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      extractErrorMessage(data, `Request failed (${response.status})`),
      response.status,
      extractErrorType(data),
    );
  }

  return data as T;
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/** Extract a displayable error string from a caught value. */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  return fallback;
}

/**
 * Convenience wrapper: calls an async API function, shows message.error on
 * failure, and returns null. Avoids repeating try/catch + message.error in
 * every call site.
 *
 * Usage:
 *   const data = await api.call(() => api.connections.list(), 'Failed to load');
 *   if (!data) return; // error already shown
 */
async function callWithToast<T>(
  fn: () => Promise<T>,
  fallbackMsg: string,
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    msg.error(getErrorMessage(error, fallbackMsg));
    return null;
  }
}

// ---------------------------------------------------------------------------
// Typed API endpoint methods
// ---------------------------------------------------------------------------

export const api = {
  /** Fire-and-forget error handling via toast. Returns null on failure. */
  call: callWithToast,

  connections: {
    list: () =>
      apiFetch<DatabaseConnection[]>('/api/connections'),

    get: (id: number) =>
      apiFetch<DatabaseConnection>(`/api/connections/${id}`),

    create: (data: CreateConnectionRequest) =>
      apiFetch<DatabaseConnection>('/api/connections', jsonBody(data)),

    delete: (id: number) =>
      apiFetch<void>(`/api/connections/${id}`, { method: 'DELETE' }),

    refresh: (id: number) =>
      apiFetch<RefreshResponse>(`/api/connections/${id}/refresh`, { method: 'POST' }),
  },

  tables: {
    list: (connectionId: number) =>
      apiFetch<TableListItem[]>(`/api/connections/${connectionId}/tables`),

    get: (connectionId: number, tableId: number) =>
      apiFetch<TableDetail>(`/api/connections/${connectionId}/tables/${tableId}`),
  },

  queries: {
    execute: (connectionId: number, data: QueryRequest) =>
      apiFetch<QueryResponse>(`/api/connections/${connectionId}/query`, jsonBody(data)),

    history: (connectionId: number, limit?: number, offset?: number) => {
      const params = new URLSearchParams();
      if (limit != null) params.set('limit', String(limit));
      if (offset != null) params.set('offset', String(offset));
      const qs = params.toString();
      return apiFetch<QueryHistoryItem[]>(
        `/api/connections/${connectionId}/history${qs ? `?${qs}` : ''}`,
      );
    },
  },

  generation: {
    generateSql: (connectionId: number, naturalLanguage: string) =>
      apiFetch<GenerateSqlResponse>(
        `/api/connections/${connectionId}/generate-sql`,
        jsonBody({ naturalLanguage }),
      ),
  },
};
