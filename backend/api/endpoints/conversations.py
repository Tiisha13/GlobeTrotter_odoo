from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

from backend.config import settings
from backend.repositories import ConversationRepository

router = APIRouter(prefix=f"{settings.API_PREFIX}/conversations", tags=["conversations"]) 

# Request/response models
class ConversationState(BaseModel):
    state: Dict[str, Any] = Field(default_factory=dict)

class CreateConversationRequest(BaseModel):
    conversation_id: Optional[str] = None
    user_id: Optional[str] = None
    state: Dict[str, Any] = Field(default_factory=dict)

class AppendMessageRequest(BaseModel):
    role: str
    content: str
    meta: Optional[Dict[str, Any]] = None

class ConversationSummary(BaseModel):
    conversation_id: str
    has_state: bool = True

class ConversationResponse(BaseModel):
    conversation_id: str
    state: Dict[str, Any]
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

async def get_repo() -> ConversationRepository:
    return await ConversationRepository.create()

@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(conversation_id: str, repo: ConversationRepository = Depends(get_repo)):
    state = await repo.get(conversation_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return ConversationResponse(conversation_id=conversation_id, state=state)

@router.post("/", response_model=ConversationResponse)
async def create_conversation(body: CreateConversationRequest, repo: ConversationRepository = Depends(get_repo)):
    conv_id = body.conversation_id or datetime.utcnow().strftime("%Y%m%d%H%M%S%f")
    initial_state = body.state or {"messages": [], "context": {}, "ui_actions": {}, "trip_plan": None}
    await repo.create_conversation(conv_id, initial_state, user_id=body.user_id)
    return ConversationResponse(conversation_id=conv_id, state=initial_state)

@router.patch("/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(conversation_id: str, body: ConversationState, repo: ConversationRepository = Depends(get_repo)):
    await repo.upsert(conversation_id, body.state)
    return ConversationResponse(conversation_id=conversation_id, state=body.state)

@router.delete("/{conversation_id}")
async def delete_conversation(conversation_id: str, repo: ConversationRepository = Depends(get_repo)):
    ok = await repo.delete(conversation_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"success": True}

@router.post("/{conversation_id}/clear")
async def clear_conversation(conversation_id: str, repo: ConversationRepository = Depends(get_repo)):
    ok = await repo.clear(conversation_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"success": True}

@router.get("/", response_model=List[ConversationSummary])
async def list_conversations(user_id: str = Query(..., description="User ID"), skip: int = 0, limit: int = 20, repo: ConversationRepository = Depends(get_repo)):
    rows = await repo.list_by_user(user_id=user_id, limit=limit, skip=skip)
    return [ConversationSummary(**r) for r in rows]

@router.post("/{conversation_id}/messages", response_model=ConversationResponse)
async def append_message(conversation_id: str, body: AppendMessageRequest, repo: ConversationRepository = Depends(get_repo)):
    message = {"role": body.role, "content": body.content, "meta": body.meta or {}, "ts": datetime.utcnow().isoformat()}
    state = await repo.append_message(conversation_id, message)
    return ConversationResponse(conversation_id=conversation_id, state=state)
