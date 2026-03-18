"""Metadata API routes."""

from fastapi import APIRouter, HTTPException, Query

from app.db.sqlite import getConnection
from app.models.common import ErrorType

router = APIRouter(tags=["metadata"])


@router.get("/connections/{connectionId}/tables")
async def listTablesRoute(
    connectionId: int,
    type: str | None = Query(None, description="Filter by TABLE or VIEW"),
) -> list[dict]:
    """List all tables and views for a connection."""
    async with getConnection() as db:
        # Verify connection exists
        cursor = await db.execute(
            "SELECT id FROM connections WHERE id = ?", (connectionId,)
        )
        if await cursor.fetchone() is None:
            raise HTTPException(
                status_code=404,
                detail={
                    "detail": f"Connection {connectionId} not found",
                    "errorType": ErrorType.VALIDATION_ERROR,
                    "context": {"connectionId": connectionId},
                },
            )

        # Build query
        sql = """
            SELECT
                t.id,
                t.name,
                t.schemaName,
                t.type,
                t.comment,
                t.fetchedAt,
                COUNT(c.id) as columnCount
            FROM tableMetadata t
            LEFT JOIN columnMetadata c ON t.id = c.tableId
            WHERE t.connectionId = ?
        """
        params: list = [connectionId]

        if type:
            sql += " AND t.type = ?"
            params.append(type)

        sql += " GROUP BY t.id ORDER BY t.name"

        cursor = await db.execute(sql, params)
        rows = await cursor.fetchall()

        return [
            {
                "id": row["id"],
                "name": row["name"],
                "schemaName": row["schemaName"],
                "type": row["type"],
                "comment": row["comment"],
                "columnCount": row["columnCount"],
                "fetchedAt": row["fetchedAt"],
            }
            for row in rows
        ]


@router.get("/connections/{connectionId}/tables/{tableId}")
async def getTableDetailRoute(connectionId: int, tableId: int) -> dict:
    """Get detailed table metadata including all columns."""
    async with getConnection() as db:
        # Get table info
        cursor = await db.execute(
            """
            SELECT id, name, schemaName, type, comment, fetchedAt
            FROM tableMetadata
            WHERE id = ? AND connectionId = ?
            """,
            (tableId, connectionId),
        )
        tableRow = await cursor.fetchone()

        if tableRow is None:
            raise HTTPException(
                status_code=404,
                detail={
                    "detail": f"Table {tableId} not found for connection {connectionId}",
                    "errorType": ErrorType.VALIDATION_ERROR,
                    "context": {"connectionId": connectionId, "tableId": tableId},
                },
            )

        # Get columns
        cursor = await db.execute(
            """
            SELECT
                id, name, dataType, nullable, keyType,
                defaultValue, ordinalPosition, comment
            FROM columnMetadata
            WHERE tableId = ?
            ORDER BY ordinalPosition
            """,
            (tableId,),
        )
        columnRows = await cursor.fetchall()

        columns = [
            {
                "id": row["id"],
                "name": row["name"],
                "dataType": row["dataType"],
                "nullable": bool(row["nullable"]),
                "keyType": row["keyType"],
                "defaultValue": row["defaultValue"],
                "ordinalPosition": row["ordinalPosition"],
                "comment": row["comment"],
            }
            for row in columnRows
        ]

        return {
            "id": tableRow["id"],
            "name": tableRow["name"],
            "schemaName": tableRow["schemaName"],
            "type": tableRow["type"],
            "comment": tableRow["comment"],
            "fetchedAt": tableRow["fetchedAt"],
            "columns": columns,
        }
