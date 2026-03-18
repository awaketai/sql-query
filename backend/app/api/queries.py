"""Query execution API routes."""

import time

from fastapi import APIRouter, HTTPException

from app.db.sqlite import getConnection
from app.models.common import ErrorType
from app.services.query_executor import executeQuery
from app.services.query_validator import validateAndPrepare

router = APIRouter(tags=["queries"])


@router.post("/connections/{connectionId}/query")
async def executeQueryRoute(connectionId: int, request: dict) -> dict:
    """Execute a SQL query against the connected database."""
    sql = request.get("sql", "")
    source = request.get("source", "manual")

    if not sql:
        raise HTTPException(
            status_code=400,
            detail={
                "detail": "SQL query is required",
                "errorType": ErrorType.VALIDATION_ERROR,
                "context": {},
            },
        )

    try:
        return await executeQuery(connectionId, sql, source)
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail={
                "detail": str(e),
                "errorType": ErrorType.PARSE_ERROR,
                "context": {},
            },
        )
    except ConnectionError as e:
        raise HTTPException(
            status_code=422,
            detail={
                "detail": str(e),
                "errorType": ErrorType.CONNECTION_ERROR,
                "context": {},
            },
        )
    except RuntimeError as e:
        raise HTTPException(
            status_code=422,
            detail={
                "detail": str(e),
                "errorType": ErrorType.EXECUTION_ERROR,
                "context": {},
            },
        )


@router.get("/connections/{connectionId}/history")
async def getHistoryRoute(
    connectionId: int,
    limit: int = 50,
    offset: int = 0,
) -> list[dict]:
    """Get query execution history for a connection."""
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

        cursor = await db.execute(
            """
            SELECT
                id, sqlText, source, naturalLanguageInput, status,
                rowCount, errorMessage, executedAt, durationMs
            FROM queryHistory
            WHERE connectionId = ?
            ORDER BY executedAt DESC
            LIMIT ? OFFSET ?
            """,
            (connectionId, limit, offset),
        )
        rows = await cursor.fetchall()

        return [
            {
                "id": row["id"],
                "sqlText": row["sqlText"],
                "source": row["source"],
                "naturalLanguageInput": row["naturalLanguageInput"],
                "status": row["status"],
                "rowCount": row["rowCount"],
                "errorMessage": row["errorMessage"],
                "executedAt": row["executedAt"],
                "durationMs": row["durationMs"],
            }
            for row in rows
        ]
