from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.auth.dependencies import require_admin, CurrentAccount
from app.services.gemini_service import process_user_message

router = APIRouter(prefix="/gemini", tags=["Gemini AI"])

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str

@router.post("/chat", response_model=ChatResponse)
def chat_with_gemini(
    request: ChatRequest,
    account: CurrentAccount = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Recebe a mensagem natural do usuário e interage com o Gemini para 
    agendar, buscar consultas ou interagir normalmente.
    """
    reply_text = process_user_message(db, account.user, request.message)
    return ChatResponse(reply=reply_text)
