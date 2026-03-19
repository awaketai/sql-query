"""PostgreSQL database driver implementation."""

import asyncio
from urllib.parse import urlparse, parse_qs

import asyncpg

from app.services.database_driver import (
    ColumnInfo,
    DatabaseDriver,
    MetadataResult,
    QueryRawResult,
)


class PostgresDriver(DatabaseDriver):
    """PostgreSQL implementation of the DatabaseDriver protocol."""

    @property
    def dialect(self) -> str:
        """Return PostgreSQL dialect for sqlglot."""
        return "postgres"

    def _parseConnectionUrl(self, connectionUrl: str) -> dict[str, str | int]:
        """Parse a PostgreSQL connection URL into connection parameters.

        Args:
            connectionUrl: PostgreSQL connection URL (postgresql://user:pass@host:port/db).

        Returns:
            Dictionary with connection parameters.
        """
        parsed = urlparse(connectionUrl)

        # Extract database name from path
        database = parsed.path.lstrip("/") if parsed.path else ""

        return {
            "host": parsed.hostname or "localhost",
            "port": parsed.port or 5432,
            "user": parsed.username or "",
            "password": parsed.password or "",
            "database": database,
        }

    async def testConnection(self, connectionUrl: str) -> bool:
        """Test connection to PostgreSQL database.

        Args:
            connectionUrl: PostgreSQL connection URL.

        Returns:
            True if connection successful.

        Raises:
            ConnectionError: If connection fails.
        """
        params = self._parseConnectionUrl(connectionUrl)

        try:
            conn = await asyncpg.connect(
                host=params["host"],
                port=params["port"],
                user=params["user"],
                password=params["password"],
                database=params["database"],
                timeout=10,
            )
            await conn.close()
            return True
        except Exception as e:
            raise ConnectionError(f"PostgreSQL connection failed: {e}") from e

    async def extractMetadata(self, connectionUrl: str) -> MetadataResult:
        """Extract table and column metadata from PostgreSQL database.

        Args:
            connectionUrl: PostgreSQL connection URL.

        Returns:
            MetadataResult with tables and their columns.

        Raises:
            ConnectionError: If connection fails.
        """
        params = self._parseConnectionUrl(connectionUrl)

        try:
            conn = await asyncpg.connect(
                host=params["host"],
                port=params["port"],
                user=params["user"],
                password=params["password"],
                database=params["database"],
                timeout=30,
            )
        except Exception as e:
            raise ConnectionError(f"PostgreSQL connection failed: {e}") from e

        tables: list[dict[str, object]] = []

        try:
            # Get all tables and views in the public schema
            tableRows = await conn.fetch(
                """
                SELECT
                    table_name,
                    table_schema,
                    table_type
                FROM information_schema.tables
                WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
                ORDER BY table_schema, table_name
                """
            )

            for row in tableRows:
                tableName = row["table_name"]
                schemaName = row["table_schema"]
                tableType = row["table_type"]

                # Normalize table type
                normalizedType = "TABLE" if tableType == "BASE TABLE" else "VIEW"

                # Get columns for this table
                columnRows = await conn.fetch(
                    """
                    SELECT
                        column_name,
                        data_type,
                        is_nullable,
                        column_default,
                        ordinal_position,
                        (
                            SELECT COUNT(*) > 0
                            FROM information_schema.table_constraints tc
                            JOIN information_schema.key_column_usage kcu
                                ON tc.constraint_name = kcu.constraint_name
                                AND tc.table_schema = kcu.table_schema
                            WHERE tc.table_schema = $1
                                AND tc.table_name = $2
                                AND kcu.column_name = c.column_name
                                AND tc.constraint_type = 'PRIMARY KEY'
                        ) as is_primary_key,
                        (
                            SELECT COUNT(*) > 0
                            FROM information_schema.table_constraints tc
                            JOIN information_schema.key_column_usage kcu
                                ON tc.constraint_name = kcu.constraint_name
                                AND tc.table_schema = kcu.table_schema
                            WHERE tc.table_schema = $1
                                AND tc.table_name = $2
                                AND kcu.column_name = c.column_name
                                AND tc.constraint_type = 'FOREIGN KEY'
                        ) as is_foreign_key,
                        (
                            SELECT COUNT(*) > 0
                            FROM information_schema.table_constraints tc
                            JOIN information_schema.key_column_usage kcu
                                ON tc.constraint_name = kcu.constraint_name
                                AND tc.table_schema = kcu.table_schema
                            WHERE tc.table_schema = $1
                                AND tc.table_name = $2
                                AND kcu.column_name = c.column_name
                                AND tc.constraint_type = 'UNIQUE'
                        ) as is_unique
                    FROM information_schema.columns c
                    WHERE table_schema = $1 AND table_name = $2
                    ORDER BY ordinal_position
                    """,
                    schemaName,
                    tableName,
                )

                columns: list[dict[str, object]] = []
                for colRow in columnRows:
                    # Determine key type
                    keyType = "none"
                    if colRow["is_primary_key"]:
                        keyType = "primary"
                    elif colRow["is_foreign_key"]:
                        keyType = "foreign"
                    elif colRow["is_unique"]:
                        keyType = "unique"

                    columns.append({
                        "name": colRow["column_name"],
                        "dataType": colRow["data_type"].upper(),
                        "nullable": colRow["is_nullable"] == "YES",
                        "keyType": keyType,
                        "defaultValue": colRow["column_default"],
                        "ordinalPosition": colRow["ordinal_position"],
                        "comment": None,
                    })

                tables.append({
                    "name": tableName,
                    "schemaName": schemaName,
                    "type": normalizedType,
                    "comment": None,
                    "columns": columns,
                })

        finally:
            await conn.close()

        return MetadataResult(tables=tables)

    async def executeQuery(
        self, connectionUrl: str, sql: str
    ) -> QueryRawResult:
        """Execute a SQL query on PostgreSQL database.

        Args:
            connectionUrl: PostgreSQL connection URL.
            sql: SQL query to execute.

        Returns:
            QueryRawResult with columns and rows.

        Raises:
            ConnectionError: If connection fails.
            RuntimeError: If query execution fails.
        """
        params = self._parseConnectionUrl(connectionUrl)

        try:
            conn = await asyncpg.connect(
                host=params["host"],
                port=params["port"],
                user=params["user"],
                password=params["password"],
                database=params["database"],
                timeout=10,
            )
        except Exception as e:
            raise ConnectionError(f"PostgreSQL connection failed: {e}") from e

        try:
            rows = await conn.fetch(sql)

            # Get column information from the result
            columns: list[ColumnInfo] = []
            if rows:
                # Get column names from the first row's keys
                for colName in rows[0].keys():
                    columns.append(ColumnInfo(
                        name=colName,
                        type="unknown",
                    ))

            # Convert records to dictionaries
            rowsDict: list[dict[str, object]] = [dict(row) for row in rows]

            return QueryRawResult(columns=columns, rows=rowsDict)

        except Exception as e:
            raise RuntimeError(f"Query execution failed: {e}") from e
        finally:
            await conn.close()
