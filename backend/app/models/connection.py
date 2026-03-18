"""Connection-related Pydantic models."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.common import ConnectionStatus, DbType


class CreateConnectionRequest(BaseModel):
    """Request to create a new database connection."""

    displayName: str = Field(..., description="User-friendly connection name")
    connectionUrl: str = Field(..., description="Database connection URL")
    dbType: DbType = Field(default=DbType.MYSQL, description="Database type")


class ConnectionResponse(BaseModel):
    """Response for a database connection."""

    id: int
    displayName: str
    dbType: str
    status: ConnectionStatus
    createdAt: str
    updatedAt: str


class RefreshResponse(BaseModel):
    """Response for metadata refresh operation."""

    tablesCount: int = Field(..., description="Number of tables found")
    viewsCount: int = Field(..., description="Number of views found")
    fetchedAt: str = Field(..., description="Timestamp of metadata fetch")
