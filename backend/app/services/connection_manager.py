"""Connection management service."""

from datetime import datetime, timezone

from app.db.sqlite import getConnection
from app.services.drivers import getDriver
from app.services.encryption import decryptValue, encryptValue


async def createConnection(
    displayName: str, connectionUrl: str, dbType: str = "mysql"
) -> dict:
    """Create a new database connection.

    Args:
        displayName: User-friendly name for the connection.
        connectionUrl: Database connection URL.
        dbType: Database type (default: mysql).

    Returns:
        Created connection record.

    Raises:
        ValueError: If validation fails.
        ConnectionError: If connection test fails.
    """
    if not displayName:
        raise ValueError("displayName is required")
    if not connectionUrl:
        raise ValueError("connectionUrl is required")

    # Get driver and test connection
    driver = getDriver(dbType)
    await driver.testConnection(connectionUrl)

    # Encrypt the connection URL
    encryptedUrl = encryptValue(connectionUrl)

    now = datetime.now(timezone.utc).isoformat()

    # Store connection
    async with getConnection() as db:
        cursor = await db.execute(
            """
            INSERT INTO connections (displayName, connectionUrl, dbType, status, createdAt, updatedAt)
            VALUES (?, ?, ?, 'active', ?, ?)
            """,
            (displayName, encryptedUrl, dbType, now, now),
        )
        connectionId = cursor.lastrowid

        # Extract and store metadata
        metadata = await driver.extractMetadata(connectionUrl)
        tablesCount = 0
        viewsCount = 0

        for table in metadata.tables:
            tableType = table.get("type", "TABLE")
            if tableType == "TABLE":
                tablesCount += 1
            else:
                viewsCount += 1

            cursor = await db.execute(
                """
                INSERT INTO tableMetadata (connectionId, name, schemaName, type, comment, fetchedAt)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    connectionId,
                    table.get("name"),
                    table.get("schemaName"),
                    tableType,
                    table.get("comment"),
                    now,
                ),
            )
            tableId = cursor.lastrowid

            # Insert columns
            for column in table.get("columns", []):
                await db.execute(
                    """
                    INSERT INTO columnMetadata
                    (tableId, name, dataType, nullable, keyType, defaultValue, ordinalPosition, comment)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        tableId,
                        column.get("name"),
                        column.get("dataType"),
                        1 if column.get("nullable") else 0,
                        column.get("keyType", "none"),
                        column.get("defaultValue"),
                        column.get("ordinalPosition"),
                        column.get("comment"),
                    ),
                )

        await db.commit()

    return {
        "id": connectionId,
        "displayName": displayName,
        "dbType": dbType,
        "status": "active",
        "createdAt": now,
        "updatedAt": now,
    }


async def listConnections() -> list[dict]:
    """List all database connections.

    Returns:
        List of connection records.
    """
    async with getConnection() as db:
        cursor = await db.execute(
            """
            SELECT id, displayName, dbType, status, createdAt, updatedAt
            FROM connections
            ORDER BY displayName
            """
        )
        rows = await cursor.fetchall()

        return [
            {
                "id": row["id"],
                "displayName": row["displayName"],
                "dbType": row["dbType"],
                "status": row["status"],
                "createdAt": row["createdAt"],
                "updatedAt": row["updatedAt"],
            }
            for row in rows
        ]


async def getConnectionById(connectionId: int) -> dict | None:
    """Get a connection by ID.

    Args:
        connectionId: The connection ID.

    Returns:
        Connection record or None if not found.
    """
    async with getConnection() as db:
        cursor = await db.execute(
            """
            SELECT id, displayName, dbType, status, createdAt, updatedAt
            FROM connections
            WHERE id = ?
            """,
            (connectionId,),
        )
        row = await cursor.fetchone()

        if row is None:
            return None

        return {
            "id": row["id"],
            "displayName": row["displayName"],
            "dbType": row["dbType"],
            "status": row["status"],
            "createdAt": row["createdAt"],
            "updatedAt": row["updatedAt"],
        }


async def deleteConnection(connectionId: int) -> bool:
    """Delete a connection and its cached metadata.

    Args:
        connectionId: The connection ID.

    Returns:
        True if deleted, False if not found.
    """
    async with getConnection() as db:
        cursor = await db.execute(
            "DELETE FROM connections WHERE id = ?", (connectionId,)
        )
        deleted = cursor.rowcount > 0
        await db.commit()
        return deleted


async def refreshConnectionMetadata(connectionId: int) -> dict:
    """Refresh metadata for a connection.

    Args:
        connectionId: The connection ID.

    Returns:
        Refresh statistics.

    Raises:
        ValueError: If connection not found.
        ConnectionError: If metadata extraction fails.
    """
    async with getConnection() as db:
        # Get connection details
        cursor = await db.execute(
            "SELECT displayName, connectionUrl, dbType FROM connections WHERE id = ?",
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

    # Extract fresh metadata
    metadata = await driver.extractMetadata(connectionUrl)
    now = datetime.now(timezone.utc).isoformat()

    async with getConnection() as db:
        # Delete old metadata
        await db.execute(
            """
            DELETE FROM columnMetadata WHERE tableId IN
            (SELECT id FROM tableMetadata WHERE connectionId = ?)
            """,
            (connectionId,),
        )
        await db.execute(
            "DELETE FROM tableMetadata WHERE connectionId = ?", (connectionId,)
        )

        # Insert new metadata
        tablesCount = 0
        viewsCount = 0

        for table in metadata.tables:
            tableType = table.get("type", "TABLE")
            if tableType == "TABLE":
                tablesCount += 1
            else:
                viewsCount += 1

            cursor = await db.execute(
                """
                INSERT INTO tableMetadata (connectionId, name, schemaName, type, comment, fetchedAt)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    connectionId,
                    table.get("name"),
                    table.get("schemaName"),
                    tableType,
                    table.get("comment"),
                    now,
                ),
            )
            tableId = cursor.lastrowid

            for column in table.get("columns", []):
                await db.execute(
                    """
                    INSERT INTO columnMetadata
                    (tableId, name, dataType, nullable, keyType, defaultValue, ordinalPosition, comment)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        tableId,
                        column.get("name"),
                        column.get("dataType"),
                        1 if column.get("nullable") else 0,
                        column.get("keyType", "none"),
                        column.get("defaultValue"),
                        column.get("ordinalPosition"),
                        column.get("comment"),
                    ),
                )

        # Update connection timestamp
        await db.execute(
            "UPDATE connections SET updatedAt = ? WHERE id = ?",
            (now, connectionId),
        )

        await db.commit()

    return {
        "tablesCount": tablesCount,
        "viewsCount": viewsCount,
        "fetchedAt": now,
    }
