"""SQL generation API routes."""

from fastapi import APIRouter, HTTPException

from app.models.common import ErrorType
from app.services.sql_generator import generateSql

router = APIRouter(tags=["generation"])


class GenerateSqlRequest:
    """Request for SQL generation."""

    naturalLanguage: str


@router.post("/connections/{connectionId}/generate-sql")
async def generateSqlRoute(connectionId: int, request: dict) -> dict:
    """Generate SQL from natural language using LLM.

    Args:
        connectionId: The database connection ID.
        request: Request body with naturalLanguage field.

    Returns:
        Generated SQL and explanation.

    Raises:
        HTTPException: On various error conditions.
    """
    naturalLanguage = request.get("naturalLanguage", "")

    if not naturalLanguage:
        raise HTTPException(
            status_code=400,
            detail={
                "detail": "naturalLanguage is required",
                "errorType": ErrorType.VALIDATION_ERROR,
                "context": {},
            },
        )

    try:
        generatedSql, explanation = await generateSql(connectionId, naturalLanguage)
        return {
            "generatedSql": generatedSql,
            "explanation": explanation,
        }
    except ValueError as e:
        errorStr = str(e)
        if "not found" in errorStr.lower():
            raise HTTPException(
                status_code=404,
                detail={
                    "detail": errorStr,
                    "errorType": ErrorType.VALIDATION_ERROR,
                    "context": {"connectionId": connectionId},
                },
            )
        elif "no metadata" in errorStr.lower():
            raise HTTPException(
                status_code=404,
                detail={
                    "detail": errorStr,
                    "errorType": ErrorType.VALIDATION_ERROR,
                    "context": {"connectionId": connectionId},
                },
            )
        else:
            raise HTTPException(
                status_code=422,
                detail={
                    "detail": errorStr,
                    "errorType": ErrorType.LLM_ERROR,
                    "context": {},
                },
            )
    except RuntimeError as e:
        errorStr = str(e)
        if "API key" in errorStr:
            raise HTTPException(
                status_code=503,
                detail={
                    "detail": "LLM service not configured. Please set OPENAI_API_KEY.",
                    "errorType": ErrorType.LLM_ERROR,
                    "context": {},
                },
            )
        raise HTTPException(
            status_code=503,
            detail={
                "detail": errorStr,
                "errorType": ErrorType.LLM_ERROR,
                "context": {},
            },
        )
