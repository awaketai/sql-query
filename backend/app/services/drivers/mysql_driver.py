"""MySQL database driver implementation."""

import asyncio
from urllib.parse import urlparse

import aiomysql

from app.services.database_driver import (
    ColumnInfo,
    DatabaseDriver,
    MetadataResult,
    QueryRawResult,
)


class MySqlDriver(DatabaseDriver):
    """MySQL implementation of the DatabaseDriver protocol."""

    @property
    def dialect(self) -> str:
        """Return MySQL dialect for sqlglot."""
        return "mysql"

    def _parseConnectionUrl(self, connectionUrl: str) -> dict[str, str | int]:
        """Parse a MySQL connection URL into connection parameters.

        Args:
            connectionUrl: MySQL connection URL (mysql://user:pass@host:port/db).

        Returns:
            Dictionary with connection parameters.
        """
        parsed = urlparse(connectionUrl)

        return {
            "host": parsed.hostname or "localhost",
            "port": parsed.port or 3306,
            "user": parsed.username or "",
            "password": parsed.password or "",
            "db": parsed.path.lstrip("/") if parsed.path else "",
        }

    async def testConnection(self, connectionUrl: str) -> bool:
        """Test connection to MySQL database.

        Args:
            connectionUrl: MySQL connection URL.

        Returns:
            True if connection successful.

        Raises:
            ConnectionError: If connection fails.
        """
        params = self._parseConnectionUrl(connectionUrl)

        try:
            conn = await aiomysql.connect(
                host=params["host"],
                port=params["port"],
                user=params["user"],
                password=params["password"],
                db=params["db"],
                connect_timeout=10,
            )
            conn.close()
            return True
        except Exception as e:
            raise ConnectionError(f"MySQL connection failed: {e}") from e

    async def extractMetadata(self, connectionUrl: str) -> MetadataResult:
        """Extract table and column metadata from MySQL database.

        Args:
            connectionUrl: MySQL connection URL.

        Returns:
            MetadataResult with tables and their columns.

        Raises:
            ConnectionError: If connection fails.
        """
        params = self._parseConnectionUrl(connectionUrl)

        try:
            conn = await aiomysql.connect(
                host=params["host"],
                port=params["port"],
                user=params["user"],
                password=params["password"],
                db=params["db"],
                connect_timeout=30,
            )
        except Exception as e:
            raise ConnectionError(f"MySQL connection failed: {e}") from e

        tables: list[dict[str, object]] = []

        try:
            async with conn.cursor() as cursor:
                # Get all tables and views
                await cursor.execute(
                    """
                    SELECT TABLE_NAME, TABLE_SCHEMA, TABLE_TYPE, TABLE_COMMENT
                    FROM INFORMATION_SCHEMA.TABLES
                    WHERE TABLE_SCHEMA = %s
                    ORDER BY TABLE_NAME
                    """,
                    (params["db"],),
                )
                tableRows = await cursor.fetchall()

                for tableName, schemaName, tableType, tableComment in tableRows:
                    # Normalize table type
                    normalizedType = "TABLE" if tableType == "BASE TABLE" else "VIEW"

                    # Get columns for this table
                    await cursor.execute(
                        """
                        SELECT
                            COLUMN_NAME,
                            DATA_TYPE,
                            IS_NULLABLE,
                            COLUMN_KEY,
                            COLUMN_DEFAULT,
                            ORDINAL_POSITION,
                            COLUMN_COMMENT
                        FROM INFORMATION_SCHEMA.COLUMNS
                        WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s
                        ORDER BY ORDINAL_POSITION
                        """,
                        (params["db"], tableName),
                    )
                    columnRows = await cursor.fetchall()

                    columns: list[dict[str, object]] = []
                    for (
                        colName,
                        dataType,
                        isNullable,
                        columnKey,
                        defaultValue,
                        ordinalPosition,
                        columnComment,
                    ) in columnRows:
                        # Map column key to keyType
                        keyType = "none"
                        if columnKey == "PRI":
                            keyType = "primary"
                        elif columnKey == "FOR":
                            keyType = "foreign"
                        elif columnKey == "UNI":
                            keyType = "unique"

                        columns.append({
                            "name": colName,
                            "dataType": dataType.upper(),
                            "nullable": isNullable == "YES",
                            "keyType": keyType,
                            "defaultValue": defaultValue,
                            "ordinalPosition": ordinalPosition,
                            "comment": columnComment or None,
                        })

                    tables.append({
                        "name": tableName,
                        "schemaName": schemaName,
                        "type": normalizedType,
                        "comment": tableComment or None,
                        "columns": columns,
                    })

        finally:
            conn.close()

        return MetadataResult(tables=tables)

    async def executeQuery(
        self, connectionUrl: str, sql: str
    ) -> QueryRawResult:
        """Execute a SQL query on MySQL database.

        Args:
            connectionUrl: MySQL connection URL.
            sql: SQL query to execute.

        Returns:
            QueryRawResult with columns and rows.

        Raises:
            ConnectionError: If connection fails.
            RuntimeError: If query execution fails.
        """
        params = self._parseConnectionUrl(connectionUrl)

        try:
            conn = await aiomysql.connect(
                host=params["host"],
                port=params["port"],
                user=params["user"],
                password=params["password"],
                db=params["db"],
                connect_timeout=10,
            )
        except Exception as e:
            raise ConnectionError(f"MySQL connection failed: {e}") from e

        try:
            async with conn.cursor() as cursor:
                await cursor.execute(sql)

                # Get column information
                columns: list[ColumnInfo] = []
                if cursor.description:
                    for col in cursor.description:
                        columns.append(ColumnInfo(
                            name=col[0],
                            type=col[1].__name__ if hasattr(col[1], "__name__") else str(col[1]),
                        ))

                # Fetch all rows as dictionaries
                rows: list[dict[str, object]] = []
                if columns:
                    rowTuple = await cursor.fetchall()
                    for row in rowTuple:
                        rowDict = {}
                        for i, col in enumerate(columns):
                            rowDict[col.name] = row[i]
                        rows.append(rowDict)

                return QueryRawResult(columns=columns, rows=rows)

        except Exception as e:
            raise RuntimeError(f"Query execution failed: {e}") from e
        finally:
            conn.close()
