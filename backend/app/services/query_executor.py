"""Query execution service."""

import time
from datetime import datetime, timezone

from app.db.sqlite import getConnection
from app.services.drivers import getDriver
from app.services.encryption import decryptValue
from app.services.query_validator import validateAndPrepare


async def executeQuery(
    connectionId: int, sql: str, source: str
) -> dict:
    """Execute a SQL query against a database connection.

    Args:
        connectionId: The database connection ID.
        sql: The SQL query to execute.
        source: The query source ('manual' or 'llmGenerated').

    Returns:
        Query response with columns, rows, and metadata.

    Raises:
        ValueError: If connection not found or SQL validation fails.
        ConnectionError: If database connection fails.
        RuntimeError: If query execution fails.
    """
    # Get connection details
    async with getConnection() as db:
        cursor = await db.execute(
            "SELECT connectionUrl, dbType FROM connections WHERE id = ?",
            (connectionId,),
        )
        row = await cursor.fetchone()

        if row is None:
            raise ValueError(f"Connection {connectionId} not found")

        encryptedUrl = row["connectionUrl"]
        dbType = row["dbType"]

    # Decrypt URL and get driver
    connectionUrl = decryptValue(encryptedUrl)
    driver = getDriver(dbType)

    # Validate and prepare SQL
    preparedSql, limitApplied = validateAndPrepare(sql, driver.dialect)

    # Execute query
    startTime = time.time()
    status = "success"
    rowCount = 0
    errorMessage = None

    try:
        result = await driver.executeQuery(connectionUrl, preparedSql)
        rowCount = len(result.rows)

        # Extract column names
        columns = [col.name for col in result.columns]

    except Exception as e:
        status = "error"
        errorMessage = str(e)
        columns = []
        result = None
        raise
    finally:
        executionTimeMs = int((time.time() - startTime) * 1000)

        # Record in history
        now = datetime.now(timezone.utc).isoformat()
        async with getConnection() as db:
            await db.execute(
                """
                INSERT INTO queryHistory
                (connectionId, sqlText, source, naturalLanguageInput, status,
                 rowCount, errorMessage, executedAt, durationMs)
                VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?)
                """,
                (
                    connectionId,
                    sql,
                    source,
                    status,
                    rowCount if status == "success" else None,
                    errorMessage,
                    now,
                    executionTimeMs,
                ),
            )
            await db.commit()

    return {
        "columns": columns,
        "rows": result.rows if result else [],
        "rowCount": rowCount,
        "limitApplied": limitApplied,
        "executionTimeMs": executionTimeMs,
    }
