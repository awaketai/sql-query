"""Metadata-related Pydantic models."""

from pydantic import BaseModel, Field

from app.models.common import KeyType, TableType


class ColumnDetail(BaseModel):
    """Column metadata detail."""

    id: int
    name: str = Field(..., description="Column name")
    dataType: str = Field(..., description="SQL data type")
    nullable: bool = Field(..., description="Whether column allows NULL")
    keyType: KeyType = Field(..., description="Column key type")
    defaultValue: str | None = Field(None, description="Default value")
    ordinalPosition: int = Field(..., description="Column order in table")
    comment: str | None = Field(None, description="Column comment")


class TableListItem(BaseModel):
    """Table metadata for list view."""

    id: int
    name: str = Field(..., description="Table or view name")
    schemaName: str = Field(..., description="Database schema name")
    type: TableType = Field(..., description="TABLE or VIEW")
    comment: str | None = Field(None, description="Table comment")
    columnCount: int = Field(..., description="Number of columns")
    fetchedAt: str = Field(..., description="When metadata was fetched")


class TableDetail(BaseModel):
    """Detailed table metadata with columns."""

    id: int
    name: str = Field(..., description="Table or view name")
    schemaName: str = Field(..., description="Database schema name")
    type: TableType = Field(..., description="TABLE or VIEW")
    comment: str | None = Field(None, description="Table comment")
    fetchedAt: str = Field(..., description="When metadata was fetched")
    columns: list[ColumnDetail] = Field(default_factory=list)
