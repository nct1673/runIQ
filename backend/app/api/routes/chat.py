"""AI Running Coach endpoints (blueprint SS29-33). Conversation-aware:
a user has many conversations, each a thread of messages. Routing
(tool-calling) happens in app.services.coach.router; this file is
routing/persistence-only. Protected by the router-level get_current_user
dependency in app.main.
"""
import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.conversation import Conversation
from app.models.conversation_message import ConversationMessage
from app.models.user import User
from app.schemas.chat import ConversationOut, MessageOut, SendMessageRequest
from app.services.coach import router as coach_router
from app.services.user_service import get_current_user

router = APIRouter()


def _get_owned_conversation(db: Session, user: User, conversation_id: uuid.UUID) -> Conversation:
    convo = db.get(Conversation, conversation_id)
    if convo is None or convo.user_id != user.id:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return convo


@router.get("/conversations", response_model=list[ConversationOut])
def list_conversations(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> list[ConversationOut]:
    return db.scalars(
        select(Conversation)
        .where(Conversation.user_id == user.id)
        .order_by(Conversation.updated_at.desc())
    ).all()


@router.post("/conversations", response_model=ConversationOut)
def create_conversation(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> ConversationOut:
    convo = Conversation(user_id=user.id)
    db.add(convo)
    db.commit()
    db.refresh(convo)
    return convo


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageOut])
def list_messages(
    conversation_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[MessageOut]:
    convo = _get_owned_conversation(db, user, conversation_id)
    messages = db.scalars(
        select(ConversationMessage)
        .where(ConversationMessage.conversation_id == convo.id)
        .order_by(ConversationMessage.created_at.asc())
    ).all()
    return [
        MessageOut(
            id=m.id,
            role=m.role,
            content=m.content,
            evidence=json.loads(m.evidence) if m.evidence else None,
            created_at=m.created_at,
        )
        for m in messages
    ]


@router.post("/conversations/{conversation_id}/messages", response_model=MessageOut)
def send_message(
    conversation_id: uuid.UUID,
    payload: SendMessageRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MessageOut:
    convo = _get_owned_conversation(db, user, conversation_id)

    result = coach_router.answer(db, user.id, convo.id, payload.content)

    # Auto-title a fresh conversation from its first message.
    if convo.title is None:
        convo.title = payload.content[:60]
        db.commit()

    assistant_message = (
        db.query(ConversationMessage)
        .filter(ConversationMessage.conversation_id == convo.id, ConversationMessage.role == "assistant")
        .order_by(ConversationMessage.created_at.desc())
        .first()
    )
    return MessageOut(
        id=assistant_message.id,
        role="assistant",
        content=result["answer"],
        evidence=result["evidence"] or None,
        created_at=assistant_message.created_at,
    )
