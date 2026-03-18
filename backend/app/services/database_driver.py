"""Database driver protocol and result types."""

from typing import Protocol

from pydantic import BaseModel


class ColumnInfo(BaseModel):
    """Column information from query result."""

    name: str
    type: str | None = None


class MetadataResult(BaseModel):
    """Result of metadata extraction."""

    tables: list[dict[str, object]]


class QueryRawResult(BaseModel):
    """Result of raw query execution."""

    columns: list[ColumnInfo]
    rows: list[dict[str, object]]


class DatabaseDriver(Protocol):
    """Protocol defining the interface for database drivers.

    All database drivers must implement this protocol to be used
    with the connection manager and query executor.
    """

    @property
    def dialect(self) -> str:
        """Return the SQL dialect for this database type.

        Used by sqlglot for dialect-specific parsing and validation.
        """
        ...

    async def testConnection(self, connectionUrl: str) -> bool:
        """Test if a connection to the database can be established.

        Args:
            connectionUrl: The database connection URL.

        Returns:
            True if connection is successful, False otherwise.

        Raises:
            ConnectionError: If connection fails with details.
        """
        ...

    async def extractMetadata(self, connectionUrl: str) -> MetadataResult:
        """Extract table and column metadata from the database.

        Args:
            connectionUrl: The database connection URL.

        Returns:
            MetadataResult containing all tables with their columns.

        Raises:
            ConnectionError: If connection fails.
        """
        ...

    async def executeQuery(
        self, connectionUrl: str, sql: str
    ) -> QueryRawResult:
        """Execute a SQL query and return raw results.

        Args:
            connectionUrl: The database connection URL.
            sql: The SQL query to execute.

        Returns:
            QueryRawResult with columns and rows.

        Raises:
            ConnectionError: If connection fails.
            RuntimeError: If query execution fails.
        """
        ...
