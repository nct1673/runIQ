"""AI Running Coach endpoint (blueprint SS29-33) -- the main LLM feature.

Routing (SQL vs analytics vs RAG vs mixed) happens in
`app.services.coach.router`; this endpoint just receives the question and
returns the evidence-based answer.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db

router = APIRouter()


@router.post("/")
def ask_coach(question: str, db: Session = Depends(get_db)) -> dict:
    raise NotImplementedError("Phase 6: app.services.coach.router.answer(question)")
