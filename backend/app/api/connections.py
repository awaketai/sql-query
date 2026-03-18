"""Connection management API routes."""

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.db.sqlite import getConnection
from app.models.common import ErrorType
from app.services.connection_manager import (
    createConnection,
    deleteConnection,
    getConnection as getConnectionById,
    listConnections,
    refreshConnectionMetadata,
)

router = APIRouter(tags=["connections"])


@router.post("/connections", status_code=201)
async def createConnectionRoute(request: dict) -> dict:
    """Create a new database connection."""
    try:
        return await createConnection(
            displayName=request.get("displayName", ""),
            connectionUrl=request.get("connectionUrl", ""),
            dbType=request.get("dbType", "mysql"),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail={
                "detail": str(e),
                "errorType": ErrorType.VALIDATION_ERROR,
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


@router.get("/connections")
async def listConnectionsRoute() -> list[dict]:
    """List all database connections."""
    return await listConnections()


@router.get("/connections/{connectionId}")
async def getConnectionRoute(connectionId: int) -> dict:
    """Get a specific connection by ID."""
    conn = await getConnectionById(connectionId)
    if conn is None:
        raise HTTPException(
            status_code=404,
            detail={
                "detail": f"Connection {connectionId} not found",
                "errorType": ErrorType.VALIDATION_ERROR,
                "context": {"connectionId": connectionId},
            },
        )
    return conn


@router.delete("/connections/{connectionId}", status_code=204)
async def deleteConnectionRoute(connectionId: int) -> None:
    """Delete a database connection and its cached metadata."""
    deleted = await deleteConnection(connectionId)
    if not deleted:
        raise HTTPException(
            status_code=404,
            detail={
                "detail": f"Connection {connectionId} not found",
                "errorType": ErrorType.VALIDATION_ERROR,
                "context": {"connectionId": connectionId},
            },
        )


@router.post("/connections/{connectionId}/refresh")
async def refreshConnectionRoute(connectionId: int) -> dict:
    """Refresh metadata for a connection."""
    try:
        return await refreshConnectionMetadata(connectionId)
    except ValueError as e:
        raise HTTPException(
            status_code=404,
            detail={
                "detail": str(e),
                "errorType": ErrorType.VALIDATION_ERROR,
                "context": {"connectionId": connectionId},
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
