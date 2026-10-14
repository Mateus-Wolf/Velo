from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.database import get_db
from app.auth.dependencies import require_admin, CurrentAccount
from app.services.gemini_service import process_user_message, ChatTurn

router = APIRouter(prefix="/gemini", tags=["Gemini AI"])

class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000, pattern=r"\S")
    history: list[ChatTurn] = Field(default_factory=list, max_length=20)

class ChatResponse(BaseModel):
    reply: str

@router.post("/chat", response_model=ChatResponse)
def chat_with_gemini(
    request: ChatRequest,
    background_tasks: BackgroundTasks,
    account: CurrentAccount = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Recebe a mensagem natural do usuário e interage com o Gemini para 
    agendar, buscar consultas ou interagir normalmente.
    """
    reply_text = process_user_message(db, account.user, request.message, request.history, background_tasks)
    return ChatResponse(reply=reply_text)
