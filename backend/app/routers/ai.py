from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, UserRole
from app.schemas import ChatRequest, ChatResponse
from app.auth import get_current_user
from app.services.ai_assistant import get_ai_response

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(
    chat_data: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Chat with the AI assistant. Context is scoped to the user's department."""
    try:
        response = await get_ai_response(
            message=chat_data.message,
            user=current_user,
            db=db,
        )
        return response
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"AI assistant is currently unavailable: {str(e)}",
        )
