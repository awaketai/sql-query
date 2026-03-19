"""SQL generation service using LLM."""

import os
import re

from openai import AsyncOpenAI

from app.db.sqlite import getConnection
from app.services.drivers import getDriver
from app.services.query_validator import validateAndPrepare

# OpenAI configuration from environment
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENAI_BASE_URL = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o")


def _getOpenAIClient() -> AsyncOpenAI:
    """Get OpenAI client with configured settings."""
    if not OPENAI_API_KEY:
        raise RuntimeError(
            "OpenAI API key not configured. Set OPENAI_API_KEY environment variable."
        )

    return AsyncOpenAI(
        api_key=OPENAI_API_KEY,
        base_url=OPENAI_BASE_URL,
    )


async def _loadMetadataContext(connectionId: int) -> str:
    """Load table/column metadata as context for LLM.

    Args:
        connectionId: The database connection ID.

    Returns:
        Formatted metadata context string.

    Raises:
        ValueError: If no metadata is cached for the connection.
    """
    async with getConnection() as db:
        # Get connection info for dialect
        cursor = await db.execute(
            "SELECT dbType FROM connections WHERE id = ?", (connectionId,)
        )
        connRow = await cursor.fetchone()
        if not connRow:
            raise ValueError(f"Connection {connectionId} not found")

        # Get tables and columns
        cursor = await db.execute(
            """
            SELECT
                t.name as tableName,
                t.type as tableType,
                t.comment as tableComment,
                c.name as columnName,
                c.dataType,
                c.nullable,
                c.keyType,
                c.comment as columnComment
            FROM tableMetadata t
            LEFT JOIN columnMetadata c ON t.id = c.tableId
            WHERE t.connectionId = ?
            ORDER BY t.name, c.ordinalPosition
            """,
            (connectionId,),
        )
        rows = await cursor.fetchall()

        if not rows:
            raise ValueError(
                f"No metadata cached for connection {connectionId}. "
                "Please refresh metadata first."
            )

    # Build context string
    tables: dict[str, dict] = {}
    for row in rows:
        tableName = row["tableName"]
        if tableName not in tables:
            tables[tableName] = {
                "type": row["tableType"],
                "comment": row["tableComment"],
                "columns": [],
            }

        if row["columnName"]:  # Column might be NULL if table has no columns
            tables[tableName]["columns"].append({
                "name": row["columnName"],
                "dataType": row["dataType"],
                "nullable": row["nullable"],
                "keyType": row["keyType"],
                "comment": row["columnComment"],
            })

    # Format as readable context
    lines = ["Database Schema:\n"]
    for tableName, tableInfo in tables.items():
        lines.append(f"Table: {tableName} ({tableInfo['type']})")
        if tableInfo["comment"]:
            lines.append(f"  Comment: {tableInfo['comment']}")
        for col in tableInfo["columns"]:
            keyInfo = f" [{col['keyType'].upper()}]" if col["keyType"] != "none" else ""
            nullInfo = "NULL" if col["nullable"] else "NOT NULL"
            colComment = f" -- {col['comment']}" if col["comment"] else ""
            lines.append(
                f"  - {col['name']} ({col['dataType']}) {nullInfo}{keyInfo}{colComment}"
            )
        lines.append("")

    return "\n".join(lines)


async def generateSql(
    connectionId: int, naturalLanguage: str
) -> tuple[str, str]:
    """Generate SQL from natural language using LLM.

    Args:
        connectionId: The database connection ID.
        naturalLanguage: Natural language description of the query.

    Returns:
        Tuple of (generated SQL, explanation).

    Raises:
        ValueError: If no metadata cached or SQL validation fails.
        RuntimeError: If LLM generation fails.
    """
    # Get connection and driver for dialect
    async with getConnection() as db:
        cursor = await db.execute(
            "SELECT dbType FROM connections WHERE id = ?", (connectionId,)
        )
        row = await cursor.fetchone()
        if not row:
            raise ValueError(f"Connection {connectionId} not found")
        dbType = row["dbType"]

    driver = getDriver(dbType)
    dialect = driver.dialect

    # Load metadata context
    metadataContext = await _loadMetadataContext(connectionId)

    # Build prompt
    systemPrompt = f"""You are an expert SQL assistant. Generate a valid {dialect.upper()} SELECT query based on the user's natural language request.

Rules:
1. ONLY generate SELECT statements. Never generate INSERT, UPDATE, DELETE, or DDL statements.
2. Use the exact table and column names from the schema below.
3. Do NOT add LIMIT clause (it will be added automatically if needed).
4. Return ONLY the SQL query, no explanations or markdown formatting.
5. If the request is ambiguous, make reasonable assumptions based on the schema.

Database Schema:
{metadataContext}

After the SQL, on a new line starting with "EXPLANATION:", provide a brief one-sentence explanation of what the query does."""

    userPrompt = f"Generate a SQL query to: {naturalLanguage}"

    # Call OpenAI API
    client = _getOpenAIClient()

    try:
        response = await client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": systemPrompt},
                {"role": "user", "content": userPrompt},
            ],
            temperature=0.1,
            max_tokens=500,
        )
    except Exception as e:
        raise RuntimeError(f"LLM generation failed: {e}") from e

    content = response.choices[0].message.content or ""

    # Parse response - handle multiple formats
    parts = content.split("EXPLANATION:")
    rawSql = parts[0].strip()
    explanation = parts[1].strip() if len(parts) > 1 else "Generated SQL query"

    # Remove markdown code blocks if present (handle various formats)
    if "```" in rawSql:
        # Find content between ``` markers
        codeBlockMatch = re.search(r"```(?:sql)?\s*([\s\S]*?)\s*```", rawSql)
        if codeBlockMatch:
            rawSql = codeBlockMatch.group(1).strip()
        else:
            # Fallback: remove lines starting with ```
            lines = [l for l in rawSql.split("\n") if not l.strip().startswith("```")]
            rawSql = "\n".join(lines).strip()

    # Clean up the SQL
    rawSql = rawSql.strip()

    if not rawSql:
        raise ValueError(
            f"LLM returned empty SQL. Raw response: {content[:500]}"
        )

    # Validate generated SQL
    try:
        validatedSql, _ = validateAndPrepare(rawSql, dialect)
        # Remove auto-added LIMIT for display (it will be added again on execution)
        if " LIMIT 1000" in validatedSql.upper():
            # Only remove if it was auto-added, not if user requested it
            pass
    except ValueError as e:
        raise ValueError(f"Generated SQL is invalid: {e}") from e

    return rawSql, explanation
